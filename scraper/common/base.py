"""
Shared utilities, constants, record format, and BaseScraper used by every site scraper.

STANDARD JSON RECORD FORMAT (all sites must produce this):
{
  "id": "<site_key>-<idx>",
  "source": {
    "site":       str,   # site key, e.g. "filmyfly"
    "site_name":  str,   # display name, e.g. "FilmyFly"
    "detail_url": str,
    "scraped_at": str    # ISO-8601 UTC
  },
  "title": {
    "raw":   str,        # original scraped text
    "clean": str,        # noise-stripped title
    "year":  str|null
  },
  "category":     "Movie"|"Web Series"|"Anime",
  "content_type": "movie"|"series"|"anime",
  "media": {
    "poster":      str|null,
    "screenshots": [str, ...]
  },
  "info": {
    "genre":        str|null,
    "language":     str|null,
    "duration":     str|null,
    "release_date": str|null,
    "description":  str|null,
    "cast":         [str, ...],
    "director":     str|null,
    "imdb_rating":  str|null
  },
  "files": {
    "available_sizes": [str, ...]
  },
  "tags":      [str, ...],
  "downloads": [
    {
      "label":     str,
      "link":      str,
      "quality":   str|null,   # "480p", "720p", "1080p", "4K"
      "size":      str|null,   # "700MB", "1.4GB"
      "is_direct": bool
    }
  ]
}
"""

import re
import json
import asyncio
import httpx
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from typing import Optional
from urllib.parse import urljoin


# ─── HTTP ────────────────────────────────────────────────────────────────────

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}

# ─── Filter lists ────────────────────────────────────────────────────────────

KNOWN_AD_DOMAINS = [
    "doubleclick.net", "adsterra", "bet365", "popads", "propellerads",
    "exoclick", "onclickads", "admaven", "adnxs", "googlesyndication",
    "clickadu", "trafficfactory", "telegram.me", "t.me",
]

TRUSTED_HOST_DOMAINS = [
    "drive.google.com", "mega.nz", "pixeldrain.com", "mediafire.com",
    "1fichier.com", "gofile.io", "hubcloud", "streamtape", "mixdrop",
    "doodstream", "streamlare", "upstream", "filemoon", "fastdl",
    "gdtot", "katdrive", "instantdl", "drivebot", "sharerpw",
]

ANIME_KEYWORDS = [
    "anime", " ova ", " ona ", "manhwa", "manga",
    "dubbed anime", "anime series", "japanese animation",
]

SERIES_KEYWORDS = [
    "web series", "webseries", " season ", "complete season",
    "s01e", "s02e", "s03e", "episode", " ep ", "ep.", "epis",
    "all episodes", "complete series", "mini series",
]

SIZE_PATTERN = re.compile(r'^\d+(\.\d+)?\s*(mb|gb|kb|tb)', re.IGNORECASE)

QUALITY_PATTERN = re.compile(r'\b(480p|720p|1080p|2160p|4k|uhd|fhd|hd)\b', re.IGNORECASE)

# ─── Text utilities ──────────────────────────────────────────────────────────

def detect_content_type(title: str, category: str = "") -> str:
    lower = (title + " " + category).lower()
    if any(k in lower for k in ANIME_KEYWORDS):
        return "anime"
    if any(k in lower for k in SERIES_KEYWORDS) or "series" in lower:
        return "series"
    return "movie"


def clean_title(raw: str) -> str:
    t = re.sub(r'\(.*?\)', '', raw)
    t = re.sub(r'\[.*?\]', '', t)
    for kw in [
        "South Hindi Dubbed", "Hindi Dubbed", "Dual Audio", "Clear Hindi",
        "UnCut", "Uncut", "WEB-DL", "WEBRip", "DVDRip", "BluRay",
        "Web Series", "Download", "Free",
    ]:
        t = re.sub(r'\b' + re.escape(kw) + r'\b', "", t, flags=re.IGNORECASE)
    for pat in [
        r'\bHD\b', r'\bESub\b', r'\bHQCam\b', r'\bHEVC\b', r'\bMovie\b',
        r'\b480p\b', r'\b720p\b', r'\b1080p\b', r'\b2160p\b', r'\b4K\b',
        r'\bUHD\b', r'\bFHD\b', r'\bPreDVD\b',
    ]:
        t = re.sub(pat, "", t, flags=re.IGNORECASE)
    for pat in [
        r'\s+\bSouth\b\s*$', r'\s+\bBollywood\b\s*$', r'\s+\bHollywood\b\s*$',
        r'\s+\bPunjabi\b\s*$', r'\s+\bAnime\b\s*$',
    ]:
        t = re.sub(pat, "", t, flags=re.IGNORECASE)
    t = re.sub(r'\s+', ' ', t).strip(" -–|·:")
    return t if t and len(t) > 1 else raw.strip()


def extract_year(text: str) -> Optional[str]:
    m = re.search(r'\b(19\d{2}|20\d{2})\b', text)
    return m.group(1) if m else None


def normalize_duration(raw: str) -> str:
    if not raw:
        return raw
    raw = re.sub(r'\bmint\b', 'min', raw, flags=re.IGNORECASE)
    raw = re.sub(r'\bminutes?\b', 'min', raw, flags=re.IGNORECASE)
    return raw.strip()


def extract_quality(text: str) -> Optional[str]:
    m = QUALITY_PATTERN.search(text)
    return m.group(0).upper() if m else None


