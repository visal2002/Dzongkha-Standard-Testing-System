import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@/i18n';
import { StatusBadge, humanizeStatus } from './Badge';

describe('StatusBadge', () => {
  it('shows a human-readable examination status', () => {
    render(<StatusBadge status="registration_open" />);
    expect(screen.getByText('Registration Open')).toBeInTheDocument();
  });

  it('humanizes unknown database status values', () => {
    render(<StatusBadge status="awaiting_final_review" />);
    expect(screen.getByText('Awaiting Final Review')).toBeInTheDocument();
  });

  it('formats uppercase and hyphenated values', () => {
    expect(humanizeStatus('RESULTS-DECLARED')).toBe('Results Declared');
  });
});
