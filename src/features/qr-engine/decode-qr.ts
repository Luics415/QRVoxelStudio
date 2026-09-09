import jsQR from "jsqr";
import { normalizeImageFile } from "./normalize-image";

export interface DecodedQR {
  data: string;
  binaryData: number[];
  sourceWidth: number;
  sourceHeight: number;
}

export async function decodeQRFromFile(file: File): Promise<DecodedQR> {
  const { imageData, width, height } = await normalizeImageFile(file);

  const result = jsQR(imageData.data, width, height, {
    inversionAttempts: "attemptBoth",
  });

  if (!result) {
    throw new Error(
      "No pude detectar un QR válido en la imagen. Prueba con una imagen más nítida, frontal y con margen blanco alrededor.",
    );
  }

  return {
    data: result.data,
    binaryData: Array.from(result.binaryData),
    sourceWidth: width,
    sourceHeight: height,
  };
}
