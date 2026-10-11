// Presentation only: never use these references as database keys or API parameters.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function shortReference(id, prefix = 'APP') {
  if (!id) return '—';
  const value = String(id);
  // Existing human-readable identifiers (including DSTS numbers) stay unchanged.
  return UUID.test(value) ? `${prefix}-${value.slice(0, 8).toUpperCase()}` : value;
}

export function shortReferences(ids, prefix) {
  const unique = [...new Set(ids.filter(Boolean).map(String))];
  const compact = id => id.replace(/-/g, '').toUpperCase();
  return Object.fromEntries(unique.map(id => {
    if (!UUID.test(id)) return [id, id];
    const value = compact(id);
    let length = 8;
    while (length < value.length && unique.some(other => other !== id && UUID.test(other) && compact(other).slice(0, length) === value.slice(0, length))) length += 2;
    return [id, `${prefix}-${value.slice(0, length)}`];
  }));
}

export function referenceSearch(id, prefix = 'APP', ids = []) {
  return `${shortReferences([...ids, id], prefix)[id] || shortReference(id, prefix)} ${id || ''}`;
}
