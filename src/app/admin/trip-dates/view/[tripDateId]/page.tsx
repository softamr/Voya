
"use client";

import type { NextPage } from 'next';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardFooter, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Edit3, CalendarDays as CalendarIconLucide, Hotel as HotelIcon, MapPin, ListChecks, Info, BedDouble, DollarSign, User, Users2, Palette, Clock, FileText, CheckCircle, AlertCircle, XCircle, Users as UsersIcon, Tag } from 'lucide-react';
import type { TripDate, Destination, Hotel, RoomType, InitialReservation, HotelRoomInventoryItem, ExtraFeeConfig, TripFeature } from '@/lib/types';
import { useEffect, useState, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { format, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, onSnapshot, Timestamp, orderBy } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { USER_ROLES, TRIP_FEATURES_TRANSLATIONS } from '@/lib/constants';
import { useLanguage } from '@/contexts/LanguageContext';

interface EnrichedTripDate extends TripDate {
  destination?: Destination; 
  hotel?: Hotel; 
}

interface RoomReservationSummary {
  roomTypeId: string;
  roomTypeName?: string;
  confirmedReservedCount: number;
  hotelInventoryCount?: number;
}


const getStatusBadgeInfo = (status: InitialReservation['status']) => {
    switch (status) {
      case 'pending': return { icon: <Clock className="h-3 w-3 mr-1.5 flex-shrink-0" />, text: "Pending", colorClasses: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200" };
      case 'confirmed': return { icon: <CheckCircle className="h-3 w-3 mr-1.5 flex-shrink-0" />, text: "Confirmed", colorClasses: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" };
      case 'contacted': return { icon: <AlertCircle className="h-3 w-3 mr-1.5 flex-shrink-0" />, text: "Contacted", colorClasses: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" };
      case 'cancelled': return { icon: <XCircle className="h-3 w-3 mr-1.5 flex-shrink-0" />, text: "Cancelled", colorClasses: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" };
      default: return { icon: <FileText className="h-3 w-3 mr-1.5 flex-shrink-0" />, text: status, colorClasses: "bg-muted text-muted-foreground" };
    }
};


const ViewTripDatePage: NextPage = () => {
  const router = useRouter();
  const { tripDateId } = useParams<{ tripDateId: string }>();
  const { toast } = useToast();
  const { user } = useAuth();
  const { language } = useLanguage();

  const [tripDate, setTripDate] = useState<EnrichedTripDate | null>(null);
  const [masterRoomTypes, setMasterRoomTypes] = useState<RoomType[]>([]);
  const [linkedReservations, setLinkedReservations] = useState<InitialReservation[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [duration, setDuration] = useState<{nights: number, days: number} | null>(null);

  const canManage = user?.role === USER_ROLES.ADMIN || user?.role === USER_ROLES.SUPER_ADMIN;

  useEffect(() => {
    setDataLoading(true);
    let unsubRoomTypes: (() => void) | undefined;
    let unsubReservations: (() => void) | undefined;

    const fetchTripDateData = async () => {
      if (!tripDateId) {
        toast({ title: "Error", description: "Trip Date ID is missing.", variant: "destructive" });
        router.replace('/admin/trip-dates');
        setDataLoading(false);
        return;
      }

      try {
        const roomTypesQuery = query(collection(db, "roomTypes"));
        unsubRoomTypes = onSnapshot(roomTypesQuery, (snapshot) => {
          setMasterRoomTypes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RoomType)));
        }, (error) => {
          console.error("Error fetching master room types:", error);
          toast({ title: "Error", description: "Could not load room type details.", variant: "destructive" });
        });
        
        const tripDocRef = doc(db, "tripDates", tripDateId);
        const tripSnap = await getDoc(tripDocRef);

        if (tripSnap.exists()) {
          const data = tripSnap.data();
          let enrichedData: EnrichedTripDate = { 
            ...data, 
            id: tripSnap.id,
            startDate: (data.startDate as Timestamp).toDate(),
            endDate: (data.endDate as Timestamp).toDate(),
            createdAt: data.createdAt ? (data.createdAt as Timestamp).toDate() : undefined,
            updatedAt: data.updatedAt ? (data.updatedAt as Timestamp).toDate() : undefined,
            selectedFeatures: data.selectedFeatures || [],
            extraFees: data.extraFees || [],
          } as EnrichedTripDate; 

          if (data.destinationId) {
            const destDocRef = doc(db, "destinations", data.destinationId);
            const destSnap = await getDoc(destDocRef);
            if (destSnap.exists()) {
              enrichedData.destination = { id: destSnap.id, ...destSnap.data() } as Destination;
            }
          }

          if (data.hotelId) {
            const hotelDocRef = doc(db, "hotels", data.hotelId);
            const hotelSnap = await getDoc(hotelDocRef);
            if (hotelSnap.exists()) {
              enrichedData.hotel = { id: hotelSnap.id, ...hotelSnap.data() } as Hotel;
            }
          }
          
          setTripDate(enrichedData);

          const startDate = new Date(enrichedData.startDate as Date);
          const endDate = new Date(enrichedData.endDate as Date);
          if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime()) && endDate > startDate) {
              const nights = differenceInDays(endDate, startDate);
              setDuration({ nights, days: nights + 1 });
          } else {
              setDuration(null);
          }

          const reservationsQuery = query(
            collection(db, "reservations"),
            where("tripDateId", "==", tripSnap.id),
            orderBy("reservationDate", "desc")
          );
          unsubReservations = onSnapshot(reservationsQuery, (snapshot) => {
            const fetchedReservations = snapshot.docs.map(resDoc => {
              const resData = resDoc.data();
              return {
                id: resDoc.id,
                ...resData,
                reservationDate: (resData.reservationDate as Timestamp).toDate(),
                createdAt: resData.createdAt ? (resData.createdAt as Timestamp).toDate() : undefined,
                updatedAt: resData.updatedAt ? (resData.updatedAt as Timestamp).toDate() : undefined,
                contactedAt: resData.contactedAt ? (resData.contactedAt as Timestamp).toDate() : undefined,
                confirmedAt: resData.confirmedAt ? (resData.confirmedAt as Timestamp).toDate() : undefined,
                selectedExtraFees: resData.selectedExtraFees || [],
              } as InitialReservation;
            });
            setLinkedReservations(fetchedReservations);
          }, (error) => {
            console.error("Error fetching linked reservations:", error);
            toast({ title: "Error fetching reservations", description: "Could not fetch linked reservations for this trip.", variant: "destructive" });
          });

        } else {
          toast({ title: "Error", description: "Trip date not found.", variant: "destructive" });
          router.replace('/admin/trip-dates');
        }
      } catch (error) {
        console.error("Error fetching trip date details:", error);
        toast({ title: "Error", description: "Could not load trip date details.", variant: "destructive" });
        router.replace('/admin/trip-dates');
      } finally {
        setDataLoading(false);
      }
    };
    
    fetchTripDateData();

    return () => {
        if (unsubRoomTypes) unsubRoomTypes();
        if (unsubReservations) unsubReservations();
    }
  }, [tripDateId, router, toast]);

  const reservationSummary = useMemo(() => {
    if (!tripDate || !tripDate.hotel || !tripDate.hotel.roomInventory || linkedReservations.length === 0) {
      return { totalConfirmedGuests: 0, roomSummaries: [] };
    }

    const confirmedReservations = linkedReservations.filter(r => r.status === 'confirmed');
    let totalConfirmedGuests = 0;
    const confirmedRoomCounts: Record<string, number> = {};

    confirmedReservations.forEach(res => {
      totalConfirmedGuests += res.numberOfGuests || 0;
      res.requestedRooms?.forEach(reqRoom => {
        confirmedRoomCounts[reqRoom.roomTypeId] = (confirmedRoomCounts[reqRoom.roomTypeId] || 0) + reqRoom.numberOfRooms;
      });
    });

    const roomSummaries: RoomReservationSummary[] = (tripDate.availableRoomsByType || []).map(tripRoomAvail => {
      const masterType = masterRoomTypes.find(rt => rt.id === tripRoomAvail.roomTypeId);
      const hotelInventoryItem = tripDate.hotel?.roomInventory?.find(inv => inv.roomTypeId === tripRoomAvail.roomTypeId);
      return {
        roomTypeId: tripRoomAvail.roomTypeId,
        roomTypeName: masterType?.name || tripRoomAvail.roomTypeName || `ID: ${tripRoomAvail.roomTypeId}`,
        confirmedReservedCount: confirmedRoomCounts[tripRoomAvail.roomTypeId] || 0,
        hotelInventoryCount: hotelInventoryItem?.count || 0,
      };
    });
    
    return { totalConfirmedGuests, roomSummaries };
  }, [linkedReservations, tripDate, masterRoomTypes]);


  if (dataLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-40 mb-4" />
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <Skeleton className="h-8 w-3/5 mb-2" />
            <Skeleton className="h-5 w-4/5" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-6 w-1/2 mb-1" />
            <Skeleton className="h-6 w-1/2 mb-1" />
            <Skeleton className="h-6 w-1/2 mb-1" />
            <Skeleton className="h-24 w-full mt-4" /> 
            <Skeleton className="h-16 w-full mt-4" />
            <Skeleton className="h-20 w-full mt-4" /> 
          </CardContent>
          <CardFooter className="flex justify-end space-x-2">
            <Skeleton className="h-10 w-24" />
            {canManage && <Skeleton className="h-10 w-32" />}
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (!tripDate) return (
     <div className="space-y-6 text-center">
        <p className="text-muted-foreground">Trip Date data could not be loaded or was not found.</p>
         <Button variant="outline" size="sm" asChild className="mt-4">
          <Link href="/admin/trip-dates">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Trip Date List
          </Link>
        </Button>
    </div>
  );

  return (
    <div className="space-y-6">
      <Button variant="outline" size="sm" asChild className="mb-4">
        <Link href="/admin/trip-dates">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Trip Date List
        </Link>
      </Button>

      <Card className="max-w-2xl mx-auto shadow-xl border">
        <CardHeader className="pb-4">
          <CardTitle className="text-3xl font-headline flex items-center">
            <CalendarIconLucide className="mr-3 h-8 w-8 text-primary" /> Trip Details
          </CardTitle>
          <CardDescription className="text-lg text-muted-foreground pt-2">
            Viewing trip from {format(new Date(tripDate.startDate as Date), 'PP')} to {format(new Date(tripDate.endDate as Date), 'PP')}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <h3 className="text-md font-semibold flex items-center mb-1 text-primary">
                    <MapPin className="mr-2 h-5 w-5" />Destination
                </h3>
                <p className="text-foreground/80">{tripDate.destination?.name || 'N/A'}</p>
            </div>
            <div>
                <h3 className="text-md font-semibold flex items-center mb-1 text-primary">
                    <HotelIcon className="mr-2 h-5 w-5" />Hotel
                </h3>
                <p className="text-foreground/80">{tripDate.hotel?.name || 'N/A'}</p>
                <p className="text-xs text-muted-foreground">{tripDate.hotel?.address}</p>
            </div>
            {duration && (
                 <div>
                    <h3 className="text-md font-semibold flex items-center mb-1 text-primary">
                        <Clock className="mr-2 h-5 w-5" />Duration
                    </h3>
                    <p className="text-foreground/80">{duration.nights} Nights / {duration.days} Days</p>
                </div>
            )}
             <div>
                <h3 className="text-md font-semibold flex items-center mb-1 text-primary">
                    <ListChecks className="mr-2 h-5 w-5" />Status
                </h3>
                <p className={cn(
                    "px-2 py-1 text-sm font-semibold rounded-full inline-block",
                    tripDate.status === 'active' && "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
                    tripDate.status === 'full' && "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
                    tripDate.status === 'cancelled' && "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                )}>
                    {tripDate.status.charAt(0).toUpperCase() + tripDate.status.slice(1)}
                </p>
            </div>
          </div>
          
          <div className="mt-6 pt-4 border-t">
            <h3 className="text-xl font-semibold mb-3 text-primary flex items-center">
                <BedDouble className="mr-2 h-5 w-5" />Room Pricing & Availability
            </h3>
            {tripDate.availableRoomsByType && tripDate.availableRoomsByType.length > 0 ? (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Room Type</TableHead>
                            <TableHead className="text-right">Price/Person</TableHead>
                            <TableHead className="text-right">Confirmed / Hotel Total</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {reservationSummary.roomSummaries.map((summary) => {
                            const roomTypeDetails = masterRoomTypes.find(rt => rt.id === summary.roomTypeId);
                            const originalPriceInfo = tripDate.availableRoomsByType.find(p => p.roomTypeId === summary.roomTypeId);
                            return (
                                <TableRow key={summary.roomTypeId}>
                                    <TableCell className="font-medium">{summary.roomTypeName || `ID: ${summary.roomTypeId}`}</TableCell>
                                    <TableCell className="text-right">EGP {(originalPriceInfo?.pricePerPerson || 0).toFixed(2)}</TableCell>
                                    <TableCell className="text-right">
                                        {summary.confirmedReservedCount} / {summary.hotelInventoryCount || 'N/A'}
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            ) : (
                 <p className="text-muted-foreground">No room pricing information for this trip date.</p>
            )}
             <p className="text-sm text-muted-foreground mt-3 flex items-center">
                <UsersIcon className="mr-2 h-4 w-4" /> Total Confirmed Guests: {reservationSummary.totalConfirmedGuests}
            </p>
          </div>
          
          <div className="mt-6 pt-4 border-t">
            <h3 className="text-xl font-semibold mb-3 text-primary flex items-center">
                <DollarSign className="mr-2 h-5 w-5" />Additional Pricing
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                    <p className="font-medium text-muted-foreground flex items-center"><User className="mr-1 h-4 w-4"/> Transportation/Seat:</p>
                    <p>{tripDate.transportationPricePerPerson ? `EGP ${tripDate.transportationPricePerPerson.toFixed(2)}` : 'N/A'}</p>
                </div>
                <div>
                    <p className="font-medium text-muted-foreground flex items-center"><Users2 className="mr-1 h-4 w-4"/> Child Price/Person:</p>
                    <p>{tripDate.childPricePerPerson ? `EGP ${tripDate.childPricePerPerson.toFixed(2)}` : 'N/A'} 
                       {tripDate.childMaxAge && ` (up to ${tripDate.childMaxAge} yrs)`}
                    </p>
                </div>
            </div>
          </div>

          {tripDate.selectedFeatures && tripDate.selectedFeatures.length > 0 && (
            <div className="mt-6 pt-4 border-t">
                <h3 className="text-xl font-semibold mb-2 text-primary flex items-center">
                    <Palette className="mr-2 h-5 w-5" />Trip Features
                </h3>
                <div className="flex flex-wrap gap-2">
                    {tripDate.selectedFeatures.map(featureKey => {
                       const featureLabel = TRIP_FEATURES_TRANSLATIONS[featureKey as TripFeature]?.[language] || featureKey;
                       return (
                          <Badge key={featureKey} variant="secondary" className="text-sm">
                              {featureLabel}
                          </Badge>
                       );
                    })}
                </div>
            </div>
          )}

          {tripDate.extraFees && tripDate.extraFees.length > 0 && (
            <div className="mt-6 pt-4 border-t">
                <h3 className="text-xl font-semibold mb-2 text-primary flex items-center">
                    <Tag className="mr-2 h-5 w-5" />Optional Extra Fees
                </h3>
                <ul className="space-y-2 text-sm">
                    {tripDate.extraFees.map(fee => (
                        <li key={fee.id} className="p-2 border rounded-md bg-muted/30">
                            <p className="font-semibold text-foreground">{fee.name} - <span className="text-primary">EGP {fee.pricePerPerson.toFixed(2)}/person</span></p>
                            {fee.description && <p className="text-xs text-muted-foreground">{fee.description}</p>}
                        </li>
                    ))}
                </ul>
            </div>
          )}

          <div className="mt-6 pt-4 border-t">
            <h3 className="text-xl font-semibold mb-3 text-primary flex items-center">
                <FileText className="mr-2 h-5 w-5" /> Reservations for this Trip
            </h3>
            {linkedReservations.length > 0 ? (
              <ul className="space-y-3">
                {linkedReservations.map(res => {
                  const statusBadge = getStatusBadgeInfo(res.status);
                  return (
                    <li key={res.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 border rounded-md bg-muted/30 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex-grow mb-2 sm:mb-0">
                        <p className="font-semibold text-foreground">{res.guestName}</p>
                        <p className="text-xs text-muted-foreground">
                          Reserved on: {format(new Date(res.reservationDate as Date), 'PP')}
                        </p>
                      </div>
                      <div className="flex items-center space-x-3 w-full sm:w-auto">
                        <Badge variant="outline" className={cn("text-xs flex items-center py-0.5 px-1.5", statusBadge.colorClasses)}>
                          {statusBadge.icon} {statusBadge.text}
                        </Badge>
                        <Button variant="outline" size="sm" asChild className="flex-shrink-0">
                          <Link href={`/admin/reservations/view/${res.id}`}>View Details</Link>
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-muted-foreground text-center py-4">
                No reservations found for this trip date yet.
              </p>
            )}
          </div>


          {tripDate.createdAt && (
            <div className="text-sm text-muted-foreground flex items-center pt-4 border-t mt-6">
              <Info className="mr-2 h-4 w-4" />
              Record Created: {new Date(tripDate.createdAt as Date).toLocaleDateString()}
            </div>
          )}

        </CardContent>
        <CardFooter className="flex justify-end space-x-2 border-t pt-6">
          <Button variant="outline" onClick={() => router.back()}>
            Close
          </Button>
          {canManage && (
            <Button asChild>
              <Link href={`/admin/trip-dates/edit/${tripDate.id}`}>
                <Edit3 className="mr-2 h-4 w-4" /> Edit Trip Date
              </Link>
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
};

export default ViewTripDatePage;
