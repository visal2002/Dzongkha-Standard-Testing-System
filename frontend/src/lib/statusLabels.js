// Presentation only: retain original API values for permissions and workflow decisions.
const labels = {
  pending_committee: 'Awaiting committee review',
  pending_chief_approval: 'Awaiting Chief of Examination approval',
  approved_pending_score_update: 'Approved — awaiting score update',
  payment_pending: 'Awaiting payment',
  payment_completed: 'Payment completed',
  initiated: 'Awaiting payment',
  revision_requested: 'Score revision requested',
  no_change: 'Completed — scores unchanged',
  waived: 'Fee waived',
  locked: 'Account locked',
  unknown: 'Not available',
};

export function humanizeStatus(status) {
  const value = String(status ?? '').trim().toLowerCase().replace(/[_-]+/g, '_');
  if (!value) return 'Not available';
  return labels[value] || value.replace(/_/g, ' ').replace(/\s+/g, ' ')
    .replace(/\b\w/g, character => character.toUpperCase());
}
