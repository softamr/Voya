
"use client";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { BarChart, Users, MapPin, Hotel, FileText, Loader2, AlertCircle, CheckCircle, XCircle, ArrowRight, TrendingUp, Activity } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { CalendarPlus } from 'lucide-react';
import { StatsGrid } from '@/components/dashboard/StatsGrid';
import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import { useEffect, useState } from 'react';
import { collection, getCountFromServer, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase'; 
import { USER_ROLES } from '@/lib/constants';
import { useLanguage } from '@/contexts/LanguageContext'; // Import useLanguage

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  description?: string;
  link?: string;
  isLoading?: boolean;
  showLink?: boolean;
  viewDetailsText?: string; // For translation
  loadingText?: string; // For translation
}

const StatCard = ({ title, value, icon: Icon, description, link, isLoading, showLink = true, viewDetailsText, loadingText }: StatCardProps) => (
  <Card className="card-gradient hover:scale-105 transition-all duration-300 group">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
      <CardTitle className="text-sm font-medium text-foreground/80 group-hover:text-foreground transition-colors">
        {title}
      </CardTitle>
      <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
        <Icon className="h-5 w-5 text-primary" />
      </div>
    </CardHeader>
    <CardContent className="space-y-3">
      {isLoading ? (
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-muted-foreground">{loadingText || "Loading..."}</span>
        </div>
      ) : (
        <div className="text-3xl font-bold text-gradient bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          {value}
        </div>
      )}
      {!isLoading && description && (
        <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
      )}
      {!isLoading && link && showLink && (
        <Link
          href={link}
          className="inline-flex items-center text-sm text-primary hover:text-primary/80 font-medium transition-colors group/link"
        >
          {viewDetailsText || "View Details"}
          <ArrowRight className="ml-1 h-3 w-3 group-hover/link:translate-x-1 transition-transform" />
        </Link>
      )}
    </CardContent>
  </Card>
);


