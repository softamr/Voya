
"use client"; // Make this a client component to use usePathname

import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import AuthChecker from '@/components/auth/AuthChecker';
import { Toaster } from "@/components/ui/toaster";
import { LanguageProvider } from '@/contexts/LanguageContext';

// Import Header, Footer, usePathname and cn
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const isAdminPage = pathname.startsWith('/admin');

  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Voya - Internal Trip Management</title>
        <meta name="description" content="Manage your internal trips efficiently with Voya." />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=PT+Sans:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <LanguageProvider>
          <AuthProvider>
            <AuthChecker>
              <div className={cn("flex flex-col", !isAdminPage && "min-h-screen")}>
                {!isAdminPage && <Header />}
                <main className={cn(!isAdminPage && "flex-grow")}>
                  {children}
                </main>
                {!isAdminPage && <Footer />}
              </div>
            </AuthChecker>
          </AuthProvider>
        </LanguageProvider>
        <Toaster />
      </body>
    </html>
  );
}

// Removed the static metadata export as it's not allowed in a "use client" component.
// The title, description, and font links are handled directly in the <head> above.
