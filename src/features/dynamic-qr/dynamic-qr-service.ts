import { doc, getDoc, setDoc, updateDoc, increment } from "firebase/firestore";
import { getDb, isFirebaseConfigured } from "@/lib/firebase";
import { validateAndSanitizeUrl, sanitizePlainText } from "@/lib/security";
import type { DynamicQRRecord, QRExpirationOption, QRBehaviorMode, VisualProfile } from "@/models/qr-slot";

const LOCAL_STORAGE_KEY = "qrvoxel_created_qrs";

export const DURATION_MS_MAP: Record<QRExpirationOption, number> = {
  "5m": 5 * 60 * 1000,                      // 5 minutos (prueba)
  "1m": 30 * 24 * 60 * 60 * 1000,           // 30 días
  "3m": 90 * 24 * 60 * 60 * 1000,           // 90 días
  "6m": 180 * 24 * 60 * 60 * 1000,          // 180 días
  "1y": 365 * 24 * 60 * 60 * 1000,          // 1 año (365 días)
};

export const DURATION_LABELS: Record<QRExpirationOption, string> = {
  "5m": "5 minutos (Prueba)",
  "1m": "1 mes (30 días)",
  "3m": "3 meses (90 días)",
  "6m": "6 meses (180 días)",
  "1y": "12 meses (1 año)",
};

function generateShortId(length = 7): string {
  const chars = "23456789abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";
  let result = "";
  const randomValues = new Uint8Array(length);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(randomValues);
    for (let i = 0; i < length; i++) {
      result += chars[randomValues[i] % chars.length];
    }
  } else {
    for (let i = 0; i < length; i++) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }
  }
  return result;
}

export function encodePayload(record: DynamicQRRecord): string {
  try {
    const compact = [
      record.targetUrl,
      record.expiresAt,
      record.mode === "voxel" ? 1 : 0,
      record.title || "",
      record.voxelTheme || "spring",
      record.durationKey || "1y",
    ];
    return btoa(encodeURIComponent(JSON.stringify(compact)));
  } catch {
    return "";
  }
}

export function decodePayload(id: string, payload: string): DynamicQRRecord | null {
  try {
    const jsonStr = decodeURIComponent(atob(payload));
    const [targetUrl, expiresAt, modeNum, title, voxelTheme, durationKey] = JSON.parse(jsonStr);
    if (!targetUrl || typeof expiresAt !== "number") return null;
    return {
      id,
      targetUrl,
      expiresAt,
      mode: modeNum === 1 ? "voxel" : "direct",
      title: title || "QR Voxel",
      voxelTheme: voxelTheme || "spring",
      durationKey: durationKey || "1y",
      createdAt: expiresAt - (DURATION_MS_MAP[durationKey as QRExpirationOption] || DURATION_MS_MAP["1y"]),
      scanCount: 0,
      isActive: true,
    };
  } catch {
    return null;
  }
}

export function getLocalQRs(): DynamicQRRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalQR(record: DynamicQRRecord) {
  if (typeof window === "undefined") return;
  try {
    const current = getLocalQRs().filter((item) => item.id !== record.id);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify([record, ...current]));
  } catch {
    // Ignorar errores de almacenamiento local
  }
}

export interface CreateDynamicQROptions {
  targetUrl: string;
  durationKey: QRExpirationOption;
  mode: QRBehaviorMode;
  title?: string;
  voxelTheme?: VisualProfile["theme"];
}

/**
 * Crea un nuevo registro de QR temporal en Firebase Firestore (y respaldo local).
 */
