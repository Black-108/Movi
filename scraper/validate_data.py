"""
Movi.json Data Validator
Reads the output JSON and reports every format or data quality issue found.

Usage:
  python validate_data.py
  python validate_data.py --file path/to/custom.json
  python validate_data.py --fix       # auto-fix what it can and write back
"""

import json
import re
import sys
import argparse
from pathlib import Path
from typing import Optional

BASE_DIR     = Path(__file__).parent
DEFAULT_JSON = (BASE_DIR / "../frontend/public/Movi.json").resolve()

REQUIRED_FIELDS = ["id", "scraped_title", "clean_title", "detail_page_url", "category", "media", "file_info", "downloads"]
REQUIRED_INFO   = ["genre", "duration", "release_date", "language", "starcast", "available_sizes", "description"]
SIZE_PATTERN    = re.compile(r'^\d+(\.\d+)?\s*(mb|gb|kb|tb)', re.IGNORECASE)
URL_PATTERN     = re.compile(r'^https?://')
ANIME_KW        = ['anime', ' ova ', ' ona ', 'dubbed anime']
SERIES_KW       = ['web series', 'webseries', ' season ', 's01e', 's02e', 'episode']
TRAILING_REGIONAL = re.compile(
    r'\s+(South|Bollywood|Hollywood|Panjabi|Punjabi|Anime)\s*$', re.IGNORECASE
)


class IssueCollector:
    def __init__(self):
        self.errors   = []
        self.warnings = []
        self.infos    = []

    def error(self, record_id, field, msg):
        self.errors.append(f"  [id={record_id}] {field}: {msg}")

    def warn(self, record_id, field, msg):
        self.warnings.append(f"  [id={record_id}] {field}: {msg}")

    def info(self, record_id, field, msg):
        self.infos.append(f"  [id={record_id}] {field}: {msg}")

    def report(self):
        total = len(self.errors) + len(self.warnings) + len(self.infos)
        print(f"\n{'='*60}")
        print(f"VALIDATION REPORT — {total} issues found")
        print(f"  Errors:   {len(self.errors)}")
        print(f"  Warnings: {len(self.warnings)}")
        print(f"  Infos:    {len(self.infos)}")
        print(f"{'='*60}")
        if self.errors:
            print("\n--- ERRORS (must fix) ---")
            for e in self.errors[:40]: print(e)
            if len(self.errors) > 40: print(f"  ... and {len(self.errors)-40} more")
        if self.warnings:
            print("\n--- WARNINGS (should fix) ---")
            for w in self.warnings[:40]: print(w)
            if len(self.warnings) > 40: print(f"  ... and {len(self.warnings)-40} more")
        if self.infos:
            print("\n--- INFOS (optional) ---")
            for i in self.infos[:20]: print(i)
        print()


def infer_content_type(record: dict) -> str:
    text = (record.get("scraped_title", "") + " " + record.get("category", "")).lower()
    if any(k in text for k in ANIME_KW): return "anime"
    if any(k in text for k in SERIES_KW) or "series" in text: return "series"
    return "movie"


def validate_record(record: dict, issues: IssueCollector):
    rid = record.get("id", "?")

    for f in REQUIRED_FIELDS:
        if f not in record:
            issues.error(rid, f, "MISSING required field")

    ct = record.get("clean_title", "")
    if not ct or not ct.strip():
        issues.error(rid, "clean_title", "empty or null")
    else:
        if "  " in ct:
            issues.warn(rid, "clean_title", f"extra spaces: {repr(ct)}")
        if TRAILING_REGIONAL.search(ct):
            issues.warn(rid, "clean_title", f"trailing regional word: {repr(ct)}")
        if len(ct) < 3:
            issues.warn(rid, "clean_title", f"suspiciously short: {repr(ct)}")

    url = record.get("detail_page_url", "")
    if not url:
        issues.error(rid, "detail_page_url", "empty or null")
    elif not URL_PATTERN.match(url):
        issues.error(rid, "detail_page_url", f"not a valid URL: {url[:60]}")

    media = record.get("media", {})
    if not isinstance(media, dict):
        issues.error(rid, "media", "must be a dict")
    else:
        poster = media.get("main_poster")
        if not poster:
            issues.warn(rid, "media.main_poster", "null — card will show fallback")
        elif not URL_PATTERN.match(str(poster)):
            issues.error(rid, "media.main_poster", f"not a URL: {str(poster)[:60]}")

        screenshot = media.get("screenshot")
        if screenshot is None or screenshot == [] or screenshot == "":
            issues.info(rid, "media.screenshot", "no screenshot")
        elif isinstance(screenshot, str):
            issues.warn(rid, "media.screenshot", "string instead of array")
        elif isinstance(screenshot, list):
            for s in screenshot:
                if s and not URL_PATTERN.match(str(s)):
                    issues.error(rid, "media.screenshot", f"item not a URL: {str(s)[:60]}")

    info = record.get("file_info", {})
    if isinstance(info, dict):
        for f in REQUIRED_INFO:
            if f not in info:
                issues.warn(rid, f"file_info.{f}", "MISSING key")

        duration = info.get("duration", "")
        if duration and "mint" in duration.lower():
            issues.warn(rid, "file_info.duration", f"typo 'mint': {repr(duration)}")

        sizes = info.get("available_sizes", [])
        if isinstance(sizes, list):
            quality_tags = [s for s in sizes if s and not SIZE_PATTERN.match(str(s).strip())]
            if quality_tags:
                issues.warn(rid, "file_info.available_sizes", f"non-size values: {quality_tags}")

    downloads = record.get("downloads", [])
    if not isinstance(downloads, list):
        issues.error(rid, "downloads", "must be an array")
    elif not downloads:
        issues.warn(rid, "downloads", "empty — no download links")
    else:
        for i, dl in enumerate(downloads):
            if not dl.get("link"):
                issues.error(rid, f"downloads[{i}].link", "empty or null")

    if "source_site" not in record:
        issues.info(rid, "source_site", "missing — old record; will be inferred on next scrape")
    if "content_type" not in record:
        issues.info(rid, "content_type", f"missing — would be inferred as '{infer_content_type(record)}'")


