import type { QRMatrix, VisualProfile } from "@/models/qr-slot";

export interface SharedGardenPayload {
  version: 1;
  fileName: string;
  decodedContent: string | null;
  matrixSize: number;
  matrixBits: string;
  theme: VisualProfile["theme"];
}

function matrixToBits(matrix: QRMatrix) {
  return matrix.map((row) => row.map((value) => (value ? "1" : "0")).join("")).join("");
}

function bitsToMatrix(bits: string, size: number): QRMatrix {
  if (!Number.isInteger(size) || size <= 0 || bits.length !== size * size) {
    throw new Error("El enlace compartido contiene una matriz QR inválida.");
  }

  const matrix: QRMatrix = [];
  for (let row = 0; row < size; row += 1) {
    const start = row * size;
    matrix.push(bits.slice(start, start + size).split("").map((bit) => (bit === "1" ? 1 : 0)));
  }
  return matrix;
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

export function createSharedGardenPayload(input: {
  matrix: QRMatrix;
  fileName: string;
  decodedContent: string | null;
  theme: VisualProfile["theme"];
}): SharedGardenPayload {
  return {
    version: 1,
    fileName: input.fileName,
    decodedContent: input.decodedContent,
    matrixSize: input.matrix.length,
    matrixBits: matrixToBits(input.matrix),
    theme: input.theme,
  };
}

export function encodeSharedGarden(payload: SharedGardenPayload) {
  const json = JSON.stringify(payload);
  return bytesToBase64Url(new TextEncoder().encode(json));
}

export function decodeSharedGarden(encoded: string) {
  const json = new TextDecoder().decode(base64UrlToBytes(encoded));
  const payload = JSON.parse(json) as SharedGardenPayload;
  if (payload.version !== 1) throw new Error("Esta versión de jardín compartido todavía no es compatible.");
  const matrix = bitsToMatrix(payload.matrixBits, payload.matrixSize);
  return { payload, matrix };
}

export function makeShareUrl(origin: string, payload: SharedGardenPayload, basePath = "") {
  const encoded = encodeSharedGarden(payload);
  const normalizedBasePath = basePath && basePath !== "/" ? `/${basePath.replace(/^\/+|\/+$/g, "")}` : "";
  return `${origin}${normalizedBasePath}/share/?garden=${encodeURIComponent(encoded)}`;
}
