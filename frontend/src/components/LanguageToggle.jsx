/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

const LANGS = [
  { code: 'en', short: 'EN' },
  { code: 'dz', short: 'རྫ' },
];

const FONT_SIZES = ['normal', 'large', 'extra-large'];
const FONT_SIZE_STORAGE_KEY = 'dsts_font_size';

const getSavedFontSize = () => {
  if (typeof window === 'undefined') return 'normal';
  const saved = window.localStorage.getItem(FONT_SIZE_STORAGE_KEY);
  return FONT_SIZES.includes(saved) ? saved : 'normal';
};

/**
 * App-wide English / Dzongkha switch. Writes through i18next, which persists the
 * choice to localStorage ('dsts_language') so every screen and future visit
 * follows it.
 *
 * `tone="dark"`    — light text on a dark/glass surface (public HomePage header).
 * `tone="surface"` — themed, sits next to the in-app header controls.
 * `tone="light"`   — slate on white, for the hard-coded light auth screens.
 */
export default function LanguageToggle({ tone = 'surface', className = '' }) {
  const { i18n, t } = useTranslation();
  const [fontSize, setFontSize] = useState(getSavedFontSize);
  const current = i18n.resolvedLanguage || i18n.language || 'en';
  const active = current.startsWith('dz') ? 'dz' : 'en';
  const fontSizeIndex = FONT_SIZES.indexOf(fontSize);

  useEffect(() => {
    document.documentElement.dataset.fontSize = fontSize;
    window.localStorage.setItem(FONT_SIZE_STORAGE_KEY, fontSize);
  }, [fontSize]);

  const setLang = (code) => {
    if (code !== active) i18n.changeLanguage(code);
  };

  const changeFontSize = (direction) => {
    const nextIndex = Math.min(
      FONT_SIZES.length - 1,
      Math.max(0, fontSizeIndex + direction),
    );
    setFontSize(FONT_SIZES[nextIndex]);
  };

  const wrap = {
    dark: 'border-brand-gold-light/40 bg-[#0d1425]/50 backdrop-blur-sm',
    surface: 'border-surface-border bg-surface-bg',
    light: 'border-slate-300 bg-slate-100',
  }[tone];

  const btn = (isActive) => {
    if (tone === 'dark') {
      return isActive ? 'bg-brand-gold-light/20 text-white' : 'text-gray-300 hover:text-white';
    }
    if (tone === 'light') {
      return isActive ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600';
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

      <span aria-hidden="true" className="mx-0.5 h-5 w-px bg-current opacity-15" />

      <button
        type="button"
        onClick={() => changeFontSize(-1)}
        disabled={fontSizeIndex === 0}
        aria-label={t('common.decrease_font_size')}
        title={t('common.decrease_font_size')}
        className={`h-7 min-w-7 rounded-md px-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${btn(false)}`}
      >
        A−
      </button>
      <button
        type="button"
        onClick={() => changeFontSize(1)}
        disabled={fontSizeIndex === FONT_SIZES.length - 1}
        aria-label={t('common.increase_font_size')}
        title={t('common.increase_font_size')}
        className={`h-7 min-w-7 rounded-md px-1.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${btn(false)}`}
      >
        A+
      </button>
    </div>
  );
}
