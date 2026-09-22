import { createAmbientAudioSession, type AmbientAudioSession } from "./audio-synthesizer";

export type VideoExportResult = {
  blob: Blob;
  extension: "mp4" | "webm";
  hasAudio: boolean;
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
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function getSceneCanvas(rootSelector = ".v15ScenePane"): HTMLCanvasElement | null {
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

function pickVideoMimeType(withAudio = true): string {
  if (typeof MediaRecorder === "undefined") return "";

  const candidatesWithAudio = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
    "video/mp4",
  ];

  const candidatesWithoutAudio = [
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
    "video/mp4",
  ];

  const candidates = withAudio ? candidatesWithAudio : candidatesWithoutAudio;
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) || "";
}

/**
 * Graba el jardín 3D como video con sincronización fluida y música ambiental sintetizada.
 */
export async function recordSceneVideo(
  canvas: HTMLCanvasElement,
  durationMs = 13200,
  fps = 30,
  includeMusic = true,
): Promise<VideoExportResult> {
  if (!("captureStream" in canvas) || typeof MediaRecorder === "undefined") {
    throw new Error("Este navegador no dispone de soporte para grabar el jardín en video.");
  }

  // Capturar el stream de video del canvas WebGL
  const canvasStream = canvas.captureStream(fps);
  if (!canvasStream || canvasStream.getVideoTracks().length === 0) {
    throw new Error("No se pudo iniciar la captura visual del lienzo.");
  }

  // Generar pista de audio ambiental relajante
  let audioSession: AmbientAudioSession | null = null;
  if (includeMusic) {
    audioSession = createAmbientAudioSession(durationMs);
  }

  const tracks: MediaStreamTrack[] = [...canvasStream.getVideoTracks()];
  if (audioSession?.track) {
    tracks.push(audioSession.track);
  }

  const combinedStream = new MediaStream(tracks);
  const mimeType = pickVideoMimeType(Boolean(audioSession?.track));
  const options: MediaRecorderOptions = {
    videoBitsPerSecond: 6_000_000,
  };
  if (mimeType) {
    options.mimeType = mimeType;
  }

  const recorder = new MediaRecorder(combinedStream, options);
  const chunks: BlobPart[] = [];

  const recordingPromise = new Promise<Blob>((resolve, reject) => {
    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        chunks.push(event.data);
      }
    };

    recorder.onerror = () => {
      audioSession?.stop();
      reject(new Error("La grabación del video se interrumpió inesperadamente."));
    };

    recorder.onstop = () => {
      audioSession?.stop();
      const outputType = recorder.mimeType || mimeType || "video/webm";
      resolve(new Blob(chunks, { type: outputType }));
    };
  });

  // Empezar grabación emitiendo bloques cada 250ms
  recorder.start(250);

  // Detener de forma limpia al cumplirse la duración
  window.setTimeout(() => {
    if (recorder.state !== "inactive") {
      try {
        recorder.stop();
      } catch {
        // Ignorar
      }
    }
  }, durationMs);

  const blob = await recordingPromise;

  // Limpiar todas las pistas del stream
  combinedStream.getTracks().forEach((track) => {
    try {
      track.stop();
    } catch {
      // Ignorar
    }
  });

  const isMp4 = blob.type.includes("mp4");
  return {
    blob,
    extension: isMp4 ? "mp4" : "webm",
    hasAudio: Boolean(audioSession?.track),
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
