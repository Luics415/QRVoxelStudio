"use client";

import { useCallback, useEffect, useState } from "react";
import { processQRFile } from "@/features/qr-engine/process-qr";
import {
  createEmptyQRSlot,
  type QRSlot,
  type VisualProfile,
} from "@/models/qr-slot";

export function useQRSlot() {
  const [slot, setSlot] = useState<QRSlot>(() => createEmptyQRSlot());

  useEffect(() => {
    return () => {
      if (slot.originalPreviewUrl) {
        URL.revokeObjectURL(slot.originalPreviewUrl);
      }
    };
  }, [slot.originalPreviewUrl]);

  const replaceQR = useCallback(async (file: File) => {
    setSlot((current) => ({
      ...current,
      status: "loading",
      error: null,
    }));

    try {
      const processed = await processQRFile(file);
      const previewUrl = URL.createObjectURL(file);

      setSlot((current) => {
        if (current.originalPreviewUrl) {
          URL.revokeObjectURL(current.originalPreviewUrl);
        }

        return {
          ...current,
          originalFile: file,
          originalPreviewUrl: previewUrl,
          decodedContent: processed.decodedContent,
          qrMatrix: processed.matrix,
          version: current.version + 1,
          status: "ready",
          error: null,
          // visualProfile se conserva deliberadamente.
        };
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error desconocido.";
      setSlot((current) => ({
        ...current,
        status: "error",
        error: message,
      }));
    }
  }, []);

  const updateVisualProfile = useCallback((patch: Partial<VisualProfile>) => {
    setSlot((current) => ({
      ...current,
      visualProfile: {
        ...current.visualProfile,
        ...patch,
      },
    }));
  }, []);

  const resetQR = useCallback(() => {
    setSlot((current) => {
      if (current.originalPreviewUrl) {
        URL.revokeObjectURL(current.originalPreviewUrl);
      }

      return {
        ...createEmptyQRSlot(),
        id: current.id,
        visualProfile: current.visualProfile,
      };
    });
  }, []);

  return {
    slot,
    replaceQR,
    updateVisualProfile,
    resetQR,
  };
}
