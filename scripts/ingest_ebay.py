"""
Daily sports-card pipeline: **Vinted + Catawiki → eBay → MongoDB** (same idea as
`refer/scrape_vinted.py` / `refer/scrape_catawiki.py`, without a separate bulk eBay search).

Selenium opens **Vinted** catalog and **Catawiki** search (`/s?q=…`) using the same default
search phrase **`sports card`** for both (override with `MARKETPLACE_SEARCH_QUERY` or per-site
`VINTED_DISCOVER_QUERY` / `CATAWIKI_DISCOVER_QUERY`). For each scraped listing, the script calls
eBay Buy Browse `item_summary/search` with the listing title, picks the **best title-similarity**
match, and upserts `ebay_items` with `compare_vinted` / `compare_catawiki` plus daily `trend`
points. Listings whose **title has no 4-digit year** (1950–2049) are **skipped** — no eBay call.
No eBay match → skip that listing.

**How many listings per run:** up to **`DISCOVER_MAX_VINTED`** / **`DISCOVER_MAX_CATAWIKI`**
each (**default `-1` = no cap** — collect every listing from pages **1..`DISCOVER_MAX_PAGES`**),
or set a positive number to stop after that many unique listings. **`0`** = skip that marketplace.
Paginate until **`DISCOVER_MAX_PAGES`** (default **20**, max **20**), or stop when a page has **no**
parseable listings. Sleep **`DISCOVER_PAGE_SLEEP_SEC`** between marketplace pages.

Runs daily by default (`RUN_DAILY=true`, `RUN_HOUR_UTC` / `RUN_MINUTE_UTC`) or once with `--once`.

Env: `MARKETPLACE_SEARCH_QUERY` (default `sports card`), `DISCOVER_EBAY_TITLE_MIN_SCORE`,
`DISCOVER_MAX_VINTED` / `DISCOVER_MAX_CATAWIKI` (`-1` or `unlimited` = all pages up to max pages),
`DISCOVER_MAX_PAGES` (max 20),
`DISCOVER_PAGE_SLEEP_SEC`, `DISCOVER_THROTTLE_SEC`, `DISCOVER_SOURCE_GAP_SEC`,
`DISCOVER_EBAY_SEARCH_LIMIT`, `VINTED_DOMAIN`, `CATAWIKI_LOCALE_PATH`, `DISCOVER_PAGE_LOAD_TIMEOUT`,
`EBAY_CATEGORY_IDS`, `SKIP_IF_NO_EBAY_QUOTA`, `EBAY_HTTP_*`.

Env files: repo root `.env` then `server/.env` via `env_loader`.
Requires: requests, pymongo, beautifulsoup4, selenium, webdriver-manager
"""

from __future__ import annotations

import base64
import difflib
import os
import re
import shutil
import sys
import time
from datetime import datetime, timedelta, timezone
from typing import Any
from urllib.parse import quote, urlencode, urljoin

import requests
from bs4 import BeautifulSoup
from pymongo import MongoClient, UpdateOne
from pymongo.collection import Collection
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager

from env_loader import load_repo_dotenv


_ENV_FILE = load_repo_dotenv(script_file=__file__)

# —— eBay constants (same semantics as Catawiki / server ebayService.js) ——
EBAY_CLIENT_ID = os.getenv("EBAY_CLIENT_ID")
EBAY_CLIENT_SECRET = os.getenv("EBAY_CLIENT_SECRET")
EBAY_MARKETPLACE_ID = os.getenv("EBAY_MARKETPLACE_ID", "EBAY-US").upper()
EBAY_SCOPE = "https://api.ebay.com/oauth/api_scope"

EBAY_SANDBOX = os.getenv("EBAY_SANDBOX", "").strip().lower() in ("1", "true", "yes")
_EBAY_API_ROOT = (
    "https://api.sandbox.ebay.com" if EBAY_SANDBOX else "https://api.ebay.com"
)
EBAY_TOKEN_URL = f"{_EBAY_API_ROOT}/identity/v1/oauth2/token"
EBAY_BROWSE_SEARCH_URL = f"{_EBAY_API_ROOT}/buy/browse/v1/item_summary/search"

EBAY_ANALYTICS_BASE = f"{_EBAY_API_ROOT}/developer/analytics/v1_beta"
EBAY_RATE_LIMIT_URL = f"{EBAY_ANALYTICS_BASE}/rate_limit/"
BROWSE_PARAMS = {"api_name": "browse", "api_context": "buy"}

MARKETPLACE_DOMAIN = {
    "EBAY_US": "ebay.com",
    "EBAY_GB": "ebay.co.uk",
    "EBAY_DE": "ebay.de",
    "EBAY_ES": "ebay.es",
    "EBAY_FR": "ebay.fr",
    "EBAY_IT": "ebay.it",
    "EBAY_NL": "ebay.nl",
    "EBAY_PL": "ebay.pl",
}

_ebay_token: str | None = None
_ebay_token_expiry = 0.0


def _env_flag(name: str, default: bool = True) -> bool:
    """True unless env is explicitly false-like (opt-out)."""
    raw = os.getenv(name)
    if raw is None or str(raw).strip() == "":
        return default
    return str(raw).strip().lower() not in ("0", "false", "no", "off", "n")


