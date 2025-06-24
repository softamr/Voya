
"use client";

import type { NextPage } from 'next';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { AlertTriangle, ArrowLeft, MapPin, Hotel as HotelIconLucide, Building, Info, CheckCircle, ImageIcon, ChevronLeft, ChevronRight, Maximize2, Play, Pause, X, CalendarDays, Users, DollarSign, Plane, Car, Clock } from 'lucide-react';
import type { Hotel, Destination, HotelImage, TripDate, RoomType, TripDateRoomAvailability } from '@/lib/types';
import { db } from '@/lib/firebase';
import { doc, getDoc, Timestamp, collection, query, where, onSnapshot, orderBy, getDocs } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext'; // Import useAuth
import { cn } from '@/lib/utils';
import { format, differenceInDays } from 'date-fns';
import { TRIP_FEATURES_TRANSLATIONS, type TripFeature } from '@/lib/constants';
import ReservationForm from '@/components/forms/ReservationForm';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
  type CarouselApi,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";

interface EnrichedHotel extends Hotel {
  destinationName?: string;
}

const HotelDetailPage: NextPage = () => {
  const router = useRouter();
  const { hotelId } = useParams<{ hotelId: string }>();
  const { toast } = useToast();
  const { language, direction } = useLanguage();
  const { user: userFromAuthContext } = useAuth(); // Get user from AuthContext

  const [hotel, setHotel] = useState<EnrichedHotel | null>(null);
  const [loading, setLoading] = useState(true);
  const [trips, setTrips] = useState<TripDate[]>([]);
  const [tripsLoading, setTripsLoading] = useState(true);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<TripDate | null>(null);
  const [reservationDialogOpen, setReservationDialogOpen] = useState(false);

  // Slideshow state
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const [fullscreenIndex, setFullscreenIndex] = useState(0);

  const translations = {
    en: {
      backButton: "Back",
      hotelNotFoundTitle: "Hotel Not Found",
      hotelNotFoundDescription: "The hotel you are looking for does not exist or could not be loaded.",
      hotelNotFoundDescriptionVisitor: "Details for this hotel could not be loaded. Access may require login or the content might be unavailable.",
      aboutHotelTitle: (hotelName: string) => `About ${hotelName}`,
      hotelAmenitiesTitle: "Hotel Amenities",
      amenitiesComingSoon: "Hotel amenities information coming soon. (e.g., Wi-Fi, Pool, Restaurant, Gym)",
      availableTripsTitle: "Available Trips & Rooms",
      tripsInfoPlaceholder: (destinationName: string) => `Information about specific trip dates and room availability for this hotel would be shown here, if this hotel is part of an active trip.`,
      viewAllTripsLink: (destinationName: string) => `View all trips in ${destinationName || 'this destination'}`,
      errorLoadingHotel: "Could not load hotel data.",
      errorHotelIdMissing: "Hotel ID is missing.",
      imageCounter: (current: number, total: number) => `${current} of ${total}`,
      viewFullscreen: "View fullscreen",
      pauseSlideshow: "Pause slideshow",
      playSlideshow: "Play slideshow",
      previousImage: "Previous image",
      nextImage: "Next image",
      closeFullscreen: "Close fullscreen",
      noTripsAvailable: "No trips available",
      noTripsMessage: "There are currently no active trips for this hotel.",
      tripDuration: (nights: number, days: number) => `${nights} nights, ${days} days`,
      startDate: "Start Date",
      endDate: "End Date",
      bookNow: "Book Now",
      perPerson: "/person",
      transportation: "Transportation",
      childPrice: "Child Price",
      features: "Features",
      extraFees: "Extra Fees",
      roomOptions: "Room Options",
      loading: "Loading...",
      priceCalculationNote: "Prices shown are per person per trip. Total cost depends on room selection and extra option trips.",
      startingFrom: "Starting from",
      totalPerPerson: "total/person",
    },
    ar: {
      backButton: "العودة",
      hotelNotFoundTitle: "لم يتم العثور على الفندق",
      hotelNotFoundDescription: "الفندق الذي تبحث عنه غير موجود أو لا يمكن تحميله.",
      hotelNotFoundDescriptionVisitor: "تعذر تحميل تفاصيل هذا الفندق. قد يتطلب الوصول تسجيل الدخول أو قد يكون المحتوى غير متوفر.",
      aboutHotelTitle: (hotelName: string) => `عن فندق ${hotelName}`,
      hotelAmenitiesTitle: "وسائل راحة الفندق",
      amenitiesComingSoon: "معلومات وسائل راحة الفندق ستتوفر قريبًا. (مثل: واي فاي، مسبح، مطعم، صالة ألعاب رياضية)",
      availableTripsTitle: "الرحلات والغرف المتاحة",
      tripsInfoPlaceholder: (destinationName: string) => `سيتم عرض معلومات حول تواريخ الرحلات المحددة وتوافر الغرف لهذا الفندق هنا، إذا كان هذا الفندق جزءًا من رحلة نشطة.`,
      viewAllTripsLink: (destinationName: string) => `عرض جميع الرحلات في ${destinationName || 'هذه الوجهة'}`,
      errorLoadingHotel: "تعذر تحميل بيانات الفندق.",
      errorHotelIdMissing: "معرف الفندق مفقود.",
      imageCounter: (current: number, total: number) => `${current} من ${total}`,
      viewFullscreen: "عرض بملء الشاشة",
      pauseSlideshow: "إيقاف العرض التلقائي",
      playSlideshow: "تشغيل العرض التلقائي",
      previousImage: "الصورة السابقة",
      nextImage: "الصورة التالية",
      closeFullscreen: "إغلاق ملء الشاشة",
      noTripsAvailable: "لا توجد رحلات متاحة",
      noTripsMessage: "لا توجد حاليًا رحلات نشطة لهذا الفندق.",
      tripDuration: (nights: number, days: number) => `${nights} ليلة، ${days} أيام`,
      startDate: "تاريخ البداية",
      endDate: "تاريخ النهاية",
      bookNow: "احجز الآن",
      perPerson: "/شخص",
      transportation: "النقل",
      childPrice: "سعر الطفل",
      features: "المميزات",
      extraFees: "رسوم إضافية",
      roomOptions: "خيارات الغرف",
      loading: "جارٍ التحميل...",
      priceCalculationNote: "الأسعار المعروضة هي لكل شخص لكل رحلة. التكلفة الإجمالية تعتمد على اختيار الغرفة والخيارات الإضافية للرحلة.",
      startingFrom: "ابتداءً من",
      totalPerPerson: "إجمالي/شخص",
    },
  };
  const currentTranslations = translations[language];

  // Carousel API effects
  useEffect(() => {
    if (!api) {
      return;
    }

    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap() + 1);

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap() + 1);
    });
  }, [api]);

  // Slideshow helper functions
  const toggleAutoPlay = useCallback(() => {
    setIsAutoPlaying(!isAutoPlaying);
  }, [isAutoPlaying]);

  const goToSlide = useCallback((index: number) => {
    try {
      if (api && typeof index === 'number' && index >= 0) {
        api.scrollTo(index);
      }
    } catch (error) {
      console.error('Error navigating to slide:', error);
    }
  }, [api]);

  const openFullscreen = useCallback((index: number) => {
    try {
      if (typeof index === 'number' && index >= 0) {
        setFullscreenIndex(index);
        setFullscreenOpen(true);
      }
    } catch (error) {
      console.error('Error opening fullscreen:', error);
    }
  }, []);

  const nextFullscreenImage = useCallback(() => {
    if (hotel?.imageUrls && fullscreenIndex < hotel.imageUrls.length - 1) {
      setFullscreenIndex(fullscreenIndex + 1);
    } else if (hotel?.imageUrls) {
      setFullscreenIndex(0); // Loop to first image
    }
  }, [fullscreenIndex, hotel?.imageUrls]);

  const prevFullscreenImage = useCallback(() => {
    if (fullscreenIndex > 0) {
      setFullscreenIndex(fullscreenIndex - 1);
    } else if (hotel?.imageUrls) {
      setFullscreenIndex(hotel.imageUrls.length - 1); // Loop to last image
    }
  }, [fullscreenIndex, hotel?.imageUrls]);

  // Keyboard navigation for fullscreen
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!fullscreenOpen) return;

      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          prevFullscreenImage();
          break;
        case 'ArrowRight':
          event.preventDefault();
          nextFullscreenImage();
          break;
        case 'Escape':
          event.preventDefault();
          setFullscreenOpen(false);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [fullscreenOpen, nextFullscreenImage, prevFullscreenImage]);

  useEffect(() => {
    if (!hotelId) {
      setLoading(false);
      toast({ title: "Error", description: currentTranslations.errorHotelIdMissing, variant: "destructive" });
      router.push('/'); 
      return;
    }

    setLoading(true);
    const fetchHotelData = async () => {
      try {
        const hotelDocRef = doc(db, "hotels", hotelId);
        const hotelSnap = await getDoc(hotelDocRef);

        if (!hotelSnap.exists()) {
          toast({ title: currentTranslations.hotelNotFoundTitle, description: currentTranslations.hotelNotFoundDescription, variant: "destructive" });
          setHotel(null);
        } else {
          const hotelData = hotelSnap.data() as Hotel; 
          let enrichedHotel: EnrichedHotel = {
            ...hotelData,
            id: hotelSnap.id,
            imageUrls: hotelData.imageUrls || [],
            createdAt: hotelData.createdAt instanceof Timestamp ? hotelData.createdAt.toDate() : undefined,
            updatedAt: hotelData.updatedAt instanceof Timestamp ? hotelData.updatedAt.toDate() : undefined,
          } as EnrichedHotel;

          if (hotelData.destinationId) {
            const destDocRef = doc(db, "destinations", hotelData.destinationId);
            const destSnap = await getDoc(destDocRef);
            if (destSnap.exists()) {
              enrichedHotel.destinationName = destSnap.data()?.name;
            }
          }
          setHotel(enrichedHotel);
        }
      } catch (error) {
        console.error("Error fetching hotel data:", error);
        toast({ title: "Error", description: currentTranslations.errorLoadingHotel, variant: "destructive" });
        setHotel(null);
      } finally {
        setLoading(false);
      }
    };

    fetchHotelData();
  }, [hotelId, toast, router, language, currentTranslations.errorHotelIdMissing, currentTranslations.errorLoadingHotel, currentTranslations.hotelNotFoundDescription, currentTranslations.hotelNotFoundTitle]);

  // Fetch trips and room types for this hotel
  useEffect(() => {
    if (!hotelId) return;

    setTripsLoading(true);

    // Fetch room types
    const roomTypesQuery = query(collection(db, "roomTypes"), orderBy("name", "asc"));
    const unsubRoomTypes = onSnapshot(roomTypesQuery, (snapshot) => {
      const roomTypesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RoomType));
      setRoomTypes(roomTypesData);
    }, (error) => {
      console.error("Error fetching room types:", error);
    });

    // Fetch trips for this hotel
    const tripsQuery = query(
      collection(db, "tripDates"),
      where("hotelId", "==", hotelId),
      where("status", "==", "active"),
      orderBy("startDate", "asc")
    );

    const unsubTrips = onSnapshot(tripsQuery, (snapshot) => {
      const tripsData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          startDate: (data.startDate as Timestamp).toDate(),
          endDate: (data.endDate as Timestamp).toDate(),
          availableRoomsByType: data.availableRoomsByType || [],
          selectedFeatures: data.selectedFeatures || [],
          extraFees: data.extraFees || [],
        } as TripDate;
      });
      setTrips(tripsData);
      setTripsLoading(false);
    }, (error) => {
      console.error("Error fetching trips:", error);
      setTripsLoading(false);
    });

    return () => {
      unsubRoomTypes();
      unsubTrips();
    };
  }, [hotelId]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-8" dir={direction}>
        <Skeleton className="h-12 w-1/3" />
        <Skeleton className="h-72 w-full rounded-lg" />
        <Skeleton className="h-8 w-1/2 mt-2" />
        <Skeleton className="h-6 w-1/4 mt-1" />
        <div className="space-y-2 mt-4">
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-4/5" />
        </div>
      </div>
    );
  }

  if (!hotel) {
    const descriptionText = !userFromAuthContext ? currentTranslations.hotelNotFoundDescriptionVisitor : currentTranslations.hotelNotFoundDescription;
    return (
      <div className="container mx-auto px-4 py-8 text-center" dir={direction}>
        <AlertTriangle className="mx-auto h-16 w-16 text-destructive mb-4" />
        <h1 className="text-2xl font-semibold">{currentTranslations.hotelNotFoundTitle}</h1>
        <p className="text-muted-foreground mb-4">{descriptionText}</p>
        <Button asChild onClick={() => {
          try {
            router.back();
          } catch (error) {
            console.error('Error navigating back:', error);
            router.push('/');
          }
        }}>
            <span className="cursor-pointer">
                {direction === 'ltr' && <ArrowLeft className="mr-2 h-4 w-4" />}
                {currentTranslations.backButton}
                {direction === 'rtl' && <ArrowLeft className="ml-2 h-4 w-4 transform scale-x-[-1]" />}
            </span>
        </Button>
      </div>
    );
  }
  
  const hasImages = hotel.imageUrls && hotel.imageUrls.length > 0;

  return (
    <div className="bg-gradient-to-br from-background via-background to-muted/20" dir={direction}>
      <section className="relative h-[70vh] min-h-[500px] max-h-[800px] w-full overflow-hidden">
        {hasImages ? (
          <div className="relative w-full h-full">
            <Carousel
              setApi={setApi}
              opts={{
                loop: hotel.imageUrls && hotel.imageUrls.length > 1,
              }}
              plugins={isAutoPlaying ? [
                Autoplay({
                  delay: 4000,
                  stopOnInteraction: true,
                  stopOnMouseEnter: true,
                })
              ] : []}
              className="w-full h-full"
            >
              <CarouselContent>
                {hotel.imageUrls!.map((img, idx) => (
                  <CarouselItem key={idx} className="relative w-full h-full">
                    <div
                      className="relative w-full h-full cursor-pointer group"
                      onClick={() => openFullscreen(idx)}
                    >
                      <Image
                        src={img.url}
                        alt={`${hotel.name} image ${idx + 1}`}
                        fill
                        style={{ objectFit: 'cover' }}
                        className="brightness-75 group-hover:brightness-90 transition-all duration-300"
                        data-ai-hint={img.dataAiHint || "hotel building"}
                        priority={idx === 0}
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 100vw, 100vw"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-300 flex items-center justify-center">
                        <Maximize2 className="h-12 w-12 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      </div>
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>

              {/* Enhanced Navigation Controls */}
              {hotel.imageUrls!.length > 1 && (
                <>
                  <CarouselPrevious
                    className="absolute left-4 top-1/2 -translate-y-1/2 z-20 bg-black/50 hover:bg-black/70 text-white border-white/20 h-12 w-12"
                    aria-label={currentTranslations.previousImage}
                  />
                  <CarouselNext
                    className="absolute right-4 top-1/2 -translate-y-1/2 z-20 bg-black/50 hover:bg-black/70 text-white border-white/20 h-12 w-12"
                    aria-label={currentTranslations.nextImage}
                  />
                </>
              )}
            </Carousel>

            {/* Image Counter and Controls */}
            {hotel.imageUrls!.length > 1 && (
              <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
                <div className="bg-black/50 text-white px-3 py-1 rounded-full text-sm font-medium">
                  {currentTranslations.imageCounter(current, count)}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleAutoPlay}
                  className="bg-black/50 hover:bg-black/70 text-white border-white/20 h-8 w-8 p-0"
                  aria-label={isAutoPlaying ? currentTranslations.pauseSlideshow : currentTranslations.playSlideshow}
                >
                  {isAutoPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
              </div>
            )}

            {/* Thumbnail Dots */}
            {hotel.imageUrls!.length > 1 && hotel.imageUrls!.length <= 8 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
                {hotel.imageUrls!.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => goToSlide(idx)}
                    className={cn(
                      "w-3 h-3 rounded-full transition-all duration-300",
                      current === idx + 1
                        ? "bg-white scale-125"
                        : "bg-white/50 hover:bg-white/75"
                    )}
                    aria-label={`Go to image ${idx + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-accent/10 to-muted/20 flex flex-col items-center justify-center text-center p-8">
            {/* Decorative Background */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-10 left-10 w-32 h-32 bg-primary rounded-full blur-3xl"></div>
              <div className="absolute bottom-10 right-10 w-40 h-40 bg-accent rounded-full blur-3xl"></div>
            </div>

            <div className="relative z-10 max-w-md">
              <div className="w-32 h-32 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center mx-auto mb-8 shadow-xl">
                <HotelIconLucide className="h-16 w-16 text-white" />
              </div>
              <h3 className="text-3xl font-headline font-bold text-primary mb-4">No Images Available</h3>
              <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                This hotel doesn't have any images uploaded yet. Images will be displayed here once they are added.
              </p>
              <div className="flex items-center justify-center space-x-2">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-accent rounded-full animate-pulse delay-100"></div>
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse delay-200"></div>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/40" />

        {/* Animated Background Elements */}
        <div className="absolute inset-0 z-5">
          <div className="absolute top-20 left-10 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-10 w-[32rem] h-[32rem] bg-accent/10 rounded-full blur-3xl animate-pulse delay-1000" />
        </div>

        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 z-20">
          <div className="space-y-6 max-w-4xl">
            <h1 className="text-6xl md:text-8xl font-headline font-bold text-white mb-4 drop-shadow-2xl animate-fade-in">
              {hotel.name}
            </h1>
            {hotel.destinationName && (
               <Link href={`/destinations/${hotel.destinationId}`} className="inline-flex items-center text-2xl md:text-3xl text-white/95 hover:text-primary transition-all duration-300 drop-shadow-lg bg-white/10 backdrop-blur-sm rounded-full px-6 py-3 border border-white/20 hover:bg-white/20">
                  <MapPin className={cn("h-6 w-6", direction === 'rtl' ? 'ml-3' : 'mr-3')} />
                  {hotel.destinationName}
               </Link>
            )}
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-20">
        <Button
          variant="outline"
          onClick={() => {
            try {
              router.back();
            } catch (error) {
              console.error('Error navigating back:', error);
              router.push('/');
            }
          }}
          className="mb-12 hover:bg-primary hover:text-primary-foreground transition-all duration-300 shadow-lg hover:shadow-xl border-2"
        >
          {direction === 'ltr' && <ArrowLeft className="mr-2 h-4 w-4" />}
          {currentTranslations.backButton}
          {direction === 'rtl' && <ArrowLeft className="ml-2 h-4 w-4 transform scale-x-[-1]" />}
        </Button>

        <Card className="overflow-hidden shadow-2xl border-0 bg-gradient-to-br from-card via-card/95 to-card/90 rounded-3xl">
            <CardContent className="p-8 md:p-12 space-y-10">
                <div className="flex flex-col md:flex-row gap-8 md:gap-12">
                    <div className="flex-grow space-y-10">
                        <section className="bg-gradient-to-br from-muted/20 to-muted/10 rounded-2xl p-8">
                            <div className="mb-6">
                                <h2 className="text-4xl font-bold font-headline text-gradient bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent flex items-center mb-4">
                                    <div className="p-3 rounded-xl bg-primary/10 mr-4">
                                      <Building className="h-8 w-8 text-primary" />
                                    </div>
                                    {currentTranslations.aboutHotelTitle(hotel.name)}
                                </h2>
                                <p className="text-muted-foreground text-lg flex items-center bg-muted/30 rounded-lg px-4 py-3">
                                    <MapPin className={cn("h-6 w-6 text-primary", direction === 'rtl' ? 'ml-3' : 'mr-3')} />
                                    {hotel.address}
                                </p>
                            </div>

                            <div className="prose prose-lg max-w-none text-foreground/90 leading-relaxed">
                                <p className="text-lg">{hotel.description}</p>
                            </div>
                        </section>

                        <section className="bg-gradient-to-br from-accent/10 to-accent/5 rounded-2xl p-8">
                            <h3 className="text-3xl font-semibold font-headline text-gradient bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent mb-6 flex items-center">
                                <div className="p-3 rounded-xl bg-accent/10 mr-4">
                                  <Info className="h-7 w-7 text-accent" />
                                </div>
                                {currentTranslations.hotelAmenitiesTitle}
                            </h3>
                            <p className="text-foreground/80 text-lg bg-white/50 rounded-lg p-4">
                                {currentTranslations.amenitiesComingSoon}
                            </p>
                        </section>
                    </div>
                </div>

                {/* Available Trips Section */}
                <div className="pt-8 border-t">
                    <h3 className="text-3xl font-semibold font-headline text-gradient bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-8 flex items-center">
                        <div className="p-3 rounded-xl bg-primary/10 mr-4">
                          <CalendarDays className="h-7 w-7 text-primary" />
                        </div>
                        {currentTranslations.availableTripsTitle}
                    </h3>

                    {tripsLoading ? (
                      <div className="space-y-4">
                        <Skeleton className="h-32 w-full rounded-lg" />
                        <Skeleton className="h-32 w-full rounded-lg" />
                        <Skeleton className="h-32 w-full rounded-lg" />
                      </div>
                    ) : trips.length === 0 ? (
                      <div className="text-center py-12 bg-gradient-to-br from-muted/20 to-muted/10 rounded-2xl">
                        <div className="w-24 h-24 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full flex items-center justify-center mx-auto mb-6">
                          <CalendarDays className="h-12 w-12 text-primary/60" />
                        </div>
                        <h4 className="text-xl font-semibold text-foreground mb-2">{currentTranslations.noTripsAvailable}</h4>
                        <p className="text-muted-foreground mb-6">{currentTranslations.noTripsMessage}</p>
                        {hotel.destinationId && (
                          <Link href={`/destinations/${hotel.destinationId}`}>
                            <Button variant="outline" className="hover:bg-primary hover:text-primary-foreground transition-all duration-300">
                              {currentTranslations.viewAllTripsLink(hotel.destinationName || '')}
                            </Button>
                          </Link>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {trips.filter(trip => trip && trip.startDate && trip.endDate).map((trip) => {
                          const startDate = trip.startDate instanceof Date ? trip.startDate :
                            (trip.startDate && typeof (trip.startDate as any).toDate === 'function') ?
                            (trip.startDate as any).toDate() : new Date();
                          const endDate = trip.endDate instanceof Date ? trip.endDate :
                            (trip.endDate && typeof (trip.endDate as any).toDate === 'function') ?
                            (trip.endDate as any).toDate() : new Date();
                          const duration = differenceInDays(endDate, startDate);
                          const nights = Math.max(0, duration);
                          const days = nights + 1;

                          return (
                            <Card key={trip.id} className="overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-br from-card via-card/95 to-card/90 rounded-2xl">
                              <CardContent className="p-6">
                                <div className="flex flex-col lg:flex-row gap-6">
                                  {/* Trip Info */}
                                  <div className="flex-grow space-y-4">
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                      <div className="space-y-2">
                                        <h4 className="text-xl font-semibold text-foreground flex items-center">
                                          <Clock className={cn("h-5 w-5 text-primary", direction === 'rtl' ? 'ml-2' : 'mr-2')} />
                                          {currentTranslations.tripDuration(nights, days)}
                                        </h4>
                                        <div className="flex flex-col sm:flex-row gap-4 text-sm text-muted-foreground">
                                          <span className="flex items-center">
                                            <CalendarDays className={cn("h-4 w-4", direction === 'rtl' ? 'ml-1' : 'mr-1')} />
                                            {currentTranslations.startDate}: {format(startDate, 'MMM dd, yyyy')}
                                          </span>
                                          <span className="flex items-center">
                                            <CalendarDays className={cn("h-4 w-4", direction === 'rtl' ? 'ml-1' : 'mr-1')} />
                                            {currentTranslations.endDate}: {format(endDate, 'MMM dd, yyyy')}
                                          </span>
                                        </div>
                                      </div>

                                      <Button
                                        onClick={() => {
                                          try {
                                            if (trip && trip.id) {
                                              setSelectedTrip(trip);
                                              setReservationDialogOpen(true);
                                            } else {
                                              console.error('Invalid trip data:', trip);
                                            }
                                          } catch (error) {
                                            console.error('Error opening reservation dialog:', error);
                                          }
                                        }}
                                        className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                                      >
                                        {currentTranslations.bookNow}
                                      </Button>
                                    </div>

                                    {/* Room Options */}
                                    {trip.availableRoomsByType && Array.isArray(trip.availableRoomsByType) && trip.availableRoomsByType.length > 0 && (
                                      <div className="bg-gradient-to-br from-muted/30 to-muted/20 rounded-lg p-4 border">
                                        <h5 className="font-semibold text-foreground mb-3 flex items-center">
                                          <DollarSign className={cn("h-4 w-4 text-primary", direction === 'rtl' ? 'ml-2' : 'mr-2')} />
                                          {currentTranslations.roomOptions}
                                        </h5>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                          {(trip.availableRoomsByType || []).map((room, idx) => {
                                            const roomType = roomTypes.find(rt => rt.id === room.roomTypeId);
                                            return (
                                              <div key={idx} className="bg-background/50 rounded-lg p-3 border hover:bg-background/70 transition-colors">
                                                <div className="font-medium text-foreground mb-1">{roomType?.name || 'Unknown Room'}</div>
                                                <div className="text-lg text-primary font-bold mb-1">
                                                  EGP {room.pricePerPerson || 0} {currentTranslations.perPerson}
                                                </div>
                                                <div className="text-xs text-muted-foreground flex items-center">
                                                  <Users className={cn("h-3 w-3", direction === 'rtl' ? 'ml-1' : 'mr-1')} />
                                                  Capacity: {roomType?.capacity || 'N/A'} guests
                                                </div>
                                                {roomType?.description && (
                                                  <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                                    {roomType.description}
                                                  </div>
                                                )}
                                              </div>
                                            );
                                          })}
                                        </div>

                                        {/* Price Note */}
                                        <div className="mt-4 pt-3 border-t border-muted-foreground/20">
                                          <div className="text-xs text-muted-foreground text-center">
                                            {currentTranslations.priceCalculationNote || "Prices shown are per person per trip. Total cost depends on room selection and extra option trips."}
                                          </div>
                                        </div>
                                      </div>
                                    )}

                                    {/* Additional Info */}
                                    <div className="flex flex-wrap gap-4 text-sm">
                                      {trip.transportationPricePerPerson && (
                                        <div className="flex items-center text-muted-foreground">
                                          <Car className={cn("h-4 w-4", direction === 'rtl' ? 'ml-1' : 'mr-1')} />
                                          {currentTranslations.transportation}: ${trip.transportationPricePerPerson}{currentTranslations.perPerson}
                                        </div>
                                      )}
                                      {trip.childPricePerPerson && (
                                        <div className="flex items-center text-muted-foreground">
                                          <Users className={cn("h-4 w-4", direction === 'rtl' ? 'ml-1' : 'mr-1')} />
                                          {currentTranslations.childPrice}: ${trip.childPricePerPerson}{currentTranslations.perPerson}
                                        </div>
                                      )}
                                    </div>

                                    {/* Features */}
                                    {trip.selectedFeatures && Array.isArray(trip.selectedFeatures) && trip.selectedFeatures.length > 0 && (
                                      <div className="flex flex-wrap gap-2">
                                        {(trip.selectedFeatures || []).map((feature, idx) => (
                                          <span key={idx} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                                            {TRIP_FEATURES_TRANSLATIONS[feature]?.[language] || feature}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    )}
                </div>
            </CardContent>
        </Card>
      </div>

      {/* Fullscreen Image Dialog */}
      {hasImages && (
        <Dialog open={fullscreenOpen} onOpenChange={setFullscreenOpen}>
          <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full p-0 bg-black/95 border-none">
            <div className="relative w-full h-full flex items-center justify-center">
              {/* Close Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFullscreenOpen(false)}
                className="absolute top-4 right-4 z-30 bg-black/50 hover:bg-black/70 text-white border-white/20 h-10 w-10 p-0"
                aria-label={currentTranslations.closeFullscreen}
              >
                <X className="h-5 w-5" />
              </Button>

              {/* Image Counter */}
              <div className="absolute top-4 left-4 z-30 bg-black/50 text-white px-3 py-1 rounded-full text-sm font-medium">
                {currentTranslations.imageCounter(fullscreenIndex + 1, hotel.imageUrls!.length)}
              </div>

              {/* Navigation Buttons */}
              {hotel.imageUrls!.length > 1 && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={prevFullscreenImage}
                    className="absolute left-4 top-1/2 -translate-y-1/2 z-30 bg-black/50 hover:bg-black/70 text-white border-white/20 h-12 w-12 p-0"
                    aria-label={currentTranslations.previousImage}
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={nextFullscreenImage}
                    className="absolute right-4 top-1/2 -translate-y-1/2 z-30 bg-black/50 hover:bg-black/70 text-white border-white/20 h-12 w-12 p-0"
                    aria-label={currentTranslations.nextImage}
                  >
                    <ChevronRight className="h-6 w-6" />
                  </Button>
                </>
              )}

              {/* Fullscreen Image */}
              <div className="relative w-full h-full max-w-[90vw] max-h-[90vh]">
                <Image
                  src={hotel.imageUrls![fullscreenIndex].url}
                  alt={`${hotel.name} image ${fullscreenIndex + 1}`}
                  fill
                  style={{ objectFit: 'contain' }}
                  className="rounded-lg"
                  data-ai-hint={hotel.imageUrls![fullscreenIndex].dataAiHint || "hotel building"}
                  priority
                  sizes="95vw"
                />
              </div>

              {/* Thumbnail Strip for Navigation */}
              {hotel.imageUrls!.length > 1 && hotel.imageUrls!.length <= 10 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex gap-2 bg-black/50 p-2 rounded-lg max-w-[90vw] overflow-x-auto">
                  {hotel.imageUrls!.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setFullscreenIndex(idx)}
                      className={cn(
                        "relative w-16 h-12 rounded overflow-hidden border-2 transition-all duration-300 flex-shrink-0",
                        fullscreenIndex === idx
                          ? "border-white scale-110"
                          : "border-white/30 hover:border-white/60"
                      )}
                      aria-label={`View image ${idx + 1}`}
                    >
                      <Image
                        src={img.url}
                        alt={`${hotel.name} thumbnail ${idx + 1}`}
                        fill
                        style={{ objectFit: 'cover' }}
                        className="brightness-75"
                        sizes="64px"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Reservation Dialog */}
      {selectedTrip && (
        <Dialog open={reservationDialogOpen} onOpenChange={setReservationDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <ReservationForm
              trip={selectedTrip}
              hotel={hotel}
              masterRoomTypes={roomTypes}
              onFormSubmitSuccess={() => {
                setReservationDialogOpen(false);
                setSelectedTrip(null);
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default HotelDetailPage;
    

