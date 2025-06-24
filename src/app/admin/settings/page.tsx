
"use client";

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Settings, Palette, ShieldAlert, PlusCircle, Edit2, Trash2, Image as ImageIcon, Video, Loader2, ImagePlay } from 'lucide-react'; // Added ImagePlay for Hero Image
import { useState, useEffect, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { USER_ROLES } from "@/lib/constants";
import type { HomepageBanner, HomepageConfig } from '@/lib/types';
import { db } from '@/lib/firebase';
import { collection, addDoc, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc, Timestamp, setDoc, getDoc } from 'firebase/firestore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription as DialogDesc, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";


// Helper function to convert HEX to HSL object (same as before)
function hexToHsl(hex: string): { h: number, s: number, l: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;
  let r = parseInt(result[1], 16) / 255, g = parseInt(result[2], 16) / 255, b = parseInt(result[3], 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) { h = s = 0; } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
      default: h = 0; 
    }
    h /= 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

const DEFAULT_PRIMARY_COLOR = "#6495ED"; 
const DEFAULT_BACKGROUND_COLOR = "#F0F0F0";
const DEFAULT_ACCENT_COLOR = "#8FBC8F";

const getBannerSchema = (translations: any) => z.object({
  type: z.enum(['image', 'video'], { required_error: translations.zodBannerTypeRequired }),
  url: z.string().url({ message: translations.bannerUrlInvalid }),
  altText: z.string().min(1, { message: translations.bannerAltTextRequired }),
  aboutUsText: z.string().optional().or(z.literal('')),
  aboutUsText_ar: z.string().optional().or(z.literal('')), 
  order: z.coerce.number().int().min(0, { message: translations.bannerOrderMin }),
  isActive: z.boolean().default(true),
});

type BannerFormValues = z.infer<ReturnType<typeof getBannerSchema>>;

// --- AddBannerItemDialog Component ---
interface AddBannerItemDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onBannerAdded: () => void;
  translations: any;
}

