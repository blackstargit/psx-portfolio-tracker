#!/usr/bin/env python3
"""PSX dividend fetcher — wraps psxdata for use from Node.js.

Dividends on PSX can be extracted from the financial reports list, which
includes cash dividend declarations. Bonus shares are tracked separately.

Usage:
    python psx_dividends.py ENGRO
    python psx_dividends.py ENGRO --from 2020-01-01

Output: JSON array of dividend events.
"""
from __future__ import annotations

import json
import subprocess
import sys
from datetime import datetime

def ensure_psxdata() -> None:
    try:
        import psxdata  # noqa: F401
    except ImportError:
        print("Installing psxdata...", file=sys.stderr)
        subprocess.check_call([sys.executable, "-m", "pip", "install", "psxdata", "-q"])
        for mod in list(sys.modules.keys()):
            if "psxdata" in mod or "psx" in mod:
                del sys.modules[mod]

ensure_psxdata()

import psxdata

# Dividend-related report types from PSX financial reports list
CASH_DIVIDEND_TYPES = {
    "FINAL", "INTERIM", "FIRST INTERIM", "SECOND INTERIM",
    "THIRD INTERIM", "FOURTH INTERIM", "SPECIAL", "FINAL/INTERIM",
    "INTERIM/FINAL", "DIVIDEND", "CASH DIVIDEND",
}
BONUS_TYPES = {
    "BONUS", "RIGHT", "STOCK DIVIDEND", "SHARE PREMIUM",
}

def _date_to_iso(value) -> str | None:
    """Convert a datetime object or date-like string to ISO date string."""
    if value is None:
        return None
    if hasattr(value, "strftime"):  # datetime or date object
        try:
            return value.strftime("%Y-%m-%d")
        except Exception:
            return None
    s = str(value).strip()
    if not s or s.lower() == "nan":
        return None
    for fmt in ("%Y-%m-%d", "%d-%b-%Y", "%b %d, %Y", "%d/%m/%Y"):
        try:
            return datetime.strptime(s, fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    return None


def fetch_dividends(symbol: str, from_date: str | None = None) -> list[dict]:
    """Fetch dividend events for a symbol from PSX financial reports.

    Returns a list of dividend events sorted newest first.
    Note: PSX provides report TYPE and dates, but not amount_per_share.
    The caller should use the manual entry feature for exact amounts.
    """
    symbol = symbol.strip().upper()
    if not symbol:
        return []

    try:
        df = psxdata.fundamentals(symbol=symbol, cache=True)

        if df.empty:
            # Fallback: try fetching all and filtering
            df = psxdata.fundamentals(cache=True)
            if "symbol" in df.columns:
                df = df[df["symbol"] == symbol]

        if df.empty:
            return []

        # Columns from FundamentalsScraper: symbol, year, type, period_ended,
        # posting_date, posting_time, document (dates already parsed as datetime)
        if "type" not in df.columns:
            return []

        df = df.copy()
        df["type_upper"] = df["type"].fillna("").str.upper()

        cash_mask = df["type_upper"].apply(
            lambda t: any(dt in t for dt in CASH_DIVIDEND_TYPES)
        )
        bonus_mask = df["type_upper"].apply(
            lambda t: any(dt in t for dt in BONUS_TYPES)
        )
        df_cash = df[cash_mask].copy()
        df_bonus = df[bonus_mask].copy()

        results = []

        for _, row in df_cash.iterrows():
            # posting_date is the ex-dividend date (already a datetime from scraper)
            date = _date_to_iso(row.get("posting_date")) or _date_to_iso(row.get("period_ended"))
            if not date:
                continue
            if from_date and date < from_date:
                continue
            results.append({
                "date": date,
                "type": "cash",
                "dividend_type": str(row.get("type", "")).strip() or "cash",
            })

        for _, row in df_bonus.iterrows():
            date = _date_to_iso(row.get("posting_date")) or _date_to_iso(row.get("period_ended"))
            if not date:
                continue
            if from_date and date < from_date:
                continue
            results.append({
                "date": date,
                "type": "bonus",
                "dividend_type": str(row.get("type", "")).strip() or "bonus",
            })

        # Sort newest first
        results.sort(key=lambda x: x["date"], reverse=True)
        return results

    except Exception as e:
        print(f"Dividends fetch error for {symbol}: {e}", file=sys.stderr)
        return []


def main() -> None:
    if len(sys.argv) < 2 or sys.argv[1] in ("-h", "--help"):
        print("Usage: python psx_dividends.py <SYMBOL> [--from YYYY-MM-DD]")
        sys.exit(0)

    symbol = sys.argv[1]
    from_date = None

    if "--from" in sys.argv:
        idx = sys.argv.index("--from")
        if idx + 1 < len(sys.argv):
            from_date = sys.argv[idx + 1]

    dividends = fetch_dividends(symbol, from_date)
    print(json.dumps(dividends))


if __name__ == "__main__":
    main()