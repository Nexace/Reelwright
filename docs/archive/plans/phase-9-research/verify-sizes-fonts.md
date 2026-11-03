# Phase 9 fact-check: install sizes, LaTeX sizes, typst license, handwriting fonts, fork diff

Checked: 2026-11-02. Method: PyPI JSON API, HTTP HEAD (Content-Length), GitHub API, raw.githubusercontent.com text. No files downloaded. Sizes are bytes unless noted.

Wheel column choice: for CPython-specific wheels I quote cp312 (macOS arm64 and Windows amd64). abi3 and py3-none wheels are quoted as they are. "none" means no such wheel is listed in the PyPI JSON.

## 1. Manim CE install footprint (PyPI JSON, latest version)

Source for every row: `https://pypi.org/pypi/<pkg>/json` (info.version, info.license, info.license_expression, info.requires_dist, urls[]).

| Package | Latest | License (declared) | macOS arm64 wheel | Windows amd64 wheel | sdist |
|---|---|---|---|---|---|
| manim | 0.22.1 | MIT (license_expression; info.license empty, no License classifier) | none (pure py3-none-any wheel: 701,280) | same pure wheel: 701,280 | 614,319 |
| pycairo | 1.29.2 | LGPL-2.1-only OR MPL-1.1 | none listed (sdist only) | cp312: 846,938 | 666,308 |
| manimpango | 0.7.1 | MIT | cp312 macosx_11_0_arm64: 8,384,003 | cp312: 6,392,557 | 4,081,504 |
| skia-pathops | 0.9.2 | BSD-3-Clause | abi3 macosx_10_9_universal2: 2,897,494 | abi3: 1,782,901 | 65,115,346 |
| moderngl | 5.13.0 | MIT | cp312 macosx_11_0_arm64: 113,605 | cp312: 110,202 | 204,155 |
| numpy | 2.5.4 | BSD-3-Clause AND 0BSD AND MIT AND Zlib AND CC0-1.0 | cp312 macosx_11_0_arm64: 12,015,718; macosx_14_0_arm64: 5,451,717 | cp312: 12,573,091 | 20,866,315 |
| scipy | 1.18.1 | BSD (info.license holds full BSD text; classifier "BSD License") | cp312 macosx_12_0_arm64: 28,733,332; macosx_14_0_arm64: 20,475,078 | cp312: 36,658,278 | 30,781,235 |
| pillow | 13.0.0 | MIT-CMU (license_expression; info.license empty) | cp312 macosx_11_0_arm64: 4,852,329 | cp312: 7,272,166 | 47,058,631 |
| av | 19.0.2 | BSD-3-Clause (license_expression) | abi3 macosx_14_0_arm64: 18,556,422 (needs macOS 14+) | abi3: 28,150,949 | 4,277,157 |
| typst | 0.15.0 | not in PyPI metadata (see section 3) | abi3 macosx_11_0_arm64: 30,504,579 | abi3: 29,372,618 | 66,887 |

manim declared requirements (info.requires_dist, requires_python >=3.11): av>=15.0, beautifulsoup4>=4.12, click>=8.0, cloup>=2.0.0, decorator>=5.1.0, isosurfaces>=0.1.1, manimpango>=0.7.0,<1.0.0, mapbox-earcut>=1.0.0, moderngl-window>=2.0.0, moderngl>=5.7.0,<6.0.0, networkx>=2.6, numpy>=2.1, pillow>=11.0, pycairo>=1.14,<2.0.0, pydub>=0.22.0, pygments>=2.17, rich>=12.0.0, scipy>=1.13.0 (>=1.15.0 on Python 3.13+), screeninfo>=0.7.0, skia-pathops>=0.9.0, srt>=3.0.0, svgelements>=1.9.0, tqdm>=4.21.0, typing-extensions>=4.12.0, watchdog>=2.0.0. Extras: gui (dearpygui), jupyterlab, typst (typst>=0.14).

Caveats:
- Sizes are wheel downloads, not installed footprint. Installed sizes: UNVERIFIED (not on PyPI).
- pycairo has no macOS wheel in the PyPI JSON, so macOS needs the sdist build (needs cairo installed). That is what the JSON shows; the build requirements were not checked.
- manim's MIT license comes from license_expression only. No LICENSE text was read.

## 2. LaTeX download sizes

| Distribution | URL (source) | Size | Check |
|---|---|---|---|
| MacTeX (full, macOS) | `https://mirror.ctan.org/systems/mac/mactex/MacTeX.pkg`, linked from `https://tug.org/mactex/mactex-download.html` | 6,865,013,189 (about 6.9 GB) | HEAD Content-Length, 200 |
| BasicTeX (macOS) | `https://mirror.ctan.org/systems/mac/mactex/BasicTeX.pkg`, linked from `https://tug.org/mactex/morepackages.html` | 140,394,776 (about 140 MB) | HEAD Content-Length, 200. tug.org/mactex/ also says "relatively small, about 140 MB" |
| MiKTeX Basic installer (Windows x64) | `https://miktex.org/download/ctan/systems/win32/miktex/setup/windows-x64/basic-miktex-25.12-x64.exe`, listed on `https://miktex.org/download` | 148,882,184 (about 149 MB) | HEAD Content-Length, 200. Same size via `https://miktex.org/download/win/basic-miktex-x64.exe` |
| TinyTeX-1 (macOS) | `https://github.com/rstudio/tinytex-releases/releases/download/v2026.11/TinyTeX-1-darwin-v2026.11.tar.xz` | 67,211,812 (about 67 MB) | HEAD Content-Length, 200; also GitHub API asset size |
| TinyTeX-1 (Windows) | `https://github.com/rstudio/tinytex-releases/releases/download/v2026.11/TinyTeX-1-windows-v2026.11.exe` | 73,710,178 (about 74 MB) | HEAD Content-Length, 200; also GitHub API asset size |

