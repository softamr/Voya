
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
import { ArrowLeft, PlusCircle, Save, BedDouble } from 'lucide-react';
import { useState } from 'react';
import { db } from '@/lib/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

type RoomTypeFormValues = z.infer<ReturnType<typeof getRoomTypeSchema>>;

const getRoomTypeSchema = (translations: any) => z.object({
  name: z.string().min(2, { message: translations.zodNameMin }),
  description: z.string().min(10, { message: translations.zodDescriptionMin }),
  capacity: z.coerce.number().int().positive({ message: translations.zodCapacityPositive }),
});

const AddRoomTypePage: NextPage = () => {
  const router = useRouter();
  const { toast } = useToast();
  const { language, direction } = useLanguage();
  const [loading, setLoading] = useState(false);

  const translations = {
    en: {
      backButton: "Back to Room Type List",
      pageTitle: "Add New Room Type",
      pageDescription: "Define a new type of room available in hotels.",
      nameLabel: "Room Type Name",
      namePlaceholder: "e.g., Deluxe King Suite",
      descriptionLabel: "Description",
      descriptionPlaceholder: "Describe this room type and its features...",
      capacityLabel: "Capacity (Number of Guests)",
      capacityPlaceholder: "e.g., 2",
      cancelButton: "Cancel",
      createButton: "Create Room Type",
      creatingButton: "Creating...",
      toastCreatedTitle: "Room Type Created",
      toastCreatedDescription: (name: string) => `Room type "${name}" has been successfully saved.`,
      toastFailedTitle: "Failed to Create Room Type",
      toastFailedDescriptionDefault: "An unexpected error occurred while saving the room type.",
      zodNameMin: "Room type name must be at least 2 characters.",
      zodDescriptionMin: "Description must be at least 10 characters.",
      zodCapacityPositive: "Capacity must be a positive number.",
    },
    ar: {
      backButton: "العودة إلى قائمة أنواع الغرف",
      pageTitle: "إضافة نوع غرفة جديد",
      pageDescription: "حدد نوعًا جديدًا من الغرف المتوفرة في الفنادق.",
      nameLabel: "اسم نوع الغرفة",
      namePlaceholder: "مثال: جناح ديلوكس كينج",
      descriptionLabel: "الوصف",
      descriptionPlaceholder: "صف نوع هذه الغرفة وميزاتها...",
      capacityLabel: "السعة (عدد الضيوف)",
      capacityPlaceholder: "مثال: 2",
      cancelButton: "إلغاء",
      createButton: "إنشاء نوع الغرفة",
      creatingButton: "جارٍ الإنشاء...",
      toastCreatedTitle: "تم إنشاء نوع الغرفة",
      toastCreatedDescription: (name: string) => `تم حفظ نوع الغرفة "${name}" بنجاح.`,
      toastFailedTitle: "فشل إنشاء نوع الغرفة",
      toastFailedDescriptionDefault: "حدث خطأ غير متوقع أثناء حفظ نوع الغرفة.",
      zodNameMin: "يجب أن يتكون اسم نوع الغرفة من حرفين على الأقل.",
      zodDescriptionMin: "يجب أن يتكون الوصف من 10 أحرف على الأقل.",
      zodCapacityPositive: "يجب أن تكون السعة رقمًا موجبًا.",
    }
  };

  const currentTranslations = translations[language];
  const roomTypeSchema = getRoomTypeSchema(currentTranslations);

  const form = useForm<RoomTypeFormValues>({
    resolver: zodResolver(roomTypeSchema),
    defaultValues: {
      name: '',
      description: '',
      capacity: 1,
    },
  });

  const onSubmit = async (data: RoomTypeFormValues) => {
    setLoading(true);
    try {
      await addDoc(collection(db, "roomTypes"), {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      
      toast({
        title: currentTranslations.toastCreatedTitle,
        description: currentTranslations.toastCreatedDescription(data.name),
      });
      router.push('/admin/room-types');
    } catch (error) {
      console.error("Error creating room type:", error);
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
        <Link href="/admin/room-types">
          <ArrowLeft className={cn("h-4 w-4", direction === 'rtl' ? 'ml-2' : 'mr-2')} />
          {currentTranslations.backButton}
        </Link>
      </Button>

      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl font-headline flex items-center">
            <BedDouble className={cn("h-6 w-6 text-primary", direction === 'rtl' ? 'ml-3' : 'mr-3')} /> {currentTranslations.pageTitle}
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
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{currentTranslations.descriptionLabel}</FormLabel>
                    <FormControl>
                      <Textarea placeholder={currentTranslations.descriptionPlaceholder} {...field} rows={3} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="capacity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{currentTranslations.capacityLabel}</FormLabel>
                    <FormControl>
                      <Input type="number" min="1" placeholder={currentTranslations.capacityPlaceholder} {...field} 
                       onChange={event => field.onChange(+event.target.value)}
                      />
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

export default AddRoomTypePage;
