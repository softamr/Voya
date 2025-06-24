
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Edit3, Save, BedDouble } from 'lucide-react';
import type { RoomType } from '@/lib/types';
import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';

const roomTypeSchema = z.object({
  name: z.string().min(2, { message: "Room type name must be at least 2 characters." }),
  description: z.string().min(10, { message: "Description must be at least 10 characters." }),
  capacity: z.coerce.number().int().positive({ message: "Capacity must be a positive number." }),
});

type RoomTypeFormValues = z.infer<typeof roomTypeSchema>;

const EditRoomTypePage: NextPage = () => {
  const router = useRouter();
  const { roomTypeId } = useParams<{ roomTypeId: string }>();
  const { toast } = useToast();

  const [formSubmitLoading, setFormSubmitLoading] = useState(false);
  const [roomType, setRoomType] = useState<RoomType | null>(null);
  const [dataLoading, setDataLoading] = useState(true);

  const form = useForm<RoomTypeFormValues>({
    resolver: zodResolver(roomTypeSchema),
  });

  useEffect(() => {
    if (!roomTypeId) {
      toast({ title: "Error", description: "Room Type ID is missing.", variant: "destructive" });
      router.replace('/admin/room-types');
      return;
    }
    setDataLoading(true);
    const fetchRoomType = async () => {
      try {
        const rtDocRef = doc(db, "roomTypes", roomTypeId);
        const docSnap = await getDoc(rtDocRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          const fetchedRoomType: RoomType = {
            id: docSnap.id,
            name: data.name,
            description: data.description,
            capacity: data.capacity,
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : data.createdAt,
            updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : data.updatedAt,
          };
          setRoomType(fetchedRoomType);
          form.reset({
            name: fetchedRoomType.name || '',
            description: fetchedRoomType.description || '',
            capacity: fetchedRoomType.capacity || 1,
          });
        } else {
          toast({ title: "Error", description: "Room type not found. Check ID and security rules.", variant: "destructive" });
          router.replace('/admin/room-types');
        }
      } catch (error) {
        console.error("Error fetching room type for edit:", error);
        toast({ title: "Error fetching room type", description: (error as Error).message, variant: "destructive" });
        router.replace('/admin/room-types');
      } finally {
        setDataLoading(false);
      }
    };
    fetchRoomType();
  }, [roomTypeId, form, router, toast]);

  const onSubmit = async (data: RoomTypeFormValues) => {
    if (!roomTypeId) {
      toast({ title: "Error", description: "Room Type ID is missing for update.", variant: "destructive" });
      return;
    }
    setFormSubmitLoading(true);
    try {
      const rtDocRef = doc(db, "roomTypes", roomTypeId);
      await updateDoc(rtDocRef, {
        ...data,
        updatedAt: serverTimestamp(),
      });
      
      toast({
        title: "Room Type Updated",
        description: `Room type "${data.name}" has been successfully updated.`,
      });
      setFormSubmitLoading(false);
      router.push('/admin/room-types');
    } catch (error) {
        console.error("Error updating room type:", error);
        toast({ title: "Update Failed", description: (error as Error).message, variant: "destructive" });
        setFormSubmitLoading(false);
    }
  };

  if (dataLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-36 mb-4" />
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <Skeleton className="h-8 w-3/5 mb-2" />
            <Skeleton className="h-4 w-4/5" />
          </CardHeader>
          <CardContent className="space-y-6">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            <div className="flex justify-end space-x-3 pt-4">
                <Skeleton className="h-10 w-24" />
                <Skeleton className="h-10 w-28" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!roomType) return (
     <div className="space-y-6 text-center">
        <p className="text-muted-foreground">Room type data could not be loaded or was not found.</p>
         <Button variant="outline" size="sm" asChild className="mt-4">
          <Link href="/admin/room-types">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Room Type List
          </Link>
        </Button>
    </div>
  );


  return (
    <div className="space-y-6">
      <Button variant="outline" size="sm" asChild className="mb-4">
        <Link href="/admin/room-types">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Room Type List
        </Link>
      </Button>

      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl font-headline flex items-center">
            <BedDouble className="mr-3 h-6 w-6 text-primary" /> Edit Room Type: {roomType.name}
          </CardTitle>
          <CardDescription>Modify the details of this room type.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Room Type Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Deluxe King Suite" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Describe this room type and its features..." {...field} rows={3} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="capacity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Capacity (Number of Guests)</FormLabel>
                    <FormControl>
                      <Input type="number" min="1" placeholder="e.g., 2" {...field}
                       onChange={event => field.onChange(+event.target.value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end space-x-3 pt-4">
                <Button type="button" variant="outline" onClick={() => router.back()} disabled={formSubmitLoading}>
                  Cancel
                </Button>
                <Button type="submit" disabled={formSubmitLoading}>
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

export default EditRoomTypePage;
