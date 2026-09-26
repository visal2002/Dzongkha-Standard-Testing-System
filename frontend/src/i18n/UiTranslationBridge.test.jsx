import { act, render, screen, waitFor } from '@testing-library/react';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import UiTranslationBridge from './UiTranslationBridge';

function ExplicitI18nextLabel() {
  const { t } = useTranslation();
  return <span>{t('nav.dashboard')}</span>;
}

describe('UiTranslationBridge', () => {
  beforeEach(async () => {
    document.body.innerHTML = '<div id="root"></div>';
    await i18n.changeLanguage('en');
  });

  it('translates legacy page content, dynamic labels, and accessible attributes in both directions', async () => {
    const root = document.getElementById('root');
    const view = render(
      <>
        <UiTranslationBridge />
        <h1>System Administration</h1>
        <p>Welcome, Aakash!</p>
        <ExplicitI18nextLabel />
        <input aria-label="Search user" placeholder="Search user" />
      </>,
      { container: root },
    );

    await act(() => i18n.changeLanguage('dz'));
    await waitFor(() => {
      expect(screen.getByText('རིམ་ལུགས་བདག་སྐྱོང་།')).toBeInTheDocument();
      expect(screen.getByText('དགའ་བསུ་ཞུ། Aakash!')).toBeInTheDocument();
      expect(screen.getByText('ལྟེ་གནས།')).toBeInTheDocument();
      expect(screen.getByRole('textbox')).not.toHaveAttribute('placeholder', 'Search user');
      expect(screen.getByRole('textbox')).not.toHaveAttribute('aria-label', 'Search user');
    });

    view.rerender(
      <>
        <UiTranslationBridge />
        <h1>Total Users</h1>
        <p>Infrastructure Health</p>
        <ExplicitI18nextLabel />
      </>,
    );
    await waitFor(() => {
      expect(screen.getByText('ལག་ལེན་པ་ཡོངས་བསྡོམས།')).toBeInTheDocument();
      expect(screen.getByText('གཞི་རྟེན་ཞབས་ཏོག་གནས་སྟངས།')).toBeInTheDocument();
    });

    await act(() => i18n.changeLanguage('en'));
    await waitFor(() => {
      expect(screen.getByText('Total Users')).toBeInTheDocument();
      expect(screen.getByText('Infrastructure Health')).toBeInTheDocument();
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.queryByText('ལྟེ་གནས།')).not.toBeInTheDocument();
    });
  });
});
