export const tomorrowISO = (): string => {
  return inXDaysISO(1);
};

export const inXDaysISO = (days: number): string => {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + days);
  return tomorrow.toISOString();
};
