import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { Providers } from "@/components/Providers";
import { Sidebar } from "@/components/Sidebar";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="flex h-screen bg-gray-50 text-gray-900">
        <Providers>
          <Sidebar />
          <div className="flex flex-col flex-1">
            <Navbar />
            <main className="flex-1 p-6 overflow-auto">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}