
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
import { ArrowLeft, Edit3, Save } from 'lucide-react';
import type { Destination } from '@/lib/types';
import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';

const destinationSchema = z.object({
  name: z.string().min(2, { message: "Destination name must be at least 2 characters." }),
  name_ar: z.string().optional().or(z.literal('')),
  description: z.string().min(10, { message: "Description must be at least 10 characters." }),
  description_ar: z.string().optional().or(z.literal('')),
  imageUrl: z.string().url({ message: "Please enter a valid image URL." }).optional().or(z.literal('')),
  dataAiHint: z.string().max(50, {message: "AI Hint should be brief, max 50 chars."}).optional().or(z.literal('')),
});

type DestinationFormValues = z.infer<typeof destinationSchema>;

const EditDestinationPage: NextPage = () => {
  const router = useRouter();
  const { destinationId } = useParams<{ destinationId: string }>();
  const { toast } = useToast();
  
  const [formSubmitLoading, setFormSubmitLoading] = useState(false);
  const [destination, setDestination] = useState<Destination | null>(null);
  const [dataLoading, setDataLoading] = useState(true);

  const form = useForm<DestinationFormValues>({
    resolver: zodResolver(destinationSchema),
    defaultValues: {
      name: '',
      name_ar: '',
      description: '',
      description_ar: '',
      imageUrl: '',
      dataAiHint: '',
    },
  });

  useEffect(() => {
    if (!destinationId) {
        toast({ title: "Error", description: "Destination ID is missing.", variant: "destructive" });
        router.replace('/admin/destinations');
        return;
    }

    setDataLoading(true);
    const fetchDestination = async () => {
      try {
        const destDocRef = doc(db, "destinations", destinationId);
        const docSnap = await getDoc(destDocRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          const fetchedDestination: Destination = {
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
          setDestination(fetchedDestination);
          form.reset({
            name: fetchedDestination.name || '',
            name_ar: fetchedDestination.name_ar || '',
            description: fetchedDestination.description || '',
            description_ar: fetchedDestination.description_ar || '',
            imageUrl: fetchedDestination.imageUrl || '',
            dataAiHint: fetchedDestination.dataAiHint || '',
          });
        } else {
          toast({ title: "Error", description: "Destination not found in Firestore. Check ID and security rules.", variant: "destructive" });
          router.replace('/admin/destinations');
        }
      } catch (error) {
        console.error("Error fetching destination for edit:", error);
        toast({ title: "Error fetching destination", description: (error as Error).message, variant: "destructive" });
        router.replace('/admin/destinations');
      } finally {
        setDataLoading(false);
      }
    };

    fetchDestination();
  }, [destinationId, form, router, toast]);

  const onSubmit = async (data: DestinationFormValues) => {
    if (!destinationId) {
        toast({ title: "Error", description: "Destination ID is missing for update.", variant: "destructive" });
        return;
    }

    setFormSubmitLoading(true);
    try {
      const destDocRef = doc(db, "destinations", destinationId);
      await updateDoc(destDocRef, {
        ...data,
        updatedAt: serverTimestamp(),
      });
      
      toast({
        title: "Destination Updated",
        description: `Destination "${data.name}" has been successfully updated.`,
      });
      setFormSubmitLoading(false);
      router.push('/admin/destinations');
    } catch (error) {
        console.error("Error updating destination:", error);
        toast({ title: "Update Failed", description: (error as Error).message, variant: "destructive" });
        setFormSubmitLoading(false);
    }
  };

  if (dataLoading) {
    return (
      <div className="space-y-6">
        <Button variant="outline" size="sm" asChild className="mb-4">
          <Link href="/admin/destinations">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Destination List
          </Link>
        </Button>
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <Skeleton className="h-8 w-1/2 mb-2" />
            <Skeleton className="h-4 w-3/4" />
          </CardHeader>
          <CardContent className="space-y-6">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-10 w-full" />
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

  if (!destination) return (
     <div className="space-y-6">
        <p className="text-center text-muted-foreground">Destination data could not be loaded.</p>
         <Button variant="outline" size="sm" asChild className="mb-4">
          <Link href="/admin/destinations">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Destination List
          </Link>
        </Button>
    </div>
  );

  return (
    <div className="space-y-6">
      <Button variant="outline" size="sm" asChild className="mb-4">
        <Link href="/admin/destinations">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Destination List
        </Link>
      </Button>

      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl font-headline flex items-center">
            <Edit3 className="mr-3 h-6 w-6 text-primary" /> Edit Destination: {destination.name}
          </CardTitle>
          <CardDescription>Modify the details of this travel destination.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Destination Name (English)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Bali, Indonesia" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="name_ar"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Destination Name (Arabic) (Optional)</FormLabel>
                    <FormControl>
                      <Input dir="rtl" placeholder="مثال: بالي، إندونيسيا" {...field} />
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
                    <FormLabel>Description (English)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Describe this beautiful destination in English..." {...field} rows={4} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description_ar"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Arabic) (Optional)</FormLabel>
                    <FormControl>
                      <Textarea dir="rtl" placeholder="صف هذه الوجهة الجميلة باللغة العربية..." {...field} rows={4} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="imageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Image URL (Optional)</FormLabel>
                    <FormControl>
                      <Input type="url" placeholder="https://placehold.co/600x400.png" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dataAiHint"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Image AI Hint (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., beach sunset" {...field} />
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

export default EditDestinationPage;

