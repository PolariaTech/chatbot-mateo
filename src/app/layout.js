import "../styles/globals.css";
import PWARegister from "../components/PWARegister";

export const metadata = {
  applicationName: "Polaria AI",
  title: "Polaria AI",
  description: "Asistente Virtual Mateo - Polaria Tech",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Polaria AI",
  },
  icons: {
    icon: [
      { url: "/icon-192.svg", sizes: "192x192", type: "image/svg+xml" },
      { url: "/icon-512.svg", sizes: "512x512", type: "image/svg+xml" },
    ],
    apple: [{ url: "/icon-192.svg", sizes: "192x192", type: "image/svg+xml" }],
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#020609",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        {children}
        <PWARegister />
      </body>
    </html>
  );
}
