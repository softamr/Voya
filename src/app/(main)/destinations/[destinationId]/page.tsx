
"use client";

import type { NextPage } from 'next';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';

import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, ArrowLeft, CalendarDays, MapPin, BedDouble, Users, Palette, Ticket, Clock, ListChecks, Hotel as HotelIconLucide, Tag, LogIn, Star, Eye, Calendar, DollarSign, Sparkles, ArrowRight, Heart, Share2 } from 'lucide-react';
import type { Destination, Hotel, TripDate, RoomType, TripDateRoomAvailability, HotelImage } from '@/lib/types';
import { format, differenceInDays } from 'date-fns';
import { TRIP_FEATURES_TRANSLATIONS, type TripFeature } from '@/lib/constants';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import ReservationForm from '@/components/forms/ReservationForm';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, onSnapshot, getDocs, Timestamp, orderBy } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { ar, enUS } from 'date-fns/locale';


const DestinationDetailPage: NextPage = () => {
  const router = useRouter();
  const { destinationId } = useParams<{ destinationId?: string }>(); // Directly destructure and allow undefined
  const { toast } = useToast();
  const { language, direction } = useLanguage();
  const { user } = useAuth(); // Get user from AuthContext

  const [destination, setDestination] = useState<Destination | null>(null);
  const [hotelsInDestination, setHotelsInDestination] = useState<Hotel[]>([]);
  const [tripsByHotel, setTripsByHotel] = useState<Record<string, TripDate[]>>({});
  const [masterRoomTypes, setMasterRoomTypes] = useState<RoomType[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedTripForReservation, setSelectedTripForReservation] = useState<TripDate | null>(null);
  const [selectedHotelForReservation, setSelectedHotelForReservation] = useState<Hotel | null>(null);
  const [isReservationModalOpen, setIsReservationModalOpen] = useState(false);

  const dateLocale = language === 'ar' ? ar : enUS;

  const translations = {
    en: {
      backButton: "Back",
      notFoundTitle: "Destination Not Found",
      notFoundDescription: "The destination you are looking for does not exist or could not be loaded.",
      notFoundDescriptionVisitor: "Details for this destination could not be loaded. Access may require login or the content might be unavailable.",
      backToHomepageButton: "Back to Homepage",
      noHotelsTitle: "No Hotels Available Yet",
      noHotelsDescription: (name: string) => `There are currently no hotels listed for ${name}. Please check back later or explore other destinations.`,
      availableTripsHeading: "Available Trips",
      tripPrefix: "Trip:",
      statusLabel: "Status:",
      nightsSuffix: "Nights",
      daysSuffix: "Days",
      roomOptionsHeading: "Room Options:",
      perPersonSuffix: "/person",
      transportationLabel: "Transportation:",
      perSeatSuffix: "/seat",
      childPriceLabel: "Child Price:",
      childAgeSuffix: (age: number) => `(up to ${age} yrs)`,
      featuresIncludedHeading: "Features Included:",
      optionalExtrasHeading: "Optional Extras:",
      reserveNowButton: "Reserve Now",
      loginToReserveButton: "Login to Reserve",
      currentlyUnavailableButton: "Currently Unavailable",
      noActiveTripsMessage: "No active trips currently scheduled for this hotel.",
      exploreHotelsTitle: "Explore Our Hotels",
      exploreHotelsSubtitle: "Discover amazing accommodations for your perfect getaway",
      viewHotelDetails: "View Hotel Details",
      startingFrom: "Starting from",
      perNight: "per night",
      availableTrips: (count: number) => `${count} Available Trip${count !== 1 ? 's' : ''}`,
      noTripsAvailable: "No trips available",
      bookNow: "Book Now",
      viewAllTrips: "View All Trips",
      popularChoice: "Popular Choice",
      bestValue: "Best Value",
      luxury: "Luxury",
      toastError: "Error",
      toastNotFound: "Not Found",
      toastDestinationNotFound: "Destination could not be found.",
      toastCouldNotLoadRoomTypes: "Could not load room types data.",
      toastCouldNotLoadHotelData: "Could not load hotel data.",
      toastCouldNotLoadPageData: "Could not load page data.",
    },
    ar: {
      backButton: "العودة",
      notFoundTitle: "لم يتم العثور على الوجهة",
      notFoundDescription: "الوجهة التي تبحث عنها غير موجودة أو لا يمكن تحميلها.",
      notFoundDescriptionVisitor: "تعذر تحميل تفاصيل هذه الوجهة. قد يتطلب الوصول تسجيل الدخول أو قد يكون المحتوى غير متوفر.",
      backToHomepageButton: "العودة إلى الصفحة الرئيسية",
      noHotelsTitle: "لا توجد فنادق متاحة بعد",
      noHotelsDescription: (name: string) => `لا توجد حاليًا فنادق مدرجة لـ ${name}. يرجى التحقق مرة أخرى لاحقًا أو استكشاف وجهات أخرى.`,
      availableTripsHeading: "الرحلات المتاحة",
      tripPrefix: "رحلة:",
      statusLabel: "الحالة:",
      nightsSuffix: "ليالٍ",
      daysSuffix: "أيام",
      roomOptionsHeading: "خيارات الغرف:",
      perPersonSuffix: "/للفرد",
      transportationLabel: "النقل:",
      perSeatSuffix: "/للمقعد",
      childPriceLabel: "سعر الطفل:",
      childAgeSuffix: (age: number) => `(حتى ${age} سنوات)`,
      featuresIncludedHeading: "الميزات المضمنة:",
      optionalExtrasHeading: "إضافات اختيارية:",
      reserveNowButton: "احجز الآن",
      loginToReserveButton: "تسجيل الدخول للحجز",
      currentlyUnavailableButton: "غير متاح حاليًا",
      noActiveTripsMessage: "لا توجد رحلات نشطة مجدولة حاليًا لهذا الفندق.",
      exploreHotelsTitle: "استكشف فنادقنا",
      exploreHotelsSubtitle: "اكتشف أماكن إقامة مذهلة لعطلتك المثالية",
      viewHotelDetails: "عرض تفاصيل الفندق",
      startingFrom: "ابتداءً من",
      perNight: "لليلة الواحدة",
      availableTrips: (count: number) => `${count} رحلة متاحة`,
      noTripsAvailable: "لا توجد رحلات متاحة",
      bookNow: "احجز الآن",
      viewAllTrips: "عرض جميع الرحلات",
      popularChoice: "الخيار الشائع",
      bestValue: "أفضل قيمة",
      luxury: "فاخر",
      toastError: "خطأ",
      toastNotFound: "غير موجود",
      toastDestinationNotFound: "تعذر العثور على الوجهة.",
      toastCouldNotLoadRoomTypes: "تعذر تحميل بيانات أنواع الغرف.",
      toastCouldNotLoadHotelData: "تعذر تحميل بيانات الفندق.",
      toastCouldNotLoadPageData: "تعذر تحميل بيانات الصفحة.",
    },
  };

  const currentTranslations = translations[language];


  useEffect(() => {
    if (!destinationId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    let hotelsUnsub: (() => void) | undefined;
    let roomTypesUnsub: (() => void) | undefined;

    const fetchPageData = async () => {
      try {
        const destDocRef = doc(db, "destinations", destinationId);
        const destSnap = await getDoc(destDocRef);

        if (!destSnap.exists()) {
          toast({ title: currentTranslations.toastNotFound, description: currentTranslations.toastDestinationNotFound, variant: "destructive" });
          setDestination(null);
          setLoading(false);
          return;
        }

        const destData = destSnap.data();
        setDestination({
          id: destSnap.id,
          ...destData,
          createdAt: destData.createdAt instanceof Timestamp ? destData.createdAt.toDate() : undefined,
          updatedAt: destData.updatedAt instanceof Timestamp ? destData.updatedAt.toDate() : undefined,
        } as Destination);

        const roomTypesQuery = query(collection(db, "roomTypes"), orderBy("name"));
        roomTypesUnsub = onSnapshot(roomTypesQuery, (snapshot) => {
          setMasterRoomTypes(snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as RoomType)));
        }, (error) => {
          console.error("Error fetching master room types:", error);
          toast({ title: currentTranslations.toastError, description: currentTranslations.toastCouldNotLoadRoomTypes, variant: "destructive" });
        });

        const hotelsQuery = query(collection(db, "hotels"), where("destinationId", "==", destinationId), orderBy("name"));
        hotelsUnsub = onSnapshot(hotelsQuery, async (hotelSnapshot) => {
          const fetchedHotels = hotelSnapshot.docs.map(docSnap => {
            const hotelData = docSnap.data();
            return {
              id: docSnap.id,
              ...hotelData,
              imageUrls: hotelData.imageUrls || [],
              createdAt: hotelData.createdAt instanceof Timestamp ? hotelData.createdAt.toDate() : undefined,
              updatedAt: hotelData.updatedAt instanceof Timestamp ? hotelData.updatedAt.toDate() : undefined,
            } as Hotel;
          });
          setHotelsInDestination(fetchedHotels);

          if (fetchedHotels.length > 0) {
            const hotelTripPromises = fetchedHotels.map(async (hotel) => {
              const tripsQuery = query(
                collection(db, "tripDates"),
                where("hotelId", "==", hotel.id),
                orderBy("startDate", "asc")
              );
              const tripSnapshot = await getDocs(tripsQuery);
              const hotelTripsData = tripSnapshot.docs
                .map((tripDoc) => {
                  const tripData = tripDoc.data();
                  if (tripData.status !== 'active') return null;

                  return {
                    id: tripDoc.id,
                    ...tripData,
                    startDate: (tripData.startDate as Timestamp).toDate(),
                    endDate: (tripData.endDate as Timestamp).toDate(),
                    availableRoomsByType: (tripData.availableRoomsByType || []).map((ar: TripDateRoomAvailability) => ({
                      ...ar,
                    })),
                    selectedFeatures: tripData.selectedFeatures || [],
                    extraFees: (tripData.extraFees || []).map((fee: any, feeIndex: number) => ({
                      ...fee,
                      id: typeof fee.id === 'string' && fee.id ? fee.id : `trip-${tripDoc.id}-fee-${feeIndex}`
                    })),
                  } as TripDate;
                })
                .filter(Boolean) as TripDate[];
              return { hotelId: hotel.id, trips: hotelTripsData };
            });

            const results = await Promise.all(hotelTripPromises);
            const newTripsByHotel: Record<string, TripDate[]> = {};
            results.forEach(result => {
              newTripsByHotel[result.hotelId] = result.trips;
            });
            setTripsByHotel(newTripsByHotel);
          } else {
            setTripsByHotel({});
          }
          setLoading(false);
        }, (error) => {
          console.error("Error fetching hotels for destination:", error);
          toast({ title: currentTranslations.toastError, description: currentTranslations.toastCouldNotLoadHotelData, variant: "destructive" });
          setLoading(false);
        });

      } catch (error) {
        console.error("Error fetching destination page data:", error);
        toast({ title: currentTranslations.toastError, description: currentTranslations.toastCouldNotLoadPageData, variant: "destructive" });
        setDestination(null);
        setHotelsInDestination([]);
        setTripsByHotel({});
        setMasterRoomTypes([]);
        setLoading(false);
      }
    };

    fetchPageData();

    return () => {
      if (hotelsUnsub) hotelsUnsub();
      if (roomTypesUnsub) roomTypesUnsub();
    };
  }, [destinationId, toast, language]);

  const handleOpenReservationModal = (trip: TripDate, hotel: Hotel) => {
    setSelectedTripForReservation(trip);
    setSelectedHotelForReservation(hotel);
    setIsReservationModalOpen(true);
  };

  const pathname = destinationId ? `/destinations/${destinationId}` : '/';

  const handleReserveButtonClick = (trip: TripDate, hotel: Hotel) => {
    if (!user) {
      router.push('/login?redirect=' + encodeURIComponent(pathname));
    } else {
      handleOpenReservationModal(trip, hotel);
    }
  };

  const handleReservationFormSubmitSuccess = () => {
    setIsReservationModalOpen(false);
    setSelectedTripForReservation(null);
    setSelectedHotelForReservation(null);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-8" dir={direction}>
        <Skeleton className="h-12 w-1/3" />
        <Skeleton className="h-64 w-full rounded-lg" />
        <Skeleton className="h-20 w-full" />
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    );
  }

  if (!destination) {
    const descriptionText = !user ? currentTranslations.notFoundDescriptionVisitor : currentTranslations.notFoundDescription;
    return (
      <div className="container mx-auto px-4 py-8 text-center" dir={direction}>
        <AlertTriangle className="mx-auto h-16 w-16 text-destructive mb-4" />
        <h1 className="text-2xl font-semibold">{currentTranslations.notFoundTitle}</h1>
        <p className="text-muted-foreground mb-4">{descriptionText}</p>
        <Button asChild>
          <Link href="/">
            {direction === 'ltr' && <ArrowLeft className="mr-2 h-4 w-4" />}
            {currentTranslations.backToHomepageButton}
            {direction === 'rtl' && <ArrowLeft className="ml-2 h-4 w-4 transform scale-x-[-1]" />}
          </Link>
        </Button>
      </div>
    );
  }

  const primaryDestinationImage = destination.imageUrl;
  const destinationDisplayName = language === 'ar' && destination.name_ar ? destination.name_ar : destination.name;
  const destinationDisplayDescription = language === 'ar' && destination.description_ar ? destination.description_ar : destination.description;


  return (
    <div className="bg-gradient-to-br from-background via-background to-muted/20" dir={direction}>
      {/* Enhanced Hero Section */}
      <section className="relative h-[70vh] min-h-[500px] max-h-[800px] w-full overflow-hidden">
        {primaryDestinationImage ? (
          <div className="absolute inset-0">
            <Image
              src={primaryDestinationImage}
              alt={destinationDisplayName}
              fill
              style={{ objectFit: 'cover' }}
              className="brightness-75 scale-105 hover:scale-100 transition-transform duration-[3000ms]"
              data-ai-hint={destination.dataAiHint || "travel landscape"}
              priority
            />
          </div>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-accent/10 to-muted/20 flex items-center justify-center">
            <MapPin className="h-32 w-32 text-primary/40" />
          </div>
        )}

        {/* Enhanced Gradient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/40" />

        {/* Animated Background Elements */}
        <div className="absolute inset-0 z-5">
          <div className="absolute top-20 left-10 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-10 w-[32rem] h-[32rem] bg-accent/10 rounded-full blur-3xl animate-pulse delay-1000" />
        </div>

        {/* Hero Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 space-y-8 z-20">
          <div className="space-y-6 max-w-5xl">
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-headline font-bold text-white mb-6 drop-shadow-2xl animate-fade-in">
              {destinationDisplayName}
            </h1>
          </div>

          {/* Enhanced Stats Bar */}
          <div className="flex items-center gap-8 bg-white/15 backdrop-blur-xl rounded-2xl px-8 py-4 border border-white/30 shadow-2xl hover:bg-white/20 transition-all duration-300">
            <div className="text-center">
              <div className="text-3xl font-bold text-white">{hotelsInDestination.length}</div>
              <div className="text-sm text-white/80 font-medium">Hotels Available</div>
            </div>
            <div className="w-px h-10 bg-white/40" />
            <div className="text-center">
              <div className="text-3xl font-bold text-white">
                {Object.values(tripsByHotel).flat().filter(trip => trip.status === 'active').length}
              </div>
              <div className="text-sm text-white/80 font-medium">Active Trips</div>
            </div>
            <div className="w-px h-10 bg-white/40" />
            <div className="text-center">
              <div className="text-3xl font-bold text-white">★★★★★</div>
              <div className="text-sm text-white/80 font-medium">Premium Quality</div>
            </div>
          </div>
        </div>
      </section>

      {/* Destination Description Section */}
      <section className="relative bg-gradient-to-br from-background via-background/95 to-muted/10 py-20 overflow-hidden">
        {/* Decorative Background Elements */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-10 left-10 w-32 h-32 bg-primary rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 right-10 w-40 h-40 bg-accent rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/30 rounded-full blur-3xl"></div>
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-5xl mx-auto">
            {/* Section Header */}
            <div className="text-center mb-12">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-full mb-6 shadow-lg">
                <MapPin className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-3xl md:text-4xl font-headline font-bold text-gradient bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-4">
                Discover {destinationDisplayName}
              </h2>
              <div className="w-24 h-1 bg-gradient-to-r from-primary to-accent mx-auto rounded-full"></div>
            </div>

            {/* Description Content */}
            <div className="bg-white/50 backdrop-blur-sm rounded-3xl p-8 md:p-12 shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-500">
              <div className="relative">
                {/* Quote Icon */}
                <div className="absolute -top-4 -left-4 w-12 h-12 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center shadow-lg">
                  <span className="text-white text-2xl font-bold">"</span>
                </div>

                <p className="text-lg md:text-xl lg:text-2xl text-foreground/90 leading-relaxed text-center font-light italic pl-8">
                  {destinationDisplayDescription}
                </p>

                {/* Decorative Elements */}
                <div className="flex items-center justify-center mt-8 space-x-4">
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                  <div className="w-3 h-3 bg-accent rounded-full animate-pulse delay-100"></div>
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse delay-200"></div>
                </div>
              </div>
            </div>

            {/* Additional Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
              <div className="bg-white/30 backdrop-blur-sm rounded-2xl p-6 text-center border border-white/20 hover:bg-white/40 transition-all duration-300">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Eye className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">Breathtaking Views</h3>
                <p className="text-sm text-muted-foreground">Experience stunning landscapes and unforgettable scenery</p>
              </div>

              <div className="bg-white/30 backdrop-blur-sm rounded-2xl p-6 text-center border border-white/20 hover:bg-white/40 transition-all duration-300">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">Unique Experiences</h3>
                <p className="text-sm text-muted-foreground">Create memories that will last a lifetime</p>
              </div>

              <div className="bg-white/30 backdrop-blur-sm rounded-2xl p-6 text-center border border-white/20 hover:bg-white/40 transition-all duration-300">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Heart className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">Premium Quality</h3>
                <p className="text-sm text-muted-foreground">Carefully curated accommodations and services</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-20">
        <Button
          variant="outline"
          onClick={() => router.back()}
          className="mb-16 hover:bg-primary hover:text-primary-foreground transition-all duration-300 shadow-lg hover:shadow-xl border-2"
        >
          {direction === 'ltr' && <ArrowLeft className="mr-2 h-4 w-4" />}
          {currentTranslations.backButton}
          {direction === 'rtl' && <ArrowLeft className="ml-2 h-4 w-4 transform scale-x-[-1]" />}
        </Button>

        {hotelsInDestination.length === 0 && (
          <Card className="text-center py-20 bg-gradient-to-br from-primary/10 to-accent/10 border-dashed border-2 rounded-3xl shadow-xl">
            <CardHeader>
              <div className="mx-auto w-32 h-32 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full flex items-center justify-center mb-8 shadow-lg">
                <HotelIconLucide className="h-16 w-16 text-primary" />
              </div>
              <CardTitle className="text-3xl font-headline text-gradient bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                {currentTranslations.noHotelsTitle}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-xl max-w-lg mx-auto leading-relaxed">
                {currentTranslations.noHotelsDescription(destinationDisplayName)}
              </CardDescription>
            </CardContent>
          </Card>
        )}

        {hotelsInDestination.length > 0 && (
          <div className="space-y-16">
            {/* Enhanced Section Header */}
            <div className="text-center space-y-6">
              <h2 className="text-5xl font-headline font-bold text-gradient bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                {currentTranslations.exploreHotelsTitle}
              </h2>
              <p className="text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                {currentTranslations.exploreHotelsSubtitle}
              </p>
              <div className="w-24 h-1 bg-gradient-to-r from-primary to-accent mx-auto rounded-full"></div>
            </div>

            {/* Hotels Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {hotelsInDestination.map((hotel, index) => {
                const primaryHotelImage = hotel.imageUrls && hotel.imageUrls.length > 0 ? hotel.imageUrls[0] : null;
                const hotelTrips = tripsByHotel[hotel.id] || [];
                const activeTrips = hotelTrips.filter(trip => trip.status === 'active');

                // Calculate minimum price from available trips
                let minPrice = null;
                if (activeTrips.length > 0) {
                  const allPrices = activeTrips.flatMap(trip =>
                    trip.availableRoomsByType?.map(room => room.pricePerPerson) || []
                  );
                  if (allPrices.length > 0) {
                    minPrice = Math.min(...allPrices);
                  }
                }

                // Determine hotel badge
                let badge = null;
                if (index === 0 && activeTrips.length > 0) badge = currentTranslations.popularChoice;
                else if (minPrice && minPrice < 1000) badge = currentTranslations.bestValue;
                else if (minPrice && minPrice > 3000) badge = currentTranslations.luxury;

                return (
                  <Card key={hotel.id} className="group overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-500 border-0 bg-gradient-to-br from-background via-background/95 to-muted/20 rounded-3xl hover:scale-105">
                    {/* Hotel Image */}
                    <div className="relative h-80 overflow-hidden rounded-t-3xl">
                      {primaryHotelImage && primaryHotelImage.url ? (
                        <Image
                          src={primaryHotelImage.url}
                          alt={hotel.name}
                          fill
                          style={{ objectFit: "cover" }}
                          data-ai-hint={primaryHotelImage.dataAiHint || "hotel exterior"}
                          className="group-hover:scale-110 transition-transform duration-700"
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 50vw"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                          <HotelIconLucide className="h-16 w-16 text-primary/60" />
                        </div>
                      )}

                      {/* Overlay gradient */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                      {/* Enhanced Badge */}
                      {badge && (
                        <div className="absolute top-6 left-6 z-10">
                          <Badge className="bg-gradient-to-r from-primary to-accent text-white font-semibold px-4 py-2 shadow-xl rounded-full">
                            <Sparkles className="h-4 w-4 mr-2" />
                            {badge}
                          </Badge>
                        </div>
                      )}

                      {/* Enhanced Price Badge */}
                      {minPrice && (
                        <div className="absolute top-6 right-6 z-10 bg-white/95 backdrop-blur-xl rounded-2xl px-4 py-3 shadow-xl border border-white/20">
                          <div className="text-xs text-muted-foreground font-medium">{currentTranslations.startingFrom}</div>
                          <div className="font-bold text-xl text-primary">EGP {minPrice.toFixed(0)}</div>
                          <div className="text-xs text-muted-foreground">{currentTranslations.perNight}</div>
                        </div>
                      )}

                      {/* Trip Count Badge */}
                      <div className="absolute bottom-4 left-4 z-10 bg-black/70 text-white rounded-full px-3 py-1 text-sm font-medium">
                        {activeTrips.length > 0 ? (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {currentTranslations.availableTrips(activeTrips.length)}
                          </span>
                        ) : (
                          <span className="text-white/70">{currentTranslations.noTripsAvailable}</span>
                        )}
                      </div>
                    </div>
                    {/* Hotel Content */}
                    <CardHeader className="space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <CardTitle className="text-2xl font-headline group-hover:text-primary transition-colors">
                            {hotel.name}
                          </CardTitle>
                          <CardDescription className="flex items-center text-base">
                            <MapPin className={cn("h-4 w-4", direction === 'rtl' ? 'ml-2' : 'mr-2')} />
                            {hotel.address}
                          </CardDescription>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/hotels/${hotel.id}`)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>

                      <p className="text-muted-foreground leading-relaxed overflow-hidden" style={{
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical'
                      }}>
                        {language === 'ar' && (hotel as any).description_ar ? (hotel as any).description_ar : hotel.description}
                      </p>
                    </CardHeader>

                    <CardContent className="space-y-6">
                      {activeTrips.length > 0 ? (
                        <div className="space-y-4">
                          <h4 className="font-semibold text-lg flex items-center">
                            <CalendarDays className={cn("h-5 w-5 text-primary", direction === 'rtl' ? 'ml-2' : 'mr-2')} />
                            {currentTranslations.availableTripsHeading}
                          </h4>
                          <div className="grid gap-3">
                            {activeTrips.slice(0, 2).map((trip) => {
                              let tripNights = 0;
                              let tripDays = 0;
                              const tripStartDate = new Date(trip.startDate as Date);
                              const tripEndDate = new Date(trip.endDate as Date);
                              if (!isNaN(tripStartDate.getTime()) && !isNaN(tripEndDate.getTime()) && tripEndDate > tripStartDate) {
                                tripNights = differenceInDays(tripEndDate, tripStartDate);
                                tripDays = tripNights + 1;
                              }

                              // Get minimum price for this trip
                              const tripMinPrice = trip.availableRoomsByType && trip.availableRoomsByType.length > 0
                                ? Math.min(...trip.availableRoomsByType.map(room => room.pricePerPerson))
                                : null;

                              return (
                                <div key={trip.id} className="bg-muted/30 rounded-lg p-4 border border-muted hover:border-primary/30 transition-colors">
                                  <div className="flex items-center justify-between mb-3">
                                    <div className="space-y-1">
                                      <div className="font-semibold text-sm">
                                        {format(tripStartDate, 'MMM dd', { locale: dateLocale })} - {format(tripEndDate, 'MMM dd, yyyy', { locale: dateLocale })}
                                      </div>
                                      {tripDays > 0 && tripNights >= 0 && (
                                        <div className="flex items-center text-xs text-muted-foreground">
                                          <Clock className={cn("h-3 w-3", direction === 'rtl' ? 'ml-1' : 'mr-1')} />
                                          {tripNights} {currentTranslations.nightsSuffix} / {tripDays} {currentTranslations.daysSuffix}
                                        </div>
                                      )}
                                    </div>
                                    {tripMinPrice && (
                                      <div className="text-right">
                                        <div className="font-bold text-primary">EGP {tripMinPrice.toFixed(0)}</div>
                                        <div className="text-xs text-muted-foreground">{currentTranslations.perPersonSuffix}</div>
                                      </div>
                                    )}
                                  </div>
                                  {/* Trip Features */}
                                  {trip.selectedFeatures && trip.selectedFeatures.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                      {trip.selectedFeatures.slice(0, 3).map(featureKey => {
                                        const featureLabel = TRIP_FEATURES_TRANSLATIONS[featureKey as TripFeature]?.[language] || featureKey;
                                        return (
                                          <Badge key={featureKey} variant="secondary" className="text-xs px-2 py-0.5">
                                            {featureLabel}
                                          </Badge>
                                        );
                                      })}
                                      {trip.selectedFeatures.length > 3 && (
                                        <Badge variant="outline" className="text-xs px-2 py-0.5">
                                          +{trip.selectedFeatures.length - 3}
                                        </Badge>
                                      )}
                                    </div>
                                  )}

                                  {/* Quick Book Button */}
                                  <Button
                                    size="sm"
                                    className="w-full mt-2"
                                    onClick={() => handleReserveButtonClick(trip, hotel)}
                                    disabled={trip.status !== 'active'}
                                  >
                                    {trip.status !== 'active'
                                      ? currentTranslations.currentlyUnavailableButton
                                      : (!user ? (
                                        <>
                                          <LogIn className={cn("h-3 w-3", direction === 'rtl' ? 'ml-1' : 'mr-1')} />
                                          {currentTranslations.loginToReserveButton}
                                        </>
                                      ) : (
                                        <>
                                          <Calendar className={cn("h-3 w-3", direction === 'rtl' ? 'ml-1' : 'mr-1')} />
                                          {currentTranslations.bookNow}
                                        </>
                                      ))
                                    }
                                  </Button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <CalendarDays className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p>{currentTranslations.noActiveTripsMessage}</p>
                        </div>
                      )}
                    </CardContent>


                    {/* Hotel Card Footer */}
                    <CardFooter className="bg-muted/20 border-t flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {activeTrips.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{activeTrips.length - 2} {currentTranslations.viewAllTrips}
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/hotels/${hotel.id}`)}
                          className="flex items-center gap-1"
                        >
                          <Eye className="h-3 w-3" />
                          {currentTranslations.viewHotelDetails}
                        </Button>
                      </div>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

      </div>
      {selectedTripForReservation && selectedHotelForReservation && user && (
        <Dialog open={isReservationModalOpen} onOpenChange={setIsReservationModalOpen}>
          <DialogContent className="sm:max-w-lg">
            <ReservationForm
              trip={selectedTripForReservation}
              hotel={selectedHotelForReservation}
              masterRoomTypes={masterRoomTypes}
              onFormSubmitSuccess={handleReservationFormSubmitSuccess}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default DestinationDetailPage;


