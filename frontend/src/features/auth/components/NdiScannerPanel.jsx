/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

/**
 * @fileoverview The Bhutan NDI scanner panel and the pieces it is built from.
 *
 * Rendered both as the whole of the standalone /ndi-login and /ndi-register
 * screens and, embedded, inside the proof modal on the main login page.
 */
import { QRCodeSVG } from 'qrcode.react';
import { AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { NDI_ASSETS } from '../ndiAssets';
import { describeNdiError, NDI_RETRY_BTN_STYLE } from '../ndiErrors';

function NdiQrFrame({ qrUrl, isLoading, error, label = 'Bhutan NDI QR code' }) {
  const { t } = useTranslation();
  return (
    <div className="ndi-scanner-qr-frame" aria-label={label}>
      {error ? (
        // Keep the exact framing of the working state: the QR placeholder stays in
        // place, dimmed, with a small badge marking it as unavailable. The reason
        // itself is shown below the instructions so the layout never collapses.
        <div style={{ position:'relative', display:'flex', alignItems:'center', justifyContent:'center', width:'100%', height:'100%' }}>
          <img
            src={NDI_ASSETS.qrLogo}
            alt=""
            aria-hidden="true"
            style={{ width:170, height:170, objectFit:'contain', filter:'grayscale(1)', opacity:0.18 }}
          />
          <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'8px', padding:'14px', textAlign:'center' }}>
            <AlertTriangle size={28} style={{ color:'#f59e0b' }} />
            <p style={{ margin:0, fontSize:'12px', fontWeight:700, color:'#334155' }}>{t('auth.qr_unavailable')}</p>
          </div>
        </div>
      ) : isLoading ? (
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', gap:'10px', color:'#5AC994' }}>
          <div style={{ width:28, height:28, borderRadius:'50%', border:'2.5px solid currentColor', borderTopColor:'transparent', animation:'spin 0.7s linear infinite' }} />
          <span style={{ fontSize:'11px', fontWeight:600 }}>{t('auth.loading_scanner')}</span>
        </div>
      ) : qrUrl ? (
        <QRCodeSVG
          value={qrUrl}
          size={170}
          level="H"
          marginSize={1}
          imageSettings={{ src: NDI_ASSETS.centerLogo, width: 34, height: 34, excavate: true }}
          title={label}
        />
      ) : (
        <img src={NDI_ASSETS.qrLogo} alt={label} style={{ width:170, height:170, objectFit:'contain' }} />
      )}
    </div>
  );
}

function NdiInstructions({ status, error, onRetry }) {
  const { t } = useTranslation();
  const reason = error ? describeNdiError(error) : null;
  return (
    <div className="ndi-scanner-instructions">
      <p>{t('auth.ndi_step1')}</p>
      <p>
        <span>{t('auth.ndi_step2_a')}</span>{' '}
        <img
          src={NDI_ASSETS.scanIcon}
          alt="Scan"
          style={{ width:22, height:22, display:'inline-block', verticalAlign:'middle', margin:'0 4px' }}
        />{' '}
        <span>{t('auth.ndi_step2_b')}</span>
      </p>

      {reason ? (
        // Same slot the "Waiting for NDI data..." line uses, so the failure state
        // keeps the working design and only explains what went wrong.
        <div
          style={{ paddingTop:'8px', display:'flex', flexDirection:'column', alignItems:'center', gap:'6px' }}
          role="alert"
          aria-live="polite"
        >
          <p style={{ fontSize:'12px', fontWeight:700, color:'#b45309' }}>{reason.title}</p>
          <p style={{ fontSize:'12px', fontWeight:500, color:'#64748b', lineHeight:1.45 }}>{reason.detail}</p>
          {reason.raw && (
            <p style={{ fontSize:'11px', fontWeight:500, color:'#94a3b8', lineHeight:1.4 }}>Details: {reason.raw}</p>
          )}
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              style={{ ...NDI_RETRY_BTN_STYLE, marginTop:'2px' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#f0fdf8'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              {t('auth.try_again')}
            </button>
          )}
        </div>
      ) : status === 'PENDING' ? (
        <p style={{ paddingTop:'6px', fontSize:'12px', fontWeight:600, color:'#38ad78', textAlign:'center' }} aria-live="polite">
          {t('auth.waiting_approval')}
        </p>
      ) : null}
    </div>
  );
}

// Official store badges, drawn as self-contained SVGs whose fixed viewBox keeps
// the artwork at its correct aspect ratio. The link only sizes the SVG by
// height, so the "GET IT ON / Google Play" and "Download on the / App Store"
// lockups scale together and can never overflow or clip.
function GooglePlayBadge() {
  return (
    <svg className="ndi-store-badge-img" viewBox="0 0 135 40" role="img" aria-label="Get it on Google Play">
      <rect x="0.5" y="0.5" width="134" height="39" rx="5" fill="#000" stroke="#A6A6A6" />
      <svg x="10" y="10.5" width="19" height="19" viewBox="0 0 512 512" aria-hidden="true">
        <path fill="#00C3FF" d="M65.4 34.2c-3 3.2-4.7 8.1-4.7 14.5v414.6c0 6.4 1.7 11.3 4.9 14.4l1.4 1.3 232.3-232.3v-5.5L67 32.9z" />
        <path fill="#FFCE00" d="m376.6 341.2-77.4-77.5v-5.5l77.5-77.5 1.7 1 91.7 52.1c26.2 14.8 26.2 39.2 0 54.1l-91.6 52z" />
        <path fill="#FF3A44" d="M378.4 340.1 299.2 261 65.4 494.8c8.6 9.1 22.9 10.3 39 1.2l274-155.9z" />
        <path fill="#00E676" d="M378.4 181.9 104.4 26.1c-16.1-9.2-30.4-8-39 1.2l233.8 233.7z" />
      </svg>
      <text x="34" y="14.5" fill="#fff" fontFamily="'Roboto',Arial,sans-serif" fontSize="6" letterSpacing="0.9">GET IT ON</text>
      <text x="33.5" y="29" fill="#fff" fontFamily="'Roboto',Arial,sans-serif" fontSize="14.5" fontWeight="500">Google Play</text>
    </svg>
  );
}

