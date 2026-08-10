/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { useState } from 'react';
import { Settings, Save, Award, CreditCard, Clock } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import Input, { Select, Textarea } from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import { Tabs, TabList, Tab, TabPanel } from '../../components/ui/Tabs';
import { masterService } from '../../services/masters';
import { useApi } from '../../hooks/useApi';
import toast from 'react-hot-toast';

export default function MasterConfiguration() {
  const { data: masterConfig, loading: loadingConfig } = useApi(masterService.getConfig);
  const [config, setConfig] = useState(null);
  const [saving, setSaving] = useState(false);

  // Sync local state from API data when it loads
  const effectiveConfig = config || masterConfig;

  const handleSave = async () => {
    setSaving(true);
    try {
      await masterService.updateConfig(effectiveConfig);
      toast.success('Master configuration saved successfully');
    } catch {
      toast.error('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Master Configuration"
        subtitle="Configure global system parameters, fees, and certificate settings"
        breadcrumbs={[{ label: 'Administration' }, { label: 'Configuration' }]}
        icon={<Settings size={18} />}
        action={<Button loading={saving} onClick={handleSave} disabled={loadingConfig} icon={<Save size={14} />}>Save Changes</Button>}
      />

      <Alert variant="info" title="Configuration Impact">
        Changes to master configuration will apply to all future registrations and certificates. Existing records are not affected.
      </Alert>

      <Tabs defaultValue="fees">
        <TabList>
          <Tab value="fees" icon={<CreditCard size={13} />}>Fees & Payments</Tab>
          <Tab value="certificate" icon={<Award size={13} />}>Certificate</Tab>
          <Tab value="scoring" icon={<Settings size={13} />}>Scoring</Tab>
          <Tab value="notifications" icon={<Clock size={13} />}>Notifications</Tab>
        </TabList>

        <div className="mt-4">
          {loadingConfig ? (
            <div className="py-12 flex justify-center"><div className="w-8 h-8 border-2 border-brand-gold border-t-transparent rounded-full animate-spin" /></div>
          ) : (
          <>
          <TabPanel value="fees">
            <div className="bg-surface-card border border-surface-border rounded-xl p-5 grid grid-cols-2 gap-5">
              <Input
                label="Registration Fee (Nu.)"
                type="number"
                value={effectiveConfig?.registrationFee ?? ''}
                onChange={e => setConfig(p => ({ ...(p || effectiveConfig), registrationFee: +e.target.value }))}
                hint="Applied to all new registrations"
              />
              <Input
                label="Appeal Fee — Base (Nu.)"
                type="number"
                value={effectiveConfig?.appealFee ?? ''}
                onChange={e => setConfig(p => ({ ...(p || effectiveConfig), appealFee: +e.target.value }))}
              />
              <Input
                label="Appeal Fee Per Skill (Nu.)"
                type="number"
                value={effectiveConfig?.appealFeePerSkill ?? ''}
                onChange={e => setConfig(p => ({ ...(p || effectiveConfig), appealFeePerSkill: +e.target.value }))}
                hint="Multiplied by number of skills appealed"
              />
            </div>
          </TabPanel>

          <TabPanel value="certificate">
            <div className="bg-surface-card border border-surface-border rounded-xl p-5 space-y-5">
              <div className="grid grid-cols-2 gap-5">
                <Input
                  label="Certificate Validity (months)"
                  type="number"
                  value={effectiveConfig?.certificateValidity ?? ''}
                  onChange={e => setConfig(p => ({ ...(p || effectiveConfig), certificateValidity: +e.target.value }))}
                />
                <Select label="Paper Size" value={effectiveConfig?.certificateTemplate?.paperSize ?? ''} onChange={e => setConfig(p => ({ ...(p || effectiveConfig), certificateTemplate: { ...(p || effectiveConfig).certificateTemplate, paperSize: e.target.value } }))}>
                  <option>A4</option>
                  <option>A3</option>
                  <option>Letter</option>
                </Select>
                <Select label="Orientation" value={effectiveConfig?.certificateTemplate?.orientation ?? ''} onChange={e => setConfig(p => ({ ...(p || effectiveConfig), certificateTemplate: { ...(p || effectiveConfig).certificateTemplate, orientation: e.target.value } }))}>
                  <option>landscape</option>
                  <option>portrait</option>
                </Select>
                <Input
                  label="Certificate Title"
                  value={effectiveConfig?.certificateTemplate?.title ?? ''}
                  onChange={e => setConfig(p => ({ ...(p || effectiveConfig), certificateTemplate: { ...(p || effectiveConfig).certificateTemplate, title: e.target.value } }))}
                />
                <Input
                  label="Authorized Signatory"
                  value={effectiveConfig?.certificateTemplate?.authorizedSignatureName ?? ''}
                  onChange={e => setConfig(p => ({ ...(p || effectiveConfig), certificateTemplate: { ...(p || effectiveConfig).certificateTemplate, authorizedSignatureName: e.target.value } }))}
                />
              </div>
              <Textarea
                label="Declaration Statement"
                rows={3}
                value={effectiveConfig?.certificateTemplate?.declarationStatement ?? ''}
                onChange={e => setConfig(p => ({ ...(p || effectiveConfig), certificateTemplate: { ...(p || effectiveConfig).certificateTemplate, declarationStatement: e.target.value } }))}
              />
            </div>
          </TabPanel>

          <TabPanel value="scoring">
            <div className="bg-surface-card border border-surface-border rounded-xl p-5 space-y-5">
              <div className="grid grid-cols-3 gap-5">
                <Input label="Max Band Score" type="number" value={effectiveConfig?.maxBandScore ?? ''} readOnly hint="Fixed at 9.0 per CEFR" />
                <Input label="Min Band Score" type="number" value={effectiveConfig?.minBandScore ?? ''} readOnly />
                <Input label="Score Step" type="number" value={effectiveConfig?.bandScoreStep ?? ''} step="0.5" hint="0.5 increment" readOnly />
              </div>
              <div>
                <p className="text-sm font-semibold text-text-primary mb-3">CEFR Band Levels</p>
                <div className="space-y-2">
                  {(effectiveConfig?.bandLevels || []).map(bl => (
                    <div key={bl.level} className="flex items-center gap-4 p-3 bg-surface-bg rounded-xl border border-surface-border">
                      <span className="text-sm font-bold text-brand-gold w-8">{bl.level}</span>
                      <span className="text-xs text-text-muted w-20">{bl.min}–{bl.max}</span>
                      <span className="text-xs text-text-secondary">{bl.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabPanel>

          <TabPanel value="notifications">
            <div className="bg-surface-card border border-surface-border rounded-xl p-5 space-y-4">
              {Object.entries(effectiveConfig?.notificationTemplates || {}).map(([key, val]) => (
                <Textarea
                  key={key}
                  label={key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}
                  rows={2}
                  value={val}
                  onChange={e => setConfig(p => ({ ...(p || effectiveConfig), notificationTemplates: { ...(p || effectiveConfig).notificationTemplates, [key]: e.target.value } }))}
                  hint="Use {name}, {examTitle}, {appId}, {regNumber}, {remarks}, {status} as placeholders"
                />
              ))}
            </div>
          </TabPanel>
          </>
          )}
        </div>
      </Tabs>
    </div>
  );
}
