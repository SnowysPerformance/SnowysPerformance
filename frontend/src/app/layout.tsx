import "./globals.css";

export const metadata = {
  title: "Snowy's Performance",
  manifest: "/manifest.json",
  themeColor: "#14161C",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Snowy's Performance" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900">{children}</body>
    </html>
  );
}
