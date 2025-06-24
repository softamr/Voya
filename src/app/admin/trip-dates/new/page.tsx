
"use client";

import type { NextPage } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, PlusCircle, Save, CalendarDays as CalendarIconLucide, BedDouble, User, Users2, Palette, ListChecks, Trash2, Tag } from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import type { Destination, Hotel, RoomType, TripDateRoomAvailability, ExtraFeeConfig } from '@/lib/types';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { TRIP_FEATURES, TRIP_FEATURES_TRANSLATIONS, type TripFeature } from '@/lib/constants';
import { useLanguage } from '@/contexts/LanguageContext';

const tripDateStatusEnum = z.enum(['active', 'full', 'cancelled']);

const getExtraFeeSchema = (translations: any) => z.object({
  id: z.string(),
  name: z.string().min(1, { message: translations.zodFeeNameRequired }),
  description: z.string().optional().or(z.literal('')),
  pricePerPerson: z.coerce.number().min(0, { message: translations.zodPriceNonNegative }).default(0),
});

const getTripDateSchema = (translations: any) => z.object({
  destinationId: z.string({ required_error: translations.zodDestinationRequired }),
  hotelId: z.string({ required_error: translations.zodHotelRequired }),
  dateRange: z.object({
    from: z.date({ required_error: translations.zodStartDateRequired }),
    to: z.date({ required_error: translations.zodEndDateRequired }),
  }).refine(data => data.from && data.to && data.from < data.to, {
    message: translations.zodEndDateAfterStart,
    path: ["to"],
  }),
  availableRoomsByType: z.array(
    z.object({
      roomTypeId: z.string(),
      pricePerPerson: z.coerce.number().min(0, { message: translations.zodPriceNonNegative }).default(0),
    })
  ).min(0, { message: translations.zodRoomPricingNeeded }).optional(),
  transportationPricePerPerson: z.coerce.number().min(0).optional(),
  childPricePerPerson: z.coerce.number().min(0).optional(),
  childMaxAge: z.coerce.number().int().min(0).max(17).optional(),
  selectedFeatures: z.array(z.enum(TRIP_FEATURES)).optional(),
  extraFees: z.array(getExtraFeeSchema(translations)).optional(),
  status: tripDateStatusEnum,
});

type TripDateFormValues = z.infer<ReturnType<typeof getTripDateSchema>>;

