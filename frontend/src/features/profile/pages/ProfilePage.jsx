/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, CreditCard, GraduationCap, Shield, Phone, Lock, Save, Edit2, X, Camera } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { authService } from '@/features/auth/api';
import toast from 'react-hot-toast';

function InfoRow({ icon: Icon, label, value, placeholder = '—' }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-surface-border last:border-0">
      <div className="w-8 h-8 rounded-lg bg-surface-elevated flex items-center justify-center shrink-0 mt-0.5">
        <Icon size={15} className="text-text-muted" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-text-muted uppercase tracking-wider mb-0.5">{label}</p>
        <p className="text-sm text-text-primary font-medium">{value || placeholder}</p>
      </div>
    </div>
  );
}

const QUALIFICATION_LEVELS = ['Below Class X', 'Class X', 'Class XII', 'Certificate', 'Diploma', "Bachelor's Degree", "Master's Degree", 'Doctorate', 'Other'];

function EditProfileForm({ user, onSave, onCancel, emailRequired }) {
  // Don't prefill the CID-derived placeholder address - the user must type a real one.
  const [email, setEmail] = useState(user.emailSet ? (user.email || '') : '');
  const [phone, setPhone] = useState(user.phone || user.contactNumber || '');
  const [qualification, setQualification] = useState(user.education || '');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return toast.error('Email address is required.');
    setLoading(true);
    try {
      await onSave({
        email: email.trim(),
        phone: phone.trim(),
        contactNumber: phone.trim(),
        education: qualification,
      });
      toast.success('Profile updated successfully.');
    } catch {
      toast.error('Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "w-full h-10 px-3 rounded-lg border border-surface-border bg-surface-bg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-gold/40 focus:border-brand-gold transition-colors";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-text-muted mb-1.5 font-medium">Full Name</label>
          <input value={user.name || ''} readOnly disabled className={`${inputCls} opacity-60 cursor-not-allowed`} />
          <p className="mt-1 text-[10px] text-text-muted">Your name is fixed and cannot be changed here.</p>
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-1.5 font-medium">Email Address <span className="text-red-400">*</span></label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={inputCls} placeholder="you@example.com" required />
          {emailRequired && <p className="mt-1 text-[10px] text-rose-400">Enter your email address to unlock the rest of the system.</p>}
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-1.5 font-medium">Contact Number (Phone)</label>
          <input value={phone} onChange={e => setPhone(e.target.value)} type="tel" placeholder="8-digit mobile number" className={inputCls} />
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-1.5 font-medium">Qualification</label>
          <select value={qualification} onChange={e => setQualification(e.target.value)} className={inputCls}>
            <option value="">Select highest qualification</option>
            {QUALIFICATION_LEVELS.map(level => <option key={level} value={level}>{level}</option>)}
          </select>
        </div>
      </div>
      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-gold text-white text-sm font-medium hover:bg-brand-gold-dark transition-colors disabled:opacity-60"
        >
          <Save size={14} />
          {loading ? 'Saving…' : 'Save Changes'}
        </button>
        {!emailRequired && (
          <button type="button" onClick={onCancel} className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-surface-border text-text-secondary text-sm hover:bg-surface-border/60 transition-colors">
            <X size={14} /> Cancel
          </button>
        )}
      </div>
    </form>
  );
}

function ChangePasswordForm({ onClose }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (next !== confirm) return toast.error('New passwords do not match.');
    if (next.length < 8) return toast.error('Password must be at least 8 characters.');
    setLoading(true);
    try {
      const result = await authService.changePassword(current, next);
      if (result && result.success === false) {
        toast.error(result.error || 'Failed to change password.');
        return;
      }
      toast.success('Password changed successfully.');
      onClose();
    } catch (err) {
      toast.error(err?.message || 'Failed to change password.');
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "w-full h-10 px-3 rounded-lg border border-surface-border bg-surface-bg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-gold/40 focus:border-brand-gold transition-colors";

  return (
    <form onSubmit={handleSubmit} className="space-y-3 mt-4">
      <div>
        <label className="block text-xs text-text-muted mb-1.5 font-medium">Current Password</label>
        <input type="password" value={current} onChange={e => setCurrent(e.target.value)} required className={inputCls} />
      </div>
      <div>
        <label className="block text-xs text-text-muted mb-1.5 font-medium">New Password</label>
        <input type="password" value={next} onChange={e => setNext(e.target.value)} required className={inputCls} />
      </div>
      <div>
        <label className="block text-xs text-text-muted mb-1.5 font-medium">Confirm New Password</label>
        <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required className={inputCls} />
      </div>
      <div className="flex gap-2 pt-1">
        <button type="submit" disabled={loading} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-gold text-white text-sm font-medium hover:bg-brand-gold-dark disabled:opacity-60 transition-colors">
          <Lock size={14} /> {loading ? 'Saving…' : 'Update Password'}
        </button>
        <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-surface-border text-text-secondary text-sm hover:bg-surface-border/60 transition-colors">
          Cancel
        </button>
      </div>
    </form>
  );
}

function CreatePasswordForm({ onDone }) {
  const { setPassword } = useAuth();
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (next.length < 8) return toast.error('Password must be at least 8 characters.');
    if (next !== confirm) return toast.error('The passwords do not match.');
    setLoading(true);
    try {
      await setPassword(next);
      toast.success('Password created. You can now sign in with it.');
      onDone?.();
    } catch (err) {
      toast.error(err?.message || 'Failed to create the password.');
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "w-full h-10 px-3 rounded-lg border border-surface-border bg-surface-bg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-gold/40 focus:border-brand-gold transition-colors";

  return (
    <form onSubmit={handleSubmit} className="space-y-3 mt-4">
      <div>
        <label className="block text-xs text-text-muted mb-1.5 font-medium">New Password</label>
        <input type="password" value={next} onChange={e => setNext(e.target.value)} required minLength={8} placeholder="At least 8 characters" className={inputCls} />
      </div>
      <div>
        <label className="block text-xs text-text-muted mb-1.5 font-medium">Confirm Password</label>
        <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required minLength={8} className={inputCls} />
      </div>
      <button type="submit" disabled={loading} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-gold text-white text-sm font-medium hover:bg-brand-gold-dark disabled:opacity-60 transition-colors">
        <Lock size={14} /> {loading ? 'Saving…' : 'Create Password'}
      </button>
    </form>
  );
}

export default function ProfilePage() {
  const { user, updateProfile } = useAuth();
  const isTestTaker = user?.role === 'test_taker';
  const needsPassportPhoto = isTestTaker && !user?.photo;
  const needsPassword = isTestTaker && !user?.passwordSet;
  const needsEmail = isTestTaker && !user?.emailSet;

  const [editing, setEditing] = useState(needsEmail);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [savingPhoto, setSavingPhoto] = useState(false);

  // Keep the edit form open while an email is still required.
  useEffect(() => {
    if (needsEmail) setEditing(true);
  }, [needsEmail]);

  const handleSave = async (fields) => {
    await updateProfile(fields);
    setEditing(false);
  };

  // Passport-size photo: mandatory for Test Takers before the rest of the app unlocks.
  const handlePassportUpload = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast.error('The passport photo must be an image file.');
    if (file.size > 3 * 1024 * 1024) return toast.error('The passport photo must be 3 MB or smaller.');
    setSavingPhoto(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = String(ev.target?.result || '');
      try {
        await updateProfile({ photo: dataUrl, avatar: user?.avatar || dataUrl });
        toast.success(needsPassportPhoto ? 'Passport photo saved — you now have full access.' : 'Passport photo updated.');
      } catch {
        toast.error('Failed to save the passport photo.');
      } finally {
        setSavingPhoto(false);
      }
    };
    reader.onerror = () => { toast.error('Could not read the selected photo.'); setSavingPhoto(false); };
    reader.readAsDataURL(file);
  };

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  const avatarColors = ['#F59E0B', '#0D9488', '#3B82F6', '#8B5CF6'];
  const avatarColor = user?.name ? avatarColors[user.name.charCodeAt(0) % avatarColors.length] : '#F59E0B';

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-text-primary">My Profile</h1>
        <p className="text-sm text-text-muted">View and manage your account information</p>
      </div>

      {(needsPassportPhoto || needsPassword || needsEmail) && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3">
          <p className="text-sm font-semibold text-rose-400">Finish setting up your account</p>
          <p className="text-xs text-rose-300/90 mt-0.5">
            Complete the following to unlock registration and the rest of the system:
          </p>
          <ul className="mt-1.5 text-xs text-rose-300/90 list-disc list-inside space-y-0.5">
            {needsEmail && <li>Enter your <strong>email address</strong> (Account Information &rarr; below).</li>}
            {needsPassword && <li>Create a <strong>password</strong> (Security section &rarr; below).</li>}
            {needsPassportPhoto && <li>Upload your <strong>passport-size photo</strong>.</li>}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Avatar card */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-1 bg-surface-card border border-surface-border rounded-xl p-6 flex flex-col items-center justify-center gap-4 text-center"
        >
          {/* Updated Avatar display to show uploaded image if available */}
          {(user?.avatar || user?.photo) ? (
            <img src={user.avatar || user.photo} alt="Profile" className="w-20 h-20 rounded-full object-cover" />
          ) : (
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-black shadow-lg"
              style={{ backgroundColor: avatarColor }}
            >
              {initials}
            </div>
          )}
          <label className="mt-2 flex items-center gap-1 text-sm text-brand-gold cursor-pointer">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = async (ev) => {
                  const dataUrl = ev.target?.result;
                  try {
                    await authService.uploadProfilePicture(dataUrl);
                    await updateProfile({ avatar: dataUrl });
                    toast.success('Profile picture updated successfully!');
                  } catch (err) {
                    toast.error('Failed to upload profile picture');
                  }
                };
                reader.readAsDataURL(file);
              }}
            />
            <Camera size={16} className="text-brand-gold" /> Change Photo
          </label>

          {isTestTaker && (
            <label
              className={`flex items-center gap-1.5 text-sm cursor-pointer rounded-lg px-3 py-1.5 border transition-colors ${
                needsPassportPhoto
                  ? 'border-rose-500/40 text-rose-400 bg-rose-500/10 hover:bg-rose-500/15 font-semibold'
                  : 'border-surface-border text-text-secondary hover:bg-surface-border/60'
              }`}
            >
              <input type="file" accept="image/*" className="hidden" disabled={savingPhoto} onChange={handlePassportUpload} />
              <Camera size={14} />
              {savingPhoto ? 'Saving…' : needsPassportPhoto ? 'Upload passport-size photo (required)' : 'Replace passport-size photo'}
            </label>
          )}

          <div className="text-center">
            <p className="text-sm font-bold text-text-primary">{user?.name}</p>
            <span className="inline-flex items-center gap-1 mt-1 text-[10px] px-2 py-0.5 rounded-full bg-brand-gold/15 text-brand-gold border border-brand-gold/30 font-medium">
              {user?.roleName}
            </span>
          </div>
          {user?.education && (
            <p className="text-[11px] text-text-muted text-center leading-relaxed">{user.education}</p>
          )}
        </motion.div>

        {/* Info card */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="lg:col-span-2 bg-surface-card border border-surface-border rounded-xl p-6 flex flex-col gap-0"
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-text-primary">Account Information</h2>
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-1.5 text-xs text-brand-gold hover:text-brand-gold-light transition-colors font-medium"
              >
                <Edit2 size={12} /> Edit
              </button>
            )}
          </div>

          {editing ? (
            <EditProfileForm user={user} onSave={handleSave} onCancel={() => setEditing(false)} emailRequired={needsEmail} />
          ) : (
            <>
              <InfoRow icon={User}       label="Full Name"     value={user?.name} />
              <InfoRow icon={Mail}       label="Email"         value={needsEmail ? null : user?.email} placeholder="Not set" />
              <InfoRow icon={CreditCard} label="User ID"       value={user?.userId} placeholder="Not assigned" />
              <InfoRow icon={CreditCard} label="CID"           value={user?.cid} placeholder="Not set" />
              <InfoRow icon={Phone}      label="Contact"       value={user?.phone || user?.contactNumber} placeholder="Not set" />
              <InfoRow icon={GraduationCap} label="Qualification" value={user?.education} placeholder="Not set" />
              <InfoRow icon={Shield}     label="Role"          value={user?.roleName} />
            </>
          )}
        </motion.div>
      </div>

      {/* Security card */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-surface-card border border-surface-border rounded-xl p-5"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-text-primary">Security</h2>
            <p className="text-xs text-text-muted mt-0.5">
              {needsPassword ? 'Your account has no password yet — create one to continue.' : 'Manage your password and authentication settings'}
            </p>
          </div>
          {!needsPassword && !showPasswordForm && (
            <button
              onClick={() => setShowPasswordForm(true)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-surface-border text-text-secondary hover:bg-surface-border/60 transition-colors font-medium"
            >
              <Lock size={12} /> Change Password
            </button>
          )}
        </div>

        {needsPassword
          ? <CreatePasswordForm />
          : showPasswordForm && <ChangePasswordForm onClose={() => setShowPasswordForm(false)} />}
      </motion.div>
    </div>
  );
}
