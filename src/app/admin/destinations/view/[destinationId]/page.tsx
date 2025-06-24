
"use client";

import type { NextPage } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardFooter, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Edit3, MapPin, CalendarDays, Info, Hotel as HotelIcon, List, PlusCircle, Languages } from 'lucide-react';
import type { Destination, Hotel } from '@/lib/types';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { USER_ROLES } from '@/lib/constants';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

const ViewDestinationPage: NextPage = () => {
  const router = useRouter();
  const { destinationId } = useParams<{ destinationId: string }>();
  const { toast } = useToast();
  const { user } = useAuth();
  const { language, direction } = useLanguage();
  
  const [destination, setDestination] = useState<Destination | null>(null);
  const [linkedHotels, setLinkedHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(true);

  const canManage = user?.role === USER_ROLES.ADMIN || user?.role === USER_ROLES.SUPER_ADMIN;

  useEffect(() => {
    if (!destinationId) {
        toast({ title: "Error", description: "Destination ID is missing.", variant: "destructive" });
        router.replace('/admin/destinations');
        return;
    }
    
    setLoading(true);
    let unsubscribeHotels: (() => void) | undefined = undefined;

    const fetchDestinationDetails = async () => {
      try {
        const destDocRef = doc(db, "destinations", destinationId);
        const docSnap = await getDoc(destDocRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          const fetchedDestinationData: Destination = {
            id: docSnap.id,
            name: data.name,
            name_ar: data.name_ar,
            description: data.description,
            description_ar: data.description_ar,
            imageUrl: data.imageUrl,
            dataAiHint: data.dataAiHint,
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : data.createdAt,
            updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : data.updatedAt,
          };
          setDestination(fetchedDestinationData);

          const hotelsQuery = query(
            collection(db, "hotels"),
            where("destinationId", "==", docSnap.id)
          );
          unsubscribeHotels = onSnapshot(hotelsQuery, (snapshot) => {
            const fetchedHotels = snapshot.docs.map(hotelDoc => {
                const hotelData = hotelDoc.data();
                return { 
                    id: hotelDoc.id, 
                    ...hotelData,
                    imageUrls: hotelData.imageUrls || [],
                    createdAt: hotelData.createdAt instanceof Timestamp ? hotelData.createdAt.toDate() : hotelData.createdAt,
                    updatedAt: hotelData.updatedAt instanceof Timestamp ? hotelData.updatedAt.toDate() : hotelData.updatedAt,
                } as Hotel;
            });
            setLinkedHotels(fetchedHotels);
          }, (error) => {
            console.error("Error fetching linked hotels:", error);
            toast({ title: "Error fetching hotels", description: "Could not fetch linked hotels.", variant: "destructive" });
          });
          
        } else {
          toast({ title: "Error", description: "Destination not found in Firestore. Check ID and security rules.", variant: "destructive" });
          router.replace('/admin/destinations');
        }
      } catch (error) {
        console.error("Error fetching destination for view:", error);
        toast({ title: "Error fetching destination", description: (error as Error).message, variant: "destructive" });
        router.replace('/admin/destinations');
      } finally {
        setLoading(false);
      }
    };
    
    fetchDestinationDetails();

    return () => { 
      if (unsubscribeHotels) {
        unsubscribeHotels();
      }
    };
  }, [destinationId, router, toast]);

  if (loading) {
    return (
      <div className="space-y-6" dir={direction}>
        <Skeleton className="h-9 w-40 mb-4" />
        <Card className="max-w-3xl mx-auto">
          <CardHeader>
            <Skeleton className="h-8 w-3/5 mb-2" />
            <Skeleton className="h-64 w-full rounded-lg mb-4" />
            <Skeleton className="h-5 w-4/5" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center"><Skeleton className="h-6 w-6 mr-3" /> <Skeleton className="h-5 w-1/3" /></div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-20 w-full mt-4" /> 
          </CardContent>
          <CardFooter className="flex justify-end space-x-2">
            <Skeleton className="h-10 w-24" />
            {canManage && <Skeleton className="h-10 w-28" />}
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (!destination) return (
    <div className="space-y-6 text-center" dir={direction}>
        <p className="text-muted-foreground">Destination data could not be loaded or was not found.</p>
         <Button variant="outline" size="sm" asChild className="mt-4">
          <Link href="/admin/destinations">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Destination List
          </Link>
        </Button>
    </div>
  );
  
  const destinationDisplayName = language === 'ar' && destination.name_ar ? destination.name_ar : destination.name;
  const destinationDisplayDescription = language === 'ar' && destination.description_ar ? destination.description_ar : destination.description;


  return (
    <div className="space-y-6" dir={direction}>
      <Button variant="outline" size="sm" asChild className="mb-4">
        <Link href="/admin/destinations">
          <ArrowLeft className={cn("mr-2 h-4 w-4", direction === 'rtl' ? 'ml-2' : 'mr-2')} />
          Back to Destination List
        </Link>
      </Button>

      <Card className="max-w-3xl mx-auto shadow-xl border">
        <CardHeader className="pb-4">
          <CardTitle className="text-3xl font-headline flex items-center">
            <MapPin className={cn("mr-3 h-8 w-8 text-primary", direction === 'rtl' ? 'ml-3' : 'mr-3')} /> {destinationDisplayName}
          </CardTitle>
          {destination.imageUrl && (
            <div className="mt-4 relative h-64 w-full rounded-lg overflow-hidden border shadow-inner">
              <Image 
                src={destination.imageUrl} 
                alt={destinationDisplayName} 
                fill 
                style={{ objectFit: 'cover' }}
                data-ai-hint={destination.dataAiHint || 'travel landscape'}
              />
            </div>
          )}
        </CardHeader>
        <CardContent className="pt-2 space-y-6">
          <div>
            <h3 className="text-lg font-semibold flex items-center mb-1 text-primary">
                <Info className={cn("mr-2 h-5 w-5", direction === 'rtl' ? 'ml-2' : 'mr-2')} />Description (English)
            </h3>
            <p className="text-base text-foreground/80 leading-relaxed whitespace-pre-line">
              {destination.description}
            </p>
          </div>
           {destination.name_ar && (
             <div>
                <h3 className="text-lg font-semibold flex items-center mb-1 text-primary">
                    <Languages className={cn("mr-2 h-5 w-5", direction === 'rtl' ? 'ml-2' : 'mr-2')} />Name (Arabic)
                </h3>
                <p className="text-base text-foreground/80 leading-relaxed whitespace-pre-line" dir="rtl">
                {destination.name_ar}
                </p>
            </div>
          )}
          {destination.description_ar && (
             <div>
                <h3 className="text-lg font-semibold flex items-center mb-1 text-primary">
                    <Languages className={cn("mr-2 h-5 w-5", direction === 'rtl' ? 'ml-2' : 'mr-2')} />Description (Arabic)
                </h3>
                <p className="text-base text-foreground/80 leading-relaxed whitespace-pre-line" dir="rtl">
                {destination.description_ar}
                </p>
            </div>
          )}
          
          {destination.createdAt && (
            <div className="text-sm text-muted-foreground flex items-center">
              <CalendarDays className={cn("mr-2 h-4 w-4", direction === 'rtl' ? 'ml-2' : 'mr-2')} />
              Date Added: {new Date(destination.createdAt).toLocaleDateString()}
            </div>
          )}

          <div className="mt-6 pt-6 border-t">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-primary flex items-center">
                    <HotelIcon className={cn("mr-2 h-6 w-6", direction === 'rtl' ? 'ml-2' : 'mr-2')} /> Hotels in {destinationDisplayName}
                </h3>
                {canManage && (
                  <Button asChild size="sm">
                      <Link href={`/admin/hotels/new?destinationId=${destination.id}`}>
                          <PlusCircle className={cn("mr-2 h-4 w-4", direction === 'rtl' ? 'ml-2' : 'mr-2')} /> Add Hotel to this Destination
                      </Link>
                  </Button>
                )}
            </div>
            {linkedHotels.length > 0 ? (
              <ul className="space-y-3">
                {linkedHotels.map(hotel => {
                  const hotelPrimaryImage = hotel.imageUrls && hotel.imageUrls.length > 0 ? hotel.imageUrls[0] : null;
                  return (
                  <li key={hotel.id} className="flex items-center justify-between p-3 border rounded-md bg-muted/50 hover:bg-muted transition-colors">
                    <div className="flex items-center">
                      {hotelPrimaryImage && hotelPrimaryImage.url ? (
                        <div className="relative h-12 w-12 rounded-md overflow-hidden mr-3 border">
                            <Image src={hotelPrimaryImage.url} alt={hotel.name} fill style={{objectFit: 'cover'}} data-ai-hint={hotelPrimaryImage.dataAiHint || "hotel exterior"} />
                        </div>
                      ) : (
                        <div className="relative h-12 w-12 rounded-md overflow-hidden mr-3 border bg-muted flex items-center justify-center">
                            <HotelIcon className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-foreground">{hotel.name}</p>
                        <p className="text-xs text-muted-foreground">{hotel.address}</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/admin/hotels/view/${hotel.id}`}>View Details</Link>
                    </Button>
                  </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-muted-foreground text-center py-4">
                There are no hotels currently listed for {destinationDisplayName}.
              </p>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-end space-x-2 border-t pt-6">
          <Button variant="outline" onClick={() => router.back()}>
            Close
          </Button>
          {canManage && (
            <Button asChild>
              <Link href={`/admin/destinations/edit/${destination.id}`}>
                <Edit3 className={cn("mr-2 h-4 w-4", direction === 'rtl' ? 'ml-2' : 'mr-2')} /> Edit Destination
              </Link>
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
};

export default ViewDestinationPage;


