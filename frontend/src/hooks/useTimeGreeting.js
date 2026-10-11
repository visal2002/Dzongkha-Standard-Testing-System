import { useEffect, useState } from 'react';

const bhutanHour = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Thimphu', hour: 'numeric', hourCycle: 'h23',
});

export function getTimeGreeting(now = new Date()) {
  const hour = Number(bhutanHour.format(now));
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function useTimeGreeting() {
  const [greeting, setGreeting] = useState(() => getTimeGreeting());
  useEffect(() => {
    const update = () => setGreeting(getTimeGreeting());
    const timer = window.setInterval(update, 30_000);
    window.addEventListener('focus', update);
    document.addEventListener('visibilitychange', update);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', update);
      document.removeEventListener('visibilitychange', update);
    };
  }, []);
  return greeting;
}
