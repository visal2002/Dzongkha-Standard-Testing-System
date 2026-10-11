import { useEffect, useState } from 'react';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { applicationService } from '@/features/registration/api';

export default function CitizenIdentityFields({ form, setForm }) {
  const [lookup, setLookup] = useState({ status: 'idle', message: '' });
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!/^\d{11}$/.test(form.cid)) {
      setLookup({ status: 'idle', message: '' });
      return;
    }
    let active = true;
    setLookup({ status: 'loading', message: 'Retrieving citizen information from DCRC…' });
    const timer = setTimeout(async () => {
      try {
        const profile = await applicationService.lookupCitizen(form.cid);
        if (!active) return;
        if (String(profile.cid) !== form.cid || !profile.fullName) throw new Error('Citizen record does not match this CID.');
        const gender = String(profile.gender || '').toLowerCase();
        const digits = String(profile.phone || '').replace(/\D/g, '');
        const contactNumber = digits.length === 8 ? digits : digits.length === 11 && digits.startsWith('975') ? digits.slice(3) : '';
        setForm(previous => previous.cid !== form.cid ? previous : {
          ...previous, name: profile.fullName, dateOfBirth: profile.dateOfBirth || '',
          gender: ['m', 'male'].includes(gender) ? 'Male' : ['f', 'female'].includes(gender) ? 'Female' : gender ? 'Other' : '',
          contactNumber,
        });
        setLookup({ status: 'success', message: 'Citizen information retrieved from DCRC.' });
      } catch {
        if (active) setLookup({ status: 'error', message: 'DCRC could not retrieve this CID. Retry or enter the full name manually.' });
      }
    }, 450);
    return () => { active = false; clearTimeout(timer); };
  }, [form.cid, retry, setForm]);

  return <>
    <div className="col-span-1 sm:col-span-2">
      <Input label="Citizenship ID (CID)" required value={form.cid} inputMode="numeric" maxLength={11} pattern="[0-9]{11}" placeholder="11-digit Citizenship ID (CID)"
        onChange={event => {
          setLookup({ status: 'idle', message: '' });
          setForm(previous => ({ ...previous, cid: event.target.value.replace(/\D/g, '').slice(0, 11), name: '', dateOfBirth: '', gender: '', contactNumber: '' }));
        }} />
      {lookup.message && <div role="status" aria-live="polite" className={`mt-2 text-xs ${lookup.status === 'error' ? 'text-amber-400' : 'text-text-secondary'}`}>
        {lookup.message}{lookup.status === 'error' && <Button size="sm" variant="ghost" onClick={() => setRetry(value => value + 1)}>Retry lookup</Button>}
      </div>}
    </div>
    <div className="col-span-1 sm:col-span-2"><Input label="Full Name" required value={form.name} readOnly={lookup.status === 'success' || lookup.status === 'loading'} onChange={event => setForm(previous => ({ ...previous, name: event.target.value }))} /></div>
    {lookup.status === 'success' && <div className="col-span-1 sm:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
      <Input label="Date of Birth" type="date" readOnly value={form.dateOfBirth || ''} />
      <Input label="Gender" readOnly value={form.gender || ''} />
      <Input label="Contact No." readOnly value={form.contactNumber || ''} />
    </div>}
  </>;
}
