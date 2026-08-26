import type { Metadata } from "next";
import "./globals.css";
import Backdrop from "@/components/Backdrop";

export const metadata: Metadata = {
  title: "Seismic Quiz — Live Real-time Quiz Platform",
  description:
    "Host live quiz competitions in real time. Design questions as the host, players join with a room code, and the leaderboard updates after every question.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen font-sans text-white antialiased">
        <Backdrop />
        {children}
      </body>
    </html>
  );
}
