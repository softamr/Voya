
"use client";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Receipt, TrendingUp, Building } from "lucide-react";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

export default function ExpensesOverviewPage() {
  const { language, direction } = useLanguage();

  const translations = {
    en: {
      pageTitle: "Expenses Management",
      pageDescription: "Manage and track all company expenses, categorized into trip-specific and general administration costs.",
      tripExpensesTitle: "Trip Expenses",
      tripExpensesDescription: "Log and manage expenses directly associated with specific trips, such as transportation, guide fees, or activity costs.",
      manageTripExpensesButton: "Manage Trip Expenses",
      adminExpensesTitle: "Administration Expenses",
      adminExpensesDescription: "Track general operational costs like salaries, rent, utilities, and other administrative overhead.",
      manageAdminExpensesButton: "Manage Administration Expenses",
    },
    ar: {
      pageTitle: "إدارة المصروفات",
      pageDescription: "إدارة وتتبع جميع مصروفات الشركة، مصنفة إلى تكاليف متعلقة بالرحلات وتكاليف إدارية عامة.",
      tripExpensesTitle: "مصروفات الرحلات",
      tripExpensesDescription: "تسجيل وإدارة المصروفات المرتبطة مباشرة برحلات معينة، مثل النقل ورسوم المرشدين أو تكاليف الأنشطة.",
      manageTripExpensesButton: "إدارة مصروفات الرحلات",
      adminExpensesTitle: "المصروفات الإدارية",
      adminExpensesDescription: "تتبع تكاليف التشغيل العامة مثل الرواتب والإيجار والمرافق والنفقات الإدارية الأخرى.",
      manageAdminExpensesButton: "إدارة المصروفات الإدارية",
    }
  };

  const currentTranslations = translations[language];

  return (
    <div className="space-y-8" dir={direction}>
      <div>
        <h1 className="text-3xl font-headline font-bold flex items-center">
          <Receipt className={cn("h-8 w-8 text-primary", direction === 'rtl' ? 'ml-3' : 'mr-3')} /> 
          {currentTranslations.pageTitle}
        </h1>
        <p className="text-muted-foreground">{currentTranslations.pageDescription}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="shadow-lg border">
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className={cn("h-6 w-6 text-primary", direction === 'rtl' ? 'ml-2' : 'mr-2')} /> 
              {currentTranslations.tripExpensesTitle}
            </CardTitle>
            <CardDescription>{currentTranslations.tripExpensesDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full sm:w-auto">
              <Link href="/admin/expenses/trip-expenses">
                {currentTranslations.manageTripExpensesButton}
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-lg border">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Building className={cn("h-6 w-6 text-primary", direction === 'rtl' ? 'ml-2' : 'mr-2')} /> 
              {currentTranslations.adminExpensesTitle}
            </CardTitle>
            <CardDescription>{currentTranslations.adminExpensesDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full sm:w-auto">
              <Link href="/admin/expenses/administration-expenses">
                {currentTranslations.manageAdminExpensesButton}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
