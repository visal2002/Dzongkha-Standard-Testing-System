import { useEffect, useRef } from 'react';

const defaultAssets = {
  buttonLogo: '/images/NDI/ButtonNDILogo.svg',
  transparentLogo: '/images/NDI/NDItransparentlogo.svg',
  qrLogo: '/images/NDI/QRlogo.svg',
  scanIcon: '/images/NDI/scaniconimg.svg',
  playButton: '/images/NDI/PlayButton.svg',
  callIcon: '/images/NDI/Call.svg',
  mailIcon: '/images/NDI/Mail.svg',
};

function useModalFocusTrap(isOpen, onClose, dialogRef) {
  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const previousActiveElement = document.activeElement;
    const dialogNode = dialogRef.current;

    if (dialogNode) {
      const focusableElements = Array.from(
        dialogNode.querySelectorAll(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
        )
      ).filter((element) => element instanceof HTMLElement && element.offsetParent !== null);

      if (focusableElements.length > 0) {
        focusableElements[0].focus();
      }
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab' || !dialogNode) {
        return;
      }

      const focusableElements = Array.from(
        dialogNode.querySelectorAll(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
        )
      ).filter((element) => element instanceof HTMLElement && element.offsetParent !== null);

      if (focusableElements.length === 0) {
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }

      if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
      if (previousActiveElement && previousActiveElement instanceof HTMLElement) {
        previousActiveElement.focus();
      }
    };
  }, [isOpen, onClose, dialogRef]);
}

export function BhutanNDIButton({
  variant = 'filled',
  onClick,
  logoSrc = defaultAssets.buttonLogo,
  className = '',
  children = 'Login with Bhutan NDI',
  ariaLabel,
  ...props
}) {
  const isFilled = variant === 'filled';
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel || 'Login with Bhutan NDI'}
      className={[
        isFilled ? 'ndi-button-filled' : 'ndi-button-outline',
        'ndi-btn ndi-btn-hover-lift',
        className,
      ].join(' ')}
      {...props}
    >
      <img src={logoSrc} alt="" aria-hidden="true" className="h-7 w-7 shrink-0" />
      <span>{children}</span>
    </button>
  );
}

// Small utility components/styles that may still use canonical Tailwind classes
export function NDISectionTitle({ children, highlight }) {
  return (
    <h3 className="text-lg font-semibold text-slate-800">
      {children} <span className="ndi-text-primary">{highlight}</span>
    </h3>
  );
}

function NDISectionTitle({ children, highlight }) {
  return (
    <h2 className="text-3xl font-semibold text-slate-950">
      {children}{' '}
      <span className="ndi-text-primary">{highlight}</span>
    </h2>
  );
}

function NDIInstruction({ assets, className = '' }) {
  return (
    <div className={['flex flex-col gap-4 rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm', className].join(' ')}>
      <div className="flex items-center gap-3">
        <img src={assets.scanIcon} alt="Scan icon" className="h-10 w-10 shrink-0" />
        <p className="text-sm leading-6 ndi-text-secondary">
          Tap the scan button located on the menu bar and scan the QR code
        </p>
      </div>
    </div>
  );
}

function NDISupportSection({ assets }) {
  return (
    <div className="space-y-4 rounded-[20px] border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-lg font-semibold ndi-text-primary">Get Support</p>
      <div className="space-y-3 text-sm text-slate-700">
        <a
          href="mailto:ndifeedback@dhi.bt"
          className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 ndi-bg-popup px-4 py-3 transition ndi-hover-border"
          aria-label="Email Bhutan NDI support"
        >
          <img src={assets.mailIcon} alt="" aria-hidden="true" className="h-5 w-5 shrink-0" />
          <span>ndifeedback@dhi.bt</span>
        </a>
        <a
          href="tel:1199"
          className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 ndi-bg-popup px-4 py-3 transition ndi-hover-border"
          aria-label="Call Bhutan NDI support"
        >
          <img src={assets.callIcon} alt="" aria-hidden="true" className="h-5 w-5 shrink-0" />
          <span>1199</span>
        </a>
      </div>
    </div>
  );
}

function NDISupplementaryText() {
  return (
    <p className="text-sm ndi-text-secondary">
      Don’t have the Bhutan NDI Wallet?{' '}
      <span className="font-semibold ndi-text-primary">Download Now!</span>
    </p>
  );
}