def _http_timeout_tuple() -> tuple[float, float]:
    """(connect, read) seconds — long read helps large Browse responses on slow VPS links."""
    read = float(os.getenv("EBAY_HTTP_READ_TIMEOUT_SEC", "120"))
    connect = float(os.getenv("EBAY_HTTP_CONNECT_TIMEOUT_SEC", "30"))
    return (max(5.0, connect), max(10.0, read))


KEYWORD_PATTERNS = {
    "has_signed": re.compile(r"\bsigned\b", re.IGNORECASE),
    "has_auto": re.compile(r"\bauto(graph)?\b", re.IGNORECASE),
    "has_psa": re.compile(r"\bpsa\b", re.IGNORECASE),
    "has_bgs": re.compile(r"\bbgs\b", re.IGNORECASE),
    "has_jsa": re.compile(r"\bjsa\b", re.IGNORECASE),
    "has_beckett": re.compile(r"\bbeckett\b", re.IGNORECASE),
    "has_coa": re.compile(r"\bcoa\b", re.IGNORECASE),
}


def get_ebay_domain() -> str:
    return MARKETPLACE_DOMAIN.get(EBAY_MARKETPLACE_ID, "ebay.com")


def get_ebay_access_token() -> str:
    """
    OAuth2 application token — same flow as Catawiki get_ebay_access_token /
    server/services/ebayService.js::getAccessToken.
    """
    global _ebay_token, _ebay_token_expiry
    if not EBAY_CLIENT_ID or not EBAY_CLIENT_SECRET:
        raise RuntimeError("EBAY_CLIENT_ID and EBAY_CLIENT_SECRET must be set")

    now = time.time()
    if _ebay_token and now < _ebay_token_expiry:
        return _ebay_token

    basic = f"{EBAY_CLIENT_ID}:{EBAY_CLIENT_SECRET}".encode("utf-8")
    auth_header = "Basic " + base64.b64encode(basic).decode("ascii")
    resp = requests.post(
        EBAY_TOKEN_URL,
        headers={
            "Content-Type": "application/x-www-form-urlencoded",
            "Authorization": auth_header,
        },
        data={
            "grant_type": "client_credentials",
            "scope": EBAY_SCOPE,
        },
        timeout=_http_timeout_tuple(),
    )
    if resp.status_code == 401:
        err = {}
        try:
            err = resp.json()
        except Exception:
            pass
        if err.get("error") == "invalid_client":
            print(resp.text, file=sys.stderr)
            print(
                "\neBay OAuth: invalid_client — eBay rejected Client ID + Client Secret.\n"
                "  • Use App ID + OAuth Client Secret from Production (same keyset).\n"
                "  • First env file loaded wins keys; if using server/.env vs .env, keys must be correct in that file.\n"
                f"  • Token URL: {EBAY_TOKEN_URL}\n",
                file=sys.stderr,
            )
        else:
            print(resp.text, file=sys.stderr)
        resp.raise_for_status()
    resp.raise_for_status()
    data = resp.json()
    _ebay_token = data.get("access_token")
    expires_in = data.get("expires_in", 7200)
    _ebay_token_expiry = now + float(expires_in) - 60.0
    if not _ebay_token:
        raise RuntimeError("eBay token response missing access_token")
    return _ebay_token


def get_ebay_browse_remaining() -> int:
    """Application rate limit for buy.browse (same as Catawiki get_ebay_browse_remaining)."""
    try:
        token = get_ebay_access_token()
        resp = requests.get(
            EBAY_RATE_LIMIT_URL,
            headers={"Authorization": f"Bearer {token}"},
            params=BROWSE_PARAMS,
            timeout=_http_timeout_tuple(),
        )
        if resp.status_code == 204 or not resp.ok:
            return 0
        data = resp.json()
        rate_limits = data.get("rateLimits") or []
        remaining: int | None = None
        for api in rate_limits:
            for res in api.get("resources") or []:
                for rate in res.get("rates") or []:
                    r = rate.get("remaining")
                    if r is not None:
                        remaining = min(remaining, r) if remaining is not None else r
        return int(remaining) if remaining is not None else 0
    except Exception as e:
        print(f"eBay rate limit check failed: {e}", file=sys.stderr)
        return 0


def _parse_discover_listing_cap(env_name: str, default: int) -> int:
    """
    Per-source listing limit for marketplace HTML discovery.
    0 = skip this source.
    -1 = no cap (collect all listings found on pages 1..DISCOVER_MAX_PAGES).
    >0 = stop after this many unique listings (may exit before last page).
    """
    raw = os.getenv(env_name)
    if raw is None or not str(raw).strip():
        return default
    s = str(raw).strip().lower()
    if s in ("unlimited", "all"):
        return -1
    try:
        v = int(s)
    except ValueError:
        return default
    if v < 0:
        return -1
    return v


def _discover_cap_label(cap: int) -> str:
    return "unlimited" if cap < 0 else str(cap)


