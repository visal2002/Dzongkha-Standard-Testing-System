import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { vi, it, expect, afterEach } from 'vitest';
import ProfilePage from './ProfilePage';
const save = vi.hoisted(()=>vi.fn());
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:{name:'QA Holder',fullNameDz:'བཀྲ་ཤིས་',role:'test_taker',emailSet:true,passwordSet:true,email:'qa@example.test',photo:'data:image/png;base64,AA=='},updateProfile:save})}));
afterEach(()=>{cleanup();vi.clearAllMocks();});
it('edits and saves the Dzongkha name without changing the English name',async()=>{
 save.mockResolvedValue({});render(<ProfilePage/>);
 fireEvent.click(screen.getByRole('button',{name:/Edit/}));
 const field=screen.getByLabelText('Full Name (Dzongkha)');expect(field).toHaveValue('བཀྲ་ཤིས་');
 fireEvent.change(field,{target:{value:'པདྨ་'}});fireEvent.click(screen.getByRole('button',{name:'Save Changes'}));
 await waitFor(()=>expect(save).toHaveBeenCalledWith(expect.objectContaining({fullNameDz:'པདྨ་'})));
 expect(save.mock.calls[0][0]).not.toHaveProperty('fullName');
});
it('rejects English text in the Dzongkha field',()=>{
 render(<ProfilePage/>);fireEvent.click(screen.getByRole('button',{name:/Edit/}));
 fireEvent.change(screen.getByLabelText('Full Name (Dzongkha)'),{target:{value:'English Name'}});
 fireEvent.click(screen.getByRole('button',{name:'Save Changes'}));expect(save).not.toHaveBeenCalled();
});
