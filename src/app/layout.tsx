import type { Metadata, Viewport } from "next";
import "./globals.css";

const SITE_URL = "https://luics415.github.io/QRVoxelStudio/";
const SOCIAL_IMAGE = "https://luics415.github.io/QRVoxelStudio/brand/qr-voxel-studio-social-v2.jpg";

export const metadata: Metadata = {
  metadataBase: new URL("https://luics415.github.io/"),
  title: "QR Voxel Studio",
  description: "Convierte un QR en un jardín voxel estacional, anímalo y compártelo desde el cielo.",
  applicationName: "QR Voxel Studio",
  alternates: {
    canonical: SITE_URL,
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "QR Voxel Studio",
    description: "Tu QR convertido en un jardín voxel vivo y compartible.",
    url: SITE_URL,
    siteName: "QR Voxel Studio",
    type: "website",
    locale: "es_MX",
    images: [
      {
        url: SOCIAL_IMAGE,
        width: 1200,
        height: 630,
        type: "image/jpeg",
        alt: "Luics415 · QR Voxel Studio",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "QR Voxel Studio",
    description: "Tu QR convertido en un jardín voxel vivo y compartible.",
    images: [SOCIAL_IMAGE],
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
