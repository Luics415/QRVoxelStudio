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
  const targetProgressRef = useRef(0);
  const timersRef = useRef<number[]>([]);

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
    let frame = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const delta = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
      last = now;
      const target = targetProgressRef.current;
      const current = progressRef.current;
      const response = 1 - Math.exp(-delta * 3.5);
      const next = current + (target - current) * response;
      const settled = Math.abs(target - next) < 0.0015 ? target : next;
      progressRef.current = settled;
      setProgress(settled);
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    return () => timersRef.current.forEach((timer) => window.clearTimeout(timer));
  }, []);

  const clearTimers = () => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current = [];
  };

  const chooseTheme = (nextTheme: VisualProfile["theme"]) => {
    clearTimers();
    setPlaying(false);
    targetProgressRef.current = 0;
    setTheme(nextTheme);
  };

  const playGarden = () => {
    if (!matrix.length) return;
    clearTimers();
    setPlaying(true);
    targetProgressRef.current = 0;
    setTheme("spring");

    timersRef.current.push(
      window.setTimeout(() => setTheme("summer"), 3200),
      window.setTimeout(() => setTheme("autumn"), 6400),
      window.setTimeout(() => setTheme("winter"), 9600),
      window.setTimeout(() => {
        targetProgressRef.current = 1;
      }, 12600),
      window.setTimeout(() => {
        targetProgressRef.current = 0;
      }, 16600),
      window.setTimeout(() => {
        setTheme("spring");
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
    <main className="sharedGardenShell">
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
              className={theme === season.value ? "active" : ""}
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
