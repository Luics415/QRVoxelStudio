export type QRMatrix = number[][];

export type QRStatus =
  | "empty"
  | "loading"
  | "ready"
  | "error";

export interface VisualProfile {
  theme: "neutral" | "spring" | "summer" | "autumn" | "winter";
  moduleDepth: number;
  animationSpeed: number;
  cameraMode: "flat" | "isometric";
}

export interface QRSlot {
  id: string;
  originalFile: File | null;
  originalPreviewUrl: string | null;
  decodedContent: string | null;
  qrMatrix: QRMatrix;
  version: number;
  status: QRStatus;
  error: string | null;
  visualProfile: VisualProfile;
}

export const defaultVisualProfile: VisualProfile = {
  theme: "spring",
  moduleDepth: 1,
  animationSpeed: 1,
  cameraMode: "isometric",
};

export function createEmptyQRSlot(): QRSlot {
  return {
    id: crypto.randomUUID(),
    originalFile: null,
    originalPreviewUrl: null,
    decodedContent: null,
    qrMatrix: [],
    version: 0,
    status: "empty",
    error: null,
    visualProfile: defaultVisualProfile,
  };
}
