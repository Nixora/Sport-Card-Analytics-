"""
Enrich `cards` documents with the best-matching Vinted listing (price + URL).

Reads sports card rows from MongoDB (same DB as ingest_ebay / API), searches Vinted
catalog with each card's title, picks the strongest title match on page 1, and
`$set`s `comparison.vinted` + `comparison.vinted_updated_at`.

Designed for daily runs (prices change): set VINTED_MAX_CARDS=0 to process all cards.

Env (see also server/.env or .env at repo root):
  MONGODB_URI, MONGODB_DB (default sports_cards), MONGODB_CARDS_COLLECTION (default cards)
  VINTED_DOMAIN (default es), VINTED_MAX_CARDS (default 10; 0 = no limit)
  VINTED_MIN_MATCH_SCORE (0–1, default 0.28)
  VINTED_QUERY_MAX_LEN (default 160)
  VINTED_THROTTLE_SEC (default 2.5) — delay between catalog searches
  VINTED_PAGE_LOAD_TIMEOUT (default 180)
  VINTED_DRY_RUN (1/true = no Mongo writes)

Requires: pymongo, requests, selenium, beautifulsoup4, webdriver-manager
  pip install -r requirements.txt

Run from repo root:
  python scripts/compare.py
"""

from __future__ import annotations

import difflib
import os
import re
import shutil
import sys
import time
from datetime import datetime, timezone
from typing import Any
from urllib.parse import urlencode, urljoin

from bs4 import BeautifulSoup
from pymongo import MongoClient
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager


