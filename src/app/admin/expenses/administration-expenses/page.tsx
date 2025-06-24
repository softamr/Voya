
"use client";

import { useState, useEffect } from 'react';
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
import { Building, PlusCircle, CalendarIcon as CalendarIconLucide, Loader2, Info } from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import type { AdministrationExpense, AdministrationExpenseCategory } from '@/lib/types';
import { db } from '@/lib/firebase';
import { collection, query, onSnapshot, orderBy, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

const ADMIN_EXPENSE_CATEGORIES: AdministrationExpenseCategory[] = [
  'Salaries', 'Rent', 'Hotel Insurance', 'Hotel Water', 'Hotel Electric', 'Office Supplies', 'Marketing', 'Maintenance', 'Other'
];

const getAdminExpenseSchema = (translations: any) => z.object({
  category: z.enum(ADMIN_EXPENSE_CATEGORIES, { required_error: translations.zodCategoryRequired }),
  description: z.string().optional().or(z.literal('')),
  amount: z.coerce.number().positive({ message: translations.zodAmountPositive }),
  expenseDate: z.date({ required_error: translations.zodDateRequired }),
  notes: z.string().optional().or(z.literal('')),
});

type AdminExpenseFormValues = z.infer<ReturnType<typeof getAdminExpenseSchema>>;

export default function AdministrationExpensesPage() {
  const { language, direction } = useLanguage();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [adminExpenses, setAdminExpenses] = useState<AdministrationExpense[]>([]);
  const [loadingExpenses, setLoadingExpenses] = useState(true);
  const [formSubmitting, setFormSubmitting] = useState(false);

  const translations = {
    en: {
      pageTitle: "Administration Expenses Management",
      pageDescription: "Track and manage general operational and administrative costs.",
      addExpenseButton: "Add Administration Expense",
      dialogTitle: "Add New Administration Expense",
      dialogDescription: "Fill in the details for the new administrative expense.",
      categoryLabel: "Expense Category",
      categoryPlaceholder: "Select a category",
      descriptionLabel: "Specific Description (Optional)",
      descriptionPlaceholder: "e.g., Office rent for Q3",
      amountLabel: "Amount (EGP)",
      amountPlaceholder: "e.g., 10000.00",
      dateLabel: "Expense Date",
      datePlaceholder: "Pick a date",
      notesLabel: "Notes (Optional)",
      notesPlaceholder: "Any additional details...",
      saveButton: "Save Expense",
      savingButton: "Saving...",
      cancelButton: "Cancel",
      tableTitle: "Recorded Administration Expenses",
      tableDesc: "A list of all general administrative expenses.",
      tableHeaderCategory: "Category",
      tableHeaderDesc: "Description",
      tableHeaderAmount: "Amount (EGP)",
      tableHeaderDate: "Date",
      noExpensesFound: "No administration expenses recorded yet.",
      toastExpenseAddedTitle: "Administration Expense Added",
      toastExpenseAddedDesc: (cat: string) => `Expense under "${cat}" has been successfully recorded.`,
      toastErrorTitle: "Error",
      toastCreationFailed: "Failed to add administration expense.",
      toastLoadingExpensesFailed: "Failed to load administration expenses.",
      zodCategoryRequired: "Category selection is required.",
      zodAmountPositive: "Amount must be a positive number.",
      zodDateRequired: "Expense date is required.",
      backToExpenses: "Back to Expenses Overview",
      // Categories
      Salaries: "Salaries", Rent: "Rent", 'Hotel Insurance': "Hotel Insurance", 'Hotel Water': "Hotel Water", 'Hotel Electric': "Hotel Electric", 'Office Supplies': "Office Supplies", Marketing: "Marketing", Maintenance: "Maintenance", Other: "Other",
    },
    ar: {
      pageTitle: "إدارة المصروفات الإدارية",
      pageDescription: "تتبع وإدارة تكاليف التشغيل والتكاليف الإدارية العامة.",
      addExpenseButton: "إضافة مصروف إداري",
      dialogTitle: "إضافة مصروف إداري جديد",
      dialogDescription: "املأ تفاصيل المصروف الإداري الجديد.",
      categoryLabel: "فئة المصروف",
      categoryPlaceholder: "اختر فئة",
      descriptionLabel: "وصف محدد (اختياري)",
      descriptionPlaceholder: "مثال: إيجار المكتب للربع الثالث",
      amountLabel: "المبلغ (ج.م)",
      amountPlaceholder: "مثال: 10000.00",
      dateLabel: "تاريخ المصروف",
      datePlaceholder: "اختر تاريخًا",
      notesLabel: "ملاحظات (اختياري)",
      notesPlaceholder: "أي تفاصيل إضافية...",
      saveButton: "حفظ المصروف",
      savingButton: "جارٍ الحفظ...",
      cancelButton: "إلغاء",
      tableTitle: "المصروفات الإدارية المسجلة",
      tableDesc: "قائمة بجميع المصروفات الإدارية العامة.",
      tableHeaderCategory: "الفئة",
      tableHeaderDesc: "الوصف",
      tableHeaderAmount: "المبلغ (ج.م)",
      tableHeaderDate: "التاريخ",
      noExpensesFound: "لم يتم تسجيل أي مصروفات إدارية بعد.",
      toastExpenseAddedTitle: "تمت إضافة مصروف إداري",
      toastExpenseAddedDesc: (cat: string) => `تم تسجيل المصروف تحت "${cat}" بنجاح.`,
      toastErrorTitle: "خطأ",
      toastCreationFailed: "فشل إضافة مصروف إداري.",
      toastLoadingExpensesFailed: "فشل تحميل المصروفات الإدارية.",
      zodCategoryRequired: "اختيار الفئة مطلوب.",
      zodAmountPositive: "يجب أن يكون المبلغ رقمًا موجبًا.",
      zodDateRequired: "تاريخ المصروف مطلوب.",
      backToExpenses: "العودة إلى نظرة عامة على المصروفات",
      // Categories
      Salaries: "الرواتب", Rent: "الإيجار", 'Hotel Insurance': "تأمين الفندق", 'Hotel Water': "مياه الفندق", 'Hotel Electric': "كهرباء الفندق", 'Office Supplies': "لوازم مكتبية", Marketing: "التسويق", Maintenance: "الصيانة", Other: "أخرى",
    }
  };
  const currentTranslations = translations[language];
  const adminExpenseSchema = getAdminExpenseSchema(currentTranslations);

  const form = useForm<AdminExpenseFormValues>({
    resolver: zodResolver(adminExpenseSchema),
    defaultValues: {
      category: undefined,
      description: '',
      amount: 0,
      expenseDate: new Date(),
      notes: '',
    },
  });
  
  const getCategoryTranslation = (categoryKey: AdministrationExpenseCategory) => {
    return currentTranslations[categoryKey] || categoryKey;
  };

  useEffect(() => {
    setLoadingExpenses(true);
    const q = query(collection(db, "administrationExpenses"), orderBy("expenseDate", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedExpenses = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          expenseDate: (data.expenseDate as Timestamp).toDate(),
        } as AdministrationExpense;
      });
      setAdminExpenses(fetchedExpenses);
      setLoadingExpenses(false);
    }, (error) => {
      console.error("Error fetching administration expenses:", error);
      toast({ title: currentTranslations.toastErrorTitle, description: currentTranslations.toastLoadingExpensesFailed, variant: "destructive" });
      setLoadingExpenses(false);
    });
    return () => unsubscribe();
  }, [currentTranslations.toastErrorTitle, currentTranslations.toastLoadingExpensesFailed, toast]);

  const onSubmit = async (data: AdminExpenseFormValues) => {
    setFormSubmitting(true);
    try {
      await addDoc(collection(db, "administrationExpenses"), {
        ...data,
        expenseDate: Timestamp.fromDate(data.expenseDate),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      toast({ title: currentTranslations.toastExpenseAddedTitle, description: currentTranslations.toastExpenseAddedDesc(getCategoryTranslation(data.category)) });
      setIsDialogOpen(false);
      form.reset();
    } catch (error) {
      console.error("Error adding admin expense:", error);
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
            <Building className={cn("h-8 w-8 text-primary", direction === 'rtl' ? 'ml-3' : 'mr-3')} />
            {currentTranslations.pageTitle}
          </h1>
          <p className="text-muted-foreground">{currentTranslations.pageDescription}</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
             <Button onClick={() => form.reset({ category: undefined, description: '', amount: 0, expenseDate: new Date(), notes: '' })}>
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
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{currentTranslations.categoryLabel}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={currentTranslations.categoryPlaceholder} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {ADMIN_EXPENSE_CATEGORIES.map(cat => (
                            <SelectItem key={cat} value={cat}>
                              {getCategoryTranslation(cat)}
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
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{currentTranslations.descriptionLabel}</FormLabel>
                      <FormControl><Textarea placeholder={currentTranslations.descriptionPlaceholder} {...field} rows={2}/></FormControl>
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
                  name="expenseDate"
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
                  <Button type="submit" disabled={formSubmitting}>
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
              {[...Array(3)].map((_, i) => (<Skeleton key={i} className="h-12 w-full" />))}
            </div>
          ) : adminExpenses.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{currentTranslations.tableHeaderCategory}</TableHead>
                  <TableHead className="hidden md:table-cell">{currentTranslations.tableHeaderDesc}</TableHead>
                  <TableHead className={cn(direction === 'rtl' ? 'text-left' : 'text-right')}>{currentTranslations.tableHeaderAmount}</TableHead>
                  <TableHead className="hidden sm:table-cell">{currentTranslations.tableHeaderDate}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {adminExpenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell className="font-medium">{getCategoryTranslation(expense.category)}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground max-w-xs truncate">{expense.description || '-'}</TableCell>
                    <TableCell className={cn("font-semibold", direction === 'rtl' ? 'text-left' : 'text-right')}>
                      {expense.amount.toFixed(2)}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                      {format(expense.expenseDate, 'PP')}
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

    