
"use client";

import type { NextPage } from 'next';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardFooter, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ArrowLeft, Edit3, CalendarDays, User, Phone, Mail, BedDouble, Users as UsersIconLucide, FileText, Info, Clock, CheckCircle, AlertCircle, XCircle, Hotel as HotelIcon, Bus, DollarSign, UserCheck, MessageSquare, CheckSquare, Tag, Download } from 'lucide-react';
import type { InitialReservation, TripDate, Hotel, Destination, SelectedExtraFee } from '@/lib/types';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { db } from '@/lib/firebase';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { jsPDF } from 'jspdf';
import { useLanguage } from '@/contexts/LanguageContext';


interface EnrichedReservationDetails extends InitialReservation {
  tripDateDetails?: TripDate;
  hotelDetails?: Hotel & { destinationName?: string };
}

const getInitials = (name?: string) => {
  if (!name) return 'G';
  const names = name.split(' ');
  return names.map(n => n[0]).join('').toUpperCase().substring(0,2);
};

const pageTranslations = {
    en: {
      backButton: "Back to Reservation List",
      pageTitle: "Reservation Details",
      reservationIdLabel: "Reservation ID:",
      statusLabel: "Status:",
      guestNameLabel: "Guest Name",
      phoneLabel: "Phone",
      emailLabel: "Email",
      reservationSubmittedLabel: "Reservation Submitted",
      numGuestsLabel: "Number of Guests",
      transportSeatsLabel: "Transportation Seats",
      tripDetailsTitle: "Trip & Room Details",
      hotelLabel: "Hotel:",
      destinationLabel: "Destination:",
      tripDatesLabel: "Trip Dates:",
      requestedRoomsLabel: "Requested Rooms:",
      selectedExtrasLabel: "Selected Extra Fees",
      pricingPaymentTitle: "Pricing & Payment",
      totalPriceLabel: "Est. Total Price:",
      totalPaidLabel: "Total Paid:",
      remainingBalanceLabel: "Remaining Balance:",
      contactLogTitle: "Contact & Confirmation Log",
      contactedByLabel: "Contacted By:",
      contactedOnLabel: "On:",
      confirmedByLabel: "Confirmed By:",
      confirmedOnLabel: "On:",
      notYetContacted: "Not yet contacted.",
      notYetConfirmed: "Not yet confirmed.",
      adminNotesTitle: "Admin Notes",
      recordCreatedLabel: "Record Created:",
      lastUpdatedLabel: "Last Updated:",
      closeButton: "Close",
      updateButton: "Update Reservation",
      downloadPdfButton: "Download Confirmation PDF",
      pdfTitle: "Reservation Confirmation", 
      appNameForPdf: "Khatwa", 
      pdfResId: "Reservation ID:",
      pdfGuestName: "Guest Name:",
      pdfHotelName: "Hotel:",
      pdfTripDates: "Trip Dates:",
      pdfTotalPrice: "Total Price:",
      pdfAmountPaid: "Amount Paid:",
      pdfStatus: "Status:",
      na: "N/A",
      statusPending: "Pending",
      statusConfirmed: "Confirmed",
      statusContacted: "Contacted",
      statusCancelled: "Cancelled",
      statusUnknown: "Unknown",
      errorReservationNotFound: "Reservation not found.",
      errorLoadingDetails: "Could not load full reservation details.",
      errorIdMissing: "Reservation ID is missing.",
    },
    ar: {
      backButton: "العودة إلى قائمة الحجوزات",
      pageTitle: "تفاصيل الحجز",
      reservationIdLabel: "معرف الحجز:",
      statusLabel: "الحالة:",
      guestNameLabel: "اسم الضيف",
      phoneLabel: "الهاتف",
      emailLabel: "البريد الإلكتروني",
      reservationSubmittedLabel: "تم إرسال الحجز في",
      numGuestsLabel: "عدد الضيوف",
      transportSeatsLabel: "مقاعد النقل",
      tripDetailsTitle: "تفاصيل الرحلة والغرف",
      hotelLabel: "الفندق:",
      destinationLabel: "الوجهة:",
      tripDatesLabel: "تواريخ الرحلة:",
      requestedRoomsLabel: "الغرف المطلوبة:",
      selectedExtrasLabel: "الخدمات الإضافية المختارة",
      pricingPaymentTitle: "التسعير والدفع",
      totalPriceLabel: "السعر الإجمالي المقدر:",
      totalPaidLabel: "إجمالي المدفوع:",
      remainingBalanceLabel: "الرصيد المتبقي:",
      contactLogTitle: "سجل الاتصال والتأكيد",
      contactedByLabel: "تم الاتصال بواسطة:",
      contactedOnLabel: "في:",
      confirmedByLabel: "تم التأكيد بواسطة:",
      confirmedOnLabel: "في:",
      notYetContacted: "لم يتم الاتصال بعد.",
      notYetConfirmed: "لم يتم التأكيد بعد.",
      adminNotesTitle: "ملاحظات المسؤول",
      recordCreatedLabel: "تم إنشاء السجل:",
      lastUpdatedLabel: "آخر تحديث:",
      closeButton: "إغلاق",
      updateButton: "تحديث الحجز",
      downloadPdfButton: "تحميل تأكيد PDF",
      pdfTitle: "Reservation Confirmation", 
      appNameForPdf: "خطوة",
      pdfResId: "Reservation ID:",
      pdfGuestName: "Guest Name:",
      pdfHotelName: "Hotel:",
      pdfTripDates: "Trip Dates:",
      pdfTotalPrice: "Total Price:",
      pdfAmountPaid: "Amount Paid:",
      pdfStatus: "Status:",
      na: "غير متوفر",
      statusPending: "معلق",
      statusConfirmed: "مؤكد",
      statusContacted: "تم الاتصال به",
      statusCancelled: "ملغى",
      statusUnknown: "غير معروف",
      errorReservationNotFound: "الحجز غير موجود.",
      errorLoadingDetails: "تعذر تحميل تفاصيل الحجز الكاملة.",
      errorIdMissing: "معرف الحجز مفقود.",
    }
};


