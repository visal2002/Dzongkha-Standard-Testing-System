/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

/**
 * @fileoverview <DownloadCertificateButton />
 *
 * Reusable button that downloads the signed-in Test Taker's most recently issued
 * certificate as a PDF. It calls the authenticated GET /certificates/download
 * endpoint (via the shared axios client, so the bearer token and credentials are
 * attached automatically), turns the streamed response into a Blob, and saves it
 * through a transient object-URL anchor.
 *
 * While the request is in flight the button is disabled and shows a spinner
 * (delegated to the shared <Button loading />). Failures are surfaced with a
 * toast and never leave the button stuck in the loading state.
 *
 * Usage:
 *   <DownloadCertificateButton />
 *   <DownloadCertificateButton variant="secondary" size="md" label="Get my PDF" />
 *   <DownloadCertificateButton onDownloaded={() => refresh()} />
 */
import { useState } from 'react';
import { Download } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import { certificateService } from '@/features/certificates/api';

export default function DownloadCertificateButton({
  variant = 'primary',
  size = 'sm',
  className = '',
  label = 'Download Certificate',
  disabled = false,
  onDownloaded,
}) {
  const [busy, setBusy] = useState(false);

  const handleDownload = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const { blob, filename } = await certificateService.downloadOwn();
      if (!blob) throw new Error('The certificate response was empty.');

      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename || 'Certificate.pdf';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      // Revoke on the next tick so the browser has committed the download.
      setTimeout(() => window.URL.revokeObjectURL(url), 0);

      onDownloaded?.();
    } catch (error) {
      toast.error(error?.message || 'Could not download your certificate. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      loading={busy}
      disabled={disabled}
      icon={<Download size={13} />}
      onClick={handleDownload}
    >
      {busy ? 'Preparing PDF…' : label}
    </Button>
  );
}
