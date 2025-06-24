"use client";

import { useLanguage } from '@/contexts/LanguageContext';

export default function Footer() {
  const { appName } = useLanguage();
  return (
    <footer className="bg-muted text-muted-foreground py-8 border-t">
      <div className="container mx-auto px-4 text-center">
        <p>&copy; {new Date().getFullYear()} {appName}. All rights reserved.</p>
        <p className="text-sm mt-2">Internal Trip Management System</p>
      </div>
    </footer>
  );
}
