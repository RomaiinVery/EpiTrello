import "./globals.css";
import { Providers } from "@/components/Providers";
import { AppLayout } from "@/components/AppLayout"; 

export const metadata = {
  title: "EpiTrello",
  description: "Manage your projects with ease",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const stored = localStorage.getItem('epitrello-theme');
                  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  const theme = stored && ['light', 'dark', 'system'].includes(stored) ? stored : 'system';
                  const effective = theme === 'system' ? (prefersDark ? 'dark' : 'light') : theme;
                  if (effective === 'dark') {
                    document.documentElement.classList.add('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
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