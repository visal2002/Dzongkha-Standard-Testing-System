export const DSTS_SCORE_MINIMUM = 1;
export const DSTS_SCORE_MAXIMUM = 50;
export const DSTS_SCORE_INCREMENT = 0.5;

export const DSTS_STANDARD_RANGES = [
  { min: 1, max: 5.5, standard: 1 },
  { min: 6, max: 12.5, standard: 2 },
  { min: 13, max: 19.5, standard: 3 },
  { min: 20, max: 26.5, standard: 4 },
  { min: 27, max: 33.5, standard: 5 },
  { min: 34, max: 40.5, standard: 6 },
  { min: 41, max: 44.5, standard: 7 },
  { min: 45, max: 47.5, standard: 8 },
  { min: 48, max: 49.5, standard: 9 },
  { min: 50, max: 50, standard: 10 },
];

export const dstsStandardForTotal = total =>
  DSTS_STANDARD_RANGES.find(range => total >= range.min && total <= range.max)?.standard ?? null;

export const dstsOverallStandard = totals => {
  const standards = totals.map(total => dstsStandardForTotal(Number(total)));
  if (standards.some(standard => standard === null)) return null;
  return standards.reduce((sum, standard) => sum + standard, 0) / standards.length;
};
