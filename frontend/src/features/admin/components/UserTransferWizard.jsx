import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { adminService } from '@/features/admin/api';

export default function UserTransferWizard({ source, users, onClose, onComplete }) {
 const [plan,setPlan]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const [step,setStep]=useState(0),[mode,setMode]=useState('existing'),[targetId,setTargetId]=useState('');
 const [form,setForm]=useState({fullName:'',email:'',cid:'',password:''});
 const [confirmed,setConfirmed]=useState(false);
 useEffect(()=>{let active=true;adminService.getTransferPlan(source.id).then(p=>{if(!active)return;setPlan(p);if(p.pending){setTargetId(p.pending.targetUserId);setMode('existing');}}).catch(e=>{if(active)setError(e.message||'Unable to inspect responsibilities.');});return()=>{active=false;};},[source.id]);
 const successors=users.filter(u=>u.id!==source.id&&u.status==='active'&&!u.handoverPending);
 const selected=successors.find(u=>u.id===targetId);
 const next=()=>{
  if(mode==='existing'&&!targetId){setError('Choose a successor.');return;}
  if(mode==='new'&&(!form.fullName.trim()||!form.email.includes('@')||form.cid.length<5||form.password.length<12)){setError('Enter the new user details and a password of at least 12 characters.');return;}
  setError('');setStep(1);
 };
 const execute=async()=>{
  setBusy(true);setError('');
  try{await adminService.transferAndDeleteUser(source.id,plan.pending||mode==='existing'?{targetUserId:targetId}:{newUser:form});toast.success('Responsibilities transferred and the former account removed from the user directory.');await onComplete();}
  catch(e){setError(e.message||'Handover failed. Nothing will be deleted until it succeeds.');try{const p=await adminService.getTransferPlan(source.id);setPlan(p);if(p.pending){setTargetId(p.pending.targetUserId);setMode('existing');}}catch{/* keep the original plan for a retry */}}
  finally{setBusy(false);}
 };
 return <Modal isOpen onClose={onClose} closable={!busy} title={'Role Transfer — '+source.name} size="lg" footer={<><Button variant="ghost" disabled={busy} onClick={step===1?()=>{setStep(0);setConfirmed(false);}:onClose}>{step===1?'Back':'Cancel'}</Button>{step===0?<Button disabled={!plan} onClick={next}>Review Handover</Button>:<Button disabled={!confirmed} loading={busy} onClick={execute}>Transfer &amp; Delete User</Button>}</>}>
  <div className="space-y-4">
   <p className="text-sm text-text-secondary">{step===0?'Step 1 of 2: choose the person taking over.':'Step 2 of 2: confirm the handover and removal.'}</p>
   {error&&<p role="alert" className="text-sm text-red-400">{error}</p>}
   {!plan&&!error&&<p>Inspecting roles and responsibilities…</p>}
   {plan&&<>
    <div className="rounded-lg border border-surface-border p-3 text-sm"><p>Roles: {plan.roles.join(', ')||'No current staff roles'}</p>{Object.entries(plan.responsibilities).map(([service,counts])=><p key={service}>{service}: {Object.entries(counts).map(([k,v])=>k+' '+v).join(', ')}</p>)}</div>
    {plan.pending&&<p className="text-sm text-amber-400">A handover is pending to {plan.pending.targetEmail}. The former account is disabled. Resume with this same successor; completed steps will not be duplicated.</p>}
    {step===0? <>
     {!plan.pending&&<div className="flex gap-4 text-sm"><label><input type="radio" checked={mode==='existing'} onChange={()=>setMode('existing')}/> Existing user</label><label><input type="radio" checked={mode==='new'} onChange={()=>setMode('new')}/> New user</label></div>}
     {mode==='existing'?<label className="block text-sm">Successor<select aria-label="Successor" className="block mt-2 w-full rounded-lg p-2 bg-surface-bg border border-surface-border" value={targetId} disabled={Boolean(plan.pending)} onChange={e=>setTargetId(e.target.value)}><option value="">Select active user</option>{plan.pending&&!selected&&<option value={plan.pending.targetUserId}>{plan.pending.targetEmail}</option>}{successors.map(u=><option key={u.id} value={u.id}>{u.name} — {u.email}</option>)}</select></label>:<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{[['fullName','Full Name','text'],['email','Email Address','email'],['cid','CID / User ID Number','text'],['password','Temporary Password','password']].map(([key,label,type])=><Input key={key} label={label} type={type} required value={form[key]} onChange={e=>setForm(prev=>({...prev,[key]:e.target.value}))}/>)}</div>}
    </>:<>
     <p className="text-sm">Transfer to: <strong>{plan.pending?.targetEmail||(mode==='existing'?selected?.email:form.email)}</strong>. The successor keeps their current roles and receives the transferred staff roles.</p>
     <label className="flex gap-2 text-sm"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/> I confirm this successor is authorised to inherit these roles and responsibilities.</label>
    </>}
    <p className="text-xs text-text-muted">Active committee and question-bank assignments, saved reports and report ownership are transferred. Personal Test Taker records, past scores, approvals, uploads and audit attribution remain unchanged. The former account is archived, cannot sign in, and is hidden from the directory. The successor receives the staff role permissions, but never the former user’s password, NDI identity, CID or personal records.</p>
   </>}
  </div>
 </Modal>;
}
