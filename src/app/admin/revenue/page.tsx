
"use client";

import type { NextPage } from 'next';
import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { DollarSign, Info, CalendarDays, Hotel, MapPin } from 'lucide-react';
import type { InitialReservation, TripDate, Hotel as HotelType, Destination } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { db } from '@/lib/firebase';
import { collection, query, onSnapshot, orderBy, where, Timestamp } from 'firebase/firestore';
import { useLanguage } from '@/contexts/LanguageContext';

interface TripRevenueData {
  tripDateId: string;
  tripSummary: string;
  totalRevenue: number;
  destinationName?: string;
  hotelName?: string;
  startDate?: Date;
  endDate?: Date;
}

interface TripDateMapEntry {
  startDate: Date;
  endDate: Date;
  hotelId: string;
  destinationId: string;
}

const AdminRevenuePage: NextPage = () => {
  const { toast } = useToast();
  const { language, direction } = useLanguage();
  const [tripRevenues, setTripRevenues] = useState<TripRevenueData[]>([]);
  
  const [loadingReservations, setLoadingReservations] = useState(true);
  const [loadingDestinations, setLoadingDestinations] = useState(true);
  const [loadingHotels, setLoadingHotels] = useState(true);
  const [loadingTripDates, setLoadingTripDates] = useState(true);
  const [overallLoading, setOverallLoading] = useState(true);

  const [destinationsMap, setDestinationsMap] = useState<Record<string, string>>({});
  const [hotelsMap, setHotelsMap] = useState<Record<string, string>>({});
  const [tripDatesMap, setTripDatesMap] = useState<Record<string, TripDateMapEntry>>({});

  const currentTranslations = useMemo(() => {
    const translations = {
      en: {
        pageTitle: "Revenue Overview",
        pageDescription: "Summary of revenue collected from confirmed trip reservations.",
        cardTitle: "Revenue by Trip",
        cardDescription: "Total paid amounts for each confirmed trip.",
        tripHeader: "Trip",
        revenueHeader: "Total Revenue (EGP)",
        overallTotal: "Overall Total Revenue:",
        noRevenueData: "No revenue data available. This could be due to no confirmed reservations with payments.",
        loadingRevenue: "Loading revenue data...",
        errorFetching: "Error Fetching Data",
        errorFetchingRevenue: "Could not load revenue data.",
        errorFetchingLookups: (entity: string) => `Could not load ${entity} for revenue report.`,
        unknown: "Unknown",
        na: "N/A",
      },
      ar: {
        pageTitle: "نظرة عامة على الإيرادات",
        pageDescription: "ملخص الإيرادات المحصلة من حجوزات الرحلات المؤكدة.",
        cardTitle: "الإيرادات حسب الرحلة",
        cardDescription: "إجمالي المبالغ المدفوعة لكل رحلة مؤكدة.",
        tripHeader: "الرحلة",
        revenueHeader: "إجمالي الإيرادات (ج.م)",
        overallTotal: "إجمالي الإيرادات الكلي:",
        noRevenueData: "لا توجد بيانات إيرادات متاحة. قد يكون هذا بسبب عدم وجود حجوزات مؤكدة مع مدفوعات.",
        loadingRevenue: "جارٍ تحميل بيانات الإيرادات...",
        errorFetching: "خطأ في جلب البيانات",
        errorFetchingRevenue: "تعذر تحميل بيانات الإيرادات.",
        errorFetchingLookups: (entity: string) => `تعذر تحميل ${entity} لتقرير الإيرادات.`,
        unknown: "غير معروف",
        na: "غير متوفر",
      },
    };
    return translations[language];
  }, [language]);


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
    }, (error) => { 
      console.error("Error fetching destinations map:", error);
      toast({ title: currentTranslations.errorFetching, description: currentTranslations.errorFetchingLookups("destinations"), variant: "destructive" });
      setLoadingDestinations(false); 
    });
    return () => unsubscribe();
  }, [toast, currentTranslations]);

  useEffect(() => {
    setLoadingHotels(true);
    const q = query(collection(db, "hotels"), orderBy("name"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const hMap: Record<string, string> = {};
      snapshot.forEach(doc => hMap[doc.id] = doc.data().name);
      setHotelsMap(hMap);
      setLoadingHotels(false);
    }, (error) => {
      console.error("Error fetching hotels map:", error);
      toast({ title: currentTranslations.errorFetching, description: currentTranslations.errorFetchingLookups("hotels"), variant: "destructive" });
      setLoadingHotels(false);
    });
    return () => unsubscribe();
  }, [toast, currentTranslations]);

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
    }, (error) => {
      console.error("Error fetching trip dates map:", error);
      toast({ title: currentTranslations.errorFetching, description: currentTranslations.errorFetchingLookups("trip dates"), variant: "destructive" });
      setLoadingTripDates(false);
    });
    return () => unsubscribe();
  }, [toast, currentTranslations]);

  useEffect(() => {
    if (loadingDestinations || loadingHotels || loadingTripDates) {
      return; 
    }
    setLoadingReservations(true);
    const q = query(collection(db, "reservations"), where("status", "==", "confirmed"), orderBy("reservationDate", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const revenueByTrip: Record<string, { total: number, count: number }> = {};
      snapshot.forEach(docSnap => {
        const res = docSnap.data() as InitialReservation;
        if (res.tripDateId && res.depositAmount && res.depositAmount > 0) {
          if (!revenueByTrip[res.tripDateId]) {
            revenueByTrip[res.tripDateId] = { total: 0, count: 0 };
          }
          revenueByTrip[res.tripDateId].total += res.depositAmount;
          revenueByTrip[res.tripDateId].count += 1;
        }
      });

      const formattedRevenueData: TripRevenueData[] = Object.entries(revenueByTrip).map(([tripId, data]) => {
        const tripInfo = tripDatesMap[tripId];
        const hotelName = tripInfo ? (hotelsMap[tripInfo.hotelId] || currentTranslations.unknown) : currentTranslations.unknown;
        const destName = tripInfo ? (destinationsMap[tripInfo.destinationId] || currentTranslations.unknown) : currentTranslations.unknown;
        let tripSummary = `${destName} - ${hotelName}`;
        if (tripInfo && tripInfo.startDate && tripInfo.endDate) {
          tripSummary += ` (${format(new Date(tripInfo.startDate), 'MMM d')} - ${format(new Date(tripInfo.endDate), 'MMM d, yy')})`;
        }
        return {
          tripDateId: tripId,
          tripSummary,
          totalRevenue: data.total,
          destinationName: destName,
          hotelName: hotelName,
          startDate: tripInfo?.startDate,
          endDate: tripInfo?.endDate,
        };
      }).sort((a, b) => (b.startDate && a.startDate) ? b.startDate.getTime() - a.startDate.getTime() : 0); 

      setTripRevenues(formattedRevenueData);
      setLoadingReservations(false);
    }, (error) => {
      console.error("Error fetching reservations for revenue:", error);
      toast({ title: currentTranslations.errorFetching, description: currentTranslations.errorFetchingRevenue, variant: "destructive" });
      setLoadingReservations(false);
    });
    return () => unsubscribe();
  }, [loadingDestinations, loadingHotels, loadingTripDates, destinationsMap, hotelsMap, tripDatesMap, toast, currentTranslations]);

  const overallTotalRevenue = useMemo(() => {
    return tripRevenues.reduce((sum, trip) => sum + trip.totalRevenue, 0);
  }, [tripRevenues]);

  if (overallLoading) {
    return (
      <div className="space-y-8" dir={direction}>
        <div className="flex justify-between items-center"> <Skeleton className="h-10 w-1/3" /> </div>
        <Card>
          <CardHeader><Skeleton className="h-8 w-1/4 mb-2" /><Skeleton className="h-6 w-1/2 mb-4" /></CardHeader>
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
            <DollarSign className={cn("h-8 w-8 text-primary", direction === 'rtl' ? 'ml-3' : 'mr-3')} /> 
            {currentTranslations.pageTitle}
          </h1>
          <p className="text-muted-foreground">{currentTranslations.pageDescription}</p>
        </div>
      </div>

      <Card className="shadow-lg border">
        <CardHeader>
          <CardTitle>{currentTranslations.cardTitle}</CardTitle>
          <CardDescription>{currentTranslations.cardDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          {tripRevenues.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{currentTranslations.tripHeader}</TableHead>
                  <TableHead className={cn("text-right", direction === 'rtl' && "text-left")}>{currentTranslations.revenueHeader}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tripRevenues.map((trip) => (
                  <TableRow key={trip.tripDateId}>
                    <TableCell>
                      <div className="font-medium text-primary">{trip.hotelName}</div>
                      <div className="text-sm text-muted-foreground">
                        <MapPin className="inline-block h-3.5 w-3.5 mr-1" />{trip.destinationName}
                      </div>
                      {trip.startDate && trip.endDate && (
                        <div className="text-xs text-muted-foreground">
                          <CalendarDays className="inline-block h-3.5 w-3.5 mr-1" />
                          {format(trip.startDate, 'PP')} - {format(trip.endDate, 'PP')}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className={cn("font-semibold text-lg", direction === 'rtl' ? "text-left" : "text-right")}>
                      {trip.totalRevenue.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow className="bg-muted/50 hover:bg-muted/60">
                  <TableCell className="font-bold text-lg">{currentTranslations.overallTotal}</TableCell>
                  <TableCell className={cn("font-bold text-lg text-primary", direction === 'rtl' ? "text-left" : "text-right")}>
                    {overallTotalRevenue.toFixed(2)}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          ) : (
            <div className="text-center py-10 text-muted-foreground">
              <Info className="mx-auto h-12 w-12 mb-4" />
              <p className="text-lg">
                {currentTranslations.noRevenueData}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminRevenuePage;
