
"use client";

import type { NextPage } from 'next';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Edit3, Save, FileText, User, Phone, Mail, CalendarDays, BedDouble, Users2Icon, Hotel as HotelIconLucide, DollarSign, Tag } from 'lucide-react'; 
import type { InitialReservation, TripDate, Hotel, RoomType, HotelRoomInventoryItem, SelectedExtraFee } from '@/lib/types';
import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, serverTimestamp, Timestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';

const reservationStatusEnum = z.enum(['pending', 'contacted', 'confirmed', 'cancelled']);

const editReservationSchema = z.object({
  status: reservationStatusEnum,
  notes: z.string().optional(),
  depositAmount: z.coerce.number().min(0, "Deposit amount must be non-negative.").optional(),
});

type EditReservationFormValues = z.infer<typeof editReservationSchema>;

interface DisplayReservationDetails extends InitialReservation {
  tripSummary?: string; 
  requestedRoomTypeName?: string; 
  hotelName?: string; 
  tripStartDate?: Date;
  tripEndDate?: Date;
}


const EditReservationPage: NextPage = () => {
  const router = useRouter();
  const { reservationId } = useParams<{ reservationId: string }>();
  const { toast } = useToast();
  const { user: adminUser } = useAuth(); 

  const [formSubmitLoading, setFormSubmitLoading] = useState(false);
  const [reservation, setReservation] = useState<DisplayReservationDetails | null>(null);
  const [dataLoading, setDataLoading] = useState(true);

  const form = useForm<EditReservationFormValues>({
    resolver: zodResolver(editReservationSchema),
  });

  const watchedStatus = form.watch('status');

  useEffect(() => {
    const loadReservationData = async () => {
      setDataLoading(true);
      if (!reservationId) {
        toast({ title: "Error", description: "Reservation ID is missing.", variant: "destructive" });
        router.replace('/admin/reservations');
        setDataLoading(false);
        return;
      }

      try {
        const resDocRef = doc(db, "reservations", reservationId);
        const resSnap = await getDoc(resDocRef);

        if (resSnap.exists()) {
          const resData = resSnap.data() as InitialReservation;
          let displayDetails: DisplayReservationDetails = {
            ...resData,
            id: resSnap.id,
            reservationDate: (resData.reservationDate as Timestamp).toDate(),
            createdAt: resData.createdAt ? (resData.createdAt as Timestamp).toDate() : undefined,
            updatedAt: resData.updatedAt ? (resData.updatedAt as Timestamp).toDate() : undefined,
            contactedAt: resData.contactedAt ? (resData.contactedAt as Timestamp).toDate() : undefined,
            confirmedAt: resData.confirmedAt ? (resData.confirmedAt as Timestamp).toDate() : undefined,
            depositAmount: resData.depositAmount,
            selectedExtraFees: resData.selectedExtraFees || [],
          };

          if (resData.hotelId) {
            const hotelDocRef = doc(db, "hotels", resData.hotelId);
            const hotelSnap = await getDoc(hotelDocRef);
            if (hotelSnap.exists()) {
              displayDetails.hotelName = hotelSnap.data()?.name;
            }
          }

          if (resData.tripDateId) {
            const tripDocRef = doc(db, "tripDates", resData.tripDateId);
            const tripSnap = await getDoc(tripDocRef);
            if (tripSnap.exists()) {
              const tripData = tripSnap.data() as TripDate;
              displayDetails.tripStartDate = (tripData.startDate as Timestamp).toDate();
              displayDetails.tripEndDate = (tripData.endDate as Timestamp).toDate();
            }
          }
          
          let summary = displayDetails.hotelName || "Unknown Hotel";
          if (displayDetails.tripStartDate && displayDetails.tripEndDate) {
             summary += ` (${format(displayDetails.tripStartDate, 'MMM d')} - ${format(displayDetails.tripEndDate, 'MMM d, yy')})`;
          }
          displayDetails.tripSummary = summary;

          setReservation(displayDetails);
          form.reset({
            status: displayDetails.status,
            notes: displayDetails.notes || '',
            depositAmount: displayDetails.depositAmount || undefined, 
          });
        } else {
          toast({ title: "Error", description: "Reservation not found.", variant: "destructive" });
          router.replace('/admin/reservations');
        }
      } catch (error) {
        console.error("Error loading reservation:", error);
        toast({ title: "Loading Error", description: "Could not load reservation details.", variant: "destructive"});
      } finally {
        setDataLoading(false);
      }
    };
    loadReservationData();
  }, [reservationId, form, router, toast]);

  const checkAndUpdateTripDateStatus = async (tripDateId: string) => {
    try {
      const tripDateRef = doc(db, "tripDates", tripDateId);
      const tripDateSnap = await getDoc(tripDateRef);

      if (!tripDateSnap.exists()) {
        console.warn(`TripDate ${tripDateId} not found during status check.`);
        return;
      }
      const tripDate = tripDateSnap.data() as TripDate;

      if (tripDate.status !== 'active') {
        return; 
      }

      const hotelRef = doc(db, "hotels", tripDate.hotelId);
      const hotelSnap = await getDoc(hotelRef);
      if (!hotelSnap.exists()) {
        console.warn(`Hotel ${tripDate.hotelId} for TripDate ${tripDateId} not found.`);
        return;
      }
      const hotel = hotelSnap.data() as Hotel;
      const hotelInventory = hotel.roomInventory || [];

      const confirmedReservationsQuery = query(
        collection(db, "reservations"),
        where("tripDateId", "==", tripDateId),
        where("status", "==", "confirmed")
      );
      const confirmedReservationsSnap = await getDocs(confirmedReservationsQuery);
      
      const reservedCountsByRoomType: Record<string, number> = {};
      confirmedReservationsSnap.forEach(resDoc => {
        const res = resDoc.data() as InitialReservation;
        res.requestedRooms?.forEach(reqRoom => {
          reservedCountsByRoomType[reqRoom.roomTypeId] = (reservedCountsByRoomType[reqRoom.roomTypeId] || 0) + reqRoom.numberOfRooms;
        });
      });

      let shouldBeFull = false;
      for (const tripRoomConfig of tripDate.availableRoomsByType) {
        const roomTypeId = tripRoomConfig.roomTypeId;
        const hotelInventoryItem = hotelInventory.find(inv => inv.roomTypeId === roomTypeId);
        
        if (hotelInventoryItem) {
          const totalAvailableInHotel = hotelInventoryItem.count;
          const currentlyReservedConfirmed = reservedCountsByRoomType[roomTypeId] || 0;
          
          if (currentlyReservedConfirmed >= totalAvailableInHotel) {
            shouldBeFull = true;
            break; 
          }
        }
      }

      if (shouldBeFull && tripDate.status === 'active') {
        await updateDoc(tripDateRef, { status: 'full', updatedAt: serverTimestamp() });
        toast({
          title: "Trip Status Updated",
          description: `Trip ${tripDateId} for ${hotel.name} has been automatically set to 'full' due to room capacity.`,
          variant: "default",
        });
      }

    } catch (error) {
      console.error("Error checking/updating TripDate status:", error);
      toast({
        title: "Trip Status Check Failed",
        description: "Could not automatically update the trip status.",
        variant: "destructive",
      });
    }
  };


  const onSubmit = async (data: EditReservationFormValues) => {
    setFormSubmitLoading(true);
    if (!reservationId || !adminUser || !reservation) {
        toast({ title: "Error", description: "Required data missing for update (Reservation ID, Admin User, or Reservation details).", variant: "destructive" });
        setFormSubmitLoading(false);
        return;
    }
    
    try {
      const resDocRef = doc(db, "reservations", reservationId);
      const updateData: Partial<InitialReservation> = { 
        status: data.status,
        notes: data.notes || null, 
        updatedAt: serverTimestamp(),
      };

      if (data.status === 'confirmed') {
        updateData.depositAmount = data.depositAmount || 0; 
        updateData.confirmedByUid = adminUser.uid;
        updateData.confirmedByName = adminUser.displayName || adminUser.email || 'System';
        updateData.confirmedAt = serverTimestamp();
      } else {
        updateData.depositAmount = null;
        if (reservation?.status === 'confirmed') { 
             updateData.confirmedByUid = null;
             updateData.confirmedByName = null;
             updateData.confirmedAt = null;
        }
      }

      if (data.status === 'contacted') {
        updateData.contactedByUid = adminUser.uid;
        updateData.contactedByName = adminUser.displayName || adminUser.email || 'System';
        updateData.contactedAt = serverTimestamp();
      } else {
        if (reservation?.status === 'contacted') {
             updateData.contactedByUid = null;
             updateData.contactedByName = null;
             updateData.contactedAt = null;
        }
      }

      await updateDoc(resDocRef, updateData);
      
      toast({
        title: "Reservation Updated",
        description: `Reservation for ${reservation?.guestName} has been updated.`,
      });

      if (reservation.tripDateId) {
        await checkAndUpdateTripDateStatus(reservation.tripDateId);
      }

      router.push('/admin/reservations');
    } catch (error) {
      console.error("Error updating reservation:", error);
      toast({ title: "Update Failed", description: (error as Error).message, variant: "destructive" });
    } finally {
      setFormSubmitLoading(false);
    }
  };

  if (dataLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-44 mb-4" />
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <Skeleton className="h-8 w-3/5 mb-2" />
            <Skeleton className="h-4 w-4/5" />
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="border p-4 rounded-md bg-muted/50">
                <Skeleton className="h-5 w-1/4 mb-2"/>
                <Skeleton className="h-4 w-full mb-1"/>
                <Skeleton className="h-4 w-3/4 mb-1"/>
                <Skeleton className="h-4 w-1/2"/>
            </div>
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-10 w-full" /> 
            <div className="flex justify-end space-x-3 pt-4">
                <Skeleton className="h-10 w-24" />
                <Skeleton className="h-10 w-28" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!reservation) return (
     <div className="space-y-6 text-center">
        <p className="text-muted-foreground">Reservation data could not be loaded or was not found.</p>
         <Button variant="outline" size="sm" asChild className="mt-4">
          <Link href="/admin/reservations">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Reservation List
          </Link>
        </Button>
    </div>
  );


  return (
    <div className="space-y-6">
      <Button variant="outline" size="sm" asChild className="mb-4">
        <Link href="/admin/reservations">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Reservation List
        </Link>
      </Button>

      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl font-headline flex items-center">
            <Edit3 className="mr-3 h-6 w-6 text-primary" /> Edit Reservation
          </CardTitle>
          <CardDescription>Update status and notes for reservation ID: {reservation.id}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 p-4 border rounded-md bg-muted/30 shadow-sm">
            <h4 className="text-lg font-semibold mb-3 text-foreground flex items-center">
              <FileText className="mr-2 h-5 w-5 text-primary" /> Reservation For: {reservation.guestName}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <p className="flex items-center"><Phone className="mr-2 h-4 w-4 text-muted-foreground" /> {reservation.guestPhone}</p>
              {reservation.guestEmail && <p className="flex items-center"><Mail className="mr-2 h-4 w-4 text-muted-foreground" /> {reservation.guestEmail}</p>}
              <p className="flex items-center col-span-full sm:col-span-1"><HotelIconLucide className="mr-2 h-4 w-4 text-muted-foreground" /> {reservation.tripSummary || 'N/A'}</p>
              <p className="flex items-center"><CalendarDays className="mr-2 h-4 w-4 text-muted-foreground" /> {format(new Date(reservation.reservationDate as Date), 'PPp')}</p>
              
              {reservation.requestedRooms && reservation.requestedRooms.length > 0 && (
                 <div className="col-span-full space-y-1">
                    <strong className="flex items-center"><BedDouble className="mr-2 h-4 w-4 text-muted-foreground" />Requested Rooms:</strong>
                    <ul className="list-disc list-inside ml-6">
                        {reservation.requestedRooms.map(rr => (
                            <li key={rr.roomTypeId}>{rr.numberOfRooms}x {rr.roomTypeName || `Room ID ${rr.roomTypeId}`}</li>
                        ))}
                    </ul>
                 </div>
              )}
              {reservation.selectedExtraFees && reservation.selectedExtraFees.length > 0 && (
                <div className="col-span-full space-y-1">
                  <strong className="flex items-center"><Tag className="mr-2 h-4 w-4 text-muted-foreground" />Selected Extras:</strong>
                  <ul className="list-disc list-inside ml-6">
                    {reservation.selectedExtraFees.map(ef => (
                      <li key={ef.id}>{ef.name} (for {ef.numberOfGuestsForFee} guests, EGP {ef.pricePerPerson.toFixed(2)}/person)</li>
                    ))}
                  </ul>
                </div>
              )}
              {reservation.numberOfGuests && <p className="flex items-center"><Users2Icon className="mr-2 h-4 w-4 text-muted-foreground" /> {reservation.numberOfGuests} Guests</p>}
              <p className="flex items-center col-span-full sm:col-span-1"><DollarSign className="mr-2 h-4 w-4 text-muted-foreground" /> Est. Total: EGP {reservation.totalCalculatedPrice?.toFixed(2) || '0.00'}</p>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reservation Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {reservationStatusEnum.options.map(statusValue => (
                           <SelectItem key={statusValue} value={statusValue}>
                             {statusValue.charAt(0).toUpperCase() + statusValue.slice(1)}
                           </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {watchedStatus === 'confirmed' && (
                <FormField
                  control={form.control}
                  name="depositAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center"><DollarSign className="mr-2 h-4 w-4 text-primary" /> Deposit Amount</FormLabel>
                      <FormControl>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">EGP</span>
                            <Input 
                                type="number" 
                                placeholder="Enter deposit amount" 
                                {...field} 
                                className="pl-10"
                                onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                                value={field.value === null || field.value === undefined ? '' : field.value}
                            />
                        </div>
                      </FormControl>
                      <FormDescription>Enter the deposit amount paid by the guest.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Admin Notes</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Add internal notes about this reservation..." {...field} rows={4} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end space-x-3 pt-4">
                <Button type="button" variant="outline" onClick={() => router.back()} disabled={formSubmitLoading}>
                  Cancel
                </Button>
                <Button type="submit" disabled={formSubmitLoading || dataLoading}>
                  <Save className="mr-2 h-4 w-4" />
                  {formSubmitLoading ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default EditReservationPage;
