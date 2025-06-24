
"use client";

import SignupForm from '@/components/auth/SignupForm';
import { CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import Link from 'next/link';

export default function SignupPage() {
  const { language, appName } = useLanguage();

  const translations = {
    en: {
      title: "Create Your Account",
      description: `Join ${appName} to manage your trips!`,
      loginPrompt: "Already have an account?",
      loginLink: "Log In",
    },
    ar: {
      title: "أنشئ حسابك",
      description: `انضم إلى ${appName} لإدارة رحلاتك!`,
      loginPrompt: "هل لديك حساب بالفعل؟",
      loginLink: "تسجيل الدخول",
    }
  };

  const currentTranslations = translations[language];

  return (
    <>
      <CardHeader className="text-center p-0 mb-6">
        <CardTitle className="text-2xl font-headline">{currentTranslations.title}</CardTitle>
        <CardDescription>{currentTranslations.description}</CardDescription>
      </CardHeader>
      <SignupForm />
      <p className="mt-6 text-center text-sm text-muted-foreground">
        {currentTranslations.loginPrompt}{' '}
        <Link href="/login" className="font-semibold text-primary hover:underline">
          {currentTranslations.loginLink}
        </Link>
      </p>
    </>
  );
}
