const timestamp = value => {
  if (!value) return -Infinity;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : -Infinity;
};

// Sort a copy, so schedule edits and API state are never mutated by rendering.
export const sortWindowsLatestFirst = (windows = []) => [...windows].sort((a, b) => {
  for (const field of ['examDate', 'createdAt']) {
    const left = timestamp(a[field]), right = timestamp(b[field]);
    if (left !== right) return left > right ? -1 : 1;
  }
  return String(a.id ?? '').localeCompare(String(b.id ?? ''));
});
