/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

/**
 * @fileoverview Chart aggregation helpers.
 * Dashboards and reports render trends and distributions that no single API returns
 * pre-aggregated, so the shaping happens here — once — against the real records the
 * services already fetch. Keeping it in one place means a chart can never quietly
 * fall back to a hand-written array of numbers.
 */

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** CEFR band colours, shared by every band chart so the legends agree. */
export const CEFR_BAND_COLORS = {
  C2: '#7C3AED',
  C1: '#3B82F6',
  B2: '#0D9488',
  B1: '#10B981',
  A2: '#F59E0B',
  A1: '#EF4444',
};

export const BAND_COLOR_FALLBACK = '#64748B';

const toDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const monthKey = (date) => `${date.getFullYear()}-${String(date.getMonth()).padStart(2, '0')}`;

/**
 * The last `count` calendar months ending with the current one, oldest first.
 * @param {number} count
 * @param {Date} [now]
 * @returns {Array<{key: string, month: string, year: number}>}
 */
export const recentMonths = (count, now = new Date()) => {
  const buckets = [];
  for (let offset = count - 1; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    buckets.push({ key: monthKey(date), month: MONTH_LABELS[date.getMonth()], year: date.getFullYear() });
  }
  return buckets;
};

/**
 * Bucket records into the last `months` calendar months and count how many fall into
 * each named series.
 *
 * @param {Array<object>} records
 * @param {object} options
 * @param {(record: object) => (string|Date|null)} options.dateOf - when the record happened
 * @param {Record<string, (record: object) => boolean>} options.series - one counter per chart series
 * @param {number} [options.months]
 * @param {Date} [options.now]
 * @returns {Array<Record<string, number|string>>} one row per month, oldest first
 */
export const monthlyCounts = (records, { dateOf, series, months = 6, now = new Date() }) => {
  const buckets = recentMonths(months, now);
  const seriesNames = Object.keys(series);
  const rows = new Map(
    buckets.map(bucket => [
      bucket.key,
      { month: bucket.month, ...Object.fromEntries(seriesNames.map(name => [name, 0])) },
    ]),
  );

  for (const record of records || []) {
    const date = toDate(dateOf(record));
    if (!date) continue;
    const row = rows.get(monthKey(date));
    if (!row) continue;
    for (const name of seriesNames) {
      if (series[name](record)) row[name] += 1;
    }
  }

  return [...rows.values()];
};

/**
 * Bucket records into the last `months` months and average a set of numeric fields
 * within each month. Months with no records carry `null` so the line breaks rather
 * than dropping to zero.
 *
 * @param {Array<object>} records
 * @param {object} options
 * @param {(record: object) => (string|Date|null)} options.dateOf
 * @param {Record<string, (record: object) => number|null|undefined>} options.metrics
 * @param {number} [options.months]
 * @param {Date} [options.now]
 */
export const monthlyAverages = (records, { dateOf, metrics, months = 6, now = new Date() }) => {
  const buckets = recentMonths(months, now);
  const metricNames = Object.keys(metrics);
  const totals = new Map(
    buckets.map(bucket => [
      bucket.key,
      { month: bucket.month, sums: Object.fromEntries(metricNames.map(name => [name, 0])), counts: Object.fromEntries(metricNames.map(name => [name, 0])) },
    ]),
  );

  for (const record of records || []) {
    const date = toDate(dateOf(record));
    if (!date) continue;
    const bucket = totals.get(monthKey(date));
    if (!bucket) continue;
    for (const name of metricNames) {
      const value = Number(metrics[name](record));
      if (!Number.isFinite(value) || value <= 0) continue;
      bucket.sums[name] += value;
      bucket.counts[name] += 1;
    }
  }

  return [...totals.values()].map(bucket => ({
    month: bucket.month,
    ...Object.fromEntries(metricNames.map(name => [
      name,
      bucket.counts[name] > 0 ? Number((bucket.sums[name] / bucket.counts[name]).toFixed(2)) : null,
    ])),
  }));
};

/**
 * Turn a `{ label: count }` map into the `{ name, value, color }` rows the pie charts
 * expect, dropping empty slices.
 * @param {Record<string, number>} counts
 * @param {Record<string, string>} [colors]
 */
export const toPieSlices = (counts, colors = {}) =>
  Object.entries(counts || {})
    .filter(([, value]) => Number(value) > 0)
    .map(([name, value]) => ({ name, value: Number(value), color: colors[name] || BAND_COLOR_FALLBACK }));

/** Whether a chart series has anything to draw. */
export const hasChartData = (rows, keys) =>
  Array.isArray(rows) && rows.some(row => keys.some(key => Number(row?.[key]) > 0));
