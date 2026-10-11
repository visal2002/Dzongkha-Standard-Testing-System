import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import UserTransferWizard from './UserTransferWizard';
const api=vi.hoisted(()=>({getTransferPlan:vi.fn(),transferAndDeleteUser:vi.fn()}));
vi.mock('@/features/admin/api',()=>({adminService:api}));
vi.mock('react-hot-toast',()=>({default:{success:vi.fn()}}));
const source={id:'source',name:'Former member'}, users=[source,{id:'target',name:'Successor',email:'next@example.invalid',status:'active'}];
beforeEach(()=>{vi.clearAllMocks();api.getTransferPlan.mockResolvedValue({roles:['committee_member'],responsibilities:{result:{assignments:2}},pending:null});api.transferAndDeleteUser.mockResolvedValue({deleted:true});});
afterEach(cleanup);
describe('User transfer wizard',()=>{
 it('requires an existing successor and explicit final confirmation',async()=>{
  const complete=vi.fn();render(<UserTransferWizard source={source} users={users} onClose={vi.fn()} onComplete={complete}/>);
  await screen.findByLabelText('Successor');fireEvent.click(screen.getByText('Review Handover'));expect(screen.getByRole('alert')).toHaveTextContent('Choose a successor');
  fireEvent.change(screen.getByLabelText('Successor'),{target:{value:'target'}});fireEvent.click(screen.getByText('Review Handover'));expect(screen.getByRole('button',{name:'Transfer & Delete User'})).toBeDisabled();
  fireEvent.click(screen.getByRole('checkbox'));fireEvent.click(screen.getByRole('button',{name:'Transfer & Delete User'}));await waitFor(()=>expect(complete).toHaveBeenCalled());expect(api.transferAndDeleteUser).toHaveBeenCalledWith('source',{targetUserId:'target'});
 });
 it('collects a new successor without allowing selection of privileged roles outside the handover',async()=>{
  render(<UserTransferWizard source={source} users={users} onClose={vi.fn()} onComplete={vi.fn()}/>);await screen.findByLabelText('Successor');fireEvent.click(screen.getByLabelText('New user'));
  for(const [label,value] of [['Full Name','New Successor'],['Email Address','new@example.invalid'],['CID / User ID Number','12345678901'],['Temporary Password','Strong-test-only-123']])fireEvent.change(screen.getByLabelText(new RegExp(label)),{target:{value}});
  fireEvent.click(screen.getByText('Review Handover'));fireEvent.click(screen.getByRole('checkbox'));fireEvent.click(screen.getByRole('button',{name:'Transfer & Delete User'}));await waitFor(()=>expect(api.transferAndDeleteUser).toHaveBeenCalledWith('source',{newUser:expect.objectContaining({email:'new@example.invalid'})}));
 });
 it('pins the original successor when resuming a partially completed transfer',async()=>{
  api.getTransferPlan.mockResolvedValue({roles:['committee_member'],responsibilities:{result:{assignments:0}},pending:{targetUserId:'target',targetEmail:'next@example.invalid'}});
  render(<UserTransferWizard source={source} users={users} onClose={vi.fn()} onComplete={vi.fn()}/>);expect(await screen.findByLabelText('Successor')).toBeDisabled();expect(screen.queryByLabelText('New user')).not.toBeInTheDocument();
 });
});
