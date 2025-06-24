
"use client";

import type { Dispatch, SetStateAction } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { DialogHeader, DialogTitle, DialogDescription as DialogDesc, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import type { Destination, Hotel, TripDate, RoomType, RequestedRoomItem, SelectedExtraFee, ExtraFeeConfig } from '@/lib/types';
import { useState, useEffect, useMemo } from 'react';
import { Loader2, BedDouble, Users, Bus, ShoppingCart, Tag, DollarSign, Info } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { addDoc, collection, serverTimestamp, query, orderBy, onSnapshot, Timestamp, where, doc } from 'firebase/firestore'; // Added doc
import { db } from '@/lib/firebase';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext'; // Import useAuth for admin details
import { USER_ROLES } from '@/lib/constants'; // Import USER_ROLES

const reservationStatusEnum = z.enum(['pending', 'contacted', 'confirmed', 'cancelled']);

const getAdminReservationSchema = (translations: any) => z.object({
  guestName: z.string().min(2, { message: translations.zodGuestNameMin }),
  guestPhone: z.string().min(7, { message: translations.zodGuestPhoneMin }),
  guestEmail: z.string().email({ message: translations.zodGuestEmailInvalid }).optional().or(z.literal('')),
  numberOfGuests: z.coerce.number().int().min(1, { message: translations.zodNumGuestsMin }),
  
  destinationId: z.string().min(1, { message: translations.zodSelectDestination }),
  hotelId: z.string().min(1, { message: translations.zodSelectHotel }),
  tripDateId: z.string().min(1, { message: translations.zodSelectTripDate }),

  requestedRooms: z.array(
    z.object({
      roomTypeId: z.string(),
      roomTypeName: z.string().optional(),
      pricePerPerson: z.number().optional(),
      capacity: z.number().optional(),
      numberOfRooms: z.coerce.number().int().min(0, translations.zodNumRoomsNonNegative),
    })
  ).optional(),
  selectedExtraFees: z.array(
    z.object({
      feeId: z.string(),
      numberOfGuestsForFee: z.coerce.number().int().min(1, translations.zodGuestsForFeeMin),
    })
  ).optional(),
  numberOfTransportationSeats: z.coerce.number().int().min(0, translations.zodNumSeatsNonNegative).optional(),
  
  totalCalculatedPrice: z.coerce.number().min(0, { message: translations.zodPriceNonNegative }),
  depositAmount: z.coerce.number().min(0, { message: translations.zodPriceNonNegative }).optional(),
  status: reservationStatusEnum,
  notes: z.string().optional().or(z.literal('')),
});

type AdminReservationFormValues = z.infer<ReturnType<typeof getAdminReservationSchema>>;

interface AdminNewReservationFormProps {
  onFormSubmitSuccess: () => void;
}

type FormRoomOption = RequestedRoomItem & { capacity: number };


export default function AdminNewReservationForm({ onFormSubmitSuccess }: AdminNewReservationFormProps) {
  const { toast } = useToast();
  const { language, direction } = useLanguage();
  const { user: adminUser } = useAuth(); // Get current admin user
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [calculatedTotal, setCalculatedTotal] = useState(0);

  const [allDestinations, setAllDestinations] = useState<Destination[]>([]);
  const [allHotels, setAllHotels] = useState<Hotel[]>([]);
  const [allTripDates, setAllTripDates] = useState<TripDate[]>([]);
  const [masterRoomTypes, setMasterRoomTypes] = useState<RoomType[]>([]);

  const [loadingDestinations, setLoadingDestinations] = useState(true);
  const [loadingHotels, setLoadingHotels] = useState(true);
  const [loadingTripDates, setLoadingTripDates] = useState(true);
  const [loadingRoomTypes, setLoadingRoomTypes] = useState(true);

  const translations = {
    en: {
      dialogTitle: "Create New Reservation (Admin Form)",
      dialogDescription: "Manually enter reservation details. Status and deposit can be set directly.",
      guestNameLabel: "Guest Full Name", guestNamePlaceholder: "Enter guest's full name",
      guestPhoneLabel: "Guest Phone Number", guestPhonePlaceholder: "Enter guest's phone number",
      guestEmailLabel: "Guest Email (Optional)", guestEmailPlaceholder: "guest@example.com",
      numGuestsLabel: "Total Number of Guests", numGuestsPlaceholder: "e.g., 2",
      
      selectDestinationLabel: "Select Destination", selectDestinationPlaceholder: "Choose a destination",
      selectHotelLabel: "Select Hotel", selectHotelPlaceholder: "Choose a hotel",
      selectTripDateLabel: "Select Trip Date", selectTripDatePlaceholder: "Choose a trip date",
      
      noDestinations: "No destinations available.",
      noHotelsForDestination: "No hotels for selected destination.",
      noActiveTripsForHotel: "No active trips for selected hotel.",
      
      roomSelectionTitle: "Room Selection",
      roomQtyPlaceholder: "Qty",
      
      transportationTitle: "Transportation",
      transportationSeatsLabel: "Number of Transportation Seats (Optional)",
      transportationSeatsPlaceholder: "e.g., 2",
      transportationPriceInfo: (price?: number) => `Price per seat: EGP ${price?.toFixed(2) || 'N/A'}`,

      optionalExtrasTitle: "Optional Extras",
      optionalExtrasDescription: "Select services and specify number of guests for each.",
      guestsForFeeLabel: "Number of Guests for this extra:",
      
      pricingAndStatusTitle: "Pricing & Status (Admin)",
      totalPriceLabel: "Total Calculated Price (EGP)", totalPricePlaceholder: "e.g., 1250.75",
      depositAmountLabel: "Deposit Amount (EGP, Optional)", depositAmountPlaceholder: "e.g., 500.00",
      statusLabel: "Reservation Status", statusPlaceholder: "Select initial status",
      notesLabel: "Admin Notes (Optional)", notesPlaceholder: "Any internal notes...",
      
      estimatedTotalTitle: "Estimated Total",
      estimatedTotalDesc: "This is an estimate. Final price may vary.",
      
      saveButton: "Create Reservation", savingButton: "Creating...", cancelButton: "Cancel",
      
      toastSuccessTitle: "Reservation Created",
      toastSuccessDesc: (name: string) => `Reservation for ${name} has been successfully created.`,
      toastErrorTitle: "Creation Failed",
      toastErrorDescDefault: "Could not create the reservation. Please try again.",
      errorFetchingOptions: "Error fetching options",

      zodGuestNameMin: "Guest name must be at least 2 characters.",
      zodGuestPhoneMin: "Please enter a valid phone number.",
      zodGuestEmailInvalid: "Please enter a valid email address.",
      zodNumGuestsMin: "At least one guest is required.",
      zodSelectDestination: "Please select a destination.",
      zodSelectHotel: "Please select a hotel.",
      zodSelectTripDate: "Please select a trip date.",
      zodNumRoomsNonNegative: "Number of rooms must be non-negative.",
      zodGuestsForFeeMin: "Number of guests for fee must be at least 1.",
      zodNumSeatsNonNegative: "Number of seats must be non-negative.",
      zodPriceNonNegative: "Amount must be a non-negative number.",
      
      statusPending: "Pending", statusContacted: "Contacted", statusConfirmed: "Confirmed", statusCancelled: "Cancelled",
    },
    ar: {
      dialogTitle: "إنشاء حجز جديد (نموذج المسؤول)",
      dialogDescription: "أدخل تفاصيل الحجز يدويًا. يمكن تعيين الحالة والإيداع مباشرة.",
      guestNameLabel: "اسم الضيف الكامل", guestNamePlaceholder: "أدخل اسم الضيف الكامل",
      guestPhoneLabel: "رقم هاتف الضيف", guestPhonePlaceholder: "أدخل رقم هاتف الضيف",
      guestEmailLabel: "البريد الإلكتروني للضيف (اختياري)", guestEmailPlaceholder: "guest@example.com",
      numGuestsLabel: "إجمالي عدد الضيوف", numGuestsPlaceholder: "مثال: 2",

      selectDestinationLabel: "اختر الوجهة", selectDestinationPlaceholder: "اختر وجهة",
      selectHotelLabel: "اختر الفندق", selectHotelPlaceholder: "اختر فندقًا",
      selectTripDateLabel: "اختر تاريخ الرحلة", selectTripDatePlaceholder: "اختر تاريخ رحلة",

      noDestinations: "لا توجد وجهات متاحة.",
      noHotelsForDestination: "لا توجد فنادق للوجهة المختارة.",
      noActiveTripsForHotel: "لا توجد رحلات نشطة للفندق المختار.",

      roomSelectionTitle: "اختيار الغرف",
      roomQtyPlaceholder: "الكمية",

      transportationTitle: "النقل",
      transportationSeatsLabel: "عدد مقاعد النقل (اختياري)",
      transportationSeatsPlaceholder: "مثال: 2",
      transportationPriceInfo: (price?: number) => `السعر للمقعد: ${price?.toFixed(2) || 'غير متوفر'} ج.م`,

      optionalExtrasTitle: "إضافات اختيارية",
      optionalExtrasDescription: "اختر الخدمات وحدد عدد الضيوف لكل منها.",
      guestsForFeeLabel: "عدد الضيوف لهذه الإضافة:",

      pricingAndStatusTitle: "التسعير والحالة (للمسؤول)",
      totalPriceLabel: "السعر الإجمالي المحسوب (ج.م)", totalPricePlaceholder: "مثال: 1250.75",
      depositAmountLabel: "مبلغ الإيداع (ج.م، اختياري)", depositAmountPlaceholder: "مثال: 500.00",
      statusLabel: "حالة الحجز", statusPlaceholder: "اختر الحالة الأولية",
      notesLabel: "ملاحظات المسؤول (اختياري)", notesPlaceholder: "أي ملاحظات داخلية...",

      estimatedTotalTitle: "الإجمالي المقدر",
      estimatedTotalDesc: "هذا تقدير. قد يختلف السعر النهائي.",

      saveButton: "إنشاء الحجز", savingButton: "جارٍ الإنشاء...", cancelButton: "إلغاء",

      toastSuccessTitle: "تم إنشاء الحجز",
      toastSuccessDesc: (name: string) => `تم إنشاء الحجز لـ ${name} بنجاح.`,
      toastErrorTitle: "فشل الإنشاء",
      toastErrorDescDefault: "تعذر إنشاء الحجز. يرجى المحاولة مرة أخرى.",
      errorFetchingOptions: "خطأ في جلب الخيارات",

      zodGuestNameMin: "يجب أن يتكون اسم الضيف من حرفين على الأقل.",
      zodGuestPhoneMin: "الرجاء إدخال رقم هاتف صالح.",
      zodGuestEmailInvalid: "الرجاء إدخال عنوان بريد إلكتروني صالح.",
      zodNumGuestsMin: "مطلوب ضيف واحد على الأقل.",
      zodSelectDestination: "الرجاء اختيار وجهة.",
      zodSelectHotel: "الرجاء اختيار فندق.",
      zodSelectTripDate: "الرجاء اختيار تاريخ رحلة.",
      zodNumRoomsNonNegative: "يجب أن يكون عدد الغرف غير سالب.",
      zodGuestsForFeeMin: "يجب أن يكون عدد الضيوف للإضافة 1 على الأقل.",
      zodNumSeatsNonNegative: "يجب أن يكون عدد المقاعد غير سالب.",
      zodPriceNonNegative: "يجب أن يكون المبلغ رقمًا غير سالب.",

      statusPending: "معلق", statusContacted: "تم الاتصال", statusConfirmed: "مؤكد", statusCancelled: "ملغى",
    },
  };
  const currentTranslations = translations[language];
  const adminReservationSchema = getAdminReservationSchema(currentTranslations);

  const form = useForm<AdminReservationFormValues>({
    resolver: zodResolver(adminReservationSchema),
    defaultValues: {
      guestName: '', guestPhone: '', guestEmail: '',
      numberOfGuests: 1,
      destinationId: undefined, hotelId: undefined, tripDateId: undefined,
      requestedRooms: [], selectedExtraFees: [], numberOfTransportationSeats: 0,
      totalCalculatedPrice: 0, depositAmount: 0, status: 'pending', notes: '',
    },
  });

  const { fields: roomFields, replace: replaceRoomFields } = useFieldArray({
    control: form.control, name: "requestedRooms",
  });

  // Data fetching
  useEffect(() => {
    setLoadingDestinations(true);
    setLoadingHotels(true);
    setLoadingTripDates(true);
    setLoadingRoomTypes(true);

    const unsubDest = onSnapshot(query(collection(db, "destinations"), orderBy("name")), (snap) => {
      setAllDestinations(snap.docs.map(d => ({ id: d.id, ...d.data() } as Destination))); 
      setLoadingDestinations(false);
    }, (err) => { toast({ title: currentTranslations.errorFetchingOptions, description: "Destinations", variant: "destructive"}); setLoadingDestinations(false); });
    
    const unsubHotels = onSnapshot(query(collection(db, "hotels"), orderBy("name")), (snap) => {
      setAllHotels(snap.docs.map(d => ({ id: d.id, ...d.data() } as Hotel))); 
      setLoadingHotels(false);
    }, (err) => { toast({ title: currentTranslations.errorFetchingOptions, description: "Hotels", variant: "destructive"}); setLoadingHotels(false); });

    const unsubTripDates = onSnapshot(query(collection(db, "tripDates"), where("status", "==", "active"), orderBy("startDate", "desc")), (snapshot) => {
      const fetchedTripDates = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          startDate: data.startDate instanceof Timestamp ? data.startDate.toDate() : new Date(data.startDate as any),
          endDate: data.endDate instanceof Timestamp ? data.endDate.toDate() : new Date(data.endDate as any),
        } as TripDate;
      });
      setAllTripDates(fetchedTripDates);
      setLoadingTripDates(false);
    }, (err) => { 
      toast({ title: currentTranslations.errorFetchingOptions, description: "Trip Dates", variant: "destructive"}); 
      setLoadingTripDates(false);
    });
    
    const unsubRoomTypes = onSnapshot(query(collection(db, "roomTypes"), orderBy("name")), (snap) => {
      setMasterRoomTypes(snap.docs.map(d => ({ id: d.id, ...d.data() } as RoomType))); 
      setLoadingRoomTypes(false);
    }, (err) => { toast({ title: currentTranslations.errorFetchingOptions, description: "Room Types", variant: "destructive"}); setLoadingRoomTypes(false); });

    return () => { unsubDest(); unsubHotels(); unsubTripDates(); unsubRoomTypes(); };
  }, [toast, currentTranslations.errorFetchingOptions]);

  const watchedDestinationId = form.watch('destinationId');
  const watchedHotelId = form.watch('hotelId');
  const watchedTripDateId = form.watch('tripDateId');
  
  const watchedRequestedRooms = form.watch('requestedRooms');
  const watchedNumTransportSeats = form.watch('numberOfTransportationSeats');
  const watchedSelectedExtraFees = form.watch('selectedExtraFees');


  const hotelsForSelectedDestination = useMemo(() => {
    if (!watchedDestinationId) return [];
    return allHotels.filter(h => h.destinationId === watchedDestinationId);
  }, [watchedDestinationId, allHotels]);

  const tripDatesForSelectedHotel = useMemo(() => {
    if (!watchedHotelId) return [];
    return allTripDates.filter(td => td.hotelId === watchedHotelId && td.status === 'active');
  }, [watchedHotelId, allTripDates]);

  const selectedTripObject = useMemo(() => {
    return allTripDates.find(td => td.id === watchedTripDateId);
  }, [watchedTripDateId, allTripDates]);

  // Reset hotel and trip date if destination changes
  useEffect(() => {
    if (watchedDestinationId) {
        const currentHotelId = form.getValues('hotelId');
        const hotelStillValid = allHotels.find(h => h.id === currentHotelId && h.destinationId === watchedDestinationId);
        if (!hotelStillValid) {
            form.setValue('hotelId', undefined, { shouldValidate: true });
            form.setValue('tripDateId', undefined, { shouldValidate: true });
        }
    }
  }, [watchedDestinationId, allHotels, form]); // Use form directly

  // Reset trip date if hotel changes
  useEffect(() => {
     if (watchedHotelId) {
        const currentTripDateId = form.getValues('tripDateId');
        const tripDateStillValid = allTripDates.find(td => td.id === currentTripDateId && td.hotelId === watchedHotelId);
        if (!tripDateStillValid) {
            form.setValue('tripDateId', undefined, { shouldValidate: true });
        }
     }
  }, [watchedHotelId, allTripDates, form]); // Use form directly
  
  // Update room fields when trip changes
  useEffect(() => {
    if (selectedTripObject && masterRoomTypes.length > 0) {
      const newRoomOptions: FormRoomOption[] = selectedTripObject.availableRoomsByType
        .map(avail => {
          const roomDetail = masterRoomTypes.find(rt => rt.id === avail.roomTypeId);
          return roomDetail ? {
            roomTypeId: avail.roomTypeId, roomTypeName: roomDetail.name,
            pricePerPerson: avail.pricePerPerson, capacity: roomDetail.capacity,
            numberOfRooms: 0
          } : null;
        })
        .filter(Boolean) as FormRoomOption[];
      replaceRoomFields(newRoomOptions);
    } else {
      replaceRoomFields([]);
    }
    form.setValue('selectedExtraFees', []); // Reset extra fees when trip changes
  }, [selectedTripObject, masterRoomTypes, replaceRoomFields, form]); // Use form directly

  // Calculate total price
  useEffect(() => {
    let currentRoomTotal = 0;
    if (watchedRequestedRooms && selectedTripObject) {
      watchedRequestedRooms.forEach((formRoom) => {
        if (formRoom.numberOfRooms > 0) {
          const tripRoomOption = selectedTripObject.availableRoomsByType.find(
            (opt) => opt.roomTypeId === formRoom.roomTypeId
          );
          const masterRoomTypeForCalc = masterRoomTypes.find(rt => rt.id === formRoom.roomTypeId);
          if (tripRoomOption && tripRoomOption.pricePerPerson !== undefined && masterRoomTypeForCalc && masterRoomTypeForCalc.capacity !== undefined) {
            currentRoomTotal += formRoom.numberOfRooms * tripRoomOption.pricePerPerson * masterRoomTypeForCalc.capacity;
          }
        }
      });
    }

    const currentTransportationTotal = (watchedNumTransportSeats || 0) * (selectedTripObject?.transportationPricePerPerson || 0);
    
    let currentExtraFeesTotal = 0;
    if (watchedSelectedExtraFees && selectedTripObject?.extraFees) {
        watchedSelectedExtraFees.forEach(selectedFee => {
            const feeConfig = selectedTripObject.extraFees?.find(ef => ef.id === selectedFee.feeId);
            if (feeConfig) {
                currentExtraFeesTotal += feeConfig.pricePerPerson * (selectedFee.numberOfGuestsForFee || 0);
            }
        });
    }
    const newTotal = currentRoomTotal + currentTransportationTotal + currentExtraFeesTotal;
    setCalculatedTotal(newTotal);
    form.setValue('totalCalculatedPrice', newTotal, { shouldValidate: true });
  }, [watchedRequestedRooms, watchedNumTransportSeats, watchedSelectedExtraFees, selectedTripObject, masterRoomTypes, form]); // Use form directly

  const onSubmit = async (data: AdminReservationFormValues) => {
    setIsSubmitting(true);
    if (!selectedTripObject) {
        toast({ title: "Error", description: "Selected trip data is missing.", variant: "destructive" });
        setIsSubmitting(false);
        return;
    }
    
    const finalRequestedRooms = data.requestedRooms
      ?.filter(room => room.numberOfRooms > 0)
      .map(room => ({ 
        roomTypeId: room.roomTypeId,
        roomTypeName: room.roomTypeName,
        numberOfRooms: room.numberOfRooms,
      }));

    const finalSelectedExtraFees: SelectedExtraFee[] = [];
    if (data.selectedExtraFees && selectedTripObject.extraFees) {
        data.selectedExtraFees.forEach(formFee => {
            const feeConfig = selectedTripObject.extraFees?.find(ef => ef.id === formFee.feeId);
            if (feeConfig) {
                finalSelectedExtraFees.push({
                    id: feeConfig.id, name: feeConfig.name,
                    pricePerPerson: feeConfig.pricePerPerson,
                    numberOfGuestsForFee: formFee.numberOfGuestsForFee,
                });
            }
        });
    }

    const reservationDataToSave: Omit<any, 'id'> = { // Use Omit as id is auto-generated
      userId: adminUser?.uid || null, // For admin created, could be null or admin's ID
      guestName: data.guestName, guestPhone: data.guestPhone, guestEmail: data.guestEmail || null,
      numberOfGuests: data.numberOfGuests,
      requestedRooms: finalRequestedRooms || [],
      selectedExtraFees: finalSelectedExtraFees,
      numberOfTransportationSeats: data.numberOfTransportationSeats || 0,
      tripDateId: data.tripDateId, hotelId: data.hotelId, destinationId: data.destinationId,
      status: data.status,
      totalCalculatedPrice: data.totalCalculatedPrice,
      depositAmount: data.depositAmount || 0,
      notes: data.notes || null,
      reservationDate: serverTimestamp(), createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    };

    if (data.status === 'confirmed' && adminUser) {
        reservationDataToSave.confirmedByUid = adminUser.uid;
        reservationDataToSave.confirmedByName = adminUser.displayName || adminUser.email;
        reservationDataToSave.confirmedAt = serverTimestamp();
    }
    if (data.status === 'contacted' && adminUser) {
        reservationDataToSave.contactedByUid = adminUser.uid;
        reservationDataToSave.contactedByName = adminUser.displayName || adminUser.email;
        reservationDataToSave.contactedAt = serverTimestamp();
    }


    try {
      const reservationRef = await addDoc(collection(db, "reservations"), reservationDataToSave);
      
      // Create Notification if status is pending
      if (data.status === 'pending') {
          const hotelForNotification = allHotels.find(h => h.id === data.hotelId);
          const notificationMessage = `New reservation from ${data.guestName} for ${hotelForNotification?.name || 'selected hotel'}.`;
          await addDoc(collection(db, "notifications"), {
            message: notificationMessage,
            link: `/admin/reservations/view/${reservationRef.id}`,
            timestamp: serverTimestamp(),
            type: 'new_reservation',
            reservationId: reservationRef.id,
            targetRoles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.SALES],
          });
      }

      toast({
        title: currentTranslations.toastSuccessTitle,
        description: currentTranslations.toastSuccessDesc(data.guestName),
      });
      onFormSubmitSuccess();
      form.reset();
      setCalculatedTotal(0);
    } catch (error) {
      console.error("Error creating reservation:", error);
      toast({
        title: currentTranslations.toastErrorTitle,
        description: (error instanceof Error ? error.message : currentTranslations.toastErrorDescDefault),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const currentSelectedFeesArray = form.watch('selectedExtraFees') || [];
  const isLoadingAnyData = loadingDestinations || loadingHotels || loadingTripDates || loadingRoomTypes;


  return (
    <>
      <DialogHeader>
        <DialogTitle>{currentTranslations.dialogTitle}</DialogTitle>
        <DialogDesc>{currentTranslations.dialogDescription}</DialogDesc>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2 max-h-[75vh] overflow-y-auto pr-2">
          <FormField control={form.control} name="guestName" render={({ field }) => (
            <FormItem><FormLabel>{currentTranslations.guestNameLabel}</FormLabel><FormControl><Input placeholder={currentTranslations.guestNamePlaceholder} {...field} /></FormControl><FormMessage /></FormItem>
          )}/>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={form.control} name="guestPhone" render={({ field }) => (
              <FormItem><FormLabel>{currentTranslations.guestPhoneLabel}</FormLabel><FormControl><Input type="tel" placeholder={currentTranslations.guestPhonePlaceholder} {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
            <FormField control={form.control} name="guestEmail" render={({ field }) => (
              <FormItem><FormLabel>{currentTranslations.guestEmailLabel}</FormLabel><FormControl><Input type="email" placeholder={currentTranslations.guestEmailPlaceholder} {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
          </div>
          <FormField control={form.control} name="numberOfGuests" render={({ field }) => (
            <FormItem><FormLabel className="flex items-center"><Users className="mr-2 h-4 w-4" />{currentTranslations.numGuestsLabel}</FormLabel>
              <FormControl><Input type="number" min="1" placeholder={currentTranslations.numGuestsPlaceholder} {...field} 
                onChange={e => {
                    const newGuestCount = parseInt(e.target.value,10) || 1;
                    field.onChange(newGuestCount);
                    const currentExtraFees = form.getValues('selectedExtraFees') || [];
                    const updatedExtraFees = currentExtraFees.map(fee => ({
                        ...fee,
                        numberOfGuestsForFee: Math.min(fee.numberOfGuestsForFee, newGuestCount)
                    }));
                    form.setValue('selectedExtraFees', updatedExtraFees);
                }}
              /></FormControl><FormMessage />
            </FormItem>
          )}/>
          
          <Separator />
          <h3 className="text-md font-semibold">Trip Selection</h3>
           <FormField control={form.control} name="destinationId" render={({ field }) => (
            <FormItem><FormLabel>{currentTranslations.selectDestinationLabel}</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || undefined} disabled={loadingDestinations}>
                <FormControl><SelectTrigger><SelectValue placeholder={loadingDestinations ? "Loading..." : currentTranslations.selectDestinationPlaceholder} /></SelectTrigger></FormControl>
                <SelectContent>{allDestinations.length > 0 ? allDestinations.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>) : <SelectItem value="none" disabled>{currentTranslations.noDestinations}</SelectItem>}</SelectContent>
              </Select><FormMessage />
            </FormItem>
          )}/>
          <FormField control={form.control} name="hotelId" render={({ field }) => (
            <FormItem><FormLabel>{currentTranslations.selectHotelLabel}</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || undefined} disabled={!watchedDestinationId || loadingHotels}>
                <FormControl><SelectTrigger><SelectValue placeholder={!watchedDestinationId ? "Select destination first" : (loadingHotels ? "Loading..." : currentTranslations.selectHotelPlaceholder)} /></SelectTrigger></FormControl>
                <SelectContent>{hotelsForSelectedDestination.length > 0 ? hotelsForSelectedDestination.map(h => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>) : <SelectItem value="none" disabled>{currentTranslations.noHotelsForDestination}</SelectItem>}</SelectContent>
              </Select><FormMessage />
            </FormItem>
          )}/>
          <FormField control={form.control} name="tripDateId" render={({ field }) => (
            <FormItem><FormLabel>{currentTranslations.selectTripDateLabel}</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || undefined} disabled={!watchedHotelId || loadingTripDates}>
                <FormControl><SelectTrigger><SelectValue placeholder={!watchedHotelId ? "Select hotel first" : (loadingTripDates ? "Loading..." : currentTranslations.selectTripDatePlaceholder)} /></SelectTrigger></FormControl>
                <SelectContent>{tripDatesForSelectedHotel.length > 0 ? tripDatesForSelectedHotel.map(td => <SelectItem key={td.id} value={td.id}>{`${format(td.startDate, 'PP')} - ${format(td.endDate, 'PP')}`}</SelectItem>) : <SelectItem value="none" disabled>{currentTranslations.noActiveTripsForHotel}</SelectItem>}</SelectContent>
              </Select><FormMessage />
            </FormItem>
          )}/>

          {selectedTripObject && (
            <>
              <Separator />
              <h3 className="text-md font-semibold flex items-center"><BedDouble className="mr-2 h-5 w-5 text-primary" />{currentTranslations.roomSelectionTitle}</h3>
              {roomFields.map((fieldItem, index) => {
                  const roomOptionDetails = masterRoomTypes.find(opt => opt.id === fieldItem.roomTypeId);
                  if (!roomOptionDetails) return null;
                  const tripRoomPrice = selectedTripObject.availableRoomsByType.find(r => r.roomTypeId === fieldItem.roomTypeId)?.pricePerPerson;
                  return (
                      <FormField key={fieldItem.id} control={form.control} name={`requestedRooms.${index}.numberOfRooms`}
                          render={({ field }) => (
                          <FormItem className="grid grid-cols-3 items-center gap-x-4 gap-y-1 border-b pb-3">
                              <FormLabel className="col-span-2">
                                {roomOptionDetails.name}
                                <span className="text-xs text-muted-foreground block">
                                  (EGP {tripRoomPrice?.toFixed(2) || 'N/A'}/person, Capacity: {roomOptionDetails.capacity})
                                </span>
                              </FormLabel>
                              <FormControl><Input type="number" min="0" placeholder={currentTranslations.roomQtyPlaceholder} {...field} onChange={e => field.onChange(parseInt(e.target.value, 10) || 0)}/></FormControl>
                              <FormMessage className="col-span-3" />
                          </FormItem>
                          )}
                      />
                  );
              })}
              {(!roomFields || roomFields.length === 0) && <p className="text-sm text-muted-foreground">{currentTranslations.noActiveTripsForHotel}</p>}

              {selectedTripObject.transportationPricePerPerson && selectedTripObject.transportationPricePerPerson > 0 && (
                <>
                  <Separator />
                  <h3 className="text-md font-semibold flex items-center"><Bus className="mr-2 h-5 w-5 text-primary" />{currentTranslations.transportationTitle}</h3>
                  <FormField control={form.control} name="numberOfTransportationSeats" render={({ field }) => (
                    <FormItem><FormLabel>{currentTranslations.transportationSeatsLabel}</FormLabel>
                      <FormControl><Input type="number" min="0" placeholder={currentTranslations.transportationSeatsPlaceholder} {...field} onChange={e => field.onChange(parseInt(e.target.value,10) || 0)}/></FormControl>
                      <FormDescription>{currentTranslations.transportationPriceInfo(selectedTripObject.transportationPricePerPerson)}</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}/>
                </>
              )}

              {selectedTripObject.extraFees && selectedTripObject.extraFees.length > 0 && (
                <div className="space-y-3">
                  <Separator />
                  <div className="space-y-1">
                    <h3 className="text-md font-semibold flex items-center"><Tag className="mr-2 h-5 w-5 text-primary" />{currentTranslations.optionalExtrasTitle}</h3>
                    <FormDescription>{currentTranslations.optionalExtrasDescription}</FormDescription>
                  </div>
                  {selectedTripObject.extraFees.map((feeConfig) => {
                    const feeSelectionIndex = currentSelectedFeesArray.findIndex(sf => sf.feeId === feeConfig.id);
                    const isSelected = feeSelectionIndex !== -1;
                    return (
                      <div key={feeConfig.id} className="p-3 border rounded-md bg-muted/30 space-y-2">
                        <div className="flex items-center space-x-3">
                          <Checkbox id={`admin-extra-fee-checkbox-${feeConfig.id}`} checked={isSelected}
                            onCheckedChange={(checked) => {
                              const currentFees = form.getValues('selectedExtraFees') || [];
                              if (checked) {
                                form.setValue('selectedExtraFees', [...currentFees, { feeId: feeConfig.id, numberOfGuestsForFee: form.getValues('numberOfGuests') || 1 }], { shouldValidate: true });
                              } else {
                                form.setValue('selectedExtraFees', currentFees.filter(sf => sf.feeId !== feeConfig.id), { shouldValidate: true });
                              }
                            }}
                            aria-labelledby={`admin-extra-fee-label-${feeConfig.id}`}
                          />
                          <FormLabel htmlFor={`admin-extra-fee-checkbox-${feeConfig.id}`} id={`admin-extra-fee-label-${feeConfig.id}`} className="font-normal cursor-pointer flex-grow">
                            {feeConfig.name} - <span className="text-primary font-semibold">EGP {feeConfig.pricePerPerson.toFixed(2)}/person</span>
                            {feeConfig.description && <p className="text-xs text-muted-foreground mt-0.5">{feeConfig.description}</p>}
                          </FormLabel>
                        </div>
                        {isSelected && (
                          <FormField control={form.control} name={`selectedExtraFees.${feeSelectionIndex}.numberOfGuestsForFee`}
                            render={({ field }) => (
                              <FormItem className="pl-7">
                                <FormLabel htmlFor={`admin-guests-for-fee-${feeConfig.id}`} className="text-xs">{currentTranslations.guestsForFeeLabel}</FormLabel>
                                <FormControl><Input id={`admin-guests-for-fee-${feeConfig.id}`} type="number" {...field} min="1" max={form.getValues('numberOfGuests')}
                                    onChange={e => {
                                        const val = parseInt(e.target.value, 10);
                                        const totalGuests = form.getValues('numberOfGuests') || 1;
                                        field.onChange(Math.min(Math.max(1, val || 1), totalGuests));
                                    }}
                                    className="h-8 w-24 text-sm"
                                /></FormControl><FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                      </div>
                    );
                  })}
                  {form.formState.errors.selectedExtraFees && <FormMessage className="mt-2">{form.formState.errors.selectedExtraFees.message || form.formState.errors.selectedExtraFees.root?.message}</FormMessage>}
                </div>
              )}
            </>
          )}

          <Separator />
          <h3 className="text-md font-semibold">{currentTranslations.pricingAndStatusTitle}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={form.control} name="totalCalculatedPrice" render={({ field }) => (
              <FormItem><FormLabel>{currentTranslations.totalPriceLabel}</FormLabel>
                <FormControl><div className="relative">
                  <span className={cn("absolute top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none", direction === 'rtl' ? 'right-3' : 'left-3')}>EGP</span>
                  <Input type="number" step="0.01" min="0" placeholder={currentTranslations.totalPricePlaceholder} className={cn(direction === 'rtl' ? 'pr-10' : 'pl-10')} {...field} readOnly />
                </div></FormControl><FormMessage />
              </FormItem>
            )}/>
            <FormField control={form.control} name="depositAmount" render={({ field }) => (
              <FormItem><FormLabel>{currentTranslations.depositAmountLabel}</FormLabel>
                <FormControl><div className="relative">
                  <span className={cn("absolute top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none", direction === 'rtl' ? 'right-3' : 'left-3')}>EGP</span>
                  <Input type="number" step="0.01" min="0" placeholder={currentTranslations.depositAmountPlaceholder} className={cn(direction === 'rtl' ? 'pr-10' : 'pl-10')} {...field} />
                </div></FormControl><FormMessage />
              </FormItem>
            )}/>
          </div>
          <FormField control={form.control} name="status" render={({ field }) => (
            <FormItem><FormLabel>{currentTranslations.statusLabel}</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder={currentTranslations.statusPlaceholder} /></SelectTrigger></FormControl>
                <SelectContent>
                  {reservationStatusEnum.options.map(statusVal => (
                    <SelectItem key={statusVal} value={statusVal}>
                      {translations[language][`status${statusVal.charAt(0).toUpperCase() + statusVal.slice(1)}` as keyof typeof translations['en']] || statusVal}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select><FormMessage />
            </FormItem>
          )}/>
          <FormField control={form.control} name="notes" render={({ field }) => (
            <FormItem><FormLabel>{currentTranslations.notesLabel}</FormLabel><FormControl><Textarea placeholder={currentTranslations.notesPlaceholder} {...field} rows={3} /></FormControl><FormMessage /></FormItem>
          )}/>
          
          <Separator />
          <div className="mt-4 pt-4 border-t">
            <h3 className="text-lg font-semibold flex items-center mb-2"><ShoppingCart className="mr-2 h-5 w-5 text-primary" /> {currentTranslations.estimatedTotalTitle}</h3>
            <p className="text-2xl font-bold text-primary">EGP {calculatedTotal.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">{currentTranslations.estimatedTotalDesc}</p>
          </div>
          
          <DialogFooter className="pt-6">
            <DialogClose asChild><Button type="button" variant="outline" disabled={isSubmitting}>{currentTranslations.cancelButton}</Button></DialogClose>
            <Button type="submit" disabled={isSubmitting || isLoadingAnyData}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSubmitting ? currentTranslations.savingButton : currentTranslations.saveButton}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
}

