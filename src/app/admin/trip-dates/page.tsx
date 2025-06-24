
"use client";

import type { NextPage } from 'next';
import Link from 'next/link';
import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MoreHorizontal, PlusCircle, Search, Edit2, Trash2, Eye, CalendarDays, Clock } from 'lucide-react';
import type { TripDate, Destination, Hotel } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { format, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { db } from '@/lib/firebase';
import { collection, query, onSnapshot, orderBy, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { USER_ROLES } from '@/lib/constants';
import { useLanguage } from '@/contexts/LanguageContext'; // Import useLanguage

interface EnrichedTripDate extends TripDate {
  destinationName?: string;
  hotelName?: string;
  durationNights?: number;
  durationDays?: number;
}

const AdminTripDatesPage: NextPage = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { language, direction } = useLanguage(); // Use language context
  const [tripDates, setTripDates] = useState<EnrichedTripDate[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [overallLoading, setOverallLoading] = useState(true);
  const [loadingTripDatesData, setLoadingTripDatesData] = useState(true);
  const [loadingDestinationsData, setLoadingDestinationsData] = useState(true);
  const [loadingHotelsData, setLoadingHotelsData] = useState(true);

  const [destinationsMap, setDestinationsMap] = useState<Record<string, string>>({});
  const [hotelsMap, setHotelsMap] = useState<Record<string, string>>({});

  const canManage = user?.role === USER_ROLES.ADMIN || user?.role === USER_ROLES.SUPER_ADMIN;

  const translations = {
    en: {
      pageTitle: "Trip Date Management",
      pageDescription: "Manage available trip dates, assign hotels, and track availability.",
      addNewTripDate: "Add New Trip Date",
      tripDateListTitle: "Trip Date List",
      tripDateListDescription: "All scheduled trip dates in the system.",
      searchPlaceholder: "Search by destination, hotel, date, or status...",
      destinationHeader: "Destination",
      hotelHeader: "Hotel",
      startDateHeader: "Start Date",
      endDateHeader: "End Date",
      durationHeader: "Duration",
      nightsSuffix: "Nights",
      daysSuffix: "Days",
      statusHeader: "Status",
      actionsHeader: "Actions",
      noTripDatesFound: "No trip dates found",
      matchingCriteria: " matching your criteria",
      addOne: ". Add one!",
      openMenuSr: "Open menu",
      actionsLabel: "Actions",
      viewDetails: "View Details",
      editTripDate: "Edit Trip Date",
      deleteTripDate: "Delete Trip Date",
      confirmDeleteTitle: "Confirm Deletion",
      confirmDeleteMessage: "Are you sure you want to delete this trip date? This action cannot be undone.",
      tripDateDeletedTitle: "Trip Date Deleted",
      tripDateDeletedDesc: (id: string) => `Trip Date ID ${id} has been successfully removed.`,
      errorDeletingTripDateTitle: "Error Deleting Trip Date",
      errorDeletingTripDateDesc: (errorMsg: string) => errorMsg || "Could not delete the trip date.",
      permissionDeniedTitle: "Permission Denied",
      permissionDeniedDesc: "You do not have permission to delete trip dates.",
      errorFetchingDestinations: "Could not load destination names.",
      errorFetchingHotels: "Could not load hotel names.",
      errorFetchingTripDates: "Could not load trip dates.",
      statusActive: "Active",
      statusFull: "Full",
      statusCancelled: "Cancelled",
      notAvailable: "N/A",
    },
    ar: {
      pageTitle: "إدارة تواريخ الرحلات",
      pageDescription: "إدارة تواريخ الرحلات المتاحة وتعيين الفنادق وتتبع التوفر.",
      addNewTripDate: "إضافة تاريخ رحلة جديد",
      tripDateListTitle: "قائمة تواريخ الرحلات",
      tripDateListDescription: "جميع تواريخ الرحلات المجدولة في النظام.",
      searchPlaceholder: "ابحث بالوجهة أو الفندق أو التاريخ أو الحالة...",
      destinationHeader: "الوجهة",
      hotelHeader: "الفندق",
      startDateHeader: "تاريخ البدء",
      endDateHeader: "تاريخ الانتهاء",
      durationHeader: "المدة",
      nightsSuffix: "ليالٍ",
      daysSuffix: "أيام",
      statusHeader: "الحالة",
      actionsHeader: "الإجراءات",
      noTripDatesFound: "لم يتم العثور على تواريخ رحلات",
      matchingCriteria: " تطابق معايير البحث الخاصة بك",
      addOne: ". أضف واحد!",
      openMenuSr: "فتح القائمة",
      actionsLabel: "الإجراءات",
      viewDetails: "عرض التفاصيل",
      editTripDate: "تعديل تاريخ الرحلة",
      deleteTripDate: "حذف تاريخ الرحلة",
      confirmDeleteTitle: "تأكيد الحذف",
      confirmDeleteMessage: "هل أنت متأكد أنك تريد حذف تاريخ الرحلة هذا؟ لا يمكن التراجع عن هذا الإجراء.",
      tripDateDeletedTitle: "تم حذف تاريخ الرحلة",
      tripDateDeletedDesc: (id: string) => `تمت إزالة معرف تاريخ الرحلة ${id} بنجاح.`,
      errorDeletingTripDateTitle: "خطأ في حذف تاريخ الرحلة",
      errorDeletingTripDateDesc: (errorMsg: string) => errorMsg || "تعذر حذف تاريخ الرحلة.",
      permissionDeniedTitle: "تم رفض الإذن",
      permissionDeniedDesc: "ليس لديك إذن بحذف تواريخ الرحلات.",
      errorFetchingDestinations: "تعذر تحميل أسماء الوجهات.",
      errorFetchingHotels: "تعذر تحميل أسماء الفنادق.",
      errorFetchingTripDates: "تعذر تحميل تواريخ الرحلات.",
      statusActive: "نشط",
      statusFull: "ممتلئ",
      statusCancelled: "ملغى",
      notAvailable: "غير متوفر",
    }
  };
  const currentTranslations = translations[language];

  const getStatusText = (status: 'active' | 'full' | 'cancelled') => {
    switch (status) {
      case 'active': return currentTranslations.statusActive;
      case 'full': return currentTranslations.statusFull;
      case 'cancelled': return currentTranslations.statusCancelled;
      default: return status;
    }
  };

  useEffect(() => {
    if (!loadingTripDatesData && !loadingDestinationsData && !loadingHotelsData) {
      setOverallLoading(false);
    } else {
      setOverallLoading(true);
    }
  }, [loadingTripDatesData, loadingDestinationsData, loadingHotelsData]);

  useEffect(() => {
    setLoadingDestinationsData(true);
    const destQuery = query(collection(db, "destinations"), orderBy("name", "asc"));
    const unsubscribe = onSnapshot(destQuery, (snapshot) => {
      const dMap: Record<string, string> = {};
      snapshot.forEach((doc) => {
        dMap[doc.id] = doc.data().name;
      });
      setDestinationsMap(dMap);
      setLoadingDestinationsData(false);
    }, (error) => {
      console.error("Error fetching destinations: ", error);
      toast({ title: "Error", description: currentTranslations.errorFetchingDestinations, variant: "destructive" });
      setLoadingDestinationsData(false);
    });
    return () => unsubscribe();
  }, [toast, language, currentTranslations.errorFetchingDestinations]);

  useEffect(() => {
    setLoadingHotelsData(true);
    const hotelQuery = query(collection(db, "hotels"), orderBy("name", "asc"));
    const unsubscribe = onSnapshot(hotelQuery, (snapshot) => {
      const hMap: Record<string, string> = {};
      snapshot.forEach((doc) => {
        hMap[doc.id] = doc.data().name;
      });
      setHotelsMap(hMap);
      setLoadingHotelsData(false);
    }, (error) => {
      console.error("Error fetching hotels: ", error);
      toast({ title: "Error", description: currentTranslations.errorFetchingHotels, variant: "destructive" });
      setLoadingHotelsData(false);
    });
    return () => unsubscribe();
  }, [toast, language, currentTranslations.errorFetchingHotels]);

  useEffect(() => {
    if (loadingDestinationsData || loadingHotelsData) {
        return;
    }

    setLoadingTripDatesData(true);
    const tripDatesQuery = query(collection(db, "tripDates"), orderBy("startDate", "desc"));
    const unsubscribe = onSnapshot(tripDatesQuery, (snapshot) => {
      const fetchedTripDates: EnrichedTripDate[] = snapshot.docs.map((tripDoc) => {
        const data = tripDoc.data();
        
        const startDate = data.startDate instanceof Timestamp ? data.startDate.toDate() : data.startDate;
        const endDate = data.endDate instanceof Timestamp ? data.endDate.toDate() : data.endDate;
        const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toDate() : data.createdAt;
        const updatedAt = data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : data.updatedAt;
        
        let durationNights: number | undefined;
        let durationDays: number | undefined;

        if (startDate && endDate && endDate > startDate) {
            durationNights = differenceInDays(endDate, startDate);
            durationDays = durationNights + 1;
        }

        return {
          id: tripDoc.id,
          ...data,
          startDate,
          endDate,
          createdAt,
          updatedAt,
          destinationName: destinationsMap[data.destinationId] || data.destinationId,
          hotelName: hotelsMap[data.hotelId] || data.hotelId,
          durationNights,
          durationDays,
        } as EnrichedTripDate;
      });
      setTripDates(fetchedTripDates);
      setLoadingTripDatesData(false);
    }, (error) => {
      console.error("Error fetching trip dates: ", error);
      toast({ title: currentTranslations.errorFetchingTripDates, description: currentTranslations.errorFetchingTripDates, variant: "destructive" });
      setLoadingTripDatesData(false);
    });

    return () => unsubscribe();
  }, [toast, destinationsMap, hotelsMap, loadingDestinationsData, loadingHotelsData, language, currentTranslations.errorFetchingTripDates]);

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value.toLowerCase());
  };

  const filteredTripDates = useMemo(() => {
    return tripDates
      .map(td => ({ 
        ...td,
        destinationName: destinationsMap[td.destinationId] || td.destinationId,
        hotelName: hotelsMap[td.hotelId] || td.hotelId,
      }))
      .filter(td =>
        td.destinationName?.toLowerCase().includes(searchTerm) ||
        td.hotelName?.toLowerCase().includes(searchTerm) ||
        getStatusText(td.status).toLowerCase().includes(searchTerm) ||
        (td.startDate && format(new Date(td.startDate as Date), 'PP').toLowerCase().includes(searchTerm)) ||
        (td.endDate && format(new Date(td.endDate as Date), 'PP').toLowerCase().includes(searchTerm))
      );
  }, [tripDates, searchTerm, destinationsMap, hotelsMap, currentTranslations.statusActive, currentTranslations.statusCancelled, currentTranslations.statusFull]); // Removed getStatusText from deps

  const handleDeleteTripDate = async (tripDateId: string) => {
    if (!canManage) {
        toast({ title: currentTranslations.permissionDeniedTitle, description: currentTranslations.permissionDeniedDesc, variant: "destructive"});
        return;
    }
    if (confirm(currentTranslations.confirmDeleteMessage)) {
      try {
        await deleteDoc(doc(db, "tripDates", tripDateId));
        toast({
          title: currentTranslations.tripDateDeletedTitle,
          description: currentTranslations.tripDateDeletedDesc(tripDateId),
        });
      } catch (error) {
        console.error("Error deleting trip date:", error);
        toast({
          title: currentTranslations.errorDeletingTripDateTitle,
          description: currentTranslations.errorDeletingTripDateDesc((error as Error).message),
          variant: "destructive",
        });
      }
    }
  };

  if (overallLoading) {
    return (
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-1/3" />
          {canManage && <Skeleton className="h-10 w-40" />}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-1/4 mb-2" />
            <Skeleton className="h-6 w-1/2 mb-4" />
            <Skeleton className="h-10 w-1/3" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                ))}
             </div>
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
            <CalendarDays className={cn("h-8 w-8 text-primary", direction === 'rtl' ? 'ml-3' : 'mr-3')} /> {currentTranslations.pageTitle}
          </h1>
          <p className="text-muted-foreground">{currentTranslations.pageDescription}</p>
        </div>
        {canManage && (
          <Button asChild>
            <Link href="/admin/trip-dates/new">
              <PlusCircle className={cn("h-4 w-4", direction === 'rtl' ? 'ml-2' : 'mr-2')} /> {currentTranslations.addNewTripDate}
            </Link>
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{currentTranslations.tripDateListTitle}</CardTitle>
          <CardDescription>{currentTranslations.tripDateListDescription}</CardDescription>
          <div className="pt-4">
            <div className="relative">
              <Search className={cn("absolute top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground", direction === 'rtl' ? 'right-3' : 'left-3')} />
              <Input
                placeholder={currentTranslations.searchPlaceholder}
                value={searchTerm}
                onChange={handleSearch}
                className={cn("max-w-lg", direction === 'rtl' ? 'pr-10' : 'pl-10')}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{currentTranslations.destinationHeader}</TableHead>
                <TableHead>{currentTranslations.hotelHeader}</TableHead>
                <TableHead className="hidden md:table-cell">{currentTranslations.startDateHeader}</TableHead>
                <TableHead className="hidden md:table-cell">{currentTranslations.endDateHeader}</TableHead>
                <TableHead className="hidden lg:table-cell">{currentTranslations.durationHeader}</TableHead>
                <TableHead>{currentTranslations.statusHeader}</TableHead>
                <TableHead className={cn("w-[100px]", direction === 'rtl' ? 'text-left' : 'text-right')}>{currentTranslations.actionsHeader}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTripDates.length > 0 ? (
                filteredTripDates.map((td) => (
                  <TableRow key={td.id}>
                    <TableCell className="font-medium">{td.destinationName || currentTranslations.notAvailable}</TableCell>
                    <TableCell>{td.hotelName || currentTranslations.notAvailable}</TableCell>
                    <TableCell className="hidden md:table-cell">{td.startDate ? format(new Date(td.startDate as Date), 'PP') : currentTranslations.notAvailable}</TableCell>
                    <TableCell className="hidden md:table-cell">{td.endDate ? format(new Date(td.endDate as Date), 'PP') : currentTranslations.notAvailable}</TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {td.durationNights !== undefined && td.durationDays !== undefined ? (
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Clock className="h-4 w-4 mr-1.5 flex-shrink-0" />
                          {td.durationNights} {currentTranslations.nightsSuffix} / {td.durationDays} {currentTranslations.daysSuffix}
                        </div>
                      ) : currentTranslations.notAvailable}
                    </TableCell>
                    <TableCell>
                        <span className={cn(
                            "px-2 py-1 text-xs font-semibold rounded-full inline-block",
                            td.status === 'active' && "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
                            td.status === 'full' && "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
                            td.status === 'cancelled' && "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                        )}>
                            {getStatusText(td.status)}
                        </span>
                    </TableCell>
                    <TableCell className={cn(direction === 'rtl' ? 'text-left' : 'text-right')}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">{currentTranslations.openMenuSr}</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align={direction === 'rtl' ? 'start' : 'end'}>
                          <DropdownMenuLabel>{currentTranslations.actionsLabel}</DropdownMenuLabel>
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/trip-dates/view/${td.id}`}>
                              <Eye className={cn("h-4 w-4", direction === 'rtl' ? 'ml-2' : 'mr-2')} /> {currentTranslations.viewDetails}
                            </Link>
                          </DropdownMenuItem>
                          {canManage && (
                            <>
                              <DropdownMenuItem asChild>
                                <Link href={`/admin/trip-dates/edit/${td.id}`}>
                                  <Edit2 className={cn("h-4 w-4", direction === 'rtl' ? 'ml-2' : 'mr-2')} /> {currentTranslations.editTripDate}
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDeleteTripDate(td.id)}
                                className="text-destructive focus:text-destructive-foreground focus:bg-destructive"
                              >
                                <Trash2 className={cn("h-4 w-4", direction === 'rtl' ? 'ml-2' : 'mr-2')} /> {currentTranslations.deleteTripDate}
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    {currentTranslations.noTripDatesFound}{searchTerm ? currentTranslations.matchingCriteria : (canManage ? currentTranslations.addOne : "")}.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminTripDatesPage;

