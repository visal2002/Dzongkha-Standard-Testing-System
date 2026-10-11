import { useState } from 'react';
import { KeyRound } from 'lucide-react';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { adminService } from '@/features/admin/api';

export default function ResetUserPassword({ user, initiallyOpen = false }) {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const valid = password.trim().length >= 12 && new TextEncoder().encode(password).length <= 72;
  const matches = password === confirmation;
  const reset = async () => {
    if (!user?.id || busy || !valid || !matches || !confirmed) return;
    setBusy(true); setError(''); setSuccess(false);
    try {
      await adminService.resetPassword(user.id, password);
      setPassword(''); setConfirmation(''); setConfirmed(false); setSuccess(true);
    } catch (requestError) {
      setError(requestError.message || 'Unable to reset the password. Please try again.');
    } finally { setBusy(false); }
  };
  return <details open={initiallyOpen ? true : undefined} className="col-span-full min-w-0 rounded-xl border border-surface-border bg-surface-bg p-3">
    <summary className="cursor-pointer text-sm font-semibold text-brand-gold">Reset password</summary>
    <div className="mt-3 space-y-3">
      <p className="text-xs text-text-muted">This resets only the password for {user?.name}. Profile details, roles, account status and Bhutan NDI login are unchanged.</p>
      <Input label="New password" aria-label="New password" type="password" autoComplete="new-password" required minLength={12} maxLength={72} disabled={busy} value={password} onChange={event => { setPassword(event.target.value); setSuccess(false); }} hint="At least 12 characters. Share it securely and ask the user to change it from their profile." />
      <Input label="Confirm new password" aria-label="Confirm new password" type="password" autoComplete="new-password" required maxLength={72} disabled={busy} value={confirmation} onChange={event => setConfirmation(event.target.value)} error={confirmation && !matches ? 'Passwords do not match.' : undefined} />
      {password && !valid && <p className="text-xs text-amber-400">Use at least 12 characters. Shorten the password if it contains many special characters.</p>}
      <p className="text-xs text-text-muted">Existing refresh sessions will be revoked. Current access tokens may remain valid for up to 15 minutes.</p>
      <label className="flex items-start gap-2 text-xs text-text-secondary"><input type="checkbox" className="mt-0.5" disabled={busy} checked={confirmed} onChange={event => setConfirmed(event.target.checked)} />I confirm that I want to reset this user's password.</label>
      {error && <p role="alert" className="text-xs text-red-400">{error}</p>}
      {success && <p role="status" className="text-xs text-emerald-400">Password reset successfully. Share the new password with the user securely.</p>}
      <Button type="button" variant="outline" icon={<KeyRound size={13} />} loading={busy} disabled={busy || !valid || !matches || !confirmed} onClick={reset}>Reset Password</Button>
    </div>
  </details>;
}
