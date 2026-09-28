"""
FilmyHit scraper  —  filmyhit.com.co (domain changes: .life, .wiki)

Structure: very similar to FilmyFly — "File Info" box, "SCREENSHOT" heading
"""
import re
import asyncio
from urllib.parse import urljoin, urlparse
from bs4 import BeautifulSoup

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
from common.base import (
    BaseScraper, HEADERS, KNOWN_AD_DOMAINS, TRUSTED_HOST_DOMAINS,
    SIZE_PATTERN, get_clean_src, is_noise_image,
    normalize_duration, extract_quality, extract_size,
)

_CONCURRENCY = 10

_MOVIE_KW = [
    "movie", "web series", "dual audio", "hindi", "south", "anime",
    "season", "episode", "bollywood", "hollywood", "tamil", "telugu",
    "dubbed", "download", "480p", "720p", "1080p", "4k",
]


def _is_post(title: str, url: str) -> bool:
    lower = title.lower()
    if any(k in lower for k in _MOVIE_KW):
        return True
    if re.search(r'\b20\d{2}\b', title):
        return True
    if re.search(r'/(20\d{2}|download|movie|film|watch)[-/]', url, re.I):
        return True
    return False


class Scraper(BaseScraper):
    SITE_KEY  = "filmyhit"
    SITE_NAME = "FilmyHit"

    async def scrape(self, client, max_pages=50, limit=None, delay=2.5):
        discovered = []
        visited    = set()
        current    = self.base_url
        page       = 0

        while current and page < max_pages:
            if current in visited:
                break
            visited.add(current)
            page += 1
            if page > 1:
                await asyncio.sleep(delay)

            try:
                res = await client.get(current, headers=HEADERS, timeout=15.0)
                if res.status_code != 200:
                    break
                soup = BeautifulSoup(res.text, "html.parser")
            except Exception as e:
                print(f"[{self.SITE_NAME}] error page {page}: {e}")
                break

            seen  = {d["url"] for d in discovered}
            found = 0

            for a in soup.find_all("a", href=True):
                title = a.get_text(strip=True)
                href  = urljoin(current, a["href"])
                if not title or len(title) < 5 or href in seen:
                    continue
                if not _is_post(title, href):
                    continue
                img    = a.find("img") or (a.find_parent() and a.find_parent().find("img"))
                poster = get_clean_src(img, current) if img else None
                seen.add(href)
                discovered.append({"title": title, "url": href, "poster": poster})
                found += 1
                if limit and len(discovered) >= limit:
                    break

            print(f"[{self.SITE_NAME}] Page {page}: +{found} (total {len(discovered)})")
            if limit and len(discovered) >= limit:
                break

            nxt = (
                soup.find("a", rel="next")
                or soup.find("a", string=re.compile(r'(Next|»|Older)', re.I))
            )
            if nxt and nxt.get("href"):
                nu = urljoin(current, nxt["href"])
                if nu != current:
                    current = nu
                    continue
            break

        sem     = asyncio.Semaphore(_CONCURRENCY)
        results = await asyncio.gather(*[
            self._detail(client, d["url"], d["poster"], sem)
            for d in discovered
        ])

        records = []
        for idx, (d, r) in enumerate(zip(discovered, results), 1):
            records.append(self.build_record(
                idx, d["title"], d["url"],
                r["poster"], r["screenshots"],
                r["info"], r["tags"], r["downloads"],
            ))
        print(f"[{self.SITE_NAME}] Done — {len(records)} records.")
        return records

    async def _detail(self, client, url, poster, sem):
        async with sem:
            return await self._fetch(client, url, poster)

    async def _fetch(self, client, url, listing_poster):
        out = {
            "poster": listing_poster,
            "screenshots": [],
            "tags": [],
            "info": {
                "genre": None, "language": None, "duration": None,
                "release_date": None, "description": None,
                "cast": [], "director": None, "imdb_rating": None,
                "available_sizes": [],
            },
            "downloads": [],
        }
        try:
            res  = await client.get(url, headers=HEADERS, timeout=12.0)
            soup = BeautifulSoup(res.text, "html.parser")

            # FilmyHit uses same "File Info" heading pattern as FilmyFly
            if not out["poster"]:
                fi = soup.find(string=re.compile(r'File\s*Info', re.I))
                if fi and fi.find_parent():
                    img = fi.find_parent().find_previous("img")
                    if img:
                        out["poster"] = get_clean_src(img, url)
            if not out["poster"]:
                for img in soup.find_all("img"):
                    src = get_clean_src(img, url)
                    if src and not is_noise_image(src):
                        out["poster"] = src
                        break

            ss_head = soup.find(string=re.compile(r'SCREENSHOT', re.I))
            if ss_head and ss_head.find_parent():
                for img in ss_head.find_parent().find_all_next("img", limit=6):
                    src = get_clean_src(img, url)
                    if src and src not in out["screenshots"] and not is_noise_image(src):
                        out["screenshots"].append(src)
                        if len(out["screenshots"]) >= 4:
                            break

            txt = soup.get_text(separator="\n")
            for field, pat in [
                ("genre",        r'Genre\s*[:\|]\s*([^\n\r]+)'),
                ("language",     r'Language\s*[:\|]\s*([^\n\r]+)'),
                ("duration",     r'Duration\s*[:\|]\s*([^\n\r]+)'),
                ("release_date", r'Release\s*Date\s*[:\|]\s*([^\n\r]+)'),
                ("description",  r'(?:Description|Story)\s*[:\|]\s*([^\n\r]{20,})'),
                ("imdb_rating",  r'(?:IMDB|IMDb)\s*[:\|]\s*([^\n\r]+)'),
            ]:
                m = re.search(pat, txt, re.I)
                if m:
                    out["info"][field] = m.group(1).strip()[:250]

            if not out["info"]["release_date"]:
                y = re.search(r'\b(20\d{2})\b', url)
                if y:
                    out["info"]["release_date"] = y.group(1)

            sc = re.search(r'(?:Starcast|Cast)\s*[:\|]\s*([^\n\r]+)', txt, re.I)
            if sc:
                out["info"]["cast"] = [s.strip() for s in sc.group(1).split(",") if s.strip()][:10]

            sz = re.search(r'Size\s*[:\|]\s*([^\n\r]+)', txt, re.I)
            if sz:
                raw = [s.strip() for s in sz.group(1).split() if s.strip()]
                out["info"]["available_sizes"] = [s for s in raw if SIZE_PATTERN.match(s)][:8]

            if out["info"]["duration"]:
                out["info"]["duration"] = normalize_duration(out["info"]["duration"])

            for a in soup.find_all("a", href=True):
                h  = a["href"].lower()
                tx = a.get_text(strip=True)
                if ("tag" in h or "keyword" in h) and tx and tx not in out["tags"]:
                    out["tags"].append(tx)

            out["downloads"] = self._downloads(soup, url)

        except Exception as e:
            print(f"[{self.SITE_NAME}] detail error {url}: {e}")
        return out

    def _downloads(self, soup, page_url):
        results   = []
        base_host = urlparse(page_url).netloc
        hdr = (
            soup.find(string=re.compile(r'Download\s+(This\s+Movie|Links?|Now)', re.I))
            or soup.find(string=re.compile(r'Direct\s+Download', re.I))
        )
        root = hdr.find_parent() if hdr else soup

        for a in root.find_all_next("a", href=True, limit=40):
            full   = urljoin(page_url, a["href"].strip())
            label  = a.get_text(strip=True)
            llabel = label.lower()
            lurl   = full.lower()

            if any(b in llabel for b in ["disclaimer", "contact us", "privacy"]):
                break
            if any(ad in lurl for ad in KNOWN_AD_DOMAINS):
                continue
            if a.get("target") == "_blank" and base_host not in urlparse(full).netloc:
                if not any(h in lurl for h in TRUSTED_HOST_DOMAINS):
                    continue
            if any(kw in llabel for kw in ["download", "480p", "720p", "1080p", "4k", "server", "mb", "gb", "link"]):
                if not any(r["link"] == full for r in results):
                    results.append({
                        "label":     label or "Download",
                        "link":      full,
                        "quality":   extract_quality(label),
                        "size":      extract_size(label),
                        "is_direct": bool(re.search(r'\.(mkv|mp4|zip|rar)$', lurl)),
                    })
        return results
