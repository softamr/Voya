
"use client";

import type { NextPage } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MoreHorizontal, PlusCircle, Search, Edit2, Trash2, Eye, Hotel as HotelIcon } from 'lucide-react';
import type { Hotel } from '@/lib/types'; 
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { db } from '@/lib/firebase';
import { collection, query, onSnapshot, orderBy, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { USER_ROLES } from '@/lib/constants';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

const AdminHotelsPage: NextPage = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [hotels, setHotels] = useState<Hotel[]>([]); 
  const [destinationsMap, setDestinationsMap] = useState<Record<string, string>>({}); 
  const [searchTerm, setSearchTerm] = useState('');
  
  const [overallLoading, setOverallLoading] = useState(true); 
  const [hotelsLoading, setHotelsLoading] = useState(true);
  const [destinationsLoading, setDestinationsLoading] = useState(true);

  const { language, direction } = useLanguage();

  const canManage = user?.role === USER_ROLES.ADMIN || user?.role === USER_ROLES.SUPER_ADMIN;

  const translations = {
    en: {
      pageTitle: "Hotel Management",
      pageDescription: "Manage hotel listings, details, and availability.",
      addNewHotel: "Add New Hotel",
      hotelListTitle: "Hotel List",
      hotelListDescription: "A list of all hotels available in the system.",
      searchPlaceholder: "Search hotels by name, address, or destination...",
      imageHeader: "Image",
      nameHeader: "Name",
      addressHeader: "Address",
      destinationHeader: "Destination",
      createdAtHeader: "Created At",
      actionsHeader: "Actions",
      noImage: "No Image",
      openMenuSr: "Open menu",
      actionsLabel: "Actions",
      viewDetails: "View Details",
      editHotel: "Edit Hotel",
      deleteHotel: "Delete Hotel",
      noHotelsFound: "No hotels found",
      matchingCriteria: " matching your criteria",
      addOne: ". Add one!",
      notAvailable: "N/A",
      confirmDeleteTitle: "Confirm Deletion",
      confirmDeleteMessage: (hotelName?: string) => `Are you sure you want to delete the hotel "${hotelName || 'this hotel'}"? This action cannot be undone.`,
      hotelDeletedTitle: "Hotel Deleted",
      hotelDeletedDesc: (hotelName?: string) => `Hotel "${hotelName || 'The hotel'}" has been successfully deleted.`,
      errorDeletingHotelTitle: "Error Deleting Hotel",
      errorDeletingHotelDesc: (errorMsg: string) => errorMsg || "Could not delete the hotel.",
      permissionDeniedTitle: "Permission Denied",
      permissionDeniedDesc: "You do not have permission to delete hotels.",
      errorFetchingHotelsTitle: "Error Fetching Hotels",
      errorFetchingHotelsDesc: "Could not load hotels.",
      errorLoadingDestNames: "Could not load destination names.",
    },
    ar: {
      pageTitle: "إدارة الفنادق",
      pageDescription: "إدارة قوائم الفنادق والتفاصيل والتوفر.",
      addNewHotel: "إضافة فندق جديد",
      hotelListTitle: "قائمة الفنادق",
      hotelListDescription: "قائمة بجميع الفنادق المتوفرة في النظام.",
      searchPlaceholder: "ابحث عن الفنادق بالاسم أو العنوان أو الوجهة...",
      imageHeader: "الصورة",
      nameHeader: "الاسم",
      addressHeader: "العنوان",
      destinationHeader: "الوجهة",
      createdAtHeader: "تاريخ الإنشاء",
      actionsHeader: "الإجراءات",
      noImage: "لا توجد صورة",
      openMenuSr: "فتح القائمة",
      actionsLabel: "الإجراءات",
      viewDetails: "عرض التفاصيل",
      editHotel: "تعديل الفندق",
      deleteHotel: "حذف الفندق",
      noHotelsFound: "لم يتم العثور على فنادق",
      matchingCriteria: " تطابق معايير البحث الخاصة بك",
      addOne: ". أضف واحد!",
      notAvailable: "غير متوفر",
      confirmDeleteTitle: "تأكيد الحذف",
      confirmDeleteMessage: (hotelName?: string) => `هل أنت متأكد أنك تريد حذف الفندق "${hotelName || 'هذا الفندق'}"؟ لا يمكن التراجع عن هذا الإجراء.`,
      hotelDeletedTitle: "تم حذف الفندق",
      hotelDeletedDesc: (hotelName?: string) => `تم حذف الفندق "${hotelName || 'الفندق'}" بنجاح.`,
      errorDeletingHotelTitle: "خطأ في حذف الفندق",
      errorDeletingHotelDesc: (errorMsg: string) => errorMsg || "تعذر حذف الفندق.",
      permissionDeniedTitle: "تم رفض الإذن",
      permissionDeniedDesc: "ليس لديك إذن بحذف الفنادق.",
      errorFetchingHotelsTitle: "خطأ في جلب الفنادق",
      errorFetchingHotelsDesc: "تعذر تحميل الفنادق.",
      errorLoadingDestNames: "تعذر تحميل أسماء الوجهات.",
    }
  };
  const currentTranslations = translations[language];


  useEffect(() => {
    setDestinationsLoading(true);
    const destQuery = query(collection(db, "destinations"), orderBy("name", "asc"));
    const unsubscribeDestinations = onSnapshot(destQuery, (snapshot) => {
      const destMap: Record<string, string> = {};
      snapshot.forEach((doc) => {
        destMap[doc.id] = doc.data().name;
      });
      setDestinationsMap(destMap);
      setDestinationsLoading(false);
    }, (error) => {
      console.error("Error fetching destinations: ", error);
      toast({ title: "Error", description: currentTranslations.errorLoadingDestNames, variant: "destructive" });
      setDestinationsLoading(false);
    });

    return () => unsubscribeDestinations();
  }, [toast, language, currentTranslations.errorLoadingDestNames]);

  useEffect(() => {
    setHotelsLoading(true);
    const hotelsQuery = query(collection(db, "hotels"), orderBy("name", "asc"));
    const unsubscribeHotels = onSnapshot(hotelsQuery, (snapshot) => {
      const fetchedHotels: Hotel[] = snapshot.docs.map((hotelDoc) => {
        const data = hotelDoc.data();
        const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toDate() : data.createdAt;
        const updatedAt = data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : data.updatedAt;
        
        return {
          id: hotelDoc.id,
          ...data,
          createdAt,
          updatedAt,
          imageUrls: data.imageUrls || [], // Ensure imageUrls is an array
        } as Hotel;
      });
      setHotels(fetchedHotels);
      setHotelsLoading(false);
    }, (error) => {
      console.error("Error fetching hotels: ", error);
      toast({ title: currentTranslations.errorFetchingHotelsTitle, description: currentTranslations.errorFetchingHotelsDesc, variant: "destructive" });
      setHotelsLoading(false);
    });

    return () => unsubscribeHotels();
  }, [toast, language, currentTranslations.errorFetchingHotelsDesc, currentTranslations.errorFetchingHotelsTitle]);

  useEffect(() => {
    if (hotelsLoading || destinationsLoading) {
      setOverallLoading(true);
    } else {
      setOverallLoading(false);
    }
  }, [hotelsLoading, destinationsLoading]);


  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value.toLowerCase());
  };

  const filteredAndEnrichedHotels = useMemo(() => {
    return hotels
      .map(hotel => ({
        ...hotel,
        destinationName: destinationsMap[hotel.destinationId] || hotel.destinationId, 
      }))
      .filter(hotel =>
        hotel.name.toLowerCase().includes(searchTerm) ||
        hotel.address.toLowerCase().includes(searchTerm) ||
        (hotel.destinationName && hotel.destinationName.toLowerCase().includes(searchTerm))
      );
  }, [hotels, destinationsMap, searchTerm]);

  const handleDeleteHotel = async (hotelId: string, hotelName: string) => {
    if (!canManage) {
        toast({ title: currentTranslations.permissionDeniedTitle, description: currentTranslations.permissionDeniedDesc, variant: "destructive"});
        return;
    }
    if (confirm(currentTranslations.confirmDeleteMessage(hotelName))) {
      try {
        await deleteDoc(doc(db, "hotels", hotelId));
        toast({
          title: currentTranslations.hotelDeletedTitle,
          description: currentTranslations.hotelDeletedDesc(hotelName),
        });
      } catch (error) {
        console.error("Error deleting hotel: ", error);
        toast({
          title: currentTranslations.errorDeletingHotelTitle,
          description: currentTranslations.errorDeletingHotelDesc((error as Error).message),
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
          {canManage && <Skeleton className="h-10 w-36" />}
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
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold flex items-center">
            <HotelIcon className={cn("h-8 w-8 text-primary", direction === 'rtl' ? 'ml-3' : 'mr-3')} /> 
            {currentTranslations.pageTitle}
          </h1>
          <p className="text-muted-foreground">{currentTranslations.pageDescription}</p>
        </div>
        {canManage && (
          <Button asChild>
            <Link href="/admin/hotels/new">
              <PlusCircle className={cn("h-4 w-4", direction === 'rtl' ? 'ml-2' : 'mr-2')} /> {currentTranslations.addNewHotel}
            </Link>
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{currentTranslations.hotelListTitle}</CardTitle>
          <CardDescription>{currentTranslations.hotelListDescription}</CardDescription>
          <div className="pt-4">
            <div className="relative">
              <Search className={cn("absolute top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground", direction === 'rtl' ? 'right-3' : 'left-3')} />
              <Input
                placeholder={currentTranslations.searchPlaceholder}
                value={searchTerm}
                onChange={handleSearch}
                className={cn("max-w-md", direction === 'rtl' ? 'pr-10' : 'pl-10')}
                dir={direction}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table dir={direction}>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">{currentTranslations.imageHeader}</TableHead>
                <TableHead>{currentTranslations.nameHeader}</TableHead>
                <TableHead className="hidden md:table-cell">{currentTranslations.addressHeader}</TableHead>
                <TableHead className="hidden lg:table-cell">{currentTranslations.destinationHeader}</TableHead>
                <TableHead className="hidden lg:table-cell w-[150px]">{currentTranslations.createdAtHeader}</TableHead>
                <TableHead className={cn("w-[100px]", direction === 'rtl' ? 'text-left' : 'text-right')}>{currentTranslations.actionsHeader}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndEnrichedHotels.length > 0 ? (
                filteredAndEnrichedHotels.map((hotel) => (
                  <TableRow key={hotel.id}>
                    <TableCell>
                      {hotel.imageUrls && hotel.imageUrls.length > 0 && hotel.imageUrls[0].url ? (
                        <div className="relative h-12 w-12 rounded-md overflow-hidden">
                          <Image
                            src={hotel.imageUrls[0].url}
                            alt={hotel.name}
                            fill
                            className="object-cover"
                            data-ai-hint={hotel.imageUrls[0].dataAiHint || "hotel building"}
                          />
                        </div>
                      ) : (
                        <div className="w-12 h-12 bg-muted rounded-md flex items-center justify-center text-xs text-muted-foreground">{currentTranslations.noImage}</div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{hotel.name}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground truncate max-w-xs">{hotel.address}</TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">{hotel.destinationName || currentTranslations.notAvailable}</TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                      {hotel.createdAt ? new Date(hotel.createdAt).toLocaleDateString() : currentTranslations.notAvailable}
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
                            <Link href={`/admin/hotels/view/${hotel.id}`}>
                              <Eye className={cn("h-4 w-4", direction === 'rtl' ? 'ml-2' : 'mr-2')} /> {currentTranslations.viewDetails}
                            </Link>
                          </DropdownMenuItem>
                          {canManage && (
                            <>
                              <DropdownMenuItem asChild>
                                <Link href={`/admin/hotels/edit/${hotel.id}`}>
                                  <Edit2 className={cn("h-4 w-4", direction === 'rtl' ? 'ml-2' : 'mr-2')} /> {currentTranslations.editHotel}
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDeleteHotel(hotel.id, hotel.name)}
                                className="text-destructive focus:text-destructive-foreground focus:bg-destructive"
                              >
                                <Trash2 className={cn("h-4 w-4", direction === 'rtl' ? 'ml-2' : 'mr-2')} /> {currentTranslations.deleteHotel}
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
                  <TableCell colSpan={6} className="h-24 text-center">
                    {currentTranslations.noHotelsFound}{searchTerm ? currentTranslations.matchingCriteria : (canManage ? currentTranslations.addOne : "")}.
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

export default AdminHotelsPage;

