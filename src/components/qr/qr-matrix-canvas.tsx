"use client";

import { useEffect, useRef } from "react";
import type { QRMatrix } from "@/models/qr-slot";

interface QRMatrixCanvasProps {
  matrix: QRMatrix;
  size?: number;
  quietZone?: number;
}

export function QRMatrixCanvas({
  matrix,
  size = 430,
  quietZone = 4,
}: QRMatrixCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || matrix.length === 0) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const matrixSize = matrix.length;
    const totalModules = matrixSize + quietZone * 2;
    const moduleSize = size / totalModules;

    const dpr = Math.max(1, window.devicePixelRatio || 1);
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;

    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.imageSmoothingEnabled = false;
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, size, size);
    context.fillStyle = "#050505";

    for (let row = 0; row < matrixSize; row += 1) {
      for (let column = 0; column < matrixSize; column += 1) {
        if (!matrix[row][column]) continue;

        const x = (column + quietZone) * moduleSize;
        const y = (row + quietZone) * moduleSize;
        context.fillRect(
          Math.floor(x),
          Math.floor(y),
          Math.ceil(moduleSize),
          Math.ceil(moduleSize),
        );
      }
    }
  }, [matrix, quietZone, size]);

  if (matrix.length === 0) {
    return <div className="matrixPlaceholder">Tu QR reconstruido aparecerá aquí.</div>;
  }

  return (
    <canvas
      ref={canvasRef}
      className="qrCanvas"
      aria-label="Código QR reconstruido"
    />
  );
}