function AddBannerItemDialog({ isOpen, onOpenChange, onBannerAdded, translations }: AddBannerItemDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const bannerSchema = getBannerSchema(translations);

  const form = useForm<BannerFormValues>({
    resolver: zodResolver(bannerSchema),
    defaultValues: {
      type: 'image', url: '', altText: '', aboutUsText: '', aboutUsText_ar: '', order: 0, isActive: true,
    },
  });
  const selectedType = form.watch('type');

  const onSubmit = async (data: BannerFormValues) => {
    setIsSubmitting(true);
    try {
      const dataToSave = {
        ...data,
        aboutUsText: data.type === 'video' ? data.aboutUsText : null,
        aboutUsText_ar: data.type === 'video' ? data.aboutUsText_ar : null,
        createdAt: serverTimestamp(), 
        updatedAt: serverTimestamp(),
      };
      await addDoc(collection(db, 'homepageBanners'), dataToSave);
      toast({ title: translations.toastBannerAddedTitle, description: translations.toastBannerAddedDesc(data.altText) });
      form.reset(); onBannerAdded(); onOpenChange(false); 
    } catch (error) {
      console.error("Error adding banner item:", error);
      toast({ title: translations.toastBannerAddFailedTitle, description: (error as Error).message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{translations.addBannerDialogTitle}</DialogTitle>
          <DialogDesc>{translations.addBannerDialogDesc}</DialogDesc>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2 max-h-[80vh] overflow-y-auto pr-2">
            <FormField control={form.control} name="type" render={({ field }) => (
              <FormItem>
                <FormLabel>{translations.bannerTypeLabel}</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder={translations.bannerTypePlaceholder} /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="image">{translations.bannerTypeImage}</SelectItem>
                    <SelectItem value="video">{translations.bannerTypeVideo}</SelectItem>
                  </SelectContent>
                </Select><FormMessage />
              </FormItem>
            )}/>
            <FormField control={form.control} name="url" render={({ field }) => (
              <FormItem>
                <FormLabel>{translations.bannerUrlLabel}</FormLabel>
                <FormControl><Input type="url" placeholder={translations.bannerUrlPlaceholder} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}/>
            <FormField control={form.control} name="altText" render={({ field }) => (
              <FormItem>
                <FormLabel>{translations.bannerAltTextLabel}</FormLabel>
                <FormControl><Input placeholder={translations.bannerAltTextPlaceholder} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}/>
            {selectedType === 'video' && (
              <>
                <FormField control={form.control} name="aboutUsText" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{translations.bannerAboutUsTextLabel}</FormLabel>
                    <FormControl><Textarea placeholder={translations.bannerAboutUsTextPlaceholder} {...field} rows={4} /></FormControl>
                    <FormDescription>{translations.bannerAboutUsTextDescription}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}/>
                <FormField control={form.control} name="aboutUsText_ar" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{translations.bannerAboutUsTextArLabel}</FormLabel>
                    <FormControl><Textarea dir="rtl" placeholder={translations.bannerAboutUsTextArPlaceholder} {...field} rows={4} /></FormControl>
                    <FormDescription>{translations.bannerAboutUsTextArDescription}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}/>
              </>
            )}
            <FormField control={form.control} name="order" render={({ field }) => (
              <FormItem>
                <FormLabel>{translations.bannerOrderLabel}</FormLabel>
                <FormControl><Input type="number" min="0" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}/>
            <FormField control={form.control} name="isActive" render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                <div className="space-y-0.5"><FormLabel>{translations.bannerActiveLabel}</FormLabel></div>
                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
              </FormItem>
            )}/>
            <DialogFooter className="pt-4">
              <DialogClose asChild><Button type="button" variant="outline" disabled={isSubmitting}>{translations.cancelButton}</Button></DialogClose>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSubmitting ? translations.savingBannerButton : translations.saveBannerButton}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
// --- End AddBannerItemDialog ---

// --- EditBannerItemDialog Component ---
interface EditBannerItemDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  bannerToEdit: HomepageBanner | null;
  onBannerUpdated: () => void;
  translations: any;
}

function EditBannerItemDialog({ isOpen, onOpenChange, bannerToEdit, onBannerUpdated, translations }: EditBannerItemDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const bannerSchema = getBannerSchema(translations);

  const form = useForm<BannerFormValues>({
    resolver: zodResolver(bannerSchema),
    defaultValues: {
      type: 'image', url: '', altText: '', aboutUsText: '', aboutUsText_ar: '', order: 0, isActive: true,
    },
  });

  useEffect(() => {
    if (bannerToEdit) {
      form.reset({
        type: bannerToEdit.type,
        url: bannerToEdit.url,
        altText: bannerToEdit.altText || '',
        aboutUsText: bannerToEdit.aboutUsText || '',
        aboutUsText_ar: bannerToEdit.aboutUsText_ar || '',
        order: bannerToEdit.order,
        isActive: bannerToEdit.isActive,
      });
    }
  }, [bannerToEdit, form]);

  const selectedType = form.watch('type');

  const onSubmit = async (data: BannerFormValues) => {
    if (!bannerToEdit) return;
    setIsSubmitting(true);
    try {
      const bannerRef = doc(db, 'homepageBanners', bannerToEdit.id);
      const dataToUpdate = {
        ...data,
        aboutUsText: data.type === 'video' ? data.aboutUsText : null,
        aboutUsText_ar: data.type === 'video' ? data.aboutUsText_ar : null,
        updatedAt: serverTimestamp(),
      };
      await updateDoc(bannerRef, dataToUpdate);
      toast({ title: translations.toastBannerUpdatedTitle, description: translations.toastBannerUpdatedDesc });
      form.reset(); onBannerUpdated(); onOpenChange(false);
    } catch (error) {
      console.error("Error updating banner item:", error);
      toast({ title: translations.toastBannerUpdateFailedTitle, description: (error as Error).message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{translations.editBannerDialogTitle || "Edit Banner Item"}</DialogTitle>
          <DialogDesc>{translations.editBannerDialogDesc || "Modify the details for this banner item."}</DialogDesc>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2 max-h-[80vh] overflow-y-auto pr-2">
            <FormField control={form.control} name="type" render={({ field }) => (
              <FormItem>
                <FormLabel>{translations.bannerTypeLabel}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder={translations.bannerTypePlaceholder} /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="image">{translations.bannerTypeImage}</SelectItem>
                    <SelectItem value="video">{translations.bannerTypeVideo}</SelectItem>
                  </SelectContent>
                </Select><FormMessage />
              </FormItem>
            )}/>
            <FormField control={form.control} name="url" render={({ field }) => (
              <FormItem>
                <FormLabel>{translations.bannerUrlLabel}</FormLabel>
                <FormControl><Input type="url" placeholder={translations.bannerUrlPlaceholder} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}/>
            <FormField control={form.control} name="altText" render={({ field }) => (
              <FormItem>
                <FormLabel>{translations.bannerAltTextLabel}</FormLabel>
                <FormControl><Input placeholder={translations.bannerAltTextPlaceholder} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}/>
            {selectedType === 'video' && (
              <>
                <FormField control={form.control} name="aboutUsText" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{translations.bannerAboutUsTextLabel}</FormLabel>
                    <FormControl><Textarea placeholder={translations.bannerAboutUsTextPlaceholder} {...field} rows={4} /></FormControl>
                    <FormDescription>{translations.bannerAboutUsTextDescription}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}/>
                <FormField control={form.control} name="aboutUsText_ar" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{translations.bannerAboutUsTextArLabel}</FormLabel>
                    <FormControl><Textarea dir="rtl" placeholder={translations.bannerAboutUsTextArPlaceholder} {...field} rows={4} /></FormControl>
                    <FormDescription>{translations.bannerAboutUsTextArDescription}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}/>
              </>
            )}
            <FormField control={form.control} name="order" render={({ field }) => (
              <FormItem>
                <FormLabel>{translations.bannerOrderLabel}</FormLabel>
                <FormControl><Input type="number" min="0" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}/>
            <FormField control={form.control} name="isActive" render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                <div className="space-y-0.5"><FormLabel>{translations.bannerActiveLabel}</FormLabel></div>
                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
              </FormItem>
            )}/>
            <DialogFooter className="pt-4">
              <DialogClose asChild><Button type="button" variant="outline" disabled={isSubmitting}>{translations.cancelButton}</Button></DialogClose>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSubmitting ? translations.savingBannerButton : translations.saveBannerButton}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
// --- End EditBannerItemDialog ---


export default function AdminSettingsPage() {
  const { toast } = useToast();
  const { appName: contextAppName, language, direction } = useLanguage();
  const { user } = useAuth();

  const [appNameInput, setAppNameInput] = useState(contextAppName);
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [primaryColor, setPrimaryColor] = useState(DEFAULT_PRIMARY_COLOR);
  const [backgroundColor, setBackgroundColor] = useState(DEFAULT_BACKGROUND_COLOR);
  const [accentColor, setAccentColor] = useState(DEFAULT_ACCENT_COLOR);

  const [homepageBanners, setHomepageBanners] = useState<HomepageBanner[]>([]);
  const [loadingBanners, setLoadingBanners] = useState(true);
  const [isAddBannerDialogOpen, setIsAddBannerDialogOpen] = useState(false);
  const [isEditBannerDialogOpen, setIsEditBannerDialogOpen] = useState(false);
  const [currentBannerToEdit, setCurrentBannerToEdit] = useState<HomepageBanner | null>(null);

  // State for Hero Settings
  const [heroImageUrlInput, setHeroImageUrlInput] = useState('');
  const [heroVideoUrlInput, setHeroVideoUrlInput] = useState(''); // New state for video URL
  const [heroImageAiHintInput, setHeroImageAiHintInput] = useState('');
  const [loadingHeroSettings, setLoadingHeroSettings] = useState(true);


  const translations = {
    en: {
      pageTitle: "Admin Settings", pageDescription: "Configure various aspects of the application.",
      generalSettingsTitle: "General Settings", generalSettingsDescription: "Basic application settings and configurations.",
      appNameLabel: "Application Name", appNameDescription: "This name appears throughout the application.",
      appNamePlaceholder: "e.g., Voya",
      maintenanceModeLabel: "Maintenance Mode", maintenanceModeDescription: "Restrict access for non-admin users. Admins can still access the site.",
      saveGeneralSettingsButton: "Save General Settings",
      themeAppearanceTitle: "Theme & Appearance", themeAppearanceDescription: "Customize the look and feel of the application.",
      primaryColorLabel: "Primary Color", backgroundColorLabel: "Background Color (Light Theme)", accentColorLabel: "Accent Color",
      livePreviewText: "(Live Preview)", colorPickerDescription: "These color settings dynamically override the base theme. For optimal contrast, especially for text on these custom-colored backgrounds, you might need to adjust corresponding `*-foreground` variables directly in `globals.css`.",
      darkModeLabel: "Dark Mode", darkModeDescription: "Toggle dark mode for the application.", themePreferencesNote: "Theme preferences are saved in your browser.",
      securityAccessTitle: "Security & Access", securityAccessDescription: "Manage security policies and access controls. (Placeholders)",
      securityPlaceholderIntro: "This section is a placeholder for future security settings, such as:", securityPlaceholders: ["Two-Factor Authentication (2FA) enforcement policies.", "Session timeout durations for inactivity.", "IP Whitelisting or Blacklisting for admin access.", "Configuration for audit log verbosity and retention.", "Password complexity rules and reset policies."],
      updateSecurityButton: "Update Security Policies",
      toastSettingsSavedTitle: "Settings Saved", toastGeneralSettingsUpdated: "General settings have been updated.", toastDarkModeEnabled: "Dark Mode Enabled", toastDarkModeDisabled: "Dark Mode Disabled", toastThemePreferenceUpdated: "Theme preference updated.",
      loadingSettings: "Loading settings...",
      bannerManagementTitle: "Homepage Banner Management", bannerManagementDesc: "Add, remove, and reorder image/video banners for the homepage.",
      addBannerItemButton: "Add Banner Item",
      bannerTableType: "Type", bannerTableUrl: "URL/Content", bannerTableAlt: "Title/Alt Text", bannerTableOrder: "Order", bannerTableActive: "Active", bannerTableActions: "Actions",
      bannerTableAbout: "About Us Text", 
      bannerEdit: "Edit", bannerDelete: "Delete", bannerNoItems: "No banner items added yet.",
      addBannerDialogTitle: "Add New Homepage Banner", addBannerDialogDesc: "Enter details for the new banner item.",
      editBannerDialogTitle: "Edit Homepage Banner", editBannerDialogDesc: "Modify the details of this banner item.",
      bannerTypeLabel: "Type", bannerTypePlaceholder: "Select type", bannerTypeImage: "Image", bannerTypeVideo: "Video",
      bannerUrlLabel: "URL", bannerUrlPlaceholder: "https://example.com/image.jpg or video_file.mp4",
      bannerAltTextLabel: "Title / Alt Text", bannerAltTextPlaceholder: "Descriptive text for the banner",
      bannerAboutUsTextLabel: "About Us Text (English - for Video banners)", 
      bannerAboutUsTextPlaceholder: "Enter text to display next to the video...",
      bannerAboutUsTextDescription: "This text will appear beside the video on the homepage. Leave blank if not needed.", 
      bannerAboutUsTextArLabel: "About Us Text (Arabic - for Video banners)", 
      bannerAboutUsTextArPlaceholder: "أدخل النص الذي سيظهر بجانب الفيديو...", 
      bannerAboutUsTextArDescription: "سيظهر هذا النص بجانب الفيديو في الصفحة الرئيسية. اتركه فارغًا إذا لم يكن مطلوبًا.", 
      bannerOrderLabel: "Order", bannerActiveLabel: "Active",
      saveBannerButton: "Save Banner", savingBannerButton: "Saving...", cancelButton: "Cancel",
      toastBannerAddedTitle: "Banner Item Added", toastBannerAddedDesc: (name: string) => `Banner "${name}" added successfully.`,
      toastBannerAddFailedTitle: "Add Banner Failed",
      toastBannerDeletedTitle: "Banner Deleted", toastBannerDeletedDesc: "Banner item removed.",
      toastBannerDeleteFailedTitle: "Delete Failed",
      toastBannerUpdatedTitle: "Banner Updated", toastBannerUpdatedDesc: "Banner item details updated.",
      toastBannerUpdateFailedTitle: "Update Banner Failed",
      confirmDeleteBannerTitle: "Confirm Delete", confirmDeleteBannerMessage: (name: string) => `Are you sure you want to delete the banner "${name}"?`,
      zodBannerTypeRequired: "Banner type is required.", zodBannerUrlInvalid: "Please enter a valid URL.", zodBannerAltTextRequired: "Title/Alt text is required.", zodBannerOrderMin: "Order must be a non-negative number.",
      heroImageSettingsTitle: "Homepage Hero Settings", // Updated title
      heroImageSettingsDesc: "Set the background image or video for the homepage hero section.",
      heroImageUrlLabel: "Hero Image URL", heroImageUrlPlaceholder: "https://example.com/hero-background.jpg",
      heroVideoUrlLabel: "Hero Video URL (Optional)", // New label
      heroVideoUrlPlaceholder: "https://example.com/hero-background.mp4 or YouTube/Vimeo link", // New placeholder
      heroImageAiHintLabel: "Hero Image AI Hint (Optional)", heroImageAiHintPlaceholder: "e.g., majestic mountains, serene beach",
      saveHeroImageButton: "Save Hero Settings", toastHeroImageSaved: "Hero settings saved.", toastHeroImageSaveFailed: "Failed to save hero settings.",
    },
    ar: { 
      pageTitle: "إعدادات المسؤول", pageDescription: "تكوين جوانب مختلفة من التطبيق.",
      generalSettingsTitle: "الإعدادات العامة", generalSettingsDescription: "إعدادات وتكوينات التطبيق الأساسية.",
      appNameLabel: "اسم التطبيق", appNameDescription: "يظهر هذا الاسم في جميع أنحاء التطبيق.",
      appNamePlaceholder: "مثال: فويا",
      maintenanceModeLabel: "وضع الصيانة", maintenanceModeDescription: "تقييد الوصول للمستخدمين غير المسؤولين. لا يزال بإمكان المسؤولين الوصول إلى الموقع.",
      saveGeneralSettingsButton: "حفظ الإعدادات العامة",
      themeAppearanceTitle: "المظهر والتخصيص", themeAppearanceDescription: "تخصيص شكل ومظهر التطبيق.",
      primaryColorLabel: "اللون الأساسي", backgroundColorLabel: "لون الخلفية (السمة الفاتحة)", accentColorLabel: "لون التمييز",
      livePreviewText: "(معاينة مباشرة)", colorPickerDescription: "تقوم إعدادات الألوان هذه بتجاوز السمة الأساسية ديناميكيًا. للتباين الأمثل، خاصة للنص على هذه الخلفيات الملونة المخصصة، قد تحتاج إلى ضبط متغيرات `*-foreground` المقابلة مباشرة في `globals.css`.",
      darkModeLabel: "الوضع الداكن", darkModeDescription: "تبديل الوضع الداكن للتطبيق.", themePreferencesNote: "يتم حفظ تفضيلات السمة في متصفحك.",
      securityAccessTitle: "الأمان والوصول", securityAccessDescription: "إدارة سياسات الأمان وعناصر التحكم في الوصول. (عناصر نائبة)",
      securityPlaceholderIntro: "هذا القسم هو عنصر نائب لإعدادات الأمان المستقبلية، مثل:", securityPlaceholders: ["سياسات فرض المصادقة الثنائية (2FA).", "مدد انتهاء صلاحية الجلسة بسبب عدم النشاط.", "القائمة البيضاء أو السوداء لعناوين IP لوصول المسؤول.", "تكوين تفصيل سجل التدقيق والاحتفاظ به.", "قواعد تعقيد كلمة المرور وسياسات إعادة التعيين."],
      updateSecurityButton: "تحديث سياسات الأمان",
      toastSettingsSavedTitle: "تم حفظ الإعدادات", toastGeneralSettingsUpdated: "تم تحديث الإعدادات العامة.", toastDarkModeEnabled: "تم تفعيل الوضع الداكن", toastDarkModeDisabled: "تم تعطيل الوضع الداكن", toastThemePreferenceUpdated: "تم تحديث تفضيل السمة.",
      loadingSettings: "جارٍ تحميل الإعدادات...",
      bannerManagementTitle: "إدارة بانر الصفحة الرئيسية", bannerManagementDesc: "إضافة وإزالة وإعادة ترتيب بانرات الصور/الفيديو للصفحة الرئيسية.",
      addBannerItemButton: "إضافة بانر",
      bannerTableType: "النوع", bannerTableUrl: "الرابط/المحتوى", bannerTableAlt: "العنوان/النص البديل", bannerTableOrder: "الترتيب", bannerTableActive: "نشط", bannerTableActions: "الإجراءات",
      bannerTableAbout: "نص 'عنا'", 
      bannerEdit: "تعديل", bannerDelete: "حذف", bannerNoItems: "لم تتم إضافة أي بانرات بعد.",
      addBannerDialogTitle: "إضافة بانر جديد للصفحة الرئيسية", addBannerDialogDesc: "أدخل تفاصيل البانر الجديد.",
      editBannerDialogTitle: "تعديل بانر الصفحة الرئيسية", editBannerDialogDesc: "تعديل تفاصيل عنصر البانر هذا.",
      bannerTypeLabel: "النوع", bannerTypePlaceholder: "اختر النوع", bannerTypeImage: "صورة", bannerTypeVideo: "فيديو",
      bannerUrlLabel: "الرابط", bannerUrlPlaceholder: "https://example.com/image.jpg أو video_file.mp4",
      bannerAltTextLabel: "العنوان / النص البديل", bannerAltTextPlaceholder: "نص وصفي للبانر",
      bannerAboutUsTextLabel: "نص 'عنا' (الإنجليزية - لبانرات الفيديو)", 
      bannerAboutUsTextPlaceholder: "أدخل النص الذي سيظهر بجانب الفيديو...",
      bannerAboutUsTextDescription: "سيظهر هذا النص بجانب الفيديو في الصفحة الرئيسية. اتركه فارغًا إذا لم يكن مطلوبًا.", 
      bannerAboutUsTextArLabel: "نص 'عنا' (العربية - لبانرات الفيديو)", 
      bannerAboutUsTextArPlaceholder: "أدخل النص الذي سيظهر بجانب الفيديو...", 
      bannerAboutUsTextArDescription: "سيظهر هذا النص بجانب الفيديو في الصفحة الرئيسية. اتركه فارغًا إذا لم يكن مطلوبًا.", 
      bannerOrderLabel: "الترتيب", bannerActiveLabel: "نشط",
      saveBannerButton: "حفظ البانر", savingBannerButton: "جارٍ الحفظ...", cancelButton: "إلغاء",
      toastBannerAddedTitle: "تمت إضافة البانر", toastBannerAddedDesc: (name: string) => `تمت إضافة البانر "${name}" بنجاح.`,
      toastBannerAddFailedTitle: "فشل إضافة البانر",
      toastBannerDeletedTitle: "تم حذف البانر", toastBannerDeletedDesc: "تمت إزالة عنصر البانر.",
      toastBannerDeleteFailedTitle: "فشل الحذف",
      toastBannerUpdatedTitle: "تم تحديث البانر", toastBannerUpdatedDesc: "تم تحديث تفاصيل عنصر البانر.",
      toastBannerUpdateFailedTitle: "فشل تحديث البانر",
      confirmDeleteBannerTitle: "تأكيد الحذف", confirmDeleteBannerMessage: (name: string) => `هل أنت متأكد أنك تريد حذف البانر "${name}"؟`,
      zodBannerTypeRequired: "نوع البانر مطلوب.", zodBannerUrlInvalid: "الرجاء إدخال رابط صالح.", zodBannerAltTextRequired: "العنوان/النص البديل مطلوب.", zodBannerOrderMin: "يجب أن يكون الترتيب رقمًا غير سالب.",
      heroImageSettingsTitle: "إعدادات بطل الصفحة الرئيسية", // Updated
      heroImageSettingsDesc: "قم بتعيين صورة أو فيديو الخلفية لقسم البطل في الصفحة الرئيسية.",
      heroImageUrlLabel: "رابط صورة البطل", heroImageUrlPlaceholder: "https://example.com/hero-background.jpg",
      heroVideoUrlLabel: "رابط فيديو البطل (اختياري)", // New label
      heroVideoUrlPlaceholder: "https://example.com/hero-background.mp4 أو رابط يوتيوب/فيميو", // New placeholder
      heroImageAiHintLabel: "تلميح AI لصورة البطل (اختياري)", heroImageAiHintPlaceholder: "مثال: جبال مهيبة، شاطئ هادئ",
      saveHeroImageButton: "حفظ إعدادات البطل", toastHeroImageSaved: "تم حفظ إعدادات البطل.", toastHeroImageSaveFailed: "فشل حفظ إعدادات البطل.",
    },
  };
  const currentTranslations = translations[language];

  const applyColorVariable = (variableName: string, hexColor: string) => {
    const hsl = hexToHsl(hexColor);
    if (hsl && document?.documentElement) {
      document.documentElement.style.setProperty(variableName, `${hsl.h} ${hsl.s}% ${hsl.l}%`);
    }
  };

  useEffect(() => {
    const storedAppName = localStorage.getItem('voya_appName');
    if (storedAppName) setAppNameInput(storedAppName); else setAppNameInput(contextAppName);
    setIsMaintenanceMode(localStorage.getItem('voya_maintenanceMode') === 'true');
    const storedDarkMode = localStorage.getItem('voya_darkMode') === 'true';
    setIsDarkMode(storedDarkMode);
    if (document?.documentElement) document.documentElement.classList.toggle('dark', storedDarkMode);
    const storedPrimaryColor = localStorage.getItem('voya_primaryColor') || DEFAULT_PRIMARY_COLOR;
    setPrimaryColor(storedPrimaryColor); applyColorVariable('--primary', storedPrimaryColor);
    const storedBackgroundColor = localStorage.getItem('voya_backgroundColor') || DEFAULT_BACKGROUND_COLOR;
    setBackgroundColor(storedBackgroundColor); applyColorVariable('--background', storedBackgroundColor);
    const storedAccentColor = localStorage.getItem('voya_accentColor') || DEFAULT_ACCENT_COLOR;
    setAccentColor(storedAccentColor); applyColorVariable('--accent', storedAccentColor);
    setIsLoading(false);

    if (user?.role === USER_ROLES.SUPER_ADMIN) {
      setLoadingBanners(true);
      const q = query(collection(db, "homepageBanners"), orderBy("order", "asc"));
      const unsubscribeBanners = onSnapshot(q, (snapshot) => {
        const bannersData = snapshot.docs.map(docSnap => ({
          id: docSnap.id,
          ...docSnap.data(),
          aboutUsText: docSnap.data().aboutUsText || '', 
          aboutUsText_ar: docSnap.data().aboutUsText_ar || '', 
          createdAt: (docSnap.data().createdAt as Timestamp)?.toDate(),
          updatedAt: (docSnap.data().updatedAt as Timestamp)?.toDate(),
        } as HomepageBanner));
        setHomepageBanners(bannersData);
        setLoadingBanners(false);
      }, (error) => {
        console.error("Error fetching homepage banners:", error);
        toast({ title: "Error", description: "Could not load homepage banners.", variant: "destructive" });
        setLoadingBanners(false);
      });

      setLoadingHeroSettings(true);
      const heroConfigDocRef = doc(db, 'siteConfiguration', 'homepage');
      const unsubscribeHero = onSnapshot(heroConfigDocRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as HomepageConfig;
          setHeroImageUrlInput(data.heroImageUrl || '');
          setHeroVideoUrlInput(data.heroVideoUrl || ''); // Load video URL
          setHeroImageAiHintInput(data.heroImageAiHint || '');
        } else {
          setHeroImageUrlInput('');
          setHeroVideoUrlInput(''); // Default to empty
          setHeroImageAiHintInput('');
        }
        setLoadingHeroSettings(false);
      }, (error) => {
        console.error("Error fetching hero settings:", error);
        toast({ title: "Error", description: "Could not load hero image settings.", variant: "destructive" });
        setLoadingHeroSettings(false);
      });

      return () => {
        unsubscribeBanners();
        unsubscribeHero();
      };
    } else {
      setLoadingBanners(false);
      setLoadingHeroSettings(false);
    }
  }, [contextAppName, user?.role, toast]);

  const handleSaveGeneralSettings = () => { 
    localStorage.setItem('voya_appName', appNameInput);
    localStorage.setItem('voya_maintenanceMode', String(isMaintenanceMode));
    toast({ title: currentTranslations.toastSettingsSavedTitle, description: currentTranslations.toastGeneralSettingsUpdated });
  };
  const handleDarkModeToggle = (checked: boolean) => { 
    setIsDarkMode(checked);
    if (document?.documentElement) document.documentElement.classList.toggle('dark', checked);
    localStorage.setItem('voya_darkMode', String(checked));
    toast({ title: checked ? currentTranslations.toastDarkModeEnabled : currentTranslations.toastDarkModeDisabled, description: currentTranslations.toastThemePreferenceUpdated });
  };
  const handleColorChange = (setter: React.Dispatch<React.SetStateAction<string>>, key: string, cssVar: string) => (e: React.ChangeEvent<HTMLInputElement>) => { 
    const newColor = e.target.value;
    setter(newColor); applyColorVariable(cssVar, newColor); localStorage.setItem(key, newColor);
    toast({ title: currentTranslations.toastThemePreferenceUpdated });
  };

  const handleToggleBannerActive = async (banner: HomepageBanner) => {
    try {
      const bannerRef = doc(db, 'homepageBanners', banner.id);
      await updateDoc(bannerRef, { isActive: !banner.isActive, updatedAt: serverTimestamp() });
      toast({ title: currentTranslations.toastBannerUpdatedTitle, description: "Banner active status updated." });
    } catch (error) {
      console.error("Error updating banner status:", error);
      toast({ title: "Update Failed", description: (error as Error).message, variant: "destructive" });
    }
  };

  const handleDeleteBanner = async (banner: HomepageBanner) => {
    if (confirm(currentTranslations.confirmDeleteBannerMessage(banner.altText || banner.id))) {
      try {
        await deleteDoc(doc(db, 'homepageBanners', banner.id));
        toast({ title: currentTranslations.toastBannerDeletedTitle, description: currentTranslations.toastBannerDeletedDesc });
      } catch (error) {
        console.error("Error deleting banner:", error);
        toast({ title: currentTranslations.toastBannerDeleteFailedTitle, description: (error as Error).message, variant: "destructive" });
      }
    }
  };

  const handleOpenEditBannerDialog = (banner: HomepageBanner) => {
    setCurrentBannerToEdit(banner);
    setIsEditBannerDialogOpen(true);
  };
  
  const handleSaveHeroSettings = async () => { // Renamed from handleSaveHeroImageSettings
    setLoadingHeroSettings(true);
    try {
      const heroConfigDocRef = doc(db, 'siteConfiguration', 'homepage');
      await setDoc(heroConfigDocRef, { 
        heroImageUrl: heroImageUrlInput,
        heroVideoUrl: heroVideoUrlInput, // Save video URL
        heroImageAiHint: heroImageAiHintInput,
        updatedAt: serverTimestamp() 
      }, { merge: true });
      toast({ title: currentTranslations.toastHeroImageSaved }); // Toast message can remain generic
    } catch (error) {
      console.error("Error saving hero settings:", error);
      toast({ title: currentTranslations.toastHeroImageSaveFailed, description: (error as Error).message, variant: "destructive" });
    } finally {
      setLoadingHeroSettings(false);
    }
  };


  if (isLoading) { 
    return (
        <div className="space-y-8" dir={direction}>
            <div className="flex items-center justify-between">
                <div>
                <h1 className="text-3xl font-headline font-bold flex items-center">
                    <Settings className={cn("h-8 w-8 text-primary", direction === 'rtl' ? 'ml-3' : 'mr-3')} />
                    {currentTranslations.pageTitle}
                </h1>
                <p className="text-muted-foreground">{currentTranslations.loadingSettings}</p>
                </div>
            </div>
            <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
                <Card className="shadow-lg border"><CardHeader><CardTitle>{currentTranslations.generalSettingsTitle}</CardTitle></CardHeader><CardContent><p>{currentTranslations.loadingSettings}</p></CardContent></Card>
                <Card className="shadow-lg border"><CardHeader><CardTitle>{currentTranslations.themeAppearanceTitle}</CardTitle></CardHeader><CardContent><p>{currentTranslations.loadingSettings}</p></CardContent></Card>
                {user?.role === USER_ROLES.SUPER_ADMIN && (
                  <>
                    <Card className="shadow-lg border lg:col-span-2"><CardHeader><CardTitle>{currentTranslations.bannerManagementTitle}</CardTitle></CardHeader><CardContent><p>{currentTranslations.loadingSettings}</p></CardContent></Card>
                    <Card className="shadow-lg border lg:col-span-2"><CardHeader><CardTitle>{currentTranslations.heroImageSettingsTitle}</CardTitle></CardHeader><CardContent><p>{currentTranslations.loadingSettings}</p></CardContent></Card>
                  </>
                )}
                <Card className="shadow-lg border lg:col-span-2"><CardHeader><CardTitle>{currentTranslations.securityAccessTitle}</CardTitle></CardHeader><CardContent><p>{currentTranslations.loadingSettings}</p></CardContent></Card>
            </div>
        </div>
    );
  }

  return (
    <div className="space-y-8" dir={direction}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold flex items-center">
            <Settings className={cn("h-8 w-8 text-primary", direction === 'rtl' ? 'ml-3' : 'mr-3')} />
            {currentTranslations.pageTitle}
          </h1>
          <p className="text-muted-foreground">{currentTranslations.pageDescription}</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        <Card className="shadow-lg border">
            <CardHeader>
                <CardTitle className="flex items-center"><Settings className={cn("h-5 w-5 text-primary", direction === 'rtl' ? 'ml-2' : 'mr-2')} /> {currentTranslations.generalSettingsTitle}</CardTitle>
                <CardDescription>{currentTranslations.generalSettingsDescription}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="appName">{currentTranslations.appNameLabel}</Label>
                    <Input id="appName" value={appNameInput} onChange={(e) => setAppNameInput(e.target.value)} placeholder={currentTranslations.appNamePlaceholder} />
                    <p className="text-xs text-muted-foreground">{currentTranslations.appNameDescription}</p>
                </div>
                <div className="flex items-center justify-between space-x-2 p-4 border rounded-lg bg-background hover:bg-muted/50 transition-colors">
                <div className="space-y-0.5">
                    <Label htmlFor="maintenanceMode" className="text-base font-medium">{currentTranslations.maintenanceModeLabel}</Label>
                    <p className="text-sm text-muted-foreground">{currentTranslations.maintenanceModeDescription}</p>
                </div>
                <Switch id="maintenanceMode" checked={isMaintenanceMode} onCheckedChange={setIsMaintenanceMode} aria-label={currentTranslations.maintenanceModeLabel} />
                </div>
                <Button onClick={handleSaveGeneralSettings} className="w-full sm:w-auto shadow-md hover:shadow-lg">{currentTranslations.saveGeneralSettingsButton}</Button>
            </CardContent>
        </Card>

        <Card className="shadow-lg border">
          <CardHeader>
            <CardTitle className="flex items-center"><Palette className={cn("h-5 w-5 text-primary", direction === 'rtl' ? 'ml-2' : 'mr-2')} /> {currentTranslations.themeAppearanceTitle}</CardTitle>
            <CardDescription>{currentTranslations.themeAppearanceDescription}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
                <Label htmlFor="primaryColor">{currentTranslations.primaryColorLabel}</Label>
                <div className="flex items-center gap-2">
                <Input id="primaryColor" type="color" value={primaryColor} onChange={handleColorChange(setPrimaryColor, 'voya_primaryColor', '--primary')} className="w-16 h-10 p-1 cursor-pointer" />
                <span className="text-sm text-muted-foreground">{primaryColor.toUpperCase()} {currentTranslations.livePreviewText}</span>
                </div>
            </div>
            <div className="space-y-2">
                <Label htmlFor="backgroundColor">{currentTranslations.backgroundColorLabel}</Label>
                <div className="flex items-center gap-2">
                <Input id="backgroundColor" type="color" value={backgroundColor} onChange={handleColorChange(setBackgroundColor, 'voya_backgroundColor', '--background')} className="w-16 h-10 p-1 cursor-pointer" />
                <span className="text-sm text-muted-foreground">{backgroundColor.toUpperCase()} {currentTranslations.livePreviewText}</span>
                </div>
            </div>
                <div className="space-y-2">
                <Label htmlFor="accentColor">{currentTranslations.accentColorLabel}</Label>
                <div className="flex items-center gap-2">
                <Input id="accentColor" type="color" value={accentColor} onChange={handleColorChange(setAccentColor, 'voya_accentColor', '--accent')} className="w-16 h-10 p-1 cursor-pointer" />
                <span className="text-sm text-muted-foreground">{accentColor.toUpperCase()} {currentTranslations.livePreviewText}</span>
                </div>
            </div>
                <p className="text-xs text-muted-foreground italic">{currentTranslations.colorPickerDescription}</p>
                <div className="flex items-center justify-between space-x-2 p-4 border rounded-lg bg-background hover:bg-muted/50 transition-colors">
                <div className="space-y-0.5">
                    <Label htmlFor="darkModeToggle" className="text-base font-medium">{currentTranslations.darkModeLabel}</Label>
                    <p className="text-sm text-muted-foreground">{currentTranslations.darkModeDescription}</p>
                </div>
                <Switch id="darkModeToggle" checked={isDarkMode} onCheckedChange={handleDarkModeToggle} aria-label={currentTranslations.darkModeLabel} />
            </div>
                <p className="text-sm text-muted-foreground italic">{currentTranslations.themePreferencesNote}</p>
          </CardContent>
        </Card>

        {user?.role === USER_ROLES.SUPER_ADMIN && (
          <>
            <Card className="shadow-lg border lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center"><ImagePlay className={cn("h-5 w-5 text-primary", direction === 'rtl' ? 'ml-2' : 'mr-2')} /> {currentTranslations.heroImageSettingsTitle}</CardTitle>
                <CardDescription>{currentTranslations.heroImageSettingsDesc}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="heroImageUrl">{currentTranslations.heroImageUrlLabel}</Label>
                  <Input id="heroImageUrl" type="url" placeholder={currentTranslations.heroImageUrlPlaceholder} value={heroImageUrlInput} onChange={(e) => setHeroImageUrlInput(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="heroVideoUrl">{currentTranslations.heroVideoUrlLabel}</Label>
                  <Input id="heroVideoUrl" type="url" placeholder={currentTranslations.heroVideoUrlPlaceholder} value={heroVideoUrlInput} onChange={(e) => setHeroVideoUrlInput(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="heroImageAiHint">{currentTranslations.heroImageAiHintLabel}</Label>
                  <Input id="heroImageAiHint" placeholder={currentTranslations.heroImageAiHintPlaceholder} value={heroImageAiHintInput} onChange={(e) => setHeroImageAiHintInput(e.target.value)} />
                </div>
                <Button onClick={handleSaveHeroSettings} disabled={loadingHeroSettings} className="w-full sm:w-auto">
                  {loadingHeroSettings && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {currentTranslations.saveHeroImageButton}
                </Button>
              </CardContent>
            </Card>

            <Card className="shadow-lg border lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center"><ImageIcon className={cn("h-5 w-5 text-primary", direction === 'rtl' ? 'ml-2' : 'mr-2')} /> {currentTranslations.bannerManagementTitle}</CardTitle>
                <CardDescription>{currentTranslations.bannerManagementDesc}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button onClick={() => setIsAddBannerDialogOpen(true)} className="w-full sm:w-auto">
                  <PlusCircle className={cn("h-4 w-4", direction === 'rtl' ? 'ml-2' : 'mr-2')} /> {currentTranslations.addBannerItemButton}
                </Button>
                {loadingBanners ? <p>{currentTranslations.loadingSettings}</p> : homepageBanners.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{currentTranslations.bannerTableType}</TableHead>
                          <TableHead className="max-w-[150px] truncate">{currentTranslations.bannerTableUrl}</TableHead>
                          <TableHead>{currentTranslations.bannerTableAlt}</TableHead>
                          <TableHead className="hidden sm:table-cell">{currentTranslations.bannerTableAbout}</TableHead>
                          <TableHead className="text-center">{currentTranslations.bannerTableOrder}</TableHead>
                          <TableHead className="text-center">{currentTranslations.bannerTableActive}</TableHead>
                          <TableHead className="text-right">{currentTranslations.bannerTableActions}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {homepageBanners.map((banner) => (
                          <TableRow key={banner.id}>
                            <TableCell className="capitalize">{banner.type === 'image' ? <ImageIcon className="h-5 w-5 inline-block mr-1"/> : <Video className="h-5 w-5 inline-block mr-1"/>}{banner.type}</TableCell>
                            <TableCell className="max-w-[100px] md:max-w-[150px] truncate text-xs"><a href={banner.url} target="_blank" rel="noopener noreferrer" className="hover:underline">{banner.url}</a></TableCell>
                            <TableCell className="max-w-[150px] truncate">{banner.altText}</TableCell>
                            <TableCell className="hidden sm:table-cell max-w-[150px] truncate text-xs">
                              {banner.type === 'video' ? (
                                language === 'ar' && banner.aboutUsText_ar ? banner.aboutUsText_ar : (banner.aboutUsText || '-')
                              ) : '-'}
                            </TableCell>
                            <TableCell className="text-center">{banner.order}</TableCell>
                            <TableCell className="text-center">
                              <Switch checked={banner.isActive} onCheckedChange={() => handleToggleBannerActive(banner)} aria-label={`Toggle active status for ${banner.altText}`} />
                            </TableCell>
                            <TableCell className="text-right space-x-1">
                              <Button variant="ghost" size="icon" onClick={() => handleOpenEditBannerDialog(banner)} title={currentTranslations.bannerEdit}><Edit2 className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDeleteBanner(banner)} title={currentTranslations.bannerDelete} className="text-destructive hover:text-destructive-foreground hover:bg-destructive"><Trash2 className="h-4 w-4" /></Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : <p className="text-sm text-muted-foreground text-center py-4">{currentTranslations.bannerNoItems}</p>}
              </CardContent>
              <AddBannerItemDialog 
                  isOpen={isAddBannerDialogOpen} 
                  onOpenChange={setIsAddBannerDialogOpen} 
                  onBannerAdded={() => { /* Could refetch or rely on onSnapshot */ }}
                  translations={currentTranslations}
              />
              <EditBannerItemDialog
                  isOpen={isEditBannerDialogOpen}
                  onOpenChange={setIsEditBannerDialogOpen}
                  bannerToEdit={currentBannerToEdit}
                  onBannerUpdated={() => {setCurrentBannerToEdit(null); /* Could refetch */}}
                  translations={currentTranslations}
              />
            </Card>
          </>
        )}

        <Card className="shadow-lg border lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center"><ShieldAlert className={cn("h-5 w-5 text-primary", direction === 'rtl' ? 'ml-2' : 'mr-2')} /> {currentTranslations.securityAccessTitle}</CardTitle>
            <CardDescription>{currentTranslations.securityAccessDescription}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <p className="text-muted-foreground">{currentTranslations.securityPlaceholderIntro}</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 text-sm pl-4">
                {currentTranslations.securityPlaceholders.map((text, index) => (<li key={index}>{text}</li>))}
            </ul>
            <Button disabled className="w-full sm:w-auto">{currentTranslations.updateSecurityButton}</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
