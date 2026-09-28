"""
Generic scraper for WordPress-based movie sites.
Works with most sites that follow the standard movie-blog pattern:
  - Category listing pages with movie card links
  - Detail pages with title, poster, metadata, and download section
"""
import re
import json
import asyncio
from typing import Optional
from urllib.parse import urljoin, urlparse
from bs4 import BeautifulSoup

from .base import (
    BaseScraper, HEADERS, KNOWN_AD_DOMAINS, TRUSTED_HOST_DOMAINS,
    SIZE_PATTERN, get_clean_src, normalize_duration,
)

_DETAIL_CONCURRENCY = 10

MOVIE_TITLE_KEYWORDS = [
    "movie", "web series", "dual audio", "hindi", "south", "anime",
    "season", "episode", "bollywood", "hollywood", "tamil", "telugu",
    "4k", "1080p", "720p", "480p", "dubbed", "bluray", "webrip",
]

DETAIL_URL_PATTERNS = [
    r'/movie/', r'/film/', r'/download/', r'/watch/', r'/post/', r'/\d{4}/',
    r'/web-series/', r'/anime/', r'/show/',
]

# Broader CSS class patterns — covers more WP movie themes
_LISTING_CARD_RE = re.compile(
    r'post|entry|item|movie|card|result|film|show|tdb-block-inner',
    re.IGNORECASE,
)


def _looks_like_detail_url(url: str) -> bool:
    return any(re.search(p, url) for p in DETAIL_URL_PATTERNS)


def _has_movie_keyword(text: str) -> bool:
    lower = text.lower()
    return any(k in lower for k in MOVIE_TITLE_KEYWORDS)


def _has_year(text: str) -> bool:
    return bool(re.search(r'\b20\d{2}\b', text))


