#!/usr/bin/env python3
"""PSX quote fetcher — wraps psxdata for use from Node.js.

Usage:
    python psx_quote.py ENGRO,LUCK,HBL

Output: JSON matching src/lib/yahoo/types.ts QuoteResult
"""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

# Ensure psxdata is importable — install if missing
def ensure_psxdata() -> None:
    try:
        import psxdata  # noqa: F401
    except ImportError:
        print("Installing psxdata...", file=sys.stderr)
        subprocess.check_call([sys.executable, "-m", "pip", "install", "psxdata", "-q"])
        # Clear import cache and re-import
        for mod in list(sys.modules.keys()):
            if "psxdata" in mod or "psx" in mod:
                del sys.modules[mod]

ensure_psxdata()

import psxdata
from psxdata import PSXClient

def fetch_quotes(symbols: list[str]) -> dict:
    """Fetch live quotes for the given symbols via PSX screener.

    Returns a QuoteResult-compatible dict.
    Symbols may have .KA suffix (e.g. "HBL.KA") — these are stripped before lookup.
    """
    result: dict = {"prices": {}, "errors": []}
    # Strip .KA suffix if present — PSX screener uses plain symbols
    sym_list = [s.strip().upper().replace('.KA', '').replace('.ka', '') for s in symbols if s.strip()]

    if not sym_list:
        return result

    try:
        # psxdata.quote() fetches the full screener once and caches 15 min.
        # We call it per-symbol but the library handles deduplication internally.
        for sym in sym_list:
            try:
                df = psxdata.quote(sym, cache=True)
                if df.empty:
                    result["errors"].append(sym)
                    continue

                row = df.iloc[0]

                # Map PSX screener columns to our expected shape
                price = _safe_float(row.get("price")) or _safe_float(row.get("current"))
                if price is None:
                    result["errors"].append(sym)
                    continue

                # Restore .KA suffix so caller can match DB symbols
                result["prices"][f"{sym}.KA"] = {
                    "symbol": sym,
                    "price": price,
                    "currency": "PKR",
                    "market_state": _market_state(row),
                    "fetched_at": _iso_now(),
                    "stale": False,
                }
            except Exception as e:
                print(f"Error fetching {sym}: {e}", file=sys.stderr)
                result["errors"].append(sym)

    except Exception as e:
        print(f"Failed to initialize PSX client: {e}", file=sys.stderr)
        for sym in sym_list:
            result["errors"].append(sym)

    return result


def _safe_float(val) -> float | None:
    """Coerce a value to float, returning None on failure."""
    if val is None:
        return None
    try:
        f = float(val)
        return None if (f != f) else f  # reject NaN
    except (TypeError, ValueError):
        return None


def _market_state(row) -> str:
    """Determine market state from the screener row."""
    change = _safe_float(row.get("change"))
    current = _safe_float(row.get("current"))
    ldcp = _safe_float(row.get("ldcp"))

    if change is None or current is None:
        return "UNKNOWN"
    if ldcp is None:
        return "PRE" if current == 0 else "REGULAR"
    if change > 0:
        return "REGULAR"  # could be "POST" if after close
    elif change < 0:
        return "REGULAR"
    else:
        return "CLOSED"


def _iso_now() -> str:
    from datetime import datetime, timezone
    return datetime.now(timezone.utc).isoformat()


def main() -> None:
    if len(sys.argv) < 2 or sys.argv[1] in ("-h", "--help"):
        print("Usage: python psx_quote.py SYMBOL1,SYMBOL2,...")
        sys.exit(0)

    symbols_str = sys.argv[1]
    symbols = [s.strip() for s in symbols_str.split(",") if s.strip()]

    result = fetch_quotes(symbols)
    print(json.dumps(result))


if __name__ == "__main__":
    main()