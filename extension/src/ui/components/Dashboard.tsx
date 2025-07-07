import { clsx } from "clsx";
import type React from "react";

interface Tab {
  id: string;
  label: string;
  icon?: string;
}

interface DashboardProps {
  children: React.ReactNode;
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  children,
  tabs,
  activeTab,
  onTabChange,
}) => {
  return (
    <div className="w-full">
      {/* Tab Navigation */}
      <div className="flex bg-white/5 rounded-lg p-1 mb-3 border border-white/10">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={clsx(
              "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200",
              activeTab === tab.id
                ? "bg-green-400/20 text-green-400 shadow-xs border border-green-400/30"
                : "text-neutral-400 hover:text-white hover:bg-white/5",
            )}
          >
            {tab.icon && <span className="text-base">{tab.icon}</span>}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="transition-all duration-300 ease-in-out">{children}</div>
    </div>
  );
};

interface TabPanelProps {
  value: string;
  activeTab: string;
  children: React.ReactNode;
}

export const TabPanel: React.FC<TabPanelProps> = ({
  value,
  activeTab,
  children,
}) => {
  if (value !== activeTab) return null;

  return <div className="animate-[fadeInUp_0.4s_ease-out]">{children}</div>;
};

interface MetricGridProps {
  children: React.ReactNode;
  columns?: 1 | 2 | 3 | 4;
  gap?: "sm" | "md" | "lg";
}

export const MetricGrid: React.FC<MetricGridProps> = ({
  children,
  columns = 2,
  gap = "md",
}) => {
  const gridClasses = {
    1: "grid-cols-1",
    2: "grid-cols-2",
    3: "grid-cols-3",
    4: "grid-cols-4",
  };

  const gapClasses = {
    sm: "gap-2",
    md: "gap-3",
    lg: "gap-4",
  };

  return (
    <div className={clsx("grid", gridClasses[columns], gapClasses[gap])}>
      {children}
    </div>
  );
};

interface SectionProps {
  title: string;
  subtitle?: string;
  icon?: string;
  children: React.ReactNode;
  className?: string;
}

export const Section: React.FC<SectionProps> = ({
  title,
  subtitle,
  icon,
  children,
  className,
}) => {
  return (
    <div className={clsx("mb-4", className)}>
      <div className="flex items-center gap-2 mb-2">
        {icon && <span className="text-lg">{icon}</span>}
        <div>
          <h2 className="text-base font-semibold text-white">{title}</h2>
          {subtitle && <p className="text-xs text-neutral-400">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
};
