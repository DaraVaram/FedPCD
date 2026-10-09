# FedPCD — project page

Source of [daravaram.github.io/FedPCD](https://daravaram.github.io/FedPCD/), the project page for
*FedPCD: Priority-Constrained Federated Aggregation* (Yousef Irshaid, Dara Varam and Mohamed I. AlHajri;
preprint, under review). It is the sibling of the [PCD page](https://daravaram.github.io/PCD/) and uses
the same design system with a different theme color.

A static page: HTML, CSS and vanilla JS, with no build step. GitHub Pages serves the `main` branch, so
pushing to `main` publishes it. External requests: Google Fonts (with system-font fallbacks), KaTeX
from jsDelivr for the equations, and a hidden visitor-map counter (visitormap.workers.dev).

```
index.html          the page
css/style.css       design system
js/projection.js    the interactive projection figure (draggable clients, τ slider, presets, auto-tour)
js/cache.js         the client-history widget (100 clients, participation rate, history window)
js/main.js          button links, scroll reveals, navigation, video chapters, figure switcher, BibTeX copy
assets/             web-sized figures from the paper, the video, its captions and poster
```

## Links

The Paper, arXiv and Code buttons take their URLs from `LINKS` at the top of `js/main.js`. A link left
empty is shown muted, says "Coming soon" on hover and focus, and shows the same message on click. All
three are empty until the preprint and the code are public. When they are, fill them in and update the
BibTeX entry in `index.html`.

## Colors

The theme color is `--brand` in `css/style.css` (`#C2185B`, the magenta the paper's figures use for
CRAFT). Diagrams drawn by the page keep the paper's figure colors, so that they agree with the embedded
figures and the video: `--fedpcd` (purple) for FedPCD's direction, `--fedavg` (blue) for the FedAvg
direction, `--constraint` and `--region` (orange) for the constraints, and `--conflict` (red) for a
client the average leaves short. `js/projection.js` reads these variables, so changing one in the
stylesheet recolors the figure.

## Video

The Video section plays `assets/fedpcd-video.mp4` with English captions from `assets/fedpcd-video.vtt`
and `assets/video-poster.jpg` as the still. The MP4 is currently the narrated 720p30 cut from the Manim
project (`FedPCD-Video/out/`). To replace it, drop in a new render and regenerate the captions from its
`.srt` (add a `WEBVTT` header, use `.` instead of `,` in the timestamps). The chapter buttons under the
player take their times from the `data-t` attributes in `index.html`, which follow
`FedPCD-Video/out/chapters.txt`. The narration voice is ElevenLabs text-to-speech, credited in a
footnote under the video.

## Figures

Figures in `assets/` are rasterized copies of the paper's own PDFs, at α = 0.01, 0.1 and 1 for the three
results figures (the switch above them swaps the files). `make_site_assets.py`, kept next to the paper
sources rather than in this repository, rebuilds every asset from the paper archive and the video.

The interactive projection figure solves the same program as the paper and checks itself against the
numbers of the paper's worked example when the page loads (see the browser console).

## Preview locally

Serve the folder rather than opening `index.html` directly:

```bash
python -m http.server 8000     # then visit http://localhost:8000
```

Python's server does not answer range requests, so seeking in the video (and the chapter buttons) only
works once the file has fully loaded. GitHub Pages does not have this limitation.
