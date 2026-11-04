import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistSerif } from "geist/font/serif";
import { GeistMono } from "geist/font/mono";
import Script from "next/script";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { AgentationProvider } from "@/components/providers/AgentationProvider";
import { LenisProvider } from "@/components/providers/LenisProvider";
import "./globals.css";


export const metadata: Metadata = {
  title: "arak",
  description: "A focused writing space",
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><text y='26' font-size='24' font-family='serif'>a</text></svg>",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistSerif.variable} ${GeistMono.variable}`}
    >
      <head>
        {/* Anti-FOUC: apply saved theme before hydration */}
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=JSON.parse(localStorage.getItem('arak-editor')||'{}');var t=s&&s.state&&s.state.theme;if(t&&t!=='light')document.documentElement.dataset.theme=t}catch(e){}})();`,
          }}
        />
      </head>
      <body>
        <LenisProvider />
        <SessionProvider>{children}</SessionProvider>
        <AgentationProvider />
      </body>
    </html>
  );
}
