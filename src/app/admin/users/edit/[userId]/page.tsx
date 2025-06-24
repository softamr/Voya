
"use client";

import type { NextPage } from 'next';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, UserCog, Eye, EyeOff, Save } from 'lucide-react';
import { USER_ROLES, type UserRole } from '@/lib/constants';
import type { UserProfile } from '@/lib/types';
import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';

const editUserSchema = z.object({
  displayName: z.string().min(2, { message: "Display name must be at least 2 characters." }),
  email: z.string().email({ message: "Invalid email address." }), // Email is typically not changed easily after creation
  role: z.nativeEnum(USER_ROLES),
  password: z.string().min(8, { message: "Password must be at least 8 characters." }).optional().or(z.literal('')),
  confirmPassword: z.string().optional().or(z.literal('')),
}).refine(data => {
  if (data.password || data.confirmPassword) { 
    return data.password === data.confirmPassword;
  }
  return true;
}, {
  message: "Passwords don't match.",
  path: ["confirmPassword"],
}).refine(data => {
    if (data.password && !data.confirmPassword) return false; 
    if (!data.password && data.confirmPassword) return false; 
    return true;
}, {
    message: "Both password fields must be filled if changing password.",
    path: ["confirmPassword"],
});


type EditUserFormValues = z.infer<typeof editUserSchema>;

const EditUserPage: NextPage = () => {
  const router = useRouter();
  const { userId } = useParams<{ userId: string }>();
  const { toast } = useToast();

  const [formSubmitLoading, setFormSubmitLoading] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const form = useForm<EditUserFormValues>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      displayName: '',
      email: '', // Email will be read-only
      role: USER_ROLES.AUTHENTICATED_USER,
      password: '',
      confirmPassword: '',
    },
  });

  useEffect(() => {
    setDataLoading(true);
    if (!userId) {
      toast({ title: "Error", description: "User ID is missing.", variant: "destructive" });
      router.replace('/admin/users');
      return;
    }
    const fetchUser = async () => {
      try {
        const userDocRef = doc(db, 'users', userId);
        const docSnap = await getDoc(userDocRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          const fetchedUser: UserProfile = {
            uid: docSnap.id,
            email: data.email,
            displayName: data.displayName,
            role: data.role,
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : data.createdAt,
          };
          setUser(fetchedUser);
          form.reset({
            displayName: fetchedUser.displayName || '',
            email: fetchedUser.email || '', // Populate email but make it read-only
            role: fetchedUser.role,
            password: '', 
            confirmPassword: '',
          });
        } else {
          toast({ title: "Error", description: "User not found.", variant: "destructive" });
          router.replace('/admin/users');
        }
      } catch (error) {
        console.error("Error fetching user:", error);
        toast({ title: "Error Fetching User", description: (error as Error).message, variant: "destructive" });
        router.replace('/admin/users');
      } finally {
        setDataLoading(false);
      }
    };
    fetchUser();
  }, [userId, form, router, toast]);

  const onSubmit = async (data: EditUserFormValues) => {
    if (!userId) {
      toast({ title: "Error", description: "User ID is missing for update.", variant: "destructive" });
      return;
    }
    setFormSubmitLoading(true);
    
    const dataToUpdate: Partial<UserProfile> & { updatedAt?: Timestamp } = {
      displayName: data.displayName,
      role: data.role,
      updatedAt: serverTimestamp(),
      // Email is not updated here. Password change is a mock.
    };

    try {
      const userDocRef = doc(db, 'users', userId);
      await updateDoc(userDocRef, dataToUpdate);
      
      toast({
        title: "User Profile Updated",
        description: `User ${data.displayName}'s profile has been updated in Firestore.`,
      });
      if (data.password) {
        toast({
          title: "Password Change (Mock)",
          description: "Password change functionality is mocked and not applied to Firebase Auth.",
          variant: "default"
        });
      }
      router.push('/admin/users');
    } catch (error) {
        console.error("Error updating user profile:", error);
        toast({ title: "Update Failed", description: (error as Error).message, variant: "destructive" });
    } finally {
        setFormSubmitLoading(false);
    }
  };

  if (dataLoading) {
    return (
      <div className="space-y-6">
        <Button variant="outline" size="sm" asChild className="mb-4">
          <Link href="/admin/users">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to User List
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
            <Skeleton className="h-10 w-full" />
            <div className="flex justify-end space-x-3 pt-4">
                <Skeleton className="h-10 w-24" />
                <Skeleton className="h-10 w-24" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) return (
    <div className="space-y-6 text-center">
        <p className="text-muted-foreground">User data could not be loaded or was not found.</p>
         <Button variant="outline" size="sm" asChild className="mt-4">
          <Link href="/admin/users">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to User List
          </Link>
        </Button>
    </div>
  );

  return (
    <div className="space-y-6">
      <Button variant="outline" size="sm" asChild className="mb-4">
        <Link href="/admin/users">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to User List
        </Link>
      </Button>

      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl font-headline flex items-center">
            <UserCog className="mr-3 h-6 w-6 text-primary" /> Edit User: {user.displayName}
          </CardTitle>
          <CardDescription>Modify user details and role. Email is read-only. Password change is mocked.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address (Read-only)</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="user@example.com" {...field} readOnly className="bg-muted/50 cursor-not-allowed"/>
                    </FormControl>
                    <FormDescription>Email address cannot be changed from this panel.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.values(USER_ROLES).filter(role => role !== USER_ROLES.PUBLIC_USER).map(role => (
                          <SelectItem key={role} value={role}>
                            {role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password (Mocked)</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input type={showPassword ? "text" : "password"} placeholder="Leave blank to keep current" {...field} />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </FormControl>
                    <FormDescription>
                      Password changes are mocked and do not affect Firebase Auth.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm New Password (Mocked)</FormLabel>
                     <FormControl>
                      <div className="relative">
                        <Input type={showConfirmPassword ? "text" : "password"} placeholder="Confirm new password" {...field} />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
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
                  {formSubmitLoading ? "Saving Changes..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default EditUserPage;
    
