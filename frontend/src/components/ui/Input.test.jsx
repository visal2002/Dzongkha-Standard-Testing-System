import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import Input from './Input';

describe('Input', () => {
  it.each(['date', 'datetime-local'])('shows a visible calendar icon for %s fields', (type) => {
    const { container } = render(<Input label="Date and Time" type={type} />);
    const input = screen.getByLabelText('Date and Time');

    expect(input).toHaveClass('date-input-with-icon');
    expect(container.querySelector('.date-picker-icon')).toBeInTheDocument();
  });

  it('does not add a calendar icon to ordinary fields', () => {
    const { container } = render(<Input label="Full Name" type="text" />);

    expect(screen.getByLabelText('Full Name')).not.toHaveClass('date-input-with-icon');
    expect(container.querySelector('.date-picker-icon')).not.toBeInTheDocument();
  });
});
