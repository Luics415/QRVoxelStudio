import { decodeQRFromFile } from "./decode-qr";
import { reconstructQRMatrix } from "./reconstruct-qr";

export interface ProcessedQR {
  decodedContent: string;
  matrix: number[][];
  sourceWidth: number;
  sourceHeight: number;
}

export async function processQRFile(file: File): Promise<ProcessedQR> {
  const decoded = await decodeQRFromFile(file);
  const matrix = reconstructQRMatrix(decoded.data);

  return {
    decodedContent: decoded.data,
    matrix,
    sourceWidth: decoded.sourceWidth,
    sourceHeight: decoded.sourceHeight,
  };
}
