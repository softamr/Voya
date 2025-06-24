
"use client"; 

import type { ReactNode } from 'react';
import { useLanguage } from '@/contexts/LanguageContext'; 
import { cn } from '@/lib/utils';

export default function AuthLayout({ children }: { children: ReactNode }) {
  const { appName, direction } = useLanguage(); 

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4"> {/* bg-background is inherited */}
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          {/* AppName is now just a visual element, not a link */}
          <span className="text-4xl font-headline font-bold text-primary">
            {appName}
          </span>
        </div>
        <div className="bg-card p-6 sm:p-8 rounded-lg shadow-xl border">
           {children}
        </div>
        {/* Copyright notice removed, will be handled by global Footer */}
      </div>
    </div>
  );
}
