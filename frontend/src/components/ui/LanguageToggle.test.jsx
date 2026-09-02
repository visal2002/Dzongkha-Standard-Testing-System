import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import i18n from '@/i18n';
import LanguageToggle from './LanguageToggle';

describe('LanguageToggle', () => {
  beforeEach(async () => {
    localStorage.clear();
    await i18n.changeLanguage('en');
  });

  it('switches between English and Dzongkha and updates the document language', async () => {
    render(<LanguageToggle />);

    expect(screen.getByRole('button', { name: 'Use English' })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'Use Dzongkha' }));

    await waitFor(() => {
      expect(i18n.resolvedLanguage).toBe('dz');
      expect(document.documentElement).toHaveAttribute('lang', 'dz');
      expect(screen.getByRole('button', { name: 'Use Dzongkha' })).toHaveAttribute('aria-pressed', 'true');
      expect(i18n.t('my_applications.title')).toBe('ངེའི་ཞུ་ཡིག་ཚུ།');
      expect(i18n.t('nav.registration')).toBe('ཐོ་བཀོད།');
    });
  });
});