function BhutanNDIModal({
  isOpen,
  onClose,
  title,
  children,
  assets = defaultAssets,
  size = 'md',
  hideCloseButton = false,
}) {
  const dialogRef = useRef(null);
  useModalFocusTrap(isOpen, onClose, dialogRef);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div
        className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
        <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ndi-modal-title"
        className={[
          'relative w-full overflow-hidden rounded-4xl border border-slate-200 ndi-bg-popup shadow-[0_24px_60px_rgba(18,65,67,0.16)]',
          size === 'lg' ? 'max-w-[720px]' : 'max-w-[590px]',
        ].join(' ')}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p id="ndi-modal-title" className="text-3xl font-semibold text-slate-950">
                {title}
              </p>
            </div>
            {!hideCloseButton && (
              <button
                type="button"
                onClick={onClose}
                className="rounded-2xl p-3 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(90,201,148,0.25)]"
                aria-label="Close Bhutan NDI modal"
              >
                <span aria-hidden="true">✕</span>
              </button>
            )}
          </div>

          <div className="mt-8 space-y-6">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function BhutanNDIDeeplinkModal({
  isOpen,
  onClose,
  onOpenWallet,
  onWatchGuide,
  assets = defaultAssets,
}) {
  return (
    <BhutanNDIModal isOpen={isOpen} onClose={onClose} title="Login with Bhutan NDI Wallet" assets={assets}>
      <div className="flex flex-col items-center gap-5 rounded-[24px] bg-white p-6 shadow-sm">
        <button
          type="button"
          onClick={onOpenWallet}
          className="inline-flex h-[50px] min-w-[300px] items-center justify-center rounded-[14px] bg-[var(--ndi-primary)] px-6 text-sm font-semibold text-white transition-transform duration-200 ease-out hover:-translate-y-[2px] hover:shadow-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(90,201,148,0.25)]"
        >
          Open Bhutan NDI Wallet
        </button>

        <NDIInstruction assets={assets} />

        <button
          type="button"
          onClick={onWatchGuide}
          className="inline-flex h-[50px] min-w-[300px] items-center justify-center gap-3 rounded-[14px] border-2 border-[var(--ndi-primary)] bg-white px-6 text-sm font-semibold text-[var(--ndi-primary)] transition-colors duration-200 hover:bg-[var(--ndi-primary)] hover:text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(90,201,148,0.25)]"
        >
          <img src={assets.playButton} alt="" aria-hidden="true" className="h-5 w-5" />
          Watch Video Guide
        </button>

        <div className="w-full rounded-[20px] bg-[var(--ndi-popup-bg)] p-5 text-center">
          <NDISupplementaryText />
        </div>

        <NDISupportSection assets={assets} />
      </div>
    </BhutanNDIModal>
  );
}

export function BhutanNDIQRScanModal({
  isOpen,
  onClose,
  onWatchGuide,
  assets = defaultAssets,
}) {
  return (
    <BhutanNDIModal isOpen={isOpen} onClose={onClose} title="Scan with Bhutan NDI Wallet" assets={assets}>
      <div className="space-y-6">
        <div className="flex justify-center">
          <img
            src={assets.transparentLogo}
            alt="Bhutan NDI logo"
            className="h-16 w-auto"
          />
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-white p-6">
          <div className="mx-auto mb-4 flex h-[260px] w-[260px] items-center justify-center rounded-[32px] border border-slate-200 bg-[var(--ndi-popup-bg)]">
            <img src={assets.qrLogo} alt="QR code placeholder" className="h-36 w-36 object-contain" />
          </div>
          <p className="text-center text-sm leading-6 text-[var(--ndi-text-secondary)]">
            Tap the scan button located on the menu bar and scan the QR code
          </p>
        </div>

        <button
          type="button"
          onClick={onWatchGuide}
          className="inline-flex h-[50px] w-full items-center justify-center gap-3 rounded-[14px] border-2 border-[var(--ndi-primary)] bg-white px-6 text-sm font-semibold text-[var(--ndi-primary)] transition-colors duration-200 hover:bg-[var(--ndi-primary)] hover:text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(90,201,148,0.25)]"
        >
          <img src={assets.playButton} alt="" aria-hidden="true" className="h-5 w-5" />
          Watch Video Guide
        </button>

        <div className="rounded-[20px] bg-[var(--ndi-popup-bg)] p-5 text-center">
          <NDISupplementaryText />
        </div>

        <NDISupportSection assets={assets} />
      </div>
    </BhutanNDIModal>
  );
}

export function BhutanNDICombinedModal({
  isOpen,
  onClose,
  onOpenWallet,
  onWatchGuide,
  assets = defaultAssets,
}) {
  return (
    <BhutanNDIModal isOpen={isOpen} onClose={onClose} title="Login with Bhutan NDI Wallet" assets={assets}>
      <div className="space-y-6">
        <button
          type="button"
          onClick={onOpenWallet}
          className="inline-flex h-[50px] w-full items-center justify-center rounded-[14px] bg-[var(--ndi-primary)] px-6 text-sm font-semibold text-white transition-transform duration-200 ease-out hover:-translate-y-[2px] hover:shadow-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(90,201,148,0.25)]"
        >
          Open Bhutan NDI Wallet
        </button>

        <div className="rounded-[28px] border border-slate-200 bg-white p-5">
          <div className="mx-auto mb-4 flex h-[240px] w-[240px] items-center justify-center rounded-[28px] border border-slate-200 bg-[var(--ndi-popup-bg)]">
            <img src={assets.qrLogo} alt="QR code placeholder" className="h-36 w-36 object-contain" />
          </div>
          <p className="text-center text-sm leading-6 text-[var(--ndi-text-secondary)]">
            Tap the scan button located on the menu bar and scan the QR code
          </p>
        </div>

        <button
          type="button"
          onClick={onWatchGuide}
          className="inline-flex h-[50px] w-full items-center justify-center gap-3 rounded-[14px] border-2 border-[var(--ndi-primary)] bg-white px-6 text-sm font-semibold text-[var(--ndi-primary)] transition-colors duration-200 hover:bg-[var(--ndi-primary)] hover:text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(90,201,148,0.25)]"
        >
          <img src={assets.playButton} alt="" aria-hidden="true" className="h-5 w-5" />
          Watch Video Guide
        </button>

        <div className="rounded-[20px] bg-[var(--ndi-popup-bg)] p-5 text-center">
          <NDISupplementaryText />
        </div>

        <NDISupportSection assets={assets} />
      </div>
    </BhutanNDIModal>
  );
}

export function BhutanNDIPageShell({ children }) {
  return (
    <section className="min-h-screen bg-slate-50 py-12 sm:py-16">
      <div className="mx-auto w-full max-w-[1200px] px-4">{children}</div>
    </section>
  );
}

// Note: replace the asset imports above with the provided Bhutan NDI brand files if you want
// better fidelity. The paths currently point to `public/images/NDI/`.
