
"use client";

import type { NextPage } from 'next';
import Link from 'next/link';
import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MoreHorizontal, PlusCircle, Search, Edit2, Trash2, Eye, BedDouble } from 'lucide-react';
import type { RoomType } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { db } from '@/lib/firebase';
import { collection, query, onSnapshot, orderBy, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

const AdminRoomTypesPage: NextPage = () => {
  const { toast } = useToast();
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const { language, direction } = useLanguage();

  const translations = {
    en: {
      pageTitle: "Room Type Management",
      pageDescription: "Define and manage different types of hotel rooms.",
      addNewRoomType: "Add New Room Type",
      roomTypeListTitle: "Room Type List",
      roomTypeListDescription: "All available room types in the system.",
      searchPlaceholder: "Search room types by name, description, capacity...",
      nameHeader: "Name",
      descriptionHeader: "Description",
      capacityHeader: "Capacity",
      createdAtHeader: "Created At",
      actionsHeader: "Actions",
      openMenuSr: "Open menu",
      actionsLabel: "Actions",
      viewDetails: "View Details",
      editRoomType: "Edit Room Type",
      deleteRoomType: "Delete Room Type",
      noRoomTypesFound: "No room types found",
      matchingCriteria: " matching your criteria",
      confirmDeleteTitle: "Confirm Deletion",
      confirmDeleteMessage: (name?: string) => `Are you sure you want to delete the room type "${name || 'this room type'}"? This action cannot be undone.`,
      roomTypeDeletedTitle: "Room Type Deleted",
      roomTypeDeletedDesc: (name?: string) => `Room type "${name || 'The room type'}" has been successfully deleted.`,
      errorDeletingRoomTypeTitle: "Error Deleting Room Type",
      errorDeletingRoomTypeDesc: (errorMsg: string) => errorMsg || "Could not delete the room type.",
      errorFetchingRoomTypesTitle: "Error Fetching Data",
      errorFetchingRoomTypesDesc: "Could not load room types from the database.",
      notAvailable: "N/A",
    },
    ar: {
      pageTitle: "إدارة أنواع الغرف",
      pageDescription: "تحديد وإدارة أنواع مختلفة من غرف الفنادق.",
      addNewRoomType: "إضافة نوع غرفة جديد",
      roomTypeListTitle: "قائمة أنواع الغرف",
      roomTypeListDescription: "جميع أنواع الغرف المتاحة في النظام.",
      searchPlaceholder: "ابحث عن أنواع الغرف بالاسم أو الوصف أو السعة...",
      nameHeader: "الاسم",
      descriptionHeader: "الوصف",
      capacityHeader: "السعة",
      createdAtHeader: "تاريخ الإنشاء",
      actionsHeader: "الإجراءات",
      openMenuSr: "فتح القائمة",
      actionsLabel: "الإجراءات",
      viewDetails: "عرض التفاصيل",
      editRoomType: "تعديل نوع الغرفة",
      deleteRoomType: "حذف نوع الغرفة",
      noRoomTypesFound: "لم يتم العثور على أنواع غرف",
      matchingCriteria: " تطابق معايير البحث الخاصة بك",
      confirmDeleteTitle: "تأكيد الحذف",
      confirmDeleteMessage: (name?: string) => `هل أنت متأكد أنك تريد حذف نوع الغرفة "${name || 'هذا النوع من الغرف'}"؟ لا يمكن التراجع عن هذا الإجراء.`,
      roomTypeDeletedTitle: "تم حذف نوع الغرفة",
      roomTypeDeletedDesc: (name?: string) => `تم حذف نوع الغرفة "${name || 'نوع الغرفة'}" بنجاح.`,
      errorDeletingRoomTypeTitle: "خطأ في حذف نوع الغرفة",
      errorDeletingRoomTypeDesc: (errorMsg: string) => errorMsg || "تعذر حذف نوع الغرفة.",
      errorFetchingRoomTypesTitle: "خطأ في جلب البيانات",
      errorFetchingRoomTypesDesc: "تعذر تحميل أنواع الغرف من قاعدة البيانات.",
      notAvailable: "غير متوفر",
    }
  };
  const currentTranslations = translations[language];

  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, "roomTypes"), orderBy("name", "asc"));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedRoomTypes: RoomType[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toDate() : data.createdAt;
        const updatedAt = data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : data.updatedAt;

        fetchedRoomTypes.push({ 
            id: doc.id, 
            ...data,
            createdAt,
            updatedAt,
        } as RoomType);
      });
      setRoomTypes(fetchedRoomTypes);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching room types: ", error);
      toast({
        title: currentTranslations.errorFetchingRoomTypesTitle,
        description: currentTranslations.errorFetchingRoomTypesDesc,
        variant: "destructive",
      });
      setLoading(false);
    });

    return () => unsubscribe(); 
  }, [toast, language, currentTranslations.errorFetchingRoomTypesDesc, currentTranslations.errorFetchingRoomTypesTitle]);

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value.toLowerCase());
  };

  const filteredRoomTypes = useMemo(() => {
    return roomTypes.filter(rt =>
      rt.name.toLowerCase().includes(searchTerm) ||
      (rt.description && rt.description.toLowerCase().includes(searchTerm)) ||
      rt.capacity.toString().includes(searchTerm)
    );
  }, [roomTypes, searchTerm]);

  const handleDeleteRoomType = async (roomTypeId: string, name: string) => {
    if (confirm(currentTranslations.confirmDeleteMessage(name))) {
      try {
        await deleteDoc(doc(db, "roomTypes", roomTypeId));
        toast({
          title: currentTranslations.roomTypeDeletedTitle,
          description: currentTranslations.roomTypeDeletedDesc(name),
        });
      } catch (error) {
        console.error("Error deleting room type: ", error);
        toast({
          title: currentTranslations.errorDeletingRoomTypeTitle,
          description: currentTranslations.errorDeletingRoomTypeDesc((error as Error).message),
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
         <Skeleton className="h-10 w-40" />
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
            <BedDouble className={cn("h-8 w-8 text-primary", direction === 'rtl' ? 'ml-3' : 'mr-3')} /> {currentTranslations.pageTitle}
          </h1>
          <p className="text-muted-foreground">{currentTranslations.pageDescription}</p>
        </div>
        <Button asChild>
          <Link href="/admin/room-types/new">
            <PlusCircle className={cn("h-4 w-4", direction === 'rtl' ? 'ml-2' : 'mr-2')} /> {currentTranslations.addNewRoomType}
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{currentTranslations.roomTypeListTitle}</CardTitle>
          <CardDescription>{currentTranslations.roomTypeListDescription}</CardDescription>
          <div className="pt-4">
            <div className="relative">
              <Search className={cn("absolute top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground", direction === 'rtl' ? 'right-3' : 'left-3')} />
              <Input
                placeholder={currentTranslations.searchPlaceholder}
                value={searchTerm}
                onChange={handleSearch}
                className={cn("max-w-md", direction === 'rtl' ? 'pr-10' : 'pl-10')}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{currentTranslations.nameHeader}</TableHead>
                <TableHead className="hidden md:table-cell">{currentTranslations.descriptionHeader}</TableHead>
                <TableHead className="w-[100px]">{currentTranslations.capacityHeader}</TableHead>
                <TableHead className="hidden lg:table-cell w-[150px]">{currentTranslations.createdAtHeader}</TableHead>
                <TableHead className={cn("w-[100px]", direction === 'rtl' ? 'text-left' : 'text-right')}>{currentTranslations.actionsHeader}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRoomTypes.length > 0 ? (
                filteredRoomTypes.map((rt) => (
                  <TableRow key={rt.id}>
                    <TableCell className="font-medium">{rt.name}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground truncate max-w-md">{rt.description}</TableCell>
                    <TableCell>{rt.capacity}</TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                      {rt.createdAt ? new Date(rt.createdAt).toLocaleDateString() : currentTranslations.notAvailable}
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
                            <Link href={`/admin/room-types/view/${rt.id}`}>
                              <Eye className={cn("h-4 w-4", direction === 'rtl' ? 'ml-2' : 'mr-2')} /> {currentTranslations.viewDetails}
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/room-types/edit/${rt.id}`}>
                              <Edit2 className={cn("h-4 w-4", direction === 'rtl' ? 'ml-2' : 'mr-2')} /> {currentTranslations.editRoomType}
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDeleteRoomType(rt.id, rt.name)}
                            className="text-destructive focus:text-destructive-foreground focus:bg-destructive"
                          >
                            <Trash2 className={cn("h-4 w-4", direction === 'rtl' ? 'ml-2' : 'mr-2')} /> {currentTranslations.deleteRoomType}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    {currentTranslations.noRoomTypesFound}{searchTerm ? currentTranslations.matchingCriteria : ""}.
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

export default AdminRoomTypesPage;

