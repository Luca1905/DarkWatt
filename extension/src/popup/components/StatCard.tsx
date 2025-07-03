import type React from 'react';
import clsx from 'clsx';

interface StatCardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  isLoading?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  unit,
  icon,
  trend,
  trendValue,
  isLoading = false,
  className,
  size = 'md'
}) => {
  const formatValue = () => {
    if (isLoading) return '--';
    if (typeof value === 'number') {
      return value.toFixed(size === 'lg' ? 2 : 1);
    }
    return value;
  };

  const sizeClasses = {
    sm: 'p-2',
    md: 'p-3',
    lg: 'p-4'
  };

  const titleSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-sm'
  };

  const valueSizeClasses = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-2xl'
  };

  const getTrendIcon = () => {
    switch (trend) {
      case 'up': return '↗️';
      case 'down': return '↘️';
      default: return '→';
    }
  };

  const getTrendColor = () => {
    switch (trend) {
      case 'up': return 'text-green-400';
      case 'down': return 'text-red-400';
      default: return 'text-neutral-400';
    }
  };

  return (
    <div className={clsx(
      'bg-white/5 rounded-xl border border-white/10 backdrop-blur-sm transition-all duration-300 ease-in-out',
      'hover:bg-white/8 hover:border-green-400/30 hover:-translate-y-1 hover:shadow-lg hover:shadow-green-400/10',
      'group cursor-default',
      sizeClasses[size],
      className
    )}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          {icon && (
            <span className="text-lg group-hover:scale-110 transition-transform duration-300">
              {icon}
            </span>
          )}
          <h3 className={clsx(
            'text-neutral-300 font-medium transition-colors duration-300 group-hover:text-white',
            titleSizeClasses[size]
          )}>
            {title}
          </h3>
        </div>
        {trend && trendValue && (
          <div className={clsx(
            'flex items-center gap-1 text-xs',
            getTrendColor()
          )}>
            <span>{getTrendIcon()}</span>
            <span>{trendValue}</span>
          </div>
        )}
      </div>
      
      <div className="flex items-baseline gap-2">
        <span className={clsx(
          'font-bold text-green-400 transition-all duration-300 group-hover:text-green-300',
          valueSizeClasses[size],
          isLoading && 'animate-pulse bg-gradient-to-r from-green-400 via-green-500 to-green-400 bg-clip-text text-transparent bg-[length:200%_100%] animate-[shimmer_2s_infinite]'
        )}>
          {formatValue()}
        </span>
        {unit && (
          <span className="text-neutral-400 text-sm transition-colors duration-300 group-hover:text-neutral-300">
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}; 