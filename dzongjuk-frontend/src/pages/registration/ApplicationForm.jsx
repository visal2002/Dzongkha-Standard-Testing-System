import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, ArrowRight, CheckCircle2, Send } from 'lucide-react';
import { Button, Card, CardBody, Input, Select, Stepper } from '../../components/ui';
import PageHeader from '../../components/ui/PageHeader';
import { useAuth } from '../../context/AuthContext';
import { applicationService } from '../../services/applications';
import { examService } from '../../services/exams';
import toast from 'react-hot-toast';

const steps = ['Personal Information', 'Education & Employment', 'Review'];
const dzongkhags = ['Bumthang', 'Chhukha', 'Dagana', 'Gasa', 'Haa', 'Lhuentse', 'Mongar', 'Paro', 'Pemagatshel', 'Punakha', 'Samdrup Jongkhar', 'Samtse', 'Sarpang', 'Thimphu', 'Trashigang', 'Trashiyangtse', 'Trongsa', 'Tsirang', 'Wangdue Phodrang', 'Zhemgang'];

const schema = z.object({
  fullName: z.string().trim().min(2, 'Full name is required.'),
  cid: z.string().trim().min(5, 'CID or identity number is required.').max(64),
  dateOfBirth: z.string().min(1, 'Date of birth is required.'),
  gender: z.string().min(1, 'Gender is required.'),
  email: z.string().email('Enter a valid email address.'),
  phone: z.string().trim().min(8, 'Contact number is required.'),
  dzongkhag: z.string().min(1, 'Dzongkhag is required.'),
  gewog: z.string().trim().min(2, 'Gewog is required.'),
  education: z.string().trim().min(2, 'Education level is required.'),
  institution: z.string().trim().min(2, 'Institution is required.'),
  employmentStatus: z.string().min(1, 'Employment status is required.'),
  organization: z.string().trim().optional(),
});

