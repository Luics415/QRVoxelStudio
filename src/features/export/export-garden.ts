export type VideoExportResult = {
  blob: Blob;
  extension: "mp4" | "webm";
};

export type GifExportOptions = {
  durationMs?: number;
  fps?: number;
  maxWidth?: number;
};

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1200);
}

export function getSceneCanvas(rootSelector = ".v15ScenePane") {
  return document.querySelector(`${rootSelector} canvas`) as HTMLCanvasElement | null;
}

export function downloadScenePng(canvas: HTMLCanvasElement, filename = "qr-voxel-studio.png") {
  return new Promise<void>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("No pudimos crear la imagen del jardín."));
        return;
      }
      downloadBlob(blob, filename);
      resolve();
    }, "image/png", 1);
  });
}

function pickVideoMimeType() {
  if (typeof MediaRecorder === "undefined") return null;
  const candidates = [
    "video/mp4;codecs=avc1.42E01E",
    "video/mp4",
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
  ];
  return candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate)) ?? "";
}

export async function recordSceneVideo(
  canvas: HTMLCanvasElement,
  durationMs = 7600,
  fps = 30,
): Promise<VideoExportResult> {
  if (!("captureStream" in canvas) || typeof MediaRecorder === "undefined") {
    throw new Error("Este navegador todavía no permite grabar el jardín como video.");
  }

  const mimeType = pickVideoMimeType();
  if (mimeType === null) throw new Error("Este navegador no dispone de MediaRecorder.");

  const stream = canvas.captureStream(fps);
  const chunks: BlobPart[] = [];
  const recorder = new MediaRecorder(stream, mimeType ? { mimeType, videoBitsPerSecond: 7_000_000 } : undefined);

  const finished = new Promise<Blob>((resolve, reject) => {
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    recorder.onerror = () => reject(new Error("La grabación del video se interrumpió."));
    recorder.onstop = () => {
      const type = recorder.mimeType || mimeType || "video/webm";
      resolve(new Blob(chunks, { type }));
    };
  });

  recorder.start(250);
  window.setTimeout(() => {
    if (recorder.state !== "inactive") recorder.stop();
  }, durationMs);

  const blob = await finished;
  stream.getTracks().forEach((track) => track.stop());
  return {
    blob,
    extension: blob.type.includes("mp4") ? "mp4" : "webm",
  };
}

export function downloadVideoResult(result: VideoExportResult, filenameBase = "qr-voxel-studio") {
  downloadBlob(result.blob, `${filenameBase}.${result.extension}`);
}

export async function createSceneGif(
  canvas: HTMLCanvasElement,
  options: GifExportOptions = {},
): Promise<Blob> {
  const { GIFEncoder, quantize, applyPalette } = await import("gifenc");
  const durationMs = options.durationMs ?? 6200;
  const fps = Math.max(4, Math.min(12, options.fps ?? 8));
  const maxWidth = Math.max(280, Math.min(640, options.maxWidth ?? 480));
  const scale = Math.min(1, maxWidth / canvas.width);
  const width = Math.max(2, Math.round(canvas.width * scale));
  const height = Math.max(2, Math.round(canvas.height * scale));
  const frameDelay = Math.round(1000 / fps);
  const totalFrames = Math.max(2, Math.round(durationMs / frameDelay));

  const buffer = document.createElement("canvas");
  buffer.width = width;
  buffer.height = height;
  const context = buffer.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("No pudimos preparar el codificador GIF.");

  const gif = GIFEncoder();
  const startedAt = performance.now();

  for (let frame = 0; frame < totalFrames; frame += 1) {
    const expectedAt = startedAt + frame * frameDelay;
    const wait = expectedAt - performance.now();
    if (wait > 0) await new Promise((resolve) => window.setTimeout(resolve, wait));

    context.drawImage(canvas, 0, 0, width, height);
    const image = context.getImageData(0, 0, width, height);
    const palette = quantize(image.data, 192, { format: "rgb565" });
    const index = applyPalette(image.data, palette, "rgb565");
    gif.writeFrame(index, width, height, {
      palette,
      delay: frameDelay,
      ...(frame === 0 ? { repeat: 0 } : {}),
    });
  }

  gif.finish();
  const bytes = new Uint8Array(gif.bytes());
  return new Blob([bytes.buffer], { type: "image/gif" });
}

export function downloadGif(blob: Blob, filename = "qr-voxel-studio.gif") {
  downloadBlob(blob, filename);
}
