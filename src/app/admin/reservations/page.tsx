
"use client";

import type { NextPage } from 'next';
import Link from 'next/link';
import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'; // Added Dialog components
import { MoreHorizontal, Search, Eye, Edit3, Trash2, FileText, CheckCircle, AlertCircle, XCircle, Clock, PlusCircle } from 'lucide-react';
import type { InitialReservation, TripDate, Hotel } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { db } from '@/lib/firebase';
import { collection, query, onSnapshot, orderBy, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { useLanguage } from '@/contexts/LanguageContext';
import AdminNewReservationForm from '@/components/forms/AdminNewReservationForm'; // Import the new form
import { useAuth } from '@/contexts/AuthContext';
import { USER_ROLES } from '@/lib/constants';


interface EnrichedReservation extends InitialReservation {
  hotelName?: string;
  tripDateInfo?: Pick<TripDate, 'startDate' | 'endDate' | 'hotelId'>; 
  tripSummary?: string; 
}

const AdminReservationsPage: NextPage = () => {
  const { toast } = useToast();
  const { language, direction } = useLanguage();
  const { user } = useAuth(); // Get user for role checks

  const [rawReservations, setRawReservations] = useState<InitialReservation[]>([]);
  const [hotelsMap, setHotelsMap] = useState<Record<string, string>>({});
  const [tripDatesMap, setTripDatesMap] = useState<Record<string, Pick<TripDate, 'startDate' | 'endDate' | 'hotelId'>>>({});
  const [searchTerm, setSearchTerm] = useState('');
  
  const [loadingReservations, setLoadingReservations] = useState(true);
  const [loadingHotels, setLoadingHotels] = useState(true);
  const [loadingTripDates, setLoadingTripDates] = useState(true);
  const [overallLoading, setOverallLoading] = useState(true);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false); // State for new reservation dialog

  const canManage = user?.role === USER_ROLES.ADMIN || user?.role === USER_ROLES.SUPER_ADMIN;
  const canAddReservations = user?.role === USER_ROLES.ADMIN ||
                             user?.role === USER_ROLES.SUPER_ADMIN ||
                             user?.role === USER_ROLES.SALES;

  const translations = {
    en: {
      pageTitle: "Reservation Management",
      pageDescription: "View and manage initial trip reservations.",
      addNewReservation: "Add New Reservation",
      addNewReservationDialogTitle: "Create New Reservation",
      cardTitle: "Reservation List",
      cardDescription: "All guest reservations recorded in the system.",
      searchPlaceholder: "Search by guest, trip, status, price, or admin...",
      guestHeader: "Guest",
      tripHeader: "Trip",
      totalHeader: "Est. Total",
      statusHeader: "Status",
      contactedByHeader: "Contacted By",
      confirmedByHeader: "Confirmed By",
      reservationDateHeader: "Reservation Date",
      actionsHeader: "Actions",
      openMenuSr: "Open menu",
      actionsLabel: "Actions",
      viewDetails: "View Details",
      updateStatus: "Update Status",
      deleteReservation: "Delete",
      noReservationsFound: "No reservations found",
      matchingCriteria: " matching your criteria",
      addOne: ". Be the first to add one!",
      confirmDeleteTitle: "Confirm Deletion",
      confirmDeleteMessage: "Are you sure you want to delete this reservation? This action cannot be undone.",
      reservationDeletedTitle: "Reservation Deleted",
      reservationDeletedDesc: (id: string) => `Reservation ID ${id} has been successfully removed.`,
      errorDeletingReservationTitle: "Error Deleting Reservation",
      errorDeletingReservationDesc: "Could not delete the reservation. Please try again.",
      errorFetchingHotels: "Could not load hotel names.",
      errorFetchingTripDates: "Could not load trip date details.",
      errorFetchingReservations: "Could not load reservations.",
      statusPending: "Pending",
      statusContacted: "Contacted",
      statusConfirmed: "Confirmed",
      statusCancelled: "Cancelled",
      notAvailable: "N/A",
    },
    ar: {
      pageTitle: "إدارة الحجوزات",
      pageDescription: "عرض وإدارة الحجوزات الأولية للرحلات.",
      addNewReservation: "إضافة حجز جديد",
      addNewReservationDialogTitle: "إنشاء حجز جديد",
      cardTitle: "قائمة الحجوزات",
      cardDescription: "جميع حجوزات الضيوف المسجلة في النظام.",
      searchPlaceholder: "ابحث بالضيف، الرحلة، الحالة، السعر، أو المسؤول...",
      guestHeader: "الضيف",
      tripHeader: "الرحلة",
      totalHeader: "الإجمالي المقدر",
      statusHeader: "الحالة",
      contactedByHeader: "تم الاتصال بواسطة",
      confirmedByHeader: "تم التأكيد بواسطة",
      reservationDateHeader: "تاريخ الحجز",
      actionsHeader: "الإجراءات",
      openMenuSr: "فتح القائمة",
      actionsLabel: "الإجراءات",
      viewDetails: "عرض التفاصيل",
      updateStatus: "تحديث الحالة",
      deleteReservation: "حذف",
      noReservationsFound: "لم يتم العثور على حجوزات",
      matchingCriteria: " تطابق معايير البحث الخاصة بك",
      addOne: ". كن أول من يضيف واحدًا!",
      confirmDeleteTitle: "تأكيد الحذف",
      confirmDeleteMessage: "هل أنت متأكد أنك تريد حذف هذا الحجز؟ لا يمكن التراجع عن هذا الإجراء.",
      reservationDeletedTitle: "تم حذف الحجز",
      reservationDeletedDesc: (id: string) => `تمت إزالة معرف الحجز ${id} بنجاح.`,
      errorDeletingReservationTitle: "خطأ في حذف الحجز",
      errorDeletingReservationDesc: "تعذر حذف الحجز. يرجى المحاولة مرة أخرى.",
      errorFetchingHotels: "تعذر تحميل أسماء الفنادق.",
      errorFetchingTripDates: "تعذر تحميل تفاصيل تواريخ الرحلات.",
      errorFetchingReservations: "تعذر تحميل الحجوزات.",
      statusPending: "معلق",
      statusContacted: "تم الاتصال",
      statusConfirmed: "مؤكد",
      statusCancelled: "ملغى",
      notAvailable: "غير متوفر",
    },
  };
  const currentTranslations = translations[language];

  useEffect(() => {
    setOverallLoading(loadingReservations || loadingHotels || loadingTripDates);
  }, [loadingReservations, loadingHotels, loadingTripDates]);

  useEffect(() => {
    setLoadingHotels(true);
    const q = query(collection(db, "hotels"), orderBy("name"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const hMap: Record<string, string> = {};
      snapshot.forEach(doc => hMap[doc.id] = doc.data().name);
      setHotelsMap(hMap);
      setLoadingHotels(false);
    }, (error) => {
      console.error("Error fetching hotels for map: ", error);
      toast({ title: currentTranslations.errorFetchingHotels, variant: "destructive" });
      setLoadingHotels(false);
    });
    return () => unsubscribe();
  }, [toast, language, currentTranslations.errorFetchingHotels]);

  useEffect(() => {
    setLoadingTripDates(true);
    const q = query(collection(db, "tripDates"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tdMap: Record<string, Pick<TripDate, 'startDate' | 'endDate' | 'hotelId'>> = {};
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        tdMap[docSnap.id] = {
          startDate: data.startDate instanceof Timestamp ? data.startDate.toDate() : new Date(data.startDate),
          endDate: data.endDate instanceof Timestamp ? data.endDate.toDate() : new Date(data.endDate),
          hotelId: data.hotelId,
        };
      });
      setTripDatesMap(tdMap);
      setLoadingTripDates(false);
    }, (error) => {
      console.error("Error fetching trip dates for map: ", error);
      toast({ title: currentTranslations.errorFetchingTripDates, variant: "destructive" });
      setLoadingTripDates(false);
    });
    return () => unsubscribe();
  }, [toast, language, currentTranslations.errorFetchingTripDates]);

  useEffect(() => {
    setLoadingReservations(true);
    const q = query(collection(db, "reservations"), orderBy("reservationDate", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedReservations: InitialReservation[] = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          reservationDate: data.reservationDate instanceof Timestamp ? data.reservationDate.toDate() : (data.reservationDate ? new Date(data.reservationDate) : new Date(0)), // Fallback to epoch for safety
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt) : undefined),
          updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : (data.updatedAt ? new Date(data.updatedAt) : undefined),
          contactedAt: data.contactedAt instanceof Timestamp ? data.contactedAt.toDate() : (data.contactedAt ? new Date(data.contactedAt) : undefined),
          confirmedAt: data.confirmedAt instanceof Timestamp ? data.confirmedAt.toDate() : (data.confirmedAt ? new Date(data.confirmedAt) : undefined),
        } as InitialReservation;
      });
      setRawReservations(fetchedReservations);
      setLoadingReservations(false);
    }, (error) => {
      console.error("Error fetching reservations: ", error);
      toast({ title: currentTranslations.errorFetchingReservations, variant: "destructive" });
      setLoadingReservations(false);
    });
    return () => unsubscribe();
  }, [toast, language, currentTranslations.errorFetchingReservations]);

  const enrichedReservations = useMemo((): EnrichedReservation[] => {
    return rawReservations.map(res => {
      const hotelName = hotelsMap[res.hotelId] || currentTranslations.notAvailable;
      const tripDateInfo = tripDatesMap[res.tripDateId];
      let tripSummary = hotelName;
      if (tripDateInfo && tripDateInfo.startDate && tripDateInfo.endDate) {
        tripSummary += ` (${format(new Date(tripDateInfo.startDate), 'MMM d')} - ${format(new Date(tripDateInfo.endDate), 'MMM d, yy')})`;
      } else {
        tripSummary += language === 'ar' ? ' (تفاصيل الرحلة غير متوفرة)' : ' (Trip details unavailable)';
      }

      return {
        ...res,
        hotelName,
        tripDateInfo,
        tripSummary,
      };
    });
  }, [rawReservations, hotelsMap, tripDatesMap, language, currentTranslations.notAvailable]);


  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value.toLowerCase());
  };

  const filteredReservations = useMemo(() => {
    return enrichedReservations.filter(res =>
      res.guestName.toLowerCase().includes(searchTerm) ||
      (res.guestEmail && res.guestEmail.toLowerCase().includes(searchTerm)) ||
      getStatusText(res.status).toLowerCase().includes(searchTerm) ||
      res.tripSummary?.toLowerCase().includes(searchTerm) ||
      (res.totalCalculatedPrice?.toString().includes(searchTerm)) ||
      (res.contactedByName && res.contactedByName.toLowerCase().includes(searchTerm)) ||
      (res.confirmedByName && res.confirmedByName.toLowerCase().includes(searchTerm))
    );
  }, [enrichedReservations, searchTerm, language, currentTranslations]);
  
  const getStatusText = (status: InitialReservation['status']) => {
    switch (status) {
      case 'pending': return currentTranslations.statusPending;
      case 'contacted': return currentTranslations.statusContacted;
      case 'confirmed': return currentTranslations.statusConfirmed;
      case 'cancelled': return currentTranslations.statusCancelled;
      default: return status;
    }
  };

  const getStatusStyles = (status: InitialReservation['status']) => {
    switch (status) {
      case 'pending': return { icon: <Clock className="h-4 w-4 mr-2 text-amber-600" />, classes: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200" };
      case 'confirmed': return { icon: <CheckCircle className="h-4 w-4 mr-2 text-green-600" />, classes: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" };
      case 'contacted': return { icon: <AlertCircle className="h-4 w-4 mr-2 text-blue-600" />, classes: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" };
      case 'cancelled': return { icon: <XCircle className="h-4 w-4 mr-2 text-red-600" />, classes: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" };
      default: return { icon: <FileText className="h-4 w-4 mr-2 text-muted-foreground" />, classes: "bg-muted text-muted-foreground" };
    }
  };

  const handleDeleteReservation = async (reservationId: string) => {
    if (confirm(currentTranslations.confirmDeleteMessage)) {
      try {
        await deleteDoc(doc(db, "reservations", reservationId));
        toast({
          title: currentTranslations.reservationDeletedTitle,
          description: currentTranslations.reservationDeletedDesc(reservationId),
        });
      } catch (error) {
        console.error("Error deleting reservation:", error);
        toast({
          title: currentTranslations.errorDeletingReservationTitle,
          description: currentTranslations.errorDeletingReservationDesc,
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
            <FileText className={cn("h-8 w-8 text-primary", direction === 'rtl' ? 'ml-3' : 'mr-3')} /> {currentTranslations.pageTitle}
          </h1>
          <p className="text-muted-foreground">{currentTranslations.pageDescription}</p>
        </div>
        {canAddReservations && (
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                    <Button>
                        <PlusCircle className={cn("h-4 w-4", direction === 'rtl' ? 'ml-2' : 'mr-2')} />
                        {currentTranslations.addNewReservation}
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg" dir={direction}>
                    <AdminNewReservationForm 
                        onFormSubmitSuccess={() => setIsAddDialogOpen(false)} 
                    />
                </DialogContent>
            </Dialog>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{currentTranslations.cardTitle}</CardTitle>
          <CardDescription>{currentTranslations.cardDescription}</CardDescription>
          <div className="pt-4">
            <div className="relative">
              <Search className={cn("absolute top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground", direction === 'rtl' ? 'right-3' : 'left-3')} />
              <Input
                placeholder={currentTranslations.searchPlaceholder}
                value={searchTerm}
                onChange={handleSearch}
                className={cn("max-w-lg", direction === 'rtl' ? 'pr-10' : 'pl-10')}
                dir={direction}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{currentTranslations.guestHeader}</TableHead>
                <TableHead className="hidden md:table-cell">{currentTranslations.tripHeader}</TableHead>
                <TableHead>{currentTranslations.totalHeader}</TableHead>
                <TableHead>{currentTranslations.statusHeader}</TableHead>
                <TableHead className="hidden lg:table-cell">{currentTranslations.contactedByHeader}</TableHead>
                <TableHead className="hidden lg:table-cell">{currentTranslations.confirmedByHeader}</TableHead>
                <TableHead className="hidden xl:table-cell">{currentTranslations.reservationDateHeader}</TableHead>
                <TableHead className={cn("w-[100px]", direction === 'rtl' ? 'text-left' : 'text-right')}>{currentTranslations.actionsHeader}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReservations.length > 0 ? (
                filteredReservations.map((res) => {
                  const { icon: StatusIcon, classes: statusClasses } = getStatusStyles(res.status);
                  return (
                    <TableRow key={res.id}>
                      <TableCell>
                        <div className="font-medium">{res.guestName}</div>
                        <div className="text-xs text-muted-foreground">{res.guestEmail || res.guestPhone}</div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm">{res.tripSummary || currentTranslations.notAvailable}</TableCell>
                      <TableCell className="text-sm font-semibold">
                        {res.totalCalculatedPrice !== undefined ? `${language === 'ar' ? 'ج.م ' : 'EGP '}${res.totalCalculatedPrice.toFixed(2)}` : currentTranslations.notAvailable}
                      </TableCell>
                      <TableCell>
                        <span className={cn("px-2 py-1 text-xs font-semibold rounded-full inline-flex items-center", statusClasses)}>
                          {StatusIcon}
                          {getStatusText(res.status)}
                        </span>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-xs">
                        {res.contactedByName || currentTranslations.notAvailable}
                        {res.contactedAt && <div className="text-muted-foreground">{format(new Date(res.contactedAt as Date), 'P')}</div>}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-xs">
                        {res.confirmedByName || currentTranslations.notAvailable}
                        {res.confirmedAt && <div className="text-muted-foreground">{format(new Date(res.confirmedAt as Date), 'P')}</div>}
                      </TableCell>
                      <TableCell className="hidden xl:table-cell text-sm">{res.reservationDate ? format(new Date(res.reservationDate), 'PPp') : currentTranslations.notAvailable}</TableCell>
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
                              <Link href={`/admin/reservations/view/${res.id}`}>
                                <Eye className={cn("h-4 w-4", direction === 'rtl' ? 'ml-2' : 'mr-2')} /> {currentTranslations.viewDetails}
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/admin/reservations/edit/${res.id}`}>
                                <Edit3 className={cn("h-4 w-4", direction === 'rtl' ? 'ml-2' : 'mr-2')} /> {currentTranslations.updateStatus}
                              </Link>
                            </DropdownMenuItem>
                            {canManage && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleDeleteReservation(res.id)}
                                  className="text-destructive focus:text-destructive-foreground focus:bg-destructive"
                                >
                                  <Trash2 className={cn("h-4 w-4", direction === 'rtl' ? 'ml-2' : 'mr-2')} /> {currentTranslations.deleteReservation}
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">
                    {currentTranslations.noReservationsFound}{searchTerm ? currentTranslations.matchingCriteria : (rawReservations.length === 0 && !overallLoading ? currentTranslations.addOne : "")}.
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

export default AdminReservationsPage;

