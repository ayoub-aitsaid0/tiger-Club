import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import I18nProvider from "@/components/I18nProvider";

export const metadata: Metadata = {
  title: "Tiger Club – Gestion des Réservations",
  description: "Système de gestion de réservations pour Tiger Club",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" dir="ltr">
      <body>
        <I18nProvider>
          {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#16161f',
              color: '#f1f5f9',
              border: '1px solid rgba(249,115,22,0.3)',
              borderRadius: '10px',
              fontSize: '0.875rem',
            },
            success: { iconTheme: { primary: '#22c55e', secondary: '#fff' } },
            error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
          }}
        />
        </I18nProvider>
      </body>
    </html>
  );
}
