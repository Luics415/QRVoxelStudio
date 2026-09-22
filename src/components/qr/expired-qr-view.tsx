"use client";

import Link from "next/link";
import Image from "next/image";

interface ExpiredQRViewProps {
  expiresAt?: number;
  title?: string;
}

export function ExpiredQRView({ expiresAt, title }: ExpiredQRViewProps) {
  const formattedDate = expiresAt
    ? new Intl.DateTimeFormat("es-ES", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(expiresAt))
    : "Fecha no disponible";

  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
  const homeHref = basePath ? `${basePath}/` : "/";

  return (
    <main className="v15Page theme-spring expiredContainer">
      <div className="expiredBackground" aria-hidden="true">
        <div className="expiredGlow expiredGlowPurple" />
      </div>

      {/* Barra superior oficial QR Voxel Studio con firma de autor Luics415 ★ */}
      <header className="v15Header glassPanel expiredHeaderBar">
        <Link href={homeHref} className="v15BrandBlock" style={{ textDecoration: "none" }} title="Ir a QR Voxel Studio">
          <span className="v15AnchorBadge">
            <Image src={`${basePath}/anchor-studio.png`} alt="Ancla de QR Voxel Studio" width={74} height={74} priority />
          </span>

          <div className="v15BrandCopy">
            <strong>QR Voxel <span>Studio</span></strong>
            <small>Voxel trees, estaciones y un QR desde el cielo</small>
          </div>
        </Link>

        <div className="v15HeaderCenter" />

        <div className="v15SignatureBlock">
          <strong>Luics415 <span>★</span></strong>
          <small>CREA - COMPARTE - INSPIRA</small>
        </div>
      </header>

      <section className="expiredCard glassPanel">
        <div className="expiredBadge">
          <span className="badgeIcon">⏳</span>
          <span>Enlace Vencido</span>
        </div>

        {/* Árbol principal voxel del proyecto con aura luminosa */}
        <div className="expiredTreeContainer" aria-hidden="true">
          <div className="expiredTreeAura" />
          <Image
            src={`${basePath}/voxel-tree.png`}
            alt="Árbol Voxel Principal"
            width={150}
            height={150}
            className="expiredTreeImg"
            priority
          />
        </div>

        <h1 className="expiredTitle">El tiempo de este jardín ha terminado</h1>

        {title && <p className="expiredSubtitle">«{title}»</p>}

        <p className="expiredDescription">
          Este código QR temporal completó su periodo de vigencia y ya no se encuentra activo.
        </p>

        <div className="expiredMetaBox glassMiniPanel">
          <div className="metaRow">
            <span className="metaLabel">Fecha de expiración:</span>
            <span className="metaValue">{formattedDate}</span>
          </div>
          <div className="metaRow">
            <span className="metaLabel">Estado:</span>
            <span className="metaStatus">Caducado / Inactivo</span>
          </div>
        </div>

        <div className="expiredActions">
          <Link href={homeHref} className="btnPrimary glowButton">
            <span>✨ Crear un nuevo QR Voxel</span>
          </Link>
        </div>
      </section>

      <footer className="expiredFooter">
        <p>Desarrollado con arte y tecnología voxel en <strong>QR Voxel Studio</strong></p>
      </footer>
    </main>
  );
}

