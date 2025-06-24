
"use client";

import type { NextPage } from 'next';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Save, Hotel as HotelIcon, BedDouble, ImagePlus, Trash2, UploadCloud, PlusCircle, Sparkles, Loader2 } from 'lucide-react';
import type { Hotel, Destination, RoomType, HotelImage } from '@/lib/types';
import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, serverTimestamp, collection, query, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { generateHotelImage } from '@/ai/flows/generate-hotel-image-flow';

const getImageSchema = (translations: any) => z.object({
  url: z.string().url({ message: translations.zodImageUrlInvalid }).or(z.literal('')),
  dataAiHint: z.string().max(50, { message: translations.zodAiHintMax }).optional().or(z.literal('')),
});

const getHotelSchema = (translations: any) => z.object({
  name: z.string().min(2, { message: translations.zodNameMin }),
  address: z.string().min(5, { message: translations.zodAddressMin }),
  description: z.string().min(10, { message: translations.zodDescriptionMin }),
  destinationId: z.string({ required_error: translations.zodDestinationRequired }),
  imageUrls: z.array(getImageSchema(translations)).optional(),
  roomInventory: z.array(
    z.object({
      roomTypeId: z.string(),
      roomTypeName: z.string().optional(), // For display only in form
      count: z.coerce.number().int().min(0, { message: translations.zodRoomCountMin }).default(0),
    })
  ).optional(),
});

type HotelFormValues = z.infer<ReturnType<typeof getHotelSchema>>;

