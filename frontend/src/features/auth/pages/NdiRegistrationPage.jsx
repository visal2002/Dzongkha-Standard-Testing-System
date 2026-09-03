/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { useNavigate } from 'react-router-dom';
import NdiScannerScreen from '../components/NdiScannerScreen';
import { useNdiProofSession } from '../useNdiProofSession';

const STATUS_MESSAGES = {
  REJECTED: 'The registration request was declined in Bhutan NDI Wallet.',
  EXPIRED: 'This registration QR code has expired. Please try again.',
  CANCELLED: 'This Bhutan NDI registration was cancelled.',
  FAILED: 'Bhutan NDI could not verify or create this account.',
};

/** Standalone Bhutan NDI account-creation screen (/ndi-register). */
export default function NdiRegistrationPage() {
  const navigate = useNavigate();
  const session = useNdiProofSession({
    successMessageKey: 'auth.account_created',
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
