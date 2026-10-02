#!/usr/bin/env python3
"""Traces silhouettes used by the scroll story from the poster files and writes src/data/art.json.
Skyline: bottom strip of IMG-20260923-WA0029.jpg (dark silhouette vs orange sky).
Campus:  roofline of the building photo in IMG-20260923-WA0024.jpg (building vs blue sky).
Both are simplified (Douglas-Peucker) outlines, not exact drawings of any landmark."""
import sys, numpy as np
from PIL import Image
RAW = sys.argv[1] if len(sys.argv) > 1 else '/workspace/srijan'
OUT = sys.argv[2] if len(sys.argv) > 2 else 'src/data/art.json'

def rdp(pts, eps):
    if len(pts) < 3: return pts
    a = np.array(pts[0], float); b = np.array(pts[-1], float); d = b - a; n = np.hypot(*d)
    best, bi = -1, 0
    for i in range(1, len(pts) - 1):
        p = np.array(pts[i], float)
        dist = abs(d[0]*(a[1]-p[1]) - (a[0]-p[0])*d[1]) / n if n else np.hypot(*(p-a))
        if dist > best: best, bi = dist, i
    if best > eps: return rdp(pts[:bi+1], eps)[:-1] + rdp(pts[bi:], eps)
    return [pts[0], pts[-1]]

# skyline
a = np.array(Image.open(f'{RAW}/IMG-20260923-WA0029.jpg').convert('RGB')).astype(float); lum = a.mean(2)
Y0, Y1, W1, H1 = 1356, 1530, 1024, 175
top = []
for x in range(W1):
    y = Y1
    for yy in range(Y0, Y1):
        if lum[yy, x] < 52 and (lum[yy:yy+14, x] < 62).mean() > .85: y = yy; break
    top.append(y)
top = np.array(top); sm = np.array([np.median(top[max(0, i-1):i+2]) for i in range(W1)])
sky = rdp([(x, int(sm[x]) - Y0) for x in range(W1)], 2.0)
sky_d = f'M0 {H1}' + ''.join(f'L{x} {y}' for x, y in sky) + f'L{W1} {H1}'

# campus
b = np.array(Image.open(f'{RAW}/IMG-20260923-WA0024.jpg').convert('RGB')).astype(float)
R, B = b[..., 0], b[..., 2]
W2, VY, VH = 703, 245, 150
tc = []
for x in range(W2):
    y = 600
    for yy in range(215, 600):
        if (B[yy:yy+14, x] <= R[yy:yy+14, x] + 8).mean() > .85: y = yy; break
    tc.append(y)
tc = np.array(tc); smc = np.array([np.median(tc[max(0, i-8):i+9]) for i in range(W2)])
camp = rdp([(x, int(max(smc[x], VY + 4))) for x in range(W2)], 2.5)
camp_d = f'M0 {VY+VH}' + ''.join(f'L{x} {y}' for x, y in camp) + f'L{W2} {VY+VH}'

import json
json.dump({'sky': sky_d, 'skyW': W1, 'skyH': H1, 'campus': camp_d, 'campW': W2, 'campY': VY, 'campH': VH}, open(OUT, 'w'))
print(len(sky_d) + len(camp_d), 'path bytes')
