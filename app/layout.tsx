import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Agent Desk",
  description: "Internal desk for the MRET 1 agents in n8n",
  robots: { index: false, follow: false },
};

const VIEW_SCRIPT = `(function(){var d=document.documentElement,p="auto";try{p=localStorage.getItem("desk-view")||"auto"}catch(e){}if(p!=="laptop"&&p!=="wide")p="auto";function s(){d.dataset.view=p;d.dataset.layout=p==="auto"?(window.innerWidth>=1800?"wide":"laptop"):p}s();window.__deskView=function(n){p=n;try{localStorage.setItem("desk-view",n)}catch(e){}s()};window.addEventListener("resize",s)})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Applies the saved screen layout (Auto, Laptop or Wide) before the first paint. */}
        <script dangerouslySetInnerHTML={{ __html: VIEW_SCRIPT }} />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
