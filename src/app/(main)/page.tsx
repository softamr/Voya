
// Using "use client" for potential interactivity like search/filter state management
"use client"; 

import type { NextPage } from 'next';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Image from 'next/image';
import Link from 'next/link';
import { MapPin, Search, CalendarDays, Hotel, BedDouble, Settings, UserPlus, Loader2, Camera, Video, CalendarCheck2, MessageSquare, BadgePercent, Star, Smartphone, Users, Plane, ArrowRight, Globe, Award, Shield, Clock, TrendingUp, Sparkles, Heart, CheckCircle, Play, Zap, Target, Mail, Phone, MapPinIcon, Send } from 'lucide-react';
import type { Destination, HomepageBanner, HomepageConfig } from '@/lib/types'; 
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useState, useEffect, useRef } from 'react'; // Added useRef
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, onSnapshot, orderBy, Timestamp, where, doc, getDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from "@/components/ui/carousel";

// Helper function to convert video URLs to embed URLs
const getEmbedUrl = (url: string): { type: 'iframe' | 'video'; src: string } | null => {
  if (!url) return null;
  let videoId;
  if (url.includes("youtube.com/watch?v=")) {
    videoId = url.split("v=")[1]?.split("&")[0];
    return videoId ? { type: 'iframe', src: `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}` } : null;
  } else if (url.includes("youtu.be/")) {
    videoId = url.split("youtu.be/")[1]?.split("?")[0];
    return videoId ? { type: 'iframe', src: `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}` } : null;
  } else if (url.includes("vimeo.com/")) {
    videoId = url.split("vimeo.com/")[1]?.split("?")[0];
    return videoId ? { type: 'iframe', src: `https://player.vimeo.com/video/${videoId}?autoplay=1&loop=1&muted=1` } : null;
  } else if (url.match(/\.(jpeg|jpg|gif|png)$/) != null) {
    return null; 
  } else if (url.match(/\.(mp4|webm|ogg)$/) != null) {
    return { type: 'video', src: url };
  }
  return { type: 'video', src: url }; 
};


