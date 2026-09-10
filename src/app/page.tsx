"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { QRMatrixCanvas } from "@/components/qr/qr-matrix-canvas";
import { QRForest3D } from "@/components/visual/qr-forest-3d";
import { createSharedGardenPayload, makeShareUrl } from "@/features/share/share-payload";
import { createSceneGif, downloadGif, downloadScenePng, downloadVideoResult, getSceneCanvas, recordSceneVideo } from "@/features/export/export-garden";
import { useQRSlot } from "@/hooks/use-qr-slot";
import type { QRMatrix, VisualProfile } from "@/models/qr-slot";

const THEMES: Array<{
  value: VisualProfile["theme"];
  label: string;
  dot: string;
  glyph: string;
}> = [
  { value: "spring", label: "Primavera", dot: "#f39ad5", glyph: "✿" },
  { value: "summer", label: "Verano", dot: "#71d46b", glyph: "❋" },
  { value: "autumn", label: "Otoño", dot: "#ff9a3d", glyph: "✦" },
  { value: "winter", label: "Invierno", dot: "#dff4ff", glyph: "❄" },
];

const ACCEPTED_FILES = ".png,.jpg,.jpeg,.webp,.svg,.bmp,.eps,image/png,image/jpeg,image/webp,image/svg+xml,image/bmp";
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";
const DEMO_URL = "https://luics415.github.io/QRVoxelStudio/";
const DEMO_FILE_NAME = "qr-voxel-studio-demo.png";
const DEMO_FILE_META = "PNG - ejemplo";
const DEMO_MATRIX: QRMatrix = [[1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 0, 0, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1], [1, 0, 0, 0, 0, 0, 1, 0, 1, 1, 1, 1, 0, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1], [1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 0, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1], [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 1, 0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1], [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 1, 1, 0, 0, 1, 0, 0, 1, 1, 1, 0, 0, 1, 0, 1, 1, 1, 0, 1], [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 1, 0, 0, 1, 1, 0, 1, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1], [1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1], [0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 1, 1, 1, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 1, 1, 1], [1, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 1, 1, 0, 0, 1], [1, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0], [0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 1, 0, 1, 1, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1, 0], [0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 1, 1], [0, 1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 0, 0, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 0, 1, 1, 0, 1, 1], [1, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0], [1, 1, 1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 1, 1, 0, 1, 1, 0, 0, 1], [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 1], [1, 1, 0, 0, 1, 1, 0, 1, 0, 0, 1, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 0, 1, 1], [1, 0, 0, 1, 1, 1, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 1, 0, 1, 0, 0, 0], [1, 0, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 1, 1, 0, 1, 0, 0, 1], [1, 0, 1, 1, 1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 0, 1, 0, 1, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 1, 1, 0, 1, 1], [1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 0, 1, 1, 0, 1, 0, 1, 0, 0, 0, 0], [1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 1, 1, 0, 0, 1, 0, 1, 0, 1, 1, 1, 0, 0, 0, 1, 1, 0, 0, 1], [1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0], [1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 0, 0, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0, 0], [1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0], [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 1, 0, 0, 1, 0], [1, 1, 1, 1, 1, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 1, 0, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 0, 0]];
const DEMO_ACTIVE_MODULES = 423;

