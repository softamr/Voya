
"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext'; // Import useLanguage

const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }), // Error messages could also be translated
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const { language, direction } = useLanguage(); // Get language and direction
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const translations = {
    en: {
      emailLabel: "Email",
      emailPlaceholder: "you@example.com",
      passwordLabel: "Password",
      passwordPlaceholder: "••••••••",
      forgotPasswordLink: "Forgot password?",
      loginButton: "Log In",
      loginButtonLoading: "Logging in...",
      noAccountHelper: "No account yet? Super Admin setup will guide you.",
      loginSuccessTitle: "Login Attempted",
      loginSuccessDescription: "Checking credentials and profile...",
      loginFailedTitle: "Login Failed",
      invalidCredentialsError: "Invalid email or password. Please check your credentials and try again.",
      userDisabledError: "This user account has been disabled.",
      tooManyRequestsError: "Access to this account has been temporarily disabled due to many failed login attempts. You can try again later or reset your password.",
      profileNotFoundError: "Login successful, but your user profile could not be loaded. Please contact support or re-verify setup.",
      visibilityCheckUnavailableError: "Login failed due to a temporary Firebase issue. Please try again in a few moments.",
      unexpectedError: "An unexpected error occurred. Please try again.",
      unknownError: "Failed to login due to an unknown error.",
    },
    ar: {
      emailLabel: "البريد الإلكتروني",
      emailPlaceholder: "you@example.com",
      passwordLabel: "كلمة المرور",
      passwordPlaceholder: "••••••••",
      forgotPasswordLink: "هل نسيت كلمة المرور؟",
      loginButton: "تسجيل الدخول",
      loginButtonLoading: "جارٍ تسجيل الدخول...",
      noAccountHelper: "ليس لديك حساب بعد؟ إعداد المسؤول الخارق سيرشدك.",
      loginSuccessTitle: "محاولة تسجيل الدخول",
      loginSuccessDescription: "جاري التحقق من بيانات الاعتماد والملف الشخصي...",
      loginFailedTitle: "فشل تسجيل الدخول",
      invalidCredentialsError: "البريد الإلكتروني أو كلمة المرور غير صالحة. يرجى التحقق من بيانات الاعتماد الخاصة بك وحاول مرة أخرى.",
      userDisabledError: "تم تعطيل حساب المستخدم هذا.",
      tooManyRequestsError: "تم تعطيل الوصول إلى هذا الحساب مؤقتًا بسبب العديد من محاولات تسجيل الدخول الفاشلة. يمكنك المحاولة مرة أخرى لاحقًا أو إعادة تعيين كلمة المرور الخاصة بك.",
      profileNotFoundError: "نجح تسجيل الدخول، ولكن تعذر تحميل ملف تعريف المستخدم الخاص بك. يرجى الاتصال بالدعم أو إعادة التحقق من الإعداد.",
      visibilityCheckUnavailableError: "فشل تسجيل الدخول بسبب مشكلة مؤقتة في Firebase. يرجى المحاولة مرة أخرى بعد لحظات قليلة.",
      unexpectedError: "حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.",
      unknownError: "فشل تسجيل الدخول بسبب خطأ غير معروف.",
    }
  };

  const currentTranslations = translations[language];

  // Dynamically update Zod error messages based on language
  const currentLoginSchema = z.object({
    email: z.string().email({ message: language === 'ar' ? "عنوان بريد إلكتروني غير صالح." : "Invalid email address." }),
    password: z.string().min(6, { message: language === 'ar' ? "يجب أن تتكون كلمة المرور من 6 أحرف على الأقل." : "Password must be at least 6 characters." }),
  });


  const form = useForm<LoginFormValues>({
    resolver: zodResolver(currentLoginSchema), // Use language-aware schema
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setLoading(true);
    try {
      await login(data.email, data.password); 
      toast({ title: currentTranslations.loginSuccessTitle, description: currentTranslations.loginSuccessDescription });
    } catch (error) {
      console.error("Login failed:", error);
      let errorMessage = currentTranslations.unexpectedError;
      if (error instanceof Error) {
        const errorCode = (error as any).code;
        switch (errorCode) {
          case 'auth/invalid-credential':
          case 'auth/user-not-found': 
          case 'auth/wrong-password':
            errorMessage = currentTranslations.invalidCredentialsError;
            break;
          case 'auth/user-disabled':
            errorMessage = currentTranslations.userDisabledError;
            break;
          case 'auth/too-many-requests':
            errorMessage = currentTranslations.tooManyRequestsError;
            break;
          case 'auth/profile-not-found': 
            errorMessage = currentTranslations.profileNotFoundError;
            break;
          case 'auth/visibility-check-was-unavailable':
            errorMessage = currentTranslations.visibilityCheckUnavailableError;
            break;
          default:
            errorMessage = (error as Error).message || currentTranslations.unknownError;
        }
      }
      toast({ title: currentTranslations.loginFailedTitle, description: errorMessage, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{currentTranslations.emailLabel}</FormLabel>
              <FormControl>
                <Input type="email" placeholder={currentTranslations.emailPlaceholder} {...field} dir={direction} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{currentTranslations.passwordLabel}</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input type={showPassword ? "text" : "password"} placeholder={currentTranslations.passwordPlaceholder} {...field} dir={direction} />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className={`absolute top-0 h-full px-3 py-2 hover:bg-transparent ${direction === 'rtl' ? 'left-0' : 'right-0'}`}
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex items-center justify-between">
          <Link href="/reset-password" passHref>
            <Button variant="link" type="button" className="px-0 text-sm">
              {currentTranslations.forgotPasswordLink}
            </Button>
          </Link>
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? currentTranslations.loginButtonLoading : <><LogIn className={direction === 'rtl' ? 'ml-2' : "mr-2"} /> {currentTranslations.loginButton}</>}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          {currentTranslations.noAccountHelper}
        </p>
      </form>
    </Form>
  );
}
