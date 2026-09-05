/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { useNavigate } from 'react-router-dom';
import NdiScannerScreen from '../components/NdiScannerScreen';
import { useNdiProofSession } from '../useNdiProofSession';

const STATUS_MESSAGES = {
  REJECTED: 'The proof request was declined in Bhutan NDI Wallet.',
  EXPIRED: 'This QR code has expired. Please try again.',
  CANCELLED: 'This Bhutan NDI login was cancelled.',
  FAILED: 'Bhutan NDI could not validate this identity.',
};

/** Standalone Bhutan NDI sign-in screen (/ndi-login). */
export default function NdiLoginPage() {
  const navigate = useNavigate();
  const session = useNdiProofSession({
    successMessageKey: 'auth.welcome',
    statusMessages: STATUS_MESSAGES,
    unavailableMessage: 'Bhutan NDI is currently unavailable.',
    autoStart: true,
  });

  return (
    <NdiScannerScreen
      session={session}
      onBack={() => { session.cancel(); navigate('/login'); }}
    />
  );
}
