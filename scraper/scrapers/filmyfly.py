import re
import asyncio
from typing import Optional
from urllib.parse import urljoin, urlparse
from bs4 import BeautifulSoup

from .base import (
    BaseScraper, HEADERS, KNOWN_AD_DOMAINS, TRUSTED_HOST_DOMAINS,
    SIZE_PATTERN, get_clean_src, normalize_duration,
)

_DETAIL_CONCURRENCY = 10

# Keywords that appear in FilmyFly link text for movie posts
_TEXT_KEYWORDS = [
    "movie", "web series", "dual audio", "hindi", "south", "anime",
    "season", "episode", "bollywood", "hollywood", "tamil", "telugu",
    "dubbed", "download", "480p", "720p", "1080p", "4k",
]

# URL patterns that indicate a detail page even without keyword in text
_DETAIL_URL_RE = re.compile(
    r'/(20\d{2}|download|movie|film|watch|web-series|anime)[-/]',
    re.IGNORECASE,
)


def _is_movie_link(title: str, url: str) -> bool:
    """Return True if this link is likely a movie/series detail page."""
    lower = title.lower()
    if any(k in lower for k in _TEXT_KEYWORDS):
        return True
    if _DETAIL_URL_RE.search(url):
        return True
    # Year in title (e.g. "Pushpa 2022" or "Leo 2023") — very common on FilmyFly
    if re.search(r'\b20\d{2}\b', title):
        return True
    return False


