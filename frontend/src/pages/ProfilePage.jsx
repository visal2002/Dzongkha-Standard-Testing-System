/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, CreditCard, Building2, Shield, Phone, Lock, Save, Edit2, X, Camera } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { authService } from '@/services/auth';
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

function EditProfileForm({ user, onSave, onCancel }) {
  const [name, setName] = useState(user.name || '');
  const [email, setEmail] = useState(user.email || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [department, setDepartment] = useState(user.department || '');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return toast.error('Name is required.');
    if (!email.trim()) return toast.error('Email address is required.');
    setLoading(true);
    try {
      await onSave({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        department: department.trim()
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
          <input value={name} onChange={e => setName(e.target.value)} className={inputCls} required />
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-1.5 font-medium">Email Address</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={inputCls} required />
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-1.5 font-medium font-medium">Contact Number (Phone)</label>
          <input value={phone} onChange={e => setPhone(e.target.value)} type="tel" placeholder="+975-17XXXXXX" className={inputCls} />
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-1.5 font-medium">Department / Division</label>
          <input value={department} onChange={e => setDepartment(e.target.value)} placeholder="e.g. Department of Culture and Dzongkha Development" className={inputCls} />
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
        <button type="button" onClick={onCancel} className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-surface-border text-text-secondary text-sm hover:bg-surface-border/60 transition-colors">
          <X size={14} /> Cancel
        </button>
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
      await authService.changePassword(current, next);
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

export default function ProfilePage() {
  const { user, updateProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  const handleSave = async (fields) => {
    await updateProfile(fields);
    setEditing(false);
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Avatar card */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-1 bg-surface-card border border-surface-border rounded-xl p-6 flex flex-col items-center justify-center gap-4 text-center"
        >
          {/* Updated Avatar display to show uploaded image if available */}
          {user?.avatar ? (
            <img src={user.avatar} alt="Profile" className="w-20 h-20 rounded-full object-cover" />
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
          <div className="text-center">
            <p className="text-sm font-bold text-text-primary">{user?.name}</p>
            <span className="inline-flex items-center gap-1 mt-1 text-[10px] px-2 py-0.5 rounded-full bg-brand-gold/15 text-brand-gold border border-brand-gold/30 font-medium">
              {user?.roleName}
            </span>
          </div>
          {user?.department && (
            <p className="text-[11px] text-text-muted text-center leading-relaxed">{user.department}</p>
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
            <EditProfileForm user={user} onSave={handleSave} onCancel={() => setEditing(false)} />
          ) : (
            <>
              <InfoRow icon={User}       label="Full Name"    value={user?.name} />
              <InfoRow icon={Mail}       label="Email"        value={user?.email} />
              <InfoRow icon={CreditCard} label="User ID"        value={user?.cid} />
              <InfoRow icon={Phone}      label="Contact"      value={user?.phone} placeholder="Not set" />
              <InfoRow icon={Building2}  label="Department"   value={user?.department} placeholder="Not assigned" />
              <InfoRow icon={Shield}     label="Role"         value={user?.roleName} />
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
            <p className="text-xs text-text-muted mt-0.5">Manage your password and authentication settings</p>
          </div>
          {!showPasswordForm && (
            <button
              onClick={() => setShowPasswordForm(true)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-surface-border text-text-secondary hover:bg-surface-border/60 transition-colors font-medium"
            >
              <Lock size={12} /> Change Password
            </button>
          )}
        </div>

        {showPasswordForm && <ChangePasswordForm onClose={() => setShowPasswordForm(false)} />}
      </motion.div>
    </div>
  );
}
