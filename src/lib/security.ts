/**
 * Utilidades de seguridad para QRVoxelStudio:
 * - Validación y sanitización estricta de URLs (prevención de XSS y open redirects peligrosos)
 * - Sanitización de texto para metadatos
 */

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

export interface ValidationResult {
  isValid: boolean;
  sanitizedUrl?: string;
  error?: string;
}

/**
 * Valida y sanitiza una URL de destino para los códigos QR.
 * Solo se permiten protocolos http y https válidos.
 * Rechaza esquemas potencialmente peligrosos como javascript:, data:, blob:, file:, etc.
 */
export function validateAndSanitizeUrl(rawInput: string): ValidationResult {
  if (!rawInput || typeof rawInput !== "string") {
    return { isValid: false, error: "La URL no puede estar vacía." };
  }

  const trimmed = rawInput.trim();

  // Si no tiene protocolo, intentamos asumir https://
  let candidate = trimmed;
  if (!/^[a-zA-Z][a-zA-Z\d+\-.]*?:/.test(trimmed)) {
    candidate = `https://${trimmed}`;
  }

  try {
    const parsed = new URL(candidate);

    if (!ALLOWED_PROTOCOLS.has(parsed.protocol.toLowerCase())) {
      return {
        isValid: false,
        error: `Protocolo no permitido (${parsed.protocol}). Usa https:// o http://`,
      };
    }

    // Comprobar que tiene un hostname válido
    if (!parsed.hostname || !parsed.hostname.includes(".")) {
      // Permitir localhost solo para desarrollo
      if (parsed.hostname !== "localhost") {
        return {
          isValid: false,
          error: "El dominio ingresado no parece ser válido.",
        };
      }
    }

    // Prevenir caracteres de control o inyecciones
    const normalized = parsed.toString();
    if (/[\u0000-\u001F\u007F-\u009F]/.test(normalized)) {
      return { isValid: false, error: "La URL contiene caracteres no válidos." };
    }

    return { isValid: true, sanitizedUrl: normalized };
  } catch {
    return { isValid: false, error: "Formato de URL inválido." };
  }
}

/**
 * Sanitiza texto simple (títulos, etiquetas) para prevenir inyecciones HTML / XSS.
 */
export function sanitizePlainText(text: string, maxLength = 80): string {
  if (!text) return "";
  return text
    .replace(/[<>&"']/g, (char) => {
      switch (char) {
        case "<": return "&lt;";
        case ">": return "&gt;";
        case "&": return "&amp;";
        case '"': return "&quot;";
        case "'": return "&#39;";
        default: return char;
      }
    })
    .trim()
    .slice(0, maxLength);
}
