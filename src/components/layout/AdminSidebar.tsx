
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, Users, Map, Hotel, BedDouble, CalendarPlus, FileText, Settings, ChevronLeft, ChevronRight, LogOut, CreditCard, Receipt, DollarSign, BookText as AccountingIcon, Home as HomeIconLucide, ChevronDown, ChevronUp } from 'lucide-react';
import { USER_ROLES, type UserRole } from '@/lib/constants';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

interface NavItemType {
  href: string;
  label: string;
  label_ar: string;
  icon: React.ElementType;
  disabled?: boolean;
  exactMatch?: boolean;
  allowedRoles: UserRole[];
  children?: NavItemType[];
  isGroupHeader?: boolean; 
}

// Chevron components for group expansion
const ChevronDownIcon = ({ className }: { className?: string }) => <ChevronDown className={cn("h-4 w-4", className)} />;
const ChevronRightIcon = ({ className }: { className?: string }) => <ChevronRight className={cn("h-4 w-4", className)} />;


const MASTER_NAV_CONFIG: NavItemType[] = [
  { href: '/admin', label: 'Dashboard', label_ar: 'لوحة التحكم', icon: LayoutDashboard, exactMatch: true, allowedRoles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.SALES, USER_ROLES.ACCOUNTANT] },
  { href: '/admin/users', label: 'User Management', label_ar: 'إدارة المستخدمين', icon: Users, allowedRoles: [USER_ROLES.SUPER_ADMIN] },
  { href: '/admin/destinations', label: 'Destinations', label_ar: 'الوجهات', icon: Map, allowedRoles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.SALES] },
  { href: '/admin/hotels', label: 'Hotels', label_ar: 'الفنادق', icon: Hotel, allowedRoles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.SALES] },
  { href: '/admin/room-types', label: 'Room Types', label_ar: 'أنواع الغرف', icon: BedDouble, allowedRoles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN] },
  { href: '/admin/trip-dates', label: 'Trip Dates', label_ar: 'تواريخ الرحلات', icon: CalendarPlus, allowedRoles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.SALES] },
  { href: '/admin/reservations', label: 'Reservations', label_ar: 'الحجوزات', icon: FileText, allowedRoles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.SALES, USER_ROLES.ACCOUNTANT] },
  { href: '/admin/housing', label: 'Housing', label_ar: 'تسكين الغرف', icon: HomeIconLucide, allowedRoles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.SALES] },
  {
    href: '/admin/accounting', 
    label: 'Accounting',
    label_ar: 'المحاسبة',
    icon: AccountingIcon,
    isGroupHeader: true,
    allowedRoles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.ACCOUNTANT, USER_ROLES.SALES], 
    children: [
      { href: '/admin/payments', label: 'Payments', label_ar: 'المدفوعات', icon: CreditCard, allowedRoles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.ACCOUNTANT, USER_ROLES.SALES] },
      { href: '/admin/expenses', label: 'Expenses', label_ar: 'المصروفات', icon: Receipt, allowedRoles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.ACCOUNTANT] },
      { href: '/admin/revenue', label: 'Revenue', label_ar: 'الإيرادات', icon: DollarSign, allowedRoles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.ACCOUNTANT] },
    ]
  },
];

const settingsItemConfig: NavItemType = {
  href: '/admin/settings',
  label: 'Settings',
  label_ar: 'الإعدادات',
  icon: Settings,
  allowedRoles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN], 
};

