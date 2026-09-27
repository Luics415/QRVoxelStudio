"use client";

import { Suspense, useEffect, useState, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { resolveQR, trackScan, type ResolvedQRResult } from "@/features/dynamic-qr/dynamic-qr-service";
import { getRootHref } from "@/lib/navigation";
import { reconstructQRMatrix } from "@/features/qr-engine/reconstruct-qr";
import { QRForest3D } from "@/components/visual/qr-forest-3d";
import { ExpiredQRView } from "@/components/qr/expired-qr-view";
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

function RedirectHandler() {
  const searchParams = useSearchParams();
  const [resolution, setResolution] = useState<ResolvedQRResult | null>(null);
  const [loading, setLoading] = useState(true);

  // Estados visuales del jardín 3D
  const [theme, setTheme] = useState<VisualProfile["theme"]>("spring");
  const [seasonTransitionTarget, setSeasonTransitionTarget] = useState<VisualProfile["theme"] | null>(null);
  const [seasonTransitioning, setSeasonTransitioning] = useState(false);
  const [weatherLabel, setWeatherLabel] = useState("Claro suave");
  const [targetView, setTargetView] = useState<"forest" | "qr">("forest");
  const [progress, setProgress] = useState(0);
  const progressRef = useRef(0);
  const seasonTimersRef = useRef<number[]>([]);
  const progressUiStampRef = useRef(0);

  const activeTheme = seasonTransitionTarget ?? theme;

  // Obtener el ID del QR desde el query param ?id= o del pathname /r/[id]
  const qrId = useMemo(() => {
    const fromQuery = searchParams.get("id");
    if (fromQuery) return fromQuery;

    if (typeof window !== "undefined") {
      const parts = window.location.pathname.split("/").filter(Boolean);
      const rIndex = parts.indexOf("r");
      if (rIndex !== -1 && parts[rIndex + 1]) {
        return parts[rIndex + 1];
      }
    }
    return "";
  }, [searchParams]);

  useEffect(() => {
    if (!qrId) {
      queueMicrotask(() => {
        setLoading(false);
        setResolution({ record: null, status: "not_found", remainingMs: 0 });
      });
      return;
    }

    let isMounted = true;
    const payloadParam = searchParams.get("p") || undefined;
    void resolveQR(qrId, payloadParam).then(async (result) => {
      if (!isMounted) return;
      setResolution(result);
      setLoading(false);

      if (result.status === "active" && result.record) {
        // Inicializar el tema configurado para este QR
        if (result.record.voxelTheme) {
          setTheme(result.record.voxelTheme);
        }

        // Registrar escaneo / visita
        void trackScan(result.record.id);

        // Si es modo directo, redirigir sin desvío de inmediato
        if (result.record.mode === "direct") {
          window.location.replace(result.record.targetUrl);
        }
      }
    });

    return () => {
      isMounted = false;
    };
  }, [qrId, searchParams]);

  // Actualizar meta theme-color según la estación
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

  // Animación de cámara e interpolación fluida entre Bosque y Vista QR
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
      if (settled === target || now - progressUiStampRef.current >= 30) {
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

  // Si está cargando
  if (loading) {
    return (
      <div className="redirectLoadingContainer">
        <div className="glassPanel redirectLoadingCard">
          <span className="loadingOrb" />
          <h2>Consultando jardín voxel…</h2>
          <p>Verificando estado y vigencia del código QR.</p>
        </div>
      </div>
    );
  }

  // Si no se encontró el QR
  if (!resolution || resolution.status === "not_found" || !resolution.record) {
    const homeHref = getRootHref();
    return (
      <div className="redirectLoadingContainer">
        <div className="glassPanel redirectLoadingCard">
          <span className="errorOrb">⚠️</span>
          <h2>Código QR no encontrado</h2>
          <p>El código solicitado no existe o fue removido.</p>
          <a href={homeHref} className="btnPrimary glowButton">
            Ir a QR Voxel Studio
          </a>
        </div>
      </div>
    );
  }

  // Si el QR ha caducado
  if (resolution.status === "expired") {
    return (
      <ExpiredQRView
        expiresAt={resolution.record.expiresAt}
        title={resolution.record.title}
      />
    );
  }

  const { record } = resolution;

  // Si es modo DIRECTO pero aún no ha redirigido el navegador
  if (record.mode === "direct") {
    return (
      <div className="redirectLoadingContainer">
        <div className="glassPanel redirectLoadingCard">
          <span className="loadingOrb" />
          <h2>Redirigiendo a tu destino…</h2>
          <p>Has escaneado un QR Voxel verificado.</p>
          <a href={record.targetUrl} className="btnPrimary" style={{ marginTop: "16px" }}>
            Haga clic aquí si no es redirigido automáticamente
          </a>
        </div>
      </div>
    );
  }

  // Si es modo DINÁMICO VOXEL: Mostramos la experiencia inmersiva completa de QR Voxel Studio
  const matrix: QRMatrix = reconstructQRMatrix(record.targetUrl);
  const homeHref = getRootHref();

  return (
    <main className={`sharedGeneratorPage theme-${activeTheme}`}>
      <header className="v15Header glassPanel sharedGeneratorHeader">
        <a href={homeHref} className="v15BrandBlock sharedGeneratorBrand" title="Ir al generador de QR Voxel Studio">
          <span className="v15AnchorBadge">
            <Image src={`${BASE_PATH}/anchor-studio.png`} alt="Ancla de QR Voxel Studio" width={58} height={58} priority />
          </span>
          <div className="v15BrandCopy">
            <strong>QR Voxel <span>Studio</span></strong>
            <small>Voxel trees, estaciones y un QR desde el cielo</small>
          </div>
        </a>

        <div className="v15HeaderCenter">
          <div className="v15SeasonsPill" aria-label="Estaciones del jardín interactivo">
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
          <small>CREA - COMPARTE - INSPIRA</small>
        </div>
      </header>

      <section className="sharedGeneratorWorkspace">
        <div className="v15ScenePane glassPanel sharedGeneratorScene">
          <QRForest3D
            matrix={matrix}
            progress={progress}
            theme={activeTheme}
            animationSpeed={1}
            onWeatherChange={setWeatherLabel}
          />
          <div className="v15SceneGlow v15SceneGlowPink" />
          <div className="v15SceneGlow v15SceneGlowWhite" />
          <div className={`sharedSeasonVeil ${seasonTransitioning ? "active" : ""}`} aria-hidden="true" />

          <div className="v15SceneTopbar">
            <div className="v15SceneStatus glassMiniPanel">
              <span className="scenePulse" />
              <div>
                <strong>{record.title || "Jardín Voxel"}</strong>
                <small>{weatherLabel} · Destino activo</small>
              </div>
            </div>

            <div className="v15ViewSwitch glassMiniPanel" role="group" aria-label="Cambiar vista">
              <button
                type="button"
                className={targetView === "forest" ? "active" : ""}
                onClick={() => setTargetView("forest")}
              >
                Bosque
              </button>
              <button
                type="button"
                className={targetView === "qr" ? "active" : ""}
                onClick={() => setTargetView("qr")}
              >
                Desde arriba
              </button>
            </div>
          </div>
        </div>

        <section className="sharedDestinationSection">
          <div className="voxelExpFooterCard glassPanel">
            <div className="destInfo">
              <div className="destHeaderRow">
                <span className="destBadge">
                  <span className="destVerifiedDot" />
                  DESTINO VERIFICADO
                </span>
                {record.expiresAt && (
                  <span className="destExpiryBadge">
                    ⏳ Vigencia activa
                  </span>
                )}
              </div>
              <strong className="destTitle">{record.title || record.targetUrl}</strong>
              <span className="destUrl">{record.targetUrl}</span>
            </div>
            <a
              href={record.targetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btnVisitDestination glowButton"
            >
              <span>Visitar sitio web ↗</span>
            </a>
          </div>
        </section>
      </section>
    </main>
  );
}

export default function RedirectPage() {
  return (
    <Suspense
      fallback={
        <div className="redirectLoadingContainer">
          <div className="glassPanel redirectLoadingCard">
            <span className="loadingOrb" />
            <h2>Cargando…</h2>
          </div>
        </div>
      }
    >
      <RedirectHandler />
    </Suspense>
  );
}
