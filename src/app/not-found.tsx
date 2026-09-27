"use client";

import Image from "next/image";
import { getBasePath, getRootHref } from "@/lib/navigation";

export default function NotFound() {
  const rootHref = getRootHref();
  const basePath = getBasePath();

  return (
    <main className="v15Page theme-spring expiredContainer" style={{ justifyContent: "center" }}>
      <div className="expiredBackground" aria-hidden="true">
        <div className="expiredGlow expiredGlowPurple" />
      </div>

      <header className="v15Header glassPanel expiredHeaderBar" style={{ position: "absolute", top: "18px", width: "min(1720px, calc(100% - 28px))" }}>
        <a href={rootHref} className="v15BrandBlock" title="Ir al generador de QR Voxel Studio">
          <span className="v15AnchorBadge">
            <Image src={`${basePath}/anchor-studio.png`} alt="Ancla de QR Voxel Studio" width={74} height={74} priority />
          </span>

          <div className="v15BrandCopy">
            <strong>QR Voxel <span>Studio</span></strong>
            <small>Voxel trees, estaciones y un QR desde el cielo</small>
          </div>
        </a>

        <div className="v15HeaderCenter" />

        <div className="v15SignatureBlock">
          <strong>Luics415 <span>★</span></strong>
          <small>CREA - COMPARTE - INSPIRA</small>
        </div>
      </header>

      <section className="expiredCard glassPanel" style={{ margin: "auto" }}>
        <div className="expiredBadge">
          <span className="badgeIcon">🌱</span>
          <span>Página no encontrada</span>
        </div>

        <h1 className="expiredTitle" style={{ marginTop: "12px" }}>404 · Ruta no encontrada</h1>

        <p className="expiredDescription">
          La página que buscas no existe o fue movida. Toca el botón para regresar al generador principal de códigos QR Voxel.
        </p>

        <div className="expiredActions">
          <a href={rootHref} className="btnPrimary glowButton">
            <span>✨ Ir al generador de QR Voxel</span>
          </a>
        </div>
      </section>

      <footer className="expiredFooter" style={{ position: "absolute", bottom: "24px" }}>
        <p>Desarrollado con arte y tecnología voxel en <strong>QR Voxel Studio</strong></p>
      </footer>
    </main>
  );
}
