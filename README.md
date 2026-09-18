# Movi — JSON-driven frontend media catalog

Movi is a frontend-only React/Vite catalog that reads **`Movi.json` from the project root at runtime**. Replace or edit that file and refresh the app; the UI does not require a second database.

## Run

Double-click **`start-movi.bat`** or use:

```bash
npm install
npm run dev
```

The local app opens at `http://localhost:5173`.

## One JSON source

The attached source schema is preserved and normalized defensively. Each title can use:

- `scraped_title`
- `clean_title`
- `detail_page_url`
- `category`
- `media.main_poster`
- `media.screenshot` (single string or array)
- `file_info.genre`
- `file_info.duration`
- `file_info.release_date`
- `file_info.language`
- `file_info.starcast`
- `file_info.available_sizes`
- `file_info.description`
- `tags`
- `downloads[]` with `label`, `link`, and `is_direct_file`

The UI also derives searchable tags from genre, language, collection and year when the source `tags` array is empty.

## Pages

The app uses hash routing so it works on static hosting as well as locally:

- `#/home` — compact hero, global search, 15 initial homepage titles and **Show more** up to 30.
- `#/movies` — dedicated movie library.
- `#/series` — dedicated web-series library.
- `#/category/south` — reusable dedicated collection page.
- `#/category/hollywood`, `#/category/animated`, `#/category/marvel`, `#/category/bollywood`, language/genre collections, and other detected collections are generated from the same rule system.
- `#/title/<id>` — full title detail page with metadata, cast, file sizes, screenshots, tags, external source links and randomized related suggestions.
- `#/diagnostics` — client-side browser/device diagnostics.

## Category engine

Collections are detected from the actual loaded data instead of hard-coding the catalog contents. The project includes dedicated rules for South, Animation, Hollywood, Bollywood, Marvel, DC, Punjabi, Tamil, Telugu, Malayalam, Kannada, Bengali, Marathi and common genres such as Action, Thriller, Drama, Comedy, Romance, Horror, Crime and Science Fiction.

Adding a new title to `Movi.json` can therefore automatically place it into matching collection pages.

## Homepage behavior

The homepage intentionally does **not** dump the full 462-title dataset.

- Featured grid starts at 15.
- `Show more` reveals another batch, up to 30 maximum on Home.
- Collection showcases use a small sample of titles.
- Full browsing remains available through Movies/Web Series and dedicated collection pages.
- Hero images are randomly selected from the loaded dataset and use a fixed responsive aspect ratio so the hero stays compact and does not push the movie cards below the fold.

## Legal / provider boundary

Movi is a **frontend presentation layer**. It does not host media, proxy media, bypass access controls, modify third-party files, or claim ownership of dataset links.

`downloads[].link` and `detail_page_url` are treated as external metadata from `Movi.json` and are opened directly at their original destination. Use only media and links you are authorized to access, share or download. For a production deployment, use provider-owned or otherwise permissioned sources and connect any protected delivery through an authorized backend/API.

## Editing the data

1. Open `Movi.json`.
2. Add/edit records using the same source schema.
3. Save.
4. Reload the site.

The Vite config exposes the root `Movi.json` during development and copies it into `dist/` during production builds.
