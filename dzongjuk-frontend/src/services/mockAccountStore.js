const MOCK_ACCOUNTS_KEY = 'dsts_mock_accounts';
const LEGACY_REGISTRATIONS_KEY = 'dsts_mock_registrations';

export function readMockAccounts() {
  try {
    const accounts = JSON.parse(globalThis.localStorage?.getItem(MOCK_ACCOUNTS_KEY) || '[]');
    const legacyAccounts = JSON.parse(globalThis.localStorage?.getItem(LEGACY_REGISTRATIONS_KEY) || '[]');
    const accountIds = new Set(accounts.map(account => account.user.id));
    return [...accounts, ...legacyAccounts.filter(account => !accountIds.has(account.user.id))];
  } catch {
    return [];
  }
}

function writeMockAccounts(accounts) {
  globalThis.localStorage?.setItem(MOCK_ACCOUNTS_KEY, JSON.stringify(accounts));
}

export async function hashMockPassword(password, salt) {
  const bytes = new TextEncoder().encode(`${salt}:${password}`);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function saveMockAccount(user, password) {
  const accounts = readMockAccounts();
  const duplicate = accounts.find(account => account.user.id !== user.id && (
    account.user.email.toLowerCase() === user.email.toLowerCase() || account.user.cid.toLowerCase() === user.cid.toLowerCase()
  ));
  if (duplicate) throw new Error('An account already exists for this email or CID.');
  const passwordSalt = globalThis.crypto.randomUUID();
  const passwordHash = await hashMockPassword(password, passwordSalt);
  const record = { user, passwordSalt, passwordHash };
  writeMockAccounts([...accounts.filter(account => account.user.id !== user.id), record]);
  return record;
}

export function updateMockAccount(id, userChanges) {
  writeMockAccounts(readMockAccounts().map(account => account.user.id === id
    ? { ...account, user: { ...account.user, ...userChanges } }
    : account));
}

export function deleteMockAccount(id) {
  writeMockAccounts(readMockAccounts().filter(account => account.user.id !== id));
}

export async function authenticateMockAccount(identifier, password) {
  const normalized = identifier.trim().toLowerCase();
  const account = readMockAccounts().find(record =>
    record.user.email.toLowerCase() === normalized || record.user.cid.toLowerCase() === normalized,
  );
  if (!account || ['inactive', 'DISABLED'].includes(account.user.status)) return null;
  return await hashMockPassword(password, account.passwordSalt) === account.passwordHash ? account.user : null;
}