function formatFileSize(size?: number) {
  if (!size) return "0 KB";
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

function IconBase({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {children}
    </svg>
  );
}

function UploadIcon() {
  return (
    <IconBase>
      <path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M5 14.5v3A2.5 2.5 0 0 0 7.5 20h9a2.5 2.5 0 0 0 2.5-2.5v-3" />
    </IconBase>
  );
}

function PlayIcon() {
  return (
    <IconBase>
      <path d="M8.5 6.5v11l9-5.5-9-5.5Z" />
    </IconBase>
  );
}

function LinkIcon() {
  return (
    <IconBase>
      <path d="M10 13.8 8.1 15.7a3.1 3.1 0 1 1-4.3-4.4l3.1-3.1a3.1 3.1 0 0 1 4.4 0" />
      <path d="M14 10.2 15.9 8.3a3.1 3.1 0 1 1 4.3 4.4l-3.1 3.1a3.1 3.1 0 0 1-4.4 0" />
      <path d="m9.2 14.8 5.6-5.6" />
    </IconBase>
  );
}

function DownloadIcon() {
  return (
    <IconBase>
      <path d="M12 4v10" />
      <path d="m8 10.5 4 4 4-4" />
      <path d="M5 18.5h14" />
    </IconBase>
  );
}

function GifIcon() {
  return (
    <IconBase>
      <rect x="4.2" y="4.2" width="15.6" height="15.6" rx="3" />
      <path d="M9 12h2.8v2.8H9zM8 8.2h8M8 15.8h8" />
    </IconBase>
  );
}

function ImageIcon() {
  return (
    <IconBase>
      <rect x="4" y="5" width="16" height="14" rx="2.4" />
      <circle cx="9" cy="10" r="1.5" />
      <path d="m7 17 3.4-3.6 2.8 2.4 3.4-4 3.4 5.2" />
    </IconBase>
  );
}

function CodeIcon() {
  return (
    <IconBase>
      <path d="m8.5 8.2-4 3.8 4 3.8M15.5 8.2l4 3.8-4 3.8M13 6.8 11 17.2" />
    </IconBase>
  );
}

function GridIcon() {
  return (
    <IconBase>
      <path d="M5 5h4v4H5zM10 5h4v4h-4zM15 5h4v4h-4zM5 10h4v4H5zM10 10h4v4h-4zM15 10h4v4h-4zM5 15h4v4H5zM10 15h4v4h-4zM15 15h4v4h-4z" />
    </IconBase>
  );
}

function FileIcon() {
  return (
    <IconBase>
      <path d="M7 4.5h6l4 4V19a1.8 1.8 0 0 1-1.8 1.8H7A1.8 1.8 0 0 1 5.2 19V6.3A1.8 1.8 0 0 1 7 4.5Z" />
      <path d="M13 4.8V9h4.2" />
    </IconBase>
  );
}

function CopyIcon() {
  return (
    <IconBase>
      <rect x="8" y="8" width="10" height="10" rx="2" />
      <path d="M15 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h2" />
    </IconBase>
  );
}

function ChevronIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <IconBase>
      {direction === "left" ? <path d="m14.5 5.5-7 6.5 7 6.5" /> : <path d="m9.5 5.5 7 6.5-7 6.5" />}
    </IconBase>
  );
}

