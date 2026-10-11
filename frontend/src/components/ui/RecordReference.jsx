import { shortReference, shortReferences } from '@/lib/recordReferences';

export default function RecordReference({ id, prefix = 'APP', ids = [], className }) {
  const label = prefix === 'RE' ? 'request' : 'application';
  const reference = shortReferences([...ids, id], prefix)[id] || shortReference(id, prefix);
  return <span className={className} title={id ? `Full ${label} ID: ${id}` : undefined}>{reference}</span>;
}
