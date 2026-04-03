"""
Fetch sports-card listings from eBay Buy Browse API and upsert into MongoDB.

eBay usage mirrors the working Catawiki scraper (token + browse search):
- Env: first of server/.env, .env (same as that script — does not override existing os.environ).
- OAuth: client_credentials, cached token with expiry.
- Browse search: offset + limit pagination, HTTP retries, optional skip on failed pages.
"""

from __future__ import annotations

import base64
import os
import re
import sys
import time
from datetime import datetime, timedelta, timezone
from typing import Any

import requests
from pymongo import MongoClient, UpdateOne
from pymongo.collection import Collection


def _load_env_from_dotenv() -> str | None:
    """
    Same pattern as Catawiki bot: server/.env then .env; stop after first file found.
    Existing environment variables are NOT overridden.
    """
    base_dir = os.path.dirname(os.path.abspath(__file__))
    candidate_paths = [
        os.path.join(base_dir, "server", ".env"),
        os.path.join(base_dir, ".env"),
    ]
    loaded: str | None = None
    for path in candidate_paths:
        if not os.path.exists(path):
            continue
        try:
            with open(path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line or line.startswith("#") or "=" not in line:
                        continue
                    key, value = line.split("=", 1)
                    key = key.strip()
                    value = value.strip()
                    if key and key not in os.environ:
                        os.environ[key] = value
        except OSError as e:
            print(f"Warning: could not load env file {path}: {e}", file=sys.stderr)
        loaded = path
        break
    return loaded


_ENV_FILE = _load_env_from_dotenv()

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


def load_settings() -> dict[str, Any]:
    uri = os.environ.get("MONGODB_URI", "mongodb://localhost:27017").strip()
    db_name = os.environ.get("MONGODB_DB", "sports_cards").strip()
    coll_name = os.environ.get("MONGODB_COLLECTION", "ebay_items").strip()
    cards_coll_name = os.environ.get("MONGODB_CARDS_COLLECTION", "cards").strip()
    query = os.environ.get(
        "EBAY_SEARCH_QUERY",
        '(autograph OR signed OR auto) (PSA OR BGS OR BVG OR JSA OR Beckett OR "PSA DNA" OR COA)',
    ).strip()
    limit = int(os.environ.get("EBAY_LIMIT", "50"))
    max_items = int(os.environ.get("EBAY_MAX_ITEMS", "200"))
    min_watch = int(os.environ.get("MIN_WATCH_COUNT", "0"))
    strict_watch = os.environ.get("STRICT_WATCH_COUNT", "false").lower() in (
        "1",
        "true",
        "yes",
    )
    category_ids = os.environ.get("EBAY_CATEGORY_IDS", "").strip()
    skip_if_no_quota = os.getenv("SKIP_IF_NO_EBAY_QUOTA", "").lower() in (
        "1",
        "true",
        "yes",
    )
    throttle_sec = float(os.environ.get("EBAY_SEARCH_THROTTLE_SEC", "1"))
    http_retries = int(os.getenv("EBAY_HTTP_MAX_RETRIES", "5"))
    http_backoff = float(os.getenv("EBAY_HTTP_RETRY_BACKOFF_SEC", "3"))
    skip_failed_page = os.getenv("EBAY_SKIP_FAILED_PAGE", "true").lower() in (
        "1",
        "true",
        "yes",
    )
    max_consecutive_skips = int(os.getenv("EBAY_MAX_CONSECUTIVE_PAGE_SKIPS", "8"))
    # Default True: VPS keeps process alive and runs on schedule (opt out with RUN_DAILY=false).
    run_daily = _env_flag("RUN_DAILY", True)
    run_hour_utc = int(os.getenv("RUN_HOUR_UTC", "0"))
    run_minute_utc = int(os.getenv("RUN_MINUTE_UTC", "0"))
    return {
        "mongo_uri": uri,
        "mongo_db": db_name,
        "mongo_collection": coll_name,
        "mongo_cards_collection": cards_coll_name,
        "query": query,
        "limit": min(limit, 200),
        "max_items": max_items,
        "min_watch_count": min_watch,
        "strict_watch_count": strict_watch,
        "category_ids": category_ids or None,
        "skip_if_no_quota": skip_if_no_quota,
        "throttle_sec": max(0.0, throttle_sec),
        "http_retries": max(1, http_retries),
        "http_backoff_sec": max(0.5, http_backoff),
        "skip_failed_page": skip_failed_page,
        "max_consecutive_skips": max(1, max_consecutive_skips),
        "run_daily": run_daily,
        "run_hour_utc": min(max(run_hour_utc, 0), 23),
        "run_minute_utc": min(max(run_minute_utc, 0), 59),
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


def passes_watch_filter(
    item: dict[str, Any],
    min_watch: int,
    strict: bool,
) -> tuple[bool, int | None]:
    wc = pick_watch_count(item)
    if min_watch <= 0:
        return True, wc
    if wc is None:
        return (False if strict else True), wc
    return wc >= min_watch, wc


def normalize_doc(item: dict[str, Any], fetched_at: datetime) -> dict[str, Any]:
    item_id = item.get("itemId")
    price = item.get("price", {}) or {}
    seller = item.get("seller", {}) or {}
    image = item.get("image", {}) or {}
    additional = item.get("additionalImages") or []
    wc = pick_watch_count(item)
    keyword_flags = extract_keyword_flags(item.get("title"))
    domain = get_ebay_domain()
    web_url = item.get("itemWebUrl") or (
        f"https://www.{domain}/itm/{item_id}" if item_id else None
    )
    return {
        "item_id": item_id,
        "title": item.get("title"),
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


def upsert_items(collection: Collection, docs: list[dict[str, Any]]) -> None:
    if not docs:
        return
    ops = []
    for d in docs:
        item_id = d.get("item_id")
        if not item_id:
            continue
        ops.append(
            UpdateOne(
                {"item_id": item_id},
                {"$set": d, "$setOnInsert": {"first_seen_at": d["fetched_at"]}},
                upsert=True,
            )
        )
    if ops:
        collection.bulk_write(ops, ordered=False)


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


def upsert_card_trends(
    cards_collection: Collection,
    docs: list[dict[str, Any]],
    trend_date: str,
    fetched_at: datetime,
) -> tuple[int, int]:
    """
    Save one trend point per day per card_key in cards collection.
    - Existing date entry: update price/count.
    - Missing date entry: append new trend item.
    """
    grouped_prices: dict[str, list[float]] = {}
    grouped_titles: dict[str, str] = {}
    grouped_currency: dict[str, str | None] = {}
    for d in docs:
        card_key = _build_card_key(d.get("title"))
        if not card_key:
            continue
        grouped_titles.setdefault(card_key, d.get("title") or card_key)
        if card_key not in grouped_prices:
            grouped_prices[card_key] = []
        price_val = d.get("price_value")
        if price_val is not None:
            try:
                grouped_prices[card_key].append(float(price_val))
            except (TypeError, ValueError):
                pass
        if card_key not in grouped_currency:
            grouped_currency[card_key] = d.get("price_currency")

    created_or_updated = 0
    pushed_new_trend = 0
    for card_key, prices in grouped_prices.items():
        day_price = _median(prices)
        if day_price is None:
            continue
        trend_point = {
            "date": trend_date,
            "price": day_price,
            "count": len(prices),
        }
        # Try update existing trend entry for same day.
        res = cards_collection.update_one(
            {"card_key": card_key, "trend.date": trend_date},
            {
                "$set": {
                    "trend.$.price": day_price,
                    "trend.$.count": len(prices),
                    "last_seen_at": fetched_at,
                    "price_currency": grouped_currency.get(card_key),
                    "title": grouped_titles.get(card_key, card_key),
                },
                "$setOnInsert": {"first_seen_at": fetched_at},
            },
            upsert=False,
        )
        if res.matched_count > 0:
            created_or_updated += 1
            continue
        # No trend for today yet -> append.
        cards_collection.update_one(
            {"card_key": card_key},
            {
                "$set": {
                    "last_seen_at": fetched_at,
                    "price_currency": grouped_currency.get(card_key),
                    "title": grouped_titles.get(card_key, card_key),
                },
                "$setOnInsert": {"first_seen_at": fetched_at},
                "$push": {"trend": trend_point},
            },
            upsert=True,
        )
        created_or_updated += 1
        pushed_new_trend += 1
    return created_or_updated, pushed_new_trend


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

    if cfg["min_watch_count"] > 0:
        print(
            "MIN_WATCH_COUNT > 0: Browse often omits watchCount; "
            "STRICT_WATCH_COUNT=false keeps items when missing.",
            file=sys.stderr,
        )

    token = get_ebay_access_token()

    client = MongoClient(cfg["mongo_uri"])
    raw_coll = client[cfg["mongo_db"]][cfg["mongo_collection"]]
    cards_coll = client[cfg["mongo_db"]][cfg["mongo_cards_collection"]]
    raw_coll.create_index("item_id", unique=True)
    raw_coll.create_index("fetched_at")
    cards_coll.create_index("card_key", unique=True)

    offset = 0
    total = 0
    stored = 0
    skipped_watch = 0

    all_batch_docs: list[dict[str, Any]] = []
    consecutive_skips = 0
    while total < cfg["max_items"]:
        if cfg["throttle_sec"] > 0:
            time.sleep(cfg["throttle_sec"])
        try:
            page = fetch_search_page(
                token,
                cfg["query"],
                cfg["limit"],
                offset,
                cfg["category_ids"],
                cfg["http_retries"],
                cfg["http_backoff_sec"],
            )
            consecutive_skips = 0
        except Exception as exc:
            if cfg["skip_failed_page"]:
                consecutive_skips += 1
                print(
                    f"Skipping page at offset={offset} limit={cfg['limit']} after error: {exc!r}",
                    file=sys.stderr,
                )
                if consecutive_skips >= cfg["max_consecutive_skips"]:
                    print(
                        "Too many consecutive page failures — stopping pagination "
                        f"({consecutive_skips} >= {cfg['max_consecutive_skips']}).",
                        file=sys.stderr,
                    )
                    break
                offset += cfg["limit"]
                continue
            raise
        items = page.get("itemSummaries") or []
        if not items:
            break

        batch: list[dict[str, Any]] = []
        for item in items:
            ok, _wc = passes_watch_filter(
                item,
                cfg["min_watch_count"],
                cfg["strict_watch_count"],
            )
            if not ok:
                skipped_watch += 1
                continue
            batch.append(normalize_doc(item, fetched_at))

        upsert_items(raw_coll, batch)
        all_batch_docs.extend(batch)
        stored += len(batch)
        total += len(items)
        offset += len(items)

        if len(items) < cfg["limit"]:
            break

    trend_cards, trend_new_points = upsert_card_trends(
        cards_coll,
        all_batch_docs,
        trend_date,
        fetched_at,
    )

    print(
        f"Done. offset={offset}, summaries_seen={total}, "
        f"upserted_raw={stored}, skipped_watch_rule={skipped_watch}, "
        f"cards_trend_updated={trend_cards}, cards_new_trend_points={trend_new_points}"
    )


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
