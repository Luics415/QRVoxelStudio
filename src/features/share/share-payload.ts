import type { QRMatrix, VisualProfile } from "@/models/qr-slot";

export interface SharedGardenPayloadV1 {
  version: 1;
  fileName: string;
  decodedContent: string | null;
  matrixSize: number;
  matrixBits: string;
  theme: VisualProfile["theme"];
}

export interface SharedGardenPayloadV2 {
  version: 2;
  fileName: string;
  decodedContent: string | null;
  matrixSize: number;
  matrixData: string;
  theme: VisualProfile["theme"];
}

export type SharedGardenPayload = SharedGardenPayloadV1 | SharedGardenPayloadV2;

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

function packMatrix(matrix: QRMatrix) {
  const size = matrix.length;
  const totalBits = size * size;
  const bytes = new Uint8Array(Math.ceil(totalBits / 8));
  let bitIndex = 0;

  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      if (matrix[row]?.[col]) {
        const byteIndex = Math.floor(bitIndex / 8);
        const shift = 7 - (bitIndex % 8);
        bytes[byteIndex] |= 1 << shift;
      }
      bitIndex += 1;
    }
  }

  return bytesToBase64Url(bytes);
}

function unpackMatrix(encoded: string, size: number): QRMatrix {
  if (!Number.isInteger(size) || size <= 0) {
    throw new Error("El enlace compartido contiene una matriz QR inválida.");
  }

  const bytes = base64UrlToBytes(encoded);
  const requiredBytes = Math.ceil((size * size) / 8);
  if (bytes.length !== requiredBytes) {
    throw new Error("El enlace compartido contiene datos QR incompletos.");
  }

  const matrix: QRMatrix = [];
  let bitIndex = 0;
  for (let row = 0; row < size; row += 1) {
    const outputRow: Array<0 | 1> = [];
    for (let col = 0; col < size; col += 1) {
      const byteIndex = Math.floor(bitIndex / 8);
      const shift = 7 - (bitIndex % 8);
      outputRow.push(((bytes[byteIndex] >> shift) & 1) === 1 ? 1 : 0);
      bitIndex += 1;
    }
    matrix.push(outputRow);
  }
  return matrix;
}

export function createSharedGardenPayload(input: {
  matrix: QRMatrix;
  fileName: string;
  decodedContent: string | null;
  theme: VisualProfile["theme"];
}): SharedGardenPayloadV2 {
  return {
    version: 2,
    fileName: input.fileName,
    decodedContent: input.decodedContent,
    matrixSize: input.matrix.length,
    matrixData: packMatrix(input.matrix),
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

  if (payload.version === 1) {
    const matrix = bitsToMatrix(payload.matrixBits, payload.matrixSize);
    return { payload, matrix };
  }

  if (payload.version === 2) {
    const matrix = unpackMatrix(payload.matrixData, payload.matrixSize);
    return { payload, matrix };
  }

  throw new Error("Esta versión de jardín compartido todavía no es compatible.");
}

export function makeShareUrl(origin: string, payload: SharedGardenPayload, basePath = "") {
  const encoded = encodeSharedGarden(payload);
  const normalizedBasePath = basePath && basePath !== "/" ? `/${basePath.replace(/^\/+|\/+$/g, "")}` : "";
  return `${origin}${normalizedBasePath}/share/?garden=${encodeURIComponent(encoded)}`;
}
