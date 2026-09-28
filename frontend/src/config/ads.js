// ── Adsterra Ad Configuration ──────────────────────────────────────────────────
//
// HOW TO SET UP:
//  1. Log in to https://publishers.adsterra.com
//  2. Add your site (movi.guru) if not already added
//  3. For each slot below, go to My Sites → [your site] → Add New Ad Unit
//     → choose "Display Banner" → pick the size → copy the zone KEY (hex string)
//  4. Paste each key in the `key` field below
//  5. For Social Bar: Add New Ad Unit → choose "Social Bar" → copy the script src URL
//  6. Commit & push — ads activate automatically via the deploy workflow
//
// Zone key looks like: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4'
// ─────────────────────────────────────────────────────────────────────────────

export const AD_SLOTS = {
  // Home – leaderboard above banner scroll (728×90 desktop / 320×50 mobile)
  SLOT_HOME_TOP: {
    key:    '',
    w: 728, h: 90,
    mw: 320, mh: 50,
  },

  // Home – in-feed rectangle after first page of results (300×250)
  SLOT_HOME_MID: {
    key:    '',
    w: 300, h: 250,
  },

  // Home – leaderboard at very bottom (728×90 desktop / 320×50 mobile)
  SLOT_HOME_BOTTOM: {
    key:    '',
    w: 728, h: 90,
    mw: 320, mh: 50,
  },

  // Library / Movies / Series / Anime pages – top leaderboard
  SLOT_LIBRARY_TOP: {
    key:    '',
    w: 728, h: 90,
    mw: 320, mh: 50,
  },

  // Category collection page – top leaderboard
  SLOT_CATEGORY_TOP: {
    key:    '',
    w: 728, h: 90,
    mw: 320, mh: 50,
  },

  // Detail page – top leaderboard
  SLOT_TOP_DETAIL: {
    key:    '',
    w: 728, h: 90,
    mw: 320, mh: 50,
  },

  // Detail page – mid rectangle (shows between gallery and cast)
  SLOT_MID_DETAIL: {
    key:    '',
    w: 300, h: 250,
  },

  // Detail page – bottom leaderboard
  SLOT_BOTTOM_DETAIL: {
    key:    '',
    w: 728, h: 90,
    mw: 320, mh: 50,
  },
}

// Social Bar – Adsterra's sticky floating bar (high CTR).
// From your Adsterra dashboard: Add New Ad Unit → Social Bar → copy the src URL.
// Example: '//pl12345678.profitablegatecpm.com/abc.../invoke.min.js'
export const SOCIAL_BAR_SRC = ''