class FilmyFlyScraper(BaseScraper):

    async def scrape(self, client, max_pages=50, limit=None, delay=2.0):
        discovered = []
        visited = set()
        current_url = self.base_url
        page_count = 0

        while current_url and page_count < max_pages:
            if current_url in visited:
                break
            visited.add(current_url)
            page_count += 1

            try:
                res = await client.get(current_url, headers=HEADERS, timeout=15.0)
                if res.status_code != 200:
                    print(f"[{self.name}] Page {page_count}: HTTP {res.status_code}, stopping.")
                    break
                soup = BeautifulSoup(res.text, "html.parser")
            except Exception as exc:
                print(f"[{self.name}] Error fetching {current_url}: {exc}")
                break

            page_found = 0
            for link in soup.find_all("a", href=True):
                raw_title = link.get_text(strip=True)
                href = link["href"]

                if not raw_title or len(raw_title) < 6:
                    continue

                detail_url = urljoin(current_url, href)
                if any(item["detail_url"] == detail_url for item in discovered):
                    continue

                # FIX: accept link if URL looks like a post OR text has keyword OR year in title
                if not _is_movie_link(raw_title, detail_url):
                    continue

                listing_poster = None
                img_tag = link.find("img")
                if not img_tag and link.find_parent():
                    img_tag = link.find_parent().find("img")
                if img_tag:
                    listing_poster = get_clean_src(img_tag, current_url)

                discovered.append({
                    "raw_title": raw_title,
                    "detail_url": detail_url,
                    "listing_poster": listing_poster,
                })
                page_found += 1

                if limit and len(discovered) >= limit:
                    break

            print(f"[{self.name}] Page {page_count}: found {page_found} new items (total {len(discovered)})")

            if limit and len(discovered) >= limit:
                break

            next_link = (
                soup.find("a", string=re.compile(r'(Next|>>|Older)', re.IGNORECASE))
                or soup.find("a", href=re.compile(r'page[/-]\d+|[?&]page=\d+', re.IGNORECASE))
            )
            if next_link and next_link.get("href"):
                next_url = urljoin(current_url, next_link["href"])
                if next_url != current_url:
                    current_url = next_url
                    await asyncio.sleep(delay)
                else:
                    break
            else:
                break

        sem = asyncio.Semaphore(_DETAIL_CONCURRENCY)
        tasks = [
            self._parse_detail(client, item["detail_url"], item["listing_poster"], sem)
            for item in discovered
        ]
        results = await asyncio.gather(*tasks)

        # Expand batch posts: a single listing post may contain multiple sub-movie links
        expanded = []
        for item, (poster, screenshots, file_info, tags, downloads, sub_links) in zip(discovered, results):
            if sub_links:
                # Batch post — fetch each sub-movie individually
                sub_tasks = [
                    self._parse_detail(client, url, None, sem)
                    for url in sub_links
                ]
                sub_results = await asyncio.gather(*sub_tasks)
                for sub_url, sub_data in zip(sub_links, sub_results):
                    sub_poster, sub_ss, sub_fi, sub_tags, sub_dl, _ = sub_data
                    # Use parent title as fallback; sub-page title comes from URL
                    sub_title = self._title_from_url(sub_url) or item["raw_title"]
                    expanded.append((sub_title, sub_url, sub_poster, sub_ss, sub_fi, sub_tags, sub_dl))
            else:
                expanded.append((item["raw_title"], item["detail_url"], poster, screenshots, file_info, tags, downloads))

        records = []
        for idx, (raw_title, detail_url, poster, screenshots, file_info, tags, downloads) in enumerate(expanded, 1):
            records.append(self.make_record(
                idx, raw_title, detail_url,
                poster, screenshots, file_info, tags, downloads,
            ))

        print(f"[{self.name}] Done — {len(records)} records collected (from {len(discovered)} listing posts).")
        return records

    @staticmethod
    def _title_from_url(url: str) -> str:
        """Extract a readable title guess from a slug URL."""
        slug = url.rstrip("/").split("/")[-1]
        slug = re.sub(r'[-_]', ' ', slug)
        slug = re.sub(r'\b(download|hindi|dubbed|720p|1080p|480p|4k|hd|web|dl)\b', '', slug, flags=re.I)
        slug = re.sub(r'\s+', ' ', slug).strip()
        return slug.title() if slug else ""

    async def _parse_detail(self, client, detail_url, listing_poster, sem):
        async with sem:
            result = await self._fetch_detail(client, detail_url, listing_poster)
            return result

    async def _fetch_detail(self, client, detail_url, listing_poster):
        fallback_poster = None
        screenshots = []
        tags = []
        sub_links = []        # populated when this page is a batch post
        file_info = {
            "genre": None, "duration": None, "release_date": None,
            "language": None, "starcast": [], "available_sizes": [], "description": None,
        }
        downloads = []

        try:
            res = await client.get(detail_url, headers=HEADERS, timeout=12.0)
            soup = BeautifulSoup(res.text, "html.parser")

            # --- Poster ---
            fi_heading = soup.find(string=re.compile(r'File Info', re.IGNORECASE))
            if fi_heading and fi_heading.find_parent():
                prev_img = fi_heading.find_parent().find_previous("img")
                if prev_img:
                    fallback_poster = get_clean_src(prev_img, detail_url)

            if not fallback_poster and not listing_poster:
                for img in soup.find_all("img"):
                    url = get_clean_src(img, detail_url)
                    if url and not any(k in url.lower() for k in ["logo", "banner", "telegram", "icon", "ad"]):
                        fallback_poster = url
                        break

            # --- Screenshots (FIX: collect up to 4) ---
            ss_heading = soup.find(string=re.compile(r'SCREENSHOT', re.IGNORECASE))
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

            # --- Metadata ---
            page_text = soup.get_text()
            for field, pattern in [
                ("genre",        r'Genre:\s*([^\n\r]+)'),
                ("duration",     r'Duration:\s*([^\n\r]+)'),
                ("release_date", r'Release Date:\s*([^\n\r]+)'),
                ("language",     r'Language:\s*([^\n\r]+)'),
                ("description",  r'Description:\s*([^\n\r]{20,})'),
            ]:
                m = re.search(pattern, page_text, re.IGNORECASE)
                if m:
                    file_info[field] = m.group(1).strip()[:250]

            # Release year fallback from URL
            if not file_info["release_date"]:
                yr = re.search(r'\b(20\d{2})\b', detail_url)
                if yr:
                    file_info["release_date"] = yr.group(1)

            sc_m = re.search(r'Starcast:\s*([^\n\r]+)', page_text, re.IGNORECASE)
            if sc_m:
                file_info["starcast"] = [s.strip() for s in sc_m.group(1).split(",") if s.strip()][:10]

            sz_m = re.search(r'Size:\s*([^\n\r]+)', page_text, re.IGNORECASE)
            if sz_m:
                raw_sizes = [s.strip() for s in sz_m.group(1).split() if s.strip()]
                file_info["available_sizes"] = [s for s in raw_sizes if SIZE_PATTERN.match(s)][:8]

            if file_info.get("duration"):
                file_info["duration"] = normalize_duration(file_info["duration"])

            # --- Tags ---
            for a in soup.find_all("a", href=True):
                href = a["href"]
                text = a.get_text(strip=True)
                if ("tag" in href.lower() or "keyword" in href.lower() or text.startswith("#")) and text and text not in tags:
                    tags.append(text)

            # --- Downloads ---
            downloads = self._extract_downloads(soup, detail_url)

            # --- Batch post detection ---
            # A batch post has many internal links to other posts but few/no downloads itself.
            # Detect: fewer than 2 download links AND 3+ internal links matching detail page patterns.
            if len(downloads) < 2:
                base_host = urlparse(detail_url).netloc
                internal_detail_links = []
                for a in soup.find_all("a", href=True):
                    href_raw = a["href"]
                    full = urljoin(detail_url, href_raw)
                    if base_host not in urlparse(full).netloc:
                        continue
                    if full == detail_url:
                        continue
                    if _is_movie_link(a.get_text(strip=True), full):
                        internal_detail_links.append(full)
                if len(internal_detail_links) >= 3:
                    seen = set()
                    for link in internal_detail_links:
                        if link not in seen:
                            seen.add(link)
                            sub_links.append(link)
                        if len(sub_links) >= 20:
                            break

        except Exception as exc:
            print(f"[{self.name}] Error parsing detail {detail_url}: {exc}")

        final_poster = listing_poster or fallback_poster
        return final_poster, screenshots, file_info, tags, downloads, sub_links

    def _extract_downloads(self, soup, detail_url):
        results = []
        base_domain = urlparse(detail_url).netloc

        # Try specific heading first, then fall back to any "download" section
        header = (
            soup.find(string=re.compile(r'Download\s+This\s+Movie', re.IGNORECASE))
            or soup.find(string=re.compile(r'Download\s+Links?', re.IGNORECASE))
            or soup.find(string=re.compile(r'Download\s+Now', re.IGNORECASE))
        )

        search_root = header.find_parent() if header else soup

        for anchor in search_root.find_all_next("a", href=True, limit=30):
            href = anchor["href"].strip()
            full_url = urljoin(detail_url, href)
            label = anchor.get_text(strip=True)
            lower_label = label.lower()
            lower_url = full_url.lower()

            if any(b in lower_label for b in ["disclaimer", "contact us", "how to download", "home >>", "privacy policy"]):
                break
            if any(ad in lower_url for ad in KNOWN_AD_DOMAINS):
                continue
            target = anchor.get("target", "")
            if target == "_blank" and base_domain not in urlparse(full_url).netloc:
                if not any(h in lower_url for h in TRUSTED_HOST_DOMAINS):
                    continue

            if any(kw in lower_label for kw in [
                "download", "480p", "720p", "1080p", "4k", "hevc",
                "server", "mb", "gb", "link", "get file",
            ]):
                is_direct = bool(re.search(r'\.(mkv|mp4|zip|rar)$', lower_url))
                if not any(r["link"] == full_url for r in results):
                    results.append({
                        "label": label or "Download File",
                        "link": full_url,
                        "is_direct_file": is_direct,
                    })

        return results