const EditHotelPage: NextPage = () => {
  const router = useRouter();
  const { hotelId } = useParams<{ hotelId: string }>();
  const { toast } = useToast();
  const { language, direction } = useLanguage();

  const [formSubmitLoading, setFormSubmitLoading] = useState(false);
  const [hotel, setHotel] = useState<Hotel | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [masterRoomTypes, setMasterRoomTypes] = useState<RoomType[]>([]);
  const [generatingImageForIndex, setGeneratingImageForIndex] = useState<number | null>(null);
  
  const translations = { // Same as AddHotelPage, can be centralized if needed
    en: {
      backButton: "Back to Hotel List",
      pageTitle: "Edit Hotel",
      pageDescription: "Modify the details of this hotel.",
      nameLabel: "Hotel Name",
      addressLabel: "Address",
      destinationLabel: "Destination",
      destinationPlaceholder: "Select a destination",
      destinationLoading: "Loading destinations...",
      destinationNotAvailable: "No destinations available",
      destinationCreateFirst: "Create destinations first",
      descriptionLabel: "Description",
      imageUrlsTitle: "Hotel Images",
      imageUrlsDescription: "Manage image URLs for the hotel. Use AI Hint to generate images.",
      addImageButton: "Add Image URL",
      removeImageButton: "Remove This Image",
      imageUrlLabel: "Image URL",
      imageUrlPlaceholder: "https://placehold.co/800x600.png or AI generated Data URI",
      aiHintLabel: "Image AI Hint (Optional)",
      aiHintPlaceholder: "e.g., luxury lobby, beach view",
      generateWithAiButton: "Generate with AI",
      generatingAiButton: "Generating...",
      fileInputPlaceholder: "Or Upload (Soon)",
      roomInventoryTitle: "Room Inventory",
      roomInventoryNoneDefined: "No master room types defined. Add room types first to set inventory.",
      roomInventoryLoading: "Loading room types...",
      roomInventoryCountPlaceholder: "Count",
      cancelButton: "Cancel",
      saveButton: "Save Changes",
      savingButton: "Saving...",
      toastUpdatedTitle: "Hotel Updated",
      toastUpdatedDescription: (name: string) => `Hotel "${name}" has been successfully updated.`,
      toastFailedTitle: "Update Failed",
      toastError: "Error",
      toastNotFound: "Hotel not found.",
      toastMissingId: "Hotel ID is missing.",
      toastImageGenSuccess: "AI Image generated and URL updated!",
      toastImageGenFailed: "AI Image generation failed.",
      toastMissingAiHint: "Please provide an AI Hint for image generation.",
      zodNameMin: "Hotel name must be at least 2 characters.",
      zodAddressMin: "Address must be at least 5 characters.",
      zodDescriptionMin: "Description must be at least 10 characters.",
      zodDestinationRequired: "Please select a destination.",
      zodImageUrlInvalid: "Please enter a valid image URL or let AI generate one.",
      zodAiHintMax: "AI Hint should be brief, max 50 chars.",
      zodRoomCountMin: "Count must be non-negative.",
      errorLoadingDestinations: "Could not load destinations.",
      errorLoadingRoomTypes: "Could not load room types.",
    },
    ar: {
      backButton: "العودة إلى قائمة الفنادق",
      pageTitle: "تعديل الفندق",
      pageDescription: "تعديل تفاصيل هذا الفندق.",
      nameLabel: "اسم الفندق",
      addressLabel: "العنوان",
      destinationLabel: "الوجهة",
      destinationPlaceholder: "اختر وجهة",
      destinationLoading: "جارٍ تحميل الوجهات...",
      destinationNotAvailable: "لا توجد وجهات متاحة",
      destinationCreateFirst: "أنشئ الوجهات أولاً",
      descriptionLabel: "الوصف",
      imageUrlsTitle: "صور الفندق",
      imageUrlsDescription: "إدارة روابط صور الفندق. استخدم تلميح الذكاء الاصطناعي لإنشاء الصور.",
      addImageButton: "إضافة رابط صورة",
      removeImageButton: "إزالة هذه الصورة",
      imageUrlLabel: "رابط الصورة",
      imageUrlPlaceholder: "https://placehold.co/800x600.png أو Data URI من إنشاء AI",
      aiHintLabel: "تلميح الصورة للذكاء الاصطناعي (اختياري)",
      aiHintPlaceholder: "مثال: ردهة فاخرة، إطلالة على الشاطئ",
      generateWithAiButton: "إنشاء بواسطة الذكاء الاصطناعي",
      generatingAiButton: "جارٍ الإنشاء...",
      fileInputPlaceholder: "أو تحميل (قريباً)",
      roomInventoryTitle: "مخزون الغرف",
      roomInventoryNoneDefined: "لم يتم تحديد أنواع غرف رئيسية. يرجى إضافة أنواع الغرف أولاً لضبط المخزون.",
      roomInventoryLoading: "جارٍ تحميل أنواع الغرف...",
      roomInventoryCountPlaceholder: "العدد",
      cancelButton: "إلغاء",
      saveButton: "حفظ التغييرات",
      savingButton: "جارٍ الحفظ...",
      toastUpdatedTitle: "تم تحديث الفندق",
      toastUpdatedDescription: (name: string) => `تم تحديث الفندق "${name}" بنجاح.`,
      toastFailedTitle: "فشل التحديث",
      toastError: "خطأ",
      toastNotFound: "لم يتم العثور على الفندق.",
      toastMissingId: "معرف الفندق مفقود.",
      toastImageGenSuccess: "تم إنشاء صورة AI وتحديث الرابط!",
      toastImageGenFailed: "فشل إنشاء صورة AI.",
      toastMissingAiHint: "يرجى تقديم تلميح AI لإنشاء الصورة.",
      zodNameMin: "يجب أن يتكون اسم الفندق من حرفين على الأقل.",
      zodAddressMin: "يجب أن يتكون العنوان من 5 أحرف على الأقل.",
      zodDescriptionMin: "يجب أن يتكون الوصف من 10 أحرف على الأقل.",
      zodDestinationRequired: "الرجاء اختيار وجهة.",
      zodImageUrlInvalid: "الرجاء إدخال رابط صورة صالح أو دع الذكاء الاصطناعي ينشئ واحدًا.",
      zodAiHintMax: "يجب أن يكون تلميح الذكاء الاصطناعي موجزًا، 50 حرفًا كحد أقصى.",
      zodRoomCountMin: "يجب أن يكون العدد غير سالب.",
      errorLoadingDestinations: "تعذر تحميل الوجهات.",
      errorLoadingRoomTypes: "تعذر تحميل أنواع الغرف.",
    },
  };
  const currentTranslations = translations[language];
  const hotelSchema = getHotelSchema(currentTranslations);

  const form = useForm<HotelFormValues>({
    resolver: zodResolver(hotelSchema),
    defaultValues: { 
      name: '',
      address: '',
      description: '',
      destinationId: undefined, 
      imageUrls: [], 
      roomInventory: [], 
    },
  });

  const { fields: roomInventoryFields, replace: replaceRoomInventory } = useFieldArray({
    control: form.control,
    name: "roomInventory",
  });

  const { fields: imageUrlFields, append: appendImageUrl, remove: removeImageUrl, update: updateImageUrl, replace: replaceImageUrls } = useFieldArray({
    control: form.control,
    name: "imageUrls",
  });


  useEffect(() => {
    let unsubDestinations: (() => void) | undefined;
    let unsubRoomTypes: (() => void) | undefined;

    const fetchInitialData = async () => {
        setDataLoading(true);

        const destQuery = query(collection(db, "destinations"), orderBy("name", "asc"));
        unsubDestinations = onSnapshot(destQuery, (snapshot) => {
            setDestinations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Destination)));
        }, (error) => {
          console.error("Error fetching destinations:", error);
          toast({title: currentTranslations.toastError, description: currentTranslations.errorLoadingDestinations, variant: "destructive"});
        });

        const roomTypesQuery = query(collection(db, "roomTypes"), orderBy("name", "asc"));
        unsubRoomTypes = onSnapshot(roomTypesQuery, (snapshot) => {
            setMasterRoomTypes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RoomType)));
        }, (error) => {
          console.error("Error fetching room types:", error);
          toast({title: currentTranslations.toastError, description: currentTranslations.errorLoadingRoomTypes, variant: "destructive"});
        });

        if (hotelId) {
            const hotelDocRef = doc(db, "hotels", hotelId);
            const hotelSnap = await getDoc(hotelDocRef);
            if (hotelSnap.exists()) {
                const fetchedHotelData = hotelSnap.data() as Hotel;
                const hotelDataToSet: Hotel = { 
                    id: hotelSnap.id,
                    ...fetchedHotelData,
                    imageUrls: fetchedHotelData.imageUrls || [],
                    roomInventory: fetchedHotelData.roomInventory || [],
                    createdAt: fetchedHotelData.createdAt instanceof Timestamp ? fetchedHotelData.createdAt.toDate() : new Date(fetchedHotelData.createdAt as Date),
                    updatedAt: fetchedHotelData.updatedAt instanceof Timestamp ? fetchedHotelData.updatedAt.toDate() : new Date(fetchedHotelData.updatedAt as Date),
                };
                setHotel(hotelDataToSet);
            } else {
                toast({ title: currentTranslations.toastError, description: currentTranslations.toastNotFound, variant: "destructive" });
                router.replace('/admin/hotels');
            }
        } else {
            toast({ title: currentTranslations.toastError, description: currentTranslations.toastMissingId, variant: "destructive" });
            router.replace('/admin/hotels');
        }
        setDataLoading(false);
    };

    fetchInitialData();
    return () => {
        if (unsubDestinations) unsubDestinations();
        if (unsubRoomTypes) unsubRoomTypes();
    };
  }, [hotelId, router, toast, language, currentTranslations.toastError, currentTranslations.errorLoadingDestinations, currentTranslations.errorLoadingRoomTypes, currentTranslations.toastNotFound, currentTranslations.toastMissingId]);


  useEffect(() => {
    if (hotel) { 
      let inventoryToSetBasedOnHotelAndMasterTypes: HotelFormValues['roomInventory'] = [];
      if (masterRoomTypes.length > 0) {
        inventoryToSetBasedOnHotelAndMasterTypes = masterRoomTypes.map(rt => {
          const existingHotelInvItem = hotel.roomInventory?.find(inv => inv.roomTypeId === rt.id);
          return {
            roomTypeId: rt.id,
            roomTypeName: rt.name,
            count: existingHotelInvItem?.count || 0,
          };
        });
      } else if (hotel.roomInventory && hotel.roomInventory.length > 0) {
        inventoryToSetBasedOnHotelAndMasterTypes = hotel.roomInventory.map(invItem => ({
            roomTypeId: invItem.roomTypeId,
            roomTypeName: invItem.roomTypeName || `ID: ${invItem.roomTypeId}`, 
            count: invItem.count
        }));
      }
      
      form.reset({
        name: hotel.name || '',
        address: hotel.address || '',
        description: hotel.description || '',
        destinationId: hotel.destinationId || undefined,
        imageUrls: hotel.imageUrls?.map(img => ({ url: img.url, dataAiHint: img.dataAiHint || '' })) || [],
        roomInventory: inventoryToSetBasedOnHotelAndMasterTypes,
      });
      if (!hotel.imageUrls || hotel.imageUrls.length === 0) {
        replaceImageUrls([{ url: '', dataAiHint: '' }]);
      }
    }
  }, [hotel, masterRoomTypes, form, replaceImageUrls]);


  const handleGenerateImage = async (index: number) => {
    const hint = form.getValues(`imageUrls.${index}.dataAiHint`);
    if (!hint || hint.trim() === "") {
      toast({ title: currentTranslations.toastError, description: currentTranslations.toastMissingAiHint, variant: "destructive" });
      return;
    }
    setGeneratingImageForIndex(index);
    try {
      const result = await generateHotelImage({ prompt: hint });
      if (result.imageUrl) {
        updateImageUrl(index, { ...form.getValues(`imageUrls.${index}`), url: result.imageUrl });
        toast({ title: currentTranslations.toastImageGenSuccess });
      } else {
        throw new Error("Generated image URL was empty.");
      }
    } catch (error) {
      console.error("Error generating image:", error);
      toast({ title: currentTranslations.toastImageGenFailed, description: (error as Error).message, variant: "destructive" });
    } finally {
      setGeneratingImageForIndex(null);
    }
  };

  const onSubmit = async (data: HotelFormValues) => {
    if (!hotelId) {
        toast({ title: currentTranslations.toastError, description: currentTranslations.toastMissingId, variant: "destructive" });
        return;
    }
    setFormSubmitLoading(true);
    try {
        const roomInventoryForFirestore = data.roomInventory?.map(item => ({
            roomTypeId: item.roomTypeId,
            count: item.count,
        })) || [];

        const hotelDataToUpdate = {
            name: data.name,
            address: data.address,
            description: data.description,
            destinationId: data.destinationId,
            imageUrls: data.imageUrls?.filter(img => img.url) || [], 
            roomInventory: roomInventoryForFirestore,
            updatedAt: serverTimestamp(),
        };
        
        const hotelDocRef = doc(db, "hotels", hotelId);
        await updateDoc(hotelDocRef, hotelDataToUpdate);
        
        toast({
          title: currentTranslations.toastUpdatedTitle,
          description: currentTranslations.toastUpdatedDescription(data.name),
        });
        setFormSubmitLoading(false);
        router.push('/admin/hotels');
    } catch (error) {
        console.error("Error updating hotel:", error);
        toast({ title: currentTranslations.toastFailedTitle, description: (error as Error).message, variant: "destructive" });
        setFormSubmitLoading(false);
    }
  };
  
  if (dataLoading) {
    return (
      <div className="space-y-6" dir={direction}>
        <Skeleton className="h-9 w-32 mb-4" />
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <Skeleton className="h-8 w-3/5 mb-2" />
            <Skeleton className="h-4 w-4/5" />
          </CardHeader>
          <CardContent className="space-y-6">
            {[...Array(7)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            <Skeleton className="h-20 w-full" /> 
            <div className="flex justify-end space-x-3 pt-4">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-28" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!hotel && !dataLoading) return ( 
      <div className="space-y-6 text-center" dir={direction}>
        <p className="text-muted-foreground">{currentTranslations.toastNotFound}</p>
         <Button variant="outline" size="sm" asChild className="mt-4">
          <Link href="/admin/hotels">
            <ArrowLeft className={cn("h-4 w-4", direction === 'rtl' ? 'ml-2' : 'mr-2')} />
            {currentTranslations.backButton}
          </Link>
        </Button>
    </div>
  );

  return (
    <div className="space-y-6" dir={direction}>
      <Button variant="outline" size="sm" asChild className="mb-4">
        <Link href="/admin/hotels">
          <ArrowLeft className={cn("h-4 w-4", direction === 'rtl' ? 'ml-2' : 'mr-2')} />
          {currentTranslations.backButton}
        </Link>
      </Button>

      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl font-headline flex items-center">
            <HotelIcon className={cn("h-6 w-6 text-primary", direction === 'rtl' ? 'ml-3' : 'mr-3')} /> {currentTranslations.pageTitle}: {form.getValues("name") || hotel?.name}
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
                      <Input placeholder="e.g., The Grand Resort" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{currentTranslations.addressLabel}</FormLabel>
                    <FormControl>
                      <Input placeholder="123 Main Street, City, Country" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="destinationId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{currentTranslations.destinationLabel}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || undefined} >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={destinations.length === 0 ? currentTranslations.destinationNotAvailable : currentTranslations.destinationPlaceholder} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {destinations.map(dest => (
                          <SelectItem key={dest.id} value={dest.id}>
                            {dest.name}
                          </SelectItem>
                        ))}
                         {destinations.length === 0 && <SelectItem value="loading" disabled>{currentTranslations.destinationCreateFirst}</SelectItem>}
                      </SelectContent>
                    </Select>
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
                      <Textarea placeholder="Describe the hotel and its amenities..." {...field} rows={4} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="space-y-4 border-t pt-4 mt-4">
                <h3 className="text-lg font-medium flex items-center">
                  <ImagePlus className={cn("h-5 w-5 text-primary", direction === 'rtl' ? 'ml-2' : 'mr-2')} /> {currentTranslations.imageUrlsTitle}
                </h3>
                 <FormDescription>{currentTranslations.imageUrlsDescription}</FormDescription>
                {imageUrlFields.map((item, index) => (
                  <Card key={item.id} className="p-4 bg-muted/30 shadow-sm">
                    <div className="grid grid-cols-1 gap-4">
                      <FormField
                        control={form.control}
                        name={`imageUrls.${index}.url`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{currentTranslations.imageUrlLabel} {index + 1}</FormLabel>
                            <FormControl>
                              <Input type="url" placeholder={currentTranslations.imageUrlPlaceholder} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                        <FormField
                          control={form.control}
                          name={`imageUrls.${index}.dataAiHint`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{currentTranslations.aiHintLabel} {index + 1}</FormLabel>
                              <FormControl>
                                <Input placeholder={currentTranslations.aiHintPlaceholder} {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleGenerateImage(index)}
                          disabled={generatingImageForIndex === index}
                          className="w-full sm:w-auto"
                        >
                          {generatingImageForIndex === index ? (
                            <Loader2 className={cn("h-4 w-4 animate-spin", direction === 'rtl' ? 'ml-2' : 'mr-2')} />
                          ) : (
                            <Sparkles className={cn("h-4 w-4", direction === 'rtl' ? 'ml-2' : 'mr-2')} />
                          )}
                          {generatingImageForIndex === index ? currentTranslations.generatingAiButton : currentTranslations.generateWithAiButton}
                        </Button>
                      </div>
                       <div className="flex items-center gap-2">
                            <Input type="file" className="text-sm flex-grow" disabled title={currentTranslations.fileInputPlaceholder}/>
                            <UploadCloud className="h-5 w-5 text-muted-foreground" />
                        </div>
                    </div>
                    {imageUrlFields.length > 1 && (
                        <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => removeImageUrl(index)}
                        className="mt-3"
                        >
                        <Trash2 className={cn("h-4 w-4", direction === 'rtl' ? 'ml-2' : 'mr-2')} /> {currentTranslations.removeImageButton}
                        </Button>
                    )}
                  </Card>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => appendImageUrl({ url: '', dataAiHint: '' })}
                >
                  <PlusCircle className={cn("h-4 w-4", direction === 'rtl' ? 'ml-2' : 'mr-2')} /> {currentTranslations.addImageButton}
                </Button>
                {form.formState.errors.imageUrls && <FormMessage>{form.formState.errors.imageUrls.message || form.formState.errors.imageUrls.root?.message}</FormMessage>}
              </div>

              <div className="space-y-4 border-t pt-4 mt-4">
                <h3 className="text-lg font-medium flex items-center"><BedDouble className={cn("h-5 w-5 text-primary", direction === 'rtl' ? 'ml-2' : 'mr-2')} /> {currentTranslations.roomInventoryTitle}</h3>
                {masterRoomTypes.length === 0 && !dataLoading && <p className="text-sm text-muted-foreground">{currentTranslations.roomInventoryNoneDefined}</p>}
                {dataLoading && masterRoomTypes.length === 0 && <p className="text-sm text-muted-foreground">{currentTranslations.roomInventoryLoading}</p>}

                {roomInventoryFields.map((item, index) => {
                  const displayRoomTypeName = form.getValues(`roomInventory.${index}.roomTypeName`);
                  return (
                    <div key={item.id} className="grid grid-cols-3 items-center gap-4">
                      <FormLabel className="col-span-2">{displayRoomTypeName || `Room ID: ${item.roomTypeId}`}</FormLabel>
                      <FormField
                        control={form.control}
                        name={`roomInventory.${index}.count`}
                        render={({ field: countField }) => (
                          <FormItem>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="0" 
                                placeholder={currentTranslations.roomInventoryCountPlaceholder}
                                {...countField} 
                                onChange={e => countField.onChange(parseInt(e.target.value, 10) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <Button type="button" variant="outline" onClick={() => router.back()} disabled={formSubmitLoading}>
                  {currentTranslations.cancelButton}
                </Button>
                <Button type="submit" disabled={formSubmitLoading || dataLoading}>
                  <Save className={cn("h-4 w-4", direction === 'rtl' ? 'ml-2' : 'mr-2')} />
                  {formSubmitLoading ? currentTranslations.savingButton : currentTranslations.saveButton}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default EditHotelPage;
