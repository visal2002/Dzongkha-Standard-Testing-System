/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Stepper, Badge, Card, CardBody, Button, Input, Select, FileUpload } from '../../components/ui';
import { Send, ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

const steps = ['Personal Info', 'Education', 'Documents', 'Payment', 'Review'];

const dzongkhags = [
  'Bumthang', 'Chhukha', 'Dagana', 'Gasa', 'Haa', 'Lhuentse', 'Mongar',
  'Paro', 'Pemagatshel', 'Punakha', 'Samdrup Jongkhar', 'Samtse', 'Sarpang',
  'Thimphu', 'Trashigang', 'Trashiyangtse', 'Trongsa', 'Tsirang', 'Wangdue Phodrang', 'Zhemgang'
].map(d => ({ value: d, label: d }));

// Zod Schema
const applicationSchema = z.object({
  fullName: z.string().min(2, 'Full Name is required'),
  cid: z.string().length(11, 'CID must be exactly 11 digits'),
  dob: z.string().min(1, 'Date of Birth is required'),
  gender: z.string().min(1, 'Gender is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(8, 'Phone number is required'),
  dzongkhag: z.string().min(1, 'Dzongkhag is required'),
  gewog: z.string().min(1, 'Gewog is required'),
  education: z.string().min(1, 'Education Level is required'),
  institution: z.string().min(1, 'Institution is required'),
  employmentStatus: z.string().min(1, 'Employment Status is required'),
  organization: z.string().optional(),
});

export default function ApplicationForm() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [files, setFiles] = useState({ cidCard: null, photo: null, eduCert: null });

  const { register, handleSubmit, watch, trigger, formState: { errors } } = useForm({
    resolver: zodResolver(applicationSchema),
    defaultValues: {
      fullName: 'Pema Choden', cid: '11106006006', dob: '1995-03-15',
      gender: 'Female', email: 'pema.choden@gmail.com', phone: '17123456',
      dzongkhag: 'Thimphu', gewog: 'Kawang', education: 'Bachelor of Arts',
      institution: 'Sherubtse College', employmentStatus: 'Employed',
      organization: 'Ministry of Education'
    },
    mode: 'onTouched'
  });

  const formValues = watch();

  const handleNext = async () => {
    let isValid = false;
    if (step === 0) isValid = await trigger(['fullName', 'cid', 'dob', 'gender', 'email', 'phone', 'dzongkhag', 'gewog']);
    if (step === 1) isValid = await trigger(['education', 'institution', 'employmentStatus', 'organization']);
    if (step === 2) {
      if (!files.cidCard || !files.photo) {
        toast.error('Please upload required documents');
        return;
      }
      isValid = true;
    }
    if (step === 3) isValid = true;
    
    if (isValid) setStep(prev => prev + 1);
  };

  const onSubmit = (data) => {
    setSubmitted(true);
    toast.success('Application submitted successfully!');
  };

  if (submitted) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <Card style={{ maxWidth: '500px', textAlign: 'center' }}>
          <CardBody>
            <div style={{ color: 'var(--color-success-500)', marginBottom: 'var(--space-4)' }}>
              <CheckCircle2 size={64} />
            </div>
            <h2 style={{ marginBottom: 'var(--space-2)' }}>Application Submitted!</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>
              Your application for DSTS Examination - July 2026 has been submitted successfully.
              You will receive a confirmation notification shortly.
            </p>
            <div style={{ padding: 'var(--space-4)', background: 'var(--surface-bg)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-4)' }}>
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-tertiary)' }}>Application ID</p>
              <p style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>APP-2026-0006</p>
            </div>
            <Button onClick={() => navigate('/registration/applications')}>View My Applications</Button>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Apply for DSTS Examination</h1>
          <p>DSTS Examination - July 2026 • Registration Fee: Nu. 500</p>
        </div>
      </div>

      <div style={{ marginBottom: 'var(--space-6)' }}>
        <Stepper steps={steps} currentStep={step} />
      </div>

      <Card>
        <CardBody>
          <form onSubmit={handleSubmit(onSubmit)}>
            {/* Step 1: Personal Info */}
            <div style={{ display: step === 0 ? 'grid' : 'none', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <div style={{ padding: 'var(--space-3)', background: 'rgba(13, 148, 136, 0.1)', border: '1px solid rgba(13, 148, 136, 0.2)', borderRadius: 'var(--radius-md)', fontSize: 'var(--font-size-sm)', color: 'var(--color-accent-500)', marginBottom: 'var(--space-4)' }}>
                  ℹ️ Personal information has been auto-filled from your NDI/Census records
                </div>
              </div>
              <Input label="Full Name" required {...register('fullName')} error={errors.fullName?.message} />
              <Input label="CID Number" required {...register('cid')} disabled hint="Fetched from NDI" error={errors.cid?.message} />
              <Input label="Date of Birth" required type="date" {...register('dob')} error={errors.dob?.message} />
              <Select label="Gender" required {...register('gender')} error={errors.gender?.message}>
                <option value="">Select an option</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </Select>
              <Input label="Email" required type="email" {...register('email')} error={errors.email?.message} />
              <Input label="Phone" required {...register('phone')} error={errors.phone?.message} />
              <Select label="Dzongkhag" required {...register('dzongkhag')} error={errors.dzongkhag?.message}>
                <option value="">Select an option</option>
                {dzongkhags.map(d => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </Select>
              <Input label="Gewog" required {...register('gewog')} error={errors.gewog?.message} />
            </div>

            {/* Step 2: Education */}
            <div style={{ display: step === 1 ? 'grid' : 'none', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
              <Input label="Education Level" required {...register('education')} error={errors.education?.message} />
              <Input label="Institution" required {...register('institution')} error={errors.institution?.message} />
              <Select label="Employment Status" required {...register('employmentStatus')} error={errors.employmentStatus?.message}>
                <option value="">Select an option</option>
                <option value="Employed">Employed</option>
                <option value="Unemployed">Unemployed</option>
                <option value="Student">Student</option>
                <option value="Self-employed">Self-employed</option>
              </Select>
              {formValues.employmentStatus === 'Employed' && (
                <Input label="Organization" {...register('organization')} error={errors.organization?.message} />
              )}
            </div>

            {/* Step 3: Documents */}
            <div style={{ display: step === 2 ? 'grid' : 'none', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
              <FileUpload label="Citizenship ID Card *" accept=".pdf,.jpg,.png" value={files.cidCard} onChange={f => setFiles(p => ({ ...p, cidCard: f }))} hint="PDF, JPG or PNG, max 5MB" />
              <FileUpload label="Passport Size Photo *" accept=".jpg,.png" value={files.photo} onChange={f => setFiles(p => ({ ...p, photo: f }))} hint="JPG or PNG, white background" />
              <FileUpload label="Education Certificate" accept=".pdf,.jpg,.png" value={files.eduCert} onChange={f => setFiles(p => ({ ...p, eduCert: f }))} hint="Optional" />
            </div>

            {/* Step 4: Payment */}
            <div style={{ display: step === 3 ? 'block' : 'none', maxWidth: '500px', margin: '0 auto', textAlign: 'center' }}>
              <h3 style={{ marginBottom: 'var(--space-4)' }}>Registration Fee Payment</h3>
              <div style={{ padding: 'var(--space-6)', background: 'var(--surface-bg)', borderRadius: 'var(--radius-lg)', marginBottom: 'var(--space-4)' }}>
                <div style={{ fontSize: 'var(--font-size-4xl)', fontWeight: 800, color: 'var(--color-primary-500)' }}>Nu. 500</div>
                <p style={{ color: 'var(--text-tertiary)', marginTop: 'var(--space-1)' }}>DSTS Examination Fee</p>
              </div>
              <div style={{ padding: 'var(--space-4)', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-4)' }}>
                <CheckCircle2 size={20} style={{ color: 'var(--color-success-500)', marginBottom: '4px' }} />
                <p style={{ color: 'var(--color-success-500)', fontWeight: 500 }}>Payment Simulated — Paid Successfully</p>
                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>Transaction ID: TXN-{Date.now()}</p>
              </div>
            </div>

            {/* Step 5: Review */}
            <div style={{ display: step === 4 ? 'block' : 'none' }}>
              <h3 style={{ marginBottom: 'var(--space-4)' }}>Review Your Application</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                {Object.entries({ 'Full Name': formValues.fullName, 'CID': formValues.cid, 'Email': formValues.email, 'Phone': formValues.phone, 'Dzongkhag': formValues.dzongkhag, 'Education': formValues.education, 'Institution': formValues.institution, 'Employment': formValues.employmentStatus, 'Organization': formValues.organization || 'N/A', 'Payment': 'Nu. 500 (Paid)' }).map(([key, val]) => (
                  <div key={key}>
                    <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>{key}</span>
                    <p style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{val}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Navigation */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--space-8)', paddingTop: 'var(--space-4)', borderTop: '1px solid var(--surface-divider)' }}>
              <Button type="button" variant="secondary" icon={ArrowLeft} onClick={() => step > 0 ? setStep(step - 1) : navigate(-1)}>
                {step === 0 ? 'Cancel' : 'Previous'}
              </Button>
              {step < steps.length - 1 ? (
                <Button type="button" icon={ArrowRight} onClick={handleNext}>Next</Button>
              ) : (
                <Button type="submit" icon={Send}>Submit Application</Button>
              )}
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
