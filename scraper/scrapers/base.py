import re
import asyncio
import httpx
from abc import ABC, abstractmethod
from typing import Optional
from urllib.parse import urljoin


HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}

KNOWN_AD_DOMAINS = [
    "doubleclick.net", "adsterra", "bet365", "popads", "propellerads",
    "exoclick", "onclickads", "telegram.me", "t.me", "admaven",
    "adnxs", "googlesyndication", "clickadu", "trafficfactory",
]

TRUSTED_HOST_DOMAINS = [
    "drive.google.com", "mega.nz", "pixeldrain.com", "mediafire.com",
    "1fichier.com", "gofile.io", "hubcloud", "streamtape", "mixdrop",
    "doodstream", "streamlare", "upstream", "filemoon", "fastdl",
]

ANIME_KEYWORDS = [
    "anime", " ova ", " ona ", "ova)", "ona)", "manhwa", "manga",
    "dubbed anime", "anime series", "japanese", "japanese animation",
    "season 1 anime", "complete anime",
]

SERIES_KEYWORDS = [
    "web series", "webseries", " season ", "complete season",
    "s01e", "s02e", "s03e", "episode", " ep ", "ep.", "epis",
    "all episodes", "complete series",
]

SIZE_PATTERN = re.compile(r'^\d+(\.\d+)?\s*(mb|gb|kb|tb)', re.IGNORECASE)


def detect_content_type(title: str, category: str) -> str:
    lower = (title + " " + category).lower()
    if any(k in lower for k in ANIME_KEYWORDS):
        return "anime"
    if any(k in lower for k in SERIES_KEYWORDS) or "series" in lower:
        return "series"
    return "movie"


def get_clean_src(img_tag, base_url: str) -> Optional[str]:
    if not img_tag:
        return None
    src = (
        img_tag.get("data-src")
        or img_tag.get("data-original")
        or img_tag.get("data-lazy-src")
        or img_tag.get("src")
    )
    if src:
        src = src.strip()
        if not src.startswith("data:image") and src.startswith(("http", "/")):
            return urljoin(base_url, src)
    return None


def clean_movie_title(raw_title: str) -> str:
    title = re.sub(r'\(.*?\)', '', raw_title)
    title = re.sub(r'\[.*?\]', '', title)

    compound_noise = [
        "South Hindi Dubbed", "Hindi Dubbed", "Dual Audio", "Clear Hindi",
        "UnCut", "Uncut", "WEB-DL", "WEBRip", "DVDRip", "BluRay",
        "Web Series", "Download", "Free",
    ]
    for kw in compound_noise:
        title = re.sub(r'\b' + re.escape(kw) + r'\b', "", title, flags=re.IGNORECASE)

    single_noise = [
        r'\bHD\b', r'\bESub\b', r'\bHQCam\b', r'\bPreDVD\b', r'\bHEVC\b',
        r'\bMovie\b', r'\b480p\b', r'\b720p\b', r'\b1080p\b', r'\b2160p\b',
        r'\b4K\b', r'\bUHD\b', r'\bFHD\b',
    ]
    for pattern in single_noise:
        title = re.sub(pattern, "", title, flags=re.IGNORECASE)

    regional_trailing = [
        r'\s+\bSouth\b\s*$', r'\s+\bBollywood\b\s*$', r'\s+\bHollywood\b\s*$',
        r'\s+\bPanjabi\b\s*$', r'\s+\bPunjabi\b\s*$', r'\s+\bAnime\b\s*$',
    ]
    for pattern in regional_trailing:
        title = re.sub(pattern, "", title, flags=re.IGNORECASE)

    title = re.sub(r'\s+', ' ', title).strip(" -–|·:")
    return title if title and len(title) > 1 else raw_title.strip()


def normalize_duration(raw: str) -> str:
    if not raw:
        return raw
    return re.sub(r'\bmint\b', 'min', raw, flags=re.IGNORECASE)


class BaseScraper(ABC):
    def __init__(self, site_config: dict):
        self.config = site_config
        self.key = site_config["key"]
        self.name = site_config["name"]
        self.base_url = site_config["base_url"].rstrip("/")

    @abstractmethod
    async def scrape(
        self,
        client: httpx.AsyncClient,
        max_pages: int = 50,
        limit: Optional[int] = None,
        delay: float = 2.0,
    ) -> list:
        ...

    def make_record(self, idx: int, raw_title: str, detail_url: str,
                    poster: Optional[str], screenshots,
                    file_info: dict, tags: list, downloads: list) -> dict:
        clean_title = clean_movie_title(raw_title)
        lower = raw_title.lower()
        if any(k in lower for k in SERIES_KEYWORDS) or "series" in lower:
            category = "Web Series"
        else:
            category = "Movie"
        content_type = detect_content_type(raw_title, category)

        if isinstance(screenshots, list):
            screenshot_list = [s for s in screenshots if s]
        elif screenshots:
            screenshot_list = [screenshots]
        else:
            screenshot_list = []

        return {
            "id": f"{self.key}-{idx}",
            "source_site": self.key,
            "source_site_name": self.name,
            "content_type": content_type,
            "scraped_title": raw_title,
            "clean_title": clean_title,
            "detail_page_url": detail_url,
            "category": "Anime" if content_type == "anime" else category,
            "media": {
                "main_poster": poster,
                "screenshot": screenshot_list,
            },
            "file_info": file_info,
            "tags": tags,
            "downloads": downloads,
        }
