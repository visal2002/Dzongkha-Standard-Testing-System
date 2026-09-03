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
const SEAL_ASSET_NOTE = 'Appears on the printed certificate, between the two signature blocks.';
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
        <input type="file" accept="image/png,image/jpeg" className="hidden" onChange={e => onChange(e.target.files?.[0] ?? null)} />
      </label>
      <p className="text-[11px] text-text-muted">{note}</p>
    </div>
  );
}

function TemplateForm({ latest, onCancel, onSaved }) {
  const [form, setForm] = useState({
    code: latest?.code || 'DSTS-STANDARD',
    versionNumber: (latest?.versionNumber || 0) + 1,
    title: latest?.title || 'Dzongkha Standard Testing System Certificate',
    declarationText: latest?.declarationText || 'This is to certify that the above-named candidate has completed the Dzongkha Standard Testing System examination conducted by the Department of Culture and Dzongkha Development (DCDD).',
    signatoryName: latest?.signatoryName || '',
    signatoryTitle: latest?.signatoryTitle || 'Chief of Examination',
    chiefExecutiveName: latest?.chiefExecutiveName || '',
    chiefExecutiveTitle: latest?.chiefExecutiveTitle || 'Chief Executive, DSTS',
    paperSize: latest?.paperSize || 'A4',
    orientation: latest?.orientation || 'PORTRAIT',
    validityMonths: latest?.validityMonths || 24,
    effectiveFrom: todayIso(),
    effectiveTo: '',
    testOnly: false,
  });
  const [assets, setAssets] = useState({ leftLogo: null, rightLogo: null, borderImage: null, signatureImage: null, sealImage: null });
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
        paperSize: form.paperSize, orientation: form.orientation, validityMonths: Number(form.validityMonths),
        effectiveFrom: new Date(form.effectiveFrom).toISOString(), effectiveTo: form.effectiveTo ? new Date(form.effectiveTo).toISOString() : undefined,
        testOnly: form.testOnly,
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
              <Input label="Authorized Signatory Name" required value={form.signatoryName} onChange={e => set('signatoryName', e.target.value)} hint="Rendered on the certificate's signature line" />
              <Input label="Signatory Title" value={form.signatoryTitle} onChange={e => set('signatoryTitle', e.target.value)} />
              <Input label="Chief Executive Name" required value={form.chiefExecutiveName} onChange={e => set('chiefExecutiveName', e.target.value)} hint="Rendered on the certificate's signature line" />
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
            <ImageField label="Left Logo" note={STORED_ONLY_NOTE} rendered={false} onChange={file => setAssets(a => ({ ...a, leftLogo: file }))} />
            <ImageField label="Right Logo" note={STORED_ONLY_NOTE} rendered={false} onChange={file => setAssets(a => ({ ...a, rightLogo: file }))} />
            <ImageField label="Certificate Border Image" note={STORED_ONLY_NOTE} rendered={false} onChange={file => setAssets(a => ({ ...a, borderImage: file }))} />
            <ImageField label="Authorized Signature Image" note={RENDERED_ASSET_NOTE} rendered onChange={file => setAssets(a => ({ ...a, signatureImage: file }))} />
            <ImageField label="Official Seal Image" note={SEAL_ASSET_NOTE} rendered onChange={file => setAssets(a => ({ ...a, sealImage: file }))} />
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

function TemplateTab() {
  const { data: templates, loading, execute: reload } = useApi(certificateService.listTemplates);
  const [showForm, setShowForm] = useState(false);
  const [approvingId, setApprovingId] = useState(null);

  const latest = useMemo(() => templates?.[0] || null, [templates]);
  const active = useMemo(() => templates?.find(t => t.status === 'APPROVED') || null, [templates]);

  const approve = async (id) => {
    setApprovingId(id);
    try {
      await certificateService.approveTemplate(id);
      toast.success('Template approved — used for certificates generated from now on');
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
        Approving a template version here changes which template certificate generation picks up the next time a certificate is issued for an exam — the same table the certificate PDF renderer already reads from, not a separate settings copy.
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
          <p className="text-sm text-text-muted">No approved template is currently active — certificate generation will fail until one is approved.</p>
        )}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-text-primary">Template Versions</p>
        <Button size="sm" icon={<Plus size={14} />} onClick={() => setShowForm(true)}>New Template Version</Button>
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
                      {template.testOnly && <Badge variant="warning" size="sm">Test Only</Badge>}
                    </div>
                    <p className="text-xs text-text-muted mt-0.5">{template.signatoryName} / {template.chiefExecutiveName} · validity {template.validityMonths}mo</p>
                  </div>
                  {template.status === 'DRAFT' && (
                    <Button size="xs" variant="success" icon={<CheckCircle size={12} />} loading={approvingId === template.id} onClick={() => approve(template.id)}>Approve</Button>
                  )}
                </div>
                {(template.signatureImage || template.sealImage || template.leftLogo || template.rightLogo || template.borderImage) && (
                  <div className="flex items-center gap-2 mt-3">
                    {template.leftLogo && <img src={template.leftLogo} alt="Left logo" className="h-8 w-8 object-contain rounded border border-surface-border bg-white" />}
                    {template.rightLogo && <img src={template.rightLogo} alt="Right logo" className="h-8 w-8 object-contain rounded border border-surface-border bg-white" />}
                    {template.borderImage && <img src={template.borderImage} alt="Border" className="h-8 w-8 object-contain rounded border border-surface-border bg-white" />}
                    {template.signatureImage && <img src={template.signatureImage} alt="Signature" className="h-8 w-16 object-contain rounded border border-surface-border bg-white" />}
                    {template.sealImage && <img src={template.sealImage} alt="Seal" className="h-8 w-8 object-contain rounded border border-surface-border bg-white" />}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && <TemplateForm latest={latest} onCancel={() => setShowForm(false)} onSaved={() => { setShowForm(false); reload(); }} />}
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────────

export default function MasterConfiguration() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Master Configuration"
        subtitle="Certificate validity, certificate template and the re-evaluation fee — global settings that are not specific to one exam window"
        breadcrumbs={[{ label: 'DCDD' }, { label: 'Master Configuration' }]}
        icon={<Settings size={18} />}
      />

      <Tabs defaultValue="fee">
        <TabList>
          <Tab value="fee" icon={<CreditCard size={13} />}>Re-evaluation Fee</Tab>
          <Tab value="template" icon={<Award size={13} />}>Certificate Template</Tab>
        </TabList>
        <div className="mt-4">
          <TabPanel value="fee"><FeeTab /></TabPanel>
          <TabPanel value="template"><TemplateTab /></TabPanel>
        </div>
      </Tabs>
    </div>
  );
}
