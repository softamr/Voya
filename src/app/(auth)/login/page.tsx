
"use client";

import LoginForm from '@/components/auth/LoginForm';
import { CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';

export default function LoginPage() {
  const { language, appName } = useLanguage();

  const translations = {
    en: {
      title: "Welcome Back!",
      description: `Sign in to continue to ${appName}.`
    },
    ar: {
      title: "مرحباً بعودتك!",
      description: `سجل الدخول للمتابعة إلى ${appName}.`
    }
  };

  const currentTranslations = translations[language];

  return (
    <>
      <CardHeader className="text-center p-0 mb-6">
        <CardTitle className="text-2xl font-headline">{currentTranslations.title}</CardTitle>
        <CardDescription>{currentTranslations.description}</CardDescription>
      </CardHeader>
      <LoginForm />
    </>
  );
}