def auto_fix(record: dict):
    changes = []
    r = dict(record)

    ct = r.get("clean_title", "")
    if ct and "  " in ct:
        fixed = re.sub(r'\s+', ' ', ct).strip()
        if fixed != ct:
            r["clean_title"] = fixed
            changes.append(f"clean_title spaces fixed")

    ct = r.get("clean_title", "")
    fixed = TRAILING_REGIONAL.sub("", ct).strip()
    if fixed != ct and fixed:
        r["clean_title"] = fixed
        changes.append(f"clean_title trailing regional removed")

    info = r.get("file_info", {})
    sizes = info.get("available_sizes", [])
    if isinstance(sizes, list):
        clean_sizes = [s for s in sizes if s and SIZE_PATTERN.match(str(s).strip())]
        if clean_sizes != sizes:
            r.setdefault("file_info", {})["available_sizes"] = clean_sizes
            changes.append(f"available_sizes cleaned")

    dur = info.get("duration", "")
    if dur and "mint" in dur.lower():
        fixed_dur = re.sub(r'\bmint\b', 'min', dur, flags=re.IGNORECASE)
        r.setdefault("file_info", {})["duration"] = fixed_dur
        changes.append(f"duration typo fixed")

    media = r.get("media", {})
    ss = media.get("screenshot")
    if isinstance(ss, str):
        r.setdefault("media", {})["screenshot"] = [ss] if ss else []
        changes.append("screenshot string → array")

    if "content_type" not in r:
        ct_inferred = infer_content_type(r)
        r["content_type"] = ct_inferred
        changes.append(f"content_type added: '{ct_inferred}'")

    return r, changes


def main():
    parser = argparse.ArgumentParser(description="Validate and optionally fix Movi.json")
    parser.add_argument("--file", type=str, default=None, help="Path to JSON file to validate")
    parser.add_argument("--fix", action="store_true", help="Auto-fix issues and write back to file")
    args = parser.parse_args()

    json_path = Path(args.file).resolve() if args.file else DEFAULT_JSON
    if not json_path.exists():
        print(f"File not found: {json_path}")
        sys.exit(1)

    print(f"Validating: {json_path}")
    with open(json_path, encoding="utf-8") as f:
        data = json.load(f)

    if not isinstance(data, list):
        print("ERROR: Root JSON must be an array.")
        sys.exit(1)

    print(f"Records in file: {len(data)}")

    issues = IssueCollector()
    for record in data:
        validate_record(record, issues)

    issues.report()

    content_types: dict = {}
    source_sites: dict  = {}
    has_poster    = sum(1 for r in data if r.get("media", {}).get("main_poster"))
    has_downloads = sum(1 for r in data if r.get("downloads"))
    has_cast      = sum(1 for r in data if r.get("file_info", {}).get("starcast"))
    for r in data:
        ct = r.get("content_type", "MISSING")
        ss = r.get("source_site", "MISSING")
        content_types[ct] = content_types.get(ct, 0) + 1
        source_sites[ss]  = source_sites.get(ss, 0) + 1

    pct = lambda n: f"{100*n//len(data)}%" if data else "0%"
    print("DATA STATS:")
    print(f"  Total records    : {len(data)}")
    print(f"  Has poster       : {has_poster} ({pct(has_poster)})")
    print(f"  Has downloads    : {has_downloads} ({pct(has_downloads)})")
    print(f"  Has cast info    : {has_cast} ({pct(has_cast)})")
    print(f"  By content_type  : {content_types}")
    print(f"  By source_site   : {source_sites}")

    if args.fix:
        print("\nApplying auto-fixes...")
        fixed_data = []
        total_changes = 0
        for record in data:
            fixed, changes = auto_fix(record)
            fixed_data.append(fixed)
            if changes:
                total_changes += len(changes)
                for c in changes:
                    print(f"  [id={record.get('id','?')}] {c}")

        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(fixed_data, f, ensure_ascii=False, indent=2)
        print(f"\n✓ Applied {total_changes} fixes. Saved to {json_path}")
    else:
        print(f"\nRun with --fix to auto-repair common issues.")


if __name__ == "__main__":
    main()
