# web-experiments

Static layout experiments for [edgecollective.io](https://edgecollective.io) (photos and
text from the `edge-blog` repo) and [waterbearfieldschool.org](https://waterbearfieldschool.org)
(from the `wfs-site` repo). Plain HTML + CSS + JS, no build step needed to view.

| Page | Inspired by | Look |
|---|---|---|
| [`collage/`](collage/), [`wfs/collage/`](wfs/collage/) | vukdragojevic.com | White page, fixed left nav, freeform scattered-image collage, pinned labels, quick-view lightbox |
| [`columns/`](columns/), [`wfs/columns/`](wfs/columns/) | jakewinkle.com | Black page, serif type, ruled header, two staggered columns with "Title, Year" captions, scrolling marquee |
| [`wfs/field-days/`](wfs/field-days/) | both | Field Days schedule, a "today" line, then past days as a timeline: date and title pinned left, photos in staggered columns |
| [`wfs/field-days-stacks/`](wfs/field-days-stacks/) | both | Same schedule with a square thumbnail per row (sized to the text beside it); each past day is one photo drawn as a stack of prints that grows into a swipeable full-screen gallery. `#<slug>` or `#<slug>/<n>` links straight to a day's gallery |
| [`wfs/field-days-expand/`](wfs/field-days-expand/) | both | The stacks page, but each upcoming listing opens in place to a fuller description (who it's for, what to bring, where) with a Register button, and closes again with ×, Close, or Escape. `#d-YYYY-MM-DD` opens a listing. Journal entries get the same + : "Read the full entry" opens the day's full post (text, then photos with their original captions; any photo opens the gallery there). Same script as the stacks page, switched on by `<body data-rows="expand">` |

The `collage/` and `columns/` folders hold the shared engine (CSS + JS) as well as the
Edge Collective pages; the WFS pages load the same engine with different content.

## Viewing

```sh
python3 -m http.server 8765
# then open http://127.0.0.1:8765/
```

Opening the `index.html` files directly from disk also works (routing is hash-based),
but a local server is closer to how it would be hosted.

Routes:

- `collage/#/` overview, `#/c/<category>`, `#/p/<slug>`, `#/index`, `#/info`
- `columns/#/` home, `#/p/<slug>`, `#/about`
- `wfs/field-days/` is a single page; `wfs/field-days-stacks/#<slug>/<n>` opens a day's gallery at photo n

## Content

Each site has a content folder: `assets/` (Edge Collective) and `wfs/` (Waterbear).

- `content.js` — all text, settings, and image lists. Edit by hand; it is
  `window.EC = { ...JSON... };`, so keep it valid JSON. `site` holds the per-site
  settings (name, nav order, caption wording, marquee, about sections, where images
  come from); `projects` holds the galleries. WFS also has `schedule` for the Field Days
  pages — **its upcoming dates are placeholders** — and each past day has a `post`
  (paragraphs and photos, built from the wfs-site write-ups) for the expandable journal.
- `images.js` — generated; maps each image ref to its resized files and size.
- `img/` — generated; resized copies (1600px and 800px), EXIF stripped.

Image refs are paths relative to `site.imageSource` (e.g. `edge-blog/img`,
`wfs-site/src/assets/images`), or `~/...` paths for files elsewhere.
After adding or changing images, run:

```sh
python3 scripts/import_images.py                  # Edge Collective (assets/content.js)
python3 scripts/import_images.py wfs/content.js   # Waterbear Field School
python3 scripts/import_images.py wfs/content.js --source /other/path --force
```

(Requires Pillow.)

## Notes

- Fonts come from Google Fonts: Instrument Sans (collage) stands in for Cargo's
  Diatype; Newsreader (columns) is the same face the reference uses.
- The collage layout is generated, not hand-placed: a seeded random packer picks sizes
  and positions per page, so every page always lays out the same way. Change the seed
  string in `collage.js` (or the image order) to reshuffle a page.
- The columns fly-in/out effect uses CSS scroll-driven animations; browsers without
  support (currently Firefox) just show the images still.
