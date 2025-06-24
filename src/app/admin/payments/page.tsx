
"use client";

import type { NextPage } from 'next';
import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { CreditCard, Search, DollarSign, Loader2, Info, MapPin, Upload, Edit2 } from 'lucide-react'; // Added Edit2
import type { InitialReservation, TripDate, Hotel, Destination } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { db, storage } from '@/lib/firebase'; // Ensure storage is imported
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { collection, query, onSnapshot, orderBy, doc, Timestamp, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { useLanguage } from '@/contexts/LanguageContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription as DialogDesc, DialogFooter, DialogClose } from '@/components/ui/dialog'; // Added Dialog components
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'; // Added Form components
import { useForm } from 'react-hook-form'; // Added useForm
import { zodResolver } from '@hookform/resolvers/zod'; // Added zodResolver
import * as z from 'zod'; // Added z
import { useAuth } from '@/contexts/AuthContext'; // Added useAuth
import { USER_ROLES } from '@/lib/constants'; // Added USER_ROLES

interface EnrichedReservationForPayment extends InitialReservation {
  hotelName?: string;
  destinationName?: string;
  tripDateInfo?: Pick<TripDate, 'startDate' | 'endDate' | 'hotelId' | 'destinationId'>;
  tripSummary?: string;
  remainingAmount?: number;
}

interface TripDateMapEntry {
  startDate: Date;
  endDate: Date;
  hotelId: string;
  destinationId: string;
}

const editPaymentSchema = (translations: any) => z.object({
  newDepositAmount: z.coerce.number().min(0, { message: translations.zodAmountNonNegative }),
});
type EditPaymentFormValues = z.infer<ReturnType<typeof editPaymentSchema>>;


const AdminPaymentsPage: NextPage = () => {
  const { user } = useAuth(); // Get current user for role check
  const { toast } = useToast();
  const { language, direction } = useLanguage();
  const [rawReservations, setRawReservations] = useState<InitialReservation[]>([]);
  const [destinationsMap, setDestinationsMap] = useState<Record<string, string>>({});
  const [hotelsMap, setHotelsMap] = useState<Record<string, string>>({});
  const [tripDatesMap, setTripDatesMap] = useState<Record<string, TripDateMapEntry>>({});
  const [searchTerm, setSearchTerm] = useState('');

  const [loadingReservations, setLoadingReservations] = useState(true);
  const [loadingDestinations, setLoadingDestinations] = useState(true);
  const [loadingHotels, setLoadingHotels] = useState(true);
  const [loadingTripDates, setLoadingTripDates] = useState(true);
  const [overallLoading, setOverallLoading] = useState(true);

  const [newPaymentAmounts, setNewPaymentAmounts] = useState<Record<string, string>>({});
  const [processingPayment, setProcessingPayment] = useState<Record<string, boolean>>({});
  const [paymentReceiptFiles, setPaymentReceiptFiles] = useState<Record<string, File | null>>({});

  const [isEditPaymentDialogOpen, setIsEditPaymentDialogOpen] = useState(false);
  const [editingReservation, setEditingReservation] = useState<EnrichedReservationForPayment | null>(null);
  const [processingEditPayment, setProcessingEditPayment] = useState(false);


  const translations = {
    en: {
      pageTitle: "Payments Management",
      pageDescription: "View and record payments for reservations, grouped by trip.",
      cardTitle: "Reservations & Payments by Trip",
      cardDescription: "Manage guest payments. Search filters apply across all trips.",
      searchPlaceholder: "Search by guest, trip summary, or reservation ID...",
      accordionTriggerSuffix: "(s) matching reservation(s)",
      guestHeader: "Guest",
      totalHeader: "Total (EGP)",
      paidHeader: "Paid (EGP)",
      remainingHeader: "Remaining (EGP)",
      newPaymentHeader: "New Payment",
      uploadReceiptLabel: "Upload Receipt (Optional)",
      actionsHeader: "Actions",
      tripTotalsLabel: "Trip Totals:",
      noReservationsFound: "No reservations found",
      matchingCriteria: " matching your current search criteria",
      noReservationsInSystem: ". There are no reservations in the system yet.",
      unknownHotel: "Unknown Hotel",
      unknownDestination: "Unknown Destination",
      inputErrorTitle: "Input Error",
      inputErrorDesc: "Please enter a payment amount.",
      invalidAmountTitle: "Invalid Amount",
      invalidAmountDesc: "Payment amount must be a positive number.",
      paymentExceedsTotalTitle: "Payment Exceeds Total",
      paymentExceedsTotalDesc: (newTotal: string, reservationTotal: string) => `New total paid (${newTotal}) would exceed the reservation total (${reservationTotal}). Please adjust.`,
      paymentRecordedTitle: "Payment Recorded",
      paymentRecordedDesc: (amount: string, id: string) => `${amount} recorded for reservation ${id}.`,
      paymentErrorTitle: "Payment Error",
      paymentErrorDesc: (msg?: string) => msg || "Could not record payment.",
      receiptUploadSuccess: "Receipt uploaded successfully.",
      receiptUploadFailed: (msg?: string) => `Receipt upload failed: ${msg || 'Unknown error.'}`,
      recordButton: "Record",
      recordingButton: "Recording...",
      fullyPaidText: "Fully Paid",
      amountPlaceholder: "Amount",
      na: "N/A",
      editPaymentButton: "Edit Payment",
      editPaymentDialogTitle: "Edit Payment for Reservation",
      currentTotalLabel: "Current Total Price:",
      currentPaidLabel: "Current Paid Amount:",
      newPaidAmountLabel: "New Total Paid Amount",
      saveChangesButton: "Save Changes",
      savingChangesButton: "Saving...",
      cancelButton: "Cancel",
      paymentUpdatedSuccessTitle: "Payment Updated",
      paymentUpdatedSuccessDesc: "The paid amount has been successfully updated.",
      errorUpdatingPaymentTitle: "Update Error",
      errorUpdatingPaymentDesc: "Could not update the payment amount.",
      zodAmountNonNegative: "Amount must be a non-negative number.",
    },
    ar: {
      pageTitle: "إدارة المدفوعات",
      pageDescription: "عرض وتسجيل المدفوعات للحجوزات، مجمعة حسب الرحلة.",
      cardTitle: "الحجوزات والمدفوعات حسب الرحلة",
      cardDescription: "إدارة مدفوعات الضيوف. تنطبق فلاتر البحث على جميع الرحلات.",
      searchPlaceholder: "ابحث بالضيف أو ملخص الرحلة أو معرف الحجز...",
      accordionTriggerSuffix: " حجز(حجوزات) مطابق(ة)",
      guestHeader: "الضيف",
      totalHeader: "الإجمالي (ج.م)",
      paidHeader: "المدفوع (ج.م)",
      remainingHeader: "المتبقي (ج.م)",
      newPaymentHeader: "دفعة جديدة",
      uploadReceiptLabel: "تحميل الإيصال (اختياري)",
      actionsHeader: "الإجراءات",
      tripTotalsLabel: "إجماليات الرحلة:",
      noReservationsFound: "لم يتم العثور على حجوزات",
      matchingCriteria: " تطابق معايير البحث الحالية",
      noReservationsInSystem: ". لا توجد حجوزات في النظام حتى الآن.",
      unknownHotel: "فندق غير معروف",
      unknownDestination: "وجهة غير معروفة",
      inputErrorTitle: "خطأ في الإدخال",
      inputErrorDesc: "الرجاء إدخال مبلغ الدفع.",
      invalidAmountTitle: "مبلغ غير صالح",
      invalidAmountDesc: "يجب أن يكون مبلغ الدفع رقمًا موجبًا.",
      paymentExceedsTotalTitle: "الدفع يتجاوز الإجمالي",
      paymentExceedsTotalDesc: (newTotal: string, reservationTotal: string) => `المبلغ الإجمالي المدفوع الجديد (${newTotal}) سيتجاوز إجمالي الحجز (${reservationTotal}). يرجى التعديل.`,
      paymentRecordedTitle: "تم تسجيل الدفع",
      paymentRecordedDesc: (amount: string, id: string) => `تم تسجيل ${amount} للحجز ${id}.`,
      paymentErrorTitle: "خطأ في الدفع",
      paymentErrorDesc: (msg?: string) => msg || "تعذر تسجيل الدفع.",
      receiptUploadSuccess: "تم تحميل الإيصال بنجاح.",
      receiptUploadFailed: (msg?: string) => `فشل تحميل الإيصال: ${msg || 'خطأ غير معروف.'}`,
      recordButton: "تسجيل",
      recordingButton: "جار التسجيل...",
      fullyPaidText: "مدفوع بالكامل",
      amountPlaceholder: "المبلغ",
      na: "غير متوفر",
      editPaymentButton: "تعديل الدفع",
      editPaymentDialogTitle: "تعديل الدفع للحجز",
      currentTotalLabel: "السعر الإجمالي الحالي:",
      currentPaidLabel: "المبلغ المدفوع الحالي:",
      newPaidAmountLabel: "المبلغ الإجمالي المدفوع الجديد",
      saveChangesButton: "حفظ التغييرات",
      savingChangesButton: "جار الحفظ...",
      cancelButton: "إلغاء",
      paymentUpdatedSuccessTitle: "تم تحديث الدفع",
      paymentUpdatedSuccessDesc: "تم تحديث المبلغ المدفوع بنجاح.",
      errorUpdatingPaymentTitle: "خطأ في التحديث",
      errorUpdatingPaymentDesc: "تعذر تحديث مبلغ الدفع.",
      zodAmountNonNegative: "يجب أن يكون المبلغ رقمًا غير سالب.",
    },
  };
  const currentTranslations = translations[language];
  const currentEditPaymentSchema = editPaymentSchema(currentTranslations);

  const editPaymentForm = useForm<EditPaymentFormValues>({
    resolver: zodResolver(currentEditPaymentSchema),
    defaultValues: {
      newDepositAmount: 0,
    },
  });


  useEffect(() => {
    setOverallLoading(loadingReservations || loadingHotels || loadingTripDates || loadingDestinations);
  }, [loadingReservations, loadingHotels, loadingTripDates, loadingDestinations]);

  useEffect(() => {
    setLoadingDestinations(true);
    const q = query(collection(db, "destinations"), orderBy("name"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const dMap: Record<string, string> = {};
      snapshot.forEach(doc => dMap[doc.id] = doc.data().name);
      setDestinationsMap(dMap);
      setLoadingDestinations(false);
    }, () => setLoadingDestinations(false));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    setLoadingHotels(true);
    const q = query(collection(db, "hotels"), orderBy("name"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const hMap: Record<string, string> = {};
      snapshot.forEach(doc => hMap[doc.id] = doc.data().name);
      setHotelsMap(hMap);
      setLoadingHotels(false);
    }, () => setLoadingHotels(false));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    setLoadingTripDates(true);
    const q = query(collection(db, "tripDates"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tdMap: Record<string, TripDateMapEntry> = {};
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        tdMap[docSnap.id] = {
          startDate: (data.startDate as Timestamp).toDate(),
          endDate: (data.endDate as Timestamp).toDate(),
          hotelId: data.hotelId,
          destinationId: data.destinationId,
        };
      });
      setTripDatesMap(tdMap);
      setLoadingTripDates(false);
    }, () => setLoadingTripDates(false));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    setLoadingReservations(true);
    const q = query(collection(db, "reservations"), orderBy("reservationDate", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedReservations: InitialReservation[] = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          reservationDate: (data.reservationDate as Timestamp).toDate(),
          createdAt: data.createdAt ? (data.createdAt as Timestamp).toDate() : undefined,
          updatedAt: data.updatedAt ? (data.updatedAt as Timestamp).toDate() : undefined,
        } as InitialReservation;
      });
      setRawReservations(fetchedReservations);
      setLoadingReservations(false);
    }, () => setLoadingReservations(false));
    return () => unsubscribe();
  }, []);

  const enrichedReservations = useMemo((): EnrichedReservationForPayment[] => {
    return rawReservations.map(res => {
      const tripDateInfo = tripDatesMap[res.tripDateId];
      const hotelName = tripDateInfo ? hotelsMap[tripDateInfo.hotelId] : currentTranslations.unknownHotel;
      const destinationName = tripDateInfo ? destinationsMap[tripDateInfo.destinationId] : currentTranslations.unknownDestination;
      
      let tripSummary = `${destinationName} - ${hotelName}`;
      if (tripDateInfo) {
        tripSummary += ` (${format(new Date(tripDateInfo.startDate), 'MMM d')} - ${format(new Date(tripDateInfo.endDate), 'MMM d, yy')})`;
      }
      const total = res.totalCalculatedPrice || 0;
      const paid = res.depositAmount || 0;
      const remaining = total - paid;

      return {
        ...res,
        hotelName,
        destinationName,
        tripDateInfo,
        tripSummary,
        remainingAmount: remaining > 0 ? remaining : 0,
      };
    });
  }, [rawReservations, hotelsMap, tripDatesMap, destinationsMap, language, currentTranslations]);

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value.toLowerCase());
  };

  const filteredReservations = useMemo(() => {
    return enrichedReservations.filter(res =>
      res.guestName.toLowerCase().includes(searchTerm) ||
      (res.guestEmail && res.guestEmail.toLowerCase().includes(searchTerm)) ||
      res.tripSummary?.toLowerCase().includes(searchTerm) ||
      res.id.toLowerCase().includes(searchTerm)
    );
  }, [enrichedReservations, searchTerm]);

  const reservationsByTrip = useMemo(() => {
    return filteredReservations.reduce<Record<string, EnrichedReservationForPayment[]>>((acc, res) => {
      const tripId = res.tripDateId;
      if (!acc[tripId]) {
        acc[tripId] = [];
      }
      acc[tripId].push(res);
      return acc;
    }, {});
  }, [filteredReservations]);

  const handleNewPaymentChange = (reservationId: string, amount: string) => {
    setNewPaymentAmounts(prev => ({ ...prev, [reservationId]: amount }));
  };

  const handleReceiptFileChange = (reservationId: string, file: File | null) => {
    setPaymentReceiptFiles(prev => ({ ...prev, [reservationId]: file }));
  };

  const handleRecordPayment = async (reservationId: string) => {
    const paymentAmountStr = newPaymentAmounts[reservationId];
    if (!paymentAmountStr) {
      toast({ title: currentTranslations.inputErrorTitle, description: currentTranslations.inputErrorDesc, variant: "destructive" });
      return;
    }
    const paymentAmount = parseFloat(paymentAmountStr);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      toast({ title: currentTranslations.invalidAmountTitle, description: currentTranslations.invalidAmountDesc, variant: "destructive" });
      return;
    }

    setProcessingPayment(prev => ({ ...prev, [reservationId]: true }));
    try {
      const resDocRef = doc(db, "reservations", reservationId);
      const resSnap = await getDoc(resDocRef);

      if (!resSnap.exists()) throw new Error("Reservation not found.");
      
      const currentReservation = resSnap.data() as InitialReservation;
      const currentDeposit = currentReservation.depositAmount || 0;
      const newDepositAmount = currentDeposit + paymentAmount;
      const totalCalculatedPrice = currentReservation.totalCalculatedPrice || 0;

      if (newDepositAmount > totalCalculatedPrice) {
          toast({ 
            title: currentTranslations.paymentExceedsTotalTitle, 
            description: currentTranslations.paymentExceedsTotalDesc(
              `${language === 'ar' ? 'ج.م ' : 'EGP '}${newDepositAmount.toFixed(2)}`,
              `${language === 'ar' ? 'ج.م ' : 'EGP '}${totalCalculatedPrice.toFixed(2)}`
            ), 
            variant: "destructive", 
            duration: 5000 
          });
          setProcessingPayment(prev => ({ ...prev, [reservationId]: false }));
          return;
      }

      await updateDoc(resDocRef, {
        depositAmount: newDepositAmount,
        updatedAt: serverTimestamp(),
      });

      toast({ 
        title: currentTranslations.paymentRecordedTitle, 
        description: currentTranslations.paymentRecordedDesc(
            `${language === 'ar' ? 'ج.م ' : 'EGP '}${paymentAmount.toFixed(2)}`, 
            reservationId
        ) 
      });
      setNewPaymentAmounts(prev => ({ ...prev, [reservationId]: '' }));

      // Handle receipt upload
      const receiptFile = paymentReceiptFiles[reservationId];
      if (receiptFile) {
        const receiptRef = storageRef(storage, `payment_receipts/${reservationId}/${receiptFile.name}`);
        await uploadBytes(receiptRef, receiptFile);
        const downloadURL = await getDownloadURL(receiptRef);
        await updateDoc(resDocRef, { paymentReceiptUrl: downloadURL, updatedAt: serverTimestamp() });
        toast({ title: currentTranslations.receiptUploadSuccess });
        setPaymentReceiptFiles(prev => ({ ...prev, [reservationId]: null })); // Clear file
      }

    } catch (error) {
      console.error("Error recording payment:", error);
      const errorMessage = (error as Error).message;
      if(errorMessage.includes("receipt upload")) {
        toast({ title: currentTranslations.paymentErrorTitle, description: currentTranslations.receiptUploadFailed(errorMessage), variant: "destructive" });
      } else {
        toast({ title: currentTranslations.paymentErrorTitle, description: currentTranslations.paymentErrorDesc(errorMessage), variant: "destructive" });
      }
    } finally {
      setProcessingPayment(prev => ({ ...prev, [reservationId]: false }));
    }
  };

  const openEditPaymentDialog = (reservation: EnrichedReservationForPayment) => {
    setEditingReservation(reservation);
    editPaymentForm.reset({ newDepositAmount: reservation.depositAmount || 0 });
    setIsEditPaymentDialogOpen(true);
  };

  const handleUpdateDepositAmount = async (values: EditPaymentFormValues) => {
    if (!editingReservation) return;
    setProcessingEditPayment(true);

    const newDepositAmount = values.newDepositAmount;
    const totalCalculatedPrice = editingReservation.totalCalculatedPrice || 0;

    if (newDepositAmount > totalCalculatedPrice) {
      toast({
        title: currentTranslations.paymentExceedsTotalTitle,
        description: currentTranslations.paymentExceedsTotalDesc(
          `${language === 'ar' ? 'ج.م ' : 'EGP '}${newDepositAmount.toFixed(2)}`,
          `${language === 'ar' ? 'ج.م ' : 'EGP '}${totalCalculatedPrice.toFixed(2)}`
        ),
        variant: "destructive",
        duration: 5000
      });
      setProcessingEditPayment(false);
      return;
    }

    try {
      const resDocRef = doc(db, "reservations", editingReservation.id);
      await updateDoc(resDocRef, {
        depositAmount: newDepositAmount,
        updatedAt: serverTimestamp(),
      });
      toast({ title: currentTranslations.paymentUpdatedSuccessTitle, description: currentTranslations.paymentUpdatedSuccessDesc });
      setIsEditPaymentDialogOpen(false);
      setEditingReservation(null);
    } catch (error) {
      console.error("Error updating deposit amount:", error);
      toast({ title: currentTranslations.errorUpdatingPaymentTitle, description: currentTranslations.errorUpdatingPaymentDesc, variant: "destructive" });
    } finally {
      setProcessingEditPayment(false);
    }
  };


  if (overallLoading) {
    return (
      <div className="space-y-8">
        <div className="flex justify-between items-center"> <Skeleton className="h-10 w-1/3" /> </div>
        <Card>
          <CardHeader><Skeleton className="h-8 w-1/4 mb-2" /><Skeleton className="h-6 w-1/2 mb-4" /><Skeleton className="h-10 w-1/3" /></CardHeader>
          <CardContent><div className="space-y-2">{[...Array(3)].map((_, i) => (<Skeleton key={i} className="h-12 w-full" />))}</div></CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8" dir={direction}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold flex items-center">
            <CreditCard className={cn("h-8 w-8 text-primary", direction === 'rtl' ? 'ml-3' : 'mr-3')} /> 
            {currentTranslations.pageTitle}
          </h1>
          <p className="text-muted-foreground">{currentTranslations.pageDescription}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{currentTranslations.cardTitle}</CardTitle>
          <CardDescription>{currentTranslations.cardDescription}</CardDescription>
          <div className="pt-4"><div className="relative">
            <Search className={cn("absolute top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground", direction === 'rtl' ? 'right-3' : 'left-3')} />
            <Input 
              placeholder={currentTranslations.searchPlaceholder} 
              value={searchTerm} 
              onChange={handleSearch} 
              className={cn("max-w-lg", direction === 'rtl' ? 'pr-10' : 'pl-10')}
              dir={direction}
            />
          </div></div>
        </CardHeader>
        <CardContent>
          {Object.keys(reservationsByTrip).length > 0 ? (
            <Accordion type="multiple" className="w-full space-y-4" dir={direction}>
              {Object.entries(reservationsByTrip).map(([tripId, reservationsInTrip]) => {
                const tripInfo = tripDatesMap[tripId];
                const hotelName = tripInfo ? hotelsMap[tripInfo.hotelId] : currentTranslations.unknownHotel;
                const destinationName = tripInfo ? destinationsMap[tripInfo.destinationId] : currentTranslations.unknownDestination;
                
                let triggerTitle = `${destinationName || currentTranslations.na} - ${hotelName || currentTranslations.na}`;
                if (tripInfo && tripInfo.startDate && tripInfo.endDate) {
                  triggerTitle += ` (${format(new Date(tripInfo.startDate), 'MMM d')} - ${format(new Date(tripInfo.endDate), 'MMM d, yy')})`;
                }

                const tripTotalSum = reservationsInTrip.reduce((sum, res) => sum + (res.totalCalculatedPrice || 0), 0);
                const tripPaidSum = reservationsInTrip.reduce((sum, res) => sum + (res.depositAmount || 0), 0);
                const tripRemainingSum = reservationsInTrip.reduce((sum, res) => sum + (res.remainingAmount || 0), 0);

                return (
                  <AccordionItem value={tripId} key={tripId} className="border bg-card rounded-lg shadow-md overflow-hidden">
                    <AccordionTrigger className="p-4 hover:bg-muted/50 transition-colors text-lg font-semibold">
                      <div className={cn("flex items-center", direction === 'rtl' ? 'flex-row-reverse' : 'flex-row')}>
                        <MapPin className={cn("h-5 w-5 text-primary/70 flex-shrink-0", direction === 'rtl' ? 'ml-2' : 'mr-2')} />
                        <span className="truncate">{triggerTitle}</span>
                      </div>
                       <span className={cn("text-sm font-normal text-muted-foreground whitespace-nowrap", direction === 'rtl' ? 'mr-2' : 'ml-2')}>
                        ({reservationsInTrip.length} {currentTranslations.accordionTriggerSuffix})
                       </span>
                    </AccordionTrigger>
                    <AccordionContent className="p-0 border-t">
                      <Table dir={direction}>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{currentTranslations.guestHeader}</TableHead>
                            <TableHead className={direction === 'rtl' ? 'text-left' : 'text-right'}>{currentTranslations.totalHeader}</TableHead>
                            <TableHead className={direction === 'rtl' ? 'text-left' : 'text-right'}>{currentTranslations.paidHeader}</TableHead>
                            <TableHead className={direction === 'rtl' ? 'text-left' : 'text-right'}>{currentTranslations.remainingHeader}</TableHead>
                            <TableHead className="w-[250px]">{currentTranslations.newPaymentHeader}</TableHead>
                            <TableHead className="w-[200px]">{currentTranslations.uploadReceiptLabel}</TableHead>
                            {user?.role === USER_ROLES.SUPER_ADMIN && <TableHead className="w-[80px] text-center">{currentTranslations.actionsHeader}</TableHead>}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {reservationsInTrip.map((res) => (
                            <TableRow key={res.id}>
                              <TableCell>
                                <div className="font-medium">{res.guestName}</div>
                                <div className="text-xs text-muted-foreground">{res.guestEmail || res.guestPhone}</div>
                              </TableCell>
                              <TableCell className={cn("text-sm font-semibold", direction === 'rtl' ? 'text-left' : 'text-right')}>
                                {res.totalCalculatedPrice?.toFixed(2) || '0.00'}
                              </TableCell>
                              <TableCell className={cn("text-sm text-green-600 font-semibold", direction === 'rtl' ? 'text-left' : 'text-right')}>
                                {res.depositAmount?.toFixed(2) || '0.00'}
                              </TableCell>
                              <TableCell className={cn("text-sm font-semibold", (res.remainingAmount || 0) > 0 ? "text-red-600" : "text-gray-500", direction === 'rtl' ? 'text-left' : 'text-right')}>
                                  {(res.remainingAmount || 0).toFixed(2)}
                              </TableCell>
                              <TableCell>
                                {(res.remainingAmount || 0) > 0 ? (
                                  <div className="flex items-center gap-2">
                                    <div className="relative flex-grow">
                                      <DollarSign className={cn("absolute top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none", direction === 'rtl' ? 'right-2' : 'left-2')} />
                                      <Input
                                        type="number"
                                        placeholder={currentTranslations.amountPlaceholder}
                                        value={newPaymentAmounts[res.id] || ''}
                                        onChange={(e) => handleNewPaymentChange(res.id, e.target.value)}
                                        className={cn("h-9 text-sm", direction === 'rtl' ? 'pr-7' : 'pl-7')}
                                        disabled={processingPayment[res.id]}
                                        min="0.01"
                                        step="0.01"
                                        dir={direction}
                                      />
                                    </div>
                                    <Button
                                      size="sm"
                                      onClick={() => handleRecordPayment(res.id)}
                                      disabled={processingPayment[res.id] || !newPaymentAmounts[res.id] || parseFloat(newPaymentAmounts[res.id] || '0') <= 0}
                                      className="h-9"
                                    >
                                      {processingPayment[res.id] ? <Loader2 className="h-4 w-4 animate-spin" /> : currentTranslations.recordButton}
                                    </Button>
                                  </div>
                                ) : (
                                  <span className="text-sm text-green-600">{currentTranslations.fullyPaidText}</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Input
                                    type="file"
                                    className="text-xs h-9 flex-grow"
                                    accept="image/*,application/pdf"
                                    onChange={(e) => handleReceiptFileChange(res.id, e.target.files ? e.target.files[0] : null)}
                                    disabled={processingPayment[res.id]}
                                  />
                                  {paymentReceiptFiles[res.id] && <Upload className="h-4 w-4 text-primary" />}
                                </div>
                              </TableCell>
                              {user?.role === USER_ROLES.SUPER_ADMIN && (
                                <TableCell className="text-center">
                                  <Button variant="ghost" size="icon" onClick={() => openEditPaymentDialog(res)} title={currentTranslations.editPaymentButton}>
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              )}
                            </TableRow>
                          ))}
                        </TableBody>
                        <TableFooter>
                          <TableRow>
                            <TableCell className="font-semibold">{currentTranslations.tripTotalsLabel}</TableCell>
                            <TableCell className={cn("font-bold", direction === 'rtl' ? 'text-left' : 'text-right')}>{tripTotalSum.toFixed(2)}</TableCell>
                            <TableCell className={cn("font-bold text-green-600", direction === 'rtl' ? 'text-left' : 'text-right')}>{tripPaidSum.toFixed(2)}</TableCell>
                            <TableCell className={cn("font-bold", tripRemainingSum > 0 ? "text-red-600" : "text-gray-500", direction === 'rtl' ? 'text-left' : 'text-right')}>{tripRemainingSum.toFixed(2)}</TableCell>
                            <TableCell colSpan={user?.role === USER_ROLES.SUPER_ADMIN ? 3 : 2} /> 
                          </TableRow>
                        </TableFooter>
                      </Table>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          ) : (
             <div className="text-center py-10">
                <Info className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg text-muted-foreground">
                  {currentTranslations.noReservationsFound}{searchTerm ? currentTranslations.matchingCriteria : (rawReservations.length === 0 && !overallLoading ? currentTranslations.noReservationsInSystem : "")}.
                </p>
              </div>
          )}
        </CardContent>
      </Card>

      {editingReservation && (
        <Dialog open={isEditPaymentDialogOpen} onOpenChange={setIsEditPaymentDialogOpen}>
          <DialogContent className="sm:max-w-md" dir={direction}>
            <DialogHeader>
              <DialogTitle>{currentTranslations.editPaymentDialogTitle}</DialogTitle>
              <DialogDesc>
                {currentTranslations.guestHeader}: {editingReservation.guestName} (ID: {editingReservation.id})
              </DialogDesc>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-2 text-sm">
              <div>
                <p className="font-medium text-muted-foreground">{currentTranslations.currentTotalLabel}</p>
                <p className="font-semibold">EGP {editingReservation.totalCalculatedPrice?.toFixed(2) || '0.00'}</p>
              </div>
              <div>
                <p className="font-medium text-muted-foreground">{currentTranslations.currentPaidLabel}</p>
                <p className="font-semibold text-green-600">EGP {editingReservation.depositAmount?.toFixed(2) || '0.00'}</p>
              </div>
            </div>
            <Form {...editPaymentForm}>
              <form onSubmit={editPaymentForm.handleSubmit(handleUpdateDepositAmount)} className="space-y-4">
                <FormField
                  control={editPaymentForm.control}
                  name="newDepositAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{currentTranslations.newPaidAmountLabel}</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <DollarSign className={cn("absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground", direction === 'rtl' ? 'right-3' : 'left-3')} />
                          <Input
                            type="number"
                            step="0.01"
                            placeholder={currentTranslations.amountPlaceholder}
                            className={cn(direction === 'rtl' ? 'pr-10' : 'pl-10')}
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter className="pt-2">
                  <DialogClose asChild><Button type="button" variant="outline" disabled={processingEditPayment}>{currentTranslations.cancelButton}</Button></DialogClose>
                  <Button type="submit" disabled={processingEditPayment}>
                    {processingEditPayment && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {processingEditPayment ? currentTranslations.savingChangesButton : currentTranslations.saveChangesButton}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default AdminPaymentsPage;
    