export default function AdminDashboardPage() {
  const { user } = useAuth();
  const { language, appName } = useLanguage(); // Get language and appName
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalDestinations: 0,
    totalHotels: 0,
    pendingReservations: 0,
    contactedReservations: 0,
    confirmedReservations: 0,
    cancelledReservations: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);

  const canManageUsers = user?.role === USER_ROLES.SUPER_ADMIN;
  const canManageEntities = user?.role === USER_ROLES.ADMIN || user?.role === USER_ROLES.SUPER_ADMIN;

  const translations = {
    en: {
      pageTitle: "Admin Dashboard",
      welcomeMessage: `Welcome back, ${user?.displayName || user?.email || 'Admin'}! Manage your ${appName} operations.`,
      totalUsers: "Total Users",
      totalUsersDesc: "Registered users",
      destinations: "Destinations",
      destinationsDesc: "Configured locations",
      hotels: "Hotels",
      hotelsDesc: "Listed properties",
      pendingReservations: "Pending Reservations",
      pendingReservationsDesc: "Require attention",
      contactedReservations: "Contacted Reservations",
      contactedReservationsDesc: "Awaiting confirmation",
      confirmedReservations: "Confirmed Reservations",
      confirmedReservationsDesc: "Successfully confirmed",
      cancelledReservations: "Cancelled Reservations",
      cancelledReservationsDesc: "No longer active",
      viewDetails: "View Details",
      loadingText: "Loading...",
      recentActivityTitle: "Recent Activity",
      recentActivityDesc: "Overview of recent system activities.",
      sampleActivityUser: "New user 'john.doe@example.com' registered.",
      sampleActivityDest: "Destination 'Maldives' added.",
      sampleActivityTrip: "Trip date for 'Grand Hyatt Dubai' updated.",
      sampleActivityRes: "New reservation received for 'Paris Adventure'.",
      activityChartPlaceholder: "Activity Chart Placeholder",
      quickLinksTitle: "Quick Links",
      quickLinksDesc: "Access common tasks quickly.",
      addDestination: "Add Destination",
      addHotel: "Add Hotel",
      createTrip: "Create Trip",
      addUser: "Add User",
      salesRoleMessage: `Your role has view access and can manage reservations. For other creation tasks, contact an Administrator.`,
      noActionsMessage: "No quick actions available for your role.",
    },
    ar: {
      pageTitle: "لوحة تحكم المسؤول",
      welcomeMessage: `مرحباً بعودتك، ${user?.displayName || user?.email || 'المسؤول'}! قم بإدارة عمليات ${appName}.`,
      totalUsers: "إجمالي المستخدمين",
      totalUsersDesc: "المستخدمون المسجلون",
      destinations: "الوجهات",
      destinationsDesc: "المواقع المكونة",
      hotels: "الفنادق",
      hotelsDesc: "العقارات المدرجة",
      pendingReservations: "الحجوزات المعلقة",
      pendingReservationsDesc: "تتطلب الانتباه",
      contactedReservations: "الحجوزات التي تم الاتصال بها",
      contactedReservationsDesc: "في انتظار التأكيد",
      confirmedReservations: "الحجوزات المؤكدة",
      confirmedReservationsDesc: "تم التأكيد بنجاح",
      cancelledReservations: "الحجوزات الملغاة",
      cancelledReservationsDesc: "لم تعد نشطة",
      viewDetails: "عرض التفاصيل",
      loadingText: "جار التحميل...",
      recentActivityTitle: "النشاط الأخير",
      recentActivityDesc: "نظرة عامة على أنشطة النظام الأخيرة.",
      sampleActivityUser: "مستخدم جديد 'john.doe@example.com' مسجل.",
      sampleActivityDest: "تمت إضافة وجهة 'المالديف'.",
      sampleActivityTrip: "تم تحديث تاريخ رحلة 'جراند حياة دبي'.",
      sampleActivityRes: "تم استلام حجز جديد لـ 'مغامرة باريس'.",
      activityChartPlaceholder: "مخطط النشاط (عنصر نائب)",
      quickLinksTitle: "روابط سريعة",
      quickLinksDesc: "الوصول إلى المهام الشائعة بسرعة.",
      addDestination: "إضافة وجهة",
      addHotel: "إضافة فندق",
      createTrip: "إنشاء رحلة",
      addUser: "إضافة مستخدم",
      salesRoleMessage: "لدى دورك صلاحية العرض ويمكنه إدارة الحجوزات. لمهام الإنشاء الأخرى، يرجى الاتصال بالمسؤول.",
      noActionsMessage: "لا توجد إجراءات سريعة متاحة لدورك.",
    }
  };
  const currentTranslations = translations[language];


  useEffect(() => {
    const fetchStats = async () => {
      setLoadingStats(true);
      try {
        const usersCollectionRef = collection(db, 'users');
        const destinationsCollectionRef = collection(db, 'destinations');
        const hotelsCollectionRef = collection(db, 'hotels');
        const reservationsCollectionRef = collection(db, 'reservations');

        const usersSnapshot = await getCountFromServer(usersCollectionRef);
        const destinationsSnapshot = await getCountFromServer(destinationsCollectionRef);
        const hotelsSnapshot = await getCountFromServer(hotelsCollectionRef);
        
        const pendingReservationsQuery = query(reservationsCollectionRef, where('status', '==', 'pending'));
        const pendingReservationsSnapshot = await getCountFromServer(pendingReservationsQuery);

        const contactedReservationsQuery = query(reservationsCollectionRef, where('status', '==', 'contacted'));
        const contactedReservationsSnapshot = await getCountFromServer(contactedReservationsQuery);

        const confirmedReservationsQuery = query(reservationsCollectionRef, where('status', '==', 'confirmed'));
        const confirmedReservationsSnapshot = await getCountFromServer(confirmedReservationsQuery);

        const cancelledReservationsQuery = query(reservationsCollectionRef, where('status', '==', 'cancelled'));
        const cancelledReservationsSnapshot = await getCountFromServer(cancelledReservationsQuery);

        setStats({
          totalUsers: usersSnapshot.data().count,
          totalDestinations: destinationsSnapshot.data().count,
          totalHotels: hotelsSnapshot.data().count,
          pendingReservations: pendingReservationsSnapshot.data().count,
          contactedReservations: contactedReservationsSnapshot.data().count,
          confirmedReservations: confirmedReservationsSnapshot.data().count,
          cancelledReservations: cancelledReservationsSnapshot.data().count,
        });
      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
      } finally {
        setLoadingStats(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="space-y-8">
        {/* Enhanced Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-headline font-bold text-gradient bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              {currentTranslations.pageTitle}
            </h1>
            <p className="text-muted-foreground text-lg">
              {currentTranslations.welcomeMessage}
            </p>
          </div>
          <Button asChild className="btn-gradient shadow-lg hover:shadow-xl transition-all duration-300">
            <Link href="/admin/trip-dates/new">
              <CalendarPlus className="mr-2 h-4 w-4" />
              {currentTranslations.addTripDate}
            </Link>
          </Button>
        </div>
      
      {/* Enhanced Stats Grid */}
      <StatsGrid
        stats={stats}
        isLoading={loadingStats}
        translations={currentTranslations}
        canManageUsers={canManageUsers}
      />

      <div className="grid gap-6 md:grid-cols-2">
        <ActivityFeed
          translations={currentTranslations}
          className="hover:shadow-xl transition-shadow duration-300"
        />
        {user?.role !== USER_ROLES.SALES && (
          <Card className="card-gradient">
            <CardHeader>
              <CardTitle className="flex items-center text-xl">
                <div className="p-2 rounded-lg bg-accent/10 mr-3">
                  <FileText className="h-5 w-5 text-accent"/>
                </div>
                {currentTranslations.quickLinksTitle}
              </CardTitle>
              <CardDescription className="text-base">{currentTranslations.quickLinksDesc}</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {canManageEntities && (
                <>
                  <Link href="/admin/destinations/new" passHref>
                      <Button variant="outline" className="w-full h-12 hover:bg-primary/10 hover:border-primary/30 transition-all duration-300">
                        <MapPin className="mr-2 h-4 w-4" />
                        {currentTranslations.addDestination}
                      </Button>
                  </Link>
                  <Link href="/admin/hotels/new" passHref>
                      <Button variant="outline" className="w-full h-12 hover:bg-primary/10 hover:border-primary/30 transition-all duration-300">
                        <Hotel className="mr-2 h-4 w-4" />
                        {currentTranslations.addHotel}
                      </Button>
                  </Link>
                  <Link href="/admin/trip-dates/new" passHref>
                      <Button variant="outline" className="w-full h-12 hover:bg-primary/10 hover:border-primary/30 transition-all duration-300">
                        <CalendarPlus className="mr-2 h-4 w-4" />
                        {currentTranslations.createTrip}
                      </Button>
                  </Link>
                </>
              )}
              {canManageUsers && (
                  <Link href="/admin/users/new" passHref>
                      <Button variant="outline" className="w-full h-12 hover:bg-primary/10 hover:border-primary/30 transition-all duration-300">
                        <Users className="mr-2 h-4 w-4" />
                        {currentTranslations.addUser}
                      </Button>
                  </Link>
              )}
              {(user?.role === USER_ROLES.SALES && !canManageEntities) && (
                   <p className="text-sm text-muted-foreground col-span-2 text-center p-4 bg-muted/30 rounded-lg">
                      {currentTranslations.salesRoleMessage}
                   </p>
              )}
              {(!canManageEntities && !canManageUsers && user?.role !== USER_ROLES.SALES) && (
                   <p className="text-sm text-muted-foreground col-span-2 text-center p-4 bg-muted/30 rounded-lg">
                      {currentTranslations.noActionsMessage}
                   </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
      </div>
    </div>
  );
}

