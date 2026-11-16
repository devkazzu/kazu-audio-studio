import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppProvider } from "@/components/providers";
import { StudioShell } from "@/components/audio-studio/StudioShell";
import "./globals.css";
import "./studio-theme.css";
export const metadata: Metadata = {
  title: {
    default: "KAZU AI — Your sound, reimagined",
    template: "%s · KAZU AI",
  },
  description:
    "Your creative space for audio-reactive visuals. Create music videos, customize visualizers, and bring your sound to life with KAZU Audio Studio.",
  applicationName: "KAZU AI",
  icons: { icon: "/icon.svg" },
};
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppProvider>
          <StudioShell>{children}</StudioShell>
        </AppProvider>
      </body>
    </html>
  );
}