def extract_size(text: str) -> Optional[str]:
    m = re.search(r'(\d+(?:\.\d+)?\s*(?:MB|GB|KB|TB))', text, re.IGNORECASE)
    return m.group(1) if m else None


# ─── Image utilities ─────────────────────────────────────────────────────────

def get_clean_src(img_tag, base_url: str) -> Optional[str]:
    if not img_tag:
        return None
    src = (
        img_tag.get("data-src")
        or img_tag.get("data-original")
        or img_tag.get("data-lazy-src")
        or img_tag.get("data-lazysrc")
        or img_tag.get("src")
    )
    if src:
        src = src.strip()
        if not src.startswith("data:image") and src.startswith(("http", "/")):
            return urljoin(base_url, src)
    return None


def is_noise_image(url: str) -> bool:
    lower = url.lower()
    return any(k in lower for k in ["logo", "banner", "telegram", "icon", "ad", "pixel", "spinner"])


# ─── JSON-LD extraction ──────────────────────────────────────────────────────

def extract_jsonld(soup) -> dict:
    """Return merged fields from JSON-LD script tags (best-effort)."""
    result = {}
    for script in soup.find_all("script", {"type": "application/ld+json"}):
        try:
            data = json.loads(script.string or "")
            if isinstance(data, list):
                data = next((d for d in data if isinstance(d, dict)), {})
            if not isinstance(data, dict):
                continue
            if not result.get("genre") and data.get("genre"):
                g = data["genre"]
                result["genre"] = ", ".join(g) if isinstance(g, list) else str(g)
            if not result.get("duration") and data.get("duration"):
                result["duration"] = normalize_duration(str(data["duration"]))
            if not result.get("release_date") and data.get("datePublished"):
                result["release_date"] = data["datePublished"][:10]
            if not result.get("description") and data.get("description"):
                result["description"] = data["description"][:300]
            if not result.get("cast"):
                actors = data.get("actor", [])
                if isinstance(actors, list):
                    result["cast"] = [a.get("name", "") for a in actors if isinstance(a, dict) and a.get("name")][:10]
            if not result.get("director") and data.get("director"):
                d = data["director"]
                if isinstance(d, dict):
                    result["director"] = d.get("name")
                elif isinstance(d, list) and d:
                    result["director"] = d[0].get("name") if isinstance(d[0], dict) else str(d[0])
            if not result.get("imdb_rating") and data.get("aggregateRating"):
                r = data["aggregateRating"]
                if isinstance(r, dict):
                    result["imdb_rating"] = str(r.get("ratingValue", ""))
        except Exception:
            pass
    return result


# ─── Standard record builder ─────────────────────────────────────────────────

def make_record(
    idx: int,
    site_key: str,
    site_name: str,
    raw_title: str,
    detail_url: str,
    poster: Optional[str],
    screenshots: list,
    info: dict,
    tags: list,
    downloads: list,
) -> dict:
    """
    Build the standard Movi JSON record.
    `info` keys: genre, language, duration, release_date, description, cast, director, imdb_rating, available_sizes
    """
    lower = raw_title.lower()
    if any(k in lower for k in ANIME_KEYWORDS):
        category = "Anime"
        content_type = "anime"
    elif any(k in lower for k in SERIES_KEYWORDS) or "series" in lower:
        category = "Web Series"
        content_type = "series"
    else:
        category = "Movie"
        content_type = "movie"

    year = (
        info.get("release_date", "")[:4]
        if info.get("release_date") and re.match(r'20\d{2}', info.get("release_date", ""))
        else extract_year(raw_title) or extract_year(detail_url)
    )

    return {
        "id": f"{site_key}-{idx:04d}",
        "source": {
            "site":       site_key,
            "site_name":  site_name,
            "detail_url": detail_url,
            "scraped_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        },
        "title": {
            "raw":   raw_title,
            "clean": clean_title(raw_title),
            "year":  year,
        },
        "category":     category,
        "content_type": content_type,
        "media": {
            "poster":      poster,
            "screenshots": [s for s in (screenshots or []) if s],
        },
        "info": {
            "genre":        info.get("genre"),
            "language":     info.get("language"),
            "duration":     info.get("duration"),
            "release_date": info.get("release_date"),
            "description":  info.get("description"),
            "cast":         info.get("cast") or [],
            "director":     info.get("director"),
            "imdb_rating":  info.get("imdb_rating"),
        },
        "files": {
            "available_sizes": info.get("available_sizes") or [],
        },
        "tags":      tags or [],
        "downloads": downloads or [],
    }


# ─── Base scraper class ───────────────────────────────────────────────────────

class BaseScraper(ABC):
    """
    Every site scraper extends this.
    Set SITE_KEY and SITE_NAME as class attributes.
    Implement scrape().
    """
    SITE_KEY:  str = ""
    SITE_NAME: str = ""

    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip("/")

    @abstractmethod
    async def scrape(
        self,
        client: httpx.AsyncClient,
        max_pages: int = 50,
        limit: Optional[int] = None,
        delay: float = 2.0,
    ) -> list:
        """Return a list of standard record dicts."""
        ...

    def build_record(self, idx, raw_title, detail_url, poster, screenshots, info, tags, downloads):
        return make_record(
            idx, self.SITE_KEY, self.SITE_NAME,
            raw_title, detail_url, poster, screenshots, info, tags, downloads,
        )