const ViewReservationPage: NextPage = () => {
  const router = useRouter();
  const { reservationId } = useParams<{ reservationId: string }>();
  const { toast } = useToast();
  const { language: currentLanguage, appName: contextAppName, direction } = useLanguage();

  const [reservation, setReservation] = useState<EnrichedReservationDetails | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);
  
  const currentTranslations = pageTranslations[currentLanguage] || pageTranslations.en;
  const pdfEnglishTranslations = pageTranslations.en; // Always use English for PDF

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    const loadReservationData = async () => {
      setDataLoading(true);
      if (!reservationId) {
        toast({ title: "Error", description: currentTranslations.errorIdMissing, variant: "destructive" });
        router.replace('/admin/reservations');
        setDataLoading(false);
        return;
      }

      try {
        const resDocRef = doc(db, "reservations", reservationId);
        const resSnap = await getDoc(resDocRef);

        if (resSnap.exists()) {
          const resData = resSnap.data() as InitialReservation;
          let enrichedDetails: EnrichedReservationDetails = {
            ...resData,
            id: resSnap.id,
            reservationDate: resData.reservationDate instanceof Timestamp ? resData.reservationDate.toDate() : (resData.reservationDate ? new Date(resData.reservationDate as any) : undefined as any),
            createdAt: resData.createdAt instanceof Timestamp ? resData.createdAt.toDate() : (resData.createdAt ? new Date(resData.createdAt as any) : undefined),
            updatedAt: resData.updatedAt instanceof Timestamp ? resData.updatedAt.toDate() : (resData.updatedAt ? new Date(resData.updatedAt as any) : undefined),
            contactedAt: resData.contactedAt instanceof Timestamp ? resData.contactedAt.toDate() : (resData.contactedAt ? new Date(resData.contactedAt as any) : undefined),
            confirmedAt: resData.confirmedAt instanceof Timestamp ? resData.confirmedAt.toDate() : (resData.confirmedAt ? new Date(resData.confirmedAt as any) : undefined),
            depositAmount: resData.depositAmount,
            selectedExtraFees: resData.selectedExtraFees || [],
          };

          if (resData.hotelId) {
            const hotelDocRef = doc(db, "hotels", resData.hotelId);
            const hotelSnap = await getDoc(hotelDocRef);
            if (hotelSnap.exists()) {
              const hotelData = hotelSnap.data() as Hotel;
              enrichedDetails.hotelDetails = { ...hotelData, id: hotelSnap.id };
              if (hotelData.destinationId) {
                const destDocRef = doc(db, "destinations", hotelData.destinationId);
                const destSnap = await getDoc(destDocRef);
                if (destSnap.exists()) {
                  enrichedDetails.hotelDetails.destinationName = (destSnap.data() as Destination).name;
                }
              }
            }
          }

          if (resData.tripDateId) {
            const tripDocRef = doc(db, "tripDates", resData.tripDateId);
            const tripSnap = await getDoc(tripDocRef);
            if (tripSnap.exists()) {
              const tripData = tripSnap.data();
              enrichedDetails.tripDateDetails = {
                ...tripData,
                id: tripSnap.id,
                startDate: tripData.startDate instanceof Timestamp ? tripData.startDate.toDate() : new Date(tripData.startDate as any),
                endDate: tripData.endDate instanceof Timestamp ? tripData.endDate.toDate() : new Date(tripData.endDate as any),
              } as TripDate;
            }
          }
          setReservation(enrichedDetails);
        } else {
          toast({ title: "Error", description: currentTranslations.errorReservationNotFound, variant: "destructive" });
          router.replace('/admin/reservations');
        }
      } catch (error) {
        console.error("Error loading reservation details:", error);
        toast({ title: "Loading Error", description: currentTranslations.errorLoadingDetails, variant: "destructive"});
      } finally {
        setDataLoading(false);
      }
    };
    loadReservationData();
  }, [reservationId, router, toast, currentTranslations.errorIdMissing, currentTranslations.errorReservationNotFound, currentTranslations.errorLoadingDetails]);

  const getStatusTextForPdf = (status: InitialReservation['status']) => {
    switch (status) {
      case 'pending': return pdfEnglishTranslations.statusPending;
      case 'confirmed': return pdfEnglishTranslations.statusConfirmed;
      case 'contacted': return pdfEnglishTranslations.statusContacted;
      case 'cancelled': return pdfEnglishTranslations.statusCancelled;
      default: return pdfEnglishTranslations.statusUnknown;
    }
  };

  const handleDownloadPdf = () => {
    if (!reservation || !reservation.hotelDetails || !reservation.tripDateDetails) {
      toast({ title: "Error", description: "Cannot generate PDF, reservation details incomplete.", variant: "destructive" });
      return;
    }
    const doc = new jsPDF();
    const translations = pdfEnglishTranslations; // Use English for PDF
    const margin = 15;
    let y = 20;
    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;
    const lineSpacing = 7;
    const sectionSpacing = 10;

    const checkAndAddPage = (requiredSpace: number) => {
        if (y + requiredSpace > pageHeight - margin) {
            doc.addPage();
            y = margin;
        }
    };

    // Header
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text(reservation.guestName || translations.na, margin, y);
    y += lineSpacing * 1.5;

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`${translations.pdfResId} ${reservation.id}`, margin, y);
    
    // Status - Top Right
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    const statusText = getStatusTextForPdf(reservation.status);
    const statusWidth = doc.getStringUnitWidth(statusText) * doc.getFontSize() / doc.internal.scaleFactor;
    doc.setFillColor(230, 255, 230); // Light green for confirmed-like status
    if (reservation.status === 'confirmed') {
        doc.rect(pageWidth - margin - statusWidth - 6, y - 5, statusWidth + 6, 7, 'F');
        doc.setTextColor(0,100,0); // Dark green text
        doc.text(statusText, pageWidth - margin - statusWidth - 3, y);
    } else {
        doc.setTextColor(100, 100, 100); // Grey for other statuses
        doc.text(statusText, pageWidth - margin - statusWidth, y);
    }
    doc.setTextColor(0, 0, 0); // Reset text color
    y += lineSpacing * 1.5;


    // Guest Information
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text("Guest Information", margin, y);
    y += lineSpacing;
    doc.setLineWidth(0.2);
    doc.line(margin, y - 3, pageWidth - margin, y - 3);

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    const col1X = margin;
    const col2X = margin + 80;

    doc.text(`${translations.guestNameLabel}: ${reservation.guestName || translations.na}`, col1X, y);
    doc.text(`${translations.phoneLabel}: ${reservation.guestPhone || translations.na}`, col2X, y);
    y += lineSpacing;

    const submittedDate = reservation.reservationDate instanceof Date && !isNaN(reservation.reservationDate.getTime())
                        ? format(reservation.reservationDate, 'PPp')
                        : translations.na;
    doc.text(`${translations.reservationSubmittedLabel}: ${submittedDate}`, col1X, y);
    doc.text(`${translations.numGuestsLabel}: ${reservation.numberOfGuests || translations.na}`, col2X, y);
    y += lineSpacing;

    if (reservation.numberOfTransportationSeats && reservation.numberOfTransportationSeats > 0) {
      doc.text(`${translations.transportSeatsLabel}: ${reservation.numberOfTransportationSeats}`, col1X, y);
    }
    y += sectionSpacing;


    // Trip & Room Details
    checkAndAddPage(30);
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(translations.tripDetailsTitle, margin, y);
    y += lineSpacing;
    doc.line(margin, y - 3, pageWidth - margin, y - 3);

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`${translations.hotelLabel} ${reservation.hotelDetails.name || translations.na}`, margin, y);
    if (reservation.hotelDetails.destinationName) {
      y += lineSpacing * 0.7;
      doc.setFontSize(8);
      doc.text(`(${translations.destinationLabel} ${reservation.hotelDetails.destinationName})`, margin + 5, y);
      doc.setFontSize(10);
    }
    y += lineSpacing;

    const tripStartDateFormatted = reservation.tripDateDetails.startDate instanceof Date && !isNaN(reservation.tripDateDetails.startDate.getTime())
                                ? format(reservation.tripDateDetails.startDate, 'PP')
                                : translations.na;
    const tripEndDateFormatted = reservation.tripDateDetails.endDate instanceof Date && !isNaN(reservation.tripDateDetails.endDate.getTime())
                                ? format(reservation.tripDateDetails.endDate, 'PP')
                                : translations.na;
    doc.text(`${translations.tripDatesLabel} ${tripStartDateFormatted} - ${tripEndDateFormatted}`, margin, y);
    y += lineSpacing;

    doc.setFont(undefined, 'bold');
    doc.text(translations.requestedRoomsLabel, margin, y);
    doc.setFont(undefined, 'normal');
    y += lineSpacing * 0.7;
    if (reservation.requestedRooms && reservation.requestedRooms.length > 0) {
      reservation.requestedRooms.forEach(room => {
        checkAndAddPage(lineSpacing);
        doc.text(`- ${room.numberOfRooms}x ${room.roomTypeName || `Room ID ${room.roomTypeId}`}`, margin + 5, y);
        y += lineSpacing;
      });
    } else {
      doc.text(`- ${translations.na}`, margin + 5, y);
      y += lineSpacing;
    }
    y += sectionSpacing - lineSpacing; // Adjust spacing

    // Selected Extra Fees
    if (reservation.selectedExtraFees && reservation.selectedExtraFees.length > 0) {
      checkAndAddPage(30);
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text(translations.selectedExtrasLabel, margin, y);
      y += lineSpacing;
      doc.line(margin, y - 3, pageWidth - margin, y - 3);

      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      reservation.selectedExtraFees.forEach(fee => {
        checkAndAddPage(lineSpacing);
        const feeText = `${fee.name} (for ${fee.numberOfGuestsForFee} guests)`;
        const priceText = `EGP ${fee.pricePerPerson.toFixed(2)}/person`;
        const priceWidth = doc.getStringUnitWidth(priceText) * doc.getFontSize() / doc.internal.scaleFactor;
        doc.text(feeText, margin, y);
        doc.text(priceText, pageWidth - margin - priceWidth, y);
        y += lineSpacing;
      });
      y += sectionSpacing - lineSpacing;
    }
    
    // Pricing & Payment
    checkAndAddPage(40);
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(translations.pricingPaymentTitle, margin, y);
    y += lineSpacing;
    doc.line(margin, y - 3, pageWidth - margin, y - 3);

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    const totalCalculatedPrice = reservation.totalCalculatedPrice || 0;
    const depositAmount = reservation.depositAmount || 0;
    const remainingBalance = totalCalculatedPrice - depositAmount;

    const pricingCol1X = margin;
    const pricingCol2X = margin + 70;
    const pricingCol3X = margin + 130;
    
    doc.text(translations.totalPriceLabel, pricingCol1X, y);
    doc.setFont(undefined, 'bold');
    doc.text(`EGP ${totalCalculatedPrice.toFixed(2)}`, pricingCol1X, y + lineSpacing*0.8);
    doc.setFont(undefined, 'normal');

    doc.text(translations.totalPaidLabel, pricingCol2X, y);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(0, 128, 0); // Green
    doc.text(`EGP ${depositAmount.toFixed(2)}`, pricingCol2X, y + lineSpacing*0.8);
    doc.setTextColor(0, 0, 0); // Reset color
    doc.setFont(undefined, 'normal');
    
    doc.text(translations.remainingBalanceLabel, pricingCol3X, y);
    doc.setFont(undefined, 'bold');
    if (remainingBalance > 0) {
      doc.setTextColor(255, 0, 0); // Red
    } else {
      doc.setTextColor(100,100,100); // Grey
    }
    doc.text(`EGP ${remainingBalance.toFixed(2)}`, pricingCol3X, y + lineSpacing*0.8);
    doc.setTextColor(0, 0, 0); // Reset color
    doc.setFont(undefined, 'normal');

    doc.save(`Reservation_${reservation.id}_Confirmation.pdf`);
  };

  const getStatusInfo = (status: InitialReservation['status']) => {
    const translationsToUse = currentTranslations || pageTranslations.en;
    switch (status) {
      case 'pending': return { icon: Clock, classes: "text-amber-600 bg-amber-100 dark:text-amber-200 dark:bg-amber-900", label: translationsToUse.statusPending };
      case 'confirmed': return { icon: CheckCircle, classes: "text-green-600 bg-green-100 dark:text-green-200 dark:bg-green-900", label: translationsToUse.statusConfirmed };
      case 'contacted': return { icon: AlertCircle, classes: "text-blue-600 bg-blue-100 dark:text-blue-200 dark:bg-blue-900", label: translationsToUse.statusContacted };
      case 'cancelled': return { icon: XCircle, classes: "text-red-600 bg-red-100 dark:text-red-200 dark:bg-red-900", label: translationsToUse.statusCancelled };
      default: return { icon: FileText, classes: "text-muted-foreground bg-muted", label: translationsToUse.statusUnknown };
    }
  };

  const formatDateSafe = (dateInput: Date | Timestamp | undefined | null, formatString: string = 'PPp'): string => {
    if (!dateInput) return currentTranslations.na;
    const date = dateInput instanceof Timestamp ? dateInput.toDate() : dateInput;
    if (date instanceof Date && !isNaN(date.getTime())) {
        return format(date, formatString);
    }
    return currentTranslations.na;
  };
  
  const isLoadingComplete = !dataLoading && currentLanguage && contextAppName && reservation;

  if (!isLoadingComplete) {
    return (
      <div className="space-y-6" dir={direction}>
        <Skeleton className="h-9 w-40 mb-4" />
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <div className="flex items-center gap-4"> <Skeleton className="h-16 w-16 rounded-full" /> <div className="space-y-1"> <Skeleton className="h-7 w-48" /> <Skeleton className="h-5 w-64" /></div></div>
          </CardHeader>
          <CardContent className="space-y-6">
            {[...Array(9)].map((_, i) => <div key={i} className="space-y-1"><Skeleton className="h-5 w-1/3 mb-1"/><Skeleton className="h-4 w-2/3"/></div>)}
          </CardContent>
          <CardFooter className="flex justify-end space-x-2">
            <Skeleton className="h-10 w-24" /><Skeleton className="h-10 w-32" />
          </CardFooter>
        </Card>
      </div>
    );
  }

  const statusInfo = getStatusInfo(reservation.status);
  const StatusIcon = statusInfo.icon;
  const totalCalculatedPrice = reservation.totalCalculatedPrice || 0;
  const depositAmount = reservation.depositAmount || 0;
  const remainingBalance = totalCalculatedPrice - depositAmount;


  return (
    <div className="space-y-6" dir={direction}>
      <Button variant="outline" size="sm" asChild className="mb-4">
        <Link href="/admin/reservations">
          <ArrowLeft className={cn("h-4 w-4", direction === 'rtl' ? 'ml-2' : 'mr-2')} />
          {currentTranslations.backButton}
        </Link>
      </Button>

      <Card className="max-w-2xl mx-auto shadow-xl border">
        <CardHeader className="pb-4 border-b">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <Avatar className="h-20 w-20 text-3xl">
              <AvatarFallback>{getInitials(reservation.guestName)}</AvatarFallback>
            </Avatar>
            <div className="flex-grow">
              <CardTitle className="text-3xl font-headline">{reservation.guestName || currentTranslations.na}</CardTitle>
              <CardDescription className="text-md mt-1">
                {currentTranslations.reservationIdLabel} {reservation.id}
              </CardDescription>
            </div>
             <span className={cn("px-3 py-1.5 text-sm font-semibold rounded-full inline-flex items-center gap-2 self-start sm:self-center", statusInfo.classes)}>
                <StatusIcon className="h-5 w-5" />
                {statusInfo.label}
            </span>
          </div>
        </CardHeader>
        <CardContent className="pt-6 grid gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground flex items-center"><User className="mr-2 h-4 w-4"/>{currentTranslations.guestNameLabel}</h3>
              <p className="text-lg">{reservation.guestName || currentTranslations.na}</p>
            </div>
             <div>
              <h3 className="text-sm font-medium text-muted-foreground flex items-center"><Phone className="mr-2 h-4 w-4"/>{currentTranslations.phoneLabel}</h3>
              <p className="text-lg">{reservation.guestPhone || currentTranslations.na}</p>
            </div>
            {reservation.guestEmail && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground flex items-center"><Mail className="mr-2 h-4 w-4"/>{currentTranslations.emailLabel}</h3>
                <p className="text-lg">{reservation.guestEmail}</p>
              </div>
            )}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground flex items-center"><CalendarDays className="mr-2 h-4 w-4"/>{currentTranslations.reservationSubmittedLabel}</h3>
              <p className="text-lg">{formatDateSafe(reservation.reservationDate)}</p>
            </div>
             <div>
                <h3 className="text-sm font-medium text-muted-foreground flex items-center"><UsersIconLucide className="mr-2 h-4 w-4"/>{currentTranslations.numGuestsLabel}</h3>
                <p className="text-lg">{reservation.numberOfGuests || currentTranslations.na}</p>
            </div>
             {reservation.numberOfTransportationSeats && reservation.numberOfTransportationSeats > 0 && (
                <div>
                    <h3 className="text-sm font-medium text-muted-foreground flex items-center"><Bus className="mr-2 h-4 w-4"/>{currentTranslations.transportSeatsLabel}</h3>
                    <p className="text-lg">{reservation.numberOfTransportationSeats}</p>
                </div>
            )}
          </div>

          <div className="border-t pt-6">
            <h3 className="text-xl font-semibold mb-3 text-primary flex items-center"><HotelIcon className="mr-2 h-5 w-5"/>{currentTranslations.tripDetailsTitle}</h3>
            {reservation.hotelDetails && reservation.hotelDetails.name ? (
              <div className="space-y-1 mb-3">
                  <p className="flex items-center"><HotelIcon className="mr-2 h-4 w-4 text-muted-foreground"/><strong>{currentTranslations.hotelLabel}</strong> <span className="ml-1">{reservation.hotelDetails.name}</span></p>
                  {reservation.hotelDetails.destinationName && <p className="text-sm text-muted-foreground ml-6">({currentTranslations.destinationLabel} {reservation.hotelDetails.destinationName})</p>}
              </div>
            ) : <p className="text-muted-foreground flex items-center"><HotelIcon className="mr-2 h-4 w-4 text-muted-foreground"/><strong>{currentTranslations.hotelLabel}</strong> <span className="ml-1">{currentTranslations.na}</span></p>}

            {reservation.tripDateDetails && reservation.tripDateDetails.startDate && reservation.tripDateDetails.endDate ? (
                 <p className="flex items-center mb-3"><CalendarDays className="mr-2 h-4 w-4 text-muted-foreground"/><strong>{currentTranslations.tripDatesLabel}</strong> <span className="ml-1">{formatDateSafe(reservation.tripDateDetails.startDate, 'PP')} - {formatDateSafe(reservation.tripDateDetails.endDate, 'PP')}</span></p>
            ) : <p className="text-muted-foreground flex items-center"><CalendarDays className="mr-2 h-4 w-4 text-muted-foreground"/><strong>{currentTranslations.tripDatesLabel}</strong> <span className="ml-1">{currentTranslations.na}</span></p>}

            {reservation.requestedRooms && reservation.requestedRooms.length > 0 && (
                <div>
                    <strong className="text-muted-foreground flex items-center"><BedDouble className="mr-2 h-4 w-4"/>{currentTranslations.requestedRoomsLabel}</strong>
                    <ul className="list-disc list-inside ml-6 text-sm space-y-0.5 mt-1">
                        {(reservation.requestedRooms || []).map((room, index) => (
                            <li key={room?.roomTypeId || index}>{room?.numberOfRooms || 0}x {room?.roomTypeName || `${currentTranslations.na} Room ID ${room?.roomTypeId || currentTranslations.na}`}</li>
                        ))}
                    </ul>
                </div>
            )}
          </div>

          {reservation.selectedExtraFees && reservation.selectedExtraFees.length > 0 && (
            <div className="border-t pt-6">
                <h3 className="text-xl font-semibold mb-3 text-primary flex items-center"><Tag className="mr-2 h-5 w-5"/>{currentTranslations.selectedExtrasLabel}</h3>
                <ul className="space-y-1 text-sm">
                    {(reservation.selectedExtraFees || []).map((fee, index) => (
                        <li key={fee?.id || index} className="flex justify-between items-center">
                            <span>{fee?.name || currentTranslations.na} ({currentLanguage === 'ar' ? 'لـ' : 'for'} {fee?.numberOfGuestsForFee || 0} {currentLanguage === 'ar' ? ((fee?.numberOfGuestsForFee || 0) > 2 ? 'ضيوف' : 'ضيف') : ((fee?.numberOfGuestsForFee || 0) > 1 ? 'guests' : 'guest')})</span>
                            <span className="font-semibold text-foreground">EGP {(fee?.pricePerPerson || 0).toFixed(2)}/{currentLanguage === 'ar' ? 'شخص' : 'person'}</span>
                        </li>
                    ))}
                </ul>
            </div>
          )}

          <div className="border-t pt-6">
              <h3 className="text-xl font-semibold mb-3 text-primary flex items-center">
                  <DollarSign className="mr-2 h-5 w-5"/>{currentTranslations.pricingPaymentTitle}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                      <p className="text-sm font-medium text-muted-foreground">{currentTranslations.totalPriceLabel}</p>
                      <p className="text-lg font-bold text-foreground">
                          EGP {totalCalculatedPrice.toFixed(2)}
                      </p>
                  </div>
                   <div>
                      <p className="text-sm font-medium text-muted-foreground">{currentTranslations.totalPaidLabel}</p>
                      <p className="text-lg font-bold text-green-600">
                          EGP {depositAmount.toFixed(2)}
                      </p>
                  </div>
                  <div>
                      <p className="text-sm font-medium text-muted-foreground">{currentTranslations.remainingBalanceLabel}</p>
                      <p className={cn("text-lg font-bold", remainingBalance > 0 ? "text-red-600" : "text-gray-500")}>
                          EGP {remainingBalance.toFixed(2)}
                      </p>
                  </div>
              </div>
          </div>

          <div className="border-t pt-6 space-y-3">
            <h3 className="text-xl font-semibold text-primary">{currentTranslations.contactLogTitle}</h3>
            {reservation.contactedByName && reservation.contactedAt ? (
              <div className="text-sm"><p><strong className="text-muted-foreground">{currentTranslations.contactedByLabel}</strong> {reservation.contactedByName} <span className="text-xs text-muted-foreground">({currentTranslations.contactedOnLabel} {formatDateSafe(reservation.contactedAt)})</span></p></div>
            ) : <p className="text-sm text-muted-foreground">{currentTranslations.notYetContacted}</p>}

            {reservation.confirmedByName && reservation.confirmedAt ? (
              <div className="text-sm"><p><strong className="text-muted-foreground">{currentTranslations.confirmedByLabel}</strong> {reservation.confirmedByName} <span className="text-xs text-muted-foreground">({currentTranslations.confirmedOnLabel} {formatDateSafe(reservation.confirmedAt)})</span></p></div>
            ) : <p className="text-sm text-muted-foreground">{currentTranslations.notYetConfirmed}</p>}
          </div>

          {reservation.notes && (
            <div className="border-t pt-6">
              <h3 className="text-xl font-semibold mb-2 text-primary flex items-center"><Info className="mr-2 h-5 w-5"/>{currentTranslations.adminNotesTitle}</h3>
              <p className="text-sm text-foreground/80 whitespace-pre-wrap bg-muted/50 p-3 rounded-md border">{reservation.notes}</p>
            </div>
          )}

          {(reservation.createdAt || reservation.updatedAt) && (
            <div className="text-xs text-muted-foreground flex flex-col gap-1 pt-4 border-t mt-2">
                {reservation.createdAt &&
                    <p className="flex items-center"><Info className="mr-2 h-3 w-3" />{currentTranslations.recordCreatedLabel} {formatDateSafe(reservation.createdAt)}</p>
                }
                {reservation.updatedAt &&
                    <p className="flex items-center"><Info className="mr-2 h-3 w-3" />{currentTranslations.lastUpdatedLabel} {formatDateSafe(reservation.updatedAt)}</p>
                }
            </div>
          )}

        </CardContent>
        <CardFooter className="flex justify-end space-x-2 border-t pt-6">
          <Button variant="outline" onClick={() => router.back()}>{currentTranslations.closeButton}</Button>

          {isClient && reservation.status === 'confirmed' && (
             <Button onClick={handleDownloadPdf}>
                <Download className={cn("h-4 w-4", direction === 'rtl' ? 'ml-2' : 'mr-2')} />
                {currentTranslations.downloadPdfButton}
            </Button>
          )}

          <Button asChild>
            <Link href={`/admin/reservations/edit/${reservation.id}`}>
              <Edit3 className={cn("h-4 w-4", direction === 'rtl' ? 'ml-2' : 'mr-2')} /> {currentTranslations.updateButton}
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default ViewReservationPage;
    
