
"use client";

import type { NextPage } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardFooter, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Edit3, Hotel as HotelIcon, MapPin, CalendarDays, Info, BedDouble, ImageIcon } from 'lucide-react';
import type { Hotel, Destination, RoomType } from '@/lib/types';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, onSnapshot, Timestamp } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { USER_ROLES } from '@/lib/constants';
import { cn } from '@/lib/utils'; 
import { useLanguage } from '@/contexts/LanguageContext'; 
// Removed Carousel imports

interface EnrichedHotelForView extends Hotel {
  destinationName?: string; 
}

const ViewHotelPage: NextPage = () => {
  const router = useRouter();
  const { hotelId } = useParams<{ hotelId: string }>();
  const { toast } = useToast();
  const { user } = useAuth();
  const { language, direction } = useLanguage(); 

  const [hotel, setHotel] = useState<EnrichedHotelForView | null>(null);
  const [masterRoomTypes, setMasterRoomTypes] = useState<RoomType[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  const canManage = user?.role === USER_ROLES.ADMIN || user?.role === USER_ROLES.SUPER_ADMIN;

  const translations = {
    en: {
      backButton: "Back to Hotel List",
      pageTitle: "Hotel Details",
      notFoundError: "Hotel data could not be loaded or was not found.",
      editButton: "Edit Hotel",
      closeButton: "Close",
      inDestination: "In:",
      aboutTitle: "About this Hotel",
      dateAdded: "Date Added:",
      roomInventoryTitle: "Room Inventory",
      roomTypeHeader: "Room Type",
      countHeader: "Count",
      noInventory: "No room inventory information available for this hotel.",
      noImages: "No images available for this hotel.",
      hotelImagesTitle: "Hotel Images", // Added title for image section
    },
    ar: {
      backButton: "العودة إلى قائمة الفنادق",
      pageTitle: "تفاصيل الفندق",
      notFoundError: "تعذر تحميل بيانات الفندق أو لم يتم العثور عليها.",
      editButton: "تعديل الفندق",
      closeButton: "إغلاق",
      inDestination: "في:",
      aboutTitle: "عن هذا الفندق",
      dateAdded: "تاريخ الإضافة:",
      roomInventoryTitle: "مخزون الغرف",
      roomTypeHeader: "نوع الغرفة",
      countHeader: "العدد",
      noInventory: "لا توجد معلومات عن مخزون الغرف لهذا الفندق.",
      noImages: "لا توجد صور متاحة لهذا الفندق.",
      hotelImagesTitle: "صور الفندق", // Added title for image section
    },
  };
  const currentTranslations = translations[language];

  useEffect(() => {
    setDataLoading(true);
    let unsubRoomTypes: (() => void) | undefined;

    const fetchHotelData = async () => {
      if (!hotelId) {
        toast({ title: "Error", description: "Hotel ID is missing.", variant: "destructive" });
        router.replace('/admin/hotels');
        setDataLoading(false);
        return;
      }

      try {
        const hotelDocRef = doc(db, "hotels", hotelId);
        const hotelSnap = await getDoc(hotelDocRef);

        if (hotelSnap.exists()) {
          const hotelData = hotelSnap.data() as Hotel; 
          let enrichedHotel: EnrichedHotelForView = { 
            ...hotelData, 
            id: hotelSnap.id,
            imageUrls: hotelData.imageUrls || [],
            createdAt: hotelData.createdAt instanceof Timestamp ? hotelData.createdAt.toDate() : hotelData.createdAt,
            updatedAt: hotelData.updatedAt instanceof Timestamp ? hotelData.updatedAt.toDate() : hotelData.updatedAt,
          };

          if (hotelData.destinationId) {
            const destDocRef = doc(db, "destinations", hotelData.destinationId);
            const destSnap = await getDoc(destDocRef);
            if (destSnap.exists()) {
              enrichedHotel.destinationName = destSnap.data()?.name;
            }
          }
          setHotel(enrichedHotel);

          const roomTypesQuery = query(collection(db, "roomTypes"));
          unsubRoomTypes = onSnapshot(roomTypesQuery, (snapshot) => {
            setMasterRoomTypes(snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as RoomType)));
          });

        } else {
          toast({ title: "Error", description: "Hotel not found.", variant: "destructive" });
          router.replace('/admin/hotels');
        }
      } catch (error) {
        console.error("Error fetching hotel details:", error);
        toast({ title: "Error", description: "Could not load hotel details.", variant: "destructive" });
        router.replace('/admin/hotels');
      } finally {
        setDataLoading(false);
      }
    };
    
    fetchHotelData();

    return () => {
        if (unsubRoomTypes) unsubRoomTypes();
    }
  }, [hotelId, router, toast]);

  if (dataLoading) {
    return (
      <div className="space-y-6" dir={direction}>
        <Skeleton className="h-9 w-40 mb-4" />
        <Card className="max-w-3xl mx-auto">
          <CardHeader>
            <Skeleton className="h-8 w-3/5 mb-2" />
            <Skeleton className="h-64 w-full rounded-lg mb-4" /> {/* Placeholder for image area */}
            <Skeleton className="h-5 w-4/5" />
            <Skeleton className="h-5 w-1/2 mt-1" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center"><Skeleton className="h-6 w-6 mr-3" /> <Skeleton className="h-5 w-1/3" /></div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-24 w-full" /> 
          </CardContent>
          <CardFooter className="flex justify-end space-x-2">
            <Skeleton className="h-10 w-24" />
            {canManage && <Skeleton className="h-10 w-28" />}
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (!hotel) return (
     <div className="space-y-6 text-center" dir={direction}>
        <p className="text-muted-foreground">{currentTranslations.notFoundError}</p>
         <Button variant="outline" size="sm" asChild className="mt-4">
          <Link href="/admin/hotels">
            <ArrowLeft className={cn("h-4 w-4", direction === 'rtl' ? 'ml-2' : 'mr-2')} />
            {currentTranslations.backButton}
          </Link>
        </Button>
    </div>
  );

  const hasImages = hotel.imageUrls && hotel.imageUrls.length > 0;

  return (
    <div className="space-y-6" dir={direction}>
      <Button variant="outline" size="sm" asChild className="mb-4">
        <Link href="/admin/hotels">
          <ArrowLeft className={cn("h-4 w-4", direction === 'rtl' ? 'ml-2' : 'mr-2')} />
          {currentTranslations.backButton}
        </Link>
      </Button>

      <Card className="max-w-3xl mx-auto shadow-xl border">
        <CardHeader className="pb-4">
          <CardTitle className="text-3xl font-headline flex items-center">
            <HotelIcon className={cn("h-8 w-8 text-primary", direction === 'rtl' ? 'ml-3' : 'mr-3')} /> {hotel.name}
          </CardTitle>
          
          <CardDescription className={cn("text-lg text-muted-foreground pt-2", direction === 'rtl' ? 'text-right' : 'text-left')}>
             <MapPin className={cn("inline-block h-5 w-5 text-primary/80", direction === 'rtl' ? 'ml-2' : 'mr-2')} />{hotel.address}
          </CardDescription>
          {hotel.destinationName && (
            <p className={cn("text-md text-primary font-semibold", direction === 'rtl' ? 'text-right' : 'text-left')}>
              {currentTranslations.inDestination} {hotel.destinationName}
            </p>
          )}
        </CardHeader>
        <CardContent className="pt-2 space-y-6">
          {hasImages && (
            <div className="mt-4 border-t pt-6">
              <h3 className="text-xl font-semibold mb-3 text-primary flex items-center">
                <ImageIcon className={cn("h-5 w-5", direction === 'rtl' ? 'ml-2' : 'mr-2')} />{currentTranslations.hotelImagesTitle}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {hotel.imageUrls!.map((img, idx) => (
                  <div key={idx} className="relative aspect-video rounded-lg overflow-hidden border shadow-inner">
                    <Image 
                      src={img.url} 
                      alt={`${hotel.name} image ${idx + 1}`}
                      fill 
                      className="object-cover" // Changed from style prop
                      data-ai-hint={img.dataAiHint || 'hotel detail'}
                      priority={idx < 3} // Prioritize loading first few images
                      sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
          {!hasImages && (
            <div className="mt-4 p-4 text-center text-muted-foreground bg-muted rounded-md border-t pt-6">
                <h3 className="text-xl font-semibold mb-3 text-primary flex items-center justify-center">
                    <ImageIcon className={cn("h-5 w-5", direction === 'rtl' ? 'ml-2' : 'mr-2')} />{currentTranslations.hotelImagesTitle}
                </h3>
                <ImageIcon className="mx-auto h-10 w-10 mb-2 text-muted-foreground/50"/>
                {currentTranslations.noImages}
            </div>
          )}

          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold flex items-center mb-1 text-primary">
                <Info className={cn("h-5 w-5", direction === 'rtl' ? 'ml-2' : 'mr-2')} />{currentTranslations.aboutTitle}
            </h3>
            <p className="text-base text-foreground/80 leading-relaxed whitespace-pre-line">
              {hotel.description}
            </p>
          </div>
          
          {hotel.createdAt && (
            <div className="text-sm text-muted-foreground flex items-center border-t pt-4">
              <CalendarDays className={cn("h-4 w-4", direction === 'rtl' ? 'ml-2' : 'mr-2')} />
              {currentTranslations.dateAdded} {new Date(hotel.createdAt as Date).toLocaleDateString()}
            </div>
          )}

          <div className="mt-6 pt-6 border-t">
            <h3 className="text-xl font-semibold mb-3 text-primary flex items-center">
                <BedDouble className={cn("h-5 w-5", direction === 'rtl' ? 'ml-2' : 'mr-2')} />{currentTranslations.roomInventoryTitle}
            </h3>
            {hotel.roomInventory && hotel.roomInventory.length > 0 ? (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{currentTranslations.roomTypeHeader}</TableHead>
                            <TableHead className={direction === 'rtl' ? 'text-left' : 'text-right'}>{currentTranslations.countHeader}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {hotel.roomInventory.map(item => {
                             const roomTypeDetails = masterRoomTypes.find(rt => rt.id === item.roomTypeId);
                             return (
                                <TableRow key={item.roomTypeId}>
                                    <TableCell className="font-medium">{roomTypeDetails?.name || item.roomTypeName || `ID: ${item.roomTypeId}`}</TableCell>
                                    <TableCell className={direction === 'rtl' ? 'text-left' : 'text-right'}>{item.count}</TableCell>
                                </TableRow>
                             );
                        })}
                    </TableBody>
                </Table>
            ) : (
                 <p className="text-muted-foreground">{currentTranslations.noInventory}</p>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-end space-x-2 border-t pt-6">
          <Button variant="outline" onClick={() => router.back()}>
            {currentTranslations.closeButton}
          </Button>
          {canManage && (
            <Button asChild>
              <Link href={`/admin/hotels/edit/${hotel.id}`}>
                <Edit3 className={cn("h-4 w-4", direction === 'rtl' ? 'ml-2' : 'mr-2')} /> {currentTranslations.editButton}
              </Link>
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
};

export default ViewHotelPage;

