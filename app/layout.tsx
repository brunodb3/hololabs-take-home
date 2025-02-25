import "./globals.css";
import type { Metadata } from "next";
import localFont from "next/font/local";

const titleFont = localFont({
  src: "../public/fonts/Title_Gustavo-Bold.woff2",
  variable: "--font-title",
});

const buttonFont = localFont({
  src: "../public/fonts/Button_ClashGrotesk-Semibold.woff2",
  variable: "--font-button",
});

const bodyFont = localFont({
  src: "../public/fonts/Body_TWKLausannePan-300.woff2",
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "VRM Face Tracking Demo",
  description: "Created by brunodb3 for an interview process at Hololabs",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${titleFont.variable} ${buttonFont.variable} ${bodyFont.variable}`}
    >
      <body className={bodyFont.className}>{children}</body>
    </html>
  );
}
