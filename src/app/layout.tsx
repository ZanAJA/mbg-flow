import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "@/shared/components/providers";

const jakartaSans = Plus_Jakarta_Sans({
  variable: "--font-jakarta-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "MBG Flow",
  description:
    "Sistem SPPG: lot bahan baku, rekomendasi menu, produksi paralel, delivery batch sekolah, dan countdown batas aman konsumsi.",
  icons: {
    icon: [{ url: "/logo-mbgflow.png", type: "image/png" }],
    apple: "/logo-mbgflow.png",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      className={`${jakartaSans.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
