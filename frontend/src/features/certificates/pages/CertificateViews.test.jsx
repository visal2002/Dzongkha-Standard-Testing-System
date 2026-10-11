import { render, screen, waitFor, cleanup, act } from '@testing-library/react';
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import CertificatePrint from './CertificatePrint';
import CertificateVerify from './CertificateVerify';
const api = vi.hoisted(() => ({ download: vi.fn(), verifyQr: vi.fn() }));
vi.mock('@/features/certificates/api', () => ({ certificateService: api }));
vi.mock('react-router-dom', () => ({ useParams: () => ({id:'cert-1',token:'signed-token'}), useNavigate: () => vi.fn() }));
beforeEach(() => { vi.clearAllMocks(); URL.createObjectURL=vi.fn(()=> 'blob:certificate'); URL.revokeObjectURL=vi.fn(); });
afterEach(()=>{cleanup();vi.useRealTimers();});
describe('complete certificate views', () => {
 it('loads the authorized generated PDF instead of static template artwork', async () => { api.download.mockResolvedValue({data:new Blob(['%PDF'],{type:'application/pdf'})});render(<CertificatePrint/>);await screen.findByTitle('DSTS certificate PDF');expect(api.download).toHaveBeenCalledWith('cert-1', {signal:expect.any(AbortSignal)});expect(screen.getAllByRole('link',{name:'Download PDF'})[0]).toHaveAttribute('href','blob:certificate');expect(screen.queryByText(/template image not found/i)).toBeNull(); });
 it('shows download failures without displaying an empty certificate',async()=>{api.download.mockRejectedValue({message:'Verified profile is incomplete'});render(<CertificatePrint/>);expect(await screen.findByRole('alert')).toHaveTextContent('We couldn’t prepare your certificate');expect(screen.queryByTitle('DSTS certificate PDF')).toBeNull();});
 it('provides public validity without holder identity or score details',async()=>{api.verifyQr.mockResolvedValue({data:{valid:true,status:'ACTIVE',certificateNumber:'DSTS-TEST',issuedAt:'2026-01-01',validUntil:'2028-01-01',holderName:'Private Name'}});render(<CertificateVerify/>);await screen.findByText('Valid certificate');expect(api.verifyQr).toHaveBeenCalledWith('signed-token');expect(screen.queryByText('Private Name')).toBeNull();});
 it('handles invalid scanned links',async()=>{api.verifyQr.mockRejectedValue(new Error('Invalid'));render(<CertificateVerify/>);expect(await screen.findByRole('alert')).toHaveTextContent('invalid or unavailable');});
});

it('stops an indefinitely pending generation and offers Retry', async () => {
 vi.useFakeTimers();api.download.mockReturnValue(new Promise(()=>{}));render(<CertificatePrint/>);
 await act(async()=>{await vi.advanceTimersByTimeAsync(60000);});
 expect(screen.getByRole('alert')).toHaveTextContent('took too long');
 expect(screen.getByRole('button',{name:'Try again'})).toBeInTheDocument();
 expect(api.download.mock.calls[0][1].signal.aborted).toBe(true);
});
