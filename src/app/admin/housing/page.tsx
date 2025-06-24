
"use client";

import type { NextPage } from 'next';
import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Skeleton } from '@/components/ui/skeleton';
import { Home as HomeIcon, Info, MapPin, CalendarDays as CalendarIcon, BedDouble as BedDoubleIcon, Users as UsersIcon, Download } from 'lucide-react';
import type { InitialReservation, TripDate, Hotel, Destination, RoomType, RequestedRoomItem } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { db } from '@/lib/firebase';
import { collection, query, onSnapshot, orderBy, Timestamp } from 'firebase/firestore';
import { useLanguage } from '@/contexts/LanguageContext';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable'; // Import autoTable

interface EnrichedTripDateForHousing extends TripDate {
  destinationName?: string;
  hotelName?: string;
  reservations: InitialReservation[];
}

const AdminHousingPage: NextPage = () => {
  const { toast } = useToast();
  const { language, direction } = useLanguage();
  
  const [allData, setAllData] = useState<EnrichedTripDateForHousing[]>([]);
  
  const [destinationsMap, setDestinationsMap] = useState<Record<string, Destination>>({});
  const [hotelsMap, setHotelsMap] = useState<Record<string, Hotel>>({});
  const [masterRoomTypesMap, setMasterRoomTypesMap] = useState<Record<string, RoomType>>({});

  const [loadingDestinations, setLoadingDestinations] = useState(true);
  const [loadingHotels, setLoadingHotels] = useState(true);
  const [loadingMasterRoomTypes, setLoadingMasterRoomTypes] = useState(true);
  const [loadingReservations, setLoadingReservations] = useState(true); 
  const [overallLoading, setOverallLoading] = useState(true);


  const currentTranslations = useMemo(() => {
    const translations = {
        en: {
        pageTitle: "Housing Management",
        pageDescription: "View guest housing assignments for each trip.",
        accordionTrigger: (tripName: string, resCount: number) => `${tripName} (${resCount} Reservation${resCount !== 1 ? 's' : ''})`,
        guestHeader: "Guest",
        numGuestsHeader: "Total Guests",
        roomsHeader: "Room Assignments",
        noReservations: "No reservations found for this trip.",
        noTrips: "No trips with reservations found.",
        loadingData: "Loading housing data...",
        errorFetching: "Error fetching data",
        errorFetchingDetails: (entity: string) => `Could not load ${entity} details.`,
        unknown: "Unknown",
        downloadPdfButton: "Download Housing PDF",
        pdfTitle: "Housing Report",
        pdfTripLabel: "Trip:",
        pdfGuestLabel: "Guest",
        pdfTotalGuestsLabel: "Total Guests",
        pdfRoomsLabel: "Room Assignments",
        pdfGeneratedFor: "Generated for:"
        },
        ar: {
        pageTitle: "ادارة تسكين الغرف", // Updated translation
        pageDescription: "عرض تعيينات إسكان الضيوف لكل رحلة.",
        accordionTrigger: (tripName: string, resCount: number) => `${tripName} (${resCount} حجز${resCount !== 1 ? 'ات' : ''})`,
        guestHeader: "الضيف",
        numGuestsHeader: "إجمالي الضيوف",
        roomsHeader: "تعيينات الغرف",
        noReservations: "لم يتم العثور على حجوزات لهذه الرحلة.",
        noTrips: "لم يتم العثور على رحلات بها حجوزات.",
        loadingData: "جارٍ تحميل بيانات الإسكان...",
        errorFetching: "خطأ في جلب البيانات",
        errorFetchingDetails: (entity: string) => `تعذر تحميل تفاصيل ${entity}.`,
        unknown: "غير معروف",
        downloadPdfButton: "تحميل PDF الإسكان",
        pdfTitle: "Housing Report", 
        pdfTripLabel: "Trip:",
        pdfGuestLabel: "Guest",
        pdfTotalGuestsLabel: "Total Guests",
        pdfRoomsLabel: "Room Assignments",
        pdfGeneratedFor: "Generated for:"
        },
    };
    return translations[language];
  }, [language]);

  useEffect(() => {
    setOverallLoading(loadingReservations || loadingDestinations || loadingHotels || loadingMasterRoomTypes);
  }, [loadingReservations, loadingDestinations, loadingHotels, loadingMasterRoomTypes]);


  useEffect(() => {
    const q = query(collection(db, "destinations"));
    const unsubDestinations = onSnapshot(q, (snapshot) => {
      const dMap: Record<string, Destination> = {};
      snapshot.forEach(doc => dMap[doc.id] = { id: doc.id, ...doc.data() } as Destination);
      setDestinationsMap(dMap);
      setLoadingDestinations(false);
    }, (err) => {
      console.error("Error fetching destinations for housing: ", err);
      toast({ title: currentTranslations.errorFetching, description: currentTranslations.errorFetchingDetails("destinations"), variant: "destructive" });
      setLoadingDestinations(false);
    });
    return () => unsubDestinations();
  }, [toast, currentTranslations]);

  useEffect(() => {
    const q = query(collection(db, "hotels"));
    const unsubHotels = onSnapshot(q, (snapshot) => {
      const hMap: Record<string, Hotel> = {};
      snapshot.forEach(doc => hMap[doc.id] = { id: doc.id, ...doc.data() } as Hotel);
      setHotelsMap(hMap);
      setLoadingHotels(false);
    }, (err) => {
      console.error("Error fetching hotels for housing: ", err);
      toast({ title: currentTranslations.errorFetching, description: currentTranslations.errorFetchingDetails("hotels"), variant: "destructive" });
      setLoadingHotels(false);
    });
    return () => unsubHotels();
  }, [toast, currentTranslations]);

  useEffect(() => {
    const q = query(collection(db, "roomTypes"));
    const unsubRoomTypes = onSnapshot(q, (snapshot) => {
      const rtMap: Record<string, RoomType> = {};
      snapshot.forEach(doc => rtMap[doc.id] = { id: doc.id, ...doc.data() } as RoomType);
      setMasterRoomTypesMap(rtMap);
      setLoadingMasterRoomTypes(false);
    }, (err) => {
      console.error("Error fetching room types for housing: ", err);
      toast({ title: currentTranslations.errorFetching, description: currentTranslations.errorFetchingDetails("room types"), variant: "destructive" });
      setLoadingMasterRoomTypes(false);
    });
    return () => unsubRoomTypes();
  }, [toast, currentTranslations]);

  useEffect(() => {
    if (loadingDestinations || loadingHotels || loadingMasterRoomTypes) {
      return; 
    }
    setLoadingReservations(true); 

    const unsubTripDates = onSnapshot(query(collection(db, "tripDates"), orderBy("startDate", "desc")), async (tripSnapshot) => {
      const tripDatesData = tripSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TripDate));
      
      const unsubReservations = onSnapshot(query(collection(db, "reservations"), orderBy("reservationDate", "desc")), (resSnapshot) => {
        const reservationsData = resSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InitialReservation));
        
        const enrichedData = tripDatesData.map(trip => {
          const hotel = hotelsMap[trip.hotelId];
          const destination = hotel ? destinationsMap[hotel.destinationId] : undefined;
          const tripReservations = reservationsData.filter(res => res.tripDateId === trip.id && res.status === 'confirmed');

          return {
            ...trip,
            startDate: (trip.startDate as Timestamp).toDate(),
            endDate: (trip.endDate as Timestamp).toDate(),
            destinationName: destination?.name || currentTranslations.unknown,
            hotelName: hotel?.name || currentTranslations.unknown,
            reservations: tripReservations,
          };
        }).filter(trip => trip.reservations.length > 0);

        setAllData(enrichedData);
        setLoadingReservations(false); 
      }, (err) => {
        console.error("Error fetching reservations for housing: ", err);
        toast({ title: currentTranslations.errorFetching, description: currentTranslations.errorFetchingDetails("reservations"), variant: "destructive" });
        setLoadingReservations(false);
      });
      return () => unsubReservations();
    }, (err) => {
        console.error("Error fetching trip dates for housing: ", err);
        toast({ title: currentTranslations.errorFetching, description: currentTranslations.errorFetchingDetails("trip dates"), variant: "destructive" });
        setLoadingReservations(false);
    });

    return () => {
      unsubTripDates();
    };
  }, [toast, currentTranslations, destinationsMap, hotelsMap, masterRoomTypesMap, loadingDestinations, loadingHotels, loadingMasterRoomTypes]);

  const formatRoomDetails = (requestedRooms?: RequestedRoomItem[]): string => {
    if (!requestedRooms || requestedRooms.length === 0) return currentTranslations.unknown;
    return requestedRooms.map(room => {
      const roomTypeName = masterRoomTypesMap[room.roomTypeId]?.name || room.roomTypeName || `ID: ${room.roomTypeId}`;
      return `${room.numberOfRooms}x ${roomTypeName}`;
    }).join(', ');
  };

  const handleDownloadHousingPdf = (trip: EnrichedTripDateForHousing) => {
    const doc = new jsPDF();
    const pdfTranslations = currentTranslations; 

    doc.setFontSize(18);
    doc.text(pdfTranslations.pdfTitle, 15, 20);

    doc.setFontSize(12);
    const tripTitle = `${pdfTranslations.pdfGeneratedFor} ${trip.destinationName} - ${trip.hotelName}`;
    doc.text(tripTitle, 15, 30);
    const tripDates = `${format(new Date(trip.startDate), 'PP')} - ${format(new Date(trip.endDate), 'PP')}`;
    doc.text(tripDates, 15, 38);

    const tableColumn = [pdfTranslations.pdfGuestLabel, pdfTranslations.pdfTotalGuestsLabel, pdfTranslations.pdfRoomsLabel];
    const tableRows: (string | number)[][] = [];

    trip.reservations.forEach(res => {
      const reservationRow = [
        `${res.guestName}\n(${res.guestPhone || 'No Phone'})`,
        res.numberOfGuests || pdfTranslations.unknown,
        formatRoomDetails(res.requestedRooms)
      ];
      tableRows.push(reservationRow);
    });

    (doc as any).autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 45,
      headStyles: { fillColor: [22, 160, 133] }, 
      alternateRowStyles: { fillColor: [240, 240, 240] },
      styles: { font: 'helvetica', cellPadding: 3 }, 
    });
    
    doc.save(`Housing_Report_${trip.hotelName?.replace(/\s+/g, '_')}_${format(new Date(trip.startDate), 'yyyy-MM-dd')}.pdf`);
  };


  if (overallLoading) {
    return (
      <div className="space-y-8" dir={direction}>
        <div className="flex items-center gap-3"> <Skeleton className="h-8 w-8" /> <div> <Skeleton className="h-7 w-48 mb-1" /> <Skeleton className="h-4 w-72" /> </div> </div>
        <Card><CardHeader><Skeleton className="h-6 w-1/3 mb-2" /><Skeleton className="h-4 w-1/2" /></CardHeader>
          <CardContent className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8" dir={direction}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold flex items-center">
            <HomeIcon className={cn("h-8 w-8 text-primary", direction === 'rtl' ? 'ml-3' : 'mr-3')} /> 
            {currentTranslations.pageTitle}
          </h1>
          <p className="text-muted-foreground">{currentTranslations.pageDescription}</p>
        </div>
      </div>

      {allData.length > 0 ? (
        <Accordion type="multiple" className="w-full space-y-4">
          {allData.map((trip) => (
            <AccordionItem value={trip.id} key={trip.id} className="border bg-card rounded-lg shadow-md overflow-hidden">
              <AccordionTrigger className="p-4 hover:bg-muted/50 transition-colors text-lg font-semibold">
                <div className={cn("flex items-center gap-3 text-left", direction === 'rtl' && "flex-row-reverse text-right")}>
                  <MapPin className="h-5 w-5 text-primary/80 flex-shrink-0" />
                  <div className="flex-grow">
                    <span>{trip.destinationName} - {trip.hotelName}</span>
                    <span className="block text-xs text-muted-foreground font-normal">
                      {format(new Date(trip.startDate), 'PP')} - {format(new Date(trip.endDate), 'PP')}
                    </span>
                  </div>
                </div>
                <span className="text-sm font-normal text-muted-foreground whitespace-nowrap ml-2">
                  ({trip.reservations.length} {language === 'ar' ? 'حجز مؤكد' : 'Confirmed Reservation(s)'})
                </span>
              </AccordionTrigger>
              <AccordionContent className="p-0 border-t">
                {trip.reservations.length > 0 ? (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-center">{currentTranslations.guestHeader}</TableHead>
                          <TableHead className="text-center w-32">{currentTranslations.numGuestsHeader}</TableHead>
                          <TableHead className="text-center">{currentTranslations.roomsHeader}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {trip.reservations.map((res) => (
                          <TableRow key={res.id}>
                            <TableCell className="text-center">
                              <div className="font-medium">{res.guestName}</div>
                              <div className="text-xs text-muted-foreground">{res.guestPhone}</div>
                            </TableCell>
                            <TableCell className="text-center">{res.numberOfGuests || currentTranslations.unknown}</TableCell>
                            <TableCell className="text-center text-sm">{formatRoomDetails(res.requestedRooms)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <div className="p-4 flex justify-end">
                        <Button onClick={() => handleDownloadHousingPdf(trip)} size="sm">
                            <Download className={cn("h-4 w-4", direction === 'rtl' ? "ml-2" : "mr-2")}/>
                            {currentTranslations.downloadPdfButton}
                        </Button>
                    </div>
                  </>
                ) : (
                  <p className="p-4 text-sm text-muted-foreground text-center">{currentTranslations.noReservations}</p>
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      ) : (
        <Card>
          <CardContent className="py-10 text-center">
            <Info className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg text-muted-foreground">{currentTranslations.noTrips}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminHousingPage;

