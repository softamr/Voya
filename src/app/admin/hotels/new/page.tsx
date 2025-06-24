
"use client";

import type { NextPage } from 'next';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
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
import { ArrowLeft, PlusCircle, Save, Hotel as HotelIcon, BedDouble, ImagePlus, Trash2, UploadCloud, Sparkles, Loader2 } from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import type { Destination, RoomType, Hotel, HotelImage } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot } from 'firebase/firestore';
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
      roomTypeName: z.string().optional(),
      count: z.coerce.number().int().min(0, { message: translations.zodRoomCountMin }).default(0),
    })
  ).optional(),
});

type HotelFormValues = z.infer<ReturnType<typeof getHotelSchema>>;

const AddHotelPage: NextPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const destIdFromParams = searchParams.get('destinationId');
  const { toast } = useToast();
  const { language, direction } = useLanguage();
  const [formSubmitLoading, setFormSubmitLoading] = useState(false);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [masterRoomTypes, setMasterRoomTypes] = useState<RoomType[]>([]);
  const [allHotels, setAllHotels] = useState<Hotel[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [generatingImageForIndex, setGeneratingImageForIndex] = useState<number | null>(null);

  const translations = {
    en: {
      backButton: "Back to Hotel List",
      pageTitle: "Add New Hotel",
      pageDescription: "Fill in the details to add a new hotel to the system.",
      nameLabel: "Hotel Name",
      namePlaceholder: "e.g., The Grand Resort",
      addressLabel: "Address",
      addressPlaceholder: "123 Main Street, City, Country",
      destinationLabel: "Destination",
      destinationPlaceholder: "Select a destination",
      destinationLoading: "Loading destinations...",
      destinationNotAvailable: "No destinations available",
      destinationCreateFirst: "Create destinations first",
      descriptionLabel: "Description",
      descriptionPlaceholder: "Describe the hotel and its amenities...",
      imageUrlsTitle: "Hotel Images",
      imageUrlsDescription: "Add one or more image URLs for the hotel. Direct upload coming soon.",
      addImageButton: "Add Image URL",
      removeImageButton: "Remove This Image",
      imageUrlLabel: "Image URL",
      imageUrlPlaceholder: "https://placehold.co/800x600.png",
      aiHintLabel: "Image AI Hint (Optional)",
      aiHintPlaceholder: "e.g., luxury lobby, beach view",
      generateWithAiButton: "Generate with AI",
      generatingAiButton: "Generating...",
      fileInputPlaceholder: "Or Upload (Soon)",
      roomInventoryTitle: "Room Inventory",
      roomInventoryNoneDefined: "No master room types defined. Please add room types first to set inventory.",
      roomInventoryLoading: "Loading room types...",
      roomInventoryCountPlaceholder: "Count",
      cancelButton: "Cancel",
      createButton: "Create Hotel",
      creatingButton: "Creating...",
      toastCreatedTitle: "Hotel Created",
      toastCreatedDescription: (name: string) => `Hotel "${name}" has been successfully saved.`,
      toastFailedTitle: "Failed to Create Hotel",
      toastFailedDescriptionDefault: "An unexpected error occurred while saving the hotel.",
      toastImageGenSuccess: "Image generated successfully!",
      toastImageGenFailed: "Failed to generate image",
      toastMissingAiHint: "Please enter an AI hint to generate an image",
      toastError: "Error",
      zodNameMin: "Hotel name must be at least 2 characters.",
      zodAddressMin: "Address must be at least 5 characters.",
      zodDescriptionMin: "Description must be at least 10 characters.",
      zodDestinationRequired: "Please select a destination.",
      zodImageUrlInvalid: "Please enter a valid image URL.",
      zodAiHintMax: "AI Hint should be brief, max 50 chars.",
      zodRoomCountMin: "Count must be non-negative.",
      errorLoadingDestinations: "Could not load destinations.",
      errorLoadingRoomTypes: "Could not load room types.",
    },
    ar: {
      backButton: "العودة إلى قائمة الفنادق",
      pageTitle: "إضافة فندق جديد",
      pageDescription: "املأ التفاصيل لإضافة فندق جديد إلى النظام.",
      nameLabel: "اسم الفندق",
      namePlaceholder: "مثال: المنتجع الكبير",
      addressLabel: "العنوان",
      addressPlaceholder: "123 الشارع الرئيسي، المدينة، الدولة",
      destinationLabel: "الوجهة",
      destinationPlaceholder: "اختر وجهة",
      destinationLoading: "جارٍ تحميل الوجهات...",
      destinationNotAvailable: "لا توجد وجهات متاحة",
      destinationCreateFirst: "أنشئ الوجهات أولاً",
      descriptionLabel: "الوصف",
      descriptionPlaceholder: "صف الفندق ووسائل الراحة فيه...",
      imageUrlsTitle: "صور الفندق",
      imageUrlsDescription: "أضف رابط صورة واحد أو أكثر للفندق. التحميل المباشر قريباً.",
      addImageButton: "إضافة رابط صورة",
      removeImageButton: "إزالة هذه الصورة",
      imageUrlLabel: "رابط الصورة",
      imageUrlPlaceholder: "https://placehold.co/800x600.png",
      aiHintLabel: "تلميح الصورة للذكاء الاصطناعي (اختياري)",
      aiHintPlaceholder: "مثال: ردهة فاخرة، إطلالة على الشاطئ",
      generateWithAiButton: "إنشاء بالذكاء الاصطناعي",
      generatingAiButton: "جارٍ الإنشاء...",
      fileInputPlaceholder: "أو تحميل (قريباً)",
      roomInventoryTitle: "مخزون الغرف",
      roomInventoryNoneDefined: "لم يتم تحديد أنواع غرف رئيسية. يرجى إضافة أنواع الغرف أولاً لضبط المخزون.",
      roomInventoryLoading: "جارٍ تحميل أنواع الغرف...",
      roomInventoryCountPlaceholder: "العدد",
      cancelButton: "إلغاء",
      createButton: "إنشاء فندق",
      creatingButton: "جارٍ الإنشاء...",
      toastCreatedTitle: "تم إنشاء الفندق",
      toastCreatedDescription: (name: string) => `تم حفظ الفندق "${name}" بنجاح.`,
      toastFailedTitle: "فشل إنشاء الفندق",
      toastFailedDescriptionDefault: "حدث خطأ غير متوقع أثناء حفظ الفندق.",
      toastImageGenSuccess: "تم إنشاء الصورة بنجاح!",
      toastImageGenFailed: "فشل في إنشاء الصورة",
      toastMissingAiHint: "الرجاء إدخال تلميح للذكاء الاصطناعي لإنشاء صورة",
      toastError: "خطأ",
      zodNameMin: "يجب أن يتكون اسم الفندق من حرفين على الأقل.",
      zodAddressMin: "يجب أن يتكون العنوان من 5 أحرف على الأقل.",
      zodDescriptionMin: "يجب أن يتكون الوصف من 10 أحرف على الأقل.",
      zodDestinationRequired: "الرجاء اختيار وجهة.",
      zodImageUrlInvalid: "الرجاء إدخال رابط صورة صالح.",
      zodAiHintMax: "يجب أن يكون تلميح الذكاء الاصطناعي موجزًا، 50 حرفًا كحد أقصى.",
      zodRoomCountMin: "يجب أن يكون العدد غير سالب.",
      errorLoadingDestinations: "تعذر تحميل الوجهات.",
      errorLoadingRoomTypes: "تعذر تحميل أنواع الغرف.",
    }
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
      imageUrls: [{ url: '', dataAiHint: '' }],
      roomInventory: [],
    },
  });

  const { fields: roomInventoryFields, replace: replaceRoomInventory } = useFieldArray({
    control: form.control,
    name: "roomInventory",
  });

  const { fields: imageUrlFields, append: appendImageUrl, remove: removeImageUrl } = useFieldArray({
    control: form.control,
    name: "imageUrls",
  });

  useEffect(() => {
    if (destIdFromParams && form.getValues('destinationId') !== destIdFromParams) {
      form.setValue('destinationId', destIdFromParams, { shouldValidate: true, shouldDirty: true });
    }
  }, [destIdFromParams, form]);

  useEffect(() => {
    setDataLoading(true);
    let unsubDestinations: (() => void) | undefined;
    let unsubRoomTypes: (() => void) | undefined;
    let unsubHotels: (() => void) | undefined;

    const destQuery = query(collection(db, "destinations"), orderBy("name", "asc"));
    unsubDestinations = onSnapshot(destQuery, (snapshot) => {
      setDestinations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Destination)));
    }, (error) => {
      console.error("Error fetching destinations: ", error);
      toast({ title: "Error", description: currentTranslations.errorLoadingDestinations, variant: "destructive" });
    });

    const roomTypesQuery = query(collection(db, "roomTypes"), orderBy("name", "asc"));
    unsubRoomTypes = onSnapshot(roomTypesQuery, (snapshot) => {
      setMasterRoomTypes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RoomType)));
    }, (error) => {
      console.error("Error fetching master room types: ", error);
      toast({ title: "Error", description: currentTranslations.errorLoadingRoomTypes, variant: "destructive" });
    });
    
    const hotelsQuery = query(collection(db, "hotels"), orderBy("name", "asc"));
    unsubHotels = onSnapshot(hotelsQuery, (snapshot) => {
        setAllHotels(snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Hotel)));
    }, (error) => {
        console.error("Error fetching all hotels:", error);
    });
    
    setDataLoading(false); 

    return () => {
      if (unsubDestinations) unsubDestinations();
      if (unsubRoomTypes) unsubRoomTypes();
      if (unsubHotels) unsubHotels();
    };
  }, [toast, currentTranslations.errorLoadingDestinations, currentTranslations.errorLoadingRoomTypes]);


  useEffect(() => {
    if (masterRoomTypes.length > 0) {
        const currentInventoryValues = form.getValues("roomInventory") || [];
        const newInventorySetup = masterRoomTypes.map(rt => {
            const existing = currentInventoryValues.find(inv => inv.roomTypeId === rt.id);
            return {
                roomTypeId: rt.id,
                roomTypeName: rt.name,
                count: existing?.count || 0,
            };
        });
        replaceRoomInventory(newInventorySetup);
    } else {
        replaceRoomInventory([]); 
    }
  }, [masterRoomTypes, form, replaceRoomInventory]);

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
        const currentImageUrls = form.getValues('imageUrls');
        const updatedImageUrls = [...currentImageUrls];
        updatedImageUrls[index] = { ...updatedImageUrls[index], url: result.imageUrl };
        form.setValue('imageUrls', updatedImageUrls);
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
    setFormSubmitLoading(true);
    try {
      const hotelDataToSave = {
        name: data.name,
        address: data.address,
        description: data.description,
        destinationId: data.destinationId,
        imageUrls: data.imageUrls?.filter(img => img.url) || [], // Filter out empty URLs
        roomInventory: data.roomInventory?.map(item => ({
            roomTypeId: item.roomTypeId,
            count: item.count,
        })) || [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await addDoc(collection(db, "hotels"), hotelDataToSave);
      
      toast({
        title: currentTranslations.toastCreatedTitle,
        description: currentTranslations.toastCreatedDescription(data.name),
      });
      setFormSubmitLoading(false);
      router.push('/admin/hotels');
    } catch (error) {
        console.error("Error creating hotel:", error);
        toast({ title: currentTranslations.toastFailedTitle, description: (error as Error).message || currentTranslations.toastFailedDescriptionDefault, variant: "destructive" });
        setFormSubmitLoading(false);
    }
  };
  
  const selectedDestinationId = form.watch('destinationId'); 

  const filteredHotels = useMemo(() => {
    if (!selectedDestinationId) return []; 
    return allHotels.filter(hotel => hotel.destinationId === selectedDestinationId);
  }, [selectedDestinationId, allHotels]);


  if (dataLoading && destinations.length === 0 && masterRoomTypes.length === 0) {
    return (
        <div className="space-y-6" dir={direction}>
         <Skeleton className="h-9 w-36 mb-4" />
         <Card className="max-w-2xl mx-auto">
          <CardHeader><Skeleton className="h-8 w-2/5 mb-2" /><Skeleton className="h-4 w-3/4" /></CardHeader>
          <CardContent className="space-y-6">
            {[...Array(7)].map((_,i) => <Skeleton key={i} className="h-10 w-full" />)} {/* Increased for image fields */}
            <Skeleton className="h-20 w-full" />
            <div className="flex justify-end space-x-3 pt-4">
                <Skeleton className="h-10 w-24" /><Skeleton className="h-10 w-28" />
            </div>
          </CardContent>
         </Card>
        </div>
    )
  }

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
            <HotelIcon className={cn("h-6 w-6 text-primary", direction === 'rtl' ? 'ml-3' : 'mr-3')} /> {currentTranslations.pageTitle}
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
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{currentTranslations.addressLabel}</FormLabel>
                    <FormControl>
                      <Input placeholder={currentTranslations.addressPlaceholder} {...field} />
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
                    <Select 
                        onValueChange={(value) => {
                            field.onChange(value);
                        }} 
                        value={field.value || undefined} 
                        disabled={destinations.length === 0 && !dataLoading}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={destinations.length === 0 ? (dataLoading ? currentTranslations.destinationLoading : currentTranslations.destinationNotAvailable) : currentTranslations.destinationPlaceholder} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {destinations.length === 0 && !dataLoading && <SelectItem value="no-dest" disabled>{currentTranslations.destinationCreateFirst}</SelectItem>}
                        {destinations.map(dest => (
                            <SelectItem key={dest.id} value={dest.id}>
                                {dest.name}
                            </SelectItem>
                        ))}
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
                      <Textarea placeholder={currentTranslations.descriptionPlaceholder} {...field} rows={4} />
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
                            <Input type="file" className="text-sm flex-grow" disabled title={currentTranslations.fileInputPlaceholder} />
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
                <h3 className="text-lg font-medium flex items-center">
                  <BedDouble className={cn("h-5 w-5 text-primary", direction === 'rtl' ? 'ml-2' : 'mr-2')} /> {currentTranslations.roomInventoryTitle}
                </h3>
                {masterRoomTypes.length === 0 && !dataLoading && <p className="text-sm text-muted-foreground">{currentTranslations.roomInventoryNoneDefined}</p>}
                {dataLoading && masterRoomTypes.length === 0 && <p className="text-sm text-muted-foreground">{currentTranslations.roomInventoryLoading}</p>}
                
                {roomInventoryFields.map((item, index) => {
                  const roomTypeDetails = masterRoomTypes.find(rt => rt.id === item.roomTypeId);
                  return (
                    <div key={item.id} className="grid grid-cols-3 items-center gap-4">
                      <FormLabel className="col-span-2">{roomTypeDetails?.name || `Room ID: ${item.roomTypeId}`}</FormLabel>
                      <FormField
                        control={form.control}
                        name={`roomInventory.${index}.count`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="0" 
                                placeholder={currentTranslations.roomInventoryCountPlaceholder}
                                {...field} 
                                onChange={e => field.onChange(parseInt(e.target.value, 10) || 0)}
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
                  {formSubmitLoading ? currentTranslations.creatingButton : currentTranslations.createButton}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AddHotelPage;
