import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { beforeEach, afterEach, it, expect, vi } from 'vitest';
import AppealList from './AppealList';
const state=vi.hoisted(()=>({user:{id:'qa-chief',role:'exam_head',permissions:['appeal.view','appeal.approve']},api:{getAll:vi.fn(),getByUser:vi.fn(),decide:vi.fn()}}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:state.user})}));
vi.mock('react-router-dom',()=>({useNavigate:()=>vi.fn(),Link:({to,children})=><a href={to}>{children}</a>}));
vi.mock('@/features/appeals/api',()=>({appealService:state.api}));
vi.mock('react-hot-toast',()=>({default:{success:vi.fn(),error:vi.fn()}}));
vi.mock('@/components/ui/Modal',()=>({default:({isOpen,children,footer})=>isOpen?<div>{children}{footer}</div>:null}));
vi.mock('@/components/ui/Table',()=>({default:({data,columns})=><div>{data.map(row=><div key={row.id}>{columns.find(c=>c.id==='actions').cell({row:{original:row}})}</div>)}</div>}));
const appeal=status=>({id:'qa-appeal',applicationId:'qa-app',examId:'qa-exam',status,committeeRecommendation:'NO_CHANGE',reason:'QA review',submittedAt:'2026-10-09',skills:[{skill:'WRITING',originalScore:28,proposedScore:null}],payment:{amount:'0',status:'WAIVED'}});
it('uses readable status, payment and exam references in details', async () => {
 state.api.getAll.mockResolvedValue({data:[{...appeal('PENDING_COMMITTEE'),examId:'b3b6589e-c2eb-4241-8196-8ae21a761f63'}]});
 render(<AppealList/>);
 fireEvent.click(await screen.findByRole('button',{name:'View',exact:true}));
 expect(screen.getByText('Awaiting committee review')).toBeInTheDocument();
 expect(screen.getByText('Nu. 0.00 (Fee waived)')).toBeInTheDocument();
 expect(screen.getByText('EXAM-B3B6589E')).toBeInTheDocument();
 expect(screen.queryByText('PENDING_COMMITTEE')).toBeNull();
 expect(screen.queryByText('b3b6589e-c2eb-4241-8196-8ae21a761f63')).toBeNull();
});
beforeEach(()=>{vi.clearAllMocks();state.user.permissions=['appeal.view','appeal.approve'];state.api.decide.mockResolvedValue({});});
afterEach(cleanup);
it('offers an explicit per-skill Chief decision for a no-change committee recommendation',async()=>{
 state.api.getAll.mockResolvedValue({data:[appeal('PENDING_CHIEF_APPROVAL')]});render(<AppealList/>);
 fireEvent.click(await screen.findByRole('button',{name:'Review & Decide'}));
 expect(screen.getByRole('button',{name:'Submit Decision'})).toBeDisabled();
 fireEvent.click(screen.getByRole('button',{name:'Approve',exact:true}));
 fireEvent.click(screen.getByRole('button',{name:'Submit Decision'}));
 await vi.waitFor(()=>expect(state.api.decide).toHaveBeenCalledWith('qa-appeal',{WRITING:'APPROVED'},expect.any(String)));
});
it('explains committee review is required instead of skipping it',async()=>{
 state.api.getAll.mockResolvedValue({data:[appeal('PENDING_COMMITTEE')]});render(<AppealList/>);
 fireEvent.click(await screen.findByRole('button',{name:'View',exact:true}));
 expect(screen.getByText('Committee review required')).toBeInTheDocument();
 expect(screen.queryByRole('button',{name:'Submit Decision'})).toBeNull();
});
it('does not display final-decision controls with view-only grants',async()=>{
 state.user.permissions=['appeal.view'];state.api.getAll.mockResolvedValue({data:[appeal('PENDING_CHIEF_APPROVAL')]});render(<AppealList/>);
 fireEvent.click(await screen.findByRole('button',{name:'View',exact:true}));
 expect(screen.queryByRole('button',{name:'Approve',exact:true})).toBeNull();
});
it('ticks Outcome and displays the applied final score, not the old snapshot as published',async()=>{
 state.api.getAll.mockResolvedValue({data:[{...appeal('COMPLETED'),committeeRecommendation:'REVISE',skills:[{skill:'SPEAKING',originalScore:'42.500',proposedScore:'9.500',finalScore:'9.500'}]}]});render(<AppealList/>);
 fireEvent.click(await screen.findByRole('button',{name:'View',exact:true}));
 expect(screen.getAllByText('✓')).toHaveLength(4);
 expect(screen.getByText('Final scores · outcome completed')).toBeInTheDocument();
 expect(screen.getByText('9.500')).toBeInTheDocument();
 expect(screen.getByText('Original score snapshot')).toBeInTheDocument();
 expect(screen.getByText('42.500')).toBeInTheDocument();
 expect(screen.queryByText('Committee proposal, not yet applied')).toBeNull();
});
it.each(['NO_CHANGE','REJECTED'])('completes Outcome for %s without presenting a rejected proposal as applied',async status=>{
 state.api.getAll.mockResolvedValue({data:[{...appeal(status),skills:[{skill:'SPEAKING',originalScore:42.5,proposedScore:9.5,finalScore:42.5}]}]});render(<AppealList/>);
 fireEvent.click(await screen.findByRole('button',{name:'View',exact:true}));
 expect(screen.getAllByText('✓')).toHaveLength(4);
 expect(screen.getByText('The review is complete. Published scores remain unchanged.')).toBeInTheDocument();
 expect(screen.queryByText('9.500')).toBeNull();
});
it('keeps Outcome pending when approval succeeded but score application is still pending',async()=>{
 state.api.getAll.mockResolvedValue({data:[{...appeal('APPROVED_PENDING_SCORE_UPDATE'),skills:[{skill:'SPEAKING',originalScore:42.5,proposedScore:9.5,finalScore:null}]}]});render(<AppealList/>);
 fireEvent.click(await screen.findByRole('button',{name:'View',exact:true}));
 expect(screen.getAllByText('✓')).toHaveLength(3);
 expect(screen.getByText('4')).toHaveAttribute('aria-current','step');
 expect(screen.getByText('Approved revision, awaiting score update')).toBeInTheDocument();
 expect(screen.queryByText('Final scores · outcome completed')).toBeNull();
});
it('describes a completed no-change recommendation as unchanged',async()=>{
 state.api.getAll.mockResolvedValue({data:[{...appeal('COMPLETED'),chiefDecision:'APPROVED',skills:[{skill:'WRITING',originalScore:28,proposedScore:null,finalScore:28}]}]});render(<AppealList/>);
 fireEvent.click(await screen.findByRole('button',{name:'View',exact:true}));
 expect(screen.getAllByText('✓')).toHaveLength(4);
 expect(screen.getByText('The review is complete. Published scores remain unchanged.')).toBeInTheDocument();
});
it('does not infer a final score from a proposal when the final score is unavailable',async()=>{
 state.api.getAll.mockResolvedValue({data:[{...appeal('COMPLETED'),skills:[{skill:'SPEAKING',originalScore:42.5,proposedScore:9.5}]}]});render(<AppealList/>);
 fireEvent.click(await screen.findByRole('button',{name:'View',exact:true}));
 expect(screen.getAllByText('✓')).toHaveLength(4);
 expect(screen.getByText('Committee proposal (review completed)')).toBeInTheDocument();
 expect(screen.queryByText('Final scores · outcome completed')).toBeNull();
});
