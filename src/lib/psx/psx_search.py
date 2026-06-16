#!/usr/bin/env python3
"""PSX stock search — wraps psxdata tickers() for use from Node.js.

Usage:
    python psx_search.py "oil"

Output: JSON array of matching stocks.
"""
from __future__ import annotations

import json
import subprocess
import sys

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

def search_stocks(query: str, limit: int = 10) -> list[dict]:
    """Search PSX symbols by query string.

    Matches against symbol, name, and sector_name (case-insensitive, partial match).
    Excludes ETFs and debt instruments by default.
    """
    if not query or len(query.strip()) < 1:
        return []

    query_lower = query.strip().lower()

    try:
        df = psxdata.tickers(cache=True)
        if df.empty or "symbol" not in df.columns:
            return []

        # Filter: match query in symbol, name, or sector_name
        mask = (
            df["symbol"].str.lower().str.contains(query_lower, na=False) |
            df.get("name", df["symbol"]).str.lower().str.contains(query_lower, na=False) |
            df.get("sector_name", "").str.lower().str.contains(query_lower, na=False)
        )

        # Exclude ETFs and debt instruments
        if "is_etf" in df.columns:
            mask &= ~df["is_etf"].fillna(False)
        if "is_debt" in df.columns:
            mask &= ~df["is_debt"].fillna(False)

        results = df[mask].head(limit)

        return [
            {
                # Return plain symbol (no .KA) — DB add-stock dialog strips .KA before saving
                "symbol": str(row["symbol"]).strip().replace('.KA', '').replace('.ka', ''),
                "name": str(row.get("name", row["symbol"]) or row["symbol"]),
                "exchange": "KAR",
            }
            for _, row in results.iterrows()
        ]

    except Exception as e:
        print(f"Search error: {e}", file=sys.stderr)
        return []


def main() -> None:
    if len(sys.argv) < 2 or sys.argv[1] in ("-h", "--help"):
        print("Usage: python psx_search.py <query>")
        sys.exit(0)

    query = sys.argv[1]
    results = search_stocks(query, limit=10)
    print(json.dumps(results))


if __name__ == "__main__":
    main()