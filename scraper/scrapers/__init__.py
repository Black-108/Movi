from .filmyfly import FilmyFlyScraper
from .generic_wp import GenericWPScraper

ADAPTER_MAP = {
    "filmyfly": FilmyFlyScraper,
    "generic_wp": GenericWPScraper,
}

def get_scraper(adapter_name: str, site_config: dict):
    cls = ADAPTER_MAP.get(adapter_name)
    if not cls:
        raise ValueError(f"Unknown adapter: '{adapter_name}'. Available: {list(ADAPTER_MAP.keys())}")
    return cls(site_config)
