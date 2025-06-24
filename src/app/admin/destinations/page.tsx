
"use client";

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, PlusCircle, Edit2, Trash2, Search, Eye, Map } from 'lucide-react';
import type { Destination } from '@/lib/types';
import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { db } from '@/lib/firebase';
import { collection, query, onSnapshot, orderBy, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { USER_ROLES } from '@/lib/constants';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

export default function AdminDestinationsPage() {
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();
  const { language, direction } = useLanguage();

  const canManage = user?.role === USER_ROLES.ADMIN || user?.role === USER_ROLES.SUPER_ADMIN;

  const translations = {
    en: {
      pageTitle: "Manage Destinations",
      pageDescription: "Create, view, edit, and delete travel destinations.",
      addNewDestination: "Add New Destination",
      destinationListTitle: "Destination List",
      destinationListDescription: "A list of all available destinations in the system.",
      searchPlaceholder: "Search destinations...",
      imageHeader: "Image",
      nameHeader: "Name",
      descriptionHeader: "Description",
      createdAtHeader: "Created At",
      actionsHeader: "Actions",
      noImage: "No Image",
      openMenuSr: "Open menu",
      actionsLabel: "Actions",
      viewDetails: "View Details",
      editDestination: "Edit Destination",
      deleteDestination: "Delete Destination",
      noDestinationsFound: "No destinations found",
      matchingCriteria: " matching your search",
      addOne: ". Why not add one?",
      confirmDeleteTitle: "Confirm Deletion",
      confirmDeleteMessage: (name?: string) => `Are you sure you want to delete the destination "${name || 'this destination'}"? This action cannot be undone.`,
      destinationDeletedTitle: "Destination Deleted",
      destinationDeletedDesc: (name?: string) => `Destination "${name || 'The destination'}" has been successfully deleted.`,
      errorDeletingTitle: "Error Deleting Destination",
      errorDeletingDesc: "Could not delete the destination. Please try again.",
      errorFetchingTitle: "Error Fetching Data",
      errorFetchingDesc: "Could not load destinations from the database.",
      permissionDeniedTitle: "Permission Denied",
      permissionDeniedDesc: "You do not have permission to delete destinations.",
      notAvailable: "N/A",
    },
    ar: {
      pageTitle: "إدارة الوجهات",
      pageDescription: "إنشاء وعرض وتعديل وحذف وجهات السفر.",
      addNewDestination: "إضافة وجهة جديدة",
      destinationListTitle: "قائمة الوجهات",
      destinationListDescription: "قائمة بجميع الوجهات المتاحة في النظام.",
      searchPlaceholder: "ابحث عن الوجهات...",
      imageHeader: "الصورة",
      nameHeader: "الاسم",
      descriptionHeader: "الوصف",
      createdAtHeader: "تاريخ الإنشاء",
      actionsHeader: "الإجراءات",
      noImage: "لا توجد صورة",
      openMenuSr: "فتح القائمة",
      actionsLabel: "الإجراءات",
      viewDetails: "عرض التفاصيل",
      editDestination: "تعديل الوجهة",
      deleteDestination: "حذف الوجهة",
      noDestinationsFound: "لم يتم العثور على وجهات",
      matchingCriteria: " تطابق بحثك",
      addOne: ". لم لا تضيف واحدة؟",
      confirmDeleteTitle: "تأكيد الحذف",
      confirmDeleteMessage: (name?: string) => `هل أنت متأكد أنك تريد حذف الوجهة "${name || 'هذه الوجهة'}"؟ لا يمكن التراجع عن هذا الإجراء.`,
      destinationDeletedTitle: "تم حذف الوجهة",
      destinationDeletedDesc: (name?: string) => `تم حذف الوجهة "${name || 'الوجهة'}" بنجاح.`,
      errorDeletingTitle: "خطأ في حذف الوجهة",
      errorDeletingDesc: "تعذر حذف الوجهة. يرجى المحاولة مرة أخرى.",
      errorFetchingTitle: "خطأ في جلب البيانات",
      errorFetchingDesc: "تعذر تحميل الوجهات من قاعدة البيانات.",
      permissionDeniedTitle: "تم رفض الإذن",
      permissionDeniedDesc: "ليس لديك إذن بحذف الوجهات.",
      notAvailable: "غير متوفر",
    }
  };
  const currentTranslations = translations[language];

  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, "destinations"), orderBy("name", "asc"));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedDestinations: Destination[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toDate() : data.createdAt;
        const updatedAt = data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : data.updatedAt;

        fetchedDestinations.push({ 
            id: doc.id, 
            ...data,
            createdAt,
            updatedAt,
        } as Destination);
      });
      setDestinations(fetchedDestinations);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching destinations: ", error);
      toast({
        title: currentTranslations.errorFetchingTitle,
        description: currentTranslations.errorFetchingDesc,
        variant: "destructive",
      });
      setLoading(false);
    });

    return () => unsubscribe(); 
  }, [toast, language, currentTranslations.errorFetchingDesc, currentTranslations.errorFetchingTitle]);

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const filteredDestinations = useMemo(() => {
    return destinations.filter(destination =>
        (destination.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (language === 'ar' && destination.name_ar && destination.name_ar.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (destination.description && destination.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (language === 'ar' && destination.description_ar && destination.description_ar.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [destinations, searchTerm, language]);


  const handleDelete = async (id: string, name: string) => {
    if (!canManage) {
        toast({ title: currentTranslations.permissionDeniedTitle, description: currentTranslations.permissionDeniedDesc, variant: "destructive"});
        return;
    }
    if(confirm(currentTranslations.confirmDeleteMessage(name))){
        try {
            await deleteDoc(doc(db, "destinations", id));
            toast({
                title: currentTranslations.destinationDeletedTitle,
                description: currentTranslations.destinationDeletedDesc(name),
            });
        } catch (error) {
            console.error("Error deleting destination: ", error);
            toast({
                title: currentTranslations.errorDeletingTitle,
                description: currentTranslations.errorDeletingDesc,
                variant: "destructive",
            });
        }
    }
  };
  
  if (loading) {
    return (
      <div className="space-y-8" dir={direction}>
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-1/3" />
          {canManage && <Skeleton className="h-10 w-36" />}
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
    <div className="space-y-8" dir={direction}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold flex items-center">
            <Map className={cn("h-8 w-8 text-primary", direction === 'rtl' ? 'ml-3' : 'mr-3')} />
            {currentTranslations.pageTitle}
          </h1>
          <p className="text-muted-foreground">{currentTranslations.pageDescription}</p>
        </div>
        {canManage && (
          <Button asChild>
            <Link href="/admin/destinations/new">
              <PlusCircle className={cn("h-4 w-4", direction === 'rtl' ? 'ml-2' : 'mr-2')} /> {currentTranslations.addNewDestination}
            </Link>
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{currentTranslations.destinationListTitle}</CardTitle>
          <CardDescription>{currentTranslations.destinationListDescription}</CardDescription>
          <div className="pt-4">
            <div className="relative">
                <Search className={cn("absolute top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground", direction === 'rtl' ? 'right-3' : 'left-3')} />
                <Input 
                    placeholder={currentTranslations.searchPlaceholder} 
                    value={searchTerm}
                    onChange={handleSearch}
                    className={cn("pl-10 max-w-sm", direction === 'rtl' ? 'pr-10 pl-4' : 'pl-10')}
                    dir={direction}
                />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">{currentTranslations.imageHeader}</TableHead>
                <TableHead>{currentTranslations.nameHeader}</TableHead>
                <TableHead className="hidden md:table-cell">{currentTranslations.descriptionHeader}</TableHead>
                <TableHead className="hidden lg:table-cell w-[150px]">{currentTranslations.createdAtHeader}</TableHead>
                <TableHead className={cn("w-[100px]", direction === 'rtl' ? 'text-left' : 'text-right')}>{currentTranslations.actionsHeader}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDestinations.length > 0 ? (
                filteredDestinations.map((destination) => (
                  <TableRow key={destination.id}>
                    <TableCell>
                      {destination.imageUrl ? (
                        <div className="relative h-12 w-12 rounded-md overflow-hidden">
                          <Image
                            src={destination.imageUrl}
                            alt={language === 'ar' && destination.name_ar ? destination.name_ar : destination.name}
                            fill
                            style={{ objectFit: 'cover' }}
                            data-ai-hint={destination.dataAiHint}
                          />
                        </div>
                      ) : (
                        <div className="w-12 h-12 bg-muted rounded-md flex items-center justify-center text-xs text-muted-foreground">{currentTranslations.noImage}</div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                        {language === 'ar' && destination.name_ar ? destination.name_ar : destination.name}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground truncate max-w-xs">
                        {language === 'ar' && destination.description_ar ? destination.description_ar : destination.description}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                      {destination.createdAt ? new Date(destination.createdAt).toLocaleDateString() : currentTranslations.notAvailable}
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
                            <Link href={`/admin/destinations/view/${destination.id}`}>
                                <Eye className={cn("h-4 w-4", direction === 'rtl' ? 'ml-2' : 'mr-2')} /> {currentTranslations.viewDetails}
                            </Link>
                          </DropdownMenuItem>
                          {canManage && (
                            <>
                              <DropdownMenuItem asChild>
                                <Link href={`/admin/destinations/edit/${destination.id}`}>
                                    <Edit2 className={cn("h-4 w-4", direction === 'rtl' ? 'ml-2' : 'mr-2')} /> {currentTranslations.editDestination}
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleDelete(destination.id, destination.name)} className="text-destructive focus:text-destructive-foreground focus:bg-destructive">
                                <Trash2 className={cn("h-4 w-4", direction === 'rtl' ? 'ml-2' : 'mr-2')} /> {currentTranslations.deleteDestination}
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    {currentTranslations.noDestinationsFound}
                    {searchTerm ? currentTranslations.matchingCriteria : (canManage ? currentTranslations.addOne : "")}.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

    