def load_settings() -> dict[str, Any]:
    uri = os.environ.get("MONGODB_URI", "mongodb://localhost:27017").strip()
    db_name = os.environ.get("MONGODB_DB", "sports_cards").strip()
    coll_name = os.environ.get("MONGODB_COLLECTION", "ebay_items").strip()
    cards_coll_name = os.environ.get("MONGODB_CARDS_COLLECTION", "cards").strip()
    category_ids = os.environ.get("EBAY_CATEGORY_IDS", "").strip()
    skip_if_no_quota = os.getenv("SKIP_IF_NO_EBAY_QUOTA", "").lower() in (
        "1",
        "true",
        "yes",
    )
    http_retries = int(os.getenv("EBAY_HTTP_MAX_RETRIES", "5"))
    http_backoff = float(os.getenv("EBAY_HTTP_RETRY_BACKOFF_SEC", "3"))
    run_daily = _env_flag("RUN_DAILY", True)
    run_hour_utc = int(os.getenv("RUN_HOUR_UTC", "0"))
    run_minute_utc = int(os.getenv("RUN_MINUTE_UTC", "0"))
    default_search = os.getenv("MARKETPLACE_SEARCH_QUERY", "sports card").strip()
    vinted_discover_query = os.getenv("VINTED_DISCOVER_QUERY", default_search).strip()
    catawiki_discover_query = os.getenv("CATAWIKI_DISCOVER_QUERY", default_search).strip()
    discover_min_score = float(os.getenv("DISCOVER_EBAY_TITLE_MIN_SCORE", "0.28"))
    discover_max_vinted = _parse_discover_listing_cap("DISCOVER_MAX_VINTED", -1)
    discover_max_catawiki = _parse_discover_listing_cap("DISCOVER_MAX_CATAWIKI", -1)
    discover_throttle = max(0.0, float(os.getenv("DISCOVER_THROTTLE_SEC", "2.5")))
    discover_gap = max(0.0, float(os.getenv("DISCOVER_SOURCE_GAP_SEC", "4")))
    discover_search_limit = min(200, max(1, int(os.getenv("DISCOVER_EBAY_SEARCH_LIMIT", "25"))))
    vinted_domain = (os.getenv("VINTED_DOMAIN", "es") or "es").lower().strip()
    catawiki_locale = (os.getenv("CATAWIKI_LOCALE_PATH", "/es") or "/es").strip()
    if not catawiki_locale.startswith("/"):
        catawiki_locale = "/" + catawiki_locale
    selenium_timeout = max(30, int(os.getenv("DISCOVER_PAGE_LOAD_TIMEOUT", "180")))
    discover_max_pages = min(20, max(1, int(os.getenv("DISCOVER_MAX_PAGES", "20"))))
    discover_page_sleep = max(0.0, float(os.getenv("DISCOVER_PAGE_SLEEP_SEC", "2")))
    return {
        "mongo_uri": uri,
        "mongo_db": db_name,
        "mongo_collection": coll_name,
        "mongo_cards_collection": cards_coll_name,
        "category_ids": category_ids or None,
        "skip_if_no_quota": skip_if_no_quota,
        "http_retries": max(1, http_retries),
        "http_backoff_sec": max(0.5, http_backoff),
        "run_daily": run_daily,
        "run_hour_utc": min(max(run_hour_utc, 0), 23),
        "run_minute_utc": min(max(run_minute_utc, 0), 59),
        "discover_ebay_min_score": min(1.0, max(0.0, discover_min_score)),
        "discover_max_vinted": discover_max_vinted,
        "discover_max_catawiki": discover_max_catawiki,
        "vinted_discover_query": vinted_discover_query,
        "catawiki_discover_query": catawiki_discover_query,
        "discover_throttle_sec": discover_throttle,
        "discover_source_gap_sec": discover_gap,
        "discover_ebay_search_limit": discover_search_limit,
        "vinted_domain": vinted_domain,
        "catawiki_locale_path": catawiki_locale,
        "selenium_timeout": selenium_timeout,
        "discover_max_pages": discover_max_pages,
        "discover_page_sleep_sec": discover_page_sleep,
    }


def fetch_search_page(
    token: str,
    query: str,
    limit: int,
    offset: int,
    category_ids: str | None,
    max_retries: int,
    backoff_sec: float,
) -> dict[str, Any]:
    """
    GET item_summary/search with offset/limit (skip/limit pagination).
    Retries on timeouts and connection errors; re-raises HTTP errors after body logged.
    """
    params: dict[str, str | int] = {"q": query, "limit": limit, "offset": offset}
    if category_ids:
        params["category_ids"] = category_ids
    timeout = _http_timeout_tuple()
    last_err: BaseException | None = None
    for attempt in range(max_retries):
        try:
            r = requests.get(
                EBAY_BROWSE_SEARCH_URL,
                headers={
                    "Authorization": f"Bearer {token}",
                    "X-EBAY-C-MARKETPLACE-ID": EBAY_MARKETPLACE_ID,
                },
                params=params,
                timeout=timeout,
            )
            r.raise_for_status()
            return r.json()
        except requests.HTTPError:
            print(r.text, file=sys.stderr)
            raise
        except (
            requests.exceptions.Timeout,
            requests.exceptions.ConnectionError,
            requests.exceptions.ChunkedEncodingError,
        ) as e:
            last_err = e
            wait = backoff_sec * (2**attempt)
            print(
                f"eBay browse search timeout/connection (offset={offset} limit={limit} "
                f"attempt {attempt + 1}/{max_retries}): {e!r}; sleeping {wait:.1f}s",
                file=sys.stderr,
            )
            time.sleep(wait)
    assert last_err is not None
    raise last_err


