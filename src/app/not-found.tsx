
"use client";

import type { NextPage } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Home } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext'; // Import useLanguage

const NotFoundPage: NextPage = () => {
  const [currentYear, setCurrentYear] = useState<number | null>(null);
  const { appName, direction } = useLanguage(); // Use language context

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  const pageTitle = direction === 'rtl' ? "صفحة غير موجودة" : "Page Not Found";
  const message = direction === 'rtl' ? "عفواً! الصفحة التي تبحث عنها غير موجودة أو تم نقلها." : "Oops! The page you are looking for doesn't exist or has been moved.";
  const buttonText = direction === 'rtl' ? "العودة للرئيسية" : "Go Back to Homepage";
  const copyrightText = direction === 'rtl' ? `${appName}. جميع الحقوق محفوظة.` : `${appName}. All rights reserved.`;


  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 text-center">
      <div className="max-w-md w-full">
        <AlertTriangle className="mx-auto h-24 w-24 text-primary mb-8" />
        <h1 className="text-6xl font-headline font-bold text-primary mb-4">404</h1>
        <h2 className="text-3xl font-semibold mb-6 text-foreground">{pageTitle}</h2>
        <p className="text-lg text-muted-foreground mb-10">
          {message}
        </p>
        <Button asChild size="lg">
          <Link href="/">
            {direction === 'ltr' && <Home className="mr-2 h-5 w-5" />}
            {buttonText}
            {direction === 'rtl' && <Home className="ml-2 h-5 w-5" />}
          </Link>
        </Button>
        <p className="mt-12 text-sm text-muted-foreground">
          &copy; {currentYear} {copyrightText}
        </p>
      </div>
    </div>
  );
};

export default NotFoundPage;
