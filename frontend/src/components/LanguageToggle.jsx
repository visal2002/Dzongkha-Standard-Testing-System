/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { useTranslation } from 'react-i18next';

const LANGS = [
  { code: 'en', short: 'EN' },
  { code: 'dz', short: 'རྫ' },
];

/**
 * App-wide English / Dzongkha switch. Writes through i18next, which persists the
 * choice to localStorage ('dsts_language') so every screen and future visit
 * follows it.
 *
 * `tone="dark"`    — light text on a dark/glass surface (public HomePage header).
 * `tone="surface"` — themed, sits next to the in-app header controls.
 */
export default function LanguageToggle({ tone = 'surface', className = '' }) {
  const { i18n, t } = useTranslation();
  const current = i18n.resolvedLanguage || i18n.language || 'en';
  const active = current.startsWith('dz') ? 'dz' : 'en';

  const setLang = (code) => {
    if (code !== active) i18n.changeLanguage(code);
  };

  const wrap =
    tone === 'dark'
      ? 'border-brand-gold-light/40 bg-[#0d1425]/50 backdrop-blur-sm'
      : 'border-surface-border bg-surface-bg';

  const btn = (isActive) => {
    if (tone === 'dark') {
      return isActive ? 'bg-brand-gold-light/20 text-white' : 'text-gray-300 hover:text-white';
    }
    return isActive
      ? 'bg-surface-card text-text-primary shadow-sm'
      : 'text-text-muted hover:text-text-secondary';
  };

  return (
    <div
      role="group"
      aria-label={t('common.switch_language')}
      className={`flex items-center rounded-lg border p-0.5 ${wrap} ${className}`}
    >
      {LANGS.map(({ code, short }) => (
        <button
          key={code}
          type="button"
          onClick={() => setLang(code)}
          aria-pressed={active === code}
          title={code === 'dz' ? t('common.dzongkha') : t('common.english')}
          className={`px-2.5 h-7 rounded-md text-xs font-medium transition-colors ${btn(active === code)}`}
        >
          {short}
        </button>
      ))}
    </div>
  );
}
