import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EatSafe HK (食環查) - Hong Kong Food Safety & License Tracker",
  description: "Real-time verification of FEHD restaurant hygiene licenses, demerit warnings, and suspension notices across Hong Kong.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
