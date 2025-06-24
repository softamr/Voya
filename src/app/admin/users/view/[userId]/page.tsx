
"use client";

import type { NextPage } from 'next';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardFooter, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ArrowLeft, Edit2, Mail, ShieldCheck, CalendarDays } from 'lucide-react';
import type { UserProfile } from '@/lib/types';
import { USER_ROLES, type UserRole } from '@/lib/constants';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { db } from '@/lib/firebase';
import { doc, getDoc, Timestamp } from 'firebase/firestore';

const getInitials = (name?: string) => {
  if (!name) return 'U';
  const names = name.split(' ');
  if (names.length > 1) {
    return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
  }
  return names[0][0].toUpperCase();
};

const formatRole = (role: UserRole) => {
  return role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

const ViewUserPage: NextPage = () => {
  const router = useRouter();
  const { userId } = useParams<{ userId: string }>();
  const { toast } = useToast();

  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      toast({ title: "Error", description: "User ID is missing.", variant: "destructive" });
      router.replace('/admin/users');
      return;
    }
    setLoading(true);
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
        } else {
          toast({ title: "Error", description: "User not found.", variant: "destructive" });
          router.replace('/admin/users');
        }
      } catch (error) {
        console.error("Error fetching user details:", error);
        toast({ title: "Error Fetching User", description: (error as Error).message, variant: "destructive" });
        router.replace('/admin/users');
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [userId, router, toast]);

  if (loading) {
    return (
      <div className="space-y-6">
         <Skeleton className="h-9 w-36 mb-4" />
        <Card className="max-w-2xl mx-auto">
          <CardHeader className="items-center text-center">
            <Skeleton className="h-24 w-24 rounded-full mb-4" />
            <Skeleton className="h-7 w-48 mb-1" />
            <Skeleton className="h-5 w-64" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center">
                <Skeleton className="h-6 w-6 mr-3" /> <Skeleton className="h-5 w-40" />
            </div>
            <div className="flex items-center">
                <Skeleton className="h-6 w-6 mr-3" /> <Skeleton className="h-5 w-32" />
            </div>
             <div className="flex items-center">
                <Skeleton className="h-6 w-6 mr-3" /> <Skeleton className="h-5 w-28" />
            </div>
          </CardContent>
          <CardFooter className="flex justify-end space-x-2">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
          </CardFooter>
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

      <Card className="max-w-2xl mx-auto shadow-lg border">
        <CardHeader className="items-center text-center border-b pb-6">
          <Avatar className="h-24 w-24 mb-4 text-3xl">
            {/* <AvatarImage src={user.avatarUrl} alt={user.displayName} /> */}
            <AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
          </Avatar>
          <CardTitle className="text-3xl font-headline">{user.displayName || 'N/A'}</CardTitle>
          <CardDescription className="text-lg">{user.email}</CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center text-lg">
            <ShieldCheck className="mr-3 h-6 w-6 text-primary" />
            <strong>Role:</strong><span className="ml-2 text-muted-foreground">{formatRole(user.role)}</span>
          </div>
          <div className="flex items-center text-lg">
            <CalendarDays className="mr-3 h-6 w-6 text-primary" />
            <strong>Member Since:</strong><span className="ml-2 text-muted-foreground">{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}</span>
          </div>
          
          <div className="mt-6 pt-4 border-t">
            <h3 className="text-xl font-semibold mb-2 text-primary">Additional Information</h3>
            <p className="text-muted-foreground">Further user details like activity logs, assigned tasks, or reservation history could be displayed here.</p>
            <p className="text-xs text-muted-foreground mt-2">User UID: {user.uid}</p>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end space-x-2 border-t pt-6">
            <Button variant="outline" onClick={() => router.back()}>
                Close
            </Button>
            <Button asChild>
                <Link href={`/admin/users/edit/${user.uid}`}>
                    <Edit2 className="mr-2 h-4 w-4" /> Edit User
                </Link>
            </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default ViewUserPage;
    
