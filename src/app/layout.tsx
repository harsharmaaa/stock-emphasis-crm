import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { FloatingOrbs } from "@/src/components/layout/floating-orbs";
import { ToastProvider } from "@/src/components/ui/Toast";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Stock Emphasis CRM",
  description: "Enterprise CRM and Stock Management System with modern glassmorphism design.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-scroll-behavior="smooth"
      className={`${inter.variable} h-full antialiased`}
    >
      <head>
        {/* Synchronous script to prevent theme flash on refresh while preserving user preference */}
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='light'){document.documentElement.classList.remove('dark')}else{document.documentElement.classList.add('dark')}}catch(e){}})()`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col relative bg-background text-foreground transition-colors duration-200">
        <FloatingOrbs />
        <ToastProvider>
          <div className="relative z-10 flex-1 flex flex-col min-h-0">{children}</div>
        </ToastProvider>
      </body>
    </html>
  );
}