const HomePage: NextPage = () => {
  const { isSuperAdminSetup, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const { appName, language, direction } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [allDestinations, setAllDestinations] = useState<Destination[]>([]);
  const [filteredDestinations, setFilteredDestinations] = useState<Destination[]>([]);
  const [destinationsLoading, setDestinationsLoading] = useState(true);
  const [homepageBanners, setHomepageBanners] = useState<HomepageBanner[]>([]);
  const [bannersLoading, setBannersLoading] = useState(true);
  const [homepageConfig, setHomepageConfig] = useState<HomepageConfig | null>(null);
  const [heroConfigLoading, setHeroConfigLoading] = useState(true);

  // Refs for animations
  const destinationsSectionRef = useRef<HTMLDivElement>(null);
  const reviewsSectionRef = useRef<HTMLDivElement>(null);
  const confidenceSectionRef = useRef<HTMLDivElement>(null);

  const [destinationsInView, setDestinationsInView] = useState(false);
  const [reviewsInView, setReviewsInView] = useState(false);
  const [confidenceInView, setConfidenceInView] = useState(false);

  // Contact form state
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    message: ''
  });
  const [isSubmittingContact, setIsSubmittingContact] = useState(false);

  useEffect(() => {
    const observerOptions = { threshold: 0 };
    const observerCallback = (
      entries: IntersectionObserverEntry[],
      observerInstance: IntersectionObserver
    ) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          if (entry.target === destinationsSectionRef.current) setDestinationsInView(true);
          if (entry.target === reviewsSectionRef.current) setReviewsInView(true);
          if (entry.target === confidenceSectionRef.current) setConfidenceInView(true);
          observerInstance.unobserve(entry.target);
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);
    if (destinationsSectionRef.current) observer.observe(destinationsSectionRef.current);
    if (reviewsSectionRef.current) observer.observe(reviewsSectionRef.current);
    if (confidenceSectionRef.current) observer.observe(confidenceSectionRef.current);
    
    return () => {
        if (destinationsSectionRef.current) observer.unobserve(destinationsSectionRef.current);
        if (reviewsSectionRef.current) observer.unobserve(reviewsSectionRef.current);
        if (confidenceSectionRef.current) observer.unobserve(confidenceSectionRef.current);
        observer.disconnect();
    };
  }, []);

  const translations = {
    en: {
      welcomeToSetup: `Welcome to ${appName}!`,
      setupDescription: "To get started, the application needs its first Super Admin account to be configured.",
      goToSetupButton: "Go to Super Admin Setup",
      setupCompleteMessage: `Once setup is complete, you'll be able to manage all aspects of ${appName}.`,
      discoverAdventure: "Discover Your Next Adventure",
      exploreDescription: `Explore amazing destinations and plan your internal trips with ease using ${appName}.`,
      searchPlaceholder: "Search destinations (e.g., Paris, Dubai...)",
      pickDateRange: "Pick a date range",
      exploreTripsButton: "Explore Trips",
      popularDestinations: "Popular Destinations",
      viewHotelsTripsButton: "View Hotels & Trips",
      heroSubtitle: "Create unforgettable memories with our curated travel experiences",
      startYourJourney: "Start Your Journey",
      trustedBy: "Trusted by thousands of travelers",
      whyChooseUs: "Why Choose Us",
      whyChooseUsSubtitle: "Experience the difference with our premium travel services",
      exploreNow: "Explore Now",
      bookingMadeEasy: "Booking Made Easy",
      bookingMadeEasyDesc: "Simple, fast, and secure booking process",
      premiumExperience: "Premium Experience",
      premiumExperienceDesc: "Luxury accommodations and exclusive experiences",
      expertSupport: "Expert Support",
      expertSupportDesc: "24/7 dedicated travel assistance",
      bestDeals: "Best Deals",
      bestDealsDesc: "Competitive prices and exclusive offers",
      noDestinationsMatch: "No destinations match your search criteria.",
      noDestinationsAdmin: "No destinations available at the moment. Admin can add some!",
      noDestinationsPublic: "No destinations available at the moment.",
      loadingAppState: "Loading application state...",
      loadingBannersText: "Loading Banners...",
      noBannersText: "No banners available.",
      aboutUsHeading: "About Us",
      clientReviewsTitle: "What Our Clients Say", 
      clientReviewsDescription: "Hear from fellow travelers about their experiences with us.", 
      bookWithConfidenceTitle: "Book With Confidence",
      payMonthlyTitle: "Pay Monthly",
      payMonthlyDesc: "Enjoy monthly payments and low deposits.",
      supportTitle: "24/7 Customer Support",
      supportDesc: "Our tour operators will be with you via live chat, WhatsApp, and mail.",
      bestPricesTitle: "Best Prices",
      bestPricesDesc: "We offer the finest prices from our countless tracked vacation tours.",
      rated5StarsTitle: "Rated 5 Stars",
      rated5StarsDesc: "We scored 5* reviews with more than 5000 client reviews on our TripAdvisor page.",
      fastBookingTitle: "Fast Booking",
      fastBookingDesc: "Book any trip you like as fast as possible and we will be by your side to answer any request you may desire.",
      contactUsTitle: "Get in Touch",
      contactUsSubtitle: "Ready to start your next adventure? We're here to help you plan the perfect trip.",
      contactUsDescription: "Have questions about our destinations, need help with booking, or want to customize your travel experience? Our expert team is ready to assist you.",
      emailLabel: "Email Us",
      emailAddress: "info@voya.com",
      phoneLabel: "Call Us",
      phoneNumber: "+20 123 456 7890",
      addressLabel: "Visit Us",
      address: "123 Travel Street, Cairo, Egypt",
      sendMessageButton: "Send Message",
      nameLabel: "Your Name",
      emailInputLabel: "Your Email",
      messageLabel: "Your Message",
      namePlaceholder: "Enter your full name",
      emailPlaceholder: "Enter your email address",
      messagePlaceholder: "Tell us about your travel plans or questions..."
    },
    ar: {
      welcomeToSetup: `مرحباً بك في ${appName}!`,
      setupDescription: "للبدء، يحتاج التطبيق إلى تكوين حساب المسؤول الخارق الأول.",
      goToSetupButton: "الذهاب إلى إعداد المسؤول الخارق",
      setupCompleteMessage: `بمجرد اكتمال الإعداد، ستتمكن من إدارة جميع جوانب ${appName}.`,
      discoverAdventure: "اكتشف مغامرتك القادمة",
      exploreDescription: `استكشف وجهات مذهلة وخطط لرحلاتك الداخلية بسهولة باستخدام ${appName}.`,
      searchPlaceholder: "ابحث عن وجهات (مثل باريس، دبي...)",
      pickDateRange: "اختر نطاق تاريخ",
      exploreTripsButton: "استكشف الرحلات",
      popularDestinations: "الوجهات الشائعة",
      viewHotelsTripsButton: "عرض الفنادق والرحلات",
      heroSubtitle: "اصنع ذكريات لا تُنسى مع تجاربنا السياحية المنتقاة",
      startYourJourney: "ابدأ رحلتك",
      trustedBy: "موثوق من قبل آلاف المسافرين",
      whyChooseUs: "لماذا تختارنا",
      whyChooseUsSubtitle: "اختبر الفرق مع خدماتنا السياحية المميزة",
      exploreNow: "استكشف الآن",
      bookingMadeEasy: "حجز سهل",
      bookingMadeEasyDesc: "عملية حجز بسيطة وسريعة وآمنة",
      premiumExperience: "تجربة مميزة",
      premiumExperienceDesc: "أماكن إقامة فاخرة وتجارب حصرية",
      expertSupport: "دعم خبراء",
      expertSupportDesc: "مساعدة سفر مخصصة على مدار الساعة",
      bestDeals: "أفضل العروض",
      bestDealsDesc: "أسعار تنافسية وعروض حصرية",
      noDestinationsMatch: "لا توجد وجهات تطابق معايير البحث الخاصة بك.",
      noDestinationsAdmin: "لا توجد وجهات متاحة حاليًا. يمكن للمسؤول إضافة المزيد!",
      noDestinationsPublic: "لا توجد وجهات متاحة حاليًا.",
      loadingAppState: "جارٍ تحميل حالة التطبيق...",
      loadingBannersText: "جار تحميل البنرات...",
      noBannersText: "لا توجد بنرات متاحة.",
      aboutUsHeading: "عنا",
      clientReviewsTitle: "ماذا يقول عملاؤنا", 
      clientReviewsDescription: "استمع إلى آراء المسافرين الآخرين حول تجاربهم معنا.", 
      bookWithConfidenceTitle: "احجز بثقة",
      payMonthlyTitle: "ادفع شهريًا",
      payMonthlyDesc: "استمتع بالدفعات الشهرية والودائع المنخفضة.",
      supportTitle: "دعم عملاء 24/7",
      supportDesc: "سيكون منظمو الرحلات لدينا معك عبر الدردشة المباشرة والواتساب والبريد.",
      bestPricesTitle: "أفضل الأسعار",
      bestPricesDesc: "نقدم أفضل الأسعار من جولاتنا السياحية العديدة المتعقبة.",
      rated5StarsTitle: "تقييم 5 نجوم",
      rated5StarsDesc: "حصلنا على تقييمات 5 نجوم مع أكثر من 5000 مراجعة من العملاء على صفحتنا في TripAdvisor.",
      fastBookingTitle: "حجز سريع",
      fastBookingDesc: "احجز أي رحلة تريدها بأسرع ما يمكن وسنكون بجانبك للرد على أي طلب ترغب به.",
      contactUsTitle: "تواصل معنا",
      contactUsSubtitle: "مستعد لبدء مغامرتك القادمة؟ نحن هنا لمساعدتك في التخطيط للرحلة المثالية.",
      contactUsDescription: "هل لديك أسئلة حول وجهاتنا، تحتاج مساعدة في الحجز، أو تريد تخصيص تجربة السفر الخاصة بك؟ فريق الخبراء لدينا جاهز لمساعدتك.",
      emailLabel: "راسلنا",
      emailAddress: "info@voya.com",
      phoneLabel: "اتصل بنا",
      phoneNumber: "+20 123 456 7890",
      addressLabel: "زرنا",
      address: "123 شارع السفر، القاهرة، مصر",
      sendMessageButton: "إرسال رسالة",
      nameLabel: "اسمك",
      emailInputLabel: "بريدك الإلكتروني",
      messageLabel: "رسالتك",
      namePlaceholder: "أدخل اسمك الكامل",
      emailPlaceholder: "أدخل عنوان بريدك الإلكتروني",
      messagePlaceholder: "أخبرنا عن خطط سفرك أو أسئلتك..."
    }
  };

  const currentTranslations = translations[language];

  const clientReviews = [
    {
      id: 1,
      name_en: "Ahmed Mansour",
      name_ar: "أحمد منصور",
      review_en: "Absolutely fantastic trip to Luxor and Aswan! Everything was well-organized, and the guides were knowledgeable. Highly recommend Khatwa!",
      review_ar: "رحلة رائعة للغاية إلى الأقصر وأسوان! كان كل شيء منظمًا جيدًا ، وكان المرشدون على دراية. أوصي بشدة بخطوة!",
      rating: 5,
      avatarFallback: "AM",
    },
    {
      id: 2,
      name_en: "Fatima Al-Sayed",
      name_ar: "فاطمة السيد",
      review_en: "Our family vacation to Hurghada was a dream. The hotel was amazing, and the Red Sea is breathtaking. Thank you, Khatwa, for the seamless experience.",
      review_ar: "كانت عطلة عائلتنا في الغردقة حلمًا. كان الفندق مذهلاً ، والبحر الأحمر يخطف الأنفاس. شكرًا لك يا خطوة على التجربة السلسة.",
      rating: 5,
      avatarFallback: "FS",
    },
    {
      id: 3,
      name_en: "David Miller",
      name_ar: "ديفيد ميلر",
      review_en: "Exploring Cairo's history was an unforgettable adventure. Khatwa made it easy and enjoyable. The customer service was top-notch.",
      review_ar: "كان استكشاف تاريخ القاهرة مغامرة لا تُنسى. جعلتها خطوة سهلة وممتعة. كانت خدمة العملاء من الدرجة الأولى.",
      rating: 4,
      avatarFallback: "DM",
    },
  ];


  useEffect(() => {
    setBannersLoading(true);
    const bannersQuery = query(
      collection(db, "homepageBanners"),
      where("isActive", "==", true),
      orderBy("order", "asc")
    );
    const unsubscribeBanners = onSnapshot(bannersQuery, (snapshot) => {
      const fetchedBanners = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        aboutUsText: doc.data().aboutUsText || '',
        aboutUsText_ar: doc.data().aboutUsText_ar || '',
        createdAt: (doc.data().createdAt as Timestamp)?.toDate(),
        updatedAt: (doc.data().updatedAt as Timestamp)?.toDate(),
      } as HomepageBanner));
      setHomepageBanners(fetchedBanners);
      setBannersLoading(false);
    }, (error) => {
      console.error("Error fetching homepage banners:", error);
      toast({ title: "Error", description: "Could not load homepage banners.", variant: "destructive" });
      setBannersLoading(false);
    });
    
    setHeroConfigLoading(true);
    const heroConfigDocRef = doc(db, 'siteConfiguration', 'homepage');
    const unsubscribeHeroConfig = onSnapshot(heroConfigDocRef, (docSnap) => {
        if (docSnap.exists()) {
            setHomepageConfig(docSnap.data() as HomepageConfig);
        } else {
            setHomepageConfig(null);
        }
        setHeroConfigLoading(false);
    }, (error) => {
        console.error("Error fetching hero config:", error);
        toast({ title: "Error", description: "Could not load homepage configuration.", variant: "destructive"});
        setHeroConfigLoading(false);
    });

    return () => {
      unsubscribeBanners();
      unsubscribeHeroConfig();
    };
  }, [toast]);

  useEffect(() => {
    setDestinationsLoading(true);
    const q = query(collection(db, "destinations"), orderBy("name", "asc"));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedDestinations: Destination[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toDate() : data.createdAt;
        const updatedAt = data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : data.updatedAt;

        fetchedDestinations.push({ 
            id: doc.id, 
            ...data,
            name_ar: data.name_ar,
            description_ar: data.description_ar,
            createdAt,
            updatedAt,
        } as Destination);
      });
      setAllDestinations(fetchedDestinations);
      setDestinationsLoading(false);
    }, (error) => {
      console.error("Error fetching destinations: ", error);
      toast({
        title: "Error Fetching Destinations",
        description: "Could not load destinations from the database.",
        variant: "destructive",
      });
      setDestinationsLoading(false);
    });

    return () => unsubscribe();
  }, [toast]);

  useEffect(() => {
    let destinations = allDestinations;
    if (searchTerm) {
      destinations = destinations.filter(dest => 
        dest.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (language === 'ar' && dest.name_ar && dest.name_ar.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (dest.description && dest.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (language === 'ar' && dest.description_ar && dest.description_ar.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    setFilteredDestinations(destinations);
  }, [searchTerm, dateRange, allDestinations, language]);

  const handleExploreTripsClick = () => {
    destinationsSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingContact(true);

    try {
      // Here you would typically send the form data to your backend
      // For now, we'll just simulate a successful submission
      await new Promise(resolve => setTimeout(resolve, 1000));

      toast({
        title: language === 'ar' ? "تم إرسال الرسالة بنجاح" : "Message Sent Successfully",
        description: language === 'ar' ? "شكراً لتواصلك معنا. سنرد عليك قريباً." : "Thank you for contacting us. We'll get back to you soon.",
      });

      // Reset form
      setContactForm({ name: '', email: '', message: '' });
    } catch (error) {
      toast({
        title: language === 'ar' ? "خطأ في الإرسال" : "Error Sending Message",
        description: language === 'ar' ? "حدث خطأ أثناء إرسال الرسالة. يرجى المحاولة مرة أخرى." : "There was an error sending your message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingContact(false);
    }
  };

  const handleContactInputChange = (field: string, value: string) => {
    setContactForm(prev => ({ ...prev, [field]: value }));
  };

  if (authLoading || heroConfigLoading) {
    return (
      <div className="container mx-auto px-4 py-8 flex flex-col items-center justify-center min-h-[calc(100vh-15rem)] text-center">
        <Loader2 className="h-16 w-16 text-primary animate-spin mb-6" />
        <p className="text-lg text-muted-foreground">{currentTranslations.loadingAppState}</p>
      </div>
    );
  }

  if (!isSuperAdminSetup) {
    return (
      <div className="container mx-auto px-4 py-8 flex flex-col items-center justify-center min-h-[calc(100vh-15rem)] text-center p-6 bg-card rounded-lg shadow-xl border">
        <Settings className="h-16 w-16 text-primary mb-6" />
        <h1 className="text-4xl font-headline font-bold mb-4 text-primary">{currentTranslations.welcomeToSetup}</h1>
        <p className="text-lg text-foreground/80 mb-8 max-w-xl mx-auto">
          {currentTranslations.setupDescription}
        </p>
        <Button asChild size="lg" className="shadow-md hover:shadow-lg transition-shadow">
          <Link href="/setup-admin">
            <UserPlus className={direction === 'rtl' ? "ml-2 h-5 w-5" : "mr-2 h-5 w-5"} />
            {currentTranslations.goToSetupButton}
          </Link>
        </Button>
         <p className="mt-8 text-sm text-muted-foreground">
            {currentTranslations.setupCompleteMessage}
        </p>
      </div>
    );
  }

  const confidenceFeatures = [
    { icon: CalendarCheck2, title: currentTranslations.payMonthlyTitle, description: currentTranslations.payMonthlyDesc, dataAiHint: "calendar payment" },
    { icon: MessageSquare, title: currentTranslations.supportTitle, description: currentTranslations.supportDesc, dataAiHint: "customer support" },
    { icon: BadgePercent, title: currentTranslations.bestPricesTitle, description: currentTranslations.bestPricesDesc, dataAiHint: "price tag" },
    { icon: Star, title: currentTranslations.rated5StarsTitle, description: currentTranslations.rated5StarsDesc, dataAiHint: "five stars" },
    { icon: Smartphone, title: currentTranslations.fastBookingTitle, description: currentTranslations.fastBookingDesc, dataAiHint: "mobile booking" },
  ];

  const heroVideoEmbed = homepageConfig?.heroVideoUrl ? getEmbedUrl(homepageConfig.heroVideoUrl) : null;
  const showHeroMedia = heroVideoEmbed || homepageConfig?.heroImageUrl;


  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/10">
      {/* Enhanced Hero Section */}
      <section className={cn(
        "relative min-h-[95vh] flex items-center justify-center overflow-hidden",
        showHeroMedia && "min-h-screen"
      )}>
        {heroVideoEmbed ? (
          <div className="absolute inset-0 z-0">
            {heroVideoEmbed.type === 'iframe' ? (
              <iframe
                src={heroVideoEmbed.src}
                title="Homepage Hero Video"
                className="w-full h-full border-0 object-cover"
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
              ></iframe>
            ) : (
              <video
                src={heroVideoEmbed.src}
                title="Homepage Hero Video"
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-cover"
              />
            )}
          </div>
        ) : homepageConfig?.heroImageUrl ? (
          <Image
            src={homepageConfig.heroImageUrl}
            alt={homepageConfig.heroImageAiHint || "Homepage hero background"}
            fill
            style={{ objectFit: 'cover' }}
            className="z-0 scale-105 hover:scale-100 transition-transform duration-[10000ms]"
            priority
            data-ai-hint={homepageConfig.heroImageAiHint || "hero background"}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-accent/20 to-background z-0" />
        )}

        {/* Enhanced Overlay */}
        {showHeroMedia && (
          <>
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent z-10" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/40 z-10" />
          </>
        )}

        {/* Animated Background Elements */}
        <div className="absolute inset-0 z-5">
          <div className="absolute top-20 left-10 w-96 h-96 bg-primary/15 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-10 w-[32rem] h-[32rem] bg-accent/15 rounded-full blur-3xl animate-pulse delay-1000" />
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[40rem] h-[40rem] bg-gradient-to-r from-primary/5 to-accent/5 rounded-full blur-3xl animate-pulse delay-500" />
        </div>

        {/* Hero Content */}
        <div className="container mx-auto px-4 z-20 relative">
          <div className="text-center space-y-8 max-w-5xl mx-auto">
            {/* Main Heading */}
            <div className="space-y-6">
              <h1 className={cn(
                "text-5xl sm:text-6xl lg:text-7xl font-headline font-bold leading-tight",
                showHeroMedia ? 'text-white' : 'text-primary',
                "drop-shadow-2xl"
              )}>
                {currentTranslations.discoverAdventure}
              </h1>
              <p className={cn(
                "text-xl sm:text-2xl lg:text-3xl font-light leading-relaxed max-w-3xl mx-auto",
                showHeroMedia ? 'text-white/95' : 'text-foreground/80',
                "drop-shadow-lg"
              )}>
                {currentTranslations.heroSubtitle}
              </p>
              <p className={cn(
                "text-lg sm:text-xl max-w-2xl mx-auto",
                showHeroMedia ? 'text-white/85' : 'text-muted-foreground',
                "drop-shadow-md"
              )}>
                {currentTranslations.exploreDescription}
              </p>
            </div>

            {/* Trust Indicator */}
            <div className={cn(
              "flex items-center justify-center gap-2 text-sm font-medium",
              showHeroMedia ? 'text-white/80' : 'text-muted-foreground'
            )}>
              <Shield className="h-4 w-4" />
              <span>{currentTranslations.trustedBy}</span>
              <div className="flex items-center gap-1 ml-2">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
                ))}
              </div>
            </div>

            {/* Enhanced Search Section */}
            <div className="w-full max-w-5xl mx-auto mt-16">
              <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/30 p-8 md:p-10 hover:shadow-3xl transition-all duration-500">
                <div className="flex flex-col lg:flex-row gap-4 items-center">
                  {/* Search Input */}
                  <div className="relative flex-grow w-full lg:max-w-md">
                    <Search className={`absolute ${direction === 'rtl' ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground`} />
                    <Input
                      type="search"
                      placeholder={currentTranslations.searchPlaceholder}
                      className={cn(
                        `${direction === 'rtl' ? 'pr-12' : 'pl-12'} h-14 text-lg border-2 border-primary/20 focus:border-primary rounded-xl`,
                        "bg-white/90 placeholder:text-muted-foreground/70"
                      )}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>

                  {/* Date Range Picker */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="h-14 text-lg w-full lg:w-auto justify-start text-left font-normal whitespace-nowrap bg-white/90 border-2 border-primary/20 hover:border-primary rounded-xl"
                      >
                        <CalendarDays className={cn("h-5 w-5", direction === 'rtl' ? 'ml-2' : "mr-2")} />
                        {dateRange?.from ? (
                          dateRange.to ? (
                            <>
                              {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
                            </>
                          ) : (
                            format(dateRange.from, "LLL dd, y")
                          )
                        ) : (
                          <span>{currentTranslations.pickDateRange}</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align={direction === 'rtl' ? 'end' : 'start'}>
                      <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={dateRange?.from}
                        selected={dateRange}
                        onSelect={setDateRange}
                        numberOfMonths={2}
                        dir={direction}
                      />
                    </PopoverContent>
                  </Popover>

                  {/* CTA Button */}
                  <Button
                    onClick={handleExploreTripsClick}
                    size="lg"
                    className="h-14 text-lg w-full lg:w-auto bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl px-8"
                  >
                    <Sparkles className={cn("h-5 w-5", direction === 'rtl' ? 'ml-2' : 'mr-2')} />
                    {currentTranslations.startYourJourney}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Container */}
      <div className="container mx-auto px-4 py-16 space-y-20">

        {/* Why Choose Us Section */}
        <section className="py-16">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-headline font-bold text-primary mb-4">
              {currentTranslations.whyChooseUs}
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              {currentTranslations.whyChooseUsSubtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: Zap,
                title: currentTranslations.bookingMadeEasy,
                description: currentTranslations.bookingMadeEasyDesc,
                gradient: "from-blue-500 to-cyan-500"
              },
              {
                icon: Award,
                title: currentTranslations.premiumExperience,
                description: currentTranslations.premiumExperienceDesc,
                gradient: "from-purple-500 to-pink-500"
              },
              {
                icon: Heart,
                title: currentTranslations.expertSupport,
                description: currentTranslations.expertSupportDesc,
                gradient: "from-red-500 to-orange-500"
              },
              {
                icon: Target,
                title: currentTranslations.bestDeals,
                description: currentTranslations.bestDealsDesc,
                gradient: "from-green-500 to-emerald-500"
              }
            ].map((feature, index) => (
              <Card key={index} className="group relative overflow-hidden border-0 shadow-lg hover:shadow-2xl transition-all duration-500 bg-gradient-to-br from-background to-muted/20">
                <CardContent className="p-8 text-center space-y-4">
                  <div className={cn(
                    "w-16 h-16 mx-auto rounded-full bg-gradient-to-r flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300",
                    feature.gradient
                  )}>
                    <feature.icon className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground group-hover:text-primary transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Homepage Banners Section */}
        {bannersLoading ? (
          <Skeleton className="h-72 w-full rounded-lg" />
        ) : homepageBanners.length > 0 ? (
          <section className="w-full rounded-lg overflow-hidden shadow-xl border">
            <Carousel
              opts={{ loop: homepageBanners.length > 1 }}
              className="w-full" 
              dir={direction}
            >
              <CarouselContent className="h-auto"> 
                {homepageBanners.map((banner) => {
                  const embedInfo = banner.type === 'video' ? getEmbedUrl(banner.url) : null;
                  const aboutUsTextToShow = language === 'ar' && banner.aboutUsText_ar ? banner.aboutUsText_ar : banner.aboutUsText;
                  const showAboutUs = banner.type === 'video' && aboutUsTextToShow && aboutUsTextToShow.trim() !== '';
                  
                  const VideoComponent = (
                    <div className={cn("relative aspect-video", showAboutUs ? "w-full md:w-1/2" : "w-full")}> {/* Ensure video itself has aspect ratio */}
                      {embedInfo && embedInfo.type === 'iframe' ? (
                        <iframe
                          src={embedInfo.src}
                          title={banner.altText || 'Homepage Video Banner'}
                          className="w-full h-full border-0" // iframe uses h-full of its parent
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          allowFullScreen
                        ></iframe>
                      ) : embedInfo && embedInfo.type === 'video' ? (
                        <video
                          src={embedInfo.src}
                          title={banner.altText || 'Homepage Video Banner'}
                          controls
                          autoPlay
                          muted
                          loop
                          playsInline
                          className="w-full h-full object-cover" // video uses h-full of its parent
                        />
                      ) : (
                        <div className="w-full h-full bg-muted flex flex-col items-center justify-center text-muted-foreground">
                          <Video className="h-16 w-16 mb-2" />
                          <p>Video format not supported or URL invalid.</p>
                          <p className="text-xs mt-1">URL: {banner.url}</p>
                        </div>
                      )}
                    </div>
                  );

                  const AboutUsComponent = showAboutUs ? (
                    <div className={cn(
                        "w-full md:w-1/2 bg-background/90 backdrop-blur-sm text-foreground p-4 md:p-6 overflow-y-auto",
                        "border-t md:border-t-0", 
                        direction === 'rtl' ? (banner.type === 'video' ? 'md:border-r' : '') : (banner.type === 'video' ? 'md:border-l' : '')
                      )}
                      style={{maxHeight: 'calc( (9 / 16) * 50vw )'}} 
                    >
                      <h3 className="text-xl font-headline font-semibold mb-2 text-primary">{currentTranslations.aboutUsHeading}</h3>
                      <p className="text-sm whitespace-pre-line leading-relaxed">{aboutUsTextToShow}</p>
                    </div>
                  ) : null;

                  return (
                    <CarouselItem key={banner.id} className={cn("relative w-full", showAboutUs ? 'h-auto' : 'h-full aspect-[16/7]')}>
                      <div className={cn(
                          "w-full flex flex-col md:items-start", 
                          showAboutUs ? (direction === 'rtl' ? 'md:flex-row-reverse' : 'md:flex-row') : 'h-full',
                          showAboutUs && "md:items-stretch" 
                        )}
                      >
                        {banner.type === 'image' && banner.url ? (
                          <div className="relative w-full h-full">
                            <Image
                              src={banner.url}
                              alt={banner.altText || 'Homepage Banner'}
                              fill
                              style={{ objectFit: 'cover' }}
                              priority={homepageBanners.indexOf(banner) < 2}
                              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 100vw, 100vw"
                            />
                            {banner.altText && (
                              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent">
                                  <h2 className="text-white text-lg md:text-2xl font-semibold shadow-md">{banner.altText}</h2>
                              </div>
                            )}
                          </div>
                        ) : banner.type === 'video' ? (
                          <>
                            {direction === 'rtl' ? ( 
                              <>
                                {VideoComponent}
                                {AboutUsComponent}
                              </>
                            ) : ( 
                              <>
                                {AboutUsComponent}
                                {VideoComponent}
                              </>
                            )}
                          </>
                        ) : (
                          <div className="w-full h-full bg-muted flex items-center justify-center aspect-[16/7]">
                            <Camera className="h-16 w-16 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                    </CarouselItem>
                  );
                })}
              </CarouselContent>
              {homepageBanners.length > 1 && (
                <>
                  <CarouselPrevious className={cn("absolute top-1/2 -translate-y-1/2 z-10 bg-background/50 hover:bg-background/80 text-foreground", direction === 'rtl' ? 'right-4' : 'left-4')} />
                  <CarouselNext className={cn("absolute top-1/2 -translate-y-1/2 z-10 bg-background/50 hover:bg-background/80 text-foreground", direction === 'rtl' ? 'left-4' : 'right-4')} />
                </>
              )}
            </Carousel>
          </section>
        ) : (
          !bannersLoading && <div className="text-center py-6 text-muted-foreground">{currentTranslations.noBannersText}</div>
        )}


        {/* Enhanced Popular Destinations Section */}
        <section
          ref={destinationsSectionRef}
          className={cn(
            "py-16 transition-all duration-1000 ease-out",
            destinationsInView ? "opacity-0 translate-y-0" : "opacity-100 translate-y-10"
          )}
        >
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-headline font-bold text-primary mb-4 flex items-center justify-center">
              <Globe className={cn("h-10 w-10", direction === 'rtl' ? 'ml-4' : "mr-4")} />
              {currentTranslations.popularDestinations}
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Discover breathtaking destinations and create memories that last a lifetime
            </p>
          </div>
          {destinationsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="overflow-hidden shadow-lg rounded-lg">
                  <CardHeader className="p-0">
                    <Skeleton className="h-60 w-full" />
                    <div className="p-6">
                      <Skeleton className="h-7 w-3/4 mb-2" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-4 w-full mb-1" />
                    <Skeleton className="h-4 w-full mb-1" />
                    <Skeleton className="h-4 w-5/6 mb-4" />
                    <Skeleton className="h-10 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredDestinations.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredDestinations.map((destination, index) => (
                <Card key={destination.id} className="group overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-500 rounded-2xl border-0 bg-gradient-to-br from-background to-muted/20 flex flex-col">
                  <CardHeader className="p-0 relative">
                    <div className="relative h-64 w-full overflow-hidden rounded-t-2xl">
                      {destination.imageUrl ? (
                        <Image
                          src={destination.imageUrl}
                          alt={language === 'ar' && destination.name_ar ? destination.name_ar : destination.name}
                          fill
                          style={{ objectFit: 'cover' }}
                          data-ai-hint={destination.dataAiHint || "travel landscape"}
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          priority={filteredDestinations.indexOf(destination) < 3}
                          className="group-hover:scale-110 transition-transform duration-700"
                        />
                      ) : (
                        <div className="h-64 w-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                          <MapPin className="h-16 w-16 text-primary/60" />
                        </div>
                      )}

                      {/* Gradient Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                      {/* Popular Badge */}
                      {index < 3 && (
                        <div className="absolute top-4 left-4 z-10">
                          <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-3 py-1 rounded-full text-sm font-semibold shadow-lg">
                            <Star className="h-3 w-3 inline mr-1" />
                            Popular
                          </div>
                        </div>
                      )}

                      {/* Destination Name Overlay */}
                      <div className="absolute bottom-4 left-4 right-4 z-10">
                        <h3 className="text-2xl font-headline font-bold text-white drop-shadow-lg">
                          {language === 'ar' && destination.name_ar ? destination.name_ar : destination.name}
                        </h3>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="flex-grow p-6 space-y-4">
                    <CardDescription
                      className="text-base leading-relaxed text-muted-foreground overflow-hidden"
                      style={{
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical'
                      }}
                    >
                      {language === 'ar' && destination.description_ar ? destination.description_ar : destination.description}
                    </CardDescription>
                  </CardContent>

                  <CardContent className="pt-0 pb-6 px-6">
                    <Button
                      asChild
                      className="w-full h-12 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl group"
                    >
                      <Link href={`/destinations/${destination.id}`} className="flex items-center justify-center gap-2">
                        {currentTranslations.exploreNow}
                        <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-10">
              <MapPin className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg text-muted-foreground">
                {searchTerm ? currentTranslations.noDestinationsMatch : (isSuperAdminSetup ? currentTranslations.noDestinationsAdmin : currentTranslations.noDestinationsPublic)}
              </p>
            </div>
          )}
        </section>

        {/* Enhanced Client Reviews Section */}
        <section
          ref={reviewsSectionRef}
          className={cn(
            "py-20 bg-gradient-to-br from-muted/30 to-background rounded-3xl transition-all duration-1000 ease-out",
            reviewsInView ? "opacity-0 translate-y-0" : "opacity-100 translate-y-10"
          )}
        >
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-headline font-bold text-primary mb-4 flex items-center justify-center">
              <Users className={cn("h-10 w-10", direction === 'rtl' ? 'ml-4' : 'mr-4')} />
              {currentTranslations.clientReviewsTitle}
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              {currentTranslations.clientReviewsDescription}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {clientReviews.map((review, index) => (
              <Card key={review.id} className="group relative overflow-hidden shadow-2xl border-0 bg-gradient-to-br from-background to-muted/20 flex flex-col rounded-2xl hover:shadow-3xl transition-all duration-500">
                {/* Decorative Background */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/10 to-accent/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />

                <CardHeader className="relative flex flex-col items-center text-center p-8 space-y-4">
                  <Avatar className="w-24 h-24 border-4 border-white shadow-xl ring-4 ring-primary/20">
                    <AvatarFallback className="text-2xl bg-gradient-to-br from-primary to-primary/80 text-white font-bold" data-ai-hint="person avatar">
                      {review.avatarFallback}
                    </AvatarFallback>
                  </Avatar>

                  <div className="space-y-2">
                    <CardTitle className="text-xl font-headline text-foreground">
                      {language === 'ar' ? review.name_ar : review.name_en}
                    </CardTitle>

                    <div className="flex justify-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={cn(
                            "h-5 w-5 transition-colors",
                            i < review.rating ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30"
                          )}
                        />
                      ))}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="flex-grow p-8 pt-0">
                  <div className="relative">
                    {/* Quote Icon */}
                    <div className="absolute -top-2 -left-2 text-6xl text-primary/20 font-serif">"</div>
                    <blockquote className="text-center text-foreground/80 italic leading-relaxed text-lg relative z-10 pt-4">
                      {language === 'ar' ? review.review_ar : review.review_en}
                    </blockquote>
                  </div>
                </CardContent>

                {/* Verified Badge */}
                <div className="absolute top-4 right-4">
                  <div className="bg-green-500 text-white p-1 rounded-full shadow-lg">
                    <CheckCircle className="h-4 w-4" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* Enhanced Book With Confidence Section */}
        <section
          ref={confidenceSectionRef}
          className={cn(
            "py-20 bg-gradient-to-br from-primary via-primary/90 to-primary/80 text-primary-foreground rounded-3xl shadow-2xl border-0 relative overflow-hidden transition-all duration-1000 ease-out",
            confidenceInView ? "opacity-0 translate-y-0" : "opacity-100 translate-y-10"
          )}
        >
          {/* Decorative Background Elements */}
          <div className="absolute top-0 left-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />

          <div className="relative z-10 text-center">
            <h2 className="text-4xl lg:text-5xl font-headline font-bold mb-4 text-white">
              {currentTranslations.bookWithConfidenceTitle}
            </h2>
            <p className="text-xl text-white/90 mb-16 max-w-2xl mx-auto">
              Experience peace of mind with our comprehensive travel services
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8">
              {confidenceFeatures.map((feature, index) => {
                const IconComponent = feature.icon;
                return (
                  <div key={index} className="group flex flex-col items-center space-y-4 p-6 rounded-2xl bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-all duration-300">
                    <div className="bg-white/20 p-6 rounded-2xl shadow-lg group-hover:scale-110 group-hover:bg-white/30 transition-all duration-300">
                      <IconComponent className="h-12 w-12 text-amber-300" data-ai-hint={feature.dataAiHint} />
                    </div>
                    <h3 className="text-xl font-semibold text-amber-300 group-hover:text-amber-200 transition-colors">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-white/90 leading-relaxed text-center">
                      {feature.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Contact Us Section */}
        <section className="py-20 bg-gradient-to-br from-background via-muted/30 to-background">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-4xl lg:text-5xl font-headline font-bold mb-6 text-gradient bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                {currentTranslations.contactUsTitle}
              </h2>
              <p className="text-xl text-muted-foreground mb-4 max-w-2xl mx-auto">
                {currentTranslations.contactUsSubtitle}
              </p>
              <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                {currentTranslations.contactUsDescription}
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
              {/* Contact Information */}
              <div className="space-y-8">
                <h3 className="text-2xl font-semibold text-foreground mb-8">
                  {language === 'ar' ? 'معلومات التواصل' : 'Contact Information'}
                </h3>

                {/* Email */}
                <div className="flex items-start gap-4 p-6 bg-card rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-border/50">
                  <div className="bg-primary/10 p-3 rounded-xl">
                    <Mail className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-foreground mb-2">{currentTranslations.emailLabel}</h4>
                    <a
                      href={`mailto:${currentTranslations.emailAddress}`}
                      className="text-primary hover:text-primary/80 transition-colors font-medium"
                    >
                      {currentTranslations.emailAddress}
                    </a>
                  </div>
                </div>

                {/* Phone */}
                <div className="flex items-start gap-4 p-6 bg-card rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-border/50">
                  <div className="bg-accent/10 p-3 rounded-xl">
                    <Phone className="h-6 w-6 text-accent" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-foreground mb-2">{currentTranslations.phoneLabel}</h4>
                    <a
                      href={`tel:${currentTranslations.phoneNumber}`}
                      className="text-accent hover:text-accent/80 transition-colors font-medium"
                    >
                      {currentTranslations.phoneNumber}
                    </a>
                  </div>
                </div>

                {/* Address */}
                <div className="flex items-start gap-4 p-6 bg-card rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-border/50">
                  <div className="bg-primary/10 p-3 rounded-xl">
                    <MapPinIcon className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-foreground mb-2">{currentTranslations.addressLabel}</h4>
                    <p className="text-muted-foreground">
                      {currentTranslations.address}
                    </p>
                  </div>
                </div>
              </div>

              {/* Contact Form */}
              <div className="bg-card rounded-2xl shadow-xl border border-border/50 p-8">
                <h3 className="text-2xl font-semibold text-foreground mb-8">
                  {language === 'ar' ? 'أرسل لنا رسالة' : 'Send us a Message'}
                </h3>

                <form onSubmit={handleContactSubmit} className="space-y-6">
                  {/* Name Field */}
                  <div className="space-y-2">
                    <Label htmlFor="contact-name" className="text-sm font-medium text-foreground">
                      {currentTranslations.nameLabel}
                    </Label>
                    <Input
                      id="contact-name"
                      type="text"
                      placeholder={currentTranslations.namePlaceholder}
                      value={contactForm.name}
                      onChange={(e) => handleContactInputChange('name', e.target.value)}
                      required
                      className="h-12 border-2 border-border/50 focus:border-primary rounded-xl"
                    />
                  </div>

                  {/* Email Field */}
                  <div className="space-y-2">
                    <Label htmlFor="contact-email" className="text-sm font-medium text-foreground">
                      {currentTranslations.emailInputLabel}
                    </Label>
                    <Input
                      id="contact-email"
                      type="email"
                      placeholder={currentTranslations.emailPlaceholder}
                      value={contactForm.email}
                      onChange={(e) => handleContactInputChange('email', e.target.value)}
                      required
                      className="h-12 border-2 border-border/50 focus:border-primary rounded-xl"
                    />
                  </div>

                  {/* Message Field */}
                  <div className="space-y-2">
                    <Label htmlFor="contact-message" className="text-sm font-medium text-foreground">
                      {currentTranslations.messageLabel}
                    </Label>
                    <Textarea
                      id="contact-message"
                      placeholder={currentTranslations.messagePlaceholder}
                      value={contactForm.message}
                      onChange={(e) => handleContactInputChange('message', e.target.value)}
                      required
                      rows={5}
                      className="border-2 border-border/50 focus:border-primary rounded-xl resize-none"
                    />
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    disabled={isSubmittingContact}
                    className="w-full h-12 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    {isSubmittingContact ? (
                      <>
                        <Loader2 className={cn("h-4 w-4 animate-spin", direction === 'rtl' ? 'ml-2' : 'mr-2')} />
                        {language === 'ar' ? 'جارٍ الإرسال...' : 'Sending...'}
                      </>
                    ) : (
                      <>
                        <Send className={cn("h-4 w-4", direction === 'rtl' ? 'ml-2' : 'mr-2')} />
                        {currentTranslations.sendMessageButton}
                      </>
                    )}
                  </Button>
                </form>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default HomePage;
