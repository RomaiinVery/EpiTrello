import "./globals.css";
import { Providers } from "@/components/Providers";
import { AppLayout } from "@/components/AppLayout"; 

export const metadata = {
  title: "EpiTrello",
  description: "Manage your projects with ease",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      {/* On enlève les classes CSS ici, elles sont gérées dans AppLayout */}
      <body>
        <Providers>
          {/* AppLayout décide si on affiche la Sidebar ou non */}
          <AppLayout>
            {children}
          </AppLayout>
        </Providers>
      </body>
    </html>
  );
}