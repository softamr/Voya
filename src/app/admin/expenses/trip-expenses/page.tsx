
"use client";

import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from '@/hooks/use-toast';
import { TrendingUp, PlusCircle, CalendarIcon as CalendarIconLucide, Loader2, Info } from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import type { TripExpense, TripDate, Hotel, Destination } from '@/lib/types';
import { db } from '@/lib/firebase';
import { collection, query, onSnapshot, orderBy, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

const getTripExpenseSchema = (translations: any) => z.object({
  tripDateId: z.string().min(1, { message: translations.zodTripRequired }),
  description: z.string().min(3, { message: translations.zodDescriptionMin }),
  amount: z.coerce.number().positive({ message: translations.zodAmountPositive }),
  date: z.date({ required_error: translations.zodDateRequired }),
  notes: z.string().optional().or(z.literal('')),
});

type TripExpenseFormValues = z.infer<ReturnType<typeof getTripExpenseSchema>>;

interface EnrichedTripDateOption extends TripDate {
  hotelName?: string;
  destinationName?: string;
  displayLabel?: string;
}

export default function TripExpensesPage() {
  const { language, direction } = useLanguage();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [tripExpenses, setTripExpenses] = useState<TripExpense[]>([]);
  const [tripDateOptions, setTripDateOptions] = useState<EnrichedTripDateOption[]>([]);
  const [loadingExpenses, setLoadingExpenses] = useState(true);
  const [loadingTripDates, setLoadingTripDates] = useState(true);
  const [formSubmitting, setFormSubmitting] = useState(false);

  const translations = {
    en: {
      pageTitle: "Trip Expenses Management",
      pageDescription: "Track and manage all expenses associated with specific trips.",
      addExpenseButton: "Add Trip Expense",
      dialogTitle: "Add New Trip Expense",
      dialogDescription: "Fill in the details for the new trip expense.",
      tripLabel: "Associated Trip",
      tripPlaceholder: "Select a trip",
      descriptionLabel: "Expense Description",
      descriptionPlaceholder: "e.g., Guide fees for city tour",
      amountLabel: "Amount (EGP)",
      amountPlaceholder: "e.g., 500.00",
      dateLabel: "Expense Date",
      datePlaceholder: "Pick a date",
      notesLabel: "Notes (Optional)",
      notesPlaceholder: "Any additional details about the expense...",
      saveButton: "Save Expense",
      savingButton: "Saving...",
      cancelButton: "Cancel",
      tableTitle: "Recorded Trip Expenses",
      tableDesc: "A list of all expenses linked to specific trips.",
      tableHeaderTrip: "Trip",
      tableHeaderDesc: "Description",
      tableHeaderAmount: "Amount (EGP)",
      tableHeaderDate: "Date",
      noExpensesFound: "No trip expenses recorded yet.",
      toastExpenseAddedTitle: "Trip Expense Added",
      toastExpenseAddedDesc: (desc: string) => `Expense "${desc}" has been successfully recorded.`,
      toastErrorTitle: "Error",
      toastCreationFailed: "Failed to add trip expense.",
      toastLoadingTripsFailed: "Failed to load trip dates for selection.",
      toastLoadingExpensesFailed: "Failed to load trip expenses.",
      zodTripRequired: "Trip selection is required.",
      zodDescriptionMin: "Description must be at least 3 characters.",
      zodAmountPositive: "Amount must be a positive number.",
      zodDateRequired: "Expense date is required.",
      unknown: "Unknown",
      backToExpenses: "Back to Expenses Overview",
      statusActive: "Active",
      statusFull: "Full",
      statusCancelled: "Cancelled",
      noTripsAvailable: "No trips available",
    },
    ar: {
      pageTitle: "إدارة مصروفات الرحلات",
      pageDescription: "تتبع وإدارة جميع المصروفات المرتبطة برحلات معينة.",
      addExpenseButton: "إضافة مصروف رحلة",
      dialogTitle: "إضافة مصروف رحلة جديد",
      dialogDescription: "املأ تفاصيل مصروف الرحلة الجديد.",
      tripLabel: "الرحلة المرتبطة",
      tripPlaceholder: "اختر رحلة",
      descriptionLabel: "وصف المصروف",
      descriptionPlaceholder: "مثال: رسوم المرشد للجولة في المدينة",
      amountLabel: "المبلغ (ج.م)",
      amountPlaceholder: "مثال: 500.00",
      dateLabel: "تاريخ المصروف",
      datePlaceholder: "اختر تاريخًا",
      notesLabel: "ملاحظات (اختياري)",
      notesPlaceholder: "أي تفاصيل إضافية حول المصروف...",
      saveButton: "حفظ المصروف",
      savingButton: "جارٍ الحفظ...",
      cancelButton: "إلغاء",
      tableTitle: "مصروفات الرحلات المسجلة",
      tableDesc: "قائمة بجميع المصروفات المرتبطة برحلات محددة.",
      tableHeaderTrip: "الرحلة",
      tableHeaderDesc: "الوصف",
      tableHeaderAmount: "المبلغ (ج.م)",
      tableHeaderDate: "التاريخ",
      noExpensesFound: "لم يتم تسجيل أي مصروفات رحلات بعد.",
      toastExpenseAddedTitle: "تمت إضافة مصروف الرحلة",
      toastExpenseAddedDesc: (desc: string) => `تم تسجيل المصروف "${desc}" بنجاح.`,
      toastErrorTitle: "خطأ",
      toastCreationFailed: "فشل إضافة مصروف الرحلة.",
      toastLoadingTripsFailed: "فشل تحميل تواريخ الرحلات للاختيار.",
      toastLoadingExpensesFailed: "فشل تحميل مصروفات الرحلات.",
      zodTripRequired: "اختيار الرحلة مطلوب.",
      zodDescriptionMin: "يجب أن يتكون الوصف من 3 أحرف على الأقل.",
      zodAmountPositive: "يجب أن يكون المبلغ رقمًا موجبًا.",
      zodDateRequired: "تاريخ المصروف مطلوب.",
      unknown: "غير معروف",
      backToExpenses: "العودة إلى نظرة عامة على المصروفات",
      statusActive: "نشط",
      statusFull: "ممتلئ",
      statusCancelled: "ملغى",
      noTripsAvailable: "لا توجد رحلات متاحة",
    }
  };
  const currentTranslations = translations[language];
  const tripExpenseSchema = getTripExpenseSchema(currentTranslations);

  const form = useForm<TripExpenseFormValues>({
    resolver: zodResolver(tripExpenseSchema),
    defaultValues: {
      tripDateId: undefined,
      description: '',
      amount: 0,
      date: new Date(),
      notes: '',
    },
  });

  const getStatusText = (status: 'active' | 'full' | 'cancelled') => {
    switch (status) {
      case 'active': return currentTranslations.statusActive;
      case 'full': return currentTranslations.statusFull;
      case 'cancelled': return currentTranslations.statusCancelled;
      default: return status;
    }
  };

  useEffect(() => {
    setLoadingTripDates(true);
    const destinationsQuery = query(collection(db, "destinations"));
    const hotelsQuery = query(collection(db, "hotels"));
    const tripDatesQuery = query(collection(db, "tripDates"), orderBy("startDate", "desc"));

    const unsubDestinations = onSnapshot(destinationsQuery, (destSnapshot) => {
        const destinationsMap: Record<string, string> = {};
        destSnapshot.forEach(doc => destinationsMap[doc.id] = doc.data().name);

        const unsubHotels = onSnapshot(hotelsQuery, (hotelSnapshot) => {
            const hotelsMap: Record<string, string> = {};
            hotelSnapshot.forEach(doc => hotelsMap[doc.id] = doc.data().name);

            const unsubTripDates = onSnapshot(tripDatesQuery, (tripSnapshot) => {
                const options = tripSnapshot.docs.map(docSnap => {
                    const data = docSnap.data() as TripDate;
                    const hotelName = hotelsMap[data.hotelId] || currentTranslations.unknown;
                    const destinationName = destinationsMap[data.destinationId] || currentTranslations.unknown;
                    const startDate = data.startDate instanceof Timestamp ? data.startDate.toDate() : data.startDate;
                    const tripStatusText = getStatusText(data.status);
                    return {
                        ...data,
                        id: docSnap.id,
                        hotelName,
                        destinationName,
                        displayLabel: `${destinationName} - ${hotelName} (${format(new Date(startDate), 'MMM d, yyyy')}) - ${language === 'ar' ? 'الحالة' : 'Status'}: ${tripStatusText}`,
                    };
                });
                setTripDateOptions(options);
                setLoadingTripDates(false);
            }, (error) => {
                console.error("Error fetching trip dates:", error);
                toast({ title: currentTranslations.toastErrorTitle, description: currentTranslations.toastLoadingTripsFailed, variant: "destructive" });
                setLoadingTripDates(false);
            });
            return () => unsubTripDates();
        }, (error) => {
            console.error("Error fetching hotels:", error);
            setLoadingTripDates(false);
        });
        return () => unsubHotels();
    }, (error) => {
        console.error("Error fetching destinations:", error);
        setLoadingTripDates(false);
    });
    
    return () => unsubDestinations();
  }, [language, currentTranslations.unknown, currentTranslations.toastErrorTitle, currentTranslations.toastLoadingTripsFailed, toast, currentTranslations.statusActive, currentTranslations.statusCancelled, currentTranslations.statusFull]);

  useEffect(() => {
    setLoadingExpenses(true);
    const q = query(collection(db, "tripExpenses"), orderBy("date", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const fetchedExpenses = snapshot.docs.map(docSnap => {
            const data = docSnap.data();
            return {
                id: docSnap.id,
                ...data,
                date: (data.date as Timestamp).toDate(),
            } as TripExpense;
        });
        setTripExpenses(fetchedExpenses);
        setLoadingExpenses(false);
    }, (error) => {
        console.error("Error fetching trip expenses:", error);
        toast({ title: currentTranslations.toastErrorTitle, description: currentTranslations.toastLoadingExpensesFailed, variant: "destructive" });
        setLoadingExpenses(false);
    });
    return () => unsubscribe();
  }, [language, currentTranslations.toastErrorTitle, currentTranslations.toastLoadingExpensesFailed, toast]);

  const getTripDisplayLabel = (tripDateId: string) => {
    const trip = tripDateOptions.find(td => td.id === tripDateId);
    return trip?.displayLabel || tripDateId;
  };

  const onSubmit = async (data: TripExpenseFormValues) => {
    setFormSubmitting(true);
    try {
      await addDoc(collection(db, "tripExpenses"), {
        ...data,
        date: Timestamp.fromDate(data.date),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      toast({ title: currentTranslations.toastExpenseAddedTitle, description: currentTranslations.toastExpenseAddedDesc(data.description) });
      setIsDialogOpen(false);
      form.reset();
    } catch (error) {
      console.error("Error adding trip expense:", error);
      toast({ title: currentTranslations.toastErrorTitle, description: currentTranslations.toastCreationFailed, variant: "destructive" });
    } finally {
      setFormSubmitting(false);
    }
  };

  return (
    <div className="space-y-8" dir={direction}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold flex items-center">
            <TrendingUp className={cn("h-8 w-8 text-primary", direction === 'rtl' ? 'ml-3' : 'mr-3')} />
            {currentTranslations.pageTitle}
          </h1>
          <p className="text-muted-foreground">{currentTranslations.pageDescription}</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => form.reset({
                tripDateId: undefined,
                description: '',
                amount: 0,
                date: new Date(),
                notes: '',
            })}>
              <PlusCircle className={cn("h-4 w-4", direction === 'rtl' ? 'ml-2' : 'mr-2')} /> 
              {currentTranslations.addExpenseButton}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{currentTranslations.dialogTitle}</DialogTitle>
              <CardDescription>{currentTranslations.dialogDescription}</CardDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2 max-h-[70vh] overflow-y-auto pr-2">
                <FormField
                  control={form.control}
                  name="tripDateId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{currentTranslations.tripLabel}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={loadingTripDates}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={loadingTripDates ? "Loading trips..." : currentTranslations.tripPlaceholder} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {tripDateOptions.map(option => (
                            <SelectItem key={option.id} value={option.id}>
                              {option.displayLabel}
                            </SelectItem>
                          ))}
                           {tripDateOptions.length === 0 && !loadingTripDates && <SelectItem value="no-trips" disabled>{currentTranslations.noTripsAvailable}</SelectItem>}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{currentTranslations.descriptionLabel}</FormLabel>
                      <FormControl><Input placeholder={currentTranslations.descriptionPlaceholder} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{currentTranslations.amountLabel}</FormLabel>
                      <FormControl>
                        <div className="relative">
                            <span className={cn("absolute top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none", direction === 'rtl' ? 'right-3' : 'left-3')}>EGP</span>
                            <Input type="number" step="0.01" placeholder={currentTranslations.amountPlaceholder} className={cn(direction === 'rtl' ? 'pr-10' : 'pl-10')} {...field} />
                        </div>
                        </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>{currentTranslations.dateLabel}</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}
                            >
                              <CalendarIconLucide className={cn("h-4 w-4", direction === 'rtl' ? 'ml-2' : 'mr-2')} />
                              {field.value ? format(field.value, "PPP") : <span>{currentTranslations.datePlaceholder}</span>}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{currentTranslations.notesLabel}</FormLabel>
                      <FormControl><Textarea placeholder={currentTranslations.notesPlaceholder} {...field} rows={3} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter className="pt-4">
                    <DialogClose asChild>
                        <Button type="button" variant="outline" disabled={formSubmitting}>{currentTranslations.cancelButton}</Button>
                    </DialogClose>
                    <Button type="submit" disabled={formSubmitting || loadingTripDates}>
                        {formSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {formSubmitting ? currentTranslations.savingButton : currentTranslations.saveButton}
                    </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{currentTranslations.tableTitle}</CardTitle>
          <CardDescription>{currentTranslations.tableDesc}</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingExpenses ? (
             <div className="space-y-2">
                {[...Array(3)].map((_, i) => ( <Skeleton key={i} className="h-12 w-full" /> ))}
             </div>
          ) : tripExpenses.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{currentTranslations.tableHeaderTrip}</TableHead>
                  <TableHead>{currentTranslations.tableHeaderDesc}</TableHead>
                  <TableHead className={cn(direction === 'rtl' ? 'text-left' : 'text-right')}>{currentTranslations.tableHeaderAmount}</TableHead>
                  <TableHead className="hidden md:table-cell">{currentTranslations.tableHeaderDate}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tripExpenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{getTripDisplayLabel(expense.tripDateId)}</TableCell>
                    <TableCell className="font-medium">{expense.description}</TableCell>
                    <TableCell className={cn("font-semibold", direction === 'rtl' ? 'text-left' : 'text-right')}>
                        {expense.amount.toFixed(2)}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        {format(expense.date, 'PP')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-10">
                <Info className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg text-muted-foreground">{currentTranslations.noExpensesFound}</p>
            </div>
          )}
        </CardContent>
      </Card>
       <Button variant="outline" asChild className="mt-8">
            <Link href="/admin/expenses">
              {currentTranslations.backToExpenses}
            </Link>
       </Button>
    </div>
  );
}

