import { ReportDataset } from './entities';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Format downloadable artifacts only; query filters, projections and database IDs remain intact. */
export function displayReportReferences(dataset: ReportDataset, rows: Record<string, unknown>[]) {
  const prefixFor = (field: string) => field === 'applicationId' ? 'APP'
    : field === 'appealId' ? 'RE'
      : field === 'resourceId' && dataset === ReportDataset.Applications ? 'APP'
        : field === 'resourceId' && dataset === ReportDataset.Appeals ? 'RE' : null;
  const idsByPrefix = new Map<string, Set<string>>();
  for (const row of rows) for (const [field, value] of Object.entries(row)) {
    const prefix = prefixFor(field);
    if (prefix && typeof value === 'string' && uuid.test(value)) {
      if (!idsByPrefix.has(prefix)) idsByPrefix.set(prefix, new Set());
      idsByPrefix.get(prefix)!.add(value);
    }
  }
  return rows.map(row => Object.fromEntries(Object.entries(row).map(([field, value]) => {
    const prefix = prefixFor(field);
    if (!prefix || typeof value !== 'string' || !uuid.test(value)) return [field, value];
    const compact = value.replace(/-/g, '').toUpperCase();
    let length = 8;
    while (length < compact.length && [...idsByPrefix.get(prefix)!].some(other => other !== value && other.replace(/-/g, '').toUpperCase().slice(0, length) === compact.slice(0, length))) length += 2;
    return [field, `${prefix}-${compact.slice(0, length)}`];
  })));
}
