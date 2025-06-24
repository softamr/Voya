"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Activity, User, MapPin, Calendar, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ActivityItem {
  id: string;
  type: 'user' | 'destination' | 'trip' | 'reservation';
  message: string;
  timestamp: Date;
  user?: string;
}

interface ActivityFeedProps {
  activities?: ActivityItem[];
  translations: any;
  className?: string;
}

const activityIcons = {
  user: User,
  destination: MapPin,
  trip: Calendar,
  reservation: FileText
};

const activityColors = {
  user: 'bg-blue-500',
  destination: 'bg-green-500',
  trip: 'bg-purple-500',
  reservation: 'bg-orange-500'
};

export function ActivityFeed({ activities, translations, className }: ActivityFeedProps) {
  // Sample activities if none provided
  const sampleActivities: ActivityItem[] = [
    {
      id: '1',
      type: 'user',
      message: translations.sampleActivityUser || 'New user registered',
      timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
      user: 'John Doe'
    },
    {
      id: '2',
      type: 'destination',
      message: translations.sampleActivityDest || 'New destination added',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
      user: 'Admin'
    },
    {
      id: '3',
      type: 'trip',
      message: translations.sampleActivityTrip || 'Trip date created',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4), // 4 hours ago
      user: 'Travel Manager'
    },
    {
      id: '4',
      type: 'reservation',
      message: translations.sampleActivityRes || 'New reservation received',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6), // 6 hours ago
      user: 'Customer'
    }
  ];

  const displayActivities = activities || sampleActivities;

  const formatTimeAgo = (timestamp: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - timestamp.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}h ago`;
    } else {
      return `${Math.floor(diffInMinutes / 1440)}d ago`;
    }
  };

  return (
    <Card className={cn("card-gradient", className)}>
      <CardHeader>
        <CardTitle className="flex items-center text-xl">
          <div className="p-2 rounded-lg bg-primary/10 mr-3">
            <Activity className="h-5 w-5 text-primary"/>
          </div>
          {translations.recentActivityTitle || 'Recent Activity'}
        </CardTitle>
        <CardDescription className="text-base">
          {translations.recentActivityDesc || 'Latest updates and changes in your system'}
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {displayActivities.map((activity) => {
            const Icon = activityIcons[activity.type];
            const colorClass = activityColors[activity.type];
            
            return (
              <div key={activity.id} className="flex items-start space-x-4 p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                <div className={cn("p-2 rounded-full", colorClass)}>
                  <Icon className="h-4 w-4 text-white" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {activity.message}
                  </p>
                  {activity.user && (
                    <p className="text-xs text-muted-foreground">
                      by {activity.user}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatTimeAgo(activity.timestamp)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Placeholder for future chart */}
        <div className="mt-6 h-48 bg-gradient-to-br from-muted/20 to-muted/10 rounded-xl border border-border/50 flex items-center justify-center">
          <div className="text-center space-y-2">
            <Activity className="h-12 w-12 text-primary/60 mx-auto" />
            <p className="text-muted-foreground text-sm">
              {translations.activityChartPlaceholder || 'Activity chart will be displayed here'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
