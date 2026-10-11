import {cleanup,render,screen,fireEvent} from '@testing-library/react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import UserManagement from './UserManagement';
const state=vi.hoisted(()=>({user:{role:'admin',roles:['admin'],permissions:['admin.user.manage','admin.user.read']},target:{id:'target',name:'QA User',email:'qa@example.test',cid:'11111111111',status:'locked',roles:['test_taker'],role:'Test Taker'},api:{getUsers:vi.fn(),getRoles:vi.fn(),resetPassword:vi.fn()}}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:state.user})}));
vi.mock('react-router-dom',()=>({Link:({to,children,...props})=><a href={to} {...props}>{children}</a>}));
vi.mock('@/features/admin/api',()=>({adminService:state.api}));
vi.mock('@/hooks/useApi',()=>({useApi:fn=>({data:fn===state.api.getUsers?[state.target]:[],loading:false,execute:vi.fn(),setData:vi.fn()})}));
vi.mock('@/features/admin/components/UserTransferWizard',()=>({default:()=>null}));
vi.mock('@/features/admin/components/CitizenIdentityFields',()=>({default:()=>null}));
beforeEach(()=>{state.user={role:'admin',roles:['admin'],permissions:['admin.user.manage','admin.user.read']};});afterEach(cleanup);
it('lets a System Admin open password reset for a locked account',()=>{
 render(<UserManagement/>);fireEvent.click(screen.getByRole('button',{name:'Reset Password'}));
 expect(screen.getByLabelText('New password')).toBeInTheDocument();expect(screen.getByText('Reset password').closest('details')).toHaveAttribute('open');
 expect(state.api.resetPassword).not.toHaveBeenCalled();
});
it('does not offer a reset to a read-only DCDD user',()=>{
 state.user={role:'dcdd',roles:['dcdd'],permissions:['admin.user.read']};render(<UserManagement/>);
 expect(screen.queryByRole('button',{name:'Reset Password'})).toBeNull();
});
it('does not offer password reset to a non-System-Admin even if they have manage permission',()=>{
 state.user={role:'dcdd',roles:['dcdd'],permissions:['admin.user.manage','admin.user.read']};render(<UserManagement/>);
 expect(screen.queryByRole('button',{name:'Reset Password'})).toBeNull();
});