const AddTripDatePage: NextPage = () => {
  const router = useRouter();
  const { toast } = useToast();
  const { language, direction } = useLanguage();
  const [formSubmitLoading, setFormSubmitLoading] = useState(false);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [allHotels, setAllHotels] = useState<Hotel[]>([]);
  const [masterRoomTypes, setMasterRoomTypes] = useState<RoomType[]>([]);

  const [dataLoading, setDataLoading] = useState(true);
  const [selectedDestinationId, setSelectedDestinationId] = useState<string | undefined>();

  const translations = {
    en: {
      backButton: "Back to Trip Date List",
      pageTitle: "Add New Trip Date",
      pageDescription: "Define a new trip period with hotel, room pricing, features, and optional extra fees.",
      destinationLabel: "Destination",
      destinationPlaceholder: "Select a destination",
      destinationLoading: "Loading destinations...",
      destinationNotAvailable: "No destinations available",
      destinationCreateFirst: "Create destinations first",
      hotelLabel: "Hotel",
      hotelPlaceholder: "Select a hotel",
      hotelSelectDestinationFirst: "Select destination first",
      hotelLoading: "Loading hotels...",
      hotelNoHotelsForDestination: "No hotels for destination",
      tripDatesLabel: "Trip Dates (Start - End)",
      pickDateRangePlaceholder: "Pick a date range",
      roomPricingTitle: "Room Pricing",
      roomPricingDescription: "Specify the price per person for each room type offered by the selected hotel for this trip.",
      roomPricingNoHotelSelected: "Select a hotel to see its room types for pricing.",
      roomPricingHotelNoInventory: "Selected hotel has no room types in its inventory.",
      roomPricingMasterTypesNotLoaded: "Master room types are not loaded.",
      roomPricingSelectHotelWithInventory: "Select a hotel with room inventory.",
      roomPricingLoadingTypes: "Loading room types...",
      roomPricePerPersonLabel: "Price per Person",
      egpPlaceholder: "0.00",
      additionalPricingTitle: "Additional Pricing",
      transportationPriceLabel: "Transportation Price (Per Seat)",
      optionalPlaceholder: "Optional",
      childPriceLabel: "Child Price (Per Person)",
      childMaxAgeLabel: "Child Max Age",
      childMaxAgePlaceholder: "e.g., 12",
      tripFeaturesTitle: "Trip Features",
      tripFeaturesDescription: "Select the features included in this trip package.",
      extraFeesTitle: "Optional Extra Fees",
      addFeeButton: "Add Extra Service",
      removeFeeButton: "Remove Fee",
      extraFeesDescription: "Define additional optional services guests can select during reservation (e.g., tours, special dinners).",
      feeNameLabel: "Fee Name",
      feeNamePlaceholder: "e.g., City Tour",
      feeDescriptionLabel: "Description (Optional)",
      feeDescriptionPlaceholder: "Briefly describe the fee...",
      statusLabel: "Status",
      statusPlaceholder: "Select status",
      statusActive: "Active",
      statusFull: "Full",
      statusCancelled: "Cancelled",
      cancelButton: "Cancel",
      createButton: "Create Trip Date",
      creatingButton: "Creating...",
      toastErrorTitle: "Error",
      toastMissingDates: "Please select valid start and end dates.",
      toastCreatedTitle: "Trip Date Created",
      toastCreatedDescription: (hotelName: string, startDate: string) => `Trip date for ${hotelName} from ${startDate} has been created.`,
      toastCreationFailedTitle: "Creation Failed",
      zodDestinationRequired: "Please select a destination.",
      zodHotelRequired: "Please select a hotel.",
      zodStartDateRequired: "Start date is required.",
      zodEndDateRequired: "End date is required.",
      zodEndDateAfterStart: "End date must be after start date.",
      zodRoomPricingNeeded: "Room pricing details are needed.",
      zodPriceNonNegative: "Price must be non-negative.",
      zodFeeNameRequired: "Fee name is required.",
      errorLoadingDestinations: "Could not load destinations.",
      errorLoadingHotels: "Could not load hotels.",
      errorLoadingRoomTypes: "Could not load room types.",
    },
    ar: {
      backButton: "العودة إلى قائمة تواريخ الرحلات",
      pageTitle: "إضافة تاريخ رحلة جديد",
      pageDescription: "حدد فترة رحلة جديدة مع الفندق وأسعار الغرف والميزات والرسوم الإضافية الاختيارية.",
      destinationLabel: "الوجهة",
      destinationPlaceholder: "اختر وجهة",
      destinationLoading: "جارٍ تحميل الوجهات...",
      destinationNotAvailable: "لا توجد وجهات متاحة",
      destinationCreateFirst: "أنشئ الوجهات أولاً",
      hotelLabel: "الفندق",
      hotelPlaceholder: "اختر فندقًا",
      hotelSelectDestinationFirst: "اختر الوجهة أولاً",
      hotelLoading: "جارٍ تحميل الفنادق...",
      hotelNoHotelsForDestination: "لا توجد فنادق لهذه الوجهة",
      tripDatesLabel: "تواريخ الرحلة (البداية - النهاية)",
      pickDateRangePlaceholder: "اختر نطاق تاريخ",
      roomPricingTitle: "تسعير الغرف",
      roomPricingDescription: "حدد سعر الفرد لكل نوع غرفة يقدمه الفندق المختار لهذه الرحلة.",
      roomPricingNoHotelSelected: "اختر فندقًا لرؤية أنواع غرفه للتسعير.",
      roomPricingHotelNoInventory: "الفندق المختار ليس لديه أنواع غرف في مخزونه.",
      roomPricingMasterTypesNotLoaded: "لم يتم تحميل أنواع الغرف الرئيسية.",
      roomPricingSelectHotelWithInventory: "اختر فندقًا به مخزون غرف.",
      roomPricingLoadingTypes: "جارٍ تحميل أنواع الغرف...",
      roomPricePerPersonLabel: "السعر للفرد",
      egpPlaceholder: "0.00",
      additionalPricingTitle: "تسعير إضافي",
      transportationPriceLabel: "سعر النقل (للمقعد)",
      optionalPlaceholder: "اختياري",
      childPriceLabel: "سعر الطفل (للفرد)",
      childMaxAgeLabel: "الحد الأقصى لعمر الطفل",
      childMaxAgePlaceholder: "مثال: 12",
      tripFeaturesTitle: "ميزات الرحلة",
      tripFeaturesDescription: "حدد الميزات المضمنة في باقة الرحلة هذه.",
      extraFeesTitle: "رسوم إضافية اختيارية",
      addFeeButton: "إضافة خدمات إضافية",
      removeFeeButton: "إزالة الرسم",
      extraFeesDescription: "حدد الخدمات الإضافية الاختيارية التي يمكن للضيوف اختيارها أثناء الحجز (مثل الجولات والعشاء الخاص).",
      feeNameLabel: "اسم الخدمة",
      feeNamePlaceholder: "مثال: جولة في المدينة",
      feeDescriptionLabel: "الوصف (اختياري)",
      feeDescriptionPlaceholder: "صف الرسم بإيجاز...",
      statusLabel: "الحالة",
      statusPlaceholder: "اختر الحالة",
      statusActive: "نشط",
      statusFull: "ممتلئ",
      statusCancelled: "ملغى",
      cancelButton: "إلغاء",
      createButton: "إنشاء تاريخ الرحلة",
      creatingButton: "جارٍ الإنشاء...",
      toastErrorTitle: "خطأ",
      toastMissingDates: "الرجاء اختيار تواريخ بداية ونهاية صالحة.",
      toastCreatedTitle: "تم إنشاء تاريخ الرحلة",
      toastCreatedDescription: (hotelName: string, startDate: string) => `تم إنشاء تاريخ الرحلة لـ ${hotelName} من ${startDate}.`,
      toastCreationFailedTitle: "فشل الإنشاء",
      zodDestinationRequired: "الرجاء اختيار وجهة.",
      zodHotelRequired: "الرجاء اختيار فندق.",
      zodStartDateRequired: "تاريخ البدء مطلوب.",
      zodEndDateRequired: "تاريخ الانتهاء مطلوب.",
      zodEndDateAfterStart: "يجب أن يكون تاريخ الانتهاء بعد تاريخ البدء.",
      zodRoomPricingNeeded: "تفاصيل تسعير الغرف مطلوبة.",
      zodPriceNonNegative: "يجب أن يكون السعر غير سالب.",
      zodFeeNameRequired: "اسم الرسم مطلوب.",
      errorLoadingDestinations: "تعذر تحميل الوجهات.",
      errorLoadingHotels: "تعذر تحميل الفنادق.",
      errorLoadingRoomTypes: "تعذر تحميل أنواع الغرف.",
    }
  };

  const currentTranslations = translations[language];
  const tripDateSchema = getTripDateSchema(currentTranslations);
  const extraFeeSchema = getExtraFeeSchema(currentTranslations);


  const form = useForm<TripDateFormValues>({
    resolver: zodResolver(tripDateSchema),
    defaultValues: {
      destinationId: undefined,
      hotelId: undefined,
      dateRange: { from: undefined, to: undefined },
      availableRoomsByType: [],
      transportationPricePerPerson: 0,
      childPricePerPerson: 0,
      childMaxAge: 0,
      selectedFeatures: [],
      extraFees: [],
      status: 'active',
    },
  });

  const { fields: roomPricingFields, replace: replaceRoomPricingFields } = useFieldArray({
    control: form.control,
    name: "availableRoomsByType",
  });

  const { fields: extraFeeFields, append: appendExtraFee, remove: removeExtraFee } = useFieldArray({
    control: form.control,
    name: "extraFees",
  });

  useEffect(() => {
    setDataLoading(true);
    const unsubDestinations = onSnapshot(query(collection(db, "destinations"), orderBy("name", "asc")), (snapshot) => {
        setDestinations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Destination)));
    }, (error) => {
        console.error("Error fetching destinations:", error);
        toast({ title: currentTranslations.errorLoadingDestinations, variant: "destructive" });
    });

    const unsubHotels = onSnapshot(query(collection(db, "hotels"), orderBy("name", "asc")), (snapshot) => {
        setAllHotels(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Hotel)));
    }, (error) => {
        console.error("Error fetching hotels:", error);
        toast({ title: currentTranslations.errorLoadingHotels, variant: "destructive" });
    });

    const unsubRoomTypes = onSnapshot(query(collection(db, "roomTypes"), orderBy("name", "asc")), (snapshot) => {
        setMasterRoomTypes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RoomType)));
    }, (error) => {
        console.error("Error fetching room types:", error);
        toast({ title: currentTranslations.errorLoadingRoomTypes, variant: "destructive" });
    });

    setDataLoading(false);

    return () => {
        unsubDestinations();
        unsubHotels();
        unsubRoomTypes();
    };
  }, [toast, currentTranslations.errorLoadingDestinations, currentTranslations.errorLoadingHotels, currentTranslations.errorLoadingRoomTypes]);

  const filteredHotels = useMemo(() => {
    if (!selectedDestinationId) return [];
    return allHotels.filter(hotel => hotel.destinationId === selectedDestinationId);
  }, [selectedDestinationId, allHotels]);

  const watchedHotelId = form.watch('hotelId');

  useEffect(() => {
    if (watchedHotelId) {
      const selectedHotel = allHotels.find(h => h.id === watchedHotelId);
      if (selectedHotel && selectedHotel.roomInventory && selectedHotel.roomInventory.length > 0) {
        const pricingFieldsForHotel = selectedHotel.roomInventory.map(invItem => {
            return {
                roomTypeId: invItem.roomTypeId,
                pricePerPerson: 0,
            };
        });
        replaceRoomPricingFields(pricingFieldsForHotel);
      } else {
        replaceRoomPricingFields([]);
      }
    } else {
      replaceRoomPricingFields([]);
    }
  }, [watchedHotelId, allHotels, masterRoomTypes, replaceRoomPricingFields]);


  const onSubmit = async (data: TripDateFormValues) => {
    setFormSubmitLoading(true);
    if (!data.dateRange.from || !data.dateRange.to) {
        toast({ title: currentTranslations.toastErrorTitle, description: currentTranslations.toastMissingDates, variant: "destructive" });
        setFormSubmitLoading(false);
        return;
    }
    const processedData = {
        destinationId: data.destinationId,
        hotelId: data.hotelId,
        startDate: Timestamp.fromDate(data.dateRange.from),
        endDate: Timestamp.fromDate(data.dateRange.to),
        availableRoomsByType: data.availableRoomsByType?.map(item => ({
            ...item,
            roomTypeName: masterRoomTypes.find(rt => rt.id === item.roomTypeId)?.name || 'Unknown Room Type'
        })) || [],
        transportationPricePerPerson: data.transportationPricePerPerson,
        childPricePerPerson: data.childPricePerPerson,
        childMaxAge: data.childMaxAge,
        selectedFeatures: data.selectedFeatures || [],
        extraFees: data.extraFees?.map(ef => ({
            id: ef.id,
            name: ef.name,
            description: ef.description || null,
            pricePerPerson: ef.pricePerPerson,
        })) || [],
        status: data.status,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    };

    try {
        await addDoc(collection(db, "tripDates"), processedData);
        const hotelForToast = allHotels.find(h => h.id === data.hotelId);
        toast({
          title: currentTranslations.toastCreatedTitle,
          description: currentTranslations.toastCreatedDescription(hotelForToast?.name || 'selected hotel', format(data.dateRange.from, 'PP')),
        });
        router.push('/admin/trip-dates');
    } catch (error) {
        console.error("Error creating trip date:", error);
        toast({ title: currentTranslations.toastCreationFailedTitle, description: (error as Error).message, variant: "destructive" });
    } finally {
        setFormSubmitLoading(false);
    }
  };

  if (dataLoading && destinations.length === 0 && allHotels.length === 0 && masterRoomTypes.length === 0) {
     return (
      <div className="space-y-6" dir={direction}>
        <Skeleton className="h-9 w-40 mb-4" />
        <Card className="max-w-2xl mx-auto">
          <CardHeader><Skeleton className="h-8 w-3/5 mb-2" /><Skeleton className="h-4 w-4/5" /></CardHeader>
          <CardContent className="space-y-6">
            {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            <div className="flex justify-end space-x-3 pt-4">
                <Skeleton className="h-10 w-24" /><Skeleton className="h-10 w-28" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir={direction}>
      <Button variant="outline" size="sm" asChild className="mb-4">
        <Link href="/admin/trip-dates">
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
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField
                control={form.control}
                name="destinationId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{currentTranslations.destinationLabel}</FormLabel>
                    <Select
                        onValueChange={(value) => {
                            field.onChange(value);
                            setSelectedDestinationId(value);
                            form.setValue('hotelId', undefined);
                            replaceRoomPricingFields([]);
                        }}
                        value={field.value || undefined}
                        disabled={destinations.length === 0 && !dataLoading}
                    >
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder={destinations.length === 0 ? (dataLoading ? currentTranslations.destinationLoading : currentTranslations.destinationNotAvailable) : currentTranslations.destinationPlaceholder} /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {destinations.length === 0 && !dataLoading && <SelectItem value="no-dest" disabled>{currentTranslations.destinationCreateFirst}</SelectItem>}
                        {destinations.map(dest => (
                          <SelectItem key={dest.id} value={dest.id}>{dest.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="hotelId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{currentTranslations.hotelLabel}</FormLabel>
                    <Select
                        onValueChange={field.onChange}
                        value={field.value || undefined}
                        disabled={!selectedDestinationId || (filteredHotels.length === 0 && !dataLoading)}
                    >
                      <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder={!selectedDestinationId ? currentTranslations.hotelSelectDestinationFirst : (filteredHotels.length === 0 ? (dataLoading && !allHotels.length ? currentTranslations.hotelLoading :currentTranslations.hotelNoHotelsForDestination) : currentTranslations.hotelPlaceholder)} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {filteredHotels.length === 0 && selectedDestinationId && !dataLoading && <SelectItem value="no-hotels" disabled>{currentTranslations.hotelNoHotelsForDestination}</SelectItem>}
                        {filteredHotels.map(hotel => (
                          <SelectItem key={hotel.id} value={hotel.id}>{hotel.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dateRange"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>{currentTranslations.tripDatesLabel}</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !field.value?.from && "text-muted-foreground"
                            )}
                          >
                            <CalendarIconLucide className={cn("h-4 w-4", direction === 'rtl' ? 'ml-2' : 'mr-2')} />
                            {field.value?.from ? (
                              field.value.to ? (
                                <>
                                  {format(field.value.from, "LLL dd, y")} - {" "}
                                  {format(field.value.to, "LLL dd, y")}
                                </>
                              ) : (
                                format(field.value.from, "LLL dd, y")
                              )
                            ) : (
                              <span>{currentTranslations.pickDateRangePlaceholder}</span>
                            )}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          initialFocus
                          mode="range"
                          defaultMonth={field.value?.from}
                          selected={field.value}
                          onSelect={field.onChange}
                          numberOfMonths={2}
                          disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))}
                          dir={direction}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-4 border-t pt-6">
                <h3 className="text-lg font-medium flex items-center"><BedDouble className={cn("h-5 w-5 text-primary", direction === 'rtl' ? 'ml-2' : 'mr-2')} /> {currentTranslations.roomPricingTitle}</h3>
                <FormDescription>{currentTranslations.roomPricingDescription}</FormDescription>
                {roomPricingFields.length > 0 ? roomPricingFields.map((item, index) => {
                  const roomTypeDetails = masterRoomTypes.find(rt => rt.id === item.roomTypeId);
                  return (
                    <div key={item.id} className="grid grid-cols-1 md:grid-cols-2 items-end gap-4 p-4 border rounded-md shadow-sm bg-muted/30">
                      <FormLabel className="md:col-span-1 text-md font-semibold text-foreground self-center">
                        {roomTypeDetails?.name || `Room ID: ${item.roomTypeId}`}
                      </FormLabel>
                      <FormField
                        control={form.control}
                        name={`availableRoomsByType.${index}.pricePerPerson`}
                        render={({ field: priceField }) => (
                           <FormItem className="md:col-span-1">
                            <FormLabel>{currentTranslations.roomPricePerPersonLabel}</FormLabel>
                            <FormControl>
                            <div className="relative">
                                <span className={cn("absolute top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none", direction === 'rtl' ? 'right-3' : 'left-3')}>EGP</span>
                                <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    placeholder={currentTranslations.egpPlaceholder}
                                    className={direction === 'rtl' ? 'pr-10' : 'pl-10'}
                                    {...priceField}
                                    onChange={e => priceField.onChange(parseFloat(e.target.value) || 0)}
                                />
                            </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  );
                }) : (
                  <p className="text-sm text-muted-foreground p-4 border rounded-md text-center">
                    {watchedHotelId ? (allHotels.find(h => h.id === watchedHotelId)?.roomInventory?.length === 0 ? currentTranslations.roomPricingHotelNoInventory : (masterRoomTypes.length === 0 && !dataLoading ? currentTranslations.roomPricingMasterTypesNotLoaded : currentTranslations.roomPricingSelectHotelWithInventory)) : currentTranslations.roomPricingNoHotelSelected}
                    {dataLoading && (watchedHotelId && !masterRoomTypes.length) && currentTranslations.roomPricingLoadingTypes}
                  </p>
                )}
                {form.formState.errors.availableRoomsByType && <FormMessage>{form.formState.errors.availableRoomsByType.message}</FormMessage>}
              </div>

              <div className="space-y-4 border-t pt-6">
                <h3 className="text-lg font-medium flex items-center"><span className={cn("text-primary text-xl", direction === 'rtl' ? 'ml-2' : 'mr-2')}>EGP</span> {currentTranslations.additionalPricingTitle}</h3>
                 <FormField
                    control={form.control}
                    name="transportationPricePerPerson"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel className="flex items-center"><User className={cn("h-4 w-4", direction === 'rtl' ? 'ml-2' : 'mr-2')} /> {currentTranslations.transportationPriceLabel}</FormLabel>
                         <FormControl>
                            <div className="relative">
                                <span className={cn("absolute top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none", direction === 'rtl' ? 'right-3' : 'left-3')}>EGP</span>
                                <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    placeholder={currentTranslations.optionalPlaceholder}
                                    className={direction === 'rtl' ? 'pr-10' : 'pl-10'}
                                    {...field}
                                    onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                                />
                            </div>
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="childPricePerPerson"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel className="flex items-center"><Users2 className={cn("h-4 w-4", direction === 'rtl' ? 'ml-2' : 'mr-2')} /> {currentTranslations.childPriceLabel}</FormLabel>
                            <FormControl>
                                <div className="relative">
                                    <span className={cn("absolute top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none", direction === 'rtl' ? 'right-3' : 'left-3')}>EGP</span>
                                    <Input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        placeholder={currentTranslations.optionalPlaceholder}
                                        className={direction === 'rtl' ? 'pr-10' : 'pl-10'}
                                        {...field}
                                        onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                                    />
                                </div>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="childMaxAge"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>{currentTranslations.childMaxAgeLabel}</FormLabel>
                            <FormControl>
                                <Input
                                    type="number"
                                    min="0"
                                    max="17"
                                    placeholder={currentTranslations.childMaxAgePlaceholder}
                                    {...field}
                                    onChange={e => field.onChange(parseInt(e.target.value, 10) || 0)}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                </div>
              </div>

              <FormField
                control={form.control}
                name="selectedFeatures"
                render={() => (
                  <FormItem className="space-y-3 border-t pt-6">
                    <div className="mb-4">
                        <FormLabel className="text-lg font-medium flex items-center"><ListChecks className={cn("h-5 w-5 text-primary", direction === 'rtl' ? 'ml-2' : 'mr-2')}/> {currentTranslations.tripFeaturesTitle}</FormLabel>
                        <FormDescription>{currentTranslations.tripFeaturesDescription}</FormDescription>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                    {TRIP_FEATURES.map((feature) => (
                      <FormField
                        key={feature}
                        control={form.control}
                        name="selectedFeatures"
                        render={({ field }) => {
                          return (
                            <FormItem className="flex flex-row items-center space-x-3 space-y-0 p-2 rounded-md hover:bg-muted/50 transition-colors border">
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(feature)}
                                  onCheckedChange={(checked) => {
                                    const currentValue = field.value || [];
                                    return checked
                                      ? field.onChange([...currentValue, feature])
                                      : field.onChange(
                                          currentValue.filter(
                                            (value) => value !== feature
                                          )
                                        );
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="font-normal text-sm cursor-pointer flex-grow">
                                {TRIP_FEATURES_TRANSLATIONS[feature]?.[language] || feature}
                              </FormLabel>
                            </FormItem>
                          );
                        }}
                      />
                    ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-4 border-t pt-6">
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium flex items-center"><Tag className={cn("h-5 w-5 text-primary", direction === 'rtl' ? 'ml-2' : 'mr-2')} /> {currentTranslations.extraFeesTitle}</h3>
                    <Button type="button" variant="outline" size="sm" onClick={() => appendExtraFee({ id: crypto.randomUUID(), name: '', description: '', pricePerPerson: 0 })}>
                        <PlusCircle className={cn("h-4 w-4", direction === 'rtl' ? 'ml-2' : 'mr-2')} /> {currentTranslations.addFeeButton}
                    </Button>
                </div>
                <FormDescription>{currentTranslations.extraFeesDescription}</FormDescription>
                {extraFeeFields.map((field, index) => (
                    <Card key={field.id} className="p-4 bg-muted/30 shadow-sm">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name={`extraFees.${index}.name`}
                                render={({ field: nameField }) => (
                                    <FormItem>
                                        <FormLabel>{currentTranslations.feeNameLabel}</FormLabel>
                                        <FormControl><Input placeholder={currentTranslations.feeNamePlaceholder} {...nameField} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name={`extraFees.${index}.pricePerPerson`}
                                render={({ field: priceField }) => (
                                    <FormItem>
                                        <FormLabel>{currentTranslations.roomPricePerPersonLabel}</FormLabel> {/* Reusing room price label */}
                                        <FormControl>
                                            <div className="relative">
                                                <span className={cn("absolute top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none", direction === 'rtl' ? 'right-3' : 'left-3')}>EGP</span>
                                                <Input type="number" min="0" step="0.01" placeholder={currentTranslations.egpPlaceholder} className={direction === 'rtl' ? 'pr-10' : 'pl-10'} {...priceField} onChange={e => priceField.onChange(parseFloat(e.target.value) || 0)} />
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <FormField
                            control={form.control}
                            name={`extraFees.${index}.description`}
                            render={({ field: descField }) => (
                                <FormItem className="mt-4">
                                    <FormLabel>{currentTranslations.feeDescriptionLabel}</FormLabel>
                                    <FormControl><Textarea placeholder={currentTranslations.feeDescriptionPlaceholder} {...descField} rows={2} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="button" variant="destructive" size="sm" onClick={() => removeExtraFee(index)} className="mt-3">
                            <Trash2 className={cn("h-4 w-4", direction === 'rtl' ? 'ml-2' : 'mr-2')} /> {currentTranslations.removeFeeButton}
                        </Button>
                    </Card>
                ))}
                {form.formState.errors.extraFees && <FormMessage>{form.formState.errors.extraFees.message || form.formState.errors.extraFees.root?.message}</FormMessage>}
              </div>


              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem className="border-t pt-6">
                    <FormLabel>{currentTranslations.statusLabel}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder={currentTranslations.statusPlaceholder} /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {tripDateStatusEnum.options.map(statusValue => (
                           <SelectItem key={statusValue} value={statusValue}>
                             {statusValue === 'active' && currentTranslations.statusActive}
                             {statusValue === 'full' && currentTranslations.statusFull}
                             {statusValue === 'cancelled' && currentTranslations.statusCancelled}
                           </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-3 pt-8 border-t">
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

export default AddTripDatePage;

    
