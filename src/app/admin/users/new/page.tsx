
"use client";

import type { NextPage } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, UserPlus, Eye, EyeOff } from 'lucide-react';
import { USER_ROLES, type UserRole } from '@/lib/constants';
import { useState } from 'react';
import { auth, db } from '@/lib/firebase'; 
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

const AddUserPage: NextPage = () => {
  const router = useRouter();
  const { toast } = useToast();
  const { language, direction } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const translations = {
    en: {
      backButton: "Back to User List",
      pageTitle: "Add New User",
      pageDescription: "Create a new user account and assign a role. This will create both a Firebase Authentication user and a Firestore profile.",
      displayNameLabel: "Display Name",
      displayNamePlaceholder: "e.g., John Doe",
      emailLabel: "Email Address",
      emailPlaceholder: "user@example.com",
      roleLabel: "Role",
      rolePlaceholder: "Select a role",
      roleDescription: "Assign the appropriate role to the user.",
      passwordLabel: "Password",
      passwordPlaceholder: "••••••••",
      confirmPasswordLabel: "Confirm Password",
      confirmPasswordPlaceholder: "••••••••",
      cancelButton: "Cancel",
      createUserButton: "Create User",
      creatingUserButton: "Creating User...",
      toastUserCreatedTitle: "User Created Successfully",
      toastUserCreatedDescription: (displayName: string, email: string, role: string) => `User ${displayName} (${email}) has been created with role ${role}.`,
      toastUserCreationFailedTitle: "User Creation Failed",
      zodDisplayNameMin: "Display name must be at least 2 characters.",
      zodEmailInvalid: "Invalid email address.",
      zodPasswordMin: "Password must be at least 8 characters.",
      zodPasswordsDontMatch: "Passwords don't match.",
      authEmailInUseError: "This email address is already in use by another account.",
      authInvalidEmailError: "The email address is not valid.",
      authOperationNotAllowedError: "Email/password accounts are not enabled. Please contact support.",
      authWeakPasswordError: "The password is too weak. Please choose a stronger password.",
      authUnknownError: "Failed to create user due to an unknown authentication error.",
      defaultUnexpectedError: "An unexpected error occurred. Please try again.",
      firebaseUserCreationError: "Firebase Auth user creation did not return a user object.",
    },
    ar: {
      backButton: "العودة إلى قائمة المستخدمين",
      pageTitle: "إضافة مستخدم جديد",
      pageDescription: "إنشاء حساب مستخدم جديد وتعيين دور له. سيؤدي هذا إلى إنشاء مستخدم مصادقة Firebase وملف شخصي في Firestore.",
      displayNameLabel: "الاسم المعروض",
      displayNamePlaceholder: "مثال: جون دو",
      emailLabel: "عنوان البريد الإلكتروني",
      emailPlaceholder: "user@example.com",
      roleLabel: "الدور",
      rolePlaceholder: "اختر دورًا",
      roleDescription: "قم بتعيين الدور المناسب للمستخدم.",
      passwordLabel: "كلمة المرور",
      passwordPlaceholder: "••••••••",
      confirmPasswordLabel: "تأكيد كلمة المرور",
      confirmPasswordPlaceholder: "••••••••",
      cancelButton: "إلغاء",
      createUserButton: "إنشاء مستخدم",
      creatingUserButton: "جارٍ إنشاء المستخدم...",
      toastUserCreatedTitle: "تم إنشاء المستخدم بنجاح",
      toastUserCreatedDescription: (displayName: string, email: string, role: string) => `تم إنشاء المستخدم ${displayName} (${email}) بالدور ${role}.`,
      toastUserCreationFailedTitle: "فشل إنشاء المستخدم",
      zodDisplayNameMin: "يجب أن يتكون الاسم المعروض من حرفين على الأقل.",
      zodEmailInvalid: "عنوان بريد إلكتروني غير صالح.",
      zodPasswordMin: "يجب أن تتكون كلمة المرور من 8 أحرف على الأقل.",
      zodPasswordsDontMatch: "كلمتا المرور غير متطابقتين.",
      authEmailInUseError: "عنوان البريد الإلكتروني هذا مستخدم بالفعل بواسطة حساب آخر.",
      authInvalidEmailError: "عنوان البريد الإلكتروني غير صالح.",
      authOperationNotAllowedError: "حسابات البريد الإلكتروني/كلمة المرور غير مفعلة. يرجى الاتصال بالدعم.",
      authWeakPasswordError: "كلمة المرور ضعيفة جدًا. يرجى اختيار كلمة مرور أقوى.",
      authUnknownError: "فشل إنشاء المستخدم بسبب خطأ مصادقة غير معروف.",
      defaultUnexpectedError: "حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.",
      firebaseUserCreationError: "لم يُرجع إنشاء مستخدم Firebase Auth كائن مستخدم.",
    }
  };
  const currentTranslations = translations[language];

  const newUserSchema = z.object({
    displayName: z.string().min(2, { message: currentTranslations.zodDisplayNameMin }),
    email: z.string().email({ message: currentTranslations.zodEmailInvalid }),
    password: z.string().min(8, { message: currentTranslations.zodPasswordMin }),
    confirmPassword: z.string(),
    role: z.nativeEnum(USER_ROLES),
  }).refine(data => data.password === data.confirmPassword, {
    message: currentTranslations.zodPasswordsDontMatch,
    path: ["confirmPassword"],
  });
  
  const form = useForm<NewUserFormValues>({
    resolver: zodResolver(newUserSchema),
    defaultValues: {
      displayName: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: USER_ROLES.AUTHENTICATED_USER,
    },
  });
  
  const formatRole = (role: UserRole, lang: 'en' | 'ar') => {
    const roleTranslations: Record<UserRole, { en: string, ar: string }> = {
        [USER_ROLES.SUPER_ADMIN]: { en: 'Super Admin', ar: 'مسؤول خارق' },
        [USER_ROLES.ADMIN]: { en: 'Admin', ar: 'مسؤول' },
        [USER_ROLES.SALES]: { en: 'Sales', ar: 'مبيعات' },
        [USER_ROLES.ACCOUNTANT]: { en: 'Accountant', ar: 'محاسب' },
        [USER_ROLES.SUPERVISOR]: { en: 'Supervisor', ar: 'مشرف' },
        [USER_ROLES.RECEPTIONIST]: { en: 'Receptionist', ar: 'موظف استقبال' },
        [USER_ROLES.AUTHENTICATED_USER]: { en: 'Authenticated User', ar: 'مستخدم مصادق عليه' },
        [USER_ROLES.PUBLIC_USER]: { en: 'Public User', ar: 'مستخدم عام' },
    };
    return roleTranslations[role]?.[lang] || role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };


  const onSubmit = async (data: NewUserFormValues) => {
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      const newAuthUser = userCredential.user;

      if (newAuthUser) {
        const userProfileForFirestore: Omit<UserProfile, 'createdAt' | 'uid'> & { uid: string; createdAt: any } = {
            uid: newAuthUser.uid,
            email: newAuthUser.email!,
            displayName: data.displayName,
            role: data.role,
            createdAt: serverTimestamp(),
        };
        await setDoc(doc(db, 'users', newAuthUser.uid), userProfileForFirestore);

        toast({
          title: currentTranslations.toastUserCreatedTitle,
          description: currentTranslations.toastUserCreatedDescription(data.displayName, data.email, formatRole(data.role, language)),
        });
        router.push('/admin/users');
      } else {
        throw new Error(currentTranslations.firebaseUserCreationError);
      }
    } catch (error: any) {
      console.error("Error creating user:", error);
      let errorMessage = currentTranslations.defaultUnexpectedError;
      if (error.code) {
        switch (error.code) {
          case 'auth/email-already-in-use':
            errorMessage = currentTranslations.authEmailInUseError;
            break;
          case 'auth/invalid-email':
            errorMessage = currentTranslations.authInvalidEmailError;
            break;
          case 'auth/operation-not-allowed':
            errorMessage = currentTranslations.authOperationNotAllowedError;
            break;
          case 'auth/weak-password':
            errorMessage = currentTranslations.authWeakPasswordError;
            break;
          default:
            errorMessage = error.message || currentTranslations.authUnknownError;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      toast({
        title: currentTranslations.toastUserCreationFailedTitle,
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="space-y-6" dir={direction}>
       <Button variant="outline" size="sm" asChild className="mb-4">
        <Link href="/admin/users">
          <ArrowLeft className={cn("h-4 w-4", direction === 'rtl' ? 'ml-2' : 'mr-2')} />
          {currentTranslations.backButton}
        </Link>
      </Button>

      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl font-headline flex items-center">
            <UserPlus className={cn("h-6 w-6 text-primary", direction === 'rtl' ? 'ml-3' : 'mr-3')} /> {currentTranslations.pageTitle}
          </CardTitle>
          <CardDescription>{currentTranslations.pageDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{currentTranslations.displayNameLabel}</FormLabel>
                    <FormControl>
                      <Input placeholder={currentTranslations.displayNamePlaceholder} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{currentTranslations.emailLabel}</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder={currentTranslations.emailPlaceholder} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{currentTranslations.roleLabel}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={currentTranslations.rolePlaceholder} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.values(USER_ROLES).filter(role => role !== USER_ROLES.PUBLIC_USER).map(role => (
                          <SelectItem key={role} value={role}>
                            {formatRole(role, language)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      {currentTranslations.roleDescription}
                    </FormDescription>
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
                        <Input type={showPassword ? "text" : "password"} placeholder={currentTranslations.passwordPlaceholder} {...field} />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className={cn("absolute top-0 h-full px-3 py-2 hover:bg-transparent", direction === 'rtl' ? 'left-0' : 'right-0')}
                          onClick={() => setShowPassword(!showPassword)}
                          aria-label={showPassword ? (language === 'ar' ? 'إخفاء كلمة المرور' : 'Hide password') : (language === 'ar' ? 'إظهار كلمة المرور' : 'Show password')}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{currentTranslations.confirmPasswordLabel}</FormLabel>
                     <FormControl>
                      <div className="relative">
                        <Input type={showConfirmPassword ? "text" : "password"} placeholder={currentTranslations.confirmPasswordPlaceholder} {...field} />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className={cn("absolute top-0 h-full px-3 py-2 hover:bg-transparent", direction === 'rtl' ? 'left-0' : 'right-0')}
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          aria-label={showConfirmPassword ? (language === 'ar' ? 'إخفاء تأكيد كلمة المرور' : 'Hide confirm password') : (language === 'ar' ? 'إظهار تأكيد كلمة المرور' : 'Show confirm password')}
                        >
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end space-x-3 pt-4">
                <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading}>
                  {currentTranslations.cancelButton}
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? currentTranslations.creatingUserButton : currentTranslations.createUserButton}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AddUserPage;
