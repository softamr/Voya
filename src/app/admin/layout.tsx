
"use client"; // Make this a client component to use the language context for sidebar positioning

import type { ReactNode } from 'react';
import AdminSidebar from '@/components/layout/AdminSidebar';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { direction } = useLanguage();

  return (
    <div className={cn("flex h-screen bg-background", direction === 'rtl' ? 'flex-row-reverse' : 'flex-row')}>
      <AdminSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
