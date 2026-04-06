import { AuthProvider } from "@/hooks/useAuth";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata = {
  title: "Ascencio CRM",
  description: "Performance agency lead management",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {/* Set theme before first paint to prevent flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('ascencio_theme')||'dark';document.documentElement.setAttribute('data-theme',t);})();`,
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Syne:wght@500;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;1,9..40,300&family=DM+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AuthProvider>{children}</AuthProvider>
        <Toaster
          richColors
          position="top-right"
          toastOptions={{
            style: {
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 13,
              borderRadius: 10,
            },
          }}
        />
      </body>
    </html>
  );
}
