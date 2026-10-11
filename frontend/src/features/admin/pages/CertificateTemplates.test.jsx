import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { vi, it, expect, afterEach } from 'vitest';
import { TemplateForm, TemplateTab } from './MasterConfiguration';
const api=vi.hoisted(()=>({createTemplate:vi.fn(),deleteTemplate:vi.fn(),listTemplates:vi.fn(),approveTemplate:vi.fn(),activateTemplate:vi.fn()}));
const reload=vi.hoisted(()=>vi.fn());
vi.mock('@/features/certificates/api',()=>({certificateService:api}));
vi.mock('@/hooks/useApi',()=>({useApi:()=>({data:[{id:'approved',code:'DSTS',versionNumber:5,status:'APPROVED',signatoryName:'A',chiefExecutiveName:'B',dzongkhaFont:'DDC Uchen',effectiveFrom:'2026-01-01',effectiveTo:'2026-02-01'}, {id:'other',code:'OTHER',versionNumber:1,status:'APPROVED',isDefault:true,effectiveFrom:'2026-01-01'}],loading:false,execute:reload})}));
afterEach(()=>{cleanup();vi.clearAllMocks();});
it('shows both font families and saves the selected font',async()=>{
 api.createTemplate.mockResolvedValue({});render(<TemplateForm onCancel={()=>{}} onSaved={()=>{}}/>);
 expect(screen.getByLabelText('Dzongkha Font')).toHaveValue('DDC Uchen');
 fireEvent.change(screen.getByLabelText('Dzongkha Font'),{target:{value:'DDC Joyig'}});
 fireEvent.change(screen.getByLabelText(/Authorized Signatory Name/),{target:{value:'A'}});
 fireEvent.change(screen.getByLabelText(/Chief Executive Name/),{target:{value:'B'}});
 fireEvent.click(screen.getByRole('button',{name:'Create Draft'}));
 await waitFor(()=>expect(api.createTemplate).toHaveBeenCalledWith(expect.objectContaining({dzongkhaFont:'DDC Joyig'})));
});
it('edits an approved version as a new draft and requires confirmation to retire it',async()=>{
 api.deleteTemplate.mockResolvedValue({});render(<TemplateTab/>);
 fireEvent.click(screen.getAllByRole('button',{name:'Edit',exact:true})[0]);
 expect(screen.getByLabelText('Version Number')).toHaveValue(6);
 expect(screen.getByLabelText('Dzongkha Font')).toHaveValue('DDC Uchen');
 fireEvent.click(screen.getByRole('button',{name:'Cancel'}));
 fireEvent.click(screen.getAllByRole('button',{name:'Delete',exact:true})[0]);
 expect(api.deleteTemplate).not.toHaveBeenCalled();
 expect(screen.getByText(/does not delete issued certificates/)).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Delete (Retire)'}));
 await waitFor(()=>expect(api.deleteTemplate).toHaveBeenCalledWith('approved'));
});

it('preserves the existing signature when editing into a new version',async()=>{
 api.createTemplate.mockResolvedValue({});render(<TemplateForm latest={{code:'DSTS',versionNumber:5,signatoryName:'A',chiefExecutiveName:'B',signatureImage:'data:image/png;base64,YWJj'}} nextVersion={6} onCancel={()=>{}} onSaved={()=>{}}/>);
 fireEvent.click(screen.getByRole('button',{name:'Create Draft'}));
 await waitFor(()=>expect(api.createTemplate).toHaveBeenCalledWith(expect.objectContaining({versionNumber:6,signatureImage:{mimeType:'image/png',dataBase64:'YWJj'}})));
});

it('sets the default only after confirmation and reloads the list',async()=>{
 api.activateTemplate.mockResolvedValue({});render(<TemplateTab/>);
 expect(screen.getByText('Active / Default')).toBeInTheDocument();
 expect(screen.getByRole('button',{name:'Set Active',exact:true})).toBeEnabled();
 fireEvent.click(screen.getByRole('button',{name:'Set Active',exact:true}));
 expect(screen.getByText(/it will start again now with no end date/)).toBeInTheDocument();
 expect(api.activateTemplate).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'Confirm Set Active'}));
 await waitFor(()=>expect(api.activateTemplate).toHaveBeenCalledWith('approved'));
 expect(reload).toHaveBeenCalled();
});

it('provides separate uploads for the two signing authorities',async()=>{
 api.createTemplate.mockResolvedValue({});render(<TemplateForm latest={{code:'DSTS',versionNumber:5,signatoryName:'A',chiefExecutiveName:'B',examinationSignatureImage:'data:image/png;base64,YWJj',signatureImage:'data:image/png;base64,ZGVm'}} nextVersion={6} onCancel={()=>{}} onSaved={()=>{}}/>);
 expect(screen.getByLabelText('Chief of Examination Signature')).toHaveAttribute('type','file');
 expect(screen.getByLabelText('Chief Executive Signature')).toHaveAttribute('type','file');
 expect(screen.getByLabelText('Left Logo')).toHaveAttribute('type','file');
 fireEvent.click(screen.getByRole('button',{name:'Create Draft'}));
 await waitFor(()=>expect(api.createTemplate).toHaveBeenCalledWith(expect.objectContaining({examinationSignatureImage:{mimeType:'image/png',dataBase64:'YWJj'},signatureImage:{mimeType:'image/png',dataBase64:'ZGVm'}})));
});
