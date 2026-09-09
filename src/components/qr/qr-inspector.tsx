"use client";

import type { QRSlot } from "@/models/qr-slot";

export function QRInspector({ slot }: { slot: QRSlot }) {
  const matrixSize = slot.qrMatrix.length;

  return (
    <div className="inspector">
      <div className="sectionHeading">
        <span>QR SLOT</span>
        <span className={`statusPill status-${slot.status}`}>
          {slot.status === "empty" && "Vacío"}
          {slot.status === "loading" && "Analizando"}
          {slot.status === "ready" && "Listo"}
          {slot.status === "error" && "Error"}
        </span>
      </div>

      <dl className="metadataList">
        <div>
          <dt>Versión</dt>
          <dd>v{slot.version}</dd>
        </div>
        <div>
          <dt>Archivo</dt>
          <dd>{slot.originalFile?.name ?? "—"}</dd>
        </div>
        <div>
          <dt>Matriz</dt>
          <dd>{matrixSize ? `${matrixSize} × ${matrixSize}` : "—"}</dd>
        </div>
        <div>
          <dt>Tema persistente</dt>
          <dd>{slot.visualProfile.theme}</dd>
        </div>
      </dl>

      <div className="decodedBox">
        <span>Contenido decodificado</span>
        <p>{slot.decodedContent ?? "Aún no hay contenido."}</p>
      </div>

      {slot.error && <div className="errorBox">{slot.error}</div>}
    </div>
  );
}
