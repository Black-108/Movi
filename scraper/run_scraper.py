"""
Movi Scraper Orchestrator
─────────────────────────
Auto-discovers every scraper under sites/<name>/__init__.py,
runs them in parallel, and writes the unified Movi.json.

Usage:
  python run_scraper.py                        # all enabled sites, parallel
  python run_scraper.py --site filmyfly        # one site only
  python run_scraper.py --limit 10             # test: max 10 items per site
  python run_scraper.py --split                # save per-site JSON files too
  python run_scraper.py --site-concurrency 5  # how many sites run at once
  python run_scraper.py --sequential           # disable parallel mode
  python run_scraper.py --output path/out.json # override output path
  python run_scraper.py --output-dir path/     # override split dir
"""

import sys
import os
import asyncio
import importlib
import json
import argparse
from datetime import datetime
from pathlib import Path
from typing import Optional

import httpx

BASE_DIR    = Path(__file__).parent
SITES_DIR   = BASE_DIR / "sites"
CONFIG_PATH = BASE_DIR / "config" / "sites.json"

# ─── Config ──────────────────────────────────────────────────────────────────

def load_config() -> dict:
    with open(CONFIG_PATH, encoding="utf-8") as f:
        return json.load(f)


def output_path(config: dict, override: Optional[str]) -> Path:
    if override:
        return Path(override)
    raw = config.get("output_path", "./Movi.json")
    return (BASE_DIR / raw).resolve()


def split_dir(config: dict, override: Optional[str]) -> Path:
    if override:
        return Path(override).resolve()
    base = output_path(config, None).parent
    return base / "site_data"


# ─── Site discovery ──────────────────────────────────────────────────────────

def discover_scrapers(sites_config: list, only_key: Optional[str] = None) -> list:
    """
    For each entry in sites.json that is enabled (and matches --site if given),
    import sites/<key>/__init__.py and grab its Scraper class.
    Returns list of (site_cfg, ScraperClass).
    """
    sys.path.insert(0, str(BASE_DIR))
    scrapers = []

    for cfg in sites_config:
        key = cfg["key"]
        if only_key and key != only_key:
            continue
        if not only_key and not cfg.get("enabled", False):
            continue

        site_pkg = SITES_DIR / key
        if not (site_pkg / "__init__.py").exists():
            print(f"[WARN] No scraper found for '{key}' at sites/{key}/__init__.py — skipping.")
            continue

        try:
            mod = importlib.import_module(f"sites.{key}")
            cls = getattr(mod, "Scraper", None)
            if cls is None:
                print(f"[WARN] sites/{key}/__init__.py has no 'Scraper' class — skipping.")
                continue
            scrapers.append((cfg, cls))
        except Exception as e:
            print(f"[ERROR] Failed to import sites/{key}: {e}")

    return scrapers


# ─── Merge helpers ───────────────────────────────────────────────────────────

def merge_with_existing(out_path: Path, new_records: list, all_site_configs: list) -> list:
    if not out_path.exists():
        return new_records

    try:
        with open(out_path, encoding="utf-8") as f:
            existing = json.load(f)
        if not isinstance(existing, list):
            existing = []
    except Exception:
        existing = []

    new_keys = {r["source"]["site"] for r in new_records}
    kept     = [r for r in existing if r.get("source", {}).get("site") not in new_keys]
    merged   = kept + new_records
    print(f"Kept {len(kept)} existing + {len(new_records)} new = {len(merged)} total.")
    return merged


# ─── Per-site runner ─────────────────────────────────────────────────────────

async def run_site(cfg: dict, cls, client: httpx.AsyncClient,
                   max_pages: int, limit: Optional[int],
                   delay: float, sem: asyncio.Semaphore) -> list:
    async with sem:
        print(f"\n{'─'*55}")
        print(f"  START  {cfg['name']}  ({cfg['base_url']})")
        print(f"{'─'*55}")
        try:
            scraper = cls(cfg["base_url"])
            records = await scraper.scrape(client, max_pages=max_pages, limit=limit, delay=delay)
            print(f"  DONE   {cfg['name']}  →  {len(records)} records")
            return records
        except Exception as e:
            print(f"  ERROR  {cfg['name']}: {e}")
            return []


# ─── Main ────────────────────────────────────────────────────────────────────

