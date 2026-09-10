"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { QRForest3D } from "@/components/visual/qr-forest-3d";
import { decodeSharedGarden } from "@/features/share/share-payload";
import type { QRMatrix, VisualProfile } from "@/models/qr-slot";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";

const THEMES: Array<{
  value: VisualProfile["theme"];
  label: string;
  dot: string;
}> = [
  { value: "spring", label: "Primavera", dot: "#f2a8cf" },
  { value: "summer", label: "Verano", dot: "#5cc57b" },
  { value: "autumn", label: "Otoño", dot: "#ee9b54" },
  { value: "winter", label: "Invierno", dot: "#e8f7ff" },
];

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8.5 6.5v11l9-5.5-9-5.5Z" />
    </svg>
  );
}

export default function SharedGardenPage() {
  const [matrix, setMatrix] = useState<QRMatrix>([]);
  const [theme, setTheme] = useState<VisualProfile["theme"]>("spring");
  const [fileName, setFileName] = useState("Jardín QR");
  const [decodedContent, setDecodedContent] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [weatherLabel, setWeatherLabel] = useState("Claro suave");
  const progressRef = useRef(0);
  const progressUiStampRef = useRef(0);
  const compactUiRef = useRef(false);
  const timersRef = useRef<number[]>([]);
  const seasonTimersRef = useRef<number[]>([]);
  const [targetProgress, setTargetProgress] = useState(0);
  const [seasonTransitionTarget, setSeasonTransitionTarget] = useState<VisualProfile["theme"] | null>(null);
  const [seasonTransitioning, setSeasonTransitioning] = useState(false);
  const activeTheme = seasonTransitionTarget ?? theme;

  useEffect(() => {
    try {
      const encoded = new URLSearchParams(window.location.search).get("garden");
      if (!encoded) throw new Error("Este enlace no contiene un jardín QR.");
      const decoded = decodeSharedGarden(encoded);
      setMatrix(decoded.matrix);
      setTheme(decoded.payload.theme || "spring");
      setFileName(decoded.payload.fileName || "Jardín QR");
      setDecodedContent(decoded.payload.decodedContent);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No pudimos abrir este jardín.");
    }
  }, []);

  useEffect(() => {
    const compactMedia = window.matchMedia("(max-width: 820px), (pointer: coarse)");
    const updateCompactMode = () => {
      compactUiRef.current = compactMedia.matches;
    };
    updateCompactMode();
    compactMedia.addEventListener?.("change", updateCompactMode);
    return () => compactMedia.removeEventListener?.("change", updateCompactMode);
  }, []);

  useEffect(() => {
    const colors: Record<VisualProfile["theme"], string> = {
      neutral: "#B6DDFE",
      spring: "#D6E8F5",
      summer: "#BEE7DC",
      autumn: "#EAD9D2",
      winter: "#D9EAFA",
    };
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    meta?.setAttribute("content", colors[activeTheme]);
  }, [activeTheme]);

  useEffect(() => {
    let frame = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const delta = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
      last = now;
      const current = progressRef.current;
      const response = 1 - Math.exp(-delta * 3.5);
      const next = current + (targetProgress - current) * response;
      const settled = Math.abs(targetProgress - next) < 0.0015 ? targetProgress : next;
      progressRef.current = settled;
      const minUiFrameMs = compactUiRef.current ? 46 : 30;
      if (settled === targetProgress || now - progressUiStampRef.current >= minUiFrameMs) {
        progressUiStampRef.current = now;
        setProgress(settled);
      }
      if (settled !== targetProgress) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [targetProgress]);

  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => window.clearTimeout(timer));
      seasonTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  const clearTimers = () => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current = [];
  };

  const transitionTheme = (nextTheme: VisualProfile["theme"]) => {
    if (nextTheme === activeTheme) return;
    seasonTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    seasonTimersRef.current = [];
    setSeasonTransitionTarget(nextTheme);
    setSeasonTransitioning(true);
    seasonTimersRef.current.push(
      window.setTimeout(() => setTheme(nextTheme), 140),
      window.setTimeout(() => {
        setSeasonTransitioning(false);
        setSeasonTransitionTarget(null);
      }, 560),
    );
  };

  const chooseTheme = (nextTheme: VisualProfile["theme"]) => {
    clearTimers();
    setPlaying(false);
    setTargetProgress(0);
    transitionTheme(nextTheme);
  };

  const playGarden = () => {
    if (!matrix.length) return;
    clearTimers();
    setPlaying(true);
    setTargetProgress(0);
    transitionTheme("spring");

    timersRef.current.push(
      window.setTimeout(() => transitionTheme("summer"), 3200),
      window.setTimeout(() => transitionTheme("autumn"), 6400),
      window.setTimeout(() => transitionTheme("winter"), 9600),
      window.setTimeout(() => {
        setTargetProgress(1);
      }, 12600),
      window.setTimeout(() => {
        setTargetProgress(0);
      }, 16600),
      window.setTimeout(() => {
        transitionTheme("spring");
        setPlaying(false);
      }, 19800),
    );
  };

  const activeModules = useMemo(
    () => matrix.reduce((total, row) => total + row.reduce((rowTotal, value) => rowTotal + (value ? 1 : 0), 0), 0),
    [matrix],
  );

  if (error) {
    return (
      <main className="sharedGardenErrorPage">
        <Image src={`${BASE_PATH}/anchor-studio.png`} alt="QR Voxel Studio" width={76} height={76} />
        <h1>No pudimos abrir este jardín.</h1>
        <p>{error}</p>
        <Link href="/">Crear un jardín nuevo</Link>
      </main>
    );
  }

  return (
    <main className={`sharedGardenShell theme-${activeTheme}`}>
      <header className="sharedGardenHeader">
        <Link href="/" className="sharedBrand">
          <Image src={`${BASE_PATH}/anchor-studio.png`} alt="Ancla de QR Voxel Studio" width={48} height={48} priority />
          <div>
            <strong>QR Voxel Studio</strong>
            <span>Jardín compartido</span>
          </div>
        </Link>
        <span className="sharedReadOnlyBadge">Solo para disfrutar</span>
      </header>

      <section className="sharedGardenStage">
        <QRForest3D matrix={matrix} progress={progress} theme={theme} animationSpeed={1} onWeatherChange={setWeatherLabel} />
        <div className="stageGlow stageGlowRose" />
        <div className="stageGlow stageGlowCyan" />
        <div className={`sharedSeasonVeil ${seasonTransitioning ? "active" : ""}`} aria-hidden="true" />

        <div className="sharedGardenIdentity">
          <span className="scenePulse" />
          <div>
            <strong>{fileName}</strong>
            <span>{weatherLabel}</span>
          </div>
        </div>

        <div className="sharedSeasonDock">
          {THEMES.map((season) => (
            <button
              key={season.value}
              type="button"
              className={activeTheme === season.value ? "active" : ""}
              onClick={() => chooseTheme(season.value)}
            >
              <span style={{ background: season.dot }} />
              {season.label}
            </button>
          ))}
          <button type="button" className={`sharedPlayButton ${playing ? "active" : ""}`} onClick={playGarden}>
            <PlayIcon />
            {playing ? "Reproduciendo" : "Reproducir"}
          </button>
        </div>
      </section>

      <footer className="sharedGardenFooter">
        <div>
          <span>Matriz</span>
          <strong>{matrix.length ? `${matrix.length} × ${matrix.length}` : "—"}</strong>
          <small>{activeModules} módulos activos</small>
        </div>
        <div className="sharedGardenDecoded">
          <span>Contenido del QR</span>
          <strong>{decodedContent || "Contenido no disponible"}</strong>
        </div>
        <div className="sharedGardenAttribution">
          <Image src={`${BASE_PATH}/anchor-studio.png`} alt="" width={28} height={28} />
          <span>Creado con QR Voxel Studio</span>
        </div>
      </footer>
    </main>
  );
}
