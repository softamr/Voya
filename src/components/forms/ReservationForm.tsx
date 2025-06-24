
"use client";

import type { Dispatch, SetStateAction } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { DialogHeader, DialogTitle, DialogDescription as DialogDesc, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import type { Hotel, TripDate, RoomType, TripDateRoomAvailability, RequestedRoomItem, ExtraFeeConfig, SelectedExtraFee, InitialReservation } from '@/lib/types';
import { useState, useEffect } from 'react';
import { Loader2, BedDouble, Users, Bus, ShoppingCart, Tag } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { addDoc, collection, serverTimestamp, doc } from 'firebase/firestore'; // Added doc
import { db } from '@/lib/firebase';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext'; 
import { USER_ROLES } from '@/lib/constants'; // Import USER_ROLES

const reservationSchema = z.object({
  guestName: z.string().min(2, { message: "Guest name must be at least 2 characters." }),
  guestPhone: z.string().min(7, { message: "Please enter a valid phone number." }),
  guestEmail: z.string().email({ message: "Please enter a valid email address." }).optional().or(z.literal('')),
  numberOfGuests: z.coerce.number().int().min(1, { message: "At least one guest is required." }),
  requestedRooms: z.array(
    z.object({
      roomTypeId: z.string(),
      roomTypeName: z.string().optional(),
      pricePerPerson: z.number().optional(), 
      capacity: z.number().optional(), 
      numberOfRooms: z.coerce.number().int().min(0, "Number of rooms must be non-negative."),
    })
  ).optional(),
  selectedExtraFees: z.array(
    z.object({
      feeId: z.string(), // Corresponds to ExtraFeeConfig.id
      numberOfGuestsForFee: z.coerce.number().int().min(1, "Number of guests for fee must be at least 1."),
    })
  ).optional(),
  numberOfTransportationSeats: z.coerce.number().int().min(0, "Number of seats must be non-negative.").optional(),
});

type ReservationFormValues = z.infer<typeof reservationSchema>;

interface ReservationFormProps {
  trip: TripDate;
  hotel: Hotel;
  masterRoomTypes: RoomType[];
  onFormSubmitSuccess: () => void;
}

type FormRoomOption = RequestedRoomItem & { capacity: number };

export default function ReservationForm({ trip, hotel, masterRoomTypes, onFormSubmitSuccess }: ReservationFormProps) {
  const { toast } = useToast();
  const { user: authUser } = useAuth(); // Get the authenticated user
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [calculatedTotal, setCalculatedTotal] = useState(0);

  const availableRoomOptionsForTrip: FormRoomOption[] = (trip.availableRoomsByType || [])
    .map(avail => {
      const roomDetail = masterRoomTypes.find(rt => rt.id === avail.roomTypeId);
      return roomDetail ? {
        roomTypeId: avail.roomTypeId,
        roomTypeName: roomDetail.name,
        pricePerPerson: avail.pricePerPerson,
        capacity: roomDetail.capacity,
        numberOfRooms: 0
      } : null;
    })
    .filter(Boolean) as FormRoomOption[];

  const form = useForm<ReservationFormValues>({
    resolver: zodResolver(reservationSchema),
    defaultValues: {
      guestName: '',
      guestPhone: '',
      guestEmail: '',
      numberOfGuests: 1,
      requestedRooms: availableRoomOptionsForTrip.map(opt => ({ 
          roomTypeId: opt.roomTypeId,
          roomTypeName: opt.roomTypeName,
          pricePerPerson: opt.pricePerPerson,
          capacity: opt.capacity,
          numberOfRooms: 0,
      })),
      selectedExtraFees: [],
      numberOfTransportationSeats: 0,
    },
  });
  
  const { fields: roomFields, replace: replaceRoomFields } = useFieldArray({
    control: form.control,
    name: "requestedRooms",
  });

  const watchedFormValues = form.watch(); 

  useEffect(() => {
    let currentRoomTotal = 0;
    if (watchedFormValues.requestedRooms) {
      watchedFormValues.requestedRooms.forEach((formRoom) => {
        if (formRoom.numberOfRooms > 0) {
          const tripRoomOption = availableRoomOptionsForTrip.find(
            (opt) => opt.roomTypeId === formRoom.roomTypeId
          );
          if (tripRoomOption && tripRoomOption.pricePerPerson !== undefined && tripRoomOption.capacity !== undefined) {
            currentRoomTotal += formRoom.numberOfRooms * tripRoomOption.pricePerPerson * tripRoomOption.capacity;
          }
        }
      });
    }

    const currentTransportationTotal = (watchedFormValues.numberOfTransportationSeats || 0) * (trip.transportationPricePerPerson || 0);
    
    let currentExtraFeesTotal = 0;
    if (watchedFormValues.selectedExtraFees && trip.extraFees) {
        watchedFormValues.selectedExtraFees.forEach(selectedFee => {
            const feeConfig = trip.extraFees?.find(ef => ef.id === selectedFee.feeId);
            if (feeConfig) {
                currentExtraFeesTotal += feeConfig.pricePerPerson * (selectedFee.numberOfGuestsForFee || 0);
            }
        });
    }

    setCalculatedTotal(currentRoomTotal + currentTransportationTotal + currentExtraFeesTotal);

  }, [watchedFormValues, trip.transportationPricePerPerson, trip.extraFees, availableRoomOptionsForTrip]);


  useEffect(() => {
     const remappedOptions: FormRoomOption[] = (trip.availableRoomsByType || [])
        .map(avail => {
            const roomDetail = masterRoomTypes.find(rt => rt.id === avail.roomTypeId);
            const existingFormRoom = form.getValues("requestedRooms")?.find(r => r.roomTypeId === avail.roomTypeId);
            const currentNumberOfRooms = existingFormRoom?.numberOfRooms || 0;
            return roomDetail ? {
                roomTypeId: avail.roomTypeId,
                roomTypeName: roomDetail.name,
                pricePerPerson: avail.pricePerPerson,
                capacity: roomDetail.capacity,
                numberOfRooms: currentNumberOfRooms
            } : null;
        })
        .filter(Boolean) as FormRoomOption[];
    replaceRoomFields(remappedOptions.map(opt => ({...opt})));
  }, [trip, masterRoomTypes, form, replaceRoomFields]);


  const onSubmit = async (data: ReservationFormValues) => {
    setIsSubmitting(true);
    
    const finalRequestedRooms = data.requestedRooms
      ?.filter(room => room.numberOfRooms > 0)
      .map(room => ({ 
        roomTypeId: room.roomTypeId,
        roomTypeName: room.roomTypeName,
        numberOfRooms: room.numberOfRooms,
      }));

    const finalSelectedExtraFees: SelectedExtraFee[] = [];
    if (data.selectedExtraFees && trip.extraFees) {
        data.selectedExtraFees.forEach(formFee => {
            const feeConfig = trip.extraFees?.find(ef => ef.id === formFee.feeId);
            if (feeConfig) {
                finalSelectedExtraFees.push({
                    id: feeConfig.id, 
                    name: feeConfig.name,
                    pricePerPerson: feeConfig.pricePerPerson,
                    numberOfGuestsForFee: formFee.numberOfGuestsForFee,
                });
            }
        });
    }

    const reservationDataToSave = {
      userId: authUser?.uid || null, // Add userId
      guestName: data.guestName,
      guestPhone: data.guestPhone,
      guestEmail: data.guestEmail || null,
      numberOfGuests: data.numberOfGuests,
      requestedRooms: finalRequestedRooms || [],
      selectedExtraFees: finalSelectedExtraFees,
      numberOfTransportationSeats: data.numberOfTransportationSeats || 0,
      tripDateId: trip.id,
      hotelId: hotel.id,
      destinationId: hotel.destinationId, 
      reservationDate: serverTimestamp(),
      status: 'pending' as InitialReservation['status'],
      totalCalculatedPrice: calculatedTotal, 
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    try {
      const reservationRef = await addDoc(collection(db, "reservations"), reservationDataToSave);
      
      // Create Notification
      const notificationMessage = `New reservation from ${data.guestName} for ${hotel.name}.`;
      await addDoc(collection(db, "notifications"), {
        message: notificationMessage,
        link: `/admin/reservations/view/${reservationRef.id}`,
        timestamp: serverTimestamp(),
        type: 'new_reservation',
        reservationId: reservationRef.id,
        targetRoles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.SALES],
        // isReadBy: [], // Initialize if you implement per-user read status
      });
      
      toast({
        title: "Reservation Requested!",
        description: `Your request for ${hotel.name} has been submitted. We'll contact you shortly. Estimated total: EGP ${calculatedTotal.toFixed(2)}`,
      });
      onFormSubmitSuccess(); 
      form.reset({
          guestName: '',
          guestPhone: '',
          guestEmail: '',
          numberOfGuests: 1,
          requestedRooms: availableRoomOptionsForTrip.map(r => ({ ...r, numberOfRooms: 0 })),
          selectedExtraFees: [],
          numberOfTransportationSeats: 0,
      });
    } catch (error) {
      console.error("Error submitting reservation:", error);
      toast({
        title: "Submission Failed",
        description: "Could not submit your reservation request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentSelectedFeesArray = form.watch('selectedExtraFees') || [];

  return (
    <>
      <DialogHeader>
        <DialogTitle>Request Reservation: {hotel.name}</DialogTitle>
        <DialogDesc>
          Fill out the form to request your reservation. We'll contact you to confirm. Trip: {format(new Date(trip.startDate as Date), "MMM d")} - {format(new Date(trip.endDate as Date), "MMM d, yyyy")}
        </DialogDesc>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2 max-h-[70vh] overflow-y-auto pr-2">
          <FormField
            control={form.control}
            name="guestName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full Name</FormLabel>
                <FormControl><Input placeholder="Your full name" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="guestPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl><Input type="tel" placeholder="Your phone number" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="guestEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email (Optional)</FormLabel>
                  <FormControl><Input type="email" placeholder="Your email address" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
           <FormField
              control={form.control}
              name="numberOfGuests"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center"><Users className="mr-2 h-4 w-4" /> Total Number of Guests</FormLabel>
                  <FormControl>
                    <Input type="number" min="1" placeholder="e.g., 2" {...field} 
                      onChange={e => {
                        const newGuestCount = parseInt(e.target.value,10) || 1;
                        field.onChange(newGuestCount);
                        // Update existing selected fees guest counts if they exceed new total
                        const currentExtraFees = form.getValues('selectedExtraFees') || [];
                        const updatedExtraFees = currentExtraFees.map(fee => ({
                          ...fee,
                          numberOfGuestsForFee: Math.min(fee.numberOfGuestsForFee, newGuestCount)
                        }));
                        form.setValue('selectedExtraFees', updatedExtraFees);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

          <Separator />
          <h3 className="text-md font-semibold flex items-center"><BedDouble className="mr-2 h-5 w-5 text-primary" />Room Selection</h3>
            {roomFields.map((fieldItem, index) => {
                const roomOptionDetails = availableRoomOptionsForTrip.find(opt => opt.roomTypeId === fieldItem.roomTypeId);
                if (!roomOptionDetails) return null; 

                return (
                    <FormField
                        key={fieldItem.id} 
                        control={form.control}
                        name={`requestedRooms.${index}.numberOfRooms`}
                        render={({ field }) => (
                        <FormItem className="grid grid-cols-3 items-center gap-x-4 gap-y-1 border-b pb-3">
                            <FormLabel className="col-span-2">
                            {roomOptionDetails.roomTypeName}
                            <span className="text-xs text-muted-foreground block">
                                (EGP {roomOptionDetails.pricePerPerson?.toFixed(2) || 'N/A'}/person, Capacity: {roomOptionDetails.capacity})
                            </span>
                            </FormLabel>
                            <FormControl>
                            <Input 
                                type="number" 
                                min="0" 
                                placeholder="Qty" 
                                {...field} 
                                onChange={e => field.onChange(parseInt(e.target.value, 10) || 0)}
                                />
                            </FormControl>
                            <FormMessage className="col-span-3" />
                        </FormItem>
                        )}
                    />
                );
            })}
            {(!roomFields || roomFields.length === 0) && <p className="text-sm text-muted-foreground">No room types are currently configured for this specific trip package. Ensure master room types are defined and hotel inventory is set.</p>}

          <Separator />
           <h3 className="text-md font-semibold flex items-center"><Bus className="mr-2 h-5 w-5 text-primary" />Transportation</h3>
           <FormField
              control={form.control}
              name="numberOfTransportationSeats"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Number of Transportation Seats (Optional)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min="0" 
                      placeholder="e.g., 2" 
                      {...field} 
                      onChange={e => field.onChange(parseInt(e.target.value,10) || 0)}
                    />
                  </FormControl>
                  <FormDescription>
                    Only specify if transportation is part of your package and you need seats. Price per seat: EGP {trip.transportationPricePerPerson?.toFixed(2) || 'N/A'}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          
          {trip.extraFees && Array.isArray(trip.extraFees) && trip.extraFees.length > 0 && (
            <div className="space-y-3">
              <Separator />
              <div className="space-y-1">
                 <h3 className="text-md font-semibold flex items-center"><Tag className="mr-2 h-5 w-5 text-primary" />Optional Extras</h3>
                 <FormDescription>Select services and specify number of guests for each.</FormDescription>
              </div>
              {(trip.extraFees || []).map((feeConfig) => {
                const feeSelectionIndex = currentSelectedFeesArray.findIndex(sf => sf.feeId === feeConfig.id);
                const isSelected = feeSelectionIndex !== -1;
                
                return (
                  <div key={feeConfig.id} className="p-3 border rounded-md bg-muted/30 space-y-2">
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        id={`extra-fee-checkbox-${feeConfig.id}`}
                        checked={isSelected}
                        onCheckedChange={(checked) => {
                          const currentFees = form.getValues('selectedExtraFees') || [];
                          if (checked) {
                            form.setValue('selectedExtraFees', [
                              ...currentFees,
                              { feeId: feeConfig.id, numberOfGuestsForFee: form.getValues('numberOfGuests') || 1 }
                            ], { shouldValidate: true });
                          } else {
                            form.setValue('selectedExtraFees', currentFees.filter(sf => sf.feeId !== feeConfig.id), { shouldValidate: true });
                          }
                        }}
                        aria-labelledby={`extra-fee-label-${feeConfig.id}`}
                      />
                      <FormLabel htmlFor={`extra-fee-checkbox-${feeConfig.id}`} id={`extra-fee-label-${feeConfig.id}`} className="font-normal cursor-pointer flex-grow">
                        {feeConfig.name} - <span className="text-primary font-semibold">EGP {feeConfig.pricePerPerson.toFixed(2)}/person</span>
                        {feeConfig.description && <p className="text-xs text-muted-foreground mt-0.5">{feeConfig.description}</p>}
                      </FormLabel>
                    </div>

                    {isSelected && (
                       <FormField
                        control={form.control}
                        // IMPORTANT: The name needs to correctly target the item in the array
                        name={`selectedExtraFees.${feeSelectionIndex}.numberOfGuestsForFee`}
                        render={({ field }) => (
                          <FormItem className="pl-7">
                            <FormLabel htmlFor={`guests-for-fee-${feeConfig.id}`} className="text-xs">Number of Guests for this extra:</FormLabel>
                            <FormControl>
                              <Input
                                id={`guests-for-fee-${feeConfig.id}`}
                                type="number"
                                {...field}
                                min="1"
                                max={form.getValues('numberOfGuests')}
                                onChange={e => {
                                    const val = parseInt(e.target.value, 10);
                                    const totalGuests = form.getValues('numberOfGuests') || 1;
                                    field.onChange(Math.min(Math.max(1, val || 1), totalGuests));
                                }}
                                className="h-8 w-24 text-sm"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>
                );
              })}
              {form.formState.errors.selectedExtraFees && <FormMessage className="mt-2">{form.formState.errors.selectedExtraFees.message || form.formState.errors.selectedExtraFees.root?.message}</FormMessage>}
            </div>
          )}
          
          <Separator />
          <div className="mt-4 pt-4 border-t">
            <h3 className="text-lg font-semibold flex items-center mb-2">
              <ShoppingCart className="mr-2 h-5 w-5 text-primary" /> Estimated Total
            </h3>
            <p className="text-2xl font-bold text-primary">
              EGP {calculatedTotal.toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground">
              This is an estimate. Final price will be confirmed upon contact.
            </p>
          </div>
          
          <DialogFooter className="pt-6">
            <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSubmitting ? "Submitting..." : "Submit Request"}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
}