async def run(args):
    config    = load_config()
    out       = output_path(config, args.output)
    delay     = config.get("request_delay_seconds", 2.5)
    max_pages = config.get("max_pages_per_site", 50)

    scrapers = discover_scrapers(config.get("sites", []), only_key=args.site)
    if not scrapers:
        msg = f"No scraper for key '{args.site}'." if args.site else "No enabled sites."
        print(msg)
        sys.exit(1)

    parallel     = not args.sequential
    concurrency  = args.site_concurrency if parallel else 1

    print(f"\n{'='*55}")
    print(f"  Movi Scraper  —  {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"  Sites   : {[c['name'] for c, _ in scrapers]}")
    print(f"  Mode    : {'PARALLEL ×' + str(concurrency) if parallel else 'SEQUENTIAL'}")
    print(f"  Output  : {'split + combined' if args.split else 'combined Movi.json'}")
    if args.limit:
        print(f"  Limit   : {args.limit} items per site (TEST MODE)")
    print(f"{'='*55}\n")

    async with httpx.AsyncClient(
        follow_redirects=True,
        timeout=25.0,
        limits=httpx.Limits(max_connections=100, max_keepalive_connections=30),
    ) as client:
        sem   = asyncio.Semaphore(concurrency)
        tasks = [
            run_site(cfg, cls, client, max_pages, args.limit, delay, sem)
            for cfg, cls in scrapers
        ]
        if parallel:
            results = await asyncio.gather(*tasks)
        else:
            results = []
            for t in tasks:
                results.append(await t)

    all_records = []
    for records in results:
        all_records.extend(records)

    if not all_records:
        print("\nNo records collected. Not overwriting existing files.")
        sys.exit(0)

    # ── Split output ──────────────────────────────────────────────────────────
    if args.split:
        sd = split_dir(config, args.output_dir)
        sd.mkdir(parents=True, exist_ok=True)
        by_site: dict = {}
        for r in all_records:
            key = r.get("source", {}).get("site", "unknown")
            by_site.setdefault(key, []).append(r)
        for site_key, records in by_site.items():
            fp = sd / f"{site_key}.json"
            with open(fp, "w", encoding="utf-8") as f:
                json.dump(records, f, ensure_ascii=False, indent=2)
            print(f"  ✓ {site_key}.json  →  {len(records)} records  →  {fp}")
        print(f"\nSplit output: {len(all_records)} records in {len(by_site)} files → {sd}")

    # ── Combined output ───────────────────────────────────────────────────────
    merged = merge_with_existing(out, all_records, config.get("sites", []))
    out.parent.mkdir(parents=True, exist_ok=True)
    with open(out, "w", encoding="utf-8") as f:
        json.dump(merged, f, ensure_ascii=False, indent=2)
    print(f"\n✓ Combined: {len(merged)} records → {out}")

    # ── Summary ───────────────────────────────────────────────────────────────
    by_type: dict = {}
    by_site_name: dict = {}
    for r in all_records:
        ct  = r.get("content_type", "movie")
        sn  = r.get("source", {}).get("site_name", "?")
        by_type[ct]       = by_type.get(ct, 0) + 1
        by_site_name[sn]  = by_site_name.get(sn, 0) + 1

    print("\nBy content type:")
    for k, v in sorted(by_type.items()):
        print(f"  {k}: {v}")
    print("\nBy site:")
    for k, v in sorted(by_site_name.items()):
        print(f"  {k}: {v}")
    print(f"\nFinished at {datetime.now().strftime('%H:%M:%S')}\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Movi multi-site scraper")
    parser.add_argument("--site",             type=str,  default=None,  help="Run one site by key")
    parser.add_argument("--limit",            type=int,  default=None,  help="Max items per site (test mode)")
    parser.add_argument("--output",           type=str,  default=None,  help="Override combined output path")
    parser.add_argument("--split",            action="store_true",       help="Also save per-site JSON files")
    parser.add_argument("--output-dir",       type=str,  default=None,  help="Directory for split files")
    parser.add_argument("--sequential",       action="store_true",       help="Disable parallel mode")
    parser.add_argument("--site-concurrency", type=int,  default=3,     help="Parallel site limit (default 3)")
    args = parser.parse_args()
    asyncio.run(run(args))
