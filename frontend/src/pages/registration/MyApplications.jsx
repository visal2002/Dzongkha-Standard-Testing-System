/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FileText, Plus, Calendar, MapPin } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/Badge';
import { applicationService } from '@/services/applications';
import { examService } from '@/services/exams';
import toast from 'react-hot-toast';

export default function MyApplications() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [myApps, setMyApps] = useState([]);
  const [examWindows, setExamWindows] = useState([]);
  const [loading, setLoading] = useState(true);
  const dateLocale = i18n.resolvedLanguage?.startsWith('dz') ? 'dz-BT' : 'en-GB';
  const formatDate = value => new Date(value).toLocaleDateString(dateLocale);

  useEffect(() => {
    let active = true;
    Promise.all([applicationService.getByUser(user?.id), examService.getAll()])
      .then(([applicationResponse, examResponse]) => {
        if (!active) return;
        setMyApps(applicationResponse.data);
        setExamWindows(examResponse.data);
      })
      .catch((error) => toast.error(error.message || 'Unable to load applications.'))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user?.id]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('my_applications.title')}
        subtitle={t('my_applications.subtitle')}
        breadcrumbs={[{ label: t('nav.registration') }, { label: t('my_applications.title') }]}
        icon={<FileText size={18} />}
        action={
          <Button icon={<Plus size={14} />} onClick={() => navigate('/registration/windows')}>
            {t('my_applications.new_application')}
          </Button>
        }
      />

      {loading ? (
        <div className="text-center py-16 text-sm text-text-muted">{t('my_applications.loading')}</div>
      ) : myApps.length === 0 ? (
        <div className="text-center py-16 bg-surface-card border border-surface-border rounded-2xl text-text-muted">
          <FileText size={40} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm font-medium text-text-primary">{t('my_applications.empty_title')}</p>
          <p className="text-xs mt-1 mb-4">{t('my_applications.empty_description')}</p>
          <Button size="sm" onClick={() => navigate('/registration/windows')}>{t('my_applications.browse_exams')}</Button>
        </div>
      ) : (
        <div className="space-y-4">
          {myApps.map(app => {
            const exam = examWindows.find(e => e.id === app.examId);
            return (
              <div key={app.id} className="bg-surface-card border border-surface-border rounded-2xl p-5">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <p className="text-base font-semibold text-text-primary">{exam?.title || app.examId}</p>
                    <p className="text-xs text-text-muted mt-0.5">{t('my_applications.application_id')}: {app.id}</p>
                  </div>
                  <StatusBadge status={app.status} />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-4">
                  <div>
                    <p className="text-text-muted mb-0.5">{t('my_applications.registration_number')}</p>
                    <p className="font-medium text-brand-gold">{app.registrationNumber || '—'}</p>
                  </div>
                  <div>
                    <p className="text-text-muted mb-0.5">{t('my_applications.submitted')}</p>
                    <p className="font-medium text-text-primary">{formatDate(app.submittedAt)}</p>
                  </div>
                  {exam && (
                    <>
                      <div className="flex items-start gap-1.5">
                        <Calendar size={12} className="text-brand-gold mt-0.5 shrink-0" />
                        <div>
                          <p className="text-text-muted mb-0.5">{t('my_applications.exam_date')}</p>
                          <p className="font-medium text-text-primary">{formatDate(exam.examDate)}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-1.5">
                        <MapPin size={12} className="text-brand-gold mt-0.5 shrink-0" />
                        <div>
                          <p className="text-text-muted mb-0.5">{t('my_applications.venue')}</p>
                          <p className="font-medium text-text-primary truncate">{exam.venue.split(',')[0]}</p>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {app.remarks && (
                  <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl text-xs text-amber-400 mb-4">
                    <span className="font-semibold">{t('my_applications.remarks')}: </span>{app.remarks}
                  </div>
                )}

                {/* Status timeline */}
                <div className="pt-3 border-t border-surface-border">
                  <p className="text-[10px] font-semibold text-text-muted uppercase mb-2">{t('my_applications.status_history')}</p>
                  <div className="flex items-center gap-0">
                    {(app.statusHistory?.length ? app.statusHistory : [{ status: app.status }]).map((h, i, history) => (
                      <div key={i} className="flex items-center gap-0">
                        <div className="flex flex-col items-center">
                          <div className="w-2 h-2 rounded-full bg-[#D4830A]" />
                          <div className="text-[9px] text-text-muted mt-1 text-center w-20">{t(`status.${h.status}`, { defaultValue: h.status.replace(/_/g, ' ') })}</div>
                        </div>
                        {i < history.length - 1 && <div className="w-8 h-px bg-[var(--color-surface-border)] mb-3" />}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
