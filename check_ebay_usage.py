"""
Check eBay API rate limit and usage for Browse API only (sport card search).

- GET /rate_limit/       — application-level (client credentials)
- GET /user_rate_limit/  — user-level (EBAY_REFRESH_TOKEN)

Filtered to api_name=browse, api_context=buy (same as scrapers).
Uses same .env as scrape_vinted.py (server/.env or .env).
Run: python check_ebay_usage.py
"""

import os
import base64

import requests


def _load_env_from_dotenv() -> str | None:
    """Load env from server/.env or .env (same as scrape_vinted.py). Returns path used or None."""
    base_dir = os.path.dirname(os.path.abspath(__file__))
    for path in [
        os.path.join(base_dir, ".env"),
    ]:
        if not os.path.exists(path):
            continue
        try:
            with open(path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line or line.startswith("#") or "=" not in line:
                        continue
                    key, value = line.split("=", 1)
                    key = key.strip().lstrip("\ufeff")  # BOM can break first key
                    value = value.strip().strip("\r\n")
                    if len(value) >= 2 and value[0] == value[-1] and value[0] in '"\'':
                        value = value[1:-1]
                    if key and key not in os.environ:
                        os.environ[key] = value
        except Exception as e:
            print(f"Warning: could not load {path}: {e}")
        return path
    return None


_env_file = _load_env_from_dotenv()

def _clean_env_value(s: str) -> str:
    """Remove quotes, CR/LF, and surrounding whitespace that break eBay auth."""
    if not s:
        return ""
    s = s.strip().strip("\r\n")
    if len(s) >= 2 and s[0] == s[-1] and s[0] in '"\'':
        s = s[1:-1]
    return s.strip()


EBAY_CLIENT_ID = _clean_env_value(os.getenv("EBAY_CLIENT_ID") or "")
EBAY_CLIENT_SECRET = _clean_env_value(os.getenv("EBAY_CLIENT_SECRET") or "")
# Sandbox app credentials only work with sandbox URLs. Set EBAY_SANDBOX=true in .env if using a Sandbox app.
EBAY_SANDBOX = os.getenv("EBAY_SANDBOX", "").strip().lower() in ("1", "true", "yes")
if EBAY_SANDBOX:
    EBAY_TOKEN_URL = "https://api.sandbox.ebay.com/identity/v1/oauth2/token"
    EBAY_ANALYTICS_BASE = "https://api.sandbox.ebay.com/developer/analytics/v1_beta"
else:
    EBAY_TOKEN_URL = "https://api.ebay.com/identity/v1/oauth2/token"
    EBAY_ANALYTICS_BASE = "https://api.ebay.com/developer/analytics/v1_beta"
EBAY_SCOPE = "https://api.ebay.com/oauth/api_scope"
RATE_LIMIT_URL = f"{EBAY_ANALYTICS_BASE}/rate_limit/"
USER_RATE_LIMIT_URL = f"{EBAY_ANALYTICS_BASE}/user_rate_limit/"

# Optional: set in .env to check user-level limits (from OAuth authorization code flow).
EBAY_REFRESH_TOKEN = os.getenv("EBAY_REFRESH_TOKEN", "").strip()

# Only Browse API (Buy) — same as scrapers' item_summary/search for sport card
BROWSE_PARAMS = {"api_name": "browse", "api_context": "buy"}


def get_app_token() -> str:
    """OAuth client_credentials grant — same as scrape_vinted.get_ebay_access_token()."""
    if not EBAY_CLIENT_ID or not EBAY_CLIENT_SECRET:
        raise RuntimeError("EBAY_CLIENT_ID and EBAY_CLIENT_SECRET must be set")
    basic = f"{EBAY_CLIENT_ID}:{EBAY_CLIENT_SECRET}".encode("utf-8")
    auth_header = "Basic " + base64.b64encode(basic).decode("ascii")
    resp = requests.post(
        EBAY_TOKEN_URL,
        headers={
            "Content-Type": "application/x-www-form-urlencoded",
            "Authorization": auth_header,
        },
        data={"grant_type": "client_credentials", "scope": EBAY_SCOPE},
        timeout=30,
    )
    if not resp.ok:
        raise RuntimeError(f"eBay app token failed: {resp.status_code} {resp.text}")
    return resp.json()["access_token"]


def get_user_token(refresh_token: str) -> str:
    """Exchange refresh_token for user access token (for user_rate_limit)."""
    if not EBAY_CLIENT_ID or not EBAY_CLIENT_SECRET:
        raise RuntimeError("EBAY_CLIENT_ID and EBAY_CLIENT_SECRET must be set")
    basic = f"{EBAY_CLIENT_ID}:{EBAY_CLIENT_SECRET}".encode("utf-8")
    auth_header = "Basic " + base64.b64encode(basic).decode("ascii")
    resp = requests.post(
        EBAY_TOKEN_URL,
        headers={
            "Content-Type": "application/x-www-form-urlencoded",
            "Authorization": auth_header,
        },
        data={
            "grant_type": "refresh_token",
            "refresh_token": refresh_token,
            "scope": EBAY_SCOPE,
        },
        timeout=30,
    )
    if not resp.ok:
        raise RuntimeError(f"eBay user token failed: {resp.status_code} {resp.text}")
    return resp.json()["access_token"]


def fetch_rate_limit(url: str, token: str, params: dict | None = None) -> dict:
    """GET rate_limit or user_rate_limit and return JSON."""
    r = requests.get(
        url,
        headers={"Authorization": f"Bearer {token}"},
        params=params or {},
        timeout=30,
    )
    if r.status_code == 204:
        return {}
    if not r.ok:
        raise RuntimeError(f"eBay analytics request failed: {r.status_code} {r.text}")
    return r.json()


def print_usage(label: str, data: dict) -> None:
    """Pretty-print rate limit response."""
    print(f"\n--- {label} ---")
    if not data:
        print("(no data or 204 No Content)")
        return
    limits = data.get("rateLimits") or []
    if not limits:
        print("(empty rateLimits)")
        return
    for api in limits:
        ctx = api.get("apiContext", "")
        name = api.get("apiName", "")
        ver = api.get("apiVersion", "")
        resources = api.get("resources") or []
        print(f"\n  {ctx} / {name} ({ver})")
        for res in resources:
            res_name = res.get("name", "")
            rates = res.get("rates") or []
            if not rates:
                print(f"    {res_name}: (no rates)")
                continue
            for rate in rates:
                count = rate.get("count", 0)
                limit = rate.get("limit", 0)
                remaining = rate.get("remaining", 0)
                reset = rate.get("reset", "")
                window = rate.get("timeWindow", 0)
                print(f"    {res_name}: used={count} limit={limit} remaining={remaining} reset={reset} window={window}s")


def main() -> None:
    print("eBay API usage — Browse only (sport card search, same as scrapers)")
    print("Filter: api_name=browse, api_context=buy")
    print("Env file loaded:", _env_file or "(none)")
    print("EBAY_CLIENT_ID set:", bool(EBAY_CLIENT_ID))
    print("EBAY_CLIENT_SECRET set:", bool(EBAY_CLIENT_SECRET))
    print("EBAY_SANDBOX (use sandbox token URL):", EBAY_SANDBOX)
    print("Token URL:", EBAY_TOKEN_URL)
    print("EBAY_CLIENT_ID length:", len(EBAY_CLIENT_ID), "(hidden chars can cause 401)")
    print("EBAY_CLIENT_SECRET length:", len(EBAY_CLIENT_SECRET))
    print("EBAY_REFRESH_TOKEN set:", bool(EBAY_REFRESH_TOKEN))

    # 1) Token from OAuth client_credentials (same as scrapers)
    try:
        app_token = get_app_token()
        print("\nToken (OAuth client_credentials, same as scrapers):", app_token)
        app_data = fetch_rate_limit(RATE_LIMIT_URL, app_token, params=BROWSE_PARAMS)
        print_usage("Application rate_limit/ (client credentials)", app_data)
    except Exception as e:
        print("\n--- Application rate_limit/ ---")
        print(f"Error: {e}")

    # 2) User rate limit (user token from refresh_token)
    if EBAY_REFRESH_TOKEN:
        try:
            user_token = get_user_token(EBAY_REFRESH_TOKEN)
            user_data = fetch_rate_limit(USER_RATE_LIMIT_URL, user_token, params=BROWSE_PARAMS)
            print_usage("User user_rate_limit/ (user token)", user_data)
        except Exception as e:
            print("\n--- User user_rate_limit/ ---")
            print(f"Error: {e}")
    else:
        print("\n--- User user_rate_limit/ ---")
        print("Set EBAY_REFRESH_TOKEN in server/.env to check user-level limits.")
        print("(Get refresh_token via OAuth authorization code grant.)")


if __name__ == "__main__":
    main()
