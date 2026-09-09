import type { Metadata, Viewport } from "next";
import "./globals.css";


export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#B6DDFE",
};

export const metadata: Metadata = {
  title: "QR Voxel Studio",
  description: "Jardines voxel estacionales que revelan un QR compartible desde el cielo.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
