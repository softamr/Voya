
"use client";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Briefcase, PlusCircle, UserCircle, Mail, ShieldCheck, FileText, Clock, CheckCircle, AlertCircle, XCircle, Hotel } from "lucide-react";
import type { InitialReservation, TripDate } from '@/lib/types';
import { useState, useEffect, useMemo } from 'react';
import { USER_ROLES, type UserRole, formatRoleDisplay } from '@/lib/constants';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, onSnapshot, Timestamp, doc, getDoc } from 'firebase/firestore';
import { format } from 'date-fns';
import Link from 'next/link';
import { Skeleton } from "@/components/ui/skeleton";

interface EnrichedReservationForProfile extends InitialReservation {
  tripSummary?: string;
}

const getStatusBadgeInfo = (status: InitialReservation['status'], translations: Record<string,string>) => {
    switch (status) {
      case 'pending': return { icon: <Clock className="h-3 w-3 mr-1.5 flex-shrink-0" />, text: translations.statusPending, colorClasses: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200" };
      case 'confirmed': return { icon: <CheckCircle className="h-3 w-3 mr-1.5 flex-shrink-0" />, text: translations.statusConfirmed, colorClasses: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" };
      case 'contacted': return { icon: <AlertCircle className="h-3 w-3 mr-1.5 flex-shrink-0" />, text: translations.statusContacted, colorClasses: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" };
      case 'cancelled': return { icon: <XCircle className="h-3 w-3 mr-1.5 flex-shrink-0" />, text: translations.statusCancelled, colorClasses: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" };
      default: return { icon: <FileText className="h-3 w-3 mr-1.5 flex-shrink-0" />, text: status, colorClasses: "bg-muted text-muted-foreground" };
    }
};


export default function ProfilePage() {
  const { user } = useAuth();
  const { language, direction } = useLanguage();
  const [reservations, setReservations] = useState<EnrichedReservationForProfile[]>([]);
  const [loadingReservations, setLoadingReservations] = useState(true);

  const [hotelsMap, setHotelsMap] = useState<Record<string, string>>({});
  const [tripDatesMap, setTripDatesMap] = useState<Record<string, Pick<TripDate, 'startDate' | 'endDate' | 'hotelId'>>>({});


  const translations = useMemo(() => ({
    en: {
      pageTitle: "My Profile",
      pageDescription: "Manage your trip reservations and personal details.",
      welcomeMessage: (name?: string) => `Welcome, ${name || 'User'}!`,
      profileDetailsTitle: "Profile Details",
      emailLabel: "Email:",
      roleLabel: "Role:",
      profileEditingComingSoon: "Profile editing functionality coming soon.",
      myTripReservationsTitle: "My Trip Reservations",
      myTripReservationsDescription: "View and manage your initial trip reservations.",
      requestNewTripButton: "Request New Trip",
      loadingReservationsText: "Loading reservations...",
      noReservationsText: "You have no reservations yet.",
      viewDetailsButton: "View Details",
      tripLabel: "Trip:",
      statusPending: "Pending",
      statusContacted: "Contacted",
      statusConfirmed: "Confirmed",
      statusCancelled: "Cancelled",
      notAvailable: "N/A",
    },
    ar: {
      pageTitle: "ملفي الشخصي",
      pageDescription: "إدارة حجوزات رحلاتك وتفاصيلك الشخصية.",
      welcomeMessage: (name?: string) => `مرحباً، ${name || 'مستخدم'}!`,
      profileDetailsTitle: "تفاصيل الملف الشخصي",
      emailLabel: "البريد الإلكتروني:",
      roleLabel: "الدور:",
      profileEditingComingSoon: "وظيفة تعديل الملف الشخصي ستتوفر قريبًا.",
      myTripReservationsTitle: "حجوزات رحلاتي",
      myTripReservationsDescription: "عرض وإدارة حجوزات رحلاتك الأولية.",
      requestNewTripButton: "طلب رحلة جديدة",
      loadingReservationsText: "جارٍ تحميل الحجوزات...",
      noReservationsText: "ليس لديك حجوزات بعد.",
      viewDetailsButton: "عرض التفاصيل",
      tripLabel: "الرحلة:",
      statusPending: "معلق",
      statusContacted: "تم الاتصال",
      statusConfirmed: "مؤكد",
      statusCancelled: "ملغى",
      notAvailable: "غير متوفر",
    }
  }), [language]);
  const currentTranslations = translations[language];

  useEffect(() => {
    let unsubHotels: (() => void) | undefined;
    let unsubTripDates: (() => void) | undefined;

    if (user?.uid) {
        unsubHotels = onSnapshot(query(collection(db, "hotels")), (snapshot) => {
            const hMap: Record<string, string> = {};
            snapshot.forEach(doc => hMap[doc.id] = doc.data().name);
            setHotelsMap(hMap);
        });

        unsubTripDates = onSnapshot(query(collection(db, "tripDates")), (snapshot) => {
            const tdMap: Record<string, Pick<TripDate, 'startDate' | 'endDate' | 'hotelId'>> = {};
            snapshot.forEach(docSnap => {
                const data = docSnap.data();
                tdMap[docSnap.id] = {
                    startDate: (data.startDate as Timestamp).toDate(),
                    endDate: (data.endDate as Timestamp).toDate(),
                    hotelId: data.hotelId,
                };
            });
            setTripDatesMap(tdMap);
        });
    }
    return () => {
        if (unsubHotels) unsubHotels();
        if (unsubTripDates) unsubTripDates();
    };
  }, [user?.uid]);


  useEffect(() => {
    if (!user?.uid || Object.keys(hotelsMap).length === 0 || Object.keys(tripDatesMap).length === 0) {
      if (user?.uid) setLoadingReservations(true); // Only set loading if we expect to fetch
      else setLoadingReservations(false);
      return;
    }

    setLoadingReservations(true);
    const q = query(
      collection(db, "reservations"),
      where("userId", "==", user.uid),
      orderBy("reservationDate", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedReservations: EnrichedReservationForProfile[] = snapshot.docs.map(docSnap => {
        const data = docSnap.data() as InitialReservation;
        const tripDateInfo = tripDatesMap[data.tripDateId];
        const hotelName = tripDateInfo ? hotelsMap[tripDateInfo.hotelId] : currentTranslations.notAvailable;
        
        let tripSummary = hotelName || currentTranslations.notAvailable;
        if (tripDateInfo && tripDateInfo.startDate && tripDateInfo.endDate) {
            tripSummary += ` (${format(new Date(tripDateInfo.startDate), 'PP')} - ${format(new Date(tripDateInfo.endDate), 'PP')})`;
        }
        return {
          id: docSnap.id,
          ...data,
          reservationDate: data.reservationDate instanceof Timestamp ? data.reservationDate.toDate() : data.reservationDate,
          tripSummary: tripSummary,
        } as EnrichedReservationForProfile;
      });
      setReservations(fetchedReservations);
      setLoadingReservations(false);
    }, (error) => {
      console.error("Error fetching user reservations:", error);
      setLoadingReservations(false);
    });

    return () => unsubscribe();
  }, [user?.uid, hotelsMap, tripDatesMap, currentTranslations.notAvailable]);

  return (
    <div className="container mx-auto px-4 py-8 space-y-8" dir={direction}>
      <section>
        <h1 className="text-3xl font-headline font-bold">{currentTranslations.pageTitle}</h1>
        <p className="text-muted-foreground">{currentTranslations.pageDescription}</p>
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <UserCircle className={cn("h-6 w-6 text-primary", direction === 'rtl' ? 'ml-2' : 'mr-2')} />
            {currentTranslations.welcomeMessage(user?.displayName || user?.email)}
          </CardTitle>
          <CardDescription>{currentTranslations.profileDetailsTitle}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center">
            <Mail className={cn("h-5 w-5 text-muted-foreground", direction === 'rtl' ? 'ml-2' : 'mr-2')} />
            <span className="font-medium">{currentTranslations.emailLabel}</span>
            <span className={cn("text-foreground", direction === 'rtl' ? 'mr-2' : 'ml-2')}>{user?.email || 'N/A'}</span>
          </div>
          <div className="flex items-center">
            <ShieldCheck className={cn("h-5 w-5 text-muted-foreground", direction === 'rtl' ? 'ml-2' : 'mr-2')} />
            <span className="font-medium">{currentTranslations.roleLabel}</span>
            <span className={cn("text-foreground", direction === 'rtl' ? 'mr-2' : 'ml-2')}>
              {user?.role ? formatRoleDisplay(user.role, language) : 'N/A'}
            </span>
          </div>
          <p className="text-sm text-muted-foreground pt-2">{currentTranslations.profileEditingComingSoon}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center">
              <Briefcase className={cn("h-5 w-5 text-primary", direction === 'rtl' ? 'ml-2' : 'mr-2')} />
              {currentTranslations.myTripReservationsTitle}
            </CardTitle>
            <CardDescription>{currentTranslations.myTripReservationsDescription}</CardDescription>
          </div>
          {/* <Button variant="outline" disabled>
            <PlusCircle className={cn("h-4 w-4", direction === 'rtl' ? 'ml-2' : 'mr-2')} /> {currentTranslations.requestNewTripButton}
          </Button> */}
        </CardHeader>
        <CardContent>
          {loadingReservations ? (
             <div className="space-y-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
             </div>
          ) : reservations.length > 0 ? (
            <ul className="space-y-4">
              {reservations.map(res => {
                const statusBadge = getStatusBadgeInfo(res.status, currentTranslations);
                return (
                <li key={res.id} className="p-4 border rounded-lg shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div className="flex-grow">
                      <p className="font-semibold text-lg text-primary flex items-center">
                         <Hotel className={cn("h-5 w-5", direction === 'rtl' ? 'ml-2' : 'mr-2')} /> {res.tripSummary || currentTranslations.notAvailable}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {currentTranslations.tripLabel} {format(new Date(res.reservationDate), 'PPp')}
                      </p>
                    </div>
                    <div className="flex flex-col items-start sm:items-end gap-2 w-full sm:w-auto">
                        <span className={cn("px-2 py-1 text-xs font-semibold rounded-full inline-flex items-center self-start sm:self-auto", statusBadge.colorClasses)}>
                            {statusBadge.icon} {statusBadge.text}
                        </span>
                         <Button variant="outline" size="sm" asChild>
                            <Link href={`/reservations/${res.id}`}>{currentTranslations.viewDetailsButton}</Link>
                        </Button>
                    </div>
                  </div>
                  {res.totalCalculatedPrice !== undefined && (
                    <p className="text-sm text-muted-foreground mt-2">
                        Est. Total: EGP {res.totalCalculatedPrice.toFixed(2)}
                        {res.depositAmount !== undefined && res.depositAmount > 0 && 
                         <span className="text-green-600"> (Paid: EGP {res.depositAmount.toFixed(2)})</span>}
                    </p>
                  )}
                </li>
              );
            })}
            </ul>
          ) : (
            <p className="text-muted-foreground text-center py-6">{currentTranslations.noReservationsText}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

