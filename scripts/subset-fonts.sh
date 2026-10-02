#!/usr/bin/env bash
# Regenerates src/assets/fonts/*.woff2 from the fontsource packages (devDependencies).
# Needs: python3 -m pip install fonttools brotli
# Hinting is deliberately KEPT (no --no-hinting): without the TrueType instructions Chrome/FreeType on Linux/Windows
# rounds advance widths differently, so text (and the .brand wordmark) renders ~8px wider than with the full font.
# Layout features keep kern (+liga etc.); GPOS kern was never the problem. Cost: Anton +4.6 KB, Inter +36 B.
set -euo pipefail
cd "$(dirname "$0")/.."
U="U+0020-007E,U+00A0,U+00B7,U+00D7,U+2013,U+2014,U+2018,U+2019,U+201C,U+201D,U+2022,U+2026,U+2192,U+20B9"
python3 -m fontTools.subset node_modules/@fontsource/anton/files/anton-latin-400-normal.woff2 \
  --unicodes="$U" --flavor=woff2 --layout-features='kern,liga,calt' \
  --output-file=src/assets/fonts/anton-400-subset.woff2
python3 -m fontTools.subset node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2 \
  --unicodes="$U" --flavor=woff2 --layout-features='kern,liga,calt,ccmp,locl,mark,mkmk,case' \
  --output-file=src/assets/fonts/inter-wght-subset.woff2
