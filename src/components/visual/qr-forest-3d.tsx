"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  Color,
  Group,
  InstancedMesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PerspectiveCamera,
  Vector3,
} from "three";
import type { QRMatrix, VisualProfile } from "@/models/qr-slot";

interface QRForest3DProps {
  matrix: QRMatrix;
  progress: number;
  theme: VisualProfile["theme"];
  animationSpeed?: number;
  onWeatherChange?: (label: string) => void;
}

type ScenePalette = {
  sky: string;
  haze: string;
  ground: string;
  groundSide: string;
  soilDeep: string;
  paper: string;
  ink: string;
  trunk: string;
  trunkLight: string;
  leafDark: string;
  leafMid: string;
  leafMain: string;
  leafLight: string;
  accent: string;
  particle: string;
  leafFallA: string;
  leafFallB: string;
};

type VoxelPart = {
  x: number;
  y: number;
  z: number;
  sx: number;
  sy: number;
  sz: number;
  rot?: number;
};

type TreeVariant = {
  id: string;
  dark: VoxelPart[];
  mid: VoxelPart[];
  main: VoxelPart[];
  light: VoxelPart[];
  heightScale: number;
  crownScale: number;
  heroScale: number;
};

type Cell = {
  row: number;
  col: number;
  seed: number;
  jitterX: number;
  jitterZ: number;
  height: number;
  crown: number;
  delay: number;
  variantIndex: number;
  sizeBoost: number;
};

type WeatherMode = "sun" | "breeze" | "drizzle" | "rain" | "snow";

const PALETTES: Record<VisualProfile["theme"], ScenePalette> = {
  neutral: {
    sky: "#add5ee",
    haze: "#f0d4eb",
    ground: "#aed66e",
    groundSide: "#84a85c",
    soilDeep: "#7b6354",
    paper: "#fffafc",
    ink: "#24344b",
    trunk: "#734a3a",
    trunkLight: "#a5664d",
    leafDark: "#db86b7",
    leafMid: "#f4a8cf",
    leafMain: "#ffc4e2",
    leafLight: "#fff0f7",
    accent: "#eda5d8",
    particle: "#ffe7f4",
    leafFallA: "#ffd9ef",
    leafFallB: "#f3a0cf",
  },
  spring: {
    sky: "#abd4ee",
    haze: "#efc2e4",
    ground: "#aed66e",
    groundSide: "#84a85c",
    soilDeep: "#806456",
    paper: "#fffafc",
    ink: "#24344b",
    trunk: "#734a3a",
    trunkLight: "#a5664d",
    leafDark: "#db86b7",
    leafMid: "#f4a8cf",
    leafMain: "#ffc4e2",
    leafLight: "#fff0f7",
    accent: "#eda5d8",
    particle: "#ffe7f4",
    leafFallA: "#ffd9ef",
    leafFallB: "#f3a0cf",
  },
  summer: {
    sky: "#a8d8ee",
    haze: "#c5edf0",
    ground: "#89d66a",
    groundSide: "#63a756",
    soilDeep: "#6f5c4f",
    paper: "#f8fdf9",
    ink: "#223d34",
    trunk: "#72563d",
    trunkLight: "#977359",
    leafDark: "#2f8554",
    leafMid: "#4bae68",
    leafMain: "#7ad38d",
    leafLight: "#d2f4c8",
    accent: "#86e4d8",
    particle: "#f0fff6",
    leafFallA: "#b6f2a9",
    leafFallB: "#6cc98e",
  },
  autumn: {
    sky: "#b8d4eb",
    haze: "#f1c5dd",
    ground: "#cbb766",
    groundSide: "#978347",
    soilDeep: "#72584a",
    paper: "#fffaf5",
    ink: "#47313a",
    trunk: "#754c39",
    trunkLight: "#9d6a4f",
    leafDark: "#92455b",
    leafMid: "#d16d62",
    leafMain: "#ef9d54",
    leafLight: "#ffd8ad",
    accent: "#e6a165",
    particle: "#ffe7cf",
    leafFallA: "#ef9d54",
    leafFallB: "#c94f5f",
  },
  winter: {
    sky: "#c3e0f1",
    haze: "#f6fbff",
    ground: "#d7e7e3",
    groundSide: "#a8beb8",
    soilDeep: "#808891",
    paper: "#fbfdff",
    ink: "#26384d",
    trunk: "#71828f",
    trunkLight: "#95a6b3",
    leafDark: "#7a98b0",
    leafMid: "#b6cfdf",
    leafMain: "#e6f2f7",
    leafLight: "#ffffff",
    accent: "#f3f8fb",
    particle: "#ffffff",
    leafFallA: "#ffffff",
    leafFallB: "#dcecf7",
  },
};

const TRUNK_PARTS: VoxelPart[] = [
  { x: 0, y: 0.12, z: 0, sx: 0.24, sy: 0.24, sz: 0.24 },
  { x: 0, y: 0.38, z: 0, sx: 0.2, sy: 0.26, sz: 0.2 },
  { x: 0, y: 0.66, z: 0, sx: 0.17, sy: 0.24, sz: 0.17 },
  { x: -0.09, y: 0.92, z: 0.02, sx: 0.14, sy: 0.18, sz: 0.14, rot: -0.22 },
  { x: 0.09, y: 0.92, z: -0.03, sx: 0.14, sy: 0.18, sz: 0.14, rot: 0.18 },
  { x: -0.22, y: 0.18, z: 0.1, sx: 0.12, sy: 0.12, sz: 0.12, rot: -0.15 },
  { x: 0.22, y: 0.18, z: -0.1, sx: 0.12, sy: 0.12, sz: 0.12, rot: 0.14 },
  { x: -0.14, y: 0.52, z: -0.16, sx: 0.12, sy: 0.14, sz: 0.12, rot: -0.38 },
  { x: 0.16, y: 0.54, z: 0.16, sx: 0.12, sy: 0.14, sz: 0.12, rot: 0.38 },
];

const SPRING_VARIANTS: TreeVariant[] = [
  {
    id: "spring-sakura-round",
    dark: [
      { x: -0.46, y: 1.05, z: 0.08, sx: 0.26, sy: 0.18, sz: 0.26 },
      { x: 0.46, y: 1.03, z: 0.04, sx: 0.26, sy: 0.18, sz: 0.26 },
      { x: -0.14, y: 1.18, z: -0.3, sx: 0.22, sy: 0.18, sz: 0.22 },
      { x: 0.18, y: 1.2, z: 0.31, sx: 0.22, sy: 0.18, sz: 0.22 },
      { x: -0.28, y: 1.38, z: -0.02, sx: 0.18, sy: 0.16, sz: 0.18 },
      { x: 0.3, y: 1.36, z: -0.08, sx: 0.18, sy: 0.16, sz: 0.18 },
    ],
    mid: [
      { x: -0.54, y: 1.24, z: 0.12, sx: 0.24, sy: 0.18, sz: 0.24 },
      { x: 0.54, y: 1.24, z: 0.12, sx: 0.24, sy: 0.18, sz: 0.24 },
      { x: -0.28, y: 1.12, z: 0.4, sx: 0.22, sy: 0.16, sz: 0.22 },
      { x: 0.28, y: 1.16, z: 0.4, sx: 0.22, sy: 0.16, sz: 0.22 },
      { x: -0.22, y: 1.58, z: -0.03, sx: 0.2, sy: 0.16, sz: 0.2 },
      { x: 0.22, y: 1.58, z: 0.04, sx: 0.2, sy: 0.16, sz: 0.2 },
      { x: -0.02, y: 1.72, z: -0.28, sx: 0.18, sy: 0.14, sz: 0.18 },
      { x: -0.02, y: 1.72, z: 0.28, sx: 0.18, sy: 0.14, sz: 0.18 },
    ],
    main: [
      { x: -0.58, y: 1.46, z: -0.08, sx: 0.2, sy: 0.18, sz: 0.2 },
      { x: 0.58, y: 1.44, z: -0.1, sx: 0.2, sy: 0.18, sz: 0.2 },
      { x: -0.4, y: 1.66, z: -0.38, sx: 0.2, sy: 0.16, sz: 0.2 },
      { x: 0.4, y: 1.66, z: 0.38, sx: 0.2, sy: 0.16, sz: 0.2 },
      { x: -0.16, y: 1.86, z: -0.16, sx: 0.2, sy: 0.16, sz: 0.2 },
      { x: 0.18, y: 1.9, z: 0.16, sx: 0.2, sy: 0.16, sz: 0.2 },
      { x: -0.02, y: 2.04, z: 0, sx: 0.24, sy: 0.18, sz: 0.24 },
      { x: -0.44, y: 1.86, z: 0.04, sx: 0.18, sy: 0.14, sz: 0.18 },
      { x: 0.44, y: 1.86, z: -0.04, sx: 0.18, sy: 0.14, sz: 0.18 },
    ],
    light: [
      { x: -0.22, y: 2.22, z: -0.02, sx: 0.14, sy: 0.12, sz: 0.14 },
      { x: 0.22, y: 2.18, z: 0.04, sx: 0.14, sy: 0.12, sz: 0.14 },
      { x: -0.08, y: 2.32, z: 0.18, sx: 0.12, sy: 0.12, sz: 0.12 },
      { x: 0.08, y: 2.3, z: -0.18, sx: 0.12, sy: 0.12, sz: 0.12 },
      { x: -0.02, y: 2.4, z: 0, sx: 0.1, sy: 0.1, sz: 0.1 },
    ],
    heightScale: 1.12,
    crownScale: 1.18,
    heroScale: 1.26,
  },
  {
    id: "spring-blossom-split",
    dark: [
      { x: -0.62, y: 1.04, z: 0.02, sx: 0.22, sy: 0.16, sz: 0.22 },
      { x: 0.62, y: 1.04, z: 0.02, sx: 0.22, sy: 0.16, sz: 0.22 },
      { x: -0.18, y: 1.18, z: -0.3, sx: 0.18, sy: 0.14, sz: 0.18 },
      { x: 0.18, y: 1.18, z: 0.3, sx: 0.18, sy: 0.14, sz: 0.18 },
    ],
    mid: [
      { x: -0.74, y: 1.28, z: 0.02, sx: 0.2, sy: 0.16, sz: 0.2 },
      { x: -0.48, y: 1.44, z: -0.24, sx: 0.18, sy: 0.14, sz: 0.18 },
      { x: -0.44, y: 1.6, z: 0.24, sx: 0.18, sy: 0.14, sz: 0.18 },
      { x: 0.74, y: 1.28, z: 0.02, sx: 0.2, sy: 0.16, sz: 0.2 },
      { x: 0.48, y: 1.44, z: 0.24, sx: 0.18, sy: 0.14, sz: 0.18 },
      { x: 0.44, y: 1.6, z: -0.24, sx: 0.18, sy: 0.14, sz: 0.18 },
    ],
    main: [
      { x: -0.62, y: 1.82, z: 0.02, sx: 0.18, sy: 0.14, sz: 0.18 },
      { x: -0.42, y: 1.96, z: -0.18, sx: 0.16, sy: 0.12, sz: 0.16 },
      { x: -0.38, y: 2.08, z: 0.18, sx: 0.16, sy: 0.12, sz: 0.16 },
      { x: 0.62, y: 1.82, z: 0.02, sx: 0.18, sy: 0.14, sz: 0.18 },
      { x: 0.42, y: 1.96, z: 0.18, sx: 0.16, sy: 0.12, sz: 0.16 },
      { x: 0.38, y: 2.08, z: -0.18, sx: 0.16, sy: 0.12, sz: 0.16 },
      { x: 0, y: 1.88, z: -0.18, sx: 0.14, sy: 0.12, sz: 0.14 },
      { x: 0, y: 1.88, z: 0.18, sx: 0.14, sy: 0.12, sz: 0.14 },
    ],
    light: [
      { x: -0.58, y: 2.18, z: 0.02, sx: 0.12, sy: 0.1, sz: 0.12 },
      { x: 0.58, y: 2.18, z: 0.02, sx: 0.12, sy: 0.1, sz: 0.12 },
      { x: -0.22, y: 2.06, z: 0.1, sx: 0.1, sy: 0.1, sz: 0.1 },
      { x: 0.22, y: 2.06, z: -0.1, sx: 0.1, sy: 0.1, sz: 0.1 },
      { x: 0, y: 2.26, z: 0, sx: 0.1, sy: 0.1, sz: 0.1 },
    ],
    heightScale: 1.16,
    crownScale: 1.12,
    heroScale: 1.24,
  },
];

