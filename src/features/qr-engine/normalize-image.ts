const SUPPORTED_EXTENSIONS = [
  "png",
  "jpg",
  "jpeg",
  "webp",
  "svg",
  "bmp",
];

export function getFileExtension(file: File): string {
  return file.name.split(".").pop()?.toLowerCase() ?? "";
}

export function assertSupportedImage(file: File): void {
  const extension = getFileExtension(file);

  if (extension === "eps") {
    throw new Error(
      "EPS quedará soportado mediante conversión previa a SVG/PNG. En esta fase todavía no se procesa directamente en el navegador.",
    );
  }

  if (!SUPPORTED_EXTENSIONS.includes(extension)) {
    throw new Error(
      `Formato .${extension || "desconocido"} no soportado. Usa PNG, JPG, JPEG, WebP, SVG o BMP.`,
    );
  }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("No se pudo leer la imagen del QR."));
    img.src = url;
  });
}

export interface NormalizedQRImage {
  imageData: ImageData;
  width: number;
  height: number;
}

export async function normalizeImageFile(
  file: File,
  maxDimension = 2048,
): Promise<NormalizedQRImage> {
  assertSupportedImage(file);

  const url = URL.createObjectURL(file);

  try {
    const image = await loadImage(url);
    const naturalWidth = image.naturalWidth || image.width;
    const naturalHeight = image.naturalHeight || image.height;

    if (!naturalWidth || !naturalHeight) {
      throw new Error("La imagen no tiene dimensiones válidas.");
    }

    const scale = Math.min(1, maxDimension / Math.max(naturalWidth, naturalHeight));
    const width = Math.max(1, Math.round(naturalWidth * scale));
    const height = Math.max(1, Math.round(naturalHeight * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) {
      throw new Error("No se pudo inicializar el lienzo de análisis.");
    }

    // Fondo blanco para SVG/PNG con transparencia.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(image, 0, 0, width, height);

    return {
      imageData: ctx.getImageData(0, 0, width, height),
      width,
      height,
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}
