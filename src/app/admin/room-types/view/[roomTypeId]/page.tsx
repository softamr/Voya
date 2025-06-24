
"use client";

import type { NextPage } from 'next';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardFooter, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Edit3, BedDouble, Users, CalendarDays, Info } from 'lucide-react';
import type { RoomType } from '@/lib/types';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { db } from '@/lib/firebase';
import { doc, getDoc, Timestamp } from 'firebase/firestore';

const ViewRoomTypePage: NextPage = () => {
  const router = useRouter();
  const { roomTypeId } = useParams<{ roomTypeId: string }>();
  const { toast } = useToast();

  const [roomType, setRoomType] = useState<RoomType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roomTypeId) {
      toast({ title: "Error", description: "Room Type ID is missing.", variant: "destructive" });
      router.replace('/admin/room-types');
      return;
    }
    setLoading(true);
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
        } else {
          toast({ title: "Error", description: "Room type not found. Check ID and security rules.", variant: "destructive" });
          router.replace('/admin/room-types');
        }
      } catch (error) {
        console.error("Error fetching room type for view:", error);
        toast({ title: "Error fetching room type", description: (error as Error).message, variant: "destructive" });
        router.replace('/admin/room-types');
      } finally {
        setLoading(false);
      }
    };

    fetchRoomType();
  }, [roomTypeId, router, toast]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-40 mb-4" />
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <Skeleton className="h-8 w-3/5 mb-2" />
            <Skeleton className="h-5 w-1/4" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <div className="flex items-center pt-2"><Skeleton className="h-6 w-6 mr-3" /> <Skeleton className="h-5 w-1/3" /></div>
          </CardContent>
          <CardFooter className="flex justify-end space-x-2">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-32" />
          </CardFooter>
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

      <Card className="max-w-2xl mx-auto shadow-xl border">
        <CardHeader className="pb-4">
          <CardTitle className="text-3xl font-headline flex items-center">
            <BedDouble className="mr-3 h-8 w-8 text-primary" /> {roomType.name}
          </CardTitle>
          <CardDescription className="text-lg text-muted-foreground pt-1 flex items-center">
             <Users className="mr-2 h-5 w-5 text-primary/80" /> Capacity: {roomType.capacity} guest(s)
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2 space-y-6">
          <div>
             <h3 className="text-lg font-semibold flex items-center mb-1 text-primary">
                <Info className="mr-2 h-5 w-5" />Details
            </h3>
            <p className="text-base text-foreground/80 leading-relaxed whitespace-pre-line">
              {roomType.description}
            </p>
          </div>
          
          {roomType.createdAt && (
            <div className="text-sm text-muted-foreground flex items-center">
              <CalendarDays className="mr-2 h-4 w-4" />
              Date Added: {new Date(roomType.createdAt).toLocaleDateString()}
            </div>
          )}
          
          <div className="mt-6 pt-4 border-t">
            <h3 className="text-xl font-semibold mb-2 text-primary">Hotel Assignment</h3>
            <p className="text-muted-foreground">
              Information about which hotels offer the "{roomType.name}" room type and their specific inventory counts would be displayed here. (This is a placeholder for future functionality).
            </p>
          </div>

        </CardContent>
        <CardFooter className="flex justify-end space-x-2 border-t pt-6">
            <Button variant="outline" onClick={() => router.back()}>
                Close
            </Button>
            <Button asChild>
                <Link href={`/admin/room-types/edit/${roomType.id}`}>
                    <Edit3 className="mr-2 h-4 w-4" /> Edit Room Type
                </Link>
            </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default ViewRoomTypePage;
