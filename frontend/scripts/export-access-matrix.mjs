/**
 * Emits the approved access matrix as JSON so the backend can enforce exactly the
 * same rules the frontend does. `src/features/rbac/accessMatrix.js` is the single source
 * of truth; this script never restates a permission, it only serialises it.
 *
 *   npm run export:access-matrix
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const { ACCESS_MATRIX, ACCESS_MODULES, MATRIX_ROLES, ROLE_LABELS, SUPPLEMENTARY_ROLES, getAccessLevel } =
  await import(pathToFileURL(resolve(here, '../src/features/rbac/accessMatrix.js')).href);

const roles = [...MATRIX_ROLES, ...SUPPLEMENTARY_ROLES];

const payload = {
  $comment: 'Generated from frontend/src/features/rbac/accessMatrix.js. Do not edit by hand.',
  generatedAt: new Date().toISOString().slice(0, 10),
  actions: {
    read_all: 'Read records belonging to any user.',
    read_own: 'Read only records belonging to the requesting user.',
    create: 'Create a record on behalf of anyone.',
    create_own: 'Create a record owned by the requesting user.',
    update: 'Modify an existing record.',
    delete: 'Remove a record.',
    manage: 'Perform administrative operations on the module.',
    submit: 'Submit band scores for any candidate.',
    submit_own: 'Submit a request concerning the requesting user only.',
    process: 'Advance a re-evaluation through its approval step.',
    sample: 'Read published sample papers only.',
  },
  modules: ACCESS_MODULES,
  roles: roles.map(role => ({ key: role, label: ROLE_LABELS[role], inApprovedMatrix: MATRIX_ROLES.includes(role) })),
  matrix: Object.fromEntries(roles.map(role => [
    role,
    Object.fromEntries(ACCESS_MODULES.map(module => [module.key, getAccessLevel(role, module.key)])),
  ])),
};

const target = resolve(here, '../../docs/rbac/access-matrix.json');
mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
console.log(`Wrote ${target}`);
