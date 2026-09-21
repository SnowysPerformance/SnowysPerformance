import type { Viewport } from "next";
import "./globals.css";
import InstallPrompt from "@/components/InstallPrompt";

export const metadata = {
  title: "Snowy's Performance",
  // Deliberately NOT setting `manifest: "/manifest.json"` here — Next.js's
  // metadata API auto-adds crossOrigin="use-credentials" to the generated
  // <link rel="manifest"> tag (a known Next 14/15 behavior, see
  // https://github.com/vercel/next.js/discussions/65964). That tells the
  // browser it must fetch manifest.json with credentials in CORS mode, which
  // our server doesn't send the matching Access-Control-Allow-Credentials
  // header for — so the browser silently fails to validate the manifest,
  // which is exactly what breaks "Add to Home Screen" install trust on some
  // phones. manifest.json is a public file with nothing user-specific in it,
  // so it never needed credentials in the first place. We add the <link>
  // tag by hand below instead, with none of that.
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Snowy's Performance" },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icon-192.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#14161C",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="bg-void text-primary font-sans">
        {children}
        <InstallPrompt />
      </body>
    </html>
  );
}
