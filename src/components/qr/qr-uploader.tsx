"use client";

import { useRef, useState } from "react";

interface QRUploaderProps {
  busy?: boolean;
  hasQR?: boolean;
  onFile: (file: File) => void | Promise<void>;
}

const ACCEPT = ".png,.jpg,.jpeg,.webp,.svg,.bmp,.eps";

export function QRUploader({ busy = false, hasQR = false, onFile }: QRUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const pickFirst = (files: FileList | null) => {
    const file = files?.[0];
    if (file) void onFile(file);
  };

  return (
    <div
      className={`dropzone ${dragging ? "dropzoneActive" : ""}`}
      onDragEnter={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={(event) => {
        event.preventDefault();
        setDragging(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        pickFirst(event.dataTransfer.files);
      }}
    >
      <input
        ref={inputRef}
        className="hiddenInput"
        type="file"
        accept={ACCEPT}
        onChange={(event) => {
          pickFirst(event.target.files);
          event.currentTarget.value = "";
        }}
      />

      <div className="dropIcon" aria-hidden="true">⌁</div>
      <strong>{hasQR ? "Reemplazar QR" : "Adjuntar código QR"}</strong>
      <p>Arrastra una imagen o selecciónala desde tu equipo.</p>
      <span className="formats">PNG · JPG · WebP · SVG · BMP · EPS*</span>
      <button
        type="button"
        className="primaryButton"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        {busy ? "Analizando…" : hasQR ? "Elegir otro QR" : "Elegir archivo"}
      </button>
      <small>* EPS está preparado en arquitectura; la conversión se añadirá en una fase posterior.</small>
    </div>
  );
}
