
import SetupAdminForm from '@/components/auth/SetupAdminForm';
import { CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function SetupAdminPage() {
  // Note: This page could also use useLanguage() for dynamic app name in title
  // For now, making a direct change. Ideally, this would be context-driven.
  return (
    <>
      <CardHeader className="text-center p-0 mb-6">
        <CardTitle className="text-2xl font-headline">Welcome to Khatwa!</CardTitle>
        <CardDescription>Let's set up the first Super Admin account to get started.</CardDescription>
      </CardHeader>
      <SetupAdminForm />
    </>
  );
}
