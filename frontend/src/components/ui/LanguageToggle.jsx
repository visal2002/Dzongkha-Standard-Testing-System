import { useTranslation } from 'react-i18next';

const LANGUAGES = [
  { code: 'en', shortLabel: 'EN', label: 'English' },
  { code: 'dz', shortLabel: 'རྫོང་ཁ', label: 'Dzongkha' },
];

export default function LanguageToggle({ className = '' }) {
  const { i18n } = useTranslation();
  const currentLanguage = i18n.resolvedLanguage?.startsWith('dz') ? 'dz' : 'en';

  return (
    <div
      role="group"
      aria-label="Interface language"
      className={`flex h-10 items-center rounded-xl border border-surface-border bg-surface-bg p-1 ${className}`}
    >
      {LANGUAGES.map(language => {
        const active = currentLanguage === language.code;

        return (
          <button
            key={language.code}
            type="button"
            aria-label={`Use ${language.label}`}
            aria-pressed={active}
            title={language.label}
            onClick={() => i18n.changeLanguage(language.code)}
            className={`h-8 rounded-lg px-3 text-sm font-semibold leading-none transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/50 ${
              active
                ? 'bg-brand-gold text-slate-950 shadow-sm'
                : 'text-text-muted hover:bg-surface-border hover:text-text-primary'
            }`}
          >
            {language.shortLabel}
          </button>
        );
      })}
    </div>
  );
}