export default function Home() {
  const { slot, replaceQR, updateVisualProfile } = useQRSlot();
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomPanelRef = useRef<HTMLElement>(null);
  const progressRef = useRef(0);
  const timersRef = useRef<number[]>([]);
  const seasonTimersRef = useRef<number[]>([]);
  const progressUiStampRef = useRef(0);
  const compactUiRef = useRef(false);
  const previewVideoUrlRef = useRef("");
  const [targetView, setTargetView] = useState<"forest" | "qr">("forest");
  const [progress, setProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [weatherLabel, setWeatherLabel] = useState("Claro suave");
  const [shareFeedback, setShareFeedback] = useState("");
  const [shareSidebarOpen, setShareSidebarOpen] = useState(false);
  const [welcomeVisible, setWelcomeVisible] = useState(true);
  const [guideVisible, setGuideVisible] = useState(false);
  const [uploadHintPulse, setUploadHintPulse] = useState(false);
  const [exportBusy, setExportBusy] = useState<"video" | "gif" | "image" | null>(null);
  const [seasonTransitioning, setSeasonTransitioning] = useState(false);
  const [seasonTransitionTarget, setSeasonTransitionTarget] = useState<VisualProfile["theme"] | null>(null);
  const [previewVideoUrl, setPreviewVideoUrl] = useState("");
  const [previewVideoBusy, setPreviewVideoBusy] = useState(false);

  const hasActualQR = slot.qrMatrix.length > 0;
  const sceneMatrix = hasActualQR ? slot.qrMatrix : [];
  const displayMatrix = hasActualQR ? slot.qrMatrix : DEMO_MATRIX;
  const activeUiTheme = seasonTransitionTarget ?? slot.visualProfile.theme;
  const activeModules = useMemo(
    () => displayMatrix.reduce((total, row) => total + row.reduce((rowTotal, value) => rowTotal + (value ? 1 : 0), 0), 0),
    [displayMatrix],
  );
  const displayUrl = slot.decodedContent || DEMO_URL;
  const displayFileName = slot.originalFile?.name || DEMO_FILE_NAME;
  const displayFileMeta = slot.originalFile
    ? `${(slot.originalFile.type || "PNG").replace("image/", "").toUpperCase()} - ${formatFileSize(slot.originalFile.size)}`
    : DEMO_FILE_META;

  useEffect(() => {
    if (!welcomeVisible) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [welcomeVisible]);

  useEffect(() => {
    const compactMedia = window.matchMedia("(max-width: 820px), (pointer: coarse)");
    const updateCompactMode = () => {
      compactUiRef.current = compactMedia.matches;
      // On phones/tablets the share panel must never cover the first view.
      // Desktop keeps the expanded sharing panel as part of the workspace.
      setShareSidebarOpen(!compactMedia.matches);
    };
    updateCompactMode();
    compactMedia.addEventListener?.("change", updateCompactMode);
    return () => compactMedia.removeEventListener?.("change", updateCompactMode);
  }, []);

  useEffect(() => {
    const colors: Record<VisualProfile["theme"], string> = {
      neutral: "#B6DDFE",
      spring: "#E8D9F3",
      summer: "#BEE7DC",
      autumn: "#EAD9D2",
      winter: "#D9EAFA",
    };
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    meta?.setAttribute("content", hasActualQR ? colors[activeUiTheme] : "#B6DDFE");
  }, [activeUiTheme, hasActualQR]);

  useEffect(() => {
    let frame = 0;
    let last = performance.now();
    const target = targetView === "qr" ? 1 : 0;

    const tick = (now: number) => {
      const delta = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
      last = now;
      const current = progressRef.current;
      const response = 1 - Math.exp(-delta * 3.65 * Math.max(0.55, slot.visualProfile.animationSpeed));
      const next = current + (target - current) * response;
      const settled = Math.abs(target - next) < 0.0015 ? target : next;
      progressRef.current = settled;
      const minUiFrameMs = compactUiRef.current ? 46 : 30;
      if (settled === target || now - progressUiStampRef.current >= minUiFrameMs) {
        progressUiStampRef.current = now;
        setProgress(settled);
      }
      if (settled !== target) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [targetView, slot.visualProfile.animationSpeed]);

  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => window.clearTimeout(timer));
      seasonTimersRef.current.forEach((timer) => window.clearTimeout(timer));
      if (previewVideoUrlRef.current) URL.revokeObjectURL(previewVideoUrlRef.current);
    };
  }, []);

  const clearShowcaseTimers = () => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current = [];
    seasonTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    seasonTimersRef.current = [];
    setSeasonTransitioning(false);
    setSeasonTransitionTarget(null);
  };


  const clearPreviewVideo = () => {
    if (previewVideoUrlRef.current) {
      URL.revokeObjectURL(previewVideoUrlRef.current);
      previewVideoUrlRef.current = "";
    }
    setPreviewVideoUrl("");
  };


  const revealUploadArea = () => {
    setGuideVisible(false);
    setShareSidebarOpen(false);
    window.setTimeout(() => {
      bottomPanelRef.current?.scrollIntoView({
        behavior: "smooth",
        block: compactUiRef.current ? "start" : "center",
      });
      setUploadHintPulse(true);
      timersRef.current.push(window.setTimeout(() => setUploadHintPulse(false), 4200));
    }, 80);
  };

  const handleEnterGarden = () => {
    setWelcomeVisible(false);
    if (!hasActualQR) {
      window.setTimeout(() => setGuideVisible(true), 180);
    }
  };

  const handleThemeChange = (theme: VisualProfile["theme"]) => {
    if (theme === activeUiTheme) return;
    seasonTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    seasonTimersRef.current = [];
    setSeasonTransitionTarget(theme);
    setSeasonTransitioning(true);

    seasonTimersRef.current.push(
      window.setTimeout(() => updateVisualProfile({ theme }), 150),
      window.setTimeout(() => {
        setSeasonTransitioning(false);
        setSeasonTransitionTarget(null);
      }, 620),
    );
  };

  const handleFile = async (file?: File) => {
    if (!file) return;
    clearShowcaseTimers();
    setShareFeedback("");
    clearPreviewVideo();
    setGuideVisible(false);
    setUploadHintPulse(false);
    progressRef.current = 0;
    setProgress(0);
    setTargetView("forest");
    await replaceQR(file);
  };


  const createPreviewVideo = async () => {
    if (!hasActualQR || previewVideoBusy || exportBusy !== null) {
      if (!hasActualQR) setShareFeedback("Adjunta un QR para crear la vista previa de video.");
      return;
    }

    const canvas = getSceneCanvas();
    if (!canvas) {
      setShareFeedback("La escena todavía no está lista para crear la vista previa.");
      return;
    }

    setPreviewVideoBusy(true);
    setShareFeedback("Preparando vista previa animada…");
    clearPreviewVideo();

    try {
      const duration = runExportSequence("gif");
      const result = await recordSceneVideo(canvas, duration, compactUiRef.current ? 18 : 24);
      const url = URL.createObjectURL(result.blob);
      previewVideoUrlRef.current = url;
      setPreviewVideoUrl(url);
      setShareFeedback("Vista previa lista. Puedes reproducirla dentro del panel.");
    } catch (cause) {
      setShareFeedback(cause instanceof Error ? cause.message : "No pudimos crear la vista previa de video.");
    } finally {
      setPreviewVideoBusy(false);
      window.setTimeout(() => {
        clearShowcaseTimers();
        setTargetView("forest");
      }, 250);
    }
  };

  const buildShareUrl = () => {
    if (typeof window === "undefined" || !hasActualQR) return "";
    const payload = createSharedGardenPayload({
      matrix: displayMatrix,
      fileName: displayFileName,
      decodedContent: displayUrl,
      theme: slot.visualProfile.theme,
    });
    return makeShareUrl(window.location.origin, payload, BASE_PATH);
  };

  const copyShareLink = async () => {
    const url = buildShareUrl();
    if (!url) return;

    try {
      await navigator.clipboard.writeText(url);
      setShareFeedback("Enlace del jardín copiado correctamente.");
    } catch {
      setShareFeedback("No pudimos copiar el enlace automáticamente.");
    }
  };

  const runExportSequence = (mode: "video" | "gif") => {
    clearShowcaseTimers();
    const originalTheme = slot.visualProfile.theme;
    progressRef.current = 0;
    setProgress(0);
    setTargetView("forest");
    updateVisualProfile({ theme: "spring" });

    if (mode === "video") {
      timersRef.current.push(
        window.setTimeout(() => updateVisualProfile({ theme: "summer" }), 2400),
        window.setTimeout(() => updateVisualProfile({ theme: "autumn" }), 4800),
        window.setTimeout(() => updateVisualProfile({ theme: "winter" }), 7200),
        window.setTimeout(() => setTargetView("qr"), 9400),
        window.setTimeout(() => setTargetView("forest"), 11600),
        window.setTimeout(() => updateVisualProfile({ theme: originalTheme }), 12800),
      );
      return 13200;
    }

    timersRef.current.push(
      window.setTimeout(() => updateVisualProfile({ theme: "summer" }), 1450),
      window.setTimeout(() => updateVisualProfile({ theme: "autumn" }), 2900),
      window.setTimeout(() => updateVisualProfile({ theme: "winter" }), 4350),
      window.setTimeout(() => setTargetView("qr"), 5650),
      window.setTimeout(() => setTargetView("forest"), 7100),
      window.setTimeout(() => updateVisualProfile({ theme: originalTheme }), 7800),
    );
    return 8000;
  };

  const handleSecondaryAction = async (action: "video" | "gif" | "image" | "embed") => {
    const url = buildShareUrl();
    if (!url) return;

    if (action === "embed") {
      const iframe = `<iframe src="${url}" width="1280" height="860" style="border:none;border-radius:24px;overflow:hidden" allow="clipboard-write"></iframe>`;
      try {
        await navigator.clipboard.writeText(iframe);
        setShareFeedback("Snippet de inserción copiado al portapapeles.");
      } catch {
        setShareFeedback("No pudimos copiar el snippet de inserción.");
      }
      return;
    }

    const canvas = getSceneCanvas();
    if (!canvas) {
      setShareFeedback("La escena todavía no está lista para exportar.");
      return;
    }

    const safeBase = (displayFileName.replace(/\.[^.]+$/, "") || "qr-voxel-studio")
      .replace(/[^a-z0-9-_]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase();

    setExportBusy(action);
    try {
      if (action === "image") {
        setShareFeedback("Generando imagen PNG…");
        await downloadScenePng(canvas, `${safeBase}-${slot.visualProfile.theme}.png`);
        setShareFeedback("Imagen PNG exportada.");
        return;
      }

      if (action === "video") {
        setShareFeedback("Grabando Primavera → Verano → Otoño → Invierno → QR…");
        const duration = runExportSequence("video");
        const result = await recordSceneVideo(canvas, duration, 30);
        downloadVideoResult(result, `${safeBase}-animado`);
        setShareFeedback(`Video ${result.extension.toUpperCase()} exportado.`);
        return;
      }

      setShareFeedback("Creando GIF de las cuatro estaciones y la vista QR…");
      const duration = runExportSequence("gif");
      const gif = await createSceneGif(canvas, { durationMs: duration, fps: window.innerWidth <= 820 ? 6 : 8, maxWidth: window.innerWidth <= 820 ? 340 : 500 });
      downloadGif(gif, `${safeBase}-animado.gif`);
      setShareFeedback("GIF animado exportado.");
    } catch (cause) {
      setShareFeedback(cause instanceof Error ? cause.message : "No pudimos completar la exportación.");
    } finally {
      setExportBusy(null);
      window.setTimeout(() => {
        clearShowcaseTimers();
        setTargetView("forest");
      }, 250);
    }
  };

  const openSharedView = () => {
    const url = buildShareUrl();
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  };


  return (
    <main className={`v15Page theme-${activeUiTheme} ${hasActualQR ? "" : "theme-pre-qr"}`}>
      <header className="v15Header glassPanel">
        <div className="v15BrandBlock">
          <span className="v15AnchorBadge">
            <Image src={`${BASE_PATH}/anchor-studio.png`} alt="Ancla de QR Voxel Studio" width={58} height={58} priority />
          </span>

          <div className="v15BrandCopy">
            <strong>QR Voxel <span>Studio</span></strong>
            <small>Voxel trees, estaciones y un QR desde el cielo</small>
          </div>
        </div>

        <div className="v15HeaderCenter">
          <div className="v15SeasonsPill" aria-label="Estaciones">
            {THEMES.map((theme) => (
              <button
                key={theme.value}
                type="button"
                className={activeUiTheme === theme.value ? "active" : ""}
                onClick={() => handleThemeChange(theme.value)}
              >
                <span className="seasonGlyph" style={{ color: theme.dot }}>{theme.glyph}</span>
                <span>{theme.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="v15SignatureBlock">
          <strong>Luics415 <span>★</span></strong>
          <small>CREA - COMPARTE - INSPIRA</small>
        </div>
      </header>

      <section className={`v15Workspace ${shareSidebarOpen ? "withSidebar" : ""}`}>
        <div
          className={`v15ScenePane glassPanel ${dragActive ? "isDragging" : ""}`}
          onDragEnter={(event) => {
            event.preventDefault();
            setDragActive(true);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            if (event.currentTarget === event.target) setDragActive(false);
          }}
          onDrop={(event) => {
            event.preventDefault();
            setDragActive(false);
            void handleFile(event.dataTransfer.files?.[0]);
          }}
        >
          <QRForest3D
            matrix={sceneMatrix}
            progress={progress}
            theme={slot.visualProfile.theme}
            animationSpeed={slot.visualProfile.animationSpeed}
            onWeatherChange={setWeatherLabel}
          />

          <div className="v15SceneGlow v15SceneGlowPink" />
          <div className="v15SceneGlow v15SceneGlowWhite" />
          <div className={`v17SeasonVeil ${seasonTransitioning ? "active" : ""}`} aria-hidden="true" />

          <div className="v15SceneTopbar">
            <div className="v15SceneStatus glassMiniPanel">
              <span className="scenePulse" />
              <div>
                <strong>Jardín voxel</strong>
                <small>{hasActualQR ? `Listo para florecer · ${weatherLabel}` : "Árbol de bienvenida · ejemplo en espera"}</small>
              </div>
            </div>

            <div className="v15SceneTopActions">
              <div className="v15ViewSwitch glassMiniPanel" role="group" aria-label="Cambiar vista">
                <button type="button" className={targetView === "forest" ? "active" : ""} onClick={() => setTargetView("forest")}>Bosque</button>
                <button
                  type="button"
                  className={targetView === "qr" ? "active" : ""}
                  onClick={() => hasActualQR && setTargetView("qr")}
                  disabled={!hasActualQR || slot.status === "loading"}
                  title={!hasActualQR ? "Adjunta un QR para desbloquear esta vista" : "Ver QR desde arriba"}
                >
                  Desde arriba
                </button>
              </div>
            </div>
          </div>

          {slot.status === "loading" && (
            <div className="v15LoadingState glassMiniPanel" role="status">
              <span className="loadingOrb" />
              <strong>Preparando el jardín…</strong>
            </div>
          )}

          {dragActive && (
            <div className="v15DropCurtain">
              <UploadIcon />
              <strong>Suelta el QR para reemplazar la escena</strong>
            </div>
          )}
        </div>

        {shareSidebarOpen ? (
          <aside className="v15Sidebar glassPanel" aria-label="Compartir tu jardín">
            <div className="v15SidebarHeader">
              <div>
                <h2>Compartir tu jardín</h2>
                <p>Lleva tu QR a más personas. Comparte todo el jardín con sus estaciones.</p>
              </div>
              <button
                type="button"
                className="v15IconButton v15CollapseButton"
                onClick={() => setShareSidebarOpen(false)}
                aria-label="Encoger panel de compartir"
              >
                <ChevronIcon direction="right" />
              </button>
            </div>

            <div className={`v15MediaPreview ${previewVideoUrl ? "hasVideo" : ""}`}>
              {previewVideoUrl ? (
                <>
                  <video
                    className="v18PreviewVideo"
                    src={previewVideoUrl}
                    controls
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="metadata"
                  />
                  <button type="button" className="v18RegeneratePreview" onClick={() => void createPreviewVideo()} disabled={previewVideoBusy || exportBusy !== null}>
                    Regenerar
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="v18PreviewLauncher"
                  onClick={() => void createPreviewVideo()}
                  disabled={!hasActualQR || previewVideoBusy || exportBusy !== null}
                >
                  <div className="v15MediaBackdrop">
                    <div className="v15MediaSeasonDots">
                      {THEMES.map((theme) => (
                        <span key={`dot-${theme.value}`} style={{ background: theme.dot }} />
                      ))}
                    </div>
                  </div>
                  <span className="v15PlayCircle"><PlayIcon /></span>
                  <span className="v18PreviewLabel">{previewVideoBusy ? "Generando vista previa…" : hasActualQR ? "Crear vista previa animada" : "Adjunta un QR para habilitarla"}</span>
                </button>
              )}
            </div>

            <div className="v15QuickPreview">
              <strong>Vista previa rápida</strong>
              <div className="v15QuickPreviewRow">
                {THEMES.map((theme) => (
                  <button
                    key={`quick-${theme.value}`}
                    type="button"
                    className={activeUiTheme === theme.value ? "active" : ""}
                    onClick={() => handleThemeChange(theme.value)}
                    aria-label={`Cambiar a ${theme.label}`}
                    title={theme.label}
                  >
                    <span style={{ color: theme.dot }}>{theme.glyph}</span>
                  </button>
                ))}
              </div>
            </div>

            <button type="button" className="v15PrimaryShareButton" onClick={copyShareLink} disabled={!hasActualQR || exportBusy !== null}>
              <LinkIcon />
              <span>Copiar enlace del jardín</span>
            </button>

            <div className="v15SecondaryActions">
              <button type="button" className="v15SecondaryAction" onClick={() => void handleSecondaryAction("video")} disabled={!hasActualQR || exportBusy !== null}>
                <span className="v15SecondaryActionLeft"><DownloadIcon /> {exportBusy === "video" ? "Grabando video…" : "Descargar como video"}</span>
                <span className="v15Chevron">⌄</span>
              </button>
              <button type="button" className="v15SecondaryAction" onClick={() => void handleSecondaryAction("gif")} disabled={!hasActualQR || exportBusy !== null}>
                <span className="v15SecondaryActionLeft"><GifIcon /> {exportBusy === "gif" ? "Creando GIF…" : "Descargar como GIF"}</span>
              </button>
              <button type="button" className="v15SecondaryAction" onClick={() => void handleSecondaryAction("image")} disabled={!hasActualQR || exportBusy !== null}>
                <span className="v15SecondaryActionLeft"><ImageIcon /> {exportBusy === "image" ? "Generando imagen…" : "Descargar como imagen"}</span>
              </button>
              <button type="button" className="v15SecondaryAction" onClick={() => void handleSecondaryAction("embed")} disabled={!hasActualQR || exportBusy !== null}>
                <span className="v15SecondaryActionLeft"><CodeIcon /> Insertar en sitio web</span>
              </button>
            </div>

            <div className="v15SidebarFooter">
              <p>El enlace incluye animaciones y cambio de estaciones. Cualquier persona podrá ver tu jardín interactivo.</p>
              {shareFeedback && <div className="v15FeedbackBubble">{shareFeedback}</div>}
              <div className="v15SidebarLinks">
                <button type="button" onClick={openSharedView} disabled={!hasActualQR}>Abrir vista compartida</button>
              </div>
            </div>
          </aside>
        ) : (
          <div className="v17ShareDock">
            <button
              type="button"
              className="v15SidebarBubble glassMiniPanel"
              onClick={() => setShareSidebarOpen(true)}
              aria-label="Abrir panel de compartir"
            >
              <ChevronIcon direction="left" />
              <span>Compartir</span>
            </button>
          </div>
        )}

        <section ref={bottomPanelRef} className={`v15BottomPanel glassPanel ${hasActualQR ? "" : "isDemoPanel"} ${uploadHintPulse ? "guidePulse" : ""}`} aria-label="Datos del QR actual">
          <article className="v15BottomCard v15FileCard">
            <header>
              <span className="v15LabelIcon"><FileIcon /></span>
              <div>
                <strong>Archivo</strong>
              </div>
            </header>
            <div className="v15FileRow">
              <div className="v15FilePreview">
                {hasActualQR ? (
                  <FileIcon />
                ) : (
                  <Image src={`${BASE_PATH}/demo-qr-voxel-studio.png`} alt="QR de ejemplo" width={82} height={82} className="v15DemoQrImage" />
                )}
              </div>
              <div className="v15FileText">
                <strong>{displayFileName}</strong>
                <span>{displayFileMeta}</span>
              </div>
              <button type="button" className={`v15InlineAction ${uploadHintPulse ? "guideTarget" : ""}`} onClick={() => inputRef.current?.click()}>
                <UploadIcon />
                <span>Cambiar</span>
              </button>
            </div>
            {!hasActualQR && (
              <div className={`v18UploadGuideInline ${uploadHintPulse ? "active" : ""}`}>
                Aquí adjuntas tu QR. Si estás en celular, baja un poco y toca <strong>Cambiar</strong>.
              </div>
            )}
          </article>

          <article className="v15BottomCard v15MatrixCard">
            <header>
              <span className="v15LabelIcon"><GridIcon /></span>
              <div>
                <strong>Matriz</strong>
              </div>
            </header>
            <div className="v15MatrixInfo">
              <div className="v15MatrixText">
                <strong>{displayMatrix.length} × {displayMatrix.length}</strong>
                <span>{hasActualQR ? `${activeModules} módulos` : `${DEMO_ACTIVE_MODULES} módulos activos`}</span>
              </div>
              <div className="v15MatrixPreview">
                <QRMatrixCanvas matrix={displayMatrix} size={84} />
              </div>
            </div>
          </article>

          <article className="v15BottomCard v15DecodedCard">
            <header>
              <span className="v15LabelIcon"><FileIcon /></span>
              <div>
                <strong>Contenido decodificado</strong>
              </div>
            </header>
            <div className="v15DecodedBox">
              <span>{displayUrl}</span>
              <button
                type="button"
                className="v15IconButton"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(displayUrl);
                    setShareFeedback("Contenido decodificado copiado.");
                  } catch {
                    setShareFeedback("No pudimos copiar el contenido decodificado.");
                  }
                }}
                aria-label="Copiar contenido decodificado"
              >
                <CopyIcon />
              </button>
            </div>
          </article>
        </section>
      </section>

      {welcomeVisible && (
        <div className="v17WelcomeScreen" role="dialog" aria-modal="true" aria-label="Bienvenida a QR Voxel Studio">
          <div className="v17WelcomeCard">
            <span className="v17WelcomeIcon">
              <Image src={`${BASE_PATH}/anchor-studio.png`} alt="Ancla de QR Voxel Studio" width={96} height={96} priority />
            </span>
            <span className="v17WelcomeEyebrow">BIENVENIDO A</span>
            <h1>QR Voxel Studio</h1>
            <p>Convierte un QR en un jardín voxel estacional, anímalo y compártelo desde el cielo.</p>
            <button type="button" onClick={handleEnterGarden}>
              Entrar al jardín
            </button>
          </div>
        </div>
      )}

      {guideVisible && !hasActualQR && (
        <div className="v18GuideOverlay" role="dialog" aria-modal="true" aria-label="Guía rápida para adjuntar un QR">
          <div className="v18GuideCard">
            <span className="v18GuideEyebrow">GUÍA RÁPIDA</span>
            <h2>¿Dónde adjunto mi QR?</h2>
            <p>Tu jardín ya está listo. Para reemplazar el ejemplo, usa el bloque <strong>Archivo</strong> que está debajo de la escena.</p>
            <ol className="v18GuideSteps">
              <li><span>1</span> En celular, desliza un poco hacia abajo.</li>
              <li><span>2</span> Busca el panel <strong>Archivo</strong>.</li>
              <li><span>3</span> Toca el botón <strong>Cambiar</strong> para adjuntar tu QR.</li>
            </ol>
            <div className="v18GuideActions">
              <button type="button" className="v18GuideSecondary" onClick={() => setGuideVisible(false)}>Entendido</button>
              <button type="button" className="v18GuidePrimary" onClick={revealUploadArea}>Muéstrame dónde</button>
            </div>
          </div>
        </div>
      )}

      {slot.error && (
        <div className="v15ErrorBanner glassMiniPanel" role="alert">
          <strong>No pudimos usar ese archivo.</strong>
          <span>{slot.error}</span>
        </div>
      )}

      <input
        ref={inputRef}
        className="hiddenInput"
        type="file"
        accept={ACCEPTED_FILES}
        onChange={(event) => {
          void handleFile(event.target.files?.[0]);
          event.currentTarget.value = "";
        }}
      />
    </main>
  );
}