const SUMMER_VARIANTS: TreeVariant[] = [
  {
    id: "summer-broad-oak",
    dark: [
      { x: -0.66, y: 1.02, z: 0.02, sx: 0.28, sy: 0.18, sz: 0.24 },
      { x: 0.66, y: 1.02, z: 0.02, sx: 0.28, sy: 0.18, sz: 0.24 },
      { x: 0, y: 1.0, z: -0.48, sx: 0.26, sy: 0.18, sz: 0.22 },
      { x: 0, y: 1.02, z: 0.48, sx: 0.26, sy: 0.18, sz: 0.22 },
    ],
    mid: [
      { x: -0.74, y: 1.26, z: 0.04, sx: 0.24, sy: 0.16, sz: 0.22 },
      { x: 0.74, y: 1.26, z: 0.04, sx: 0.24, sy: 0.16, sz: 0.22 },
      { x: -0.48, y: 1.34, z: -0.3, sx: 0.2, sy: 0.14, sz: 0.2 },
      { x: 0.48, y: 1.34, z: 0.3, sx: 0.2, sy: 0.14, sz: 0.2 },
      { x: -0.18, y: 1.46, z: 0.46, sx: 0.2, sy: 0.14, sz: 0.2 },
      { x: 0.18, y: 1.46, z: -0.46, sx: 0.2, sy: 0.14, sz: 0.2 },
      { x: 0, y: 1.66, z: 0, sx: 0.26, sy: 0.18, sz: 0.26 },
    ],
    main: [
      { x: -0.58, y: 1.62, z: -0.16, sx: 0.2, sy: 0.16, sz: 0.2 },
      { x: 0.58, y: 1.62, z: -0.16, sx: 0.2, sy: 0.16, sz: 0.2 },
      { x: -0.36, y: 1.84, z: 0.18, sx: 0.2, sy: 0.16, sz: 0.2 },
      { x: 0.36, y: 1.84, z: 0.18, sx: 0.2, sy: 0.16, sz: 0.2 },
      { x: -0.18, y: 2.0, z: -0.18, sx: 0.18, sy: 0.14, sz: 0.18 },
      { x: 0.18, y: 2.0, z: -0.18, sx: 0.18, sy: 0.14, sz: 0.18 },
      { x: 0, y: 2.12, z: 0.02, sx: 0.18, sy: 0.14, sz: 0.18 },
      { x: 0, y: 1.78, z: 0.5, sx: 0.16, sy: 0.14, sz: 0.16 },
      { x: 0, y: 1.78, z: -0.5, sx: 0.16, sy: 0.14, sz: 0.16 },
    ],
    light: [
      { x: -0.16, y: 2.24, z: 0.16, sx: 0.12, sy: 0.1, sz: 0.12 },
      { x: 0.16, y: 2.24, z: -0.16, sx: 0.12, sy: 0.1, sz: 0.12 },
      { x: -0.4, y: 2.04, z: 0.02, sx: 0.12, sy: 0.1, sz: 0.12 },
      { x: 0.4, y: 2.04, z: 0.02, sx: 0.12, sy: 0.1, sz: 0.12 },
    ],
    heightScale: 1.04,
    crownScale: 1.32,
    heroScale: 1.34,
  },
  {
    id: "summer-dense-tiers",
    dark: [
      { x: -0.42, y: 1.06, z: 0.1, sx: 0.22, sy: 0.18, sz: 0.22 },
      { x: 0.42, y: 1.06, z: 0.1, sx: 0.22, sy: 0.18, sz: 0.22 },
      { x: 0, y: 1.08, z: -0.32, sx: 0.22, sy: 0.18, sz: 0.2 },
      { x: 0, y: 1.08, z: 0.36, sx: 0.22, sy: 0.18, sz: 0.2 },
    ],
    mid: [
      { x: -0.56, y: 1.34, z: 0.08, sx: 0.2, sy: 0.16, sz: 0.2 },
      { x: 0.56, y: 1.34, z: 0.08, sx: 0.2, sy: 0.16, sz: 0.2 },
      { x: -0.24, y: 1.44, z: 0.38, sx: 0.2, sy: 0.16, sz: 0.2 },
      { x: 0.24, y: 1.44, z: -0.38, sx: 0.2, sy: 0.16, sz: 0.2 },
      { x: 0, y: 1.62, z: 0, sx: 0.22, sy: 0.18, sz: 0.22 },
    ],
    main: [
      { x: -0.5, y: 1.7, z: -0.18, sx: 0.18, sy: 0.16, sz: 0.18 },
      { x: 0.5, y: 1.7, z: -0.18, sx: 0.18, sy: 0.16, sz: 0.18 },
      { x: -0.32, y: 1.9, z: 0.2, sx: 0.18, sy: 0.16, sz: 0.18 },
      { x: 0.32, y: 1.9, z: 0.2, sx: 0.18, sy: 0.16, sz: 0.18 },
      { x: 0, y: 2.06, z: 0.02, sx: 0.2, sy: 0.16, sz: 0.2 },
      { x: -0.16, y: 2.18, z: -0.12, sx: 0.16, sy: 0.14, sz: 0.16 },
      { x: 0.16, y: 2.18, z: 0.12, sx: 0.16, sy: 0.14, sz: 0.16 },
    ],
    light: [
      { x: -0.08, y: 2.34, z: 0.16, sx: 0.12, sy: 0.1, sz: 0.12 },
      { x: 0.08, y: 2.34, z: -0.16, sx: 0.12, sy: 0.1, sz: 0.12 },
      { x: 0, y: 2.44, z: 0, sx: 0.1, sy: 0.1, sz: 0.1 },
    ],
    heightScale: 1.18,
    crownScale: 1.18,
    heroScale: 1.3,
  },
];

