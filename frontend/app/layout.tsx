import type { Metadata } from "next";
import { IBM_Plex_Sans_Thai } from "next/font/google";
import { Providers } from "@/components/Providers";
import "./globals.css";

// ฝังไฟล์ฟอนต์ตอน build (ไม่โหลดจาก Google ตอนใช้งาน) — ใช้ได้แม้เครื่องไม่ต่ออินเทอร์เน็ต
const plex = IBM_Plex_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "1n9 Match",
  description: "Check documents against your criteria, powered by the 1n9 AI engine",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={plex.variable}>
      <body className="font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
