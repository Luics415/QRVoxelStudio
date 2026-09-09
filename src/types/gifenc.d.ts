declare module "gifenc" {
  type GifFrameOptions = {
    palette: number[] | Uint8Array;
    delay?: number;
    repeat?: number;
  };

  type GifEncoder = {
    writeFrame(index: Uint8Array, width: number, height: number, options: GifFrameOptions): void;
    finish(): void;
    bytes(): Uint8Array;
  };

  export function GIFEncoder(): GifEncoder;
  export function quantize(data: Uint8ClampedArray, maxColors: number, options?: { format?: string }): number[] | Uint8Array;
  export function applyPalette(data: Uint8ClampedArray, palette: number[] | Uint8Array, format?: string): Uint8Array;
}