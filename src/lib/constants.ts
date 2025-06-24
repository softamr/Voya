
export const USER_ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  SALES: 'sales',
  ACCOUNTANT: 'accountant',
  SUPERVISOR: 'supervisor',
  RECEPTIONIST: 'receptionist',
  // GUEST: 'guest', // Removed GUEST as AUTHENTICATED_USER will be the default for signed-up users
  AUTHENTICATED_USER: 'authenticated_user',
  PUBLIC_USER: 'public_user', // For users not logged in
} as const;

const userRolesAsArray = Object.values(USER_ROLES);
export type UserRole = typeof userRolesAsArray[number];

export const PROTECTED_ROUTES_CONFIG: Record<UserRole, string[]> = {
  [USER_ROLES.SUPER_ADMIN]: [
    '/admin', 
    '/profile',
    '/admin/expenses',
    '/admin/expenses/trip-expenses',
    '/admin/expenses/administration-expenses',
    '/admin/revenue', 
    '/admin/housing',
  ],
  [USER_ROLES.ADMIN]: [
    '/admin', 
    '/profile',
    '/admin/expenses', 
    '/admin/expenses/trip-expenses', 
    '/admin/expenses/administration-expenses', 
    '/admin/revenue',
    '/admin/housing',
  ],
  [USER_ROLES.SALES]: [
    '/admin',
    '/admin/destinations', 
    '/admin/hotels',       
    '/admin/trip-dates',   
    '/admin/reservations', 
    '/admin/payments',     
    '/admin/housing',
    '/profile'
  ],
  [USER_ROLES.ACCOUNTANT]: [
    '/profile', 
    '/admin/payments', 
    '/admin',
    '/admin/revenue', 
    '/admin/expenses',
    '/admin/expenses/trip-expenses', 
    '/admin/expenses/administration-expenses',
  ], 
  [USER_ROLES.SUPERVISOR]: ['/admin', '/profile'], 
  [USER_ROLES.RECEPTIONIST]: ['/profile'], 
  // [USER_ROLES.GUEST]: ['/profile'], // Removed GUEST
  [USER_ROLES.AUTHENTICATED_USER]: ['/profile'], // Standard logged-in users can access their profile
  [USER_ROLES.PUBLIC_USER]: [], // Public users (not logged in) have no specific protected routes here
};

export const TRIP_FEATURES = [
  "Transportation Included",
  "Breakfast Included",
  "Lunch Included",
  "Dinner Included",
  "Free Guided Tours",
  "Wi-Fi Access",
  "Pool Access"
] as const;

export type TripFeature = typeof TRIP_FEATURES[number];

export const TRIP_FEATURES_TRANSLATIONS: Record<TripFeature, { en: string, ar: string }> = {
  "Transportation Included": { en: "Transportation Included", ar: "النقل مشمول" },
  "Breakfast Included": { en: "Breakfast Included", ar: "الإفطار مشمول" },
  "Lunch Included": { en: "Lunch Included", ar: "الغداء مشمول" },
  "Dinner Included": { en: "Dinner Included", ar: "العشاء مشمول" },
  "Free Guided Tours": { en: "Free Guided Tours", ar: "جولات إرشادية مجانية" },
  "Wi-Fi Access": { en: "Wi-Fi Access", ar: "توفر خدمة الواي فاي" },
  "Pool Access": { en: "Pool Access", ar: "إمكانية استخدام حمام السباحة" },
};

export const formatRoleDisplay = (role: UserRole, lang: 'en' | 'ar') => {
  const roleTranslations: Record<UserRole, { en: string, ar: string }> = {
    [USER_ROLES.SUPER_ADMIN]: { en: 'Super Admin', ar: 'مسؤول خارق' },
    [USER_ROLES.ADMIN]: { en: 'Admin', ar: 'مسؤول' },
    [USER_ROLES.SALES]: { en: 'Sales', ar: 'مبيعات' },
    [USER_ROLES.ACCOUNTANT]: { en: 'Accountant', ar: 'محاسب' },
    [USER_ROLES.SUPERVISOR]: { en: 'Supervisor', ar: 'مشرف' },
    [USER_ROLES.RECEPTIONIST]: { en: 'Receptionist', ar: 'موظف استقبال' },
    // [USER_ROLES.GUEST]: { en: 'Guest', ar: 'ضيف' }, // Removed
    [USER_ROLES.AUTHENTICATED_USER]: { en: 'Authenticated User', ar: 'مستخدم موثق' },
    [USER_ROLES.PUBLIC_USER]: { en: 'Public User', ar: 'مستخدم عام' },
  };
  return roleTranslations[role]?.[lang] || role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};
