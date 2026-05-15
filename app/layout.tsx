import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Antarex Backup Control",
  description: "Cloud and on-prem backup, replication, and restore control plane"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
