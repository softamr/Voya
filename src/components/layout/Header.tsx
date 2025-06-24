
"use client";

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from '@/components/ui/dropdown-menu';
import { LogIn, LogOut, UserCircle, LayoutDashboard, Home, Briefcase, Settings, Languages, Bell, AlertCircle, UserPlus } from 'lucide-react';
import { USER_ROLES, type UserRole, formatRoleDisplay } from '@/lib/constants'; // Import formatRoleDisplay
import { useLanguage } from '@/contexts/LanguageContext';
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, limit, onSnapshot, Timestamp } from 'firebase/firestore';
import type { Notification } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export default function Header() {
  const { user, logout, loading: authLoading } = useAuth();
  const { appName, language, direction, toggleLanguage } = useLanguage();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotificationDot, setShowNotificationDot] = useState(false);

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return names[0][0].toUpperCase();
  };

  const translations = {
    home: language === 'ar' ? "الرئيسية" : "Home",
    login: language === 'ar' ? "تسجيل الدخول" : "Login",
    signup: language === 'ar' ? "إنشاء حساب" : "Sign Up",
    dashboard: language === 'ar' ? "لوحة التحكم" : "Dashboard",
    adminDashboard: language === 'ar' ? "لوحة تحكم المشرف" : "Admin Dashboard",
    myProfile: language === 'ar' ? "ملفي الشخصي" : "My Profile",
    settings: language === 'ar' ? "الإعدادات" : "Settings",
    logoutLabel: language === 'ar' ? "تسجيل الخروج" : "Log out",
    languageToggleTitle: language === 'en' ? "Switch to Arabic" : "Switch to English",
    notifications: language === 'ar' ? "الإشعارات" : "Notifications",
    noNewNotifications: language === 'ar' ? "لا توجد إشعارات جديدة." : "No new notifications.",
    viewAll: language === 'ar' ? "عرض الكل" : "View All",
  };

  const dateLocale = language === 'ar' ? ar : enUS;

  useEffect(() => {
    if (user && (user.role === USER_ROLES.SUPER_ADMIN || user.role === USER_ROLES.ADMIN || user.role === USER_ROLES.SALES)) {
      const q = query(
        collection(db, "notifications"),
        orderBy("timestamp", "desc"),
        limit(10)
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const fetchedNotifications = snapshot.docs.map(doc => {
          const data = doc.data();
          const timestamp = data.timestamp;
          return {
            id: doc.id,
            ...data,
            timestamp: timestamp && typeof timestamp.toDate === 'function'
              ? timestamp.toDate()
              : timestamp instanceof Date
                ? timestamp
                : new Date(),
          } as Notification;
        });
        setNotifications(fetchedNotifications);
        if (fetchedNotifications.length > 0) {
            try {
              const latestNotificationTime = fetchedNotifications[0].timestamp as Date;
              const storedLastCheckedTime = localStorage.getItem(`lastCheckedNotifications_${user.uid}`);
              if (storedLastCheckedTime && latestNotificationTime instanceof Date) {
                  setShowNotificationDot(latestNotificationTime.getTime() > new Date(storedLastCheckedTime).getTime());
              } else {
                  setShowNotificationDot(true);
              }
            } catch (error) {
              console.error('Error processing notifications:', error);
              setShowNotificationDot(false);
            }
        } else {
            setShowNotificationDot(false);
        }
      });
      return () => unsubscribe();
    } else {
      setNotifications([]);
      setShowNotificationDot(false);
    }
  }, [user]);

  const handleOpenNotificationDropdown = (open: boolean) => {
    if (open && notifications.length > 0 && user) {
        try {
          const latestTimestamp = notifications[0].timestamp;
          if (latestTimestamp instanceof Date) {
            localStorage.setItem(`lastCheckedNotifications_${user.uid}`, latestTimestamp.toISOString());
            setShowNotificationDot(false);
          }
        } catch (error) {
          console.error('Error handling notification dropdown:', error);
        }
    }
  };

  return (
    <header className="bg-secondary border-b border-border sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="text-2xl font-headline font-bold text-primary">
          {appName}
        </Link>
        <nav className="flex items-center space-x-1 sm:space-x-2">
          <Button variant="ghost" asChild className="text-foreground hover:bg-accent hover:text-accent-foreground">
            <Link href="/">
              <Home className="mr-0 sm:mr-2 h-4 w-4" /> 
              <span className="hidden sm:inline">{translations.home}</span>
            </Link>
          </Button>
          
          {user && (user.role === USER_ROLES.SUPER_ADMIN || user.role === USER_ROLES.ADMIN || user.role === USER_ROLES.SALES || user.role === USER_ROLES.ACCOUNTANT) && (
            <Button variant="ghost" asChild className="text-foreground hover:bg-accent hover:text-accent-foreground">
              <Link href="/admin">
                <LayoutDashboard className="mr-0 sm:mr-2 h-4 w-4" /> 
                <span className="hidden sm:inline">
                  {user.role === USER_ROLES.SALES || user.role === USER_ROLES.ACCOUNTANT ? translations.dashboard : translations.adminDashboard}
                </span>
              </Link>
            </Button>
          )}

          <Button variant="ghost" size="icon" onClick={toggleLanguage} title={translations.languageToggleTitle} className="text-foreground hover:bg-accent hover:text-accent-foreground">
            <Languages className="h-5 w-5" />
            <span className="sr-only">{translations.languageToggleTitle}</span>
          </Button>

          {user && (user.role === USER_ROLES.SUPER_ADMIN || user.role === USER_ROLES.ADMIN || user.role === USER_ROLES.SALES) && (
            <DropdownMenu onOpenChange={handleOpenNotificationDropdown}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative text-foreground hover:bg-accent hover:text-accent-foreground">
                  <Bell className="h-5 w-5" />
                  {showNotificationDot && (
                    <span className="absolute top-1 right-1 flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                    </span>
                  )}
                  <span className="sr-only">{translations.notifications}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto">
                <DropdownMenuLabel className="flex justify-between items-center">
                  {translations.notifications}
                  {notifications.length > 0 && (
                     <Badge variant="secondary">{notifications.length}</Badge>
                  )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {notifications.length > 0 ? (
                  notifications.map(notification => (
                    <DropdownMenuItem key={notification.id} asChild className="cursor-pointer">
                      <Link href={notification.link || "#"} className="flex flex-col items-start p-2 hover:bg-accent">
                        <p className={cn("text-sm whitespace-normal break-words", notification.type === 'new_reservation' ? 'font-semibold' : '')}>
                           {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {(() => {
                            try {
                              const date = notification.timestamp instanceof Date
                                ? notification.timestamp
                                : new Date(notification.timestamp);
                              return formatDistanceToNow(date, { addSuffix: true, locale: dateLocale });
                            } catch (error) {
                              return 'Recently';
                            }
                          })()}
                        </p>
                      </Link>
                    </DropdownMenuItem>
                  ))
                ) : (
                  <DropdownMenuItem disabled className="text-center py-4">
                    <AlertCircle className="mr-2 h-4 w-4 text-muted-foreground" />
                    {translations.noNewNotifications}
                  </DropdownMenuItem>
                )}
                {notifications.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild className="text-center">
                      <Link href="/admin/notifications"> 
                        <Button variant="link" className="w-full justify-center text-primary">
                            {translations.viewAll}
                        </Button>
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {authLoading ? (
            <div className="w-8 h-8 bg-muted rounded-full animate-pulse" />
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.displayName || undefined} alt={user.displayName || user.email || 'User'} />
                    <AvatarFallback>{getInitials(user.displayName || user.email || undefined)}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.displayName || user.email}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email} ({formatRoleDisplay(user.role, language)})
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem asChild>
                    <Link href="/profile">
                      <UserCircle className="mr-2 h-4 w-4" />
                      {translations.myProfile}
                    </Link>
                  </DropdownMenuItem>
                   <DropdownMenuItem asChild>
                    <Link href="/profile/settings">
                      <Settings className="mr-2 h-4 w-4" />
                      {translations.settings}
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  {translations.logoutLabel}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button variant="ghost" asChild className="text-foreground hover:bg-accent hover:text-accent-foreground">
                <Link href="/signup">
                  <UserPlus className={cn("h-4 w-4", direction === 'rtl' ? 'ml-2' : 'mr-2')} /> {translations.signup}
                </Link>
              </Button>
              <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Link href="/login">
                  <LogIn className={cn("h-4 w-4", direction === 'rtl' ? 'ml-2' : 'mr-2')} /> {translations.login}
                </Link>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
