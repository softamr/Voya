
"use client";

import type { NextPage } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, PlusCircle, Save } from 'lucide-react';
import { useState } from 'react';
import { db } from '@/lib/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

type DestinationFormValues = z.infer<ReturnType<typeof getDestinationSchema>>;

const getDestinationSchema = (translations: any) => z.object({
  name: z.string().min(2, { message: translations.zodNameMin }),
  name_ar: z.string().optional().or(z.literal('')),
  description: z.string().min(10, { message: translations.zodDescriptionMin }),
  description_ar: z.string().optional().or(z.literal('')),
  imageUrl: z.string().url({ message: translations.zodImageUrlInvalid }).optional().or(z.literal('')),
  dataAiHint: z.string().max(50, {message: translations.zodAiHintMax}).optional().or(z.literal('')),
});


const AddDestinationPage: NextPage = () => {
  const router = useRouter();
  const { toast } = useToast();
  const { language, direction } = useLanguage();
  const [loading, setLoading] = useState(false);

  const translations = {
    en: {
      backButton: "Back to Destination List",
      pageTitle: "Add New Destination",
      pageDescription: "Fill in the details to add a new travel destination.",
      nameLabel: "Destination Name (English)",
      namePlaceholder: "e.g., Bali, Indonesia",
      nameArLabel: "Destination Name (Arabic) (Optional)",
      nameArPlaceholder: "مثال: بالي، إندونيسيا",
      descriptionEnLabel: "Description (English)",
      descriptionEnPlaceholder: "Describe this beautiful destination in English...",
      descriptionArLabel: "Description (Arabic) (Optional)",
      descriptionArPlaceholder: "صف هذه الوجهة الجميلة باللغة العربية...",
      imageUrlLabel: "Image URL (Optional)",
      imageUrlPlaceholder: "https://placehold.co/600x400.png",
      aiHintLabel: "Image AI Hint (Optional)",
      aiHintPlaceholder: "e.g., beach sunset",
      cancelButton: "Cancel",
      createButton: "Create Destination",
      creatingButton: "Creating...",
      toastCreatedTitle: "Destination Created",
      toastCreatedDescription: (name: string) => `Destination "${name}" has been successfully saved.`,
      toastFailedTitle: "Failed to Create Destination",
      toastFailedDescriptionDefault: "An unexpected error occurred while saving the destination.",
      zodNameMin: "Destination name must be at least 2 characters.",
      zodDescriptionMin: "Description must be at least 10 characters.",
      zodImageUrlInvalid: "Please enter a valid image URL.",
      zodAiHintMax: "AI Hint should be brief, max 50 chars.",
    },
    ar: {
      backButton: "العودة إلى قائمة الوجهات",
      pageTitle: "إضافة وجهة جديدة",
      pageDescription: "املأ التفاصيل لإضافة وجهة سفر جديدة.",
      nameLabel: "اسم الوجهة (الإنجليزية)",
      namePlaceholder: "مثال: Bali, Indonesia",
      nameArLabel: "اسم الوجهة (العربية) (اختياري)",
      nameArPlaceholder: "مثال: بالي، إندونيسيا",
      descriptionEnLabel: "الوصف (الإنجليزية)",
      descriptionEnPlaceholder: "صف هذه الوجهة الجميلة باللغة الإنجليزية...",
      descriptionArLabel: "الوصف (العربية) (اختياري)",
      descriptionArPlaceholder: "صف هذه الوجهة الجميلة باللغة العربية...",
      imageUrlLabel: "رابط الصورة (اختياري)",
      imageUrlPlaceholder: "https://placehold.co/600x400.png",
      aiHintLabel: "تلميح الصورة للذكاء الاصطناعي (اختياري)",
      aiHintPlaceholder: "مثال: غروب الشمس على الشاطئ",
      cancelButton: "إلغاء",
      createButton: "إنشاء وجهة",
      creatingButton: "جارٍ الإنشاء...",
      toastCreatedTitle: "تم إنشاء الوجهة",
      toastCreatedDescription: (name: string) => `تم حفظ الوجهة "${name}" بنجاح.`,
      toastFailedTitle: "فشل إنشاء الوجهة",
      toastFailedDescriptionDefault: "حدث خطأ غير متوقع أثناء حفظ الوجهة.",
      zodNameMin: "يجب أن يتكون اسم الوجهة من حرفين على الأقل.",
      zodDescriptionMin: "يجب أن يتكون الوصف من 10 أحرف على الأقل.",
      zodImageUrlInvalid: "الرجاء إدخال رابط صورة صالح.",
      zodAiHintMax: "يجب أن يكون تلميح الذكاء الاصطناعي موجزًا، 50 حرفًا كحد أقصى.",
    }
  };
  const currentTranslations = translations[language];
  const destinationSchema = getDestinationSchema(currentTranslations);


  const form = useForm<DestinationFormValues>({
    resolver: zodResolver(destinationSchema),
    defaultValues: {
      name: '',
      name_ar: '',
      description: '',
      description_ar: '',
      imageUrl: '',
      dataAiHint: '',
    },
  });

  const onSubmit = async (data: DestinationFormValues) => {
    setLoading(true);
    try {
      await addDoc(collection(db, "destinations"), {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      
      toast({
        title: currentTranslations.toastCreatedTitle,
        description: currentTranslations.toastCreatedDescription(data.name),
      });
      router.push('/admin/destinations');
    } catch (error) {
      console.error("Error creating destination:", error);
      let errorMessage = currentTranslations.toastFailedDescriptionDefault;
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast({
        title: currentTranslations.toastFailedTitle,
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
        <Link href="/admin/destinations">
          <ArrowLeft className={cn("h-4 w-4", direction === 'rtl' ? 'ml-2' : 'mr-2')} />
          {currentTranslations.backButton}
        </Link>
      </Button>

      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl font-headline flex items-center">
            <PlusCircle className={cn("h-6 w-6 text-primary", direction === 'rtl' ? 'ml-3' : 'mr-3')} /> {currentTranslations.pageTitle}
          </CardTitle>
          <CardDescription>{currentTranslations.pageDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{currentTranslations.nameLabel}</FormLabel>
                    <FormControl>
                      <Input placeholder={currentTranslations.namePlaceholder} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="name_ar"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{currentTranslations.nameArLabel}</FormLabel>
                    <FormControl>
                      <Input dir="rtl" placeholder={currentTranslations.nameArPlaceholder} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{currentTranslations.descriptionEnLabel}</FormLabel>
                    <FormControl>
                      <Textarea placeholder={currentTranslations.descriptionEnPlaceholder} {...field} rows={4} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description_ar"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{currentTranslations.descriptionArLabel}</FormLabel>
                    <FormControl>
                      <Textarea dir="rtl" placeholder={currentTranslations.descriptionArPlaceholder} {...field} rows={4} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="imageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{currentTranslations.imageUrlLabel}</FormLabel>
                    <FormControl>
                      <Input type="url" placeholder={currentTranslations.imageUrlPlaceholder} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dataAiHint"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{currentTranslations.aiHintLabel}</FormLabel>
                    <FormControl>
                      <Input placeholder={currentTranslations.aiHintPlaceholder} {...field} />
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
                  <Save className={cn("h-4 w-4", direction === 'rtl' ? 'ml-2' : 'mr-2')} />
                  {loading ? currentTranslations.creatingButton : currentTranslations.createButton}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AddDestinationPage;