const AUTUMN_VARIANTS: TreeVariant[] = [
  {
    id: "autumn-maple-fan",
    dark: [
      { x: -0.68, y: 1.02, z: 0.02, sx: 0.24, sy: 0.16, sz: 0.22 },
      { x: 0.68, y: 1.02, z: 0.02, sx: 0.24, sy: 0.16, sz: 0.22 },
      { x: 0, y: 1.06, z: -0.44, sx: 0.22, sy: 0.16, sz: 0.18 },
      { x: 0, y: 1.06, z: 0.44, sx: 0.22, sy: 0.16, sz: 0.18 },
    ],
    mid: [
      { x: -0.78, y: 1.24, z: 0.02, sx: 0.2, sy: 0.14, sz: 0.18 },
      { x: 0.78, y: 1.24, z: 0.02, sx: 0.2, sy: 0.14, sz: 0.18 },
      { x: -0.48, y: 1.34, z: -0.26, sx: 0.18, sy: 0.14, sz: 0.18 },
      { x: 0.48, y: 1.34, z: 0.26, sx: 0.18, sy: 0.14, sz: 0.18 },
      { x: -0.22, y: 1.52, z: 0.4, sx: 0.18, sy: 0.14, sz: 0.18 },
      { x: 0.22, y: 1.52, z: -0.4, sx: 0.18, sy: 0.14, sz: 0.18 },
    ],
    main: [
      { x: -0.6, y: 1.58, z: -0.14, sx: 0.18, sy: 0.14, sz: 0.18 },
      { x: 0.6, y: 1.58, z: -0.14, sx: 0.18, sy: 0.14, sz: 0.18 },
      { x: -0.38, y: 1.82, z: 0.2, sx: 0.18, sy: 0.14, sz: 0.18 },
      { x: 0.38, y: 1.82, z: 0.2, sx: 0.18, sy: 0.14, sz: 0.18 },
      { x: -0.18, y: 1.98, z: -0.18, sx: 0.16, sy: 0.14, sz: 0.16 },
      { x: 0.18, y: 1.98, z: -0.18, sx: 0.16, sy: 0.14, sz: 0.16 },
      { x: 0, y: 2.06, z: 0.02, sx: 0.18, sy: 0.14, sz: 0.18 },
    ],
    light: [
      { x: -0.2, y: 2.18, z: 0.14, sx: 0.12, sy: 0.1, sz: 0.12 },
      { x: 0.2, y: 2.18, z: -0.14, sx: 0.12, sy: 0.1, sz: 0.12 },
      { x: 0, y: 2.3, z: 0, sx: 0.1, sy: 0.1, sz: 0.1 },
    ],
    heightScale: 1.04,
    crownScale: 1.3,
    heroScale: 1.32,
  },
  {
    id: "autumn-canopy-cluster",
    dark: [
      { x: -0.32, y: 1.04, z: 0.08, sx: 0.2, sy: 0.16, sz: 0.2 },
      { x: 0.32, y: 1.04, z: 0.08, sx: 0.2, sy: 0.16, sz: 0.2 },
      { x: 0, y: 1.08, z: -0.28, sx: 0.18, sy: 0.16, sz: 0.18 },
      { x: 0, y: 1.08, z: 0.32, sx: 0.18, sy: 0.16, sz: 0.18 },
    ],
    mid: [
      { x: -0.52, y: 1.3, z: 0.12, sx: 0.2, sy: 0.14, sz: 0.2 },
      { x: 0.52, y: 1.3, z: 0.12, sx: 0.2, sy: 0.14, sz: 0.2 },
      { x: -0.26, y: 1.42, z: 0.36, sx: 0.18, sy: 0.14, sz: 0.18 },
      { x: 0.26, y: 1.42, z: -0.36, sx: 0.18, sy: 0.14, sz: 0.18 },
      { x: 0, y: 1.58, z: 0, sx: 0.2, sy: 0.16, sz: 0.2 },
    ],
    main: [
      { x: -0.42, y: 1.74, z: -0.12, sx: 0.18, sy: 0.14, sz: 0.18 },
      { x: 0.42, y: 1.74, z: -0.12, sx: 0.18, sy: 0.14, sz: 0.18 },
      { x: -0.24, y: 1.94, z: 0.16, sx: 0.16, sy: 0.14, sz: 0.16 },
      { x: 0.24, y: 1.94, z: 0.16, sx: 0.16, sy: 0.14, sz: 0.16 },
      { x: 0, y: 2.1, z: 0, sx: 0.18, sy: 0.14, sz: 0.18 },
      { x: -0.12, y: 2.22, z: -0.14, sx: 0.14, sy: 0.12, sz: 0.14 },
      { x: 0.12, y: 2.22, z: 0.14, sx: 0.14, sy: 0.12, sz: 0.14 },
    ],
    light: [
      { x: -0.06, y: 2.34, z: 0.14, sx: 0.1, sy: 0.1, sz: 0.1 },
      { x: 0.06, y: 2.34, z: -0.14, sx: 0.1, sy: 0.1, sz: 0.1 },
      { x: 0, y: 2.42, z: 0, sx: 0.1, sy: 0.1, sz: 0.1 },
    ],
    heightScale: 1.22,
    crownScale: 1.06,
    heroScale: 1.26,
  },
];

const WINTER_VARIANTS: TreeVariant[] = [
  {
    id: "winter-frost-pine",
    dark: [
      { x: 0, y: 1.0, z: 0, sx: 0.22, sy: 0.14, sz: 0.22 },
      { x: -0.28, y: 1.18, z: 0.02, sx: 0.18, sy: 0.14, sz: 0.18 },
      { x: 0.28, y: 1.18, z: 0.02, sx: 0.18, sy: 0.14, sz: 0.18 },
      { x: 0, y: 1.18, z: -0.24, sx: 0.18, sy: 0.14, sz: 0.18 },
      { x: 0, y: 1.18, z: 0.24, sx: 0.18, sy: 0.14, sz: 0.18 },
    ],
    mid: [
      { x: 0, y: 1.42, z: 0, sx: 0.2, sy: 0.14, sz: 0.2 },
      { x: -0.22, y: 1.54, z: -0.1, sx: 0.16, sy: 0.12, sz: 0.16 },
      { x: 0.22, y: 1.54, z: 0.1, sx: 0.16, sy: 0.12, sz: 0.16 },
      { x: -0.08, y: 1.68, z: 0.2, sx: 0.14, sy: 0.12, sz: 0.14 },
      { x: 0.08, y: 1.68, z: -0.2, sx: 0.14, sy: 0.12, sz: 0.14 },
    ],
    main: [
      { x: 0, y: 1.88, z: 0, sx: 0.18, sy: 0.12, sz: 0.18 },
      { x: -0.16, y: 2.02, z: 0.02, sx: 0.14, sy: 0.12, sz: 0.14 },
      { x: 0.16, y: 2.02, z: 0.02, sx: 0.14, sy: 0.12, sz: 0.14 },
      { x: 0, y: 2.14, z: 0.14, sx: 0.12, sy: 0.12, sz: 0.12 },
      { x: 0, y: 2.14, z: -0.14, sx: 0.12, sy: 0.12, sz: 0.12 },
    ],
    light: [
      { x: 0, y: 2.28, z: 0, sx: 0.1, sy: 0.1, sz: 0.1 },
      { x: -0.08, y: 2.22, z: 0.08, sx: 0.1, sy: 0.1, sz: 0.1 },
      { x: 0.08, y: 2.22, z: -0.08, sx: 0.1, sy: 0.1, sz: 0.1 },
    ],
    heightScale: 1.34,
    crownScale: 0.96,
    heroScale: 1.34,
  },
  {
    id: "winter-bare-snowcap",
    dark: [
      { x: -0.18, y: 1.06, z: 0.12, sx: 0.14, sy: 0.12, sz: 0.14 },
      { x: 0.18, y: 1.06, z: -0.12, sx: 0.14, sy: 0.12, sz: 0.14 },
      { x: 0, y: 1.22, z: 0.26, sx: 0.14, sy: 0.12, sz: 0.14 },
      { x: 0, y: 1.22, z: -0.26, sx: 0.14, sy: 0.12, sz: 0.14 },
    ],
    mid: [
      { x: -0.32, y: 1.42, z: 0.12, sx: 0.14, sy: 0.12, sz: 0.14 },
      { x: 0.32, y: 1.42, z: -0.12, sx: 0.14, sy: 0.12, sz: 0.14 },
      { x: -0.14, y: 1.66, z: 0.3, sx: 0.12, sy: 0.12, sz: 0.12 },
      { x: 0.14, y: 1.66, z: -0.3, sx: 0.12, sy: 0.12, sz: 0.12 },
    ],
    main: [
      { x: -0.28, y: 1.92, z: 0.02, sx: 0.14, sy: 0.12, sz: 0.14 },
      { x: 0.28, y: 1.92, z: -0.02, sx: 0.14, sy: 0.12, sz: 0.14 },
      { x: 0, y: 2.14, z: 0.02, sx: 0.14, sy: 0.12, sz: 0.14 },
      { x: -0.08, y: 2.26, z: 0.18, sx: 0.12, sy: 0.12, sz: 0.12 },
      { x: 0.08, y: 2.26, z: -0.18, sx: 0.12, sy: 0.12, sz: 0.12 },
    ],
    light: [
      { x: 0, y: 2.38, z: 0, sx: 0.12, sy: 0.12, sz: 0.12 },
      { x: -0.14, y: 2.32, z: 0.12, sx: 0.1, sy: 0.1, sz: 0.1 },
      { x: 0.14, y: 2.32, z: -0.12, sx: 0.1, sy: 0.1, sz: 0.1 },
    ],
    heightScale: 1.4,
    crownScale: 0.88,
    heroScale: 1.28,
  },
];