class GenericWPScraper(BaseScraper):

    async def scrape(self, client, max_pages=50, limit=None, delay=2.5):
        discovered = []
        visited = set()
        current_url = self.base_url
        page_count = 0

        while current_url and page_count < max_pages:
            if current_url in visited:
                break
            visited.add(current_url)
            page_count += 1
            await asyncio.sleep(delay if page_count > 1 else 0)

            try:
                res = await client.get(current_url, headers=HEADERS, timeout=15.0)
                if res.status_code != 200:
                    print(f"[{self.name}] HTTP {res.status_code} on page {page_count}, stopping.")
                    break
                soup = BeautifulSoup(res.text, "html.parser")
            except Exception as exc:
                print(f"[{self.name}] Fetch error on page {page_count}: {exc}")
                break

            self._extract_listings(soup, current_url, discovered)
            print(f"[{self.name}] Page {page_count}: {len(discovered)} total discovered")

            if limit and len(discovered) >= limit:
                break

            next_url = self._find_next_page(soup, current_url)
            if next_url and next_url != current_url and next_url not in visited:
                current_url = next_url
            else:
                break

        if limit:
            discovered = discovered[:limit]

        sem = asyncio.Semaphore(_DETAIL_CONCURRENCY)
        tasks = [self._parse_detail(client, item, sem) for item in discovered]
        details_list = await asyncio.gather(*tasks)

        records = []
        for idx, (item, details) in enumerate(zip(discovered, details_list), 1):
            poster, screenshots, file_info, tags, downloads = details
            records.append(self.make_record(
                idx, item["raw_title"], item["detail_url"],
                poster, screenshots, file_info, tags, downloads,
            ))

        print(f"[{self.name}] Done — {len(records)} records collected.")
        return records

    def _extract_listings(self, soup, page_url, discovered):
        seen_urls = {item["detail_url"] for item in discovered}
        before_count = len(discovered)

        # Strategy 1: article/div cards with broader class detection
        for article in soup.find_all(["article", "div", "li"], class_=_LISTING_CARD_RE):
            a_tag = article.find("a", href=True)
            if not a_tag:
                continue
            href = urljoin(page_url, a_tag["href"])
            if href in seen_urls:
                continue

            title_tag = (
                article.find(["h1", "h2", "h3", "h4"])
                or article.find("a", class_=re.compile(r'title|name|heading', re.I))
            )
            raw_title = title_tag.get_text(strip=True) if title_tag else a_tag.get_text(strip=True)

            if not raw_title or len(raw_title) < 6:
                continue
            if not (_has_movie_keyword(raw_title) or _looks_like_detail_url(href) or _has_year(raw_title)):
                continue

            poster = None
            img = article.find("img")
            if img:
                poster = get_clean_src(img, page_url)

            seen_urls.add(href)
            discovered.append({"raw_title": raw_title, "detail_url": href, "listing_poster": poster})

        # Strategy 2: direct link scan when Strategy 1 found few results
        new_on_this_page = len(discovered) - before_count
        if new_on_this_page < 3:
            for a in soup.find_all("a", href=True):
                href = urljoin(page_url, a["href"])
                if href in seen_urls:
                    continue
                raw_title = a.get_text(strip=True)
                if not raw_title or len(raw_title) < 8:
                    continue
                if (_has_movie_keyword(raw_title) or _has_year(raw_title)) and _looks_like_detail_url(href):
                    img = a.find("img")
                    poster = get_clean_src(img, page_url) if img else None
                    seen_urls.add(href)
                    discovered.append({"raw_title": raw_title, "detail_url": href, "listing_poster": poster})

    def _find_next_page(self, soup, current_url):
        for pattern in [
            r'(Next|»|>|Older\s+posts?)',
            r'page[/-]\d+',
            r'[?&]page=\d+',
            r'[?&]paged=\d+',
        ]:
            match = soup.find("a", string=re.compile(pattern, re.IGNORECASE))
            if match and match.get("href"):
                return urljoin(current_url, match["href"])

        # Pagination links with rel="next"
        rel_next = soup.find("a", rel="next")
        if rel_next and rel_next.get("href"):
            return urljoin(current_url, rel_next["href"])

        current_page = re.search(r'page[/-](\d+)', current_url)
        if current_page:
            n = int(current_page.group(1))
            next_url = re.sub(r'page[/-]\d+', f'page/{n+1}', current_url)
            if next_url != current_url:
                return next_url

        return None

    async def _parse_detail(self, client, item, sem):
        async with sem:
            return await self._fetch_detail(client, item)

    async def _fetch_detail(self, client, item):
        detail_url = item["detail_url"]
        listing_poster = item["listing_poster"]
        fallback_poster = None
        screenshots = []      # FIX: now a list, not a single string
        file_info = {
            "genre": None, "duration": None, "release_date": None,
            "language": None, "starcast": [], "available_sizes": [], "description": None,
        }
        tags = []
        downloads = []

        try:
            res = await client.get(detail_url, headers=HEADERS, timeout=12.0)
            soup = BeautifulSoup(res.text, "html.parser")

            # --- Poster ---
            for selector in [
                {"class": re.compile(r'poster|thumbnail|featured|cover', re.I)},
                {"itemprop": "image"},
                {"class": re.compile(r'wp-post-image', re.I)},
            ]:
                img = soup.find("img", selector)
                if img:
                    url = get_clean_src(img, detail_url)
                    if url and not any(k in url.lower() for k in ["logo", "icon", "ad"]):
                        fallback_poster = url
                        break

            if not fallback_poster:
                content_div = soup.find(["article", "div"], class_=re.compile(r'content|entry|post-body', re.I))
                if content_div:
                    img = content_div.find("img")
                    if img:
                        fallback_poster = get_clean_src(img, detail_url)

            # --- Screenshots (FIX: collect up to 4) ---
            # First try: images after a "Screenshot" heading
            ss_heading = soup.find(string=re.compile(r'screenshot', re.IGNORECASE))
            if ss_heading:
                parent = ss_heading.find_parent()
                if parent:
                    for img in parent.find_all_next("img", limit=6):
                        url = get_clean_src(img, detail_url)
                        if url and url not in screenshots and not any(
                            k in url.lower() for k in ["logo", "ad", "telegram", "icon"]
                        ):
                            screenshots.append(url)
                            if len(screenshots) >= 4:
                                break

            # Fallback: images 2-5 from the main content area
            if not screenshots:
                content_div = soup.find(["article", "div"], class_=re.compile(r'content|entry', re.I))
                if content_div:
                    imgs = content_div.find_all("img")
                    for img in imgs[1:5]:
                        url = get_clean_src(img, detail_url)
                        if url and url not in screenshots and not any(
                            k in url.lower() for k in ["logo", "ad", "icon", "telegram"]
                        ):
                            screenshots.append(url)

            # --- JSON-LD structured data (richer metadata when available) ---
            for script in soup.find_all("script", {"type": "application/ld+json"}):
                try:
                    data = json.loads(script.string or "")
                    if isinstance(data, list):
                        data = data[0]
                    if isinstance(data, dict):
                        if not file_info["genre"] and data.get("genre"):
                            genres = data["genre"]
                            file_info["genre"] = ", ".join(genres) if isinstance(genres, list) else str(genres)
                        if not file_info["duration"] and data.get("duration"):
                            file_info["duration"] = normalize_duration(str(data["duration"]))
                        if not file_info["release_date"] and data.get("datePublished"):
                            file_info["release_date"] = data["datePublished"][:10]
                        if not file_info["description"] and data.get("description"):
                            file_info["description"] = data["description"][:250]
                        actors = data.get("actor", [])
                        if actors and not file_info["starcast"]:
                            if isinstance(actors, list):
                                file_info["starcast"] = [a.get("name", "") for a in actors if isinstance(a, dict)][:10]
                except Exception:
                    pass

            # --- Text-based metadata extraction ---
            page_text = soup.get_text(separator=" ")
            for field, pattern in [
                ("genre",        r'Genre\s*[:\|]\s*([^\n\r|<]{3,80})'),
                ("duration",     r'(?:Duration|Runtime)\s*[:\|]\s*([^\n\r|<]{3,40})'),
                ("release_date", r'(?:Release\s*Date?|Year)\s*[:\|]\s*([^\n\r|<]{3,30})'),
                ("language",     r'Language\s*[:\|]\s*([^\n\r|<]{3,60})'),
                ("description",  r'(?:Story|Description|Plot|Overview)\s*[:\|]\s*([^\n\r|]{20,})'),
            ]:
                if file_info.get(field):
                    continue
                m = re.search(pattern, page_text, re.IGNORECASE)
                if m:
                    file_info[field] = m.group(1).strip()[:200]

            if not file_info["starcast"]:
                sc_m = re.search(r'(?:Stars?|Cast|Starcast|Actors?)\s*[:\|]\s*([^\n\r|<]+)', page_text, re.IGNORECASE)
                if sc_m:
                    file_info["starcast"] = [s.strip() for s in re.split(r'[,|]', sc_m.group(1)) if s.strip()][:10]

            sz_m = re.search(r'(?:File\s*Size|Size)\s*[:\|]\s*([^\n\r|<]+)', page_text, re.IGNORECASE)
            if sz_m:
                raw_sizes = [s.strip() for s in sz_m.group(1).split() if s.strip()]
                file_info["available_sizes"] = [s for s in raw_sizes if SIZE_PATTERN.match(s)][:8]

            if file_info.get("duration"):
                file_info["duration"] = normalize_duration(file_info["duration"])

            if not file_info["release_date"]:
                yr = re.search(r'(20\d{2})', detail_url)
                if yr:
                    file_info["release_date"] = yr.group(1)

            # --- Tags ---
            for a in soup.find_all("a", rel="tag"):
                text = a.get_text(strip=True)
                if text and text not in tags:
                    tags.append(text)

            # Also check tag cloud links and keyword links
            if not tags:
                for a in soup.find_all("a", href=True):
                    href = a["href"]
                    text = a.get_text(strip=True)
                    if ("tag" in href.lower() or "keyword" in href.lower()) and text and text not in tags:
                        tags.append(text)

            downloads = self._extract_downloads(soup, detail_url)

        except Exception as exc:
            print(f"[{self.name}] Error parsing {detail_url}: {exc}")

        return listing_poster or fallback_poster, screenshots, file_info, tags, downloads

    def _extract_downloads(self, soup, detail_url):
        results = []
        base_domain = urlparse(detail_url).netloc

        # Try multiple heading patterns
        header = (
            soup.find(string=re.compile(r'Download\s+(Links?|Files?|Now|Here)', re.IGNORECASE))
            or soup.find(string=re.compile(r'Direct\s+Download', re.IGNORECASE))
            or soup.find(string=re.compile(r'Get\s+File', re.IGNORECASE))
            or soup.find(string=re.compile(r'^Download$', re.IGNORECASE))
        )

        search_root = header.find_parent() if header else soup

        for anchor in search_root.find_all_next("a", href=True, limit=30):
            href = anchor["href"].strip()
            full_url = urljoin(detail_url, href)
            label = anchor.get_text(strip=True)
            lower_label = label.lower()
            lower_url = full_url.lower()

            if any(b in lower_label for b in ["disclaimer", "contact us", "home >>", "privacy policy", "how to download"]):
                break
            if any(ad in lower_url for ad in KNOWN_AD_DOMAINS):
                continue
            target = anchor.get("target", "")
            if target == "_blank" and base_domain not in urlparse(full_url).netloc:
                if not any(h in lower_url for h in TRUSTED_HOST_DOMAINS):
                    continue

            if any(kw in lower_label for kw in [
                "download", "480p", "720p", "1080p", "4k", "hevc",
                "server", "mb", "gb", "link", "get file", "direct link",
            ]) or re.search(r'\.(mkv|mp4|zip|rar)$', lower_url):
                is_direct = bool(re.search(r'\.(mkv|mp4|zip|rar)$', lower_url))
                if not any(r["link"] == full_url for r in results):
                    results.append({
                        "label": label or "Download File",
                        "link": full_url,
                        "is_direct_file": is_direct,
                    })

        return results
