export interface stats {
  currentLuminance: number;
  totalTrackedSites: number;
  todaySavings: number;
  weekSavings: number;
  totalSavings: number;
  potentialSavingMWh: number;
  cpuUsage: number;
  displayInfo: {
    width: number;
    height: number;
  };
}