def pick_watch_count(item: dict[str, Any]) -> int | None:
    for key in ("watchCount", "watchcount", "favoriteCount"):
        v = item.get(key)
        if v is not None:
            try:
                return int(v)
            except (TypeError, ValueError):
                continue
    return None


def extract_keyword_flags(text: str | None) -> dict[str, bool]:
    flags = {name: False for name in KEYWORD_PATTERNS}
    if not text:
        flags["has_autograph"] = False
        flags["has_grade_or_auth"] = False
        return flags
    for name, pattern in KEYWORD_PATTERNS.items():
        flags[name] = bool(pattern.search(text))
    flags["has_autograph"] = flags["has_signed"] or flags["has_auto"]
    flags["has_grade_or_auth"] = (
        flags["has_psa"]
        or flags["has_bgs"]
        or flags["has_jsa"]
        or flags["has_beckett"]
        or flags["has_coa"]
    )
    return flags


def normalize_doc(item: dict[str, Any], fetched_at: datetime) -> dict[str, Any]:
    item_id = item.get("itemId")
    price = item.get("price", {}) or {}
    seller = item.get("seller", {}) or {}
    image = item.get("image", {}) or {}
    additional = item.get("additionalImages") or []
    wc = pick_watch_count(item)
    title = item.get("title")
    keyword_flags = extract_keyword_flags(title)
    card_key = _build_card_key(title)
    domain = get_ebay_domain()
    web_url = item.get("itemWebUrl") or (
        f"https://www.{domain}/itm/{item_id}" if item_id else None
    )
    return {
        "item_id": item_id,
        "card_key": card_key,
        "title": title,
        "item_web_url": web_url,
        "marketplace_id": EBAY_MARKETPLACE_ID,
        "condition": item.get("condition"),
        "condition_id": item.get("conditionId"),
        "price_value": price.get("value"),
        "price_currency": price.get("currency"),
        "seller_username": seller.get("username"),
        "seller_feedback_percentage": seller.get("feedbackPercentage"),
        "seller_feedback_score": seller.get("feedbackScore"),
        "image_url": image.get("imageUrl"),
        "additional_image_urls": [i.get("imageUrl") for i in additional if i.get("imageUrl")],
        "watch_count": wc,
        "buying_options": item.get("buyingOptions"),
        "categories": item.get("categories"),
        "leaf_category_ids": item.get("leafCategoryIds"),
        "raw_item_summary": item,
        "fetched_at": fetched_at,
        "source": "buy.browse.item_summary.search",
        "keyword_flags": keyword_flags,
        "has_autograph": keyword_flags["has_autograph"],
        "has_grade_or_auth": keyword_flags["has_grade_or_auth"],
    }


def upsert_item_trends(
    collection: Collection,
    docs: list[dict[str, Any]],
    trend_date: str,
    fetched_at: datetime,
) -> tuple[int, int]:
    """
    Keep per-item daily trend inside ebay_items (one doc per item_id).

    - If trend already has entry for trend_date: update that entry (latest ask).
    - Else: append a new trend entry for that date.
    """
    if not docs:
        return 0, 0

    updated_today = 0
    pushed_new = 0

    ops_update_today: list[UpdateOne] = []
    ops_push_new: list[UpdateOne] = []

    for d in docs:
        item_id = d.get("item_id")
        if not item_id:
            continue

        try:
            price_val = float(d.get("price_value")) if d.get("price_value") is not None else None
        except (TypeError, ValueError):
            price_val = None

        trend_point = {
            "date": trend_date,
            "price_value": price_val,
            "price_currency": d.get("price_currency"),
            "fetched_at": fetched_at,
        }

        # 1) If today's entry exists, update it (positional $).
        ops_update_today.append(
            UpdateOne(
                {"item_id": item_id, "trend.date": trend_date},
                {
                    "$set": {
                        "trend.$.price_value": price_val,
                        "trend.$.price_currency": d.get("price_currency"),
                        "trend.$.fetched_at": fetched_at,
                        "fetched_at": fetched_at,
                        "last_seen_at": fetched_at,
                    }
                },
                upsert=False,
            )
        )

        # 2) Otherwise push a new entry for today (guarded by $ne).
        ops_push_new.append(
            UpdateOne(
                {"item_id": item_id, "trend.date": {"$ne": trend_date}},
                {
                    "$set": {"fetched_at": fetched_at, "last_seen_at": fetched_at},
                    "$push": {"trend": trend_point},
                    "$setOnInsert": {"first_seen_at": fetched_at},
                },
                upsert=False,
            )
        )

    if ops_update_today:
        res1 = collection.bulk_write(ops_update_today, ordered=False)
        updated_today = int(res1.modified_count or 0)

    if ops_push_new:
        res2 = collection.bulk_write(ops_push_new, ordered=False)
        pushed_new = int(res2.modified_count or 0)

    return updated_today, pushed_new


def _build_card_key(title: str | None) -> str | None:
    if not title:
        return None
    cleaned = re.sub(r"[^a-z0-9]+", " ", title.lower()).strip()
    if not cleaned:
        return None
    return re.sub(r"\s+", "_", cleaned)[:120]


