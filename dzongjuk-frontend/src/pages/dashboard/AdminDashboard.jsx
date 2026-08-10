import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Users, Shield, Settings, Activity, ArrowRight, TrendingUp, Server, Database, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { StatCard } from '../../components/ui/Card';
import { StatusBadge } from '../../components/ui/Badge';
import { adminService } from '../../services/admin';
import { useApi } from '../../hooks/useApi';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const roleData = [
  { name: 'Admin', users: 1 },
  { name: 'DCDD', users: 3 },
  { name: 'Exam Head', users: 1 },
  { name: 'Committee', users: 6 },
  { name: 'Chief Exec', users: 1 },
  { name: 'Test Takers', users: 500 },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface-card border border-surface-border rounded-xl p-3 shadow-xl text-xs">
      <p className="font-medium text-text-primary">{label}: {payload[0]?.value}</p>
    </div>
  );
};

export default function AdminDashboard() {
  const { user } = useAuth();
  const { data: systemUsers, loading: loadingUsers, error: usersError } = useApi(adminService.getUsers);
  const { data: systemRoles, loading: loadingRoles } = useApi(adminService.getRoles);

  const isLoading = loadingUsers || loadingRoles;

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden bg-gradient-to-r from-[#2D1B69] via-[#1B2A4A] to-[#1B2A4A] border border-purple-900/30 rounded-2xl p-6"
      >
        <div className="absolute right-0 top-0 w-48 h-48 bg-purple-500/5 rounded-full -translate-y-1/2 translate-x-1/4 blur-2xl" />
        <div className="relative">
          <p className="text-xs text-purple-400 font-medium uppercase tracking-wider mb-1">System Administration</p>
          <h1 className="text-xl font-bold text-white mb-1">Welcome, {user?.name?.split(' ')[0]}!</h1>
          <p className="text-sm text-[#94A3C8]">System health is optimal. All services running normally.</p>
          <div className="flex items-center gap-4 mt-3 text-xs text-[#94A3C8]">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400" />API: Online</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400" />DB: Connected</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400" />NDI: Active</span>
          </div>
        </div>
      </motion.div>

      {/* Error State */}
      {usersError && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
          <AlertCircle size={16} className="text-red-400 mt-0.5 shrink-0" />
          <div>
            <h4 className="text-sm font-semibold text-red-400 mb-1">Failed to load dashboard data</h4>
            <p className="text-xs text-text-muted">{usersError}</p>
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Users" value={isLoading ? '...' : systemUsers?.length || 0} icon={<Users size={18} />} color="purple" />
        <StatCard title="System Roles" value={isLoading ? '...' : systemRoles?.length || 0} icon={<Shield size={18} />} color="info" />
        <StatCard title="System Status" value="100%" icon={<Activity size={18} />} color="success" subtitle="Uptime" />
        <StatCard title="Security Rating" value="A+" icon={<CheckCircle size={18} />} color="gold" subtitle="Hardened" />
      </div>

      <div className="grid grid-cols-1 gap-4">
        {/* User distribution */}
        <div className="bg-surface-card border border-surface-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-1">Users by Role</h3>
          <p className="text-xs text-text-muted mb-4">Distribution across all system roles</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={roleData} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-surface-border)" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="users" fill="#F59E0B" radius={[4, 4, 0, 0]} name="Users" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Infrastructure & Quick Access */}
        <div className="bg-surface-card border border-surface-border rounded-xl p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-text-primary mb-1">Infrastructure Health</h3>
            <p className="text-xs text-text-muted mb-4">Core services status monitoring</p>
            <div className="space-y-3">
              {[
                { name: 'Identity & Auth Gateway (NDI)', status: 'Operational', latency: '24ms' },
                { name: 'PostgreSQL Database Engine', status: 'Operational', latency: '4ms' },
                { name: 'File Storage & Encrypted Bucket', status: 'Operational', latency: '18ms' },
                { name: 'SMS & Email Notification Queue', status: 'Operational', latency: '12ms' },
              ].map(s => (
                <div key={s.name} className="flex items-center justify-between p-2.5 bg-surface-bg border border-surface-border rounded-lg text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span className="font-medium text-text-primary">{s.name}</span>
                  </div>
                  <span className="text-text-muted font-mono">{s.latency}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="pt-4 border-t border-surface-border mt-4 flex justify-end">
            <Link to="/admin/technical" className="text-xs font-semibold text-brand-gold hover:underline flex items-center gap-1">
              Technical Settings <ArrowRight size={12} />
            </Link>
          </div>
        </div>
      </div>

      {/* System Users table */}
      <div className="bg-surface-card border border-surface-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-text-primary">System Users</h3>
          <Link to="/admin/users" className="text-xs text-brand-gold hover:text-[#FCD34D] flex items-center gap-1">Manage <ArrowRight size={12} /></Link>
        </div>
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="py-8 flex justify-center"><div className="w-6 h-6 border-2 border-brand-gold border-t-transparent rounded-full animate-spin" /></div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-surface-border">
                  {['User', 'Role', 'CID', 'Status', 'Last Login'].map(h => (
                    <th key={h} className="pb-2 text-left font-medium text-text-muted pr-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {systemUsers?.map(u => (
                  <tr key={u.id} className="border-b border-surface-border/40 hover:bg-surface-bg transition-colors">
                    <td className="py-2.5 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-brand-gold/10 flex items-center justify-center text-brand-gold font-bold text-[10px]">{u.name[0]}</div>
                        <span className="font-medium text-text-primary truncate max-w-28">{u.name}</span>
                      </div>
                    </td>
                    <td className="py-2.5 pr-4 text-text-secondary">{u.role}</td>
                    <td className="py-2.5 pr-4 text-text-muted font-mono">{u.cid}</td>
                    <td className="py-2.5 pr-4"><StatusBadge status={u.status} /></td>
                    <td className="py-2.5 text-text-muted">{new Date(u.lastLogin).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
