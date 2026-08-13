import { useMemo, useState } from 'react';
import Button from '../ui/Button';

export function RoleAssignmentDrawer({ users = [], roles = [], onSave, onRemoveRole }) {
  const [query, setQuery] = useState('');
  const [selectedUserId, setSelectedUserId] = useState(users[0]?.id ?? '');
  const [selectedRoles, setSelectedRoles] = useState([]);

  const filteredUsers = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return users;
    return users.filter(user => `${user.name} ${user.email}`.toLowerCase().includes(search));
  }, [query, users]);

  const currentUser = users.find(user => user.id === selectedUserId) ?? users[0];

  const toggleRole = (roleCode) => {
    setSelectedRoles(prev => {
      if (prev.includes(roleCode)) return prev.filter(code => code !== roleCode);
      return [...prev, roleCode];
    });
  };

  return (
    <div className="space-y-4 rounded-xl border border-surface-border bg-surface-card p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <input
          aria-label="Search user"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search user"
          className="h-9 w-full rounded-lg border border-surface-border bg-surface-bg px-3 text-sm text-text-primary outline-none focus:ring-2 focus:ring-brand-gold/40 md:max-w-xs"
        />
        <Button onClick={() => onSave?.(selectedUserId, selectedRoles)} size="sm">Save changes</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-[1fr_1.5fr]">
        <div className="space-y-2">
          {filteredUsers.map(user => (
            <button
              key={user.id}
              type="button"
              onClick={() => {
                setSelectedUserId(user.id);
                setSelectedRoles(user.roles || []);
              }}
              className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${selectedUserId === user.id ? 'border-brand-gold bg-brand-gold/10 text-brand-gold' : 'border-surface-border bg-surface-bg text-text-primary'}`}
            >
              {user.name}
            </button>
          ))}
        </div>

        <div className="space-y-3 rounded-xl border border-surface-border bg-surface-bg p-3">
          <p className="text-sm font-semibold text-text-primary">{currentUser?.name ?? 'Select a user'}</p>
          <div className="grid gap-2">
            {roles.map(role => {
              const isChecked = selectedRoles.includes(role.code);
              return (
                <label key={role.code} className="flex items-center justify-between gap-3 rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-sm">
                  <span>{role.name}</span>
                  <input type="checkbox" checked={isChecked} onChange={() => toggleRole(role.code)} />
                </label>
              );
            })}
          </div>
          {currentUser?.roles?.length > 0 && (
            <div className="space-y-2 pt-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Assigned roles</p>
              {currentUser.roles.map(roleCode => (
                <div key={roleCode} className="flex items-center justify-between rounded-lg border border-surface-border px-2 py-1 text-xs text-text-secondary">
                  <span>{roleCode}</span>
                  <button type="button" className="text-red-400" onClick={() => onRemoveRole?.(currentUser.id, roleCode)}>Remove</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