TinyTeX context (for choosing a bundle): the tinytex-releases README says TinyTeX-1 "contains about 100 LaTeX packages"; TinyTeX-2 is scheme-full (Windows 1.7 GB, macOS 1.9 GB per the README table). Source: `https://raw.githubusercontent.com/rstudio/tinytex-releases/master/README.md`. Latest release v2026.11 (published 2026-11-01).

Installed sizes: UNVERIFIED for all four. The tug.org pages describe contents but I found no installed-size figure in the text I read. The yihui.org/tinytex page gives no TinyTeX-1 figure.

## 3. typst Python package license

- PyPI JSON (`https://pypi.org/pypi/typst/json`): info.license empty, license_expression null, no License classifier. Summary: "Python binding to Typst...".
- Source repo: `https://github.com/messense/typst-py` (GitHub API: license.spdx_id = Apache-2.0; `pyproject.toml` has license = "Apache-2.0"; LICENSE file is Apache License 2.0). PyPI JSON does not link this repo, so the link to the PyPI package is inferred from the matching package description, not confirmed by PyPI metadata.

## 4. Handwriting fonts (Google Fonts, `ofl/` folders)

Caveat (`https://raw.githubusercontent.com/google/fonts/main/ofl/caveat/OFL.txt`, `.../METADATA.pb`):
- License: SIL Open Font License, Version 1.1 (OFL.txt). METADATA.pb: license "OFL".
- Copyright: "Copyright 2014 The Caveat Project Authors (https://github.com/googlefonts/caveat)".
- Variable font: yes. METADATA.pb has one font entry (normal, weight 400, filename `Caveat[wght].ttf`) and axis `wght` min 400, max 700.

Patrick Hand (`https://raw.githubusercontent.com/google/fonts/main/ofl/patrickhand/OFL.txt`, `.../METADATA.pb`):
- License: SIL Open Font License, Version 1.1 (OFL.txt). METADATA.pb: license "OFL".
- Copyright: "Copyright (c) 2010-2012 Patrick Wagesreiter (mail@patrickwagesreiter.at)".
- Weights: one static weight, 400 (Regular), file `PatrickHand-Regular.ttf`. No axes in METADATA.pb, so not a variable font.

## 5. Fork diff: Vincentwei1021/video-shotcraft vs sfgdfgd/-skill

- Default branches: upstream `main`, fork `main` (`gh api repos/<r> --jq .default_branch`). The fork's parent is Vincentwei1021/video-shotcraft.
- The literal ref `main...sfgdfgd:-skill:main` is not a valid owner:branch form. It returned the same numbers as `main...sfgdfgd:main`, so I used the valid form.
- `gh api repos/Vincentwei1021/video-shotcraft/compare/main...sfgdfgd:main`: ahead_by 0, behind_by 37, files []. So the fork's main has no commits that upstream lacks.
- Reverse (`gh api repos/sfgdfgd/-skill/compare/main...Vincentwei1021:main`): ahead_by 37, behind_by 0, 37 commits. The fork's main is a strict ancestor of upstream main, 37 commits behind.
- Files: the fork changes no files relative to upstream main. The 37 upstream-only commits touch at least 300 files, and the API caps the file list at 300, so the list is incomplete. Of the 300 listed, 149 are `assets/audio/sfx/*.mp3`. Non-audio files include .github workflows (deploy-pages.yml, pr-checks.yml, showcase-publish.yml, contact-sheet-tests.yml), README.md, README_CN.md, README_JA.md, README_RU.md (added), SKILL.md, agents/openai.yaml, assets/lib/ClipCard.tsx, assets/scripts/sfx-source.py, demos/_fixtures/*.tsx, and demos/_legacy/* (moves and additions).
- Total file count beyond the 300-cap: UNVERIFIED.

## Summary

1. PyPI (latest): manim 0.22.1 is MIT and pure Python (701,280-byte wheel), so Windows and macOS share it. The native deps are the heavy part: scipy cp312 wheels are 20–37 MB, numpy 5–13 MB, av 18–28 MB, typst 29–31 MB, pillow 5–7 MB.
2. Manim native deps: manimpango (MIT) ~8.4 MB macOS arm64 / 6.4 MB Windows; pycairo (LGPL-2.1 OR MPL-1.1) has no macOS wheel, so macOS builds from sdist; skia-pathops (BSD-3) universal2 2.9 MB macOS / 1.8 MB Windows.
3. typst: PyPI metadata declares no license. The matching GitHub repo messense/typst-py is Apache-2.0 (inferred link).
4. LaTeX downloads: MacTeX.pkg 6,865,013,189 bytes (~6.9 GB); BasicTeX.pkg 140,394,776 (~140 MB); MiKTeX basic installer 148,882,184 (~149 MB).
5. TinyTeX-1 v2026.11: macOS 67,211,812 bytes (~67 MB); Windows 73,710,178 bytes (~74 MB).
6. Installed sizes for all LaTeX distributions: UNVERIFIED.
7. Caveat: OFL 1.1, Copyright 2014 The Caveat Project Authors, variable font wght 400–700.
8. Patrick Hand: OFL 1.1, Copyright (c) 2010-2012 Patrick Wagesreiter, single static weight 400.
9. Fork: sfgdfgd/-skill main is 37 commits behind upstream main and has 0 commits of its own; the fork changes no files relative to upstream.
10. Fork file list: the 37 upstream-only commits touch ≥300 files (API cap), 149 of them sfx mp3s; full count UNVERIFIED.
