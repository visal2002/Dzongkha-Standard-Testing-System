export function formatLastLogin(value) {
  if (!value) return 'No login recorded';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No login recorded';
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Thimphu', day: '2-digit', month: 'short', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  }).format(date);
}

export default function LastLogin({ value }) {
  return <span title={value ? 'Bhutan Time (UTC+06:00)' : 'No successful login is recorded for this account'}>{formatLastLogin(value)}</span>;
}
