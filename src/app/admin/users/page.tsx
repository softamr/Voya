
"use client";

import type { NextPage } from 'next';
import Link from 'next/link';
import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MoreHorizontal, PlusCircle, Search, Edit2, Trash2, Eye, UserCog } from 'lucide-react';
import type { UserProfile } from '@/lib/types';
import { USER_ROLES, type UserRole } from '@/lib/constants';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { db } from '@/lib/firebase';
import { collection, query, onSnapshot, orderBy, Timestamp, doc, deleteDoc } from 'firebase/firestore';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

const getInitials = (name?: string) => {
  if (!name) return 'U';
  const names = name.split(' ');
  if (names.length > 1) {
    return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
  }
  return names[0][0].toUpperCase();
};

const formatRole = (role: UserRole, lang: 'en' | 'ar') => {
  const roleTranslations: Record<UserRole, { en: string, ar: string }> = {
    [USER_ROLES.SUPER_ADMIN]: { en: 'Super Admin', ar: 'مسؤول خارق' },
    [USER_ROLES.ADMIN]: { en: 'Admin', ar: 'مسؤول' },
    [USER_ROLES.SALES]: { en: 'Sales', ar: 'مبيعات' },
    [USER_ROLES.ACCOUNTANT]: { en: 'Accountant', ar: 'محاسب' },
    [USER_ROLES.SUPERVISOR]: { en: 'Supervisor', ar: 'مشرف' },
    [USER_ROLES.RECEPTIONIST]: { en: 'Receptionist', ar: 'موظف استقبال' },
    [USER_ROLES.AUTHENTICATED_USER]: { en: 'Authenticated User', ar: 'مستخدم مصادق عليه' },
    [USER_ROLES.PUBLIC_USER]: { en: 'Public User', ar: 'مستخدم عام' },
  };
  return roleTranslations[role]?.[lang] || role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

const AdminUsersPage: NextPage = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const { language, direction } = useLanguage();

  const translations = {
    en: {
      title: "User Management",
      description: "Manage user accounts, roles, and permissions.",
      addNewUser: "Add New User",
      userListTitle: "User List",
      userListDescription: "A list of all users in the system.",
      searchPlaceholder: "Search users by name, email, or role...",
      avatarHeader: "Avatar",
      displayNameHeader: "Display Name",
      emailHeader: "Email",
      roleHeader: "Role",
      createdAtHeader: "Created At",
      actionsHeader: "Actions",
      openMenuSr: "Open menu",
      actionsLabel: "Actions",
      viewDetails: "View Details",
      editUser: "Edit User",
      deleteProfile: "Delete Profile",
      noUsersFound: "No users found",
      matchingCriteria: " matching your criteria",
      confirmDeleteTitle: "Confirm Deletion",
      confirmDeleteMessage: (userName?: string) => `This will remove '${userName || 'user'}' from the list and attempt to delete their Firestore profile. The Firebase Authentication record will NOT be deleted by this action. Are you sure?`,
      userProfileDeleted: "User Profile Deleted",
      userProfileDeletedDesc: (userName?: string) => `User profile for '${userName || 'user'}' removed from Firestore. Auth record may still exist.`,
      errorDeletingProfile: "Error Deleting Firestore Profile",
      errorDeletingProfileDesc: (errorMsg: string) => errorMsg || "Could not delete the user's Firestore profile.",
      errorFetchingUsers: "Error Fetching Users",
      errorFetchingUsersDesc: "Could not load users from the database.",
      notAvailable: "N/A",
    },
    ar: {
      title: "إدارة المستخدمين",
      description: "إدارة حسابات المستخدمين والأدوار والأذونات.",
      addNewUser: "إضافة مستخدم جديد",
      userListTitle: "قائمة المستخدمين",
      userListDescription: "قائمة بجميع المستخدمين في النظام.",
      searchPlaceholder: "ابحث عن المستخدمين بالاسم أو البريد الإلكتروني أو الدور...",
      avatarHeader: "الصورة الرمزية",
      displayNameHeader: "الاسم المعروض",
      emailHeader: "البريد الإلكتروني",
      roleHeader: "الدور",
      createdAtHeader: "تاريخ الإنشاء",
      actionsHeader: "الإجراءات",
      openMenuSr: "فتح القائمة",
      actionsLabel: "الإجراءات",
      viewDetails: "عرض التفاصيل",
      editUser: "تعديل المستخدم",
      deleteProfile: "حذف الملف الشخصي",
      noUsersFound: "لم يتم العثور على مستخدمين",
      matchingCriteria: " يطابقون معايير البحث الخاصة بك",
      confirmDeleteTitle: "تأكيد الحذف",
      confirmDeleteMessage: (userName?: string) => `سيؤدي هذا إلى إزالة '${userName || 'المستخدم'}' من القائمة ومحاولة حذف ملفه الشخصي من Firestore. لن يتم حذف سجل مصادقة Firebase بواسطة هذا الإجراء. هل أنت متأكد؟`,
      userProfileDeleted: "تم حذف الملف الشخصي للمستخدم",
      userProfileDeletedDesc: (userName?: string) => `تمت إزالة الملف الشخصي للمستخدم '${userName || 'المستخدم'}' من Firestore. قد لا يزال سجل المصادقة موجودًا.`,
      errorDeletingProfile: "خطأ في حذف الملف الشخصي من Firestore",
      errorDeletingProfileDesc: (errorMsg: string) => errorMsg || "تعذر حذف الملف الشخصي للمستخدم من Firestore.",
      errorFetchingUsers: "خطأ في جلب المستخدمين",
      errorFetchingUsersDesc: "تعذر تحميل المستخدمين من قاعدة البيانات.",
      notAvailable: "غير متوفر",
    }
  };
  const currentTranslations = translations[language];


  useEffect(() => {
    setLoading(true);
    const usersQuery = query(collection(db, "users"), orderBy("displayName", "asc"));
    
    const unsubscribe = onSnapshot(usersQuery, (querySnapshot) => {
      const fetchedUsers: UserProfile[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toDate() : data.createdAt;
        
        fetchedUsers.push({ 
            uid: doc.id, 
            email: data.email,
            role: data.role,
            displayName: data.displayName,
            createdAt: createdAt,
        } as UserProfile);
      });
      setUsers(fetchedUsers);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching users: ", error);
      toast({
        title: currentTranslations.errorFetchingUsers,
        description: currentTranslations.errorFetchingUsersDesc,
        variant: "destructive",
      });
      setLoading(false);
    });

    return () => unsubscribe();
  }, [toast, language]);


  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value.toLowerCase());
  };

  const filteredUsers = useMemo(() => {
    return users.filter(user =>
      (user.displayName?.toLowerCase() || '').includes(searchTerm) ||
      (user.email?.toLowerCase() || '').includes(searchTerm) ||
      formatRole(user.role, language).toLowerCase().includes(searchTerm)
    );
  }, [users, searchTerm, language]);

  const handleDeleteUser = async (userId: string, userName?: string) => {
    if (confirm(currentTranslations.confirmDeleteMessage(userName))) {
      try {
        await deleteDoc(doc(db, "users", userId));
        toast({
          title: currentTranslations.userProfileDeleted,
          description: currentTranslations.userProfileDeletedDesc(userName),
        });
      } catch (error) {
        console.error("Error deleting user profile from Firestore: ", error);
        toast({
          title: currentTranslations.errorDeletingProfile,
          description: currentTranslations.errorDeletingProfileDesc((error as Error).message),
          variant: "destructive",
        });
      }
    }
  };
  
  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-1/3" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-1/4 mb-2" />
            <Skeleton className="h-6 w-1/2 mb-4" />
            <Skeleton className="h-10 w-1/3" />
          </CardHeader>
          <CardContent>
             <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                ))}
             </div>
          </CardContent>
        </Card>
      </div>
    );
  }


  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold flex items-center">
            <UserCog className={cn("h-8 w-8 text-primary", direction === 'rtl' ? 'ml-3' : 'mr-3')} />
            {currentTranslations.title}
          </h1>
          <p className="text-muted-foreground">{currentTranslations.description}</p>
        </div>
        <Button asChild>
          <Link href="/admin/users/new">
            <PlusCircle className={cn("h-4 w-4", direction === 'rtl' ? 'ml-2' : 'mr-2')} /> {currentTranslations.addNewUser}
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{currentTranslations.userListTitle}</CardTitle>
          <CardDescription>{currentTranslations.userListDescription}</CardDescription>
          <div className="pt-4">
            <div className="relative">
              <Search className={cn("absolute top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground", direction === 'rtl' ? 'right-3' : 'left-3')} />
              <Input
                placeholder={currentTranslations.searchPlaceholder}
                value={searchTerm}
                onChange={handleSearch}
                className={cn("max-w-md", direction === 'rtl' ? 'pr-10' : 'pl-10')}
                dir={direction}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">{currentTranslations.avatarHeader}</TableHead>
                <TableHead>{currentTranslations.displayNameHeader}</TableHead>
                <TableHead>{currentTranslations.emailHeader}</TableHead>
                <TableHead className="hidden md:table-cell">{currentTranslations.roleHeader}</TableHead>
                <TableHead className="hidden lg:table-cell w-[150px]">{currentTranslations.createdAtHeader}</TableHead>
                <TableHead className={cn("w-[100px]", direction === 'rtl' ? 'text-left' : 'text-right')}>{currentTranslations.actionsHeader}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <TableRow key={user.uid}>
                    <TableCell>
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
                      </Avatar>
                    </TableCell>
                    <TableCell className="font-medium">{user.displayName || currentTranslations.notAvailable}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell className="hidden md:table-cell">{formatRole(user.role, language)}</TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : currentTranslations.notAvailable}
                    </TableCell>
                    <TableCell className={cn(direction === 'rtl' ? 'text-left' : 'text-right')}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">{currentTranslations.openMenuSr}</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align={direction === 'rtl' ? 'start' : 'end'}>
                          <DropdownMenuLabel>{currentTranslations.actionsLabel}</DropdownMenuLabel>
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/users/view/${user.uid}`}>
                              <Eye className={cn("h-4 w-4", direction === 'rtl' ? 'ml-2' : 'mr-2')} /> {currentTranslations.viewDetails}
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/users/edit/${user.uid}`}>
                              <Edit2 className={cn("h-4 w-4", direction === 'rtl' ? 'ml-2' : 'mr-2')} /> {currentTranslations.editUser}
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDeleteUser(user.uid, user.displayName)}
                            className="text-destructive focus:text-destructive-foreground focus:bg-destructive"
                          >
                            <Trash2 className={cn("h-4 w-4", direction === 'rtl' ? 'ml-2' : 'mr-2')} /> {currentTranslations.deleteProfile}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    {currentTranslations.noUsersFound}{searchTerm ? currentTranslations.matchingCriteria : ""}.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminUsersPage;
