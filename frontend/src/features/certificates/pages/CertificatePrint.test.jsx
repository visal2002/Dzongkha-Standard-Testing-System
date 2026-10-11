import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { afterEach, it, expect, vi } from 'vitest';
import CertificatePrint from './CertificatePrint';
const api=vi.hoisted(()=>({download:vi.fn()}));
vi.mock('@/features/certificates/api',()=>({certificateService:api}));
const page=()=>render(<MemoryRouter initialEntries={['/certificates/print/example']}><Routes><Route path="/certificates/print/:id" element={<CertificatePrint/>}/></Routes></MemoryRouter>);
afterEach(()=>{cleanup();vi.resetAllMocks();});
it('shows an accessible loader while the PDF is being prepared',()=>{
 api.download.mockReturnValue(new Promise(()=>{}));page();
 expect(screen.getByRole('status')).toHaveTextContent('Preparing your certificate');
 expect(screen.getByRole('heading',{name:/Your achievement/})).toBeInTheDocument();
 expect(screen.queryByTitle('DSTS certificate PDF')).not.toBeInTheDocument();
});
it('replaces loading with the PDF and releases its object URL on unmount',async()=>{
 URL.createObjectURL=vi.fn(()=> 'blob:certificate');URL.revokeObjectURL=vi.fn();
 api.download.mockResolvedValue({data:new Blob(['pdf'],{type:'application/pdf'})});const view=page();
 await waitFor(()=>expect(screen.getByTitle('DSTS certificate PDF')).toHaveAttribute('src','blob:certificate'));
 expect(screen.getAllByRole('link',{name:'Download PDF'})[0]).toHaveAttribute('download','DSTS_Certificate.pdf');
 expect(screen.queryByRole('status')).not.toBeInTheDocument();view.unmount();expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:certificate');
});
it('offers a friendly retry without reloading the page',async()=>{
 api.download.mockRejectedValueOnce(new Error('technical error')).mockReturnValue(new Promise(()=>{}));page();
 await screen.findByRole('alert');expect(screen.queryByText('technical error')).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Try again'}));await waitFor(()=>expect(api.download).toHaveBeenCalledTimes(2));
 expect(screen.getByRole('status')).toHaveTextContent('Preparing your certificate');
});
