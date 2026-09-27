/**
 * Utilidades de navegación seguras para QR Voxel Studio.
 * Garantizan que los enlaces hacia el generador principal siempre apunten
 * a la ruta correcta tanto en GitHub Pages (/QRVoxelStudio/) como en desarrollo local (/),
 * evitando errores 404 por prefijos duplicados de Next.js.
 */

export function getRootHref(): string {
  if (typeof window !== "undefined") {
    if (window.location.pathname.startsWith("/QRVoxelStudio")) {
      return "/QRVoxelStudio/";
    }
  }
  const envBasePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
  return envBasePath ? `${envBasePath}/` : "/";
}

export function getBasePath(): string {
  if (typeof window !== "undefined") {
    if (window.location.pathname.startsWith("/QRVoxelStudio")) {
      return "/QRVoxelStudio";
    }
  }
  return process.env.NEXT_PUBLIC_BASE_PATH || "";
}
