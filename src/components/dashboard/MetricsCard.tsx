"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
  gradient?: string;
}

export function MetricsCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
  className,
  gradient = "from-primary/10 to-accent/10"
}: MetricsCardProps) {
  return (
    <Card className={cn(
      "relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 group",
      "bg-gradient-to-br from-card via-card/95 to-card/90",
      className
    )}>
      {/* Background Gradient */}
      <div className={cn(
        "absolute inset-0 bg-gradient-to-br opacity-50 group-hover:opacity-70 transition-opacity",
        gradient
      )} />
      
      {/* Decorative Elements */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/10 to-transparent rounded-full blur-2xl" />
      
      <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm font-medium text-foreground/80 group-hover:text-foreground transition-colors">
          {title}
        </CardTitle>
        <div className="p-3 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors shadow-lg">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </CardHeader>
      
      <CardContent className="relative space-y-3">
        <div className="flex items-baseline space-x-2">
          <span className="text-3xl font-bold text-gradient bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            {value}
          </span>
          {trend && (
            <span className={cn(
              "text-sm font-medium px-2 py-1 rounded-full",
              trend.isPositive 
                ? "text-green-700 bg-green-100 dark:text-green-400 dark:bg-green-900/30" 
                : "text-red-700 bg-red-100 dark:text-red-400 dark:bg-red-900/30"
            )}>
              {trend.isPositive ? '+' : ''}{trend.value}%
            </span>
          )}
        </div>
        
        {description && (
          <p className="text-xs text-muted-foreground leading-relaxed">
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
