import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import i18n from '@/i18n';
import LanguageToggle from './LanguageToggle';

describe('app LanguageToggle', () => {
  beforeEach(async () => {
    localStorage.clear();
    delete document.documentElement.dataset.fontSize;
    await i18n.changeLanguage('en');
  });

  it('changes and persists the interface font size', async () => {
    const { unmount } = render(<LanguageToggle />);
    const increase = screen.getByRole('button', { name: 'Increase font size' });
    const decrease = screen.getByRole('button', { name: 'Decrease font size' });

    expect(decrease).toBeDisabled();
    fireEvent.click(increase);

    await waitFor(() => {
      expect(document.documentElement).toHaveAttribute('data-font-size', 'large');
      expect(localStorage.getItem('dsts_font_size')).toBe('large');
    });

    unmount();
    render(<LanguageToggle />);
    expect(screen.getByRole('button', { name: 'Decrease font size' })).toBeEnabled();
    expect(document.documentElement).toHaveAttribute('data-font-size', 'large');
  });

  it('supports three bounded font sizes', async () => {
    render(<LanguageToggle />);
    const increase = screen.getByRole('button', { name: 'Increase font size' });

    fireEvent.click(increase);
    fireEvent.click(increase);

    await waitFor(() => {
      expect(document.documentElement).toHaveAttribute('data-font-size', 'extra-large');
      expect(increase).toBeDisabled();
    });
  });
});
