import clsx from "clsx";
import type React from "react";

interface StatCardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon?: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  isLoading?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
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
  size = "md",
}) => {
  const formatValue = () => {
    if (isLoading) return "--";
    if (typeof value === "number") {
      return value.toFixed(size === "lg" ? 2 : 1);
    }
    return value;
  };

  const sizeClasses = {
    sm: "p-3",
    md: "p-4",
    lg: "p-5",
  };

  const titleSizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  const valueSizeClasses = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-3xl",
  };

  const getTrendIcon = () => {
    switch (trend) {
      case "up":
        return "↗️";
      case "down":
        return "↘️";
      default:
        return "→";
    }
  };

  const getTrendColor = () => {
    switch (trend) {
      case "up":
        return "text-green-400";
      case "down":
        return "text-red-400";
      default:
        return "text-slate-400";
    }
  };

  return (
    <div
      className={clsx(
        "bg-slate-800/50 rounded-xl border border-slate-700/50 backdrop-blur-sm transition-all duration-300 ease-in-out",
        "hover:bg-slate-800/70 hover:border-green-400/30 hover:shadow-lg hover:shadow-green-400/5",
        "group cursor-default",
        sizeClasses[size],
        className,
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          {icon && (
            <div className="w-8 h-8 bg-green-400/10 rounded-lg flex items-center justify-center group-hover:bg-green-400/20 transition-colors duration-300">
              <span className="text-lg group-hover:scale-110 transition-transform duration-300">
                {icon}
              </span>
            </div>
          )}
          <div className="flex-1">
            <h3
              className={clsx(
                "text-slate-300 font-medium transition-colors duration-300 group-hover:text-white",
                titleSizeClasses[size],
              )}
            >
              {title}
            </h3>
          </div>
        </div>
        {trend && trendValue && (
          <div
            className={clsx(
              "flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-slate-700/50",
              getTrendColor(),
            )}
          >
            <span>{getTrendIcon()}</span>
            <span className="font-medium">{trendValue}</span>
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-2">
        <span
          className={clsx(
            "font-bold text-green-400 transition-all duration-300 group-hover:text-green-300",
            valueSizeClasses[size],
            isLoading && "animate-pulse",
          )}
        >
          {formatValue()}
        </span>
        {unit && (
          <span className="text-slate-400 text-sm transition-colors duration-300 group-hover:text-slate-300 font-medium">
            {unit}
          </span>
        )}
      </div>
    </div>
  );
};
