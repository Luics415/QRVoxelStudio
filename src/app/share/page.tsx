"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { QRMatrixCanvas } from "@/components/qr/qr-matrix-canvas";
import { QRForest3D } from "@/components/visual/qr-forest-3d";
import { decodeSharedGarden } from "@/features/share/share-payload";
import type { QRMatrix, VisualProfile } from "@/models/qr-slot";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";

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

function IconBase({ children }: { children: ReactNode }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true">{children}</svg>;
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

export default function SharedGardenPage() {
  const [matrix, setMatrix] = useState<QRMatrix>([]);
  const [theme, setTheme] = useState<VisualProfile["theme"]>("spring");
  const [fileName, setFileName] = useState("Jardín QR");
  const [decodedContent, setDecodedContent] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [weatherLabel, setWeatherLabel] = useState("Claro suave");
  const [targetView, setTargetView] = useState<"forest" | "qr">("forest");
  const [progress, setProgress] = useState(0);
  const progressRef = useRef(0);
  const qrClearMode = targetView === "qr" || progress > 0.82;
  const progressUiStampRef = useRef(0);
  const compactUiRef = useRef(false);
  const seasonTimersRef = useRef<number[]>([]);
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
      spring: "#E8D9F3",
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
    const target = targetView === "qr" ? 1 : 0;

    const tick = (now: number) => {
      const delta = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
      last = now;
      const current = progressRef.current;
      const response = 1 - Math.exp(-delta * 3.5);
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
  }, [targetView]);

  useEffect(() => {
    return () => seasonTimersRef.current.forEach((timer) => window.clearTimeout(timer));
  }, []);

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
    <main className={`sharedGeneratorPage theme-${activeTheme}`}>
      <header className="v15Header glassPanel sharedGeneratorHeader">
        <Link href="/" className="v15BrandBlock sharedGeneratorBrand">
          <span className="v15AnchorBadge">
            <Image src={`${BASE_PATH}/anchor-studio.png`} alt="Ancla de QR Voxel Studio" width={58} height={58} priority />
          </span>
          <div className="v15BrandCopy">
            <strong>QR Voxel <span>Studio</span></strong>
            <small>Voxel trees, estaciones y un QR desde el cielo</small>
          </div>
        </Link>

        <div className="v15HeaderCenter">
          <div className="v15SeasonsPill" aria-label="Estaciones del jardín compartido">
            {THEMES.map((season) => (
              <button
                key={season.value}
                type="button"
                className={activeTheme === season.value ? "active" : ""}
                onClick={() => transitionTheme(season.value)}
              >
                <span className="seasonGlyph" style={{ color: season.dot }}>{season.glyph}</span>
                <span>{season.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="v15SignatureBlock sharedGeneratorSignature">
          <strong>Luics415 <span>★</span></strong>
          <small>SOLO PARA DISFRUTAR</small>
        </div>
      </header>

      <section className="sharedGeneratorWorkspace">
        <div className="v15ScenePane glassPanel sharedGeneratorScene">
          <QRForest3D matrix={matrix} progress={progress} theme={theme} animationSpeed={1} onWeatherChange={setWeatherLabel} />
          <div className="v15SceneGlow v15SceneGlowPink" />
          <div className="v15SceneGlow v15SceneGlowWhite" />
          <div className={`sharedSeasonVeil ${seasonTransitioning ? "active" : ""}`} aria-hidden="true" />

          <div className={`v15SceneTopbar ${qrClearMode ? "qrHidden" : ""}`}>
            <div className="v15SceneStatus glassMiniPanel">
              <span className="scenePulse" />
              <div>
                <strong>{fileName}</strong>
                <small>{weatherLabel} · Solo para disfrutar</small>
              </div>
            </div>

            <div className="v15ViewSwitch glassMiniPanel" role="group" aria-label="Cambiar vista">
              <button type="button" className={targetView === "forest" ? "active" : ""} onClick={() => setTargetView("forest")}>Bosque</button>
              <button type="button" className={targetView === "qr" ? "active" : ""} onClick={() => setTargetView("qr")}>Desde arriba</button>
            </div>
          </div>
        </div>

        {qrClearMode && (
          <div className="v18QrToolbar glassMiniPanel" role="group" aria-label="Cambiar vista del jardín compartido">
            <button type="button" className={targetView === "forest" ? "active" : ""} onClick={() => setTargetView("forest")}>Bosque</button>
            <button type="button" className={targetView === "qr" ? "active" : ""} onClick={() => setTargetView("qr")}>Desde arriba</button>
          </div>
        )}

        <section className="v15BottomPanel glassPanel sharedGeneratorBottom" aria-label="Datos del jardín compartido">
          <article className="v15BottomCard v15FileCard">
            <header>
              <span className="v15LabelIcon"><FileIcon /></span>
              <div><strong>Archivo</strong></div>
            </header>
            <div className="v15FileRow">
              <div className="v15FilePreview"><FileIcon /></div>
              <div className="v15FileText">
                <strong>{fileName}</strong>
                <span>Jardín compartido</span>
              </div>
            </div>
          </article>

          <article className="v15BottomCard v15MatrixCard">
            <header>
              <span className="v15LabelIcon"><GridIcon /></span>
              <div><strong>Matriz</strong></div>
            </header>
            <div className="v15MatrixInfo">
              <div className="v15MatrixText">
                <strong>{matrix.length ? `${matrix.length} × ${matrix.length}` : "—"}</strong>
                <span>{activeModules} módulos activos</span>
              </div>
              <div className="v15MatrixPreview">
                {matrix.length ? <QRMatrixCanvas matrix={matrix} size={84} /> : <span>QR</span>}
              </div>
            </div>
          </article>

          <article className="v15BottomCard v15DecodedCard">
            <header>
              <span className="v15LabelIcon"><FileIcon /></span>
              <div><strong>Contenido decodificado</strong></div>
            </header>
            <div className="v15DecodedBox">
              <span>{decodedContent || "Contenido no disponible"}</span>
              <button
                type="button"
                className="v15IconButton"
                onClick={async () => {
                  if (!decodedContent) return;
                  try {
                    await navigator.clipboard.writeText(decodedContent);
                  } catch {
                    // El jardín sigue siendo de solo lectura si el navegador bloquea el portapapeles.
                  }
                }}
                aria-label="Copiar contenido decodificado"
                disabled={!decodedContent}
              >
                <CopyIcon />
              </button>
            </div>
          </article>
        </section>
      </section>

      <footer className="sharedGeneratorCredit">
        <Image src={`${BASE_PATH}/anchor-studio.png`} alt="" width={28} height={28} />
        <span>Creado con QR Voxel Studio</span>
      </footer>
    </main>
  );
}
