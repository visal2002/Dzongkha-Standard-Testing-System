import { cleanup,render,screen,fireEvent,waitFor } from '@testing-library/react';
import { afterEach,beforeEach,expect,it,vi } from 'vitest';
import ResetUserPassword from './ResetUserPassword';
import {adminService} from '@/features/admin/api';
vi.mock('@/features/admin/api',()=>({adminService:{resetPassword:vi.fn()}}));
const password='QA-reset-password-2026';
beforeEach(()=>vi.clearAllMocks());afterEach(cleanup);
const open=()=>{render(<ResetUserPassword user={{id:'full-target-id',name:'QA User'}}/>);fireEvent.click(screen.getByText('Reset password'));};
const fill=()=>{fireEvent.change(screen.getByLabelText('New password'),{target:{value:password}});fireEvent.change(screen.getByLabelText('Confirm new password'),{target:{value:password}});};
it('requires matching valid passwords and explicit confirmation before calling the server',()=>{
 open();expect(screen.getByRole('button',{name:'Reset Password'})).toBeDisabled();fill();expect(screen.getByRole('button',{name:'Reset Password'})).toBeDisabled();fireEvent.click(screen.getByRole('checkbox'));expect(screen.getByRole('button',{name:'Reset Password'})).toBeEnabled();expect(adminService.resetPassword).not.toHaveBeenCalled();
});
it('shows eye controls and prevents mismatched or short passwords',()=>{
 open();fill();fireEvent.click(screen.getByRole('button',{name:'Show New password'}));expect(screen.getByLabelText('New password')).toHaveAttribute('type','text');fireEvent.change(screen.getByLabelText('Confirm new password'),{target:{value:'different'}});expect(screen.getByText('Passwords do not match.')).toBeInTheDocument();fireEvent.click(screen.getByRole('checkbox'));expect(screen.getByRole('button',{name:'Reset Password'})).toBeDisabled();
});
it('confirms success only after the server responds and clears secrets',async()=>{
 let resolve;adminService.resetPassword.mockReturnValue(new Promise(r=>resolve=r));open();fill();fireEvent.click(screen.getByRole('checkbox'));fireEvent.click(screen.getByRole('button',{name:'Reset Password'}));expect(adminService.resetPassword).toHaveBeenCalledWith('full-target-id',password);expect(screen.queryByRole('status')).toBeNull();expect(screen.getByLabelText('New password')).toBeDisabled();resolve({passwordReset:true});await screen.findByRole('status');expect(screen.getByLabelText('New password')).toHaveValue('');expect(screen.getByLabelText('Confirm new password')).toHaveValue('');expect(screen.getByRole('checkbox')).not.toBeChecked();
});
it('keeps the form usable after a failed reset without claiming success',async()=>{
 adminService.resetPassword.mockRejectedValue(new Error('Unable to reset'));open();fill();fireEvent.click(screen.getByRole('checkbox'));fireEvent.click(screen.getByRole('button',{name:'Reset Password'}));expect(await screen.findByRole('alert')).toHaveTextContent('Unable to reset');await waitFor(()=>expect(screen.getByRole('button',{name:'Reset Password'})).toBeEnabled());expect(screen.queryByRole('status')).toBeNull();
});
it('does not submit when the administrator only enters a password or closes the form',()=>{
 open();fill();cleanup();expect(adminService.resetPassword).not.toHaveBeenCalled();
});
