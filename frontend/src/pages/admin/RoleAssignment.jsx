/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { UserCog } from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '@/components/ui/PageHeader';
import { RoleAssignmentDrawer } from '@/features/rbac/RoleAssignmentDrawer';
import { adminService } from '@/services/admin';
import { useApi } from '@/hooks/useApi';

export default function RoleAssignment() {
  const { data: usersData, loading: loadingUsers, setData: setUsers } = useApi(adminService.getUsers);
  const { data: rolesData, loading: loadingRoles } = useApi(adminService.getRoles);
  const users = usersData || [];
  const roles = rolesData || [];
  const loading = loadingUsers || loadingRoles;

  const applyRoles = async (userId, roleCodes) => {
    try {
      const updated = await adminService.updateUser(userId, { roleCodes });
      setUsers(previous => previous.map(user => user.id === userId ? updated : user));
      return updated;
    } catch (error) {
      toast.error(error?.message || 'Failed to update role assignment.');
      throw error;
    }
  };

  const handleSave = async (userId, roleCodes) => {
    if (!userId) return;
    await applyRoles(userId, roleCodes);
    toast.success('Role assignment saved.');
  };

  const handleRemoveRole = async (userId, roleCode) => {
    const target = users.find(user => user.id === userId);
    if (!target) return;
    const remaining = (target.roles || []).filter(code => code !== roleCode);
    await applyRoles(userId, remaining);
    toast.success('Role removed.');
  };

  return <div className="space-y-6">
    <PageHeader
      title="Role Assignment"
      subtitle="Assign one or more roles to a user — BRD §6.1, §4"
      breadcrumbs={[{ label: 'Administration' }, { label: 'Role Assignment' }]}
      icon={<UserCog size={18} />}
    />
    {loading ? (
      <div className="flex h-48 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-gold border-t-transparent" /></div>
    ) : (
      <RoleAssignmentDrawer users={users} roles={roles} onSave={handleSave} onRemoveRole={handleRemoveRole} />
    )}
  </div>;
}