function getVariantsForTheme(theme: VisualProfile["theme"]): TreeVariant[] {
  if (theme === "summer") return SUMMER_VARIANTS;
  if (theme === "autumn") return AUTUMN_VARIANTS;
  if (theme === "winter") return WINTER_VARIANTS;
  return SPRING_VARIANTS;
}

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const smoothstep = (edge0: number, edge1: number, value: number) => {
  const t = clamp01((value - edge0) / Math.max(0.0001, edge1 - edge0));
  return t * t * (3 - 2 * t);
};
const smoother = (value: number) => {
  const t = clamp01(value);
  return t * t * t * (t * (t * 6 - 15) + 10);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const hash = (seed: number, salt = 0) => {
  const value = Math.sin(seed * 91.173 + salt * 31.731) * 43758.5453123;
  return value - Math.floor(value);
};
const weatherBand = (value: number, center: number, width: number) => {
  const delta = Math.abs((((value - center + 0.5) % 1) + 1) % 1 - 0.5);
  return clamp01(1 - delta / width);
};

function getWeatherLabel(theme: VisualProfile["theme"], mode: WeatherMode) {
  if (mode === "sun") return theme === "summer" ? "Sol tibio" : "Claro suave";
  if (mode === "breeze") {
    if (theme === "spring") return "Pétalos al viento";
    if (theme === "autumn") return "Hojas en danza";
    if (theme === "winter") return "Copos suaves";
    return "Hojas al viento";
  }
  if (mode === "drizzle") return theme === "winter" ? "Nieve ligera" : "Llovizna";
  if (mode === "snow") return "Nevada suave";
  return theme === "winter" ? "Nieve continua" : "Lluvia suave";
}

function makeCells(matrix: QRMatrix): Cell[] {
  const n = matrix.length;
  const cells: Cell[] = [];
  for (let row = 0; row < n; row += 1) {
    for (let col = 0; col < n; col += 1) {
      if (!matrix[row]?.[col]) continue;
      const seed = row * Math.max(1, n) + col + 1;
      cells.push({
        row,
        col,
        seed,
        jitterX: (hash(seed, 1) - 0.5) * 0.24,
        jitterZ: (hash(seed, 2) - 0.5) * 0.24,
        height: 1.08 + hash(seed, 3) * 0.36,
        crown: 0.96 + hash(seed, 4) * 0.28,
        delay: hash(seed, 5) * 0.92,
        variantIndex: Math.floor(hash(seed, 6) * 8),
        sizeBoost: 1 + hash(seed, 7) * 0.18,
      });
    }
  }
  return cells;
}

function setInstance(
  mesh: InstancedMesh | null,
  index: number,
  dummy: Object3D,
  x: number,
  y: number,
  z: number,
  sx: number,
  sy: number,
  sz: number,
  rotationY = 0,
  rotationX = 0,
  rotationZ = 0,
) {
  if (!mesh) return;
  dummy.position.set(x, y, z);
  dummy.rotation.set(rotationX, rotationY, rotationZ);
  dummy.scale.set(Math.max(0.0001, sx), Math.max(0.0001, sy), Math.max(0.0001, sz));
  dummy.updateMatrix();
  mesh.setMatrixAt(index, dummy.matrix);
}

function moduleTarget(index: number, total: number) {
  const cols = total <= 5 ? 2 : total <= 9 ? 3 : 4;
  const rows = Math.ceil(total / cols);
  const col = index % cols;
  const row = Math.floor(index / cols);
  const width = cols <= 2 ? 0.62 : cols === 3 ? 0.76 : 0.86;
  const depth = rows <= 2 ? 0.62 : rows === 3 ? 0.76 : 0.86;
  const x = ((col + 0.5) / cols - 0.5) * width;
  const z = ((row + 0.5) / rows - 0.5) * depth;
  const layer = index % 3;
  return { x, z, y: 0.08 + layer * 0.04, scale: cols <= 2 ? 0.28 : cols === 3 ? 0.24 : 0.2 };
}

function CameraRig({ progress, side }: { progress: number; side: number }) {
  const { camera, pointer } = useThree();
  const forestPosition = useMemo(() => new Vector3(), []);
  const topPosition = useMemo(() => new Vector3(), []);
  const mixedUp = useMemo(() => new Vector3(), []);
  const forestUp = useMemo(() => new Vector3(0, 1, 0), []);
  const topUp = useMemo(() => new Vector3(0, 0, -1), []);

  useFrame(() => {
    const t = smoother(progress);
    const pointerFade = 1 - smoothstep(0.52, 0.9, t);
    forestPosition.set(
      side * 0.96 + pointer.x * 1.12 * pointerFade,
      side * 0.82 + 4.4 + pointer.y * 0.72 * pointerFade,
      side * 1.04 + pointer.x * 0.42 * pointerFade,
    );
    topPosition.set(0, side * 2.18, 0.01);
    camera.position.lerpVectors(forestPosition, topPosition, t);
    mixedUp.lerpVectors(forestUp, topUp, t).normalize();
    camera.up.copy(mixedUp);
    camera.lookAt(0, t < 0.7 ? 0.58 * (1 - t) : 0, 0);
    const perspective = camera as PerspectiveCamera;
    if (typeof perspective.fov === "number") {
      perspective.fov = lerp(35, 28, t);
      perspective.updateProjectionMatrix();
    }
  });

  return null;
}

function SeasonalAtmosphere({
  theme,
  side,
  progress,
  onWeatherChange,
}: {
  theme: VisualProfile["theme"];
  side: number;
  progress: number;
  onWeatherChange?: (label: string) => void;
}) {
  const palette = PALETTES[theme];
  const atmosphereRef = useRef<Group>(null);
  const sunGlowRef = useRef<Group>(null);
  const rainRef = useRef<InstancedMesh>(null);
  const rainMatRef = useRef<MeshStandardMaterial>(null);
  const leafPrimaryRef = useRef<InstancedMesh>(null);
  const leafPrimaryMatRef = useRef<MeshStandardMaterial>(null);
  const leafDetailRef = useRef<InstancedMesh>(null);
  const leafDetailMatRef = useRef<MeshStandardMaterial>(null);
  const groundScatterRef = useRef<InstancedMesh>(null);
  const groundScatterMatRef = useRef<MeshStandardMaterial>(null);
  const primaryDummy = useMemo(() => new Object3D(), []);
  const detailDummy = useMemo(() => new Object3D(), []);
  const rainDummy = useMemo(() => new Object3D(), []);
  const groundDummy = useMemo(() => new Object3D(), []);
  const currentLabelRef = useRef("");

  const config = useMemo(() => {
    if (theme === "spring") return { rain: 112, primary: 88, detail: 58, ground: 112 };
    if (theme === "summer") return { rain: 106, primary: 94, detail: 68, ground: 72 };
    if (theme === "autumn") return { rain: 118, primary: 106, detail: 82, ground: 96 };
    return { rain: 132, primary: 86, detail: 70, ground: 102 };
  }, [theme]);

  useFrame(({ clock }) => {
    const cycle = (clock.elapsedTime * 0.024) % 1;
    const sunI = weatherBand(cycle, 0.06, 0.16);
    const breezeI = weatherBand(cycle, 0.3, 0.2);
    const drizzleI = weatherBand(cycle, 0.58, 0.16);
    const rainI = weatherBand(cycle, 0.84, 0.18);
    const mode: WeatherMode = theme === "winter"
      ? rainI > 0.44 ? "snow" : drizzleI > 0.44 ? "drizzle" : breezeI > 0.44 ? "breeze" : "sun"
      : rainI > 0.44 ? "rain" : drizzleI > 0.44 ? "drizzle" : breezeI > 0.44 ? "breeze" : "sun";
    const label = getWeatherLabel(theme, mode);
    const topHide = smoothstep(0.72, 0.94, progress);
    if (atmosphereRef.current) {
      atmosphereRef.current.position.y = -topHide * 2.4;
      atmosphereRef.current.visible = topHide < 0.985;
    }

    if (label !== currentLabelRef.current) {
      currentLabelRef.current = label;
      onWeatherChange?.(label);
    }

    if (sunGlowRef.current) {
      sunGlowRef.current.position.set(side * 0.22, side * 0.88, -side * 0.18);
      sunGlowRef.current.rotation.z = clock.elapsedTime * 0.03;
      sunGlowRef.current.scale.setScalar(1 + (sunI + breezeI * 0.24) * 0.22);
      sunGlowRef.current.visible = sunI > 0.02 || breezeI > 0.06;
      sunGlowRef.current.children.forEach((child, index) => {
        const material = (child as any).material as MeshBasicMaterial | undefined;
        if (material) {
          material.opacity = index === 0 ? 0.14 + sunI * 0.22 : 0.09 + (sunI + breezeI * 0.32) * 0.14;
        }
      });
    }

    if (rainRef.current) {
      for (let i = 0; i < config.rain; i += 1) {
        const seed = i + 51;
        const fallSpeed = theme === "winter" ? 0.62 + hash(seed, 1) * 0.3 : 1.28 + hash(seed, 1) * 0.8;
        const loop = ((clock.elapsedTime * fallSpeed) + hash(seed, 2) * 10) % 10;
        const wind = theme === "winter"
          ? Math.sin(clock.elapsedTime * 0.35 + seed * 0.4) * (0.16 + breezeI * 0.2)
          : Math.sin(clock.elapsedTime * 0.18 + seed * 0.2) * (0.04 + breezeI * 0.06);
        const x = (hash(seed, 3) - 0.5) * side * 1.12 + wind;
        const z = (hash(seed, 4) - 0.5) * side * 1.08 + Math.cos(clock.elapsedTime * 0.14 + seed) * 0.04;
        const y = 7.2 - loop;
        if (theme === "winter") {
          const s = 0.07 + hash(seed, 5) * 0.04;
          setInstance(
            rainRef.current,
            i,
            rainDummy,
            x,
            y,
            z,
            s,
            s,
            s,
            clock.elapsedTime * 0.36 + seed,
            clock.elapsedTime * 0.22,
            clock.elapsedTime * 0.41,
          );
        } else {
          const h = 0.26 + hash(seed, 6) * 0.16 + rainI * 0.06;
          setInstance(
            rainRef.current,
            i,
            rainDummy,
            x,
            y,
            z,
            0.02,
            h,
            0.02,
            0.14,
            0.4,
            0,
          );
        }
      }
      rainRef.current.count = config.rain;
      rainRef.current.instanceMatrix.needsUpdate = true;
    }

    const updateFloatingLayer = (
      mesh: InstancedMesh | null,
      dummy: Object3D,
      count: number,
      offset: number,
      multiplier: number,
    ) => {
      if (!mesh) return;
      for (let i = 0; i < count; i += 1) {
        const seed = i + offset;
        const fallMultiplier = theme === "spring" ? 0.72 : 1;
        const drift = ((clock.elapsedTime * (0.4 + hash(seed, 1) * 0.22) * multiplier * fallMultiplier) + hash(seed, 2) * 8) % 8;
        const windBoost = theme === "spring" ? 0.2 : 0;
        const wind = Math.sin(clock.elapsedTime * (0.5 + hash(seed, 3) * 0.2) + seed) * (0.18 + windBoost + breezeI * (theme === "spring" ? 0.92 : 0.72));
        const swirl = Math.cos(clock.elapsedTime * (0.44 + hash(seed, 4) * 0.18) + seed) * (theme === "spring" ? 0.28 + breezeI * 0.22 : 0.1 + breezeI * 0.2);
        const x = (hash(seed, 5) - 0.5) * side * 0.98 + wind;
        const y = 6.1 - drift + Math.sin(clock.elapsedTime * 0.9 + seed) * 0.06;
        const z = (hash(seed, 6) - 0.5) * side * 0.98 + swirl;
        const rotY = clock.elapsedTime * (0.76 + hash(seed, 7)) + seed;
        const rotZ = Math.sin(clock.elapsedTime * 1.2 + seed) * 0.9;
        let sx = 0.12;
        let sy = 0.028;
        let sz = 0.09;
        if (theme === "spring") {
          sx = 0.17 + hash(seed, 8) * 0.05;
          sy = 0.032 + hash(seed, 9) * 0.015;
          sz = 0.12 + hash(seed, 10) * 0.04;
        } else if (theme === "summer") {
          sx = 0.22 + hash(seed, 8) * 0.06;
          sy = 0.04 + hash(seed, 9) * 0.014;
          sz = 0.14 + hash(seed, 10) * 0.04;
        } else if (theme === "autumn") {
          sx = 0.22 + hash(seed, 8) * 0.065;
          sy = 0.045 + hash(seed, 9) * 0.015;
          sz = 0.16 + hash(seed, 10) * 0.045;
        } else {
          sx = 0.13 + hash(seed, 8) * 0.05;
          sy = 0.13 + hash(seed, 9) * 0.05;
          sz = 0.13 + hash(seed, 10) * 0.05;
        }
        setInstance(mesh, i, dummy, x, y, z, sx, sy, sz, rotY, 0.5, rotZ);
      }
      mesh.count = count;
      mesh.instanceMatrix.needsUpdate = true;
    };

    updateFloatingLayer(leafPrimaryRef.current, primaryDummy, config.primary, 301, 1);
    updateFloatingLayer(leafDetailRef.current, detailDummy, config.detail, 701, 1.18);

    if (groundScatterRef.current) {
      for (let i = 0; i < config.ground; i += 1) {
        const seed = i + 901;
        const radius = Math.sqrt(hash(seed, 1)) * side * 0.38;
        const angle = hash(seed, 2) * Math.PI * 2;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const bob = Math.sin(clock.elapsedTime * 0.3 + seed) * 0.01;
        let sx = 0.16;
        let sy = 0.026;
        let sz = 0.1;
        if (theme === "spring") {
          sx = 0.15 + hash(seed, 3) * 0.05;
          sy = 0.018 + hash(seed, 4) * 0.008;
          sz = 0.08 + hash(seed, 5) * 0.025;
        } else if (theme === "summer") {
          sx = 0.18 + hash(seed, 3) * 0.06;
          sy = 0.022 + hash(seed, 4) * 0.008;
          sz = 0.1 + hash(seed, 5) * 0.03;
        } else if (theme === "autumn") {
          sx = 0.19 + hash(seed, 3) * 0.07;
          sy = 0.028 + hash(seed, 4) * 0.01;
          sz = 0.12 + hash(seed, 5) * 0.035;
        } else {
          sx = 0.09 + hash(seed, 3) * 0.04;
          sy = 0.09 + hash(seed, 4) * 0.04;
          sz = 0.09 + hash(seed, 5) * 0.04;
        }
        setInstance(
          groundScatterRef.current,
          i,
          groundDummy,
          x,
          -0.005 + bob,
          z,
          sx,
          sy,
          sz,
          hash(seed, 6) * Math.PI * 2,
          0,
          hash(seed, 7) * 0.24,
        );
      }
      groundScatterRef.current.count = config.ground;
      groundScatterRef.current.instanceMatrix.needsUpdate = true;
    }

    if (rainMatRef.current) {
      const opacity = theme === "winter"
        ? Math.max(drizzleI * 0.52, rainI * 0.82)
        : Math.max(drizzleI * 0.36, rainI * 0.68);
      rainMatRef.current.opacity = opacity;
      rainMatRef.current.color.set(theme === "winter" ? "#ffffff" : "#d9edf8");
      rainMatRef.current.emissive.set(theme === "winter" ? "#ffffff" : "#b8def6");
      rainMatRef.current.emissiveIntensity = theme === "winter" ? 0.12 : 0.05;
    }

    if (leafPrimaryMatRef.current) {
      const baseOpacity = theme === "summer" ? 0.56 : theme === "winter" ? 0.78 : 0.84;
      leafPrimaryMatRef.current.opacity = baseOpacity + breezeI * 0.16;
      leafPrimaryMatRef.current.color.set(theme === "winter" ? palette.leafFallB : palette.leafFallA);
      leafPrimaryMatRef.current.emissive.set(theme === "winter" ? "#ffffff" : palette.leafFallB);
      leafPrimaryMatRef.current.emissiveIntensity = theme === "winter" ? 0.18 : theme === "spring" ? 0.12 : theme === "autumn" ? 0.1 : 0.08;
    }

    if (leafDetailMatRef.current) {
      const detailOpacity = theme === "summer" ? 0.48 : theme === "winter" ? 0.72 : 0.76;
      leafDetailMatRef.current.opacity = detailOpacity + breezeI * 0.18;
      leafDetailMatRef.current.color.set(theme === "winter" ? "#ffffff" : palette.leafFallB);
      leafDetailMatRef.current.emissive.set(theme === "winter" ? "#ffffff" : palette.leafFallA);
      leafDetailMatRef.current.emissiveIntensity = theme === "winter" ? 0.22 : theme === "spring" ? 0.14 : theme === "autumn" ? 0.12 : 0.1;
    }

    if (groundScatterMatRef.current) {
      groundScatterMatRef.current.opacity = theme === "winter" ? 0.94 : 0.9;
      groundScatterMatRef.current.color.set(theme === "winter" ? palette.leafFallB : palette.leafFallA);
      groundScatterMatRef.current.emissive.set(theme === "winter" ? "#ffffff" : palette.leafFallB);
      groundScatterMatRef.current.emissiveIntensity = theme === "winter" ? 0.12 : theme === "spring" ? 0.08 : 0.06;
    }
  });

  return (
    <group ref={atmosphereRef}>
      <group ref={sunGlowRef}>
        <mesh>
          <sphereGeometry args={[side * 0.11, 20, 20]} />
          <meshBasicMaterial color={palette.accent} transparent opacity={0.2} depthWrite={false} />
        </mesh>
        <mesh scale={1.95}>
          <sphereGeometry args={[side * 0.11, 20, 20]} />
          <meshBasicMaterial color={palette.particle} transparent opacity={0.12} depthWrite={false} />
        </mesh>
      </group>

      <instancedMesh ref={rainRef} args={[undefined, undefined, config.rain]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial ref={rainMatRef} color="#d9edf8" transparent opacity={0} roughness={0.15} metalness={0.02} />
      </instancedMesh>

      <instancedMesh ref={leafPrimaryRef} args={[undefined, undefined, config.primary]}>
        <octahedronGeometry args={[1, 0]} />
        <meshStandardMaterial ref={leafPrimaryMatRef} color={palette.leafFallA} emissive={palette.leafFallB} transparent opacity={0.72} roughness={0.54} />
      </instancedMesh>

      <instancedMesh ref={leafDetailRef} args={[undefined, undefined, config.detail]}>
        <sphereGeometry args={[1, 7, 7]} />
        <meshStandardMaterial ref={leafDetailMatRef} color={palette.leafFallB} emissive={palette.leafFallA} transparent opacity={0.58} roughness={0.5} />
      </instancedMesh>

      <instancedMesh ref={groundScatterRef} args={[undefined, undefined, config.ground]}>
        <octahedronGeometry args={[1, 0]} />
        <meshStandardMaterial ref={groundScatterMatRef} color={palette.leafFallA} emissive={palette.leafFallB} transparent opacity={0.8} roughness={0.62} />
      </instancedMesh>
    </group>
  );
}



function SpringBlossomShower({ side, progress }: { side: number; progress: number }) {
  const groupRef = useRef<Group>(null);
  const petal0Ref = useRef<InstancedMesh>(null);
  const petal1Ref = useRef<InstancedMesh>(null);
  const petal2Ref = useRef<InstancedMesh>(null);
  const petal3Ref = useRef<InstancedMesh>(null);
  const petal4Ref = useRef<InstancedMesh>(null);
  const centerRef = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const count = 52;

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const topHide = smoothstep(0.72, 0.94, progress);
    if (groupRef.current) {
      groupRef.current.position.y = -topHide * 2.2;
      groupRef.current.visible = topHide < 0.985;
    }
    const refs = [petal0Ref.current, petal1Ref.current, petal2Ref.current, petal3Ref.current, petal4Ref.current];

    for (let i = 0; i < count; i += 1) {
      const seed = i + 1701;
      const speed = 0.24 + hash(seed, 1) * 0.13;
      const fall = (t * speed + hash(seed, 2) * 7.5) % 7.5;
      const baseX = (hash(seed, 3) - 0.5) * side * 0.96;
      const baseZ = (hash(seed, 4) - 0.5) * side * 0.94;
      const wind = Math.sin(t * 0.62 + seed * 0.37) * (0.34 + hash(seed, 5) * 0.38);
      const curl = Math.cos(t * 0.48 + seed * 0.21) * (0.16 + hash(seed, 6) * 0.18);
      const cx = baseX + wind;
      const cy = 6.35 - fall + Math.sin(t * 1.12 + seed) * 0.1;
      const cz = baseZ + curl;
      const flowerRotation = t * (0.44 + hash(seed, 7) * 0.35) + seed * 0.4;
      const bloomScale = 1.16 + hash(seed, 8) * 0.58;

      refs.forEach((mesh, petalIndex) => {
        if (!mesh) return;
        const angle = flowerRotation + petalIndex * ((Math.PI * 2) / 5);
        const radius = 0.18 * bloomScale;
        const px = cx + Math.cos(angle) * radius;
        const pz = cz + Math.sin(angle) * radius;
        const flutter = Math.sin(t * 1.7 + seed + petalIndex) * 0.38;
        setInstance(
          mesh,
          i,
          dummy,
          px,
          cy + Math.sin(angle * 2) * 0.018,
          pz,
          0.22 * bloomScale,
          0.064 * bloomScale,
          0.13 * bloomScale,
          angle,
          0.5 + flutter,
          flutter * 0.7,
        );
      });

      setInstance(
        centerRef.current,
        i,
        dummy,
        cx,
        cy,
        cz,
        0.078 * bloomScale,
        0.078 * bloomScale,
        0.078 * bloomScale,
        flowerRotation,
        0,
        0,
      );
    }

    refs.forEach((mesh) => {
      if (!mesh) return;
      mesh.count = count;
      mesh.instanceMatrix.needsUpdate = true;
    });
    if (centerRef.current) {
      centerRef.current.count = count;
      centerRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  const petalColors = ["#fff5fb", "#ffd9ef", "#f8b9de", "#ffe6f5", "#f2a4d2"];
  const refs = [petal0Ref, petal1Ref, petal2Ref, petal3Ref, petal4Ref];

  return (
    <group ref={groupRef}>
      {refs.map((ref, index) => (
        <instancedMesh key={`spring-blossom-petal-${index}`} ref={ref} args={[undefined, undefined, count]}>
          <sphereGeometry args={[1, 8, 6]} />
          <meshStandardMaterial
            color={petalColors[index]}
            emissive={petalColors[index]}
            emissiveIntensity={0.12}
            transparent
            opacity={0.96}
            roughness={0.58}
          />
        </instancedMesh>
      ))}
      <instancedMesh ref={centerRef} args={[undefined, undefined, count]}>
        <sphereGeometry args={[1, 8, 8]} />
        <meshStandardMaterial color="#f7da72" emissive="#fff0a8" emissiveIntensity={0.12} roughness={0.54} />
      </instancedMesh>
    </group>
  );
}

function SeasonalScenery({ theme, side, progress }: { theme: VisualProfile["theme"]; side: number; progress: number }) {
  const palette = PALETTES[theme];
  const decorGroupRef = useRef<Group>(null);

  const edge = side * 0.44;
  const flowerZones = [
    [-edge * 0.88, -edge * 0.68],
    [edge * 0.82, -edge * 0.62],
    [-edge * 0.94, edge * 0.08],
    [edge * 0.92, edge * 0.14],
    [-edge * 0.24, edge * 0.94],
    [edge * 0.22, edge * 0.92],
    [0, -edge * 0.96],
  ] as const;
  const summerLogs = [
    [-edge * 0.92, -edge * 0.58, 0.92],
    [edge * 0.9, -edge * 0.66, -0.54],
    [-edge * 0.96, edge * 0.06, 0.28],
    [edge * 0.96, edge * 0.18, -0.88],
    [-edge * 0.24, edge * 0.96, 0.62],
    [edge * 0.18, edge * 0.92, -0.22],
  ] as const;
  const autumnLeafZones = [
    [-edge * 0.9, -edge * 0.6],
    [edge * 0.82, -edge * 0.64],
    [-edge * 0.9, edge * 0.06],
    [edge * 0.88, edge * 0.14],
    [-edge * 0.2, edge * 0.9],
  ] as const;
  const autumnPumpkins = [
    [-edge * 0.84, -edge * 0.28],
    [edge * 0.86, -edge * 0.3],
    [-edge * 0.8, edge * 0.36],
    [edge * 0.88, edge * 0.42],
    [-edge * 0.36, edge * 0.94],
    [edge * 0.18, edge * 0.92],
    [edge * 0.06, -edge * 0.98],
  ] as const;
  const winterSnowmen = [
    [-edge * 0.9, -edge * 0.56],
    [edge * 0.88, -edge * 0.6],
    [-edge * 0.92, edge * 0.12],
    [edge * 0.92, edge * 0.16],
    [-edge * 0.34, edge * 0.94],
    [edge * 0.22, edge * 0.92],
    [-edge * 0.12, -edge * 0.98],
    [edge * 0.44, -edge * 0.94],
  ] as const;
  const scarfColors = ["#d84e4e", "#48a965", "#e3c34a", "#8d5fd3"];

  useFrame(() => {
    if (!decorGroupRef.current) return;
    const hide = smoothstep(0.7, 0.93, progress);
    decorGroupRef.current.position.y = -hide * 2.6;
    decorGroupRef.current.visible = hide < 0.985;
  });

  const FlowerPatch = ({ x, z, scale = 1 }: { x: number; z: number; scale?: number }) => (
    <group position={[x, 0.028, z]} rotation={[0, (Math.abs(x * 0.02 + z * 0.01)) % Math.PI, 0]}>
      {Array.from({ length: 18 }).map((_, index) => {
        const seed = index + x * 0.13 + z * 0.09;
        const px = Math.sin(seed * 2.1) * 1.02 * scale;
        const pz = Math.cos(seed * 1.7) * 0.82 * scale;
        const petalColor = index % 3 === 0 ? "#ffd9ef" : index % 3 === 1 ? "#f3a0cf" : "#fff1f8";
        return (
          <group key={`flower-${index}`} position={[px, (index % 2) * 0.015, pz]}>
            <mesh position={[0, 0.06, 0]} castShadow>
              <boxGeometry args={[0.024, 0.14, 0.024]} />
              <meshStandardMaterial color="#7ba857" roughness={0.78} />
            </mesh>
            <mesh position={[0, 0.12, 0]} castShadow>
              <sphereGeometry args={[0.046, 10, 10]} />
              <meshStandardMaterial color="#f5d768" roughness={0.7} emissive="#fff3b1" emissiveIntensity={0.04} />
            </mesh>
            {Array.from({ length: 5 }).map((_, petalIndex) => {
              const petalAngle = petalIndex * ((Math.PI * 2) / 5);
              return (
                <mesh
                  key={`petal-${petalIndex}`}
                  position={[Math.cos(petalAngle) * 0.068, 0.13, Math.sin(petalAngle) * 0.068]}
                  rotation={[0.18, -petalAngle, Math.sin(petalAngle) * 0.18]}
                  scale={[1.55, 0.56, 0.9]}
                  castShadow
                >
                  <sphereGeometry args={[0.052, 10, 8]} />
                  <meshStandardMaterial color={petalColor} roughness={0.58} emissive={petalColor} emissiveIntensity={0.07} />
                </mesh>
              );
            })}
          </group>
        );
      })}
    </group>
  );

  const LeafPatch = ({ x, z, colorA, colorB, scale = 1 }: { x: number; z: number; colorA: string; colorB: string; scale?: number }) => (
    <group position={[x, 0.024, z]} rotation={[0, Math.abs(x + z) * 0.12, 0]}>
      {Array.from({ length: 10 }).map((_, index) => {
        const seed = index + x * 0.4 + z * 0.5;
        const px = Math.sin(seed * 1.9) * 0.88 * scale;
        const pz = Math.cos(seed * 1.3) * 0.62 * scale;
        const rot = (seed * 0.47) % Math.PI;
        const c = index % 2 === 0 ? colorA : colorB;
        return (
          <mesh key={`leaf-${index}`} position={[px, (index % 3) * 0.01, pz]} rotation={[-Math.PI / 2, 0, rot]} castShadow>
            <boxGeometry args={[0.28 * scale, 0.024, 0.14 * scale]} />
            <meshStandardMaterial color={c} emissive={c} emissiveIntensity={0.03} roughness={0.72} />
          </mesh>
        );
      })}
    </group>
  );

  const LogProp = ({ x, z, rot = 0 }: { x: number; z: number; rot?: number }) => (
    <group position={[x, 0.12, z]} rotation={[0, rot, Math.PI / 2.65]}>
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[0.22, 0.28, 1.86, 12]} />
        <meshStandardMaterial color={palette.trunk} roughness={0.82} />
      </mesh>
      <mesh position={[0.52, 0.03, 0.12]} rotation={[0.2, 0.08, 0.5]} castShadow>
        <boxGeometry args={[0.4, 0.22, 0.18]} />
        <meshStandardMaterial color={palette.trunkLight} roughness={0.82} />
      </mesh>
      <mesh position={[-0.44, -0.02, -0.1]} rotation={[-0.1, 0.14, -0.38]} castShadow>
        <boxGeometry args={[0.28, 0.18, 0.14]} />
        <meshStandardMaterial color={palette.trunkLight} roughness={0.82} />
      </mesh>
    </group>
  );

  const Pumpkin = ({ x, z, scale = 1 }: { x: number; z: number; scale?: number }) => (
    <group position={[x, 0.13, z]} scale={scale}>
      <mesh castShadow receiveShadow>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshStandardMaterial color="#ea8535" roughness={0.78} />
      </mesh>
      <mesh position={[0, 0.02, 0]} scale={[1.24, 0.92, 1.24]} castShadow receiveShadow>
        <sphereGeometry args={[0.24, 14, 14]} />
        <meshStandardMaterial color="#f39a43" roughness={0.74} />
      </mesh>
      <mesh position={[0, 0.32, 0]} castShadow>
        <boxGeometry args={[0.09, 0.18, 0.09]} />
        <meshStandardMaterial color="#5c7840" roughness={0.84} />
      </mesh>
    </group>
  );

  const Snowman = ({ x, z, scarfColor }: { x: number; z: number; scarfColor: string }) => (
    <group position={[x, 0.12, z]}>
      <mesh position={[0, 0.18, 0]} castShadow receiveShadow><sphereGeometry args={[0.22,16,16]} /><meshStandardMaterial color="#fff" roughness={0.9} /></mesh>
      <mesh position={[0, 0.5, 0]} castShadow receiveShadow><sphereGeometry args={[0.17,16,16]} /><meshStandardMaterial color="#fefefe" roughness={0.9} /></mesh>
      <mesh position={[0, 0.75, 0]} castShadow receiveShadow><sphereGeometry args={[0.12,16,16]} /><meshStandardMaterial color="#fff" roughness={0.9} /></mesh>
      <mesh position={[0,0.92,0]} castShadow><cylinderGeometry args={[0.11,0.11,0.2,16]} /><meshStandardMaterial color="#111" roughness={0.72} /></mesh>
      <mesh position={[0,0.82,0]} castShadow><cylinderGeometry args={[0.18,0.18,0.04,18]} /><meshStandardMaterial color="#111" roughness={0.72} /></mesh>
      <mesh position={[0,0.5,0.14]} castShadow><boxGeometry args={[0.3,0.07,0.07]} /><meshStandardMaterial color={scarfColor} roughness={0.66} /></mesh>
      <mesh position={[0.12,0.37,0.14]} rotation={[0,0,-0.35]} castShadow><boxGeometry args={[0.06,0.22,0.05]} /><meshStandardMaterial color={scarfColor} roughness={0.66} /></mesh>
    </group>
  );

  return (
    <group ref={decorGroupRef}>
      {theme === "spring" && <group>{flowerZones.map(([x,z],i)=><FlowerPatch key={`spring-${i}`} x={x} z={z} scale={1+(i%3)*0.12} />)}</group>}
      {theme === "summer" && <group>{summerLogs.map(([x,z,rot],i)=><LogProp key={`summer-${i}`} x={x} z={z} rot={rot} />)}</group>}
      {theme === "autumn" && <group>
        {autumnLeafZones.map(([x,z],i)=><LeafPatch key={`autumn-leaf-${i}`} x={x} z={z} colorA="#ef9d54" colorB="#c95a5c" scale={0.92+(i%2)*0.18} />)}
        {autumnPumpkins.map(([x,z],i)=><Pumpkin key={`pumpkin-${i}`} x={x} z={z} scale={1.08+(i%3)*0.12} />)}
      </group>}
      {theme === "winter" && <group>{winterSnowmen.map(([x,z],i)=><Snowman key={`snowman-${i}`} x={x} z={z} scarfColor={scarfColors[i%scarfColors.length]} />)}</group>}
    </group>
  );
}

function HeroTree({ theme }: { theme: VisualProfile["theme"] }) {
  const groupRef = useRef<Group>(null);
  const palette = PALETTES[theme];
  const variant = getVariantsForTheme(theme)[0];
  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y = Math.sin(clock.elapsedTime * 0.18) * 0.1 + 0.66;
    groupRef.current.rotation.z = Math.sin(clock.elapsedTime * 0.72) * 0.012;
    groupRef.current.position.y = Math.sin(clock.elapsedTime * 0.75) * 0.06;
  });

  return (
    <group ref={groupRef} position={[0, 0.18, 0]}>
      <mesh position={[0, -1.05, 0]} castShadow receiveShadow>
        <boxGeometry args={[6.2, 1.36, 6.2]} />
        <meshStandardMaterial color={palette.soilDeep} roughness={0.96} />
      </mesh>
      <mesh position={[0, -0.26, 0]} castShadow receiveShadow>
        <boxGeometry args={[5.92, 0.22, 5.92]} />
        <meshStandardMaterial color={palette.ground} roughness={0.92} />
      </mesh>
      {TRUNK_PARTS.map((part, index) => (
        <mesh
          key={`hero-trunk-${index}`}
          position={[part.x * 1.46, part.y * 2.06, part.z * 1.46]}
          rotation={[0, part.rot ?? 0, 0]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[part.sx * 3.8, part.sy * 4.1, part.sz * 3.8]} />
          <meshStandardMaterial color={index < 3 ? palette.trunk : palette.trunkLight} roughness={0.88} />
        </mesh>
      ))}
      {[...variant.dark, ...variant.mid, ...variant.main, ...variant.light].map((part, index) => {
        const totalDark = variant.dark.length;
        const totalMid = totalDark + variant.mid.length;
        const totalMain = totalMid + variant.main.length;
        const color = index < totalDark ? palette.leafDark : index < totalMid ? palette.leafMid : index < totalMain ? palette.leafMain : palette.leafLight;
        return (
          <mesh
            key={`hero-leaf-${index}`}
            position={[part.x * 2.15 * variant.heroScale, part.y * 1.62 * variant.heroScale, part.z * 2.15 * variant.heroScale]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[part.sx * 3.35, part.sy * 3.35, part.sz * 3.35]} />
            <meshStandardMaterial color={color} roughness={0.82} />
          </mesh>
        );
      })}
    </group>
  );
}

