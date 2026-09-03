/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import NdiScannerPanel from './NdiScannerPanel';

/** NDI login modal shown over the main LoginPage */
export default function NdiProofModal({ login, status, error, onClose, onRetry }) {
  const { t } = useTranslation();
  if (!login) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ndi-modal-title"
      style={{
        position:'fixed', inset:0, zIndex:50,
        display:'flex', alignItems:'center', justifyContent:'center',
        padding:'12px',
        background:'rgba(2,6,23,0.72)',
        backdropFilter:'blur(4px)',
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        style={{
          position:'relative',
          width:'100%',
          maxWidth:'520px',
          maxHeight:'94vh',
          overflowY:'auto',
          borderRadius:'32px',
          background:'#F8F8F8',
          boxShadow:'0 32px 80px rgba(0,0,0,0.28)',
        }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={t('auth.close_ndi')}
          style={{
            position:'absolute', top:16, right:16, zIndex:1,
            width:36, height:36, borderRadius:'50%',
            border:'none', background:'rgba(0,0,0,0.06)',
            display:'flex', alignItems:'center', justifyContent:'center',
            cursor:'pointer', color:'#64748b', transition:'background .15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background='rgba(0,0,0,0.12)'}
          onMouseLeave={e => e.currentTarget.style.background='rgba(0,0,0,0.06)'}
        >
          <X size={18} />
        </button>
        <NdiScannerPanel
          qrUrl={login.proofRequestUrl}
          deepLinkUrl={login.deepLinkUrl}
          isLoading={false}
          error={error}
          status={status}
          onRetry={onRetry}
          embedded
        />
      </motion.div>
    </div>
  );
}