def _median(nums: list[float]) -> float | None:
    if not nums:
        return None
    arr = sorted(nums)
    n = len(arr)
    mid = n // 2
    if n % 2 == 1:
        return float(arr[mid])
    return float((arr[mid - 1] + arr[mid]) / 2.0)


# —— Marketplace-first: Vinted/Catawiki → eBay (best title score) ——


def _normalize_title(s: str) -> str:
    s = (s or "").lower()
    s = re.sub(r"[^a-z0-9]+", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def title_match_score(a: str, b: str) -> float:
    na, nb = _normalize_title(a), _normalize_title(b)
    if not na or not nb:
        return 0.0
    return float(difflib.SequenceMatcher(None, na, nb).ratio())


def _trim_search_q(q: str, max_len: int = 160) -> str:
    if not q or not isinstance(q, str):
        return ""
    t = re.sub(r"\s+", " ", q.strip())
    if len(t) <= max_len:
        return t
    return t[: max_len - 1].rsplit(" ", 1)[0].strip() or t[:max_len]


# Require a year in the marketplace title before calling eBay (same idea as refer/scrape_vinted).
_YEAR_IN_TITLE_RE = re.compile(r"\b(19[5-9]\d|20[0-4]\d)\b")


def title_has_year(title: str | None) -> bool:
    if not title or not isinstance(title, str):
        return False
    return bool(_YEAR_IN_TITLE_RE.search(title))


def pick_best_ebay_item_from_summaries(
    source_title: str,
    summaries: list[dict[str, Any]],
    min_score: float,
) -> tuple[dict[str, Any] | None, float]:
    best: dict[str, Any] | None = None
    best_score = 0.0
    for item in summaries:
        t = (item.get("title") or "").strip()
        sc = title_match_score(source_title, t)
        if sc > best_score:
            best_score = sc
            best = item
    if best is None or best_score < min_score:
        return None, best_score
    return best, best_score


def create_selenium_driver(page_load_timeout: int) -> webdriver.Chrome:
    chrome_options = Options()
    if sys.platform.startswith("linux"):
        chrome_options.add_argument("--headless=new")
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        chrome_options.add_argument("--disable-gpu")
        chrome_options.add_argument("--window-size=1280,800")
        for path in ("/usr/bin/google-chrome", "/usr/bin/google-chrome-stable"):
            if shutil.which(path):
                chrome_options.binary_location = path
                break
    else:
        chrome_options.add_argument("--start-maximized")
    chrome_options.add_argument(
        "--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36"
    )
    driver = webdriver.Chrome(
        service=Service(ChromeDriverManager().install()),
        options=chrome_options,
    )
    driver.set_page_load_timeout(page_load_timeout)
    return driver


def selenium_get_page(driver: webdriver.Chrome, url: str) -> None:
    for attempt in range(2):
        try:
            print(f"  [selenium] {url}" + (" (retry)" if attempt else ""))
            driver.get(url)
            break
        except Exception as e:
            if attempt == 0 and (
                "timed out" in str(e).lower() or "timeout" in str(e).lower()
            ):
                print("  Timeout on load, retry in 5s…", file=sys.stderr)
                time.sleep(5)
                continue
            raise
    time.sleep(3)


def fetch_vinted_catalog_page(
    driver: webdriver.Chrome,
    catalog_url: str,
    search_text: str,
    page_num: int = 1,
) -> BeautifulSoup:
    params = {"search_text": search_text, "page": str(max(1, page_num))}
    url = f"{catalog_url}?{urlencode(params, doseq=True)}"
    selenium_get_page(driver, url)
    return BeautifulSoup(driver.page_source, "html.parser")


def parse_vinted_cards(soup: BeautifulSoup, base_url: str) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    for container in soup.select("div.new-item-box__container"):
        data_id = container.get("data-testid") or ""
        m_id = re.search(r"product-item-id-(\d+)", data_id)
        item_id = int(m_id.group(1)) if m_id else None
        overlay = container.select_one("a.new-item-box__overlay")
        if not overlay:
            continue
        href = overlay.get("href") or ""
        url = href if href.startswith("http") else urljoin(base_url, href)
        raw_title = overlay.get("title") or ""
        if ", marca:" in raw_title:
            title = raw_title.split(", marca:", 1)[0].strip()
        else:
            title = raw_title.strip()
        price_el = container.select_one("p[data-testid$='--price-text']")
        price_text = price_el.get_text(strip=True) if price_el else ""
        matches = re.findall(r"\d+[.,]\d{2}\s*€", raw_title)
        price_incl_text = ""
        if matches:
            if not price_text:
                price_text = matches[0].strip()
            price_incl_text = matches[-1].strip()
        likes = 0
        likes_el = container.select_one("span[data-testid='favourite-count-text']")
        if likes_el:
            txt = likes_el.get_text(strip=True)
            if txt.isdigit():
                likes = int(txt)
        img_el = container.select_one("img[data-testid$='--image--img']")
        photo_url = img_el.get("src") if img_el and img_el.get("src") else ""
        items.append(
            {
                "id": item_id,
                "title": title or raw_title,
                "price_text": price_text,
                "price_incl_text": price_incl_text or price_text,
                "url": url,
                "photo_url": photo_url,
                "likes": likes,
            }
        )
    return items


def fetch_catawiki_search_page(
    driver: webdriver.Chrome,
    search_prefix: str,
    search_text: str,
    page_num: int = 1,
) -> BeautifulSoup:
    q = quote(search_text, safe="")
    if page_num <= 1:
        url = f"{search_prefix}?q={q}"
    else:
        url = f"{search_prefix}?q={q}&page={page_num}"
    selenium_get_page(driver, url)
    return BeautifulSoup(driver.page_source, "html.parser")


def parse_catawiki_listings(soup: BeautifulSoup, base_url: str) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    seen_urls: set[str] = set()
    for card in soup.select("a[href*='/l/']"):
        href = card.get("href")
        if not href or "/l/" not in href:
            continue
        url = urljoin(base_url, href)
        if url in seen_urls:
            continue
        seen_urls.add(url)
        text_lines = [
            line.strip()
            for line in card.get_text("\n", strip=True).split("\n")
            if line.strip()
        ]
        if not text_lines:
            continue
        title = text_lines[0]
        price = ""
        for line in text_lines:
            if "€" in line:
                price = line
                break
        likes = 0
        container = card.parent
        if container is not None:
            for span in container.select("span"):
                txt = span.get_text(strip=True)
                if txt.isdigit():
                    likes = int(txt)
                    break
        photo_url = ""
        img = card.select_one("img")
        if img is None and container is not None:
            img = container.select_one("img")
        if img is not None:
            src = img.get("src") or img.get("data-src") or ""
            if src:
                sp = src.split(" ")[0]
                photo_url = sp if sp.startswith("http") else urljoin(base_url, sp)
        m = re.search(r"/l/(\d+)", url)
        lot_id = int(m.group(1)) if m else None
        items.append(
            {
                "id": lot_id,
                "title": title,
                "price_text": price,
                "url": url,
                "photo_url": photo_url,
                "likes": likes,
            }
        )
    return items


def collect_vinted_listings_paginated(
    driver: webdriver.Chrome,
    cfg: dict[str, Any],
    vinted_base: str,
    cap: int,
) -> list[dict[str, Any]]:
    """Walk Vinted catalog pages 1..DISCOVER_MAX_PAGES until `cap` listings or empty page."""
    if cap == 0:
        return []
    unlimited = cap < 0
    cap_label = _discover_cap_label(cap)
    catalog_url = f"{vinted_base}/catalog"
    q = cfg["vinted_discover_query"]
    max_pages = cfg["discover_max_pages"]
    page_sleep = cfg["discover_page_sleep_sec"]
    collected: list[dict[str, Any]] = []
    seen: set[Any] = set()

    for page_num in range(1, max_pages + 1):
        soup = fetch_vinted_catalog_page(driver, catalog_url, q, page_num)
        items = parse_vinted_cards(soup, vinted_base)
        if not items:
            print(
                f"  Vinted page {page_num}/{max_pages}: 0 listings — stop pagination."
            )
            break
        added = 0
        for it in items:
            key = it.get("id")
            if key is None:
                key = it.get("url")
            if key is not None and key in seen:
                continue
            if key is not None:
                seen.add(key)
            collected.append(it)
            added += 1
            if not unlimited and len(collected) >= cap:
                break
        print(
            f"  Vinted page {page_num}/{max_pages}: +{added} new unique "
            f"(collected {len(collected)}/{cap_label})."
        )
        if not unlimited and len(collected) >= cap:
            break
        if page_num < max_pages and page_sleep > 0:
            time.sleep(page_sleep)

    return collected if unlimited else collected[:cap]


def collect_catawiki_listings_paginated(
    driver: webdriver.Chrome,
    cfg: dict[str, Any],
    catawiki_search_prefix: str,
    catawiki_base: str,
    cap: int,
) -> list[dict[str, Any]]:
    """Walk Catawiki search pages 1..DISCOVER_MAX_PAGES until `cap` listings or empty page."""
    if cap == 0:
        return []
    unlimited = cap < 0
    cap_label = _discover_cap_label(cap)
    q = cfg["catawiki_discover_query"]
    max_pages = cfg["discover_max_pages"]
    page_sleep = cfg["discover_page_sleep_sec"]
    collected: list[dict[str, Any]] = []
    seen: set[Any] = set()

    for page_num in range(1, max_pages + 1):
        soup = fetch_catawiki_search_page(
            driver, catawiki_search_prefix, q, page_num
        )
        items = parse_catawiki_listings(soup, catawiki_base)
        if not items:
            print(
                f"  Catawiki page {page_num}/{max_pages}: 0 listings — stop pagination."
            )
            break
        added = 0
        for it in items:
            key = it.get("id")
            if key is None:
                key = it.get("url")
            if key is not None and key in seen:
                continue
            if key is not None:
                seen.add(key)
            collected.append(it)
            added += 1
            if not unlimited and len(collected) >= cap:
                break
        print(
            f"  Catawiki page {page_num}/{max_pages}: +{added} new unique "
            f"(collected {len(collected)}/{cap_label})."
        )
        if not unlimited and len(collected) >= cap:
            break
        if page_num < max_pages and page_sleep > 0:
            time.sleep(page_sleep)

    return collected if unlimited else collected[:cap]


def build_compare_payload_marketplace(
    marketplace: str,
    src: dict[str, Any],
    match_score: float,
    search_query: str,
    fetched_at: datetime,
) -> dict[str, Any]:
    base: dict[str, Any] = {
        "status": "matched",
        "marketplace": marketplace,
        "tier": "marketplace_first",
        "match_score": round(match_score, 4),
        "tiers_attempted": ["marketplace_first"],
        "search_query": search_query,
        "fetched_at": fetched_at,
        "url": src.get("url") or "",
        "title": src.get("title") or "",
        "photo_url": src.get("photo_url") or "",
        "likes": int(src.get("likes") or 0),
        "source": "marketplace_first",
    }
    if marketplace == "vinted":
        base["listing_id"] = src.get("id")
        base["price_text"] = src.get("price_text") or ""
        base["price_incl_text"] = src.get("price_incl_text") or ""
    else:
        base["lot_id"] = src.get("id")
        base["price_text"] = src.get("price_text") or ""
    return base


def upsert_ebay_with_compare(
    collection: Collection,
    doc: dict[str, Any],
    compare_key: str,
    compare_payload: dict[str, Any],
    fetched_at: datetime,
    trend_date: str,
) -> None:
    item_id = doc.get("item_id")
    if not item_id:
        return
    ts_key = (
        "compare_vinted_updated_at"
        if compare_key == "compare_vinted"
        else "compare_catawiki_updated_at"
    )
    set_doc = {
        **doc,
        compare_key: compare_payload,
        ts_key: fetched_at,
        "compare_updated_at": fetched_at,
        "last_seen_at": fetched_at,
    }
    collection.update_one(
        {"item_id": item_id},
        {"$set": set_doc, "$setOnInsert": {"first_seen_at": fetched_at}},
        upsert=True,
    )
    upsert_item_trends(collection, [doc], trend_date, fetched_at)


def run_marketplace_first_discovery(
    cfg: dict[str, Any],
    collection: Collection,
    token: str,
    fetched_at: datetime,
    trend_date: str,
) -> None:
    mv = cfg["discover_max_vinted"]
    mc = cfg["discover_max_catawiki"]
    if mv == 0 and mc == 0:
        print(
            "Vinted/Catawiki → eBay: skipped (DISCOVER_MAX_VINTED and DISCOVER_MAX_CATAWIKI are 0)."
        )
        return

    mp = cfg["discover_max_pages"]
    lv = _discover_cap_label(mv)
    lc = _discover_cap_label(mc)
    print(
        f"Vinted/Catawiki → eBay: Vinted q={cfg['vinted_discover_query']!r} "
        f"(up to {lv} listings, pages 1–{mp}), "
        f"Catawiki q={cfg['catawiki_discover_query']!r} "
        f"(up to {lc} listings, pages 1–{mp}); "
        f"require 1950–2049 year in title before eBay; min title score={cfg['discover_ebay_min_score']}"
    )
    driver = create_selenium_driver(cfg["selenium_timeout"])
    vinted_base = f"https://www.vinted.{cfg['vinted_domain']}"
    catawiki_base = "https://www.catawiki.com"
    catawiki_search = f"{catawiki_base}{cfg['catawiki_locale_path']}/s"

    matched_v = 0
    skipped_v = 0
    skipped_v_no_year = 0
    matched_c = 0
    skipped_c = 0
    skipped_c_no_year = 0

    try:
        driver.get(vinted_base)
        time.sleep(2)

        if mv != 0 and cfg["vinted_discover_query"]:
            v_items = collect_vinted_listings_paginated(
                driver, cfg, vinted_base, mv
            )
            print(
                f"  Vinted: {len(v_items)} listing(s) to process "
                f"(cap {_discover_cap_label(mv)}, pages 1–{cfg['discover_max_pages']})."
            )
            for row in v_items:
                src_title = (row.get("title") or "").strip()
                if not src_title:
                    skipped_v += 1
                    continue
                if not title_has_year(src_title):
                    skipped_v_no_year += 1
                    skipped_v += 1
                    continue
                q = _trim_search_q(src_title, 160)
                if cfg["discover_throttle_sec"] > 0:
                    time.sleep(cfg["discover_throttle_sec"])
                try:
                    page = fetch_search_page(
                        token,
                        q,
                        cfg["discover_ebay_search_limit"],
                        0,
                        cfg["category_ids"],
                        cfg["http_retries"],
                        cfg["http_backoff_sec"],
                    )
                except Exception as e:
                    print(f"  eBay search skip (Vinted→eBay): {e!r}", file=sys.stderr)
                    skipped_v += 1
                    continue
                summaries = page.get("itemSummaries") or []
                best, score = pick_best_ebay_item_from_summaries(
                    src_title, summaries, cfg["discover_ebay_min_score"]
                )
                if not best:
                    skipped_v += 1
                    continue
                doc = normalize_doc(best, fetched_at)
                payload = build_compare_payload_marketplace(
                    "vinted", row, score, q, fetched_at
                )
                upsert_ebay_with_compare(
                    collection, doc, "compare_vinted", payload, fetched_at, trend_date
                )
                matched_v += 1
                print(f"  Vinted→eBay match score={score:.3f} item_id={doc.get('item_id')}")

        if cfg["discover_source_gap_sec"] > 0:
            time.sleep(cfg["discover_source_gap_sec"])

        if mc != 0 and cfg["catawiki_discover_query"]:
            c_items = collect_catawiki_listings_paginated(
                driver, cfg, catawiki_search, catawiki_base, mc
            )
            print(
                f"  Catawiki: {len(c_items)} listing(s) to process "
                f"(cap {_discover_cap_label(mc)}, pages 1–{cfg['discover_max_pages']})."
            )
            for row in c_items:
                src_title = (row.get("title") or "").strip()
                if not src_title:
                    skipped_c += 1
                    continue
                if not title_has_year(src_title):
                    skipped_c_no_year += 1
                    skipped_c += 1
                    continue
                q = _trim_search_q(src_title, 160)
                if cfg["discover_throttle_sec"] > 0:
                    time.sleep(cfg["discover_throttle_sec"])
                try:
                    page = fetch_search_page(
                        token,
                        q,
                        cfg["discover_ebay_search_limit"],
                        0,
                        cfg["category_ids"],
                        cfg["http_retries"],
                        cfg["http_backoff_sec"],
                    )
                except Exception as e:
                    print(f"  eBay search skip (Catawiki→eBay): {e!r}", file=sys.stderr)
                    skipped_c += 1
                    continue
                summaries = page.get("itemSummaries") or []
                best, score = pick_best_ebay_item_from_summaries(
                    src_title, summaries, cfg["discover_ebay_min_score"]
                )
                if not best:
                    skipped_c += 1
                    continue
                doc = normalize_doc(best, fetched_at)
                payload = build_compare_payload_marketplace(
                    "catawiki", row, score, q, fetched_at
                )
                upsert_ebay_with_compare(
                    collection, doc, "compare_catawiki", payload, fetched_at, trend_date
                )
                matched_c += 1
                print(f"  Catawiki→eBay match score={score:.3f} item_id={doc.get('item_id')}")

    finally:
        try:
            driver.quit()
        except Exception:
            pass

    print(
        f"Done. Vinted→eBay matched={matched_v} skipped={skipped_v} (no year in title: {skipped_v_no_year}); "
        f"Catawiki→eBay matched={matched_c} skipped={skipped_c} (no year: {skipped_c_no_year})."
    )


def run_once() -> None:
    cfg = load_settings()
    fetched_at = datetime.now(timezone.utc)
    trend_date = fetched_at.strftime("%Y-%m-%d")

    print("Env file:", _ENV_FILE or "(none — set EBAY_* in process env)")
    print("EBAY_SANDBOX:", EBAY_SANDBOX, "| Token / Browse:", _EBAY_API_ROOT)
    print("EBAY_MARKETPLACE_ID:", EBAY_MARKETPLACE_ID)
    print(
        "EBAY_CLIENT_ID length:",
        len(EBAY_CLIENT_ID or ""),
        "| EBAY_CLIENT_SECRET length:",
        len(EBAY_CLIENT_SECRET or ""),
    )

    if cfg["skip_if_no_quota"]:
        remaining = get_ebay_browse_remaining()
        print(f"eBay buy.browse remaining (app): {remaining}")
        if remaining <= 0:
            print("SKIP_IF_NO_EBAY_QUOTA=true and no remaining — exiting.")
            return

    token = get_ebay_access_token()

    client = MongoClient(cfg["mongo_uri"])
    raw_coll = client[cfg["mongo_db"]][cfg["mongo_collection"]]
    raw_coll.create_index("item_id", unique=True)
    raw_coll.create_index("fetched_at")
    raw_coll.create_index("card_key")
    raw_coll.create_index("trend.date")

    try:
        run_marketplace_first_discovery(cfg, raw_coll, token, fetched_at, trend_date)
    except Exception as exc:
        print(f"Vinted/Catawiki → eBay run failed: {exc}", file=sys.stderr)
    finally:
        client.close()


def _next_run_utc(now: datetime, hour: int, minute: int) -> datetime:
    target = now.replace(hour=hour, minute=minute, second=0, microsecond=0)
    if target <= now:
        target = target + timedelta(days=1)
    return target


def run_forever_daily() -> None:
    cfg = load_settings()
    hour = cfg["run_hour_utc"]
    minute = cfg["run_minute_utc"]
    print(
        f"Daily mode enabled. Running now, then every day at {hour:02d}:{minute:02d} UTC."
    )
    # First run immediately when process starts.
    try:
        run_once()
    except Exception as exc:
        print(f"Initial daily run failed: {exc}", file=sys.stderr)
    while True:
        now = datetime.now(timezone.utc)
        nxt = _next_run_utc(now, hour, minute)
        wait_seconds = max(1, int((nxt - now).total_seconds()))
        print(f"Current UTC: {now.isoformat()} | next run: {nxt.isoformat()}")
        time.sleep(wait_seconds)
        try:
            run_once()
        except Exception as exc:
            print(f"Daily run failed: {exc}", file=sys.stderr)


def main() -> None:
    if "--once" in sys.argv:
        run_once()
        return
    cfg = load_settings()
    if cfg["run_daily"]:
        run_forever_daily()
        return
    run_once()


if __name__ == "__main__":
    main()
