import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, Source_Serif_4 } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { AuthSessionProvider } from "@/components/auth/session-provider";
import { Toaster } from "sonner";

const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  weight: ["600", "700"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: {
    default: "CryoLink",
    template: "%s · CryoLink",
  },
  description: "CryoLink — polar expedition logistics and mission control for MoES / NCPOR.",
  applicationName: "CryoLink",
  openGraph: {
    title: "CryoLink",
    description: "CryoLink logistics and mission control",
    siteName: "CryoLink",
  },
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#122238" },
    { media: "(prefers-color-scheme: light)", color: "#5eb8e8" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${plexSans.variable} ${sourceSerif.variable} ${plexMono.variable} light h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full">
        <AuthSessionProvider>
          <ThemeProvider>
            {children}
            <Toaster position="top-center" richColors closeButton />
          </ThemeProvider>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
