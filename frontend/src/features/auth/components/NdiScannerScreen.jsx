/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

/**
 * Full-page shell for the standalone Bhutan NDI screens: a back link plus the
 * scanner panel. /ndi-login and /ndi-register differ only in their copy, so they
 * share this shell and the useNdiProofSession hook rather than each carrying a
 * copy of the same layout and poll loop.
 */
import { ChevronLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import NdiScannerPanel from './NdiScannerPanel';

export default function NdiScannerScreen({ session, onBack }) {
  const { t } = useTranslation();
  return (
    <main className="ndi-scanner-page">
      <button type="button" onClick={onBack} className="ndi-scanner-back">
        <ChevronLeft size={18} />
        {t('auth.back_to_login')}
      </button>
      <NdiScannerPanel
        qrUrl={session.request?.proofRequestUrl}
        deepLinkUrl={session.request?.deepLinkUrl}
        isLoading={session.isLoading}
        error={session.error}
        status={session.status}
        onRetry={session.start}
      />
    </main>
  );
}