export default function AdminSidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const { appName, language, direction } = useLanguage();

  const [navConfigToRender, setNavConfigToRender] = useState<NavItemType[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const translations = {
    collapseSidebar: language === 'ar' ? 'طي الشريط الجانبي' : 'Collapse Sidebar',
    expandSidebar: language === 'ar' ? 'توسيع الشريط الجانبي' : 'Expand Sidebar',
    logout: language === 'ar' ? 'تسجيل الخروج' : 'Logout',
  };

 useEffect(() => {
    if (user && user.role) {
      const newNavConfig = MASTER_NAV_CONFIG
        .map(item => {
          if (!item.allowedRoles.includes(user.role!)) {
            return null; 
          }
          if (item.children) {
            const filteredChildren = item.children.filter(child => child.allowedRoles.includes(user.role!));
            // Only include the group if it has visible children for this role
            return filteredChildren.length > 0 ? { ...item, children: filteredChildren } : null;
          }
          return item; 
        })
        .filter(Boolean) as NavItemType[];
      setNavConfigToRender(newNavConfig);

      // Default expand Accounting for Accountants, otherwise respect current state or collapse
      setExpandedGroups(prev => ({
        ...prev,
        '/admin/accounting': user.role === USER_ROLES.ACCOUNTANT || (prev['/admin/accounting'] === true) // Persist if already true
      }));

    } else {
      setNavConfigToRender([]);
      setExpandedGroups({});
    }
  }, [user, language]); // MASTER_NAV_CONFIG is stable

  const toggleGroup = (groupHref: string) => {
    setExpandedGroups(prev => ({ ...prev, [groupHref]: !prev[groupHref] }));
  };

  const isActive = useCallback((itemToCheck: NavItemType) => {
    if (!pathname) return false;
    if (itemToCheck.exactMatch) {
      return pathname === itemToCheck.href;
    }
    const itemHrefWithSlash = itemToCheck.href.endsWith('/') ? itemToCheck.href : `${itemToCheck.href}/`;
    const pathnameWithSlash = pathname.endsWith('/') ? pathname : `${pathname}/`;
    
    // Check if current path starts with item's href OR if any child is active (for groups)
    if (pathnameWithSlash.startsWith(itemHrefWithSlash) || pathname === itemToCheck.href) {
        return true;
    }
    if (itemToCheck.children) {
        return itemToCheck.children.some(child => isActive(child));
    }
    return false;
  }, [pathname]);


  const CollapseIcon = direction === 'rtl' ? ChevronRight : ChevronLeft;
  const ExpandIcon = direction === 'rtl' ? ChevronLeft : ChevronRight;

  if (!user) { 
    return null;
  }

  const shouldShowSettings = settingsItemConfig.allowedRoles.includes(user.role!);

  return (
    <aside className={cn(
      "h-screen bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-300 ease-in-out shadow-xl",
      isCollapsed ? "w-20" : "w-72",
      direction === 'rtl' ? 'border-l border-sidebar-border' : 'border-r border-sidebar-border'
    )}>
      <div className={cn("h-16 border-b border-sidebar-border flex items-center px-4 bg-sidebar-accent/30", isCollapsed ? "justify-center" : "justify-between")}>
        {!isCollapsed && (
          <Link href="/" className="text-xl font-headline font-bold text-sidebar-primary hover:text-sidebar-primary/80 transition-colors">
            {appName}
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={cn(
            "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-all duration-200 rounded-lg",
            isCollapsed ? "" : (direction === 'ltr' ? "ml-auto" : "mr-auto")
          )}
        >
          {isCollapsed ? <ExpandIcon className="h-5 w-5" /> : <CollapseIcon className="h-5 w-5" />}
          <span className="sr-only">{isCollapsed ? translations.expandSidebar : translations.collapseSidebar}</span>
        </Button>
      </div>

      <ScrollArea className="flex-grow">
        <nav className="px-3 py-6 space-y-2">
          {navConfigToRender.map((item) => {
            const itemLabel = language === 'ar' ? item.label_ar : item.label;
            
            if (item.children && item.children.length > 0) { 
              const isGroupActive = item.children.some(child => isActive(child));
              return (
                <div key={item.href} className="space-y-1">
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full text-sm h-12 rounded-xl transition-all duration-200 group",
                      isActive(item) || isGroupActive
                        ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-lg"
                        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      isCollapsed ? "justify-center px-0" : "justify-start px-4",
                      direction === 'rtl' && !isCollapsed && "text-right flex-row-reverse"
                    )}
                    onClick={() => toggleGroup(item.href)}
                    title={isCollapsed ? itemLabel : undefined}
                  >
                    <div className={cn(
                      "p-2 rounded-lg transition-colors",
                      isActive(item) || isGroupActive
                        ? "bg-sidebar-primary-foreground/20"
                        : "group-hover:bg-sidebar-primary/20"
                    )}>
                      <item.icon className="h-5 w-5" />
                    </div>
                    {!isCollapsed && (
                      <>
                        <span className={cn("flex-grow font-medium", direction === 'ltr' ? "ml-3" : "mr-3")}>{itemLabel}</span>
                        <div className="p-1 rounded-md">
                          {expandedGroups[item.href] ? <ChevronDownIcon className="h-4 w-4" /> : (direction === 'rtl' ? <ChevronLeft className="h-4 w-4"/> : <ChevronRightIcon className="h-4 w-4" />)}
                        </div>
                      </>
                    )}
                  </Button>
                  {expandedGroups[item.href] && !isCollapsed && (
                    <ul className={cn("mt-2 space-y-1",
                                      direction === 'ltr' ? "pl-6 border-l-2 ml-4 border-sidebar-border"
                                                          : "pr-6 border-r-2 mr-4 border-sidebar-border")}>
                      {item.children.map((child) => {
                        const childLabel = language === 'ar' ? child.label_ar : child.label;
                        return (
                        <li key={child.href}>
                          <Button
                            variant="ghost"
                            className={cn(
                              "w-full text-sm h-10 rounded-lg transition-all duration-200 group",
                              isActive(child)
                                ? "bg-sidebar-primary/20 text-sidebar-primary border border-sidebar-primary/30"
                                : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                              isCollapsed ? "justify-center px-0" : "justify-start px-3",
                              direction === 'rtl' && !isCollapsed && "text-right flex-row-reverse"
                            )}
                            asChild
                            disabled={child.disabled}
                          >
                            <Link href={child.href} title={isCollapsed ? childLabel : undefined}>
                              <div className={cn(
                                "p-1.5 rounded-md transition-colors",
                                isActive(child) ? "bg-sidebar-primary/20" : "group-hover:bg-sidebar-primary/10"
                              )}>
                                <child.icon className="h-4 w-4" />
                              </div>
                              {!isCollapsed && <span className={cn("font-medium", direction === 'ltr' ? "ml-2" : "mr-2")}>{childLabel}</span>}
                            </Link>
                          </Button>
                        </li>
                      )})}
                    </ul>
                  )}
                </div>
              );
            } else {
              return (
                <Button
                  key={item.href}
                  variant="ghost"
                  className={cn(
                    "w-full text-sm h-12 rounded-xl transition-all duration-200 group",
                    isActive(item)
                      ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-lg"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    isCollapsed ? "justify-center px-0" : "justify-start px-4",
                    direction === 'rtl' && !isCollapsed && "text-right flex-row-reverse"
                  )}
                  asChild
                  disabled={item.disabled}
                >
                  <Link href={item.href} title={isCollapsed ? itemLabel : undefined}>
                    <div className={cn(
                      "p-2 rounded-lg transition-colors",
                      isActive(item) ? "bg-sidebar-primary-foreground/20" : "group-hover:bg-sidebar-primary/20"
                    )}>
                      <item.icon className="h-5 w-5" />
                    </div>
                    {!isCollapsed && <span className={cn("font-medium", direction === 'ltr' ? "ml-3" : "mr-3")}>{itemLabel}</span>}
                  </Link>
                </Button>
              );
            }
          })}
        </nav>
      </ScrollArea>

      <div className="mt-auto border-t border-sidebar-border bg-sidebar-accent/20 p-3 space-y-2">
        {shouldShowSettings && (
          <Button
              variant="ghost"
              className={cn(
                "w-full text-sm h-12 rounded-xl transition-all duration-200 group",
                isActive(settingsItemConfig)
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-lg"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                isCollapsed ? "justify-center px-0" : "justify-start px-4",
                direction === 'rtl' && !isCollapsed && "text-right flex-row-reverse"
              )}
              asChild
              disabled={settingsItemConfig.disabled}
            >
              <Link href={settingsItemConfig.href} title={isCollapsed ? (language === 'ar' ? settingsItemConfig.label_ar : settingsItemConfig.label) : undefined}>
                <div className={cn(
                  "p-2 rounded-lg transition-colors",
                  isActive(settingsItemConfig) ? "bg-sidebar-primary-foreground/20" : "group-hover:bg-sidebar-primary/20"
                )}>
                  <settingsItemConfig.icon className="h-5 w-5" />
                </div>
                {!isCollapsed && <span className={cn("font-medium", direction === 'ltr' ? "ml-3" : "mr-3")}>{language === 'ar' ? settingsItemConfig.label_ar : settingsItemConfig.label}</span>}
              </Link>
          </Button>
        )}
        <Button
            variant='ghost'
            className={cn(
              "w-full text-sm h-12 rounded-xl transition-all duration-200 group text-red-400 hover:text-white hover:bg-red-500/90",
              isCollapsed ? "justify-center px-0" : "justify-start px-4",
              direction === 'rtl' && !isCollapsed && "text-right flex-row-reverse"
            )}
            onClick={logout}
            title={isCollapsed ? translations.logout : undefined}
          >
            <div className="p-2 rounded-lg transition-colors group-hover:bg-white/20">
              <LogOut className="h-5 w-5" />
            </div>
            {!isCollapsed && <span className={cn("font-medium", direction === 'ltr' ? "ml-3" : "mr-3")}>{translations.logout}</span>}
        </Button>
      </div>
    </aside>
  );
}