function QRForestWorld({ matrix, progress, theme, animationSpeed = 1, onWeatherChange }: QRForest3DProps) {
  const palette = PALETTES[theme];
  const cells = useMemo(() => makeCells(matrix), [matrix]);
  const variantPool = useMemo(() => getVariantsForTheme(theme), [theme]);
  const counts = useMemo(() => {
    let dark = 0;
    let mid = 0;
    let main = 0;
    let light = 0;
    for (const cell of cells) {
      const variant = variantPool[cell.variantIndex % variantPool.length];
      dark += variant.dark.length;
      mid += variant.mid.length;
      main += variant.main.length;
      light += variant.light.length;
    }
    return { trunk: cells.length * TRUNK_PARTS.length, dark, mid, main, light };
  }, [cells, variantPool]);

  const n = matrix.length || 21;
  const quiet = 4;
  const side = n + quiet * 2;
  const center = (n - 1) / 2;

  const worldRef = useRef<Group>(null);
  const trunksRef = useRef<InstancedMesh>(null);
  const leavesDarkRef = useRef<InstancedMesh>(null);
  const leavesMidRef = useRef<InstancedMesh>(null);
  const leavesMainRef = useRef<InstancedMesh>(null);
  const leavesLightRef = useRef<InstancedMesh>(null);
  const tilesRef = useRef<InstancedMesh>(null);
  const trunkMaterialRef = useRef<MeshStandardMaterial>(null);
  const leafDarkMaterialRef = useRef<MeshStandardMaterial>(null);
  const leafMidMaterialRef = useRef<MeshStandardMaterial>(null);
  const leafMainMaterialRef = useRef<MeshStandardMaterial>(null);
  const leafLightMaterialRef = useRef<MeshStandardMaterial>(null);
  const tileMaterialRef = useRef<MeshBasicMaterial>(null);
  const surfaceMaterialRef = useRef<MeshStandardMaterial>(null);
  const sideMaterialRef = useRef<MeshStandardMaterial>(null);
  const soilMaterialRef = useRef<MeshStandardMaterial>(null);
  const birthAtRef = useRef(0);

  const dummy = useMemo(() => new Object3D(), []);
  const groundColor = useMemo(() => new Color(), []);
  const paperColor = useMemo(() => new Color(), []);
  const mixedGround = useMemo(() => new Color(), []);
  const initialPalette = useRef(palette).current;
  const targetTrunk = useMemo(() => new Color(palette.trunk), [palette.trunk]);
  const targetLeafDark = useMemo(() => new Color(palette.leafDark), [palette.leafDark]);
  const targetLeafMid = useMemo(() => new Color(palette.leafMid), [palette.leafMid]);
  const targetLeafMain = useMemo(() => new Color(palette.leafMain), [palette.leafMain]);
  const targetLeafLight = useMemo(() => new Color(palette.leafLight), [palette.leafLight]);
  const targetInk = useMemo(() => new Color(palette.ink), [palette.ink]);
  const targetSide = useMemo(() => new Color(palette.groundSide), [palette.groundSide]);
  const targetSoil = useMemo(() => new Color(palette.soilDeep), [palette.soilDeep]);

  useEffect(() => {
    birthAtRef.current = performance.now() / 1000;
  }, [matrix]);

  useFrame(({ clock }) => {
    const morph = smoother(progress);
    const moduleReveal = smoothstep(0.46, 0.88, morph);
    const qrLock = smoothstep(0.82, 0.99, morph);
    const organic = 1 - smoothstep(0.2, 0.72, morph);
    const leafFade = 1 - smoothstep(0.93, 0.996, morph);
    const trunkFade = 1 - smoothstep(0.56, 0.82, morph);
    const now = performance.now() / 1000;
    const sinceBirth = Math.max(0, now - birthAtRef.current) * Math.max(0.45, animationSpeed);

    if (worldRef.current) {
      worldRef.current.position.y = Math.sin(clock.elapsedTime * 0.48) * 0.08 * (1 - smoothstep(0.32, 0.8, morph));
      worldRef.current.rotation.y = Math.sin(clock.elapsedTime * 0.08) * 0.03 * (1 - morph);
    }

    const updateLeafLayer = (
      mesh: InstancedMesh | null,
      material: MeshStandardMaterial | null,
      layerName: keyof Pick<TreeVariant, "dark" | "mid" | "main" | "light">,
      layerOffset: number,
      scaleBias: number,
      colorTarget: Color,
    ) => {
      if (!mesh) return;
      let instanceIndex = 0;
      for (let i = 0; i < cells.length; i += 1) {
        const cell = cells[i];
        const variant = variantPool[cell.variantIndex % variantPool.length];
        const parts = variant[layerName];
        const grow = smoother(clamp01((sinceBirth - cell.delay) / 0.82));
        const baseX = cell.col - center + cell.jitterX * organic;
        const baseZ = cell.row - center + cell.jitterZ * organic;
        const swayX = Math.sin(clock.elapsedTime * 1.16 + cell.seed * 0.57) * 0.05 * (1 - moduleReveal);
        const swayZ = Math.cos(clock.elapsedTime * 0.94 + cell.seed * 0.39) * 0.036 * (1 - moduleReveal);
        const density = cell.crown * variant.crownScale * cell.sizeBoost * grow;
        const trunkHeight = cell.height * variant.heightScale;
        for (let j = 0; j < parts.length; j += 1) {
          const part = parts[j];
          const top = moduleTarget(j, parts.length);
          const forestX = baseX + part.x * density + swayX;
          const forestY = part.y * trunkHeight * grow;
          const forestZ = baseZ + part.z * density + swayZ;
          const targetX = cell.col - center + top.x;
          const targetY = top.y + layerOffset;
          const targetZ = cell.row - center + top.z;
          const x = lerp(forestX, targetX, moduleReveal);
          const y = lerp(forestY, targetY, moduleReveal);
          const z = lerp(forestZ, targetZ, moduleReveal);
          const boxScale = lerp(part.sx * density * 1.2, top.scale * scaleBias, moduleReveal) * leafFade;
          const heightScale = lerp(part.sy * density * 1.14, top.scale * 0.82 * scaleBias, moduleReveal) * leafFade;
          setInstance(mesh, instanceIndex, dummy, x, y, z, boxScale, heightScale, boxScale, 0);
          instanceIndex += 1;
        }
      }
      mesh.count = Math.max(0, instanceIndex);
      mesh.instanceMatrix.needsUpdate = true;
      if (material) {
        material.opacity = leafFade;
        material.color.lerp(colorTarget, 0.07);
      }
    };

    if (trunksRef.current) {
      let trunkIndex = 0;
      for (let i = 0; i < cells.length; i += 1) {
        const cell = cells[i];
        const variant = variantPool[cell.variantIndex % variantPool.length];
        const grow = smoother(clamp01((sinceBirth - cell.delay) / 0.8));
        const baseX = cell.col - center + cell.jitterX * organic;
        const baseZ = cell.row - center + cell.jitterZ * organic;
        const heightScale = cell.height * variant.heightScale * cell.sizeBoost;
        const spread = cell.crown * variant.crownScale * cell.sizeBoost * organic;
        for (let j = 0; j < TRUNK_PARTS.length; j += 1) {
          const part = TRUNK_PARTS[j];
          const width = part.sx * grow * trunkFade;
          const height = part.sy * heightScale * grow * trunkFade;
          setInstance(
            trunksRef.current,
            trunkIndex,
            dummy,
            baseX + part.x * spread,
            part.y * heightScale * grow * trunkFade,
            baseZ + part.z * spread,
            width,
            Math.max(0.001, height),
            part.sz * grow * trunkFade,
            part.rot ?? 0,
          );
          trunkIndex += 1;
        }
      }
      trunksRef.current.count = Math.max(0, trunkIndex);
      trunksRef.current.instanceMatrix.needsUpdate = true;
    }

    updateLeafLayer(leavesDarkRef.current, leafDarkMaterialRef.current, "dark", 0.0, 1.04, targetLeafDark);
    updateLeafLayer(leavesMidRef.current, leafMidMaterialRef.current, "mid", 0.02, 1.02, targetLeafMid);
    updateLeafLayer(leavesMainRef.current, leafMainMaterialRef.current, "main", 0.04, 1.0, targetLeafMain);
    updateLeafLayer(leavesLightRef.current, leafLightMaterialRef.current, "light", 0.06, 0.96, targetLeafLight);

    if (tilesRef.current) {
      for (let i = 0; i < cells.length; i += 1) {
        const cell = cells[i];
        const tileSize = lerp(0.16, 1.02, qrLock);
        setInstance(
          tilesRef.current,
          i,
          dummy,
          cell.col - center,
          0.1,
          cell.row - center,
          tileSize,
          lerp(0.08, 0.18, qrLock),
          tileSize,
          0,
        );
      }
      tilesRef.current.count = Math.max(0, cells.length);
      tilesRef.current.instanceMatrix.needsUpdate = true;
    }

    if (trunkMaterialRef.current) {
      trunkMaterialRef.current.opacity = trunkFade;
      trunkMaterialRef.current.color.lerp(targetTrunk, 0.07);
    }
    if (tileMaterialRef.current) {
      tileMaterialRef.current.opacity = qrLock;
      tileMaterialRef.current.color.lerp(targetInk, 0.1);
    }
    if (sideMaterialRef.current) sideMaterialRef.current.color.lerp(targetSide, 0.07);
    if (soilMaterialRef.current) soilMaterialRef.current.color.lerp(targetSoil, 0.07);
    if (surfaceMaterialRef.current) {
      groundColor.set(palette.ground);
      paperColor.set(palette.paper);
      mixedGround.copy(groundColor).lerp(paperColor, smoothstep(0.6, 0.96, morph));
      surfaceMaterialRef.current.color.lerp(mixedGround, 0.1);
      surfaceMaterialRef.current.roughness = lerp(0.95, 0.84, morph);
    }
  });

  return (
    <>
      <CameraRig progress={progress} side={side} />
      <color attach="background" args={[palette.sky]} />
      <ambientLight intensity={0.88} />
      <hemisphereLight args={[palette.sky, palette.groundSide, 1.22]} />
      <directionalLight
        position={[side * 0.52, side * 1.26, side * 0.42]}
        intensity={1.95}
        color="#fff8fe"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={1}
        shadow-camera-far={side * 4}
        shadow-camera-left={-side}
        shadow-camera-right={side}
        shadow-camera-top={side}
        shadow-camera-bottom={-side}
      />
      <directionalLight position={[-side * 0.65, side * 0.42, -side * 0.55]} intensity={0.5} color={palette.accent} />

      <group ref={worldRef}>
        <mesh position={[0, -1.5, 0]} receiveShadow castShadow>
          <boxGeometry args={[side * 0.96, 2.06, side * 0.96]} />
          <meshStandardMaterial ref={soilMaterialRef} color={initialPalette.soilDeep} roughness={0.96} />
        </mesh>
        <mesh position={[0, -0.45, 0]} receiveShadow castShadow>
          <boxGeometry args={[side, 0.3, side]} />
          <meshStandardMaterial ref={sideMaterialRef} color={initialPalette.groundSide} roughness={0.9} />
        </mesh>
        <mesh position={[0, -0.1, 0]} receiveShadow castShadow>
          <boxGeometry args={[side - 0.12, 0.18, side - 0.12]} />
          <meshStandardMaterial ref={surfaceMaterialRef} color={initialPalette.ground} roughness={0.92} />
        </mesh>
        <SeasonalScenery theme={theme} side={side} progress={progress} />

        {matrix.length === 0 ? (
          <HeroTree theme={theme} />
        ) : (
          <>
            <instancedMesh ref={trunksRef} args={[undefined, undefined, Math.max(1, counts.trunk)]} castShadow receiveShadow>
              <boxGeometry args={[1, 1, 1]} />
              <meshStandardMaterial ref={trunkMaterialRef} color={initialPalette.trunk} roughness={0.88} transparent />
            </instancedMesh>
            <instancedMesh ref={leavesDarkRef} args={[undefined, undefined, Math.max(1, counts.dark)]} castShadow receiveShadow>
              <boxGeometry args={[1, 1, 1]} />
              <meshStandardMaterial ref={leafDarkMaterialRef} color={initialPalette.leafDark} roughness={0.82} transparent />
            </instancedMesh>
            <instancedMesh ref={leavesMidRef} args={[undefined, undefined, Math.max(1, counts.mid)]} castShadow receiveShadow>
              <boxGeometry args={[1, 1, 1]} />
              <meshStandardMaterial ref={leafMidMaterialRef} color={initialPalette.leafMid} roughness={0.8} transparent />
            </instancedMesh>
            <instancedMesh ref={leavesMainRef} args={[undefined, undefined, Math.max(1, counts.main)]} castShadow receiveShadow>
              <boxGeometry args={[1, 1, 1]} />
              <meshStandardMaterial ref={leafMainMaterialRef} color={initialPalette.leafMain} roughness={0.78} transparent />
            </instancedMesh>
            <instancedMesh ref={leavesLightRef} args={[undefined, undefined, Math.max(1, counts.light)]} castShadow receiveShadow>
              <boxGeometry args={[1, 1, 1]} />
              <meshStandardMaterial ref={leafLightMaterialRef} color={initialPalette.leafLight} roughness={0.76} transparent />
            </instancedMesh>
            <instancedMesh ref={tilesRef} args={[undefined, undefined, Math.max(1, cells.length)]} castShadow receiveShadow>
              <boxGeometry args={[1, 1, 1]} />
              <meshBasicMaterial ref={tileMaterialRef} color={initialPalette.ink} transparent opacity={0} />
            </instancedMesh>
          </>
        )}

        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.5, 0]}>
          <circleGeometry args={[side * 0.74, 64]} />
          <meshBasicMaterial color="#36536c" transparent opacity={0.1} depthWrite={false} />
        </mesh>
      </group>

      <SeasonalAtmosphere theme={theme} side={side} progress={progress} onWeatherChange={onWeatherChange} />
      {theme === "spring" && <SpringBlossomShower side={side} progress={progress} />}
    </>
  );
}

export function QRForest3D({ matrix, progress, theme, animationSpeed = 1, onWeatherChange }: QRForest3DProps) {
  return (
    <Canvas
      className="forest3DCanvas"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      dpr={[1, 1.45]}
      shadows
      camera={{ position: [24, 22, 24], fov: 35, near: 0.1, far: 500 }}
      gl={{ antialias: true, alpha: false, powerPreference: "high-performance", preserveDrawingBuffer: true }}
    >
      <QRForestWorld matrix={matrix} progress={progress} theme={theme} animationSpeed={animationSpeed} onWeatherChange={onWeatherChange} />
    </Canvas>
  );
}
