import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "QR Voxel Studio",
  description: "Convierte un QR en un jardín voxel estacional, anímalo y compártelo desde el cielo.",
  openGraph: {
    title: "QR Voxel Studio",
    description: "Tu QR convertido en un jardín voxel vivo y compartible.",
    url: "https://luics415.github.io/QRVoxelStudio/",
    siteName: "QR Voxel Studio",
    images: [
      {
        url: "https://luics415.github.io/QRVoxelStudio/brand/qr-voxel-studio-social.png",
        width: 1200,
        height: 630,
        alt: "Luics415 · QR Voxel Studio",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "QR Voxel Studio",
    description: "Tu QR convertido en un jardín voxel vivo y compartible.",
    images: ["https://luics415.github.io/QRVoxelStudio/brand/qr-voxel-studio-social.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#B6DDFE",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
