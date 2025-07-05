export interface stats {
  currentLuminance: number;
  totalTrackedSites: number;
  todaySavings: number;
  weekSavings: number;
  totalSavings: number;
  potentialSavingMWh: number;
  cpuUsage: number;
  displayInfo: {
    dimensions: {
      width: number;
      height: number;
    };
    workArea: {
      width: number;
      height: number;
    };
  };
}
