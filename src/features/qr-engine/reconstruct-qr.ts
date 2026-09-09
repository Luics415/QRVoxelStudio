import QRCode from "qrcode";
import type { QRMatrix } from "@/models/qr-slot";

interface QRCodeInternalMatrix {
  size: number;
  data: Uint8Array | number[];
}

interface QRCodeInternalResult {
  modules: QRCodeInternalMatrix;
}

export function reconstructQRMatrix(content: string): QRMatrix {
  const created = QRCode.create(content, {
    errorCorrectionLevel: "M",
  }) as unknown as QRCodeInternalResult;

  const size = created.modules.size;
  const data = Array.from(created.modules.data, (value) => (value ? 1 : 0));

  return Array.from({ length: size }, (_, row) =>
    data.slice(row * size, row * size + size),
  );
}
