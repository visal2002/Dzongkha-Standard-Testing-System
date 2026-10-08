import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import Input from './Input';

describe('Input', () => {
  it('shows a visible calendar icon for date fields', () => {
    const { container } = render(<Input label="Date of Birth" type="date" />);
    const input = screen.getByLabelText('Date of Birth');

    expect(input).toHaveClass('date-input-with-icon');
    expect(container.querySelector('.date-picker-icon')).toBeInTheDocument();
  });

  it('does not add a calendar icon to ordinary fields', () => {
    const { container } = render(<Input label="Full Name" type="text" />);

    expect(screen.getByLabelText('Full Name')).not.toHaveClass('date-input-with-icon');
    expect(container.querySelector('.date-picker-icon')).not.toBeInTheDocument();
  });
});
