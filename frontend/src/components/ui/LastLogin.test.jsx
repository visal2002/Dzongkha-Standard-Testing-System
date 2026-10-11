import { cleanup,render,screen } from '@testing-library/react';
import { afterEach,expect,it } from 'vitest';
import LastLogin,{formatLastLogin} from './LastLogin';
afterEach(cleanup);
it('shows a date and time in Bhutan time including date rollover',()=>{
 const text=formatLastLogin('2026-10-09T23:30:00Z');expect(text).toContain('10 Oct 2026');expect(text).toContain('5:30 am');
 render(<LastLogin value="2026-10-09T23:30:00Z"/>);expect(screen.getByText(text)).toHaveAttribute('title','Bhutan Time (UTC+06:00)');
});
it('provides honest placeholders for missing or invalid timestamps',()=>{
 expect(formatLastLogin(null)).toBe('No login recorded');expect(formatLastLogin('invalid')).toBe('No login recorded');
});
