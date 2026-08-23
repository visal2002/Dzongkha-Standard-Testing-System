import { useMemo, useState } from 'react';

const MODULES = [
  'Registration',
  'Verification',
  'Absentee',
  'Question Paper',
  'Band Scores',
  'Appeal',
  'Certificate',
  'Reports',
  'Users',
  'Roles',
  'Permissions',
];

const ACTIONS = ['View', 'Create', 'Update', 'Delete', 'Approve', 'Export'];

const initialPermissions = () => {
  const base = {};
  for (const module of MODULES) {
    base[module] = {
      View: false,
      Create: false,
      Update: false,
      Delete: false,
      Approve: false,
      Export: false,
    };
  }
  return base;
};

export function PermissionMatrix({ value, onSave }) {
  const [permissions, setPermissions] = useState(value || initialPermissions());

  const rows = useMemo(() => MODULES, []);

  const togglePermission = (module, action) => {
    setPermissions(prev => ({
      ...prev,
      [module]: {
        ...prev[module],
        [action]: !prev[module][action],
      },
    }));
  };

  return (
    <div className="space-y-4 rounded-xl border border-surface-border bg-surface-card p-4">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr>
              <th className="pr-4 pb-3 text-xs font-semibold uppercase tracking-wide text-text-muted">Module</th>
              {ACTIONS.map(action => (
                <th key={action} className="px-3 pb-3 text-center text-xs font-semibold uppercase tracking-wide text-text-muted">{action}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(module => (
              <tr key={module} className="border-t border-surface-border">
                <td className="py-3 pr-4 font-medium text-text-primary">{module}</td>
                {ACTIONS.map(action => (
                  <td key={`${module}-${action}`} className="px-3 py-3 text-center">
                    <input
                      aria-label={`${module} ${action}`}
                      type="checkbox"
                      checked={Boolean(permissions[module]?.[action])}
                      onChange={() => togglePermission(module, action)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => onSave?.(permissions)}
          className="rounded-lg bg-brand-gold px-4 py-2 text-sm font-semibold text-white"
        >
          Save Matrix
        </button>
      </div>
    </div>
  );
}
