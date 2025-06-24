
"use client";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch"; // Assuming Switch component exists for dark mode
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from 'react';
import { UserCog, Palette } from 'lucide-react'; // Using UserCog for profile settings
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

// Re-using hexToHsl from Admin Settings, could be moved to a util if shared more broadly
function hexToHsl(hex: string): { h: number, s: number, l: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;
  let r = parseInt(result[1], 16) / 255, g = parseInt(result[2], 16) / 255, b = parseInt(result[3], 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) { h = s = 0; } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
      default: h = 0; 
    }
    h /= 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

const DEFAULT_PRIMARY_COLOR_USER = "#6495ED"; // Same as admin for consistency unless specified otherwise
const DEFAULT_BACKGROUND_COLOR_USER = "#F0F0F0";
const DEFAULT_ACCENT_COLOR_USER = "#8FBC8F";

export default function UserProfileSettingsPage() {
  const { user } = useAuth(); // User might be null initially
  const { toast } = useToast();
  const { language, direction } = useLanguage();

  const [displayName, setDisplayName] = useState(user?.displayName || '');
  // Password change fields are not part of this basic settings page yet
  const [isLoading, setIsLoading] = useState(true);

  // Theme settings local to user profile settings page
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [primaryColor, setPrimaryColor] = useState(DEFAULT_PRIMARY_COLOR_USER);
  const [backgroundColor, setBackgroundColor] = useState(DEFAULT_BACKGROUND_COLOR_USER);
  const [accentColor, setAccentColor] = useState(DEFAULT_ACCENT_COLOR_USER);

  const translations = {
    en: {
      pageTitle: "Profile Settings",
      pageDescription: "Manage your personal account settings and preferences.",
      accountSettingsTitle: "Account Settings",
      displayNameLabel: "Display Name",
      saveAccountButton: "Save Account Changes",
      themeAppearanceTitle: "Theme & Appearance",
      themeAppearanceDescription: "Customize your viewing experience.",
      primaryColorLabel: "Primary Color",
      backgroundColorLabel: "Background Color (Light Theme)",
      accentColorLabel: "Accent Color",
      livePreviewText: "(Live Preview)",
      darkModeLabel: "Dark Mode",
      darkModeDescription: "Toggle dark mode for the application.",
      themePreferencesNote: "Theme preferences are saved in your browser.",
      toastChangesSaved: "Changes Saved",
      toastProfileUpdated: "Your profile has been updated.",
      toastThemeUpdated: "Theme preference updated.",
      toastDarkModeEnabled: "Dark Mode Enabled",
      toastDarkModeDisabled: "Dark Mode Disabled",
      loadingSettings: "Loading settings...",
    },
    ar: {
      pageTitle: "إعدادات الملف الشخصي",
      pageDescription: "إدارة إعدادات حسابك الشخصي وتفضيلاتك.",
      accountSettingsTitle: "إعدادات الحساب",
      displayNameLabel: "الاسم المعروض",
      saveAccountButton: "حفظ تغييرات الحساب",
      themeAppearanceTitle: "المظهر والتخصيص",
      themeAppearanceDescription: "قم بتخصيص تجربة العرض الخاصة بك.",
      primaryColorLabel: "اللون الأساسي",
      backgroundColorLabel: "لون الخلفية (السمة الفاتحة)",
      accentColorLabel: "لون التمييز",
      livePreviewText: "(معاينة مباشرة)",
      darkModeLabel: "الوضع الداكن",
      darkModeDescription: "تبديل الوضع الداكن للتطبيق.",
      themePreferencesNote: "يتم حفظ تفضيلات السمة في متصفحك.",
      toastChangesSaved: "تم حفظ التغييرات",
      toastProfileUpdated: "تم تحديث ملفك الشخصي.",
      toastThemeUpdated: "تم تحديث تفضيل السمة.",
      toastDarkModeEnabled: "تم تفعيل الوضع الداكن",
      toastDarkModeDisabled: "تم تعطيل الوضع الداكن",
      loadingSettings: "جارٍ تحميل الإعدادات...",
    }
  };
  const currentTranslations = translations[language];

  const applyColorVariableToRoot = (variableName: string, hexColor: string) => {
    const hsl = hexToHsl(hexColor);
    if (hsl && document?.documentElement) {
      document.documentElement.style.setProperty(variableName, `${hsl.h} ${hsl.s}% ${hsl.l}%`);
    }
  };

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '');
    }
    // Load theme preferences from localStorage
    const storedDarkMode = localStorage.getItem('voya_darkMode_user') === 'true'; // Updated key
    setIsDarkMode(storedDarkMode);
    if (document?.documentElement) {
        document.documentElement.classList.toggle('dark', storedDarkMode);
    }

    const storedPrimary = localStorage.getItem('khatwa_primaryColor_user') || DEFAULT_PRIMARY_COLOR_USER; // Updated key
    setPrimaryColor(storedPrimary);
    applyColorVariableToRoot('--primary', storedPrimary);

    const storedBackground = localStorage.getItem('khatwa_backgroundColor_user') || DEFAULT_BACKGROUND_COLOR_USER; // Updated key
    setBackgroundColor(storedBackground);
    applyColorVariableToRoot('--background', storedBackground);
    
    const storedAccent = localStorage.getItem('khatwa_accentColor_user') || DEFAULT_ACCENT_COLOR_USER; // Updated key
    setAccentColor(storedAccent);
    applyColorVariableToRoot('--accent', storedAccent);

    setIsLoading(false);
  }, [user]);


  const handleSaveAccountChanges = async () => {
    if (!user) return;
    // In a real app, call an updateProfile function from AuthContext
    // e.g., await updateProfile({ displayName });
    // For now, just show a toast
    toast({
      title: currentTranslations.toastChangesSaved,
      description: currentTranslations.toastProfileUpdated,
    });
  };
  
  const handleUserDarkModeToggle = (checked: boolean) => {
    setIsDarkMode(checked);
    if (document?.documentElement) {
        document.documentElement.classList.toggle('dark', checked);
    }
    localStorage.setItem('voya_darkMode_user', String(checked)); // Updated key
    toast({
        title: checked ? currentTranslations.toastDarkModeEnabled : currentTranslations.toastDarkModeDisabled,
        description: currentTranslations.toastThemeUpdated,
    });
  };

  const handleUserColorChange = (
    colorSetter: React.Dispatch<React.SetStateAction<string>>,
    localStorageKey: string,
    cssVariable: string
  ) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = event.target.value;
    colorSetter(newColor);
    applyColorVariableToRoot(cssVariable, newColor);
    localStorage.setItem(localStorageKey, newColor); // localStorageKey is passed with updated prefix
    toast({ title: currentTranslations.toastThemeUpdated });
  };


  if (isLoading || !user) {
    // You might want a more specific loading skeleton here
    return <div className="container mx-auto px-4 py-8">{currentTranslations.loadingSettings}</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8" dir={direction}>
      <section>
        <h1 className="text-3xl font-headline font-bold">{currentTranslations.pageTitle}</h1>
        <p className="text-muted-foreground">{currentTranslations.pageDescription}</p>
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><UserCog className={cn("h-5 w-5 text-primary", direction === 'rtl' ? 'ml-2' : 'mr-2')} /> {currentTranslations.accountSettingsTitle}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="displayName">{currentTranslations.displayNameLabel}</Label>
            <Input id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>
          {/* Placeholder for password change form */}
          <Button onClick={handleSaveAccountChanges}>{currentTranslations.saveAccountButton}</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><Palette className={cn("h-5 w-5 text-primary", direction === 'rtl' ? 'ml-2' : 'mr-2')} /> {currentTranslations.themeAppearanceTitle}</CardTitle>
          <CardDescription>{currentTranslations.themeAppearanceDescription}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="userPrimaryColor">{currentTranslations.primaryColorLabel}</Label>
              <div className="flex items-center gap-2">
                <Input id="userPrimaryColor" type="color" value={primaryColor} onChange={handleUserColorChange(setPrimaryColor, 'voya_primaryColor_user', '--primary')} className="w-16 h-10 p-1 cursor-pointer" />
                <span className="text-sm text-muted-foreground">{primaryColor.toUpperCase()} {currentTranslations.livePreviewText}</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="userBackgroundColor">{currentTranslations.backgroundColorLabel}</Label>
              <div className="flex items-center gap-2">
                <Input id="userBackgroundColor" type="color" value={backgroundColor} onChange={handleUserColorChange(setBackgroundColor, 'khatwa_backgroundColor_user', '--background')} className="w-16 h-10 p-1 cursor-pointer" />
                <span className="text-sm text-muted-foreground">{backgroundColor.toUpperCase()} {currentTranslations.livePreviewText}</span>
              </div>
            </div>
             <div className="space-y-2">
              <Label htmlFor="userAccentColor">{currentTranslations.accentColorLabel}</Label>
              <div className="flex items-center gap-2">
                <Input id="userAccentColor" type="color" value={accentColor} onChange={handleUserColorChange(setAccentColor, 'voya_accentColor_user', '--accent')} className="w-16 h-10 p-1 cursor-pointer" />
                <span className="text-sm text-muted-foreground">{accentColor.toUpperCase()} {currentTranslations.livePreviewText}</span>
              </div>
            </div>
            <div className="flex items-center justify-between space-x-2 p-4 border rounded-lg bg-card hover:bg-muted/50 transition-colors">
                <div className="space-y-0.5">
                    <Label htmlFor="userDarkModeToggle" className="text-base font-medium">{currentTranslations.darkModeLabel}</Label>
                    <p className="text-sm text-muted-foreground">{currentTranslations.darkModeDescription}</p>
                </div>
                <Switch id="userDarkModeToggle" checked={isDarkMode} onCheckedChange={handleUserDarkModeToggle} aria-label={currentTranslations.darkModeLabel} />
            </div>
            <p className="text-sm text-muted-foreground italic">{currentTranslations.themePreferencesNote}</p>
        </CardContent>
      </Card>
    </div>
  );
}
