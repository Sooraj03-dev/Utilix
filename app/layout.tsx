import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth/context";
import { RoleProvider } from "@/components/RoleContext";
import { ToastProvider } from "@/components/ToastContext";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

const font = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Utilix — Share. Use. Build. | Smart Campus & Community Resource Sharing",
  description:
    "Utilix makes it easy to discover, share, borrow, and use underutilized technical equipment, makerspaces, and labs with transparent algorithmic fairness.",
  keywords: [
    "Utilix",
    "Share Use Build",
    "equipment sharing",
    "resource sharing",
    "fair allocation",
    "makerspace",
    "3d printer",
    "electronics lab",
    "media studio",
  ],
  authors: [{ name: "Utilix Core Brand & Engineering Team" }],
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={font.variable}>
      <body className="min-h-screen flex flex-col font-sans text-[#111111] antialiased">
        <AuthProvider>
          <RoleProvider>
            <ToastProvider>
              <div className="flex flex-col min-h-screen">
                <Navbar />
                <main className="flex-1">{children}</main>
                <Footer />
              </div>
            </ToastProvider>
          </RoleProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
