"use client";

import { MetricsCard } from './MetricsCard';
import { Users, MapPin, Hotel, FileText, AlertCircle, CheckCircle, XCircle, TrendingUp } from 'lucide-react';

interface StatsData {
  totalUsers: number;
  totalDestinations: number;
  totalHotels: number;
  pendingReservations: number;
  contactedReservations: number;
  confirmedReservations: number;
  cancelledReservations: number;
}

interface StatsGridProps {
  stats: StatsData;
  isLoading: boolean;
  translations: any;
  canManageUsers: boolean;
}

export function StatsGrid({ stats, isLoading, translations, canManageUsers }: StatsGridProps) {
  const statsConfig = [
    {
      title: translations.totalUsers,
      value: stats.totalUsers,
      icon: Users,
      description: translations.totalUsersDesc,
      link: "/admin/users",
      showLink: canManageUsers,
      gradient: "from-blue-500/10 to-cyan-500/10",
      trend: { value: 12, isPositive: true }
    },
    {
      title: translations.destinations,
      value: stats.totalDestinations,
      icon: MapPin,
      description: translations.destinationsDesc,
      link: "/admin/destinations",
      showLink: true,
      gradient: "from-green-500/10 to-emerald-500/10",
      trend: { value: 8, isPositive: true }
    },
    {
      title: translations.hotels,
      value: stats.totalHotels,
      icon: Hotel,
      description: translations.hotelsDesc,
      link: "/admin/hotels",
      showLink: true,
      gradient: "from-purple-500/10 to-pink-500/10",
      trend: { value: 5, isPositive: true }
    },
    {
      title: translations.pendingReservations,
      value: stats.pendingReservations,
      icon: FileText,
      description: translations.pendingReservationsDesc,
      link: "/admin/reservations?status=pending",
      showLink: true,
      gradient: "from-orange-500/10 to-red-500/10",
      trend: { value: 3, isPositive: false }
    },
    {
      title: translations.contactedReservations,
      value: stats.contactedReservations,
      icon: AlertCircle,
      description: translations.contactedReservationsDesc,
      link: "/admin/reservations?status=contacted",
      showLink: true,
      gradient: "from-yellow-500/10 to-orange-500/10"
    },
    {
      title: translations.confirmedReservations,
      value: stats.confirmedReservations,
      icon: CheckCircle,
      description: translations.confirmedReservationsDesc,
      link: "/admin/reservations?status=confirmed",
      showLink: true,
      gradient: "from-green-500/10 to-teal-500/10",
      trend: { value: 15, isPositive: true }
    },
    {
      title: translations.cancelledReservations,
      value: stats.cancelledReservations,
      icon: XCircle,
      description: translations.cancelledReservationsDesc,
      link: "/admin/reservations?status=cancelled",
      showLink: true,
      gradient: "from-red-500/10 to-pink-500/10"
    }
  ];

  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(7)].map((_, i) => (
          <div key={i} className="h-32 bg-muted/50 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {statsConfig.map((stat, index) => (
        <MetricsCard
          key={index}
          title={stat.title}
          value={stat.value}
          icon={stat.icon}
          description={stat.description}
          trend={stat.trend}
          gradient={stat.gradient}
          className="hover:scale-105 transition-transform duration-300"
        />
      ))}
    </div>
  );
}
