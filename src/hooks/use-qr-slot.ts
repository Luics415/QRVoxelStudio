"use client";

import { useCallback, useEffect, useState } from "react";
import { processQRFile } from "@/features/qr-engine/process-qr";
import { reconstructQRMatrix } from "@/features/qr-engine/reconstruct-qr";
import {
  buildRedirectUrl,
  createTemporalQR,
  type CreateDynamicQROptions,
} from "@/features/dynamic-qr/dynamic-qr-service";
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
          originType: "file",
          dynamicRecord: null,
          originalFile: file,
          originalPreviewUrl: previewUrl,
          decodedContent: processed.decodedContent,
          qrMatrix: processed.matrix,
          version: current.version + 1,
          status: "ready",
          error: null,
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

  const createFromUrl = useCallback(async (options: CreateDynamicQROptions) => {
    setSlot((current) => ({
      ...current,
      status: "loading",
      error: null,
    }));

    try {
      const record = await createTemporalQR({
        ...options,
        voxelTheme: slot.visualProfile.theme,
      });

      const redirectUrl = buildRedirectUrl(record.id, record);
      const matrix = reconstructQRMatrix(redirectUrl);

      setSlot((current) => {
        if (current.originalPreviewUrl) {
          URL.revokeObjectURL(current.originalPreviewUrl);
        }

        return {
          ...current,
          originType: "url",
          dynamicRecord: record,
          originalFile: null,
          originalPreviewUrl: null,
          decodedContent: redirectUrl,
          qrMatrix: matrix,
          version: current.version + 1,
          status: "ready",
          error: null,
        };
      });

      return record;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al crear el código QR.";
      setSlot((current) => ({
        ...current,
        status: "error",
        error: message,
      }));
      throw error;
    }
  }, [slot.visualProfile.theme]);

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
    createFromUrl,
    updateVisualProfile,
    resetQR,
  };
}
