# web-experiments

Static layout experiments for [edgecollective.io](https://edgecollective.io), populated
with photos and text from the `edge-blog` repo. Plain HTML + CSS + JS, no build step
needed to view.

| Page | Inspired by | Look |
|---|---|---|
| [`collage/`](collage/) | vukdragojevic.com | White page, fixed left nav, freeform scattered-image collage, pinned labels, quick-view lightbox |
| [`columns/`](columns/) | jakewinkle.com | Black page, serif type, ruled header, two staggered columns with "Title, Year" captions, scrolling shop marquee |

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

## Content

- `assets/content.js` — all text and the image list for each project. Edit this by hand;
  both pages read it. It is `window.EC = { ...JSON... };`, so keep it valid JSON.
- `assets/images.js` — generated; maps each image ref to its resized files and size.
- `assets/img/` — generated; resized copies (1600px and 800px), EXIF stripped.

Image refs in `content.js` are paths relative to `edge-blog/img/`
(e.g. `"ojofeliz/ofr1.jpeg"`), or `~/...` paths for files in other repos.
After adding or changing images, run:

```sh
python3 scripts/import_images.py            # uses ~/gitwork/edge-blog by default
python3 scripts/import_images.py --edge-blog /path/to/edge-blog --force
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