function AppStoreBadge() {
  return (
    <svg className="ndi-store-badge-img" viewBox="0 0 120 40" role="img" aria-label="Download on the App Store">
      <rect x="0.5" y="0.5" width="119" height="39" rx="6" fill="#000" stroke="#A6A6A6" />
      <svg x="9" y="8.5" width="23" height="23" viewBox="0 0 24 24" fill="#fff" aria-hidden="true">
        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.32c.67-.82 1.12-1.96.99-3.1-.97.04-2.14.65-2.84 1.46-.62.72-1.16 1.88-1.01 3 .01 0 .04.01.07.01 1.08 0 2.18-.55 2.79-1.37z" />
      </svg>
      <text x="35" y="15.5" fill="#fff" fontFamily="'Helvetica Neue',Arial,sans-serif" fontSize="6.5">Download on the</text>
      <text x="34.5" y="30" fill="#fff" fontFamily="'Helvetica Neue',Arial,sans-serif" fontSize="16" fontWeight="500">App Store</text>
    </svg>
  );
}

function StoreBadges() {
  return (
    <div className="ndi-store-badges">
      <a
        href="https://play.google.com/store/search?q=NDI%20Bhutan&c=apps&hl=en"
        target="_blank"
        rel="noreferrer"
        className="ndi-store-badge"
        aria-label="Get Bhutan NDI Wallet on Google Play"
      >
        <GooglePlayBadge />
      </a>

      <a
        href="https://apps.apple.com/bt/app/bhutan-ndi/id1645493166"
        target="_blank"
        rel="noreferrer"
        className="ndi-store-badge"
        aria-label="Download Bhutan NDI Wallet on the App Store"
      >
        <AppStoreBadge />
      </a>
    </div>
  );
}

function NdiSupport() {
  const { t } = useTranslation();
  return (
    <div className="ndi-support">
      <p>{t('auth.get_support')}</p>
      <div>
        <a href="mailto:ndifeedback@bhutanndi.bt">
          <img src={NDI_ASSETS.mailIcon} alt="" aria-hidden="true" />
          <span>ndifeedback@bhutanndi.bt</span>
        </a>
        <a href="tel:1199">
          <img src={NDI_ASSETS.callIcon} alt="" aria-hidden="true" />
          <span>1199</span>
        </a>
      </div>
    </div>
  );
}

/**
 * The central NDI scanner panel — matches the reference design.
 * Used both as a full-page panel and inside the modal.
 */
export default function NdiScannerPanel({ qrUrl, deepLinkUrl, isLoading, error, status, onRetry, embedded = false }) {
  const { t } = useTranslation();
  // The mock backend hands back a `mock:` proof URL that no wallet can open, so only
  // fall back to the QR value when it is a real navigable link.
  const walletHref = deepLinkUrl
    || (qrUrl && !qrUrl.startsWith('mock:') ? qrUrl : undefined);
  return (
    <section className={embedded ? 'ndi-scanner-panel ndi-scanner-panel-embedded' : 'ndi-scanner-panel'}>
      <h1 className="ndi-scanner-title">
        <span className="ndi-title-web">{t('auth.scan_title')}</span>
        <span className="ndi-title-mobile">{t('auth.ndi_wallet_login_title')}</span>
      </h1>

      {/* Mobile-only lead: the deep-link button and an OR separator sit above the QR
          on small screens so a phone user can jump straight into the wallet app. */}
      <div className="ndi-mobile-lead">
        <a
          href={walletHref}
          target="_blank"
          rel="noreferrer"
          className="ndi-open-wallet"
        >
          {t('auth.ndi_open_wallet_btn')}
        </a>
        <div className="ndi-scanner-divider" aria-hidden="true">
          <span />
          <em>{t('auth.or')}</em>
          <span />
        </div>
      </div>

      <NdiQrFrame
        qrUrl={qrUrl}
        isLoading={isLoading}
        error={error}
        label="Bhutan NDI scanner QR code"
      />

      <NdiInstructions status={status} error={error} onRetry={onRetry} />

      <a
        href="https://www.youtube.com/@bhutanndi"
        target="_blank"
        rel="noreferrer"
        className="ndi-video-guide"
      >
        <span>{t('auth.watch_video')}</span>
        <span className="ndi-video-guide__icon" aria-hidden="true" />
      </a>

      <p className="ndi-download-copy">
        {t('auth.dont_have_wallet')}{' '}
        <a href="https://www.bhutanndi.com" target="_blank" rel="noreferrer">
          {t('auth.download_now')}
        </a>
      </p>

      <StoreBadges />
      <NdiSupport />
    </section>
  );
}
