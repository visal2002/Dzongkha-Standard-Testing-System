/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { useMemo, useState } from 'react';
import { Settings, CreditCard, Award, Plus, CheckCircle, Upload, Image as ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input, { Select, Textarea } from '@/components/ui/Input';
import Alert from '@/components/ui/Alert';
import Badge, { StatusBadge } from '@/components/ui/Badge';
import { Tabs, TabList, Tab, TabPanel } from '@/components/ui/Tabs';
import { appealService } from '@/features/appeals/api';
import { certificateService } from '@/features/certificates/api';
import { useApi } from '@/hooks/useApi';
import { useAuth } from '@/contexts/AuthContext';
import { hasExplicitPermissions, hasGrantedPermission } from '@/features/rbac/runtimePermissions';

const todayIso = () => new Date().toISOString().slice(0, 10);

function fileToAsset(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const dataUrl = String(reader.result);
      const [, dataBase64] = dataUrl.split(',');
      resolve({ mimeType: file.type, dataBase64 });
    };
    reader.readAsDataURL(file);
  });
}

// ─── Re-evaluation Fee ──────────────────────────────────────────────────────────

function FeeForm({ onCancel, onSaved }) {
  const [form, setForm] = useState({ code: `APPEAL-FEE-${new Date().getFullYear()}`, amountPerSkill: '', currency: 'BTN', effectiveFrom: todayIso(), effectiveTo: '' });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const submit = async () => {
    if (!form.amountPerSkill || Number(form.amountPerSkill) <= 0) { toast.error('Enter a fee amount greater than zero'); return; }
    setSaving(true);
    try {
      await appealService.createFee({
        code: form.code, amountPerSkill: Number(form.amountPerSkill), currency: form.currency,
        effectiveFrom: new Date(form.effectiveFrom).toISOString(), effectiveTo: form.effectiveTo ? new Date(form.effectiveTo).toISOString() : undefined,
      });
      toast.success('Draft fee rule created — approve it to make it active');
      onSaved();
    } catch (error) {
      toast.error(error?.message || 'Failed to create fee rule');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen onClose={onCancel} title="New Re-evaluation Fee Rule" size="sm"
      footer={<>
        <Button variant="ghost" onClick={onCancel} disabled={saving}>Cancel</Button>
        <Button loading={saving} onClick={submit}>Create Draft</Button>
      </>}>
      <div className="space-y-4">
        <Input label="Code" value={form.code} onChange={e => set('code', e.target.value)} hint="Identifies this fee rule's version lineage" />
        <div className="grid grid-cols-2 gap-4">
          <Input label="Amount Per Skill" type="number" min="0.01" step="0.01" required value={form.amountPerSkill} onChange={e => set('amountPerSkill', e.target.value)} hint="Multiplied by number of skills appealed" />
          <Select label="Currency" value={form.currency} onChange={e => set('currency', e.target.value)}>
            <option value="BTN">Bhutanese Ngultrum (BTN)</option>
            <option value="INR">Indian Rupee (INR)</option>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Effective From" type="date" required value={form.effectiveFrom} onChange={e => set('effectiveFrom', e.target.value)} />
          <Input label="Effective To (optional)" type="date" value={form.effectiveTo} onChange={e => set('effectiveTo', e.target.value)} />
        </div>
        <Alert variant="info">A new fee rule is created as Draft. Approve it below to make it the active fee for future re-evaluation payments.</Alert>
      </div>
    </Modal>
  );
}

function FeeTab() {
  const { data: activeFee, execute: reloadActive } = useApi(appealService.getActiveFee);
  const { data: fees, loading, execute: reloadFees } = useApi(appealService.listFees);
  const [showForm, setShowForm] = useState(false);
  const [approvingId, setApprovingId] = useState(null);


  const reload = () => { reloadActive(); reloadFees(); };

  const approve = async (id) => {
    setApprovingId(id);
    try {
      await appealService.approveFee(id);
      toast.success('Fee rule approved — active for future re-evaluation payments');
      reload();
    } catch (error) {
      toast.error(error?.message || 'Failed to approve fee rule');
    } finally {
      setApprovingId(null);
    }
  };

  return (
    <div className="space-y-5">
      <Alert variant="info" title="Propagation">
        Approving a fee rule here changes what a test taker is charged the next time they submit a re-evaluation request — this is the same fee-rule table the appeal payment flow already reads from, not a separate settings copy.
      </Alert>

      <div className="bg-surface-card border border-surface-border rounded-xl p-5">
        <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Active Fee</p>
        {activeFee ? (
          <div className="flex items-center gap-4">
            <div className="text-2xl font-bold text-brand-gold">{activeFee.currency} {Number(activeFee.amountPerSkill).toFixed(2)}</div>
            <div className="text-xs text-text-muted">per skill appealed · code {activeFee.code} · effective {new Date(activeFee.effectiveFrom).toLocaleDateString()}</div>
          </div>
        ) : (
          <p className="text-sm text-text-muted">No approved fee rule is currently active — re-evaluation payment will fail until one is approved.</p>
        )}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-text-primary">Fee Rule History</p>
        <Button size="sm" icon={<Plus size={14} />} onClick={() => setShowForm(true)}>New Fee Rule</Button>
      </div>

      <div className="bg-surface-card border border-surface-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="py-10 flex justify-center"><div className="w-6 h-6 border-2 border-brand-gold border-t-transparent rounded-full animate-spin" /></div>
        ) : !fees?.length ? (
          <p className="p-5 text-sm text-text-muted">No fee rules yet.</p>
        ) : (
          <div className="divide-y divide-surface-border">
            {fees.map(fee => (
              <div key={fee.id} className="flex items-center justify-between p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-text-primary">{fee.currency} {Number(fee.amountPerSkill).toFixed(2)} / skill</span>
                    <StatusBadge status={fee.status} />
                  </div>
                  <p className="text-xs text-text-muted mt-0.5">{fee.code} · effective {new Date(fee.effectiveFrom).toLocaleDateString()}{fee.effectiveTo ? ` – ${new Date(fee.effectiveTo).toLocaleDateString()}` : ''}</p>
                </div>
                {fee.status === 'DRAFT' && (
                  <Button size="xs" variant="success" icon={<CheckCircle size={12} />} loading={approvingId === fee.id} onClick={() => approve(fee.id)}>Approve</Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && <FeeForm onCancel={() => setShowForm(false)} onSaved={() => { setShowForm(false); reload(); }} />}
    </div>
  );
}

// ─── Certificate Template ───────────────────────────────────────────────────────

const RENDERED_ASSET_NOTE = 'Appears on the printed certificate, in the blank space above the Chief Executive signature line.';
const SEAL_ASSET_NOTE = 'Appears between the two signatures. Uses the transparent Dzongjuk logo by default; upload a transparent PNG to override it.';
const STORED_ONLY_NOTE = 'Stored in the template record. The approved DSTS certificate uses one fixed, pre-printed bilingual layout with its own logo/border already on it, so this image does not yet appear on the printed certificate.';

function ImageField({ label, note, rendered, onChange }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-text-secondary flex items-center gap-2">
        {label}
        <Badge variant={rendered ? 'success' : 'default'} size="sm">{rendered ? 'Appears on certificate' : 'Stored only'}</Badge>
      </label>
      <label className="flex items-center gap-2 h-9 px-3 rounded-lg border border-dashed border-surface-border bg-surface-bg cursor-pointer hover:border-brand-gold/50 transition-colors text-xs text-text-muted">
        <Upload size={13} />
        <span>Click to upload PNG or JPEG…</span>
        <input type="file" aria-label={label} accept="image/png,image/jpeg" className="hidden" onChange={e => onChange(e.target.files?.[0] ?? null)} />
      </label>
      <p className="text-[11px] text-text-muted">{note}</p>
    </div>
  );
}

export function TemplateForm({ latest, nextVersion, onCancel, onSaved }) {
  const [form, setForm] = useState({
    code: latest?.code || 'DSTS-STANDARD',
    versionNumber: nextVersion || (latest?.versionNumber || 0) + 1,
    title: latest?.title || 'Dzongkha Standard Testing System Certificate',
    declarationText: latest?.declarationText || 'This is to certify that the above-named candidate has completed the Dzongkha Standard Testing System examination conducted by the Department of Culture and Dzongkha Development (DCDD).',
    signatoryName: latest?.signatoryName || '',
    signatoryTitle: latest?.signatoryTitle || 'Chief of Examination',
    chiefExecutiveName: latest?.chiefExecutiveName || '',
    chiefExecutiveTitle: latest?.chiefExecutiveTitle || 'Chief Executive, DSTS',
    paperSize: latest?.paperSize || 'A4',
    orientation: latest?.orientation || 'PORTRAIT',
    dzongkhaFont: latest?.dzongkhaFont || 'DDC Uchen',
    validityMonths: latest?.validityMonths || 24,
    effectiveFrom: todayIso(),
    effectiveTo: '',
    testOnly: false,
  });
  const [assets, setAssets] = useState({ leftLogo: null, rightLogo: null, borderImage: null, signatureImage: null, examinationSignatureImage: null, sealImage: null });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const submit = async () => {
    if (!form.signatoryName.trim() || !form.chiefExecutiveName.trim()) { toast.error('Both signatory names are required'); return; }
    setSaving(true);
    try {
      const assetEntries = await Promise.all(
        Object.entries(assets).filter(([, file]) => file).map(async ([key, file]) => [key, await fileToAsset(file)]),
      );
      await certificateService.createTemplate({
        code: form.code, versionNumber: Number(form.versionNumber), title: form.title, declarationText: form.declarationText,
        signatoryName: form.signatoryName, signatoryTitle: form.signatoryTitle,
        chiefExecutiveName: form.chiefExecutiveName, chiefExecutiveTitle: form.chiefExecutiveTitle,
        paperSize: form.paperSize, orientation: form.orientation, dzongkhaFont: form.dzongkhaFont, validityMonths: Number(form.validityMonths),
        effectiveFrom: new Date(form.effectiveFrom).toISOString(), effectiveTo: form.effectiveTo ? new Date(form.effectiveTo).toISOString() : undefined,
        testOnly: form.testOnly,
        ...Object.fromEntries(Object.keys(assets).filter(key => latest?.[key]).map(key => { const match = /^data:(image\/(?:png|jpeg));base64,(.+)$/s.exec(latest[key]); return [key, match ? { mimeType: match[1], dataBase64: match[2] } : undefined]; })),
        ...Object.fromEntries(assetEntries),
      });
      toast.success('Draft template version created — approve it to make it active');
      onSaved();
    } catch (error) {
      toast.error(error?.message || 'Failed to create template version');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen onClose={onCancel} title="New Certificate Template Version" size="lg"
      footer={<>
        <Button variant="ghost" onClick={onCancel} disabled={saving}>Cancel</Button>
        <Button loading={saving} onClick={submit}>Create Draft</Button>
      </>}>
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <Input label="Code" value={form.code} onChange={e => set('code', e.target.value)} />
          <Input label="Version Number" type="number" min="1" value={form.versionNumber} onChange={e => set('versionNumber', e.target.value)} />
        </div>

        <div>
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Certificate Content</p>
          <Alert variant="warning" className="mb-3">Title, declaration statement and signatory titles are saved here but not yet reflected on the printed certificate — see Layout below for why.</Alert>
          <div className="space-y-4">
            <Input label="Certificate Title" value={form.title} onChange={e => set('title', e.target.value)} />
            <Textarea label="Declaration Statement" rows={3} value={form.declarationText} onChange={e => set('declarationText', e.target.value)} />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Authorized Signatory Name" required value={form.signatoryName} onChange={e => set('signatoryName', e.target.value)} hint="Stored for administration; the name is not printed on the certificate" />
              <Input label="Signatory Title" value={form.signatoryTitle} onChange={e => set('signatoryTitle', e.target.value)} />
              <Input label="Chief Executive Name" required value={form.chiefExecutiveName} onChange={e => set('chiefExecutiveName', e.target.value)} hint="Stored for administration; the name is not printed on the certificate" />
              <Input label="Chief Executive Title" value={form.chiefExecutiveTitle} onChange={e => set('chiefExecutiveTitle', e.target.value)} />
            </div>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Layout</p>
          <Alert variant="warning" className="mb-3">
            The approved DSTS certificate is one fixed, hand-measured bilingual layout (name/CID/date-of-birth/score grids in exact printed positions). Paper size and orientation are stored here but the printed certificate keeps its current fixed page size — changing them here does not resize the printed output.
          </Alert>
          <div className="grid grid-cols-3 gap-4">
            <Select label="Paper Size" value={form.paperSize} onChange={e => set('paperSize', e.target.value)}>
              <option value="A4">A4</option>
              <option value="LETTER">Letter</option>
            </Select>
            <Select label="Orientation" value={form.orientation} onChange={e => set('orientation', e.target.value)}>
              <option value="PORTRAIT">Portrait</option>
              <option value="LANDSCAPE">Landscape</option>
            </Select>
            <Input label="Certificate Validity (months)" type="number" min="1" max="240" value={form.validityMonths} onChange={e => set('validityMonths', e.target.value)} hint="Calculated from band score update date" />
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5"><ImageIcon size={13} /> Logos, Signature & Seal</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ImageField label="Left Logo" note="Appears at the top left; uses the new Dzongjuk logo when no image is uploaded." rendered onChange={file => setAssets(a => ({ ...a, leftLogo: file }))} />
            <ImageField label="Right Logo" note="Appears at the top right; preserves the original government emblem when no image is uploaded." rendered onChange={file => setAssets(a => ({ ...a, rightLogo: file }))} />
            <ImageField label="Certificate Border Image" note={STORED_ONLY_NOTE} rendered={false} onChange={file => setAssets(a => ({ ...a, borderImage: file }))} />
            <ImageField label="Chief of Examination Signature" note="Appears above the left signature line." rendered onChange={file => setAssets(a => ({ ...a, examinationSignatureImage: file }))} />
            <ImageField label="Chief Executive Signature" note={RENDERED_ASSET_NOTE} rendered onChange={file => setAssets(a => ({ ...a, signatureImage: file }))} />
            <ImageField label="Official Seal Image" note={SEAL_ASSET_NOTE} rendered onChange={file => setAssets(a => ({ ...a, sealImage: file }))} />
            <Select label="Dzongkha Font" value={form.dzongkhaFont} onChange={e => set('dzongkhaFont', e.target.value)} hint="Used for Dzongkha text in the generated PDF">
              <option value="DDC Uchen">DDC Uchen</option>
              <option value="DDC Joyig">DDC Joyig</option>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input label="Effective From" type="date" required value={form.effectiveFrom} onChange={e => set('effectiveFrom', e.target.value)} />
          <Input label="Effective To (optional)" type="date" value={form.effectiveTo} onChange={e => set('effectiveTo', e.target.value)} />
        </div>
      </div>
    </Modal>
  );
}

export function TemplateTab() {
  const { data: templates, loading, execute: reload } = useApi(certificateService.listTemplates);
  const [showForm, setShowForm] = useState(false);
  const [approvingId, setApprovingId] = useState(null);

  const [activatingTemplate, setActivatingTemplate] = useState(null);
  const [activating, setActivating] = useState(false);
  const setActive = async () => {
    setActivating(true);
    try { await certificateService.activateTemplate(activatingTemplate.id); toast.success('Default certificate template updated'); setActivatingTemplate(null); reload(); }
    catch (error) { toast.error(error?.message || 'Failed to set active template'); }
    finally { setActivating(false); }
  };
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [deletingTemplate, setDeletingTemplate] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const remove = async () => {
    setDeleting(true);
    try { await certificateService.deleteTemplate(deletingTemplate.id); toast.success('Template retired; existing certificates are preserved'); setDeletingTemplate(null); reload(); }
    catch (error) { toast.error(error?.message || 'Failed to retire template'); }
    finally { setDeleting(false); }
  };
  const latest = useMemo(() => templates?.[0] || null, [templates]);
  const active = useMemo(() => {
    const now = Date.now();
    const effective = (templates || []).filter(t => t.status === 'APPROVED'
      && new Date(t.effectiveFrom).getTime() <= now
      && (!t.effectiveTo || new Date(t.effectiveTo).getTime() > now));
    return effective.find(t => t.isDefault) || (effective.length === 1 ? effective[0] : null);
  }, [templates]);

  const approve = async (id) => {
    setApprovingId(id);
    try {
      await certificateService.approveTemplate(id);
      toast.success('Template approved — overlapping older versions were safely superseded');
      reload();
    } catch (error) {
      toast.error(error?.message || 'Failed to approve template');
    } finally {
      setApprovingId(null);
    }
  };

  return (
    <div className="space-y-5">
      <Alert variant="info" title="Propagation">
        Set Active selects the default approved template for new certificates. Existing certificates keep the template version they were issued with. Older approved templates can be reactivated after confirmation.
      </Alert>

      <div className="bg-surface-card border border-surface-border rounded-xl p-5">
        <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Active Template</p>
        {active ? (
          <div className="flex items-center gap-3">
            <Award size={20} className="text-brand-gold shrink-0" />
            <div>
              <p className="text-sm font-semibold text-text-primary">{active.code} · v{active.versionNumber}</p>
              <p className="text-xs text-text-muted">Validity {active.validityMonths} months · effective {new Date(active.effectiveFrom).toLocaleDateString()}</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-text-muted">No unique active template is selected — approve a template or use Set Active on an effective approved version.</p>
        )}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-text-primary">Template Versions</p>
        <Button size="sm" icon={<Plus size={14} />} onClick={() => { setEditingTemplate(null); setShowForm(true); }}>New Template Version</Button>
      </div>

      <div className="bg-surface-card border border-surface-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="py-10 flex justify-center"><div className="w-6 h-6 border-2 border-brand-gold border-t-transparent rounded-full animate-spin" /></div>
        ) : !templates?.length ? (
          <p className="p-5 text-sm text-text-muted">No certificate templates yet.</p>
        ) : (
          <div className="divide-y divide-surface-border">
            {templates.map(template => (
              <div key={template.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-text-primary">{template.code} · v{template.versionNumber}</span>
                      <StatusBadge status={template.status} />
                      {active?.id === template.id && <Badge variant="success" size="sm">Active / Default</Badge>}
                      {template.testOnly && <Badge variant="warning" size="sm">Test Only</Badge>}
                    </div>
                    <p className="text-xs text-text-muted mt-0.5">{template.signatoryName} / {template.chiefExecutiveName} · validity {template.validityMonths}mo · {template.dzongkhaFont || 'DDC Uchen'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {template.status === 'APPROVED' && active?.id !== template.id && <Button size="xs" variant="success" onClick={() => setActivatingTemplate(template)}>Set Active</Button>}
                    <Button size="xs" variant="secondary" onClick={() => { setEditingTemplate(template); setShowForm(true); }}>Edit</Button>
                    {template.status !== 'RETIRED' && <Button size="xs" variant="danger" onClick={() => setDeletingTemplate(template)}>Delete</Button>}
                  {template.status === 'DRAFT' && (
                    <Button size="xs" variant="success" icon={<CheckCircle size={12} />} loading={approvingId === template.id} onClick={() => approve(template.id)}>Approve</Button>
                  )}
                  </div>
                </div>
                {(template.signatureImage || template.examinationSignatureImage || template.sealImage || template.leftLogo || template.rightLogo || template.borderImage) && (
                  <div className="flex items-center gap-2 mt-3">
                    {template.leftLogo && <img src={template.leftLogo} alt="Left logo" className="h-8 w-8 object-contain rounded border border-surface-border bg-white" />}
                    {template.rightLogo && <img src={template.rightLogo} alt="Right logo" className="h-8 w-8 object-contain rounded border border-surface-border bg-white" />}
                    {template.borderImage && <img src={template.borderImage} alt="Border" className="h-8 w-8 object-contain rounded border border-surface-border bg-white" />}
                    {template.examinationSignatureImage && <img src={template.examinationSignatureImage} alt="Chief of Examination signature" className="h-8 w-16 object-contain rounded border border-surface-border bg-white" />}
                    {template.signatureImage && <img src={template.signatureImage} alt="Signature" className="h-8 w-16 object-contain rounded border border-surface-border bg-white" />}
                    {template.sealImage && <img src={template.sealImage} alt="Seal" className="h-8 w-8 object-contain rounded border border-surface-border bg-white" />}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {activatingTemplate && <Modal isOpen title="Set Default Certificate Template" onClose={() => !activating && setActivatingTemplate(null)} footer={<><Button variant="ghost" disabled={activating} onClick={() => setActivatingTemplate(null)}>Cancel</Button><Button variant="success" loading={activating} onClick={setActive}>Confirm Set Active</Button></>}><p>Use {activatingTemplate.code} · v{activatingTemplate.versionNumber} as the default for new certificates? If its effective period has ended or has not started, it will start again now with no end date. Existing certificates and QR verification remain unchanged.</p></Modal>}
      {deletingTemplate && <Modal isOpen title="Delete Certificate Template" onClose={() => !deleting && setDeletingTemplate(null)} footer={<><Button variant="ghost" disabled={deleting} onClick={() => setDeletingTemplate(null)}>Cancel</Button><Button variant="danger" loading={deleting} onClick={remove}>Delete (Retire)</Button></>}><p>This will retire {deletingTemplate.code} · v{deletingTemplate.versionNumber} and stop its use for new certificates. Existing certificates and QR verification remain available. This does not delete issued certificates.</p></Modal>}
      {showForm && <TemplateForm latest={editingTemplate || latest} nextVersion={Math.max(0, ...(templates || []).filter(t => t.code === (editingTemplate || latest)?.code).map(t => t.versionNumber)) + 1} onCancel={() => setShowForm(false)} onSaved={() => { setShowForm(false); reload(); }} />}
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────────

export default function MasterConfiguration() {
  const { user } = useAuth();
  const canFees = !hasExplicitPermissions(user) || hasGrantedPermission(user, 'appeal.fee.manage');
  const canTemplates = !hasExplicitPermissions(user) || hasGrantedPermission(user, 'certificate.template.manage');
  return (
    <div className="space-y-6">
      <PageHeader
        title="Master Configuration"
        subtitle="Certificate validity, certificate template and the re-evaluation fee — global settings that are not specific to one exam window"
        breadcrumbs={[{ label: 'DCDD' }, { label: 'Master Configuration' }]}
        icon={<Settings size={18} />}
      />

      <Tabs key={String(canFees) + String(canTemplates)} defaultValue={canFees ? "fee" : "template"}>
        <TabList>
          {canFees && <Tab value="fee" icon={<CreditCard size={13} />}>Re-evaluation Fee</Tab>}
          {canTemplates && <Tab value="template" icon={<Award size={13} />}>Certificate Template</Tab>}
        </TabList>
        <div className="mt-4">
          {canFees && <TabPanel value="fee"><FeeTab /></TabPanel>}
          {canTemplates && <TabPanel value="template"><TemplateTab /></TabPanel>}
        </div>
      </Tabs>
    </div>
  );
}