export default function ApplicationForm() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [exam, setExam] = useState(null);
  const [loadingExam, setLoadingExam] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submission, setSubmission] = useState(null);

  const { register, handleSubmit, reset, watch, trigger, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { fullName: '', cid: '', dateOfBirth: '', gender: '', email: '', phone: '', dzongkhag: '', gewog: '', education: '', institution: '', employmentStatus: '', organization: '' },
    mode: 'onTouched',
  });
  const values = watch();

  useEffect(() => {
    reset(current => ({
      ...current,
      fullName: user?.fullName || user?.name || '', cid: user?.cid || '', dateOfBirth: user?.dateOfBirth || '',
      email: user?.email || '', phone: user?.phone || '',
    }));
  }, [reset, user]);

  useEffect(() => {
    let active = true;
    if (!examId) { setLoadError('No examination was selected.'); setLoadingExam(false); return undefined; }
    examService.getById(examId).then(response => { if (active) setExam(response.data); })
      .catch(error => { if (active) setLoadError(error.message || 'Unable to load the examination.'); })
      .finally(() => { if (active) setLoadingExam(false); });
    return () => { active = false; };
  }, [examId]);

  const registrationIsOpen = exam?.status === 'registration_open'
    && Date.now() >= new Date(exam.registrationStart).getTime()
    && Date.now() <= new Date(exam.registrationEnd).getTime();

  const next = async () => {
    const fields = step === 0
      ? ['fullName', 'cid', 'dateOfBirth', 'gender', 'email', 'phone', 'dzongkhag', 'gewog']
      : ['education', 'institution', 'employmentStatus', 'organization'];
    if (await trigger(fields)) setStep(current => current + 1);
  };

  const submit = async data => {
    if (!registrationIsOpen) return toast.error('Registration is not open for this examination.');
    setSubmitting(true);
    try {
      const response = await applicationService.create(exam.id, { identityKey: data.cid, profileSnapshot: data });
      const result = response?.data ?? response;
      setSubmission(result);
      toast.success(result.status === 'WAITLISTED' ? 'Application added to the waitlist.' : 'Application submitted successfully.');
    } catch (error) {
      toast.error(error?.response?.data?.message || error.message || 'Application submission failed.');
    } finally { setSubmitting(false); }
  };

  if (loadingExam) return <div className="py-16 text-center text-sm text-text-muted">Loading examination...</div>;
  if (loadError || !exam) return <EmptyState title="Unable to open application" message={loadError} />;
  if (!registrationIsOpen) return <EmptyState title="Registration is not open" message={exam.status === 'registration_open' ? `Applications open on ${new Date(exam.registrationStart).toLocaleString('en-BT', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Thimphu' })}.` : `The ${exam.title} window must be set to Registration Open before applications can be submitted.`} />;

  if (submission) return (
    <div className="min-h-[60vh] flex items-center justify-center"><Card className="max-w-lg w-full"><CardBody className="text-center py-10">
      <CheckCircle2 size={56} className="mx-auto text-emerald-400 mb-4" /><h2 className="text-xl font-bold text-text-primary">Application Submitted</h2>
      <p className="text-sm text-text-secondary mt-2">Your application for {exam.title} was received.</p>
      <div className="mt-5 p-4 bg-surface-bg border border-surface-border rounded-xl"><p className="text-xs text-text-muted">Application ID</p><p className="font-mono text-sm text-brand-gold mt-1 break-all">{submission.applicationId}</p><p className="text-xs text-text-secondary mt-2">Status: {String(submission.status).replace(/_/g, ' ')}</p></div>
      <Button className="mt-5" onClick={() => navigate('/my-applications')}>View My Applications</Button>
    </CardBody></Card></div>
  );

  return <div className="space-y-6">
    <PageHeader title="Exam Registration" subtitle={`${exam.title} · ${exam.code} · Fee Nu. ${exam.paymentAmount}`} breadcrumbs={[{ label: 'Registration' }, { label: 'Apply' }]} />
    <Stepper steps={steps} currentStep={step} />
    <Card><CardBody><form onSubmit={handleSubmit(submit)}>
      {step === 0 && <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input label="Full Name" required {...register('fullName')} error={errors.fullName?.message} />
        <Input label="CID / Identity Number" required {...register('cid')} error={errors.cid?.message} hint="This identity is used to prevent duplicate applications." />
        <Input label="Date of Birth" type="date" required {...register('dateOfBirth')} error={errors.dateOfBirth?.message} />
        <Select label="Gender" required {...register('gender')} error={errors.gender?.message}><option value="">Select gender</option><option>Male</option><option>Female</option><option>Other</option></Select>
        <Input label="Email" type="email" required {...register('email')} error={errors.email?.message} />
        <Input label="Contact Number" required {...register('phone')} error={errors.phone?.message} />
        <Select label="Dzongkhag" required {...register('dzongkhag')} error={errors.dzongkhag?.message}><option value="">Select dzongkhag</option>{dzongkhags.map(item => <option key={item}>{item}</option>)}</Select>
        <Input label="Gewog" required {...register('gewog')} error={errors.gewog?.message} />
      </div>}
      {step === 1 && <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input label="Highest Education Level" required {...register('education')} error={errors.education?.message} />
        <Input label="Institution" required {...register('institution')} error={errors.institution?.message} />
        <Select label="Employment Status" required {...register('employmentStatus')} error={errors.employmentStatus?.message}><option value="">Select status</option><option>Employed</option><option>Unemployed</option><option>Student</option><option>Self-employed</option></Select>
        <Input label="Organization" {...register('organization')} error={errors.organization?.message} />
      </div>}
      {step === 2 && <div className="space-y-5"><div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl text-sm text-amber-300">Review the information carefully. The submitted profile becomes the official registration snapshot.</div><div className="grid grid-cols-1 md:grid-cols-2 gap-4">{Object.entries({ 'Full Name': values.fullName, 'CID / Identity': values.cid, 'Date of Birth': values.dateOfBirth, 'Gender': values.gender, 'Email': values.email, 'Contact': values.phone, 'Dzongkhag': values.dzongkhag, 'Gewog': values.gewog, 'Education': values.education, 'Institution': values.institution, 'Employment': values.employmentStatus, 'Organization': values.organization || '—' }).map(([label, value]) => <div key={label}><p className="text-xs text-text-muted">{label}</p><p className="text-sm font-medium text-text-primary mt-0.5">{value}</p></div>)}</div></div>}
      <div className="flex justify-between mt-8 pt-4 border-t border-surface-border"><Button type="button" variant="secondary" icon={<ArrowLeft size={14} />} onClick={() => step ? setStep(step - 1) : navigate('/registration/windows')}>{step ? 'Previous' : 'Cancel'}</Button>{step < 2 ? <Button type="button" icon={<ArrowRight size={14} />} onClick={next}>Next</Button> : <Button type="submit" loading={submitting} icon={<Send size={14} />}>Submit Application</Button>}</div>
    </form></CardBody></Card>
  </div>;
}

function EmptyState({ title, message }) {
  return <div className="py-16 text-center bg-surface-card border border-surface-border rounded-2xl"><h2 className="text-lg font-semibold text-text-primary">{title}</h2><p className="text-sm text-text-muted mt-2 max-w-xl mx-auto">{message}</p><Link to="/registration/windows"><Button className="mt-5">Back to Exam Windows</Button></Link></div>;
}
