// Small display helpers shared across components.

const gbp0 = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  maximumFractionDigits: 0,
});

export const formatGBP = (n: number): string => gbp0.format(Math.round(n));

export const formatPercent = (fraction: number, dp = 0): string =>
  `${(fraction * 100).toFixed(dp)}%`;
