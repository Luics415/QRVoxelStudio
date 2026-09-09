"use client";

import { useEffect, useRef } from "react";
import type { QRMatrix, VisualProfile } from "@/models/qr-slot";

interface QRForestSceneProps {
  matrix: QRMatrix;
  progress: number;
  theme: VisualProfile["theme"];
}

type Palette = {
  canopyTop: string;
  canopyMid: string;
  canopyLight: string;
  canopyShadow: string;
  leafAccent: string;
  trunk: string;
  trunkLight: string;
  trunkShadow: string;
  ground: string;
  groundDeep: string;
  groundLine: string;
  qrInk: string;
  qrPaper: string;
};

const PALETTES: Record<VisualProfile["theme"], Palette> = {
  neutral: {
    canopyTop: "#527ea2",
    canopyMid: "#3d6287",
    canopyLight: "#78a6c0",
    canopyShadow: "#294762",
    leafAccent: "#9fd6de",
    trunk: "#6e5965",
    trunkLight: "#8d7480",
    trunkShadow: "#4f414c",
    ground: "#a8d3ef",
    groundDeep: "#86b5d5",
    groundLine: "rgba(54,90,130,.13)",
    qrInk: "#172b40",
    qrPaper: "#f8fbfd",
  },
  spring: {
    canopyTop: "#c76eb8",
    canopyMid: "#a85a9f",
    canopyLight: "#efc0df",
    canopyShadow: "#744f79",
    leafAccent: "#f7d6ea",
    trunk: "#6a5362",
    trunkLight: "#8b6d7b",
    trunkShadow: "#4f3e4b",
    ground: "#a8d3ef",
    groundDeep: "#91bfdc",
    groundLine: "rgba(200,106,182,.13)",
    qrInk: "#27384f",
    qrPaper: "#fffafd",
  },
  summer: {
    canopyTop: "#4d7c84",
    canopyMid: "#38656d",
    canopyLight: "#79afb1",
    canopyShadow: "#294e58",
    leafAccent: "#a7dadd",
    trunk: "#66545a",
    trunkLight: "#846d73",
    trunkShadow: "#493e44",
    ground: "#a8d3ef",
    groundDeep: "#87bad3",
    groundLine: "rgba(65,111,126,.13)",
    qrInk: "#19313d",
    qrPaper: "#f8fcfc",
  },
  autumn: {
    canopyTop: "#9b657f",
    canopyMid: "#7d526e",
    canopyLight: "#d88db1",
    canopyShadow: "#593f58",
    leafAccent: "#eeb6cf",
    trunk: "#654c55",
    trunkLight: "#85656e",
    trunkShadow: "#483840",
    ground: "#a8d3ef",
    groundDeep: "#91b7d1",
    groundLine: "rgba(138,98,125,.14)",
    qrInk: "#302c3d",
    qrPaper: "#fffafb",
  },
  winter: {
    canopyTop: "#7898b3",
    canopyMid: "#5e7e9b",
    canopyLight: "#e1f1f8",
    canopyShadow: "#465f79",
    leafAccent: "#f4fbff",
    trunk: "#626a76",
    trunkLight: "#87909c",
    trunkShadow: "#454c57",
    ground: "#a8d3ef",
    groundDeep: "#90bfdc",
    groundLine: "rgba(105,135,164,.12)",
    qrInk: "#24384b",
    qrPaper: "#fbfdff",
  },
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smoothstep = (edge0: number, edge1: number, value: number) => {
  const t = clamp01((value - edge0) / (edge1 - edge0 || 1));
  return t * t * (3 - 2 * t);
};

function seeded(seed: number, salt = 0) {
  const value = Math.sin(seed * 12.9898 + salt * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function polygon(
  ctx: CanvasRenderingContext2D,
  points: Array<[number, number]>,
  fill: string,
  alpha = 1,
) {
  if (!points.length || alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i += 1) {
    ctx.lineTo(points[i][0], points[i][1]);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function drawIsoBlock(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  halfWidth: number,
  halfHeight: number,
  depth: number,
  colors: { top: string; left: string; right: string },
  alpha: number,
) {
  if (alpha <= 0.002 || halfWidth <= 0.1 || halfHeight <= 0.1) return;

  const top: [number, number] = [x, y - halfHeight];
  const right: [number, number] = [x + halfWidth, y];
  const bottom: [number, number] = [x, y + halfHeight];
  const left: [number, number] = [x - halfWidth, y];

  polygon(
    ctx,
    [left, bottom, [bottom[0], bottom[1] + depth], [left[0], left[1] + depth]],
    colors.left,
    alpha,
  );
  polygon(
    ctx,
    [right, bottom, [bottom[0], bottom[1] + depth], [right[0], right[1] + depth]],
    colors.right,
    alpha,
  );
  polygon(ctx, [top, right, bottom, left], colors.top, alpha);
}

function drawTrunk(
  ctx: CanvasRenderingContext2D,
  x: number,
  groundY: number,
  height: number,
  width: number,
  palette: Palette,
  alpha: number,
) {
  if (alpha <= 0.01 || height <= 0.1 || width <= 0.1) return;

  const topY = groundY - height;
  const half = width / 2;
  const skew = width * 0.32;

  polygon(
    ctx,
    [
      [x - half, topY],
      [x, topY + skew],
      [x, groundY],
      [x - half, groundY - skew],
    ],
    palette.trunkShadow,
    alpha,
  );
  polygon(
    ctx,
    [
      [x + half, topY],
      [x, topY + skew],
      [x, groundY],
      [x + half, groundY - skew],
    ],
    palette.trunk,
    alpha,
  );
  polygon(
    ctx,
    [
      [x, topY - skew * 0.2],
      [x + half, topY],
      [x, topY + skew],
      [x - half, topY],
    ],
    palette.trunkLight,
    alpha,
  );
}

function drawForestTree(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  t: number,
  palette: Palette,
  seed: number,
) {
  const forestAlpha = 1 - smoothstep(0.66, 0.96, t);
  if (forestAlpha <= 0.002) return;

  const variance = 0.88 + seeded(seed, 1) * 0.24;
  const heightVariance = 0.92 + seeded(seed, 2) * 0.22;
  const crown = size * variance;
  const trunkHeight = size * 1.18 * heightVariance * (1 - smoothstep(0.38, 0.9, t));
  const trunkWidth = Math.max(1, size * 0.17 * (1 - smoothstep(0.45, 0.93, t)));

  // Soft ground shadow keeps the forest grounded, but disappears before scan view.
  const shadowAlpha = forestAlpha * (1 - smoothstep(0.35, 0.82, t)) * 0.18;
  if (shadowAlpha > 0.002) {
    ctx.save();
    ctx.globalAlpha = shadowAlpha;
    ctx.fillStyle = palette.canopyShadow;
    ctx.beginPath();
    ctx.ellipse(x + crown * 0.14, y + crown * 0.12, crown * 0.46, crown * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawTrunk(ctx, x, y, trunkHeight, trunkWidth, palette, forestAlpha);

  const crownY = y - trunkHeight * 0.84;
  const blockDepth = crown * 0.14 * (1 - smoothstep(0.46, 0.9, t));
  const isoHalfH = crown * 0.18;
  const isoHalfW = crown * 0.38;

  const compactCrown = crown < 8;
  const clusters = compactCrown
    ? [{ dx: 0, dy: -crown * 0.05, s: 1.05, top: palette.canopyTop }]
    : [
        { dx: 0, dy: crown * 0.11, s: 1.0, top: palette.canopyMid },
        { dx: -crown * 0.24, dy: -crown * 0.02, s: 0.72, top: palette.canopyTop },
        { dx: crown * 0.25, dy: -crown * 0.04, s: 0.74, top: palette.canopyTop },
        { dx: -crown * 0.08, dy: -crown * 0.27, s: 0.78, top: palette.canopyLight },
        { dx: crown * 0.12, dy: -crown * 0.19, s: 0.62, top: palette.canopyTop },
      ];

  // Back-to-front ordering gives each crown a readable voxel silhouette.
  // Tiny cells use a single block as a level-of-detail fallback.
  for (const cluster of clusters) {
    drawIsoBlock(
      ctx,
      x + cluster.dx,
      crownY + cluster.dy,
      isoHalfW * cluster.s,
      isoHalfH * cluster.s,
      blockDepth * cluster.s,
      {
        top: cluster.top,
        left: palette.canopyShadow,
        right: palette.canopyMid,
      },
      forestAlpha,
    );
  }

  // Sparse highlights/blossoms keep each tree from looking cloned.
  const detailAlpha = forestAlpha * (1 - smoothstep(0.25, 0.72, t));
  if (detailAlpha > 0.015 && crown >= 8) {
    ctx.save();
    ctx.globalAlpha = detailAlpha * 0.78;
    ctx.fillStyle = palette.leafAccent;
    const detailCount = 2 + Math.floor(seeded(seed, 5) * 3);
    for (let i = 0; i < detailCount; i += 1) {
      const px = x + (seeded(seed, 10 + i) - 0.5) * crown * 0.62;
      const py = crownY - crown * 0.08 + (seeded(seed, 20 + i) - 0.5) * crown * 0.34;
      const r = Math.max(0.7, crown * (0.025 + seeded(seed, 30 + i) * 0.022));
      ctx.fillRect(px - r, py - r * 0.6, r * 2, r * 1.2);
    }
    ctx.restore();
  }
}

function drawTopCanopy(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  t: number,
  palette: Palette,
  seed: number,
) {
  const topAlpha = smoothstep(0.38, 0.68, t) * (1 - smoothstep(0.86, 0.995, t));
  if (topAlpha <= 0.002) return;

  const r = size * 0.34;
  const blobs = [
    [-0.23, -0.19, 0.88, palette.canopyLight],
    [0.24, -0.16, 0.83, palette.canopyTop],
    [-0.22, 0.22, 0.84, palette.canopyMid],
    [0.24, 0.22, 0.88, palette.canopyShadow],
    [0, 0, 1.0, palette.canopyMid],
  ] as const;

  ctx.save();
  ctx.globalAlpha = topAlpha;
  for (const [dx, dy, scale, color] of blobs) {
    ctx.beginPath();
    ctx.fillStyle = color;
    ctx.arc(
      x + size * dx + (seeded(seed, 70) - 0.5) * size * 0.025,
      y + size * dy + (seeded(seed, 71) - 0.5) * size * 0.025,
      r * scale,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  ctx.restore();
}

function drawQRCanopyTile(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  t: number,
  palette: Palette,
  seed: number,
) {
  const tileAlpha = smoothstep(0.63, 0.94, t);
  if (tileAlpha <= 0.002) return;

  const settle = smoothstep(0.72, 1, t);
  const finalSize = size * lerp(0.9, 1, settle);
  const radius = finalSize * 0.17 * (1 - settle);
  const left = x - finalSize / 2;
  const top = y - finalSize / 2;

  ctx.save();
  ctx.globalAlpha = tileAlpha;
  ctx.fillStyle = palette.qrInk;
  roundedRectPath(ctx, left, top, finalSize, finalSize, radius);
  ctx.fill();

  // A faint canopy facet is visible during the morph, then nearly disappears
  // so the final matrix keeps strong, scanner-friendly contrast.
  const textureAlpha = (1 - smoothstep(0.9, 1, t)) * 0.18 + 0.025;
  ctx.globalAlpha = tileAlpha * textureAlpha;
  ctx.fillStyle = palette.canopyLight;
  const facetSize = finalSize * (0.18 + seeded(seed, 91) * 0.08);
  ctx.fillRect(
    left + finalSize * (0.16 + seeded(seed, 92) * 0.18),
    top + finalSize * (0.13 + seeded(seed, 93) * 0.17),
    facetSize,
    facetSize * 0.56,
  );
  ctx.restore();
}

function drawAtmosphere(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  t: number,
  palette: Palette,
) {
  const rose = ctx.createRadialGradient(
    width * 0.18,
    height * 0.18,
    0,
    width * 0.18,
    height * 0.18,
    width * 0.38,
  );
  rose.addColorStop(0, "rgba(229,177,219,.34)");
  rose.addColorStop(1, "rgba(229,177,219,0)");
  ctx.fillStyle = rose;
  ctx.fillRect(0, 0, width, height);

  const mistAlpha = (1 - smoothstep(0.55, 0.92, t)) * 0.2;
  if (mistAlpha > 0.002) {
    const mist = ctx.createLinearGradient(0, height * 0.35, 0, height);
    mist.addColorStop(0, "rgba(255,255,255,0)");
    mist.addColorStop(1, `rgba(255,255,255,${mistAlpha})`);
    ctx.fillStyle = mist;
    ctx.fillRect(0, height * 0.28, width, height * 0.72);
  }

  // Thin horizon glow subtly separates the forest silhouettes.
  const horizonAlpha = (1 - smoothstep(0.35, 0.78, t)) * 0.2;
  if (horizonAlpha > 0.002) {
    const horizon = ctx.createRadialGradient(
      width * 0.5,
      height * 0.18,
      0,
      width * 0.5,
      height * 0.18,
      width * 0.58,
    );
    horizon.addColorStop(0, `rgba(255,255,255,${horizonAlpha})`);
    horizon.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = horizon;
    ctx.fillRect(0, 0, width, height * 0.65);
  }

  // Mild depth vignette in forest mode; it fades completely in QR view.
  const vignetteAlpha = (1 - smoothstep(0.45, 0.9, t)) * 0.1;
  if (vignetteAlpha > 0.002) {
    const vignette = ctx.createRadialGradient(
      width / 2,
      height * 0.48,
      Math.min(width, height) * 0.2,
      width / 2,
      height * 0.48,
      Math.max(width, height) * 0.72,
    );
    vignette.addColorStop(0, "rgba(31,52,76,0)");
    vignette.addColorStop(1, `rgba(31,52,76,${vignetteAlpha})`);
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);
  }

  // Touch groundDeep to keep palette tied to the season without affecting QR contrast.
  ctx.save();
  ctx.globalAlpha = (1 - smoothstep(0.45, 0.84, t)) * 0.045;
  ctx.fillStyle = palette.groundDeep;
  ctx.fillRect(0, height * 0.62, width, height * 0.38);
  ctx.restore();
}

function drawIsometricGround(
  ctx: CanvasRenderingContext2D,
  n: number,
  isoCell: number,
  isoOriginX: number,
  isoOriginY: number,
  t: number,
  palette: Palette,
) {
  const alpha = (1 - smoothstep(0.54, 0.86, t)) * 0.42;
  if (alpha <= 0.002) return;

  const pad = 2.2;
  const top = [isoOriginX, isoOriginY - isoCell * pad] as [number, number];
  const right = [
    isoOriginX + (n + pad * 2) * isoCell * 0.5,
    isoOriginY + (n + pad * 2) * isoCell * 0.25,
  ] as [number, number];
  const bottom = [
    isoOriginX,
    isoOriginY + (n + pad * 2) * isoCell * 0.5,
  ] as [number, number];
  const left = [
    isoOriginX - (n + pad * 2) * isoCell * 0.5,
    isoOriginY + (n + pad * 2) * isoCell * 0.25,
  ] as [number, number];

  polygon(ctx, [top, right, bottom, left], "rgba(255,255,255,.13)", alpha);

  ctx.save();
  ctx.globalAlpha = alpha * 0.55;
  ctx.strokeStyle = palette.groundLine;
  ctx.lineWidth = 1;
  for (let i = 0; i <= n; i += 2) {
    const aX = isoOriginX + i * isoCell * 0.5;
    const aY = isoOriginY + i * isoCell * 0.25;
    const bX = isoOriginX + (i - n) * isoCell * 0.5;
    const bY = isoOriginY + (i + n) * isoCell * 0.25;
    ctx.beginPath();
    ctx.moveTo(aX, aY);
    ctx.lineTo(bX, bY);
    ctx.stroke();

    const cX = isoOriginX - i * isoCell * 0.5;
    const cY = isoOriginY + i * isoCell * 0.25;
    const dX = isoOriginX + (n - i) * isoCell * 0.5;
    const dY = isoOriginY + (n + i) * isoCell * 0.25;
    ctx.beginPath();
    ctx.moveTo(cX, cY);
    ctx.lineTo(dX, dY);
    ctx.stroke();
  }
  ctx.restore();
}

function drawQRPlate(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  side: number,
  topCell: number,
  t: number,
  palette: Palette,
) {
  const alpha = smoothstep(0.48, 0.9, t);
  if (alpha <= 0.002) return;

  const lift = (1 - smoothstep(0.7, 1, t)) * topCell * 0.55;
  const radius = topCell * lerp(1.2, 0.38, smoothstep(0.7, 1, t));

  ctx.save();
  ctx.shadowColor = `rgba(30,52,76,${0.16 * alpha})`;
  ctx.shadowBlur = 30 * alpha;
  ctx.shadowOffsetY = 14 * alpha;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = palette.qrPaper;
  roundedRectPath(ctx, x, y - lift, side, side, radius);
  ctx.fill();
  ctx.restore();
}

export function QRForestScene({ matrix, progress, theme }: QRForestSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const render = () => {
      const rect = canvas.getBoundingClientRect();
      const width = Math.max(320, rect.width);
      const height = Math.max(360, rect.height);
      const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));

      const pixelWidth = Math.round(width * dpr);
      const pixelHeight = Math.round(height * dpr);
      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.imageSmoothingEnabled = true;

      const palette = PALETTES[theme];
      const t = clamp01(progress);
      ctx.fillStyle = palette.ground;
      ctx.fillRect(0, 0, width, height);
      drawAtmosphere(ctx, width, height, t, palette);

      if (matrix.length === 0) {
        ctx.fillStyle = "rgba(34,57,82,.72)";
        ctx.textAlign = "center";
        ctx.font = "700 16px system-ui";
        ctx.fillText("Adjunta un QR para sembrar el bosque", width / 2, height / 2 - 6);
        ctx.fillStyle = "rgba(34,57,82,.48)";
        ctx.font = "500 12px system-ui";
        ctx.fillText("La vista cenital aparecerá a partir de su matriz", width / 2, height / 2 + 18);
        return;
      }

      const n = matrix.length;
      const quiet = 4;
      const total = n + quiet * 2;
      const qrSide = Math.min(width * 0.78, height * 0.78);
      const topCell = qrSide / total;
      const plateX = (width - qrSide) / 2;
      const plateY = (height - qrSide) / 2;
      const topOriginX = plateX + quiet * topCell;
      const topOriginY = plateY + quiet * topCell;

      // Forest mode is intentionally larger and lower than the final QR plate.
      const isoCell = Math.min(width / (n * 1.02), height / (n * 0.53 + 8));
      const isoOriginX = width / 2;
      const isoOriginY = height * 0.16;

      drawIsometricGround(ctx, n, isoCell, isoOriginX, isoOriginY, t, palette);
      drawQRPlate(ctx, plateX, plateY, qrSide, topCell, t, palette);

      const items: Array<{ row: number; col: number; depth: number }> = [];
      for (let row = 0; row < n; row += 1) {
        for (let col = 0; col < n; col += 1) {
          if (matrix[row]?.[col]) {
            items.push({ row, col, depth: row + col + seeded(row * n + col, 4) * 0.01 });
          }
        }
      }
      items.sort((a, b) => a.depth - b.depth || a.row - b.row || a.col - b.col);

      const cameraLift = smoothstep(0.08, 0.92, t);
      const jitterFade = 1 - smoothstep(0.18, 0.72, t);

      for (const { row, col } of items) {
        const seed = row * n + col;
        const jitterX = (seeded(seed, 41) - 0.5) * isoCell * 0.24 * jitterFade;
        const jitterY = (seeded(seed, 42) - 0.5) * isoCell * 0.12 * jitterFade;

        const isoX = isoOriginX + (col - row) * isoCell * 0.5 + jitterX;
        const isoY = isoOriginY + (col + row) * isoCell * 0.25 + isoCell * 1.85 + jitterY;
        const topX = topOriginX + (col + 0.5) * topCell;
        const topY = topOriginY + (row + 0.5) * topCell;

        // A smooth camera arc feels less like blocks sliding across the screen.
        const arc = Math.sin(cameraLift * Math.PI) * Math.min(width, height) * 0.035;
        const x = lerp(isoX, topX, cameraLift);
        const y = lerp(isoY, topY, cameraLift) - arc;
        const forestScale = 0.88 + seeded(seed, 50) * 0.2;
        const size = lerp(isoCell * 1.62 * forestScale, topCell, smoothstep(0.22, 1, t));

        drawForestTree(ctx, x, y, size, t, palette, seed);
        drawTopCanopy(ctx, x, y, size, t, palette, seed);
        drawQRCanopyTile(ctx, x, y, size, t, palette, seed);
      }

      // At the last few percent, redraw the exact matrix on the pixel grid.
      // This removes interpolation seams and keeps the final QR geometry precise.
      const precisionAlpha = smoothstep(0.965, 1, t);
      if (precisionAlpha > 0.002) {
        ctx.save();
        ctx.globalAlpha = precisionAlpha;
        ctx.fillStyle = palette.qrInk;
        for (let row = 0; row < n; row += 1) {
          for (let col = 0; col < n; col += 1) {
            if (!matrix[row]?.[col]) continue;
            const x = topOriginX + col * topCell;
            const y = topOriginY + row * topCell;
            ctx.fillRect(x, y, topCell + 0.35, topCell + 0.35);
          }
        }
        ctx.restore();

        // Keep a whisper of leaf structure inside the exact modules. The texture
        // never crosses module boundaries and stays deliberately low-contrast.
        if (topCell >= 6) {
          ctx.save();
          ctx.globalAlpha = precisionAlpha * 0.045;
          ctx.fillStyle = "#ffffff";
          for (let row = 0; row < n; row += 1) {
            for (let col = 0; col < n; col += 1) {
              if (!matrix[row]?.[col]) continue;
              const seed = row * n + col;
              const x = topOriginX + col * topCell;
              const y = topOriginY + row * topCell;
              const facet = topCell * 0.22;
              const dx = topCell * (0.16 + seeded(seed, 120) * 0.12);
              const dy = topCell * (0.14 + seeded(seed, 121) * 0.12);
              ctx.fillRect(x + dx, y + dy, facet, Math.max(1, facet * 0.38));
            }
          }
          ctx.restore();
        }
      }
    };

    render();
    const observer = new ResizeObserver(render);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [matrix, progress, theme]);

  return <canvas ref={canvasRef} className="forestCanvas" aria-label="Bosque QR animado" />;
}