export async function createTemporalQR(options: CreateDynamicQROptions): Promise<DynamicQRRecord> {
  const validation = validateAndSanitizeUrl(options.targetUrl);
  if (!validation.isValid || !validation.sanitizedUrl) {
    throw new Error(validation.error || "URL de destino inválida.");
  }

  const durationMs = DURATION_MS_MAP[options.durationKey] ?? DURATION_MS_MAP["1y"];
  const now = Date.now();
  const expiresAt = now + durationMs;
  const id = generateShortId();

  const record: DynamicQRRecord = {
    id,
    targetUrl: validation.sanitizedUrl,
    title: sanitizePlainText(options.title || "QR Voxel", 60),
    mode: options.mode,
    createdAt: now,
    expiresAt,
    durationKey: options.durationKey,
    scanCount: 0,
    isActive: true,
    voxelTheme: options.voxelTheme || "spring",
  };

  // Guardar en Firestore si está configurado
  const db = getDb();
  if (db && isFirebaseConfigured()) {
    try {
      const docRef = doc(db, "qrs", id);
      await setDoc(docRef, record);
    } catch (e) {
      console.warn("No se pudo guardar en Firestore, utilizando almacenamiento local:", e);
    }
  }

  // Siempre respaldar en local
  saveLocalQR(record);

  return record;
}

export interface ResolvedQRResult {
  record: DynamicQRRecord | null;
  status: "active" | "expired" | "not_found";
  remainingMs: number;
}

/**
 * Resuelve un QR por su ID, determinando si está activo, caducado o no encontrado.
 */
export async function resolveQR(id: string, searchParamsPayload?: string): Promise<ResolvedQRResult> {
  if (!id || typeof id !== "string") {
    return { record: null, status: "not_found", remainingMs: 0 };
  }

  let record: DynamicQRRecord | null = null;
  const db = getDb();

  if (db && isFirebaseConfigured()) {
    try {
      const docRef = doc(db, "qrs", id);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        record = snapshot.data() as DynamicQRRecord;
      }
    } catch (e) {
      console.warn("Error al consultar Firestore, buscando en respaldo local:", e);
    }
  }

  // Fallback a almacenamiento local si no se encontró en Firestore
  if (!record) {
    const localMatches = getLocalQRs();
    const found = localMatches.find((item) => item.id === id);
    if (found) record = found;
  }

  // Fallback a payload portátil en URL (para GitHub Pages sin backend)
  if (!record && searchParamsPayload) {
    const fromPayload = decodePayload(id, searchParamsPayload);
    if (fromPayload) {
      record = fromPayload;
      saveLocalQR(fromPayload);
    }
  }

  if (!record) {
    return { record: null, status: "not_found", remainingMs: 0 };
  }

  const now = Date.now();
  const remainingMs = Math.max(0, record.expiresAt - now);
  const isExpired = now >= record.expiresAt || !record.isActive;

  return {
    record,
    status: isExpired ? "expired" : "active",
    remainingMs,
  };
}

/**
 * Registra un escaneo / visita atómica en Firestore y almacenamiento local.
 */
export async function trackScan(id: string) {
  const db = getDb();
  if (db && isFirebaseConfigured()) {
    try {
      const docRef = doc(db, "qrs", id);
      await updateDoc(docRef, {
        scanCount: increment(1),
      });
    } catch (e) {
      console.warn("No se pudo actualizar contador de escaneos en Firestore:", e);
    }
  }

  // Actualizar también en local
  try {
    const localQRs = getLocalQRs();
    const updated = localQRs.map((item) => {
      if (item.id === id) {
        return { ...item, scanCount: item.scanCount + 1 };
      }
      return item;
    });
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Ignorar
  }
}

/**
 * Construye el enlace corto público para el QR.
 */
export function buildRedirectUrl(id: string, record?: DynamicQRRecord): string {
  let query = `?id=${id}`;
  if (record) {
    const payload = encodePayload(record);
    if (payload) query += `&p=${payload}`;
  }

  if (typeof window === "undefined") {
    return `/r/${query}`;
  }

  const customDomain = process.env.NEXT_PUBLIC_APP_DOMAIN;
  if (customDomain) {
    const cleanDomain = customDomain.replace(/\/+$/, "");
    return `${cleanDomain}/r/${query}`;
  }

  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
  return `${window.location.origin}${basePath}/r/${query}`;
}
