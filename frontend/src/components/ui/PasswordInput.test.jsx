import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { it, expect, vi, afterEach } from 'vitest';
import PasswordInput from './PasswordInput';
import Input from './Input';
afterEach(cleanup);
it('starts masked, toggles with the eye, preserves the value and never submits the form',()=>{
 const submit=vi.fn(e=>e.preventDefault());render(<form onSubmit={submit}><PasswordInput aria-label="New Password" defaultValue="test-only-value" required minLength={12}/></form>);
 const field=screen.getByLabelText('New Password');expect(field).toHaveAttribute('type','password');
 fireEvent.click(screen.getByRole('button',{name:'Show New Password'}));
 expect(field).toHaveAttribute('type','text');expect(field).toHaveValue('test-only-value');
 expect(field).toHaveAttribute('required');expect(field).toHaveAttribute('minlength','12');
 expect(screen.getByRole('button',{name:'Hide New Password'})).toHaveAttribute('aria-pressed','true');
 fireEvent.click(screen.getByRole('button',{name:'Hide New Password'}));expect(field).toHaveAttribute('type','password');expect(submit).not.toHaveBeenCalled();
});
it('adds an eye to password fields using the shared Input',()=>{
 render(<Input label="Temporary Password" type="password"/>);
 expect(screen.getByLabelText('Temporary Password')).toHaveAttribute('type','password');
 fireEvent.click(screen.getByRole('button',{name:'Show password'}));
 expect(screen.getByLabelText('Temporary Password')).toHaveAttribute('type','text');
});
it('disables reveal when the field is disabled',()=>{render(<PasswordInput disabled/>);expect(screen.getByRole('button')).toBeDisabled();});