def _repo_root() -> str:
    return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def _load_env_from_dotenv() -> str | None:
    """Load server/.env then .env from repo root; do not override existing os.environ."""
    base = _repo_root()
    for path in (
        os.path.join(base, "server", ".env"),
        os.path.join(base, ".env"),
    ):
        if not os.path.exists(path):
            continue
        try:
            with open(path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line or line.startswith("#") or "=" not in line:
                        continue
                    key, value = line.split("=", 1)
                    key = key.strip().lstrip("\ufeff")
                    value = value.strip().strip("\r\n")
                    if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
                        value = value[1:-1]
                    if key and key not in os.environ:
                        os.environ[key] = value
        except OSError as e:
            print(f"Warning: could not load {path}: {e}", file=sys.stderr)
        return path
    return None


_ENV_PATH = _load_env_from_dotenv()


def _env_bool(name: str, default: bool = False) -> bool:
    v = os.getenv(name)
    if v is None or str(v).strip() == "":
        return default
    return str(v).strip().lower() in ("1", "true", "yes", "on")


def _env_int(name: str, default: int) -> int:
    raw = os.getenv(name)
    if raw is None or str(raw).strip() == "":
        return default
    try:
        return int(str(raw).strip(), 10)
    except ValueError:
        return default


def _env_float(name: str, default: float) -> float:
    raw = os.getenv(name)
    if raw is None or str(raw).strip() == "":
        return default
    try:
        return float(str(raw).strip())
    except ValueError:
        return default


def load_settings() -> dict[str, Any]:
    mongo_uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017").strip()
    mongo_db = os.getenv("MONGODB_DB", "sports_cards").strip()
    cards_coll = os.getenv("MONGODB_CARDS_COLLECTION", "cards").strip()
    domain = (os.getenv("VINTED_DOMAIN", "es") or "es").lower().strip()
    max_cards = _env_int("VINTED_MAX_CARDS", 10)
    min_score = _env_float("VINTED_MIN_MATCH_SCORE", 0.28)
    q_max = max(20, min(_env_int("VINTED_QUERY_MAX_LEN", 160), 400))
    throttle = max(0.0, _env_float("VINTED_THROTTLE_SEC", 2.5))
    timeout = max(30, _env_int("VINTED_PAGE_LOAD_TIMEOUT", 180))
    dry = _env_bool("VINTED_DRY_RUN", False)
    return {
        "mongo_uri": mongo_uri,
        "mongo_db": mongo_db,
        "cards_collection": cards_coll,
        "base_url": f"https://www.vinted.{domain}",
        "catalog_url": f"https://www.vinted.{domain}/catalog",
        "max_cards": max(0, max_cards),
        "min_match_score": min(1.0, max(0.0, min_score)),
        "query_max_len": q_max,
        "throttle_sec": throttle,
        "page_load_timeout": timeout,
        "dry_run": dry,
    }


def build_search_query(title: str, max_len: int) -> str:
    """Shorten title for Vinted search_text; collapse whitespace."""
    if not title or not isinstance(title, str):
        return ""
    t = re.sub(r"\s+", " ", title.strip())
    if len(t) <= max_len:
        return t
    return t[: max_len - 1].rsplit(" ", 1)[0].strip() or t[:max_len]


def normalize_title(s: str) -> str:
    s = (s or "").lower()
    s = re.sub(r"[^a-z0-9]+", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def title_match_score(a: str, b: str) -> float:
    na, nb = normalize_title(a), normalize_title(b)
    if not na or not nb:
        return 0.0
    return float(difflib.SequenceMatcher(None, na, nb).ratio())


def pick_best_vinted_listing(
    card_title: str,
    items: list[dict[str, Any]],
    min_score: float,
) -> tuple[dict[str, Any] | None, float]:
    """Return (best_item, score) or (None, best_score_if_below_threshold)."""
    best: dict[str, Any] | None = None
    best_score = 0.0
    for it in items:
        vt = (it.get("title") or "").strip()
        sc = title_match_score(card_title, vt)
        if sc > best_score:
            best_score = sc
            best = it
    if best is not None and best_score >= min_score:
        return best, best_score
    return None, best_score


def create_driver(page_load_timeout: int) -> webdriver.Chrome:
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
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/122.0 Safari/537.36"
    )

    driver = webdriver.Chrome(
        service=Service(ChromeDriverManager().install()),
        options=chrome_options,
    )
    driver.set_page_load_timeout(page_load_timeout)
    return driver


def fetch_vinted_catalog_page(
    driver: webdriver.Chrome,
    base_url: str,
    catalog_url: str,
    search_text: str,
) -> BeautifulSoup:
    params = {"search_text": search_text, "page": "1"}
    url = f"{catalog_url}?{urlencode(params, doseq=True)}"
    for attempt in range(2):
        try:
            print(f"  Loading: {url}" + (" (retry)" if attempt else ""))
            driver.get(url)
            break
        except Exception as e:
            if attempt == 0 and ("timed out" in str(e).lower() or "timeout" in str(e).lower()):
                print("  Timeout on load, retry in 5s…", file=sys.stderr)
                time.sleep(5)
                continue
            raise
    time.sleep(3)
    return BeautifulSoup(driver.page_source, "html.parser")


def parse_vinted_cards(soup: BeautifulSoup, base_url: str) -> list[dict[str, Any]]:
    """Same structure as refer/scrape_vinted.parse_vinted_cards."""
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


def vinted_payload_from_item(
    item: dict[str, Any],
    match_score: float,
    search_query: str,
    fetched_at: datetime,
) -> dict[str, Any]:
    return {
        "status": "matched",
        "listing_id": item.get("id"),
        "url": item.get("url") or "",
        "title": item.get("title") or "",
        "price_text": item.get("price_text") or "",
        "price_incl_text": item.get("price_incl_text") or "",
        "likes": int(item.get("likes") or 0),
        "match_score": round(match_score, 4),
        "search_query": search_query,
        "fetched_at": fetched_at,
    }


def run() -> None:
    cfg = load_settings()
    print("Env file:", _ENV_PATH or "(none)")
    print(
        "Mongo:",
        cfg["mongo_db"],
        cfg["cards_collection"],
        "| VINTED_MAX_CARDS:",
        cfg["max_cards"] or "all",
        "| dry_run:",
        cfg["dry_run"],
    )

    client = MongoClient(cfg["mongo_uri"])
    coll = client[cfg["mongo_db"]][cfg["cards_collection"]]

    q: dict[str, Any] = {"title": {"$exists": True, "$ne": ""}}
    cursor = coll.find(q, projection={"card_key": 1, "title": 1}).sort(
        "last_seen_at", -1
    )
    if cfg["max_cards"] > 0:
        cursor = cursor.limit(cfg["max_cards"])

    cards = list(cursor)
    if not cards:
        print("No cards with non-empty title found.")
        return

    print(f"Cards to process: {len(cards)}")

    driver = create_driver(cfg["page_load_timeout"])
    updated = 0
    try:
        driver.get(cfg["base_url"])
        time.sleep(2)

        for i, doc in enumerate(cards):
            card_key = doc.get("card_key") or ""
            title = (doc.get("title") or "").strip()
            if not title:
                continue

            query = build_search_query(title, cfg["query_max_len"])
            if not query:
                print(f"[{i + 1}/{len(cards)}] skip (empty query): {card_key!r}")
                continue

            if i > 0 and cfg["throttle_sec"] > 0:
                time.sleep(cfg["throttle_sec"])

            print(f"[{i + 1}/{len(cards)}] {card_key[:64]}…" if len(card_key) > 64 else f"[{i + 1}/{len(cards)}] {card_key}")
            print(f"  DB title: {title[:120]}{'…' if len(title) > 120 else ''}")
            print(f"  Search:   {query[:120]}{'…' if len(query) > 120 else ''}")

            fetched_at = datetime.now(timezone.utc)
            try:
                soup = fetch_vinted_catalog_page(
                    driver,
                    cfg["base_url"],
                    cfg["catalog_url"],
                    query,
                )
                items = parse_vinted_cards(soup, cfg["base_url"])
            except Exception as e:
                print(f"  Error: {e!r}", file=sys.stderr)
                payload = {
                    "status": "error",
                    "error": str(e)[:500],
                    "search_query": query,
                    "fetched_at": fetched_at,
                }
                if not cfg["dry_run"]:
                    coll.update_one(
                        {"_id": doc["_id"]},
                        {
                            "$set": {
                                "comparison.vinted": payload,
                                "comparison.vinted_updated_at": fetched_at,
                            }
                        },
                    )
                continue

            if not items:
                print("  Vinted: 0 results on page 1")
                payload = {
                    "status": "no_results",
                    "search_query": query,
                    "fetched_at": fetched_at,
                }
                if not cfg["dry_run"]:
                    coll.update_one(
                        {"_id": doc["_id"]},
                        {
                            "$set": {
                                "comparison.vinted": payload,
                                "comparison.vinted_updated_at": fetched_at,
                            }
                        },
                    )
                continue

            best, score = pick_best_vinted_listing(
                title, items, cfg["min_match_score"]
            )
            if best is None:
                print(
                    f"  No match above threshold (best ratio {score:.3f} < {cfg['min_match_score']})"
                )
                payload = {
                    "status": "no_match_above_threshold",
                    "best_candidate_title": (
                        max(items, key=lambda x: title_match_score(title, x.get("title") or "")).get(
                            "title"
                        )
                        if items
                        else None
                    ),
                    "best_match_score": round(score, 4),
                    "search_query": query,
                    "fetched_at": fetched_at,
                }
                if not cfg["dry_run"]:
                    coll.update_one(
                        {"_id": doc["_id"]},
                        {
                            "$set": {
                                "comparison.vinted": payload,
                                "comparison.vinted_updated_at": fetched_at,
                            }
                        },
                    )
                continue

            print(
                f"  Match score {score:.3f} | {best.get('price_text')} | {best.get('title', '')[:80]}"
            )
            payload = vinted_payload_from_item(best, score, query, fetched_at)
            if not cfg["dry_run"]:
                coll.update_one(
                    {"_id": doc["_id"]},
                    {
                        "$set": {
                            "comparison.vinted": payload,
                            "comparison.vinted_updated_at": fetched_at,
                        }
                    },
                )
            updated += 1
    finally:
        try:
            driver.quit()
        except Exception:
            pass
        client.close()

    print(
        f"Done. Rows with a Vinted match above threshold: {updated}"
        + (" (dry_run — no writes)" if cfg["dry_run"] else " (written to MongoDB)")
    )


if __name__ == "__main__":
    run()
