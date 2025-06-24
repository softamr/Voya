
"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { UserPlus, Eye, EyeOff } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

const getSignupSchema = (translations: any) => z.object({
  displayName: z.string().min(2, { message: translations.zodDisplayNameMin }),
  email: z.string().email({ message: translations.zodEmailInvalid }),
  password: z.string().min(8, { message: translations.zodPasswordMin }),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: translations.zodPasswordsDontMatch,
  path: ["confirmPassword"],
});

type SignupFormValues = z.infer<ReturnType<typeof getSignupSchema>>;

export default function SignupForm() {
  const { registerGuestUser } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const { language, direction } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const translations = {
    en: {
      displayNameLabel: "Full Name",
      displayNamePlaceholder: "Your Name",
      emailLabel: "Email",
      emailPlaceholder: "you@example.com",
      passwordLabel: "Password",
      passwordPlaceholder: "••••••••",
      confirmPasswordLabel: "Confirm Password",
      confirmPasswordPlaceholder: "••••••••",
      signupButton: "Sign Up",
      signupButtonLoading: "Signing Up...",
      signupSuccessTitle: "Account Created!",
      signupSuccessDescription: "Welcome! You can now log in.",
      signupFailedTitle: "Signup Failed",
      authEmailInUseError: "This email address is already in use by another account.",
      authInvalidEmailError: "The email address is not valid.",
      authOperationNotAllowedError: "Email/password accounts are not enabled. Please contact support.",
      authWeakPasswordError: "The password is too weak. Please choose a stronger password.",
      authUnknownError: "Failed to create account due to an unknown authentication error.",
      defaultUnexpectedError: "An unexpected error occurred. Please try again.",
      zodDisplayNameMin: "Display name must be at least 2 characters.",
      zodEmailInvalid: "Invalid email address.",
      zodPasswordMin: "Password must be at least 8 characters.",
      zodPasswordsDontMatch: "Passwords don't match.",
    },
    ar: {
      displayNameLabel: "الاسم الكامل",
      displayNamePlaceholder: "اسمك",
      emailLabel: "البريد الإلكتروني",
      emailPlaceholder: "you@example.com",
      passwordLabel: "كلمة المرور",
      passwordPlaceholder: "••••••••",
      confirmPasswordLabel: "تأكيد كلمة المرور",
      confirmPasswordPlaceholder: "••••••••",
      signupButton: "إنشاء حساب",
      signupButtonLoading: "جارٍ إنشاء الحساب...",
      signupSuccessTitle: "تم إنشاء الحساب!",
      signupSuccessDescription: "مرحباً بك! يمكنك الآن تسجيل الدخول.",
      signupFailedTitle: "فشل إنشاء الحساب",
      authEmailInUseError: "عنوان البريد الإلكتروني هذا مستخدم بالفعل بواسطة حساب آخر.",
      authInvalidEmailError: "عنوان البريد الإلكتروني غير صالح.",
      authOperationNotAllowedError: "حسابات البريد الإلكتروني/كلمة المرور غير مفعلة. يرجى الاتصال بالدعم.",
      authWeakPasswordError: "كلمة المرور ضعيفة جدًا. يرجى اختيار كلمة مرور أقوى.",
      authUnknownError: "فشل إنشاء الحساب بسبب خطأ مصادقة غير معروف.",
      defaultUnexpectedError: "حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.",
      zodDisplayNameMin: "يجب أن يتكون الاسم المعروض من حرفين على الأقل.",
      zodEmailInvalid: "عنوان بريد إلكتروني غير صالح.",
      zodPasswordMin: "يجب أن تتكون كلمة المرور من 8 أحرف على الأقل.",
      zodPasswordsDontMatch: "كلمتا المرور غير متطابقتين.",
    }
  };
  const currentTranslations = translations[language];
  const signupSchema = getSignupSchema(currentTranslations);

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      displayName: '', email: '', password: '', confirmPassword: '',
    },
  });

  const onSubmit = async (data: SignupFormValues) => {
    setLoading(true);
    try {
      await registerGuestUser(data.email, data.password, data.displayName);
      toast({ title: currentTranslations.signupSuccessTitle, description: currentTranslations.signupSuccessDescription });
      router.push('/login'); 
    } catch (error: any) {
      console.error("Signup failed:", error);
      let errorMessage = currentTranslations.defaultUnexpectedError;
      if (error.code) {
        switch (error.code) {
          case 'auth/email-already-in-use': errorMessage = currentTranslations.authEmailInUseError; break;
          case 'auth/invalid-email': errorMessage = currentTranslations.authInvalidEmailError; break;
          case 'auth/operation-not-allowed': errorMessage = currentTranslations.authOperationNotAllowedError; break;
          case 'auth/weak-password': errorMessage = currentTranslations.authWeakPasswordError; break;
          default: errorMessage = error.message || currentTranslations.authUnknownError;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      toast({ title: currentTranslations.signupFailedTitle, description: errorMessage, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control} name="displayName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{currentTranslations.displayNameLabel}</FormLabel>
              <FormControl><Input placeholder={currentTranslations.displayNamePlaceholder} {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control} name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{currentTranslations.emailLabel}</FormLabel>
              <FormControl><Input type="email" placeholder={currentTranslations.emailPlaceholder} {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control} name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{currentTranslations.passwordLabel}</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input type={showPassword ? "text" : "password"} placeholder={currentTranslations.passwordPlaceholder} {...field} />
                  <Button type="button" variant="ghost" size="sm" className={cn("absolute top-0 h-full px-3 py-2 hover:bg-transparent", direction === 'rtl' ? 'left-0' : 'right-0')} onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control} name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{currentTranslations.confirmPasswordLabel}</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input type={showConfirmPassword ? "text" : "password"} placeholder={currentTranslations.confirmPasswordPlaceholder} {...field} />
                  <Button type="button" variant="ghost" size="sm" className={cn("absolute top-0 h-full px-3 py-2 hover:bg-transparent", direction === 'rtl' ? 'left-0' : 'right-0')} onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? currentTranslations.signupButtonLoading : <><UserPlus className={cn("h-4 w-4", direction === 'rtl' ? 'ml-2' : 'mr-2')} /> {currentTranslations.signupButton}</>}
        </Button>
      </form>
    </Form>
  );
}
