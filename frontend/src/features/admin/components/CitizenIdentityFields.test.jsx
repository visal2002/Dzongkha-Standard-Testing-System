import { useState } from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import CitizenIdentityFields from './CitizenIdentityFields';
import { applicationService } from '@/features/registration/api';
vi.mock('@/features/registration/api', () => ({ applicationService: { lookupCitizen: vi.fn() } }));
const profile = cid => ({ cid, fullName: 'Citizen Test', dateOfBirth: '1990-01-01', gender: 'F', phone: '+97517123456' });
function Harness() {
 const [form, setForm] = useState({ cid: '', name: '', email: 'preserved@example.test' });
 return <><CitizenIdentityFields form={form} setForm={setForm} /><output data-testid="state">{JSON.stringify(form)}</output></>;
}
afterEach(() => { cleanup(); vi.resetAllMocks(); });
describe('admin citizen lookup', () => {
 it('puts CID first and fills census details without changing email', async () => {
  applicationService.lookupCitizen.mockResolvedValue(profile('11111111111'));render(<Harness />);
  expect(screen.getAllByRole('textbox')[0]).toBe(screen.getByLabelText(/Citizenship ID/));
  fireEvent.change(screen.getByLabelText(/Citizenship ID/), { target: { value: '11111111111' } });
  await waitFor(() => expect(screen.getByLabelText(/Full Name/)).toHaveValue('Citizen Test'));
  expect(screen.getByLabelText('Date of Birth')).toHaveValue('1990-01-01');
  expect(screen.getByLabelText('Gender')).toHaveValue('Female');
  expect(screen.getByLabelText('Contact No.')).toHaveValue('17123456');
  expect(JSON.parse(screen.getByTestId('state').textContent).email).toBe('preserved@example.test');
 });
 it('does not look up incomplete CIDs and permits manual entry on failure', async () => {
  applicationService.lookupCitizen.mockRejectedValue(new Error('unavailable'));render(<Harness />);
  fireEvent.change(screen.getByLabelText(/Citizenship ID/), { target: { value: '123' } });
  expect(applicationService.lookupCitizen).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText(/Citizenship ID/), { target: { value: '11111111111' } });
  await screen.findByText(/DCRC could not retrieve/);
  expect(screen.getByLabelText(/Full Name/)).not.toHaveAttribute('readonly');
  expect(screen.getByRole('button', { name: 'Retry lookup' })).toBeInTheDocument();
 });
 it('clears previous details and ignores stale responses after the CID changes', async () => {
  let resolve; applicationService.lookupCitizen.mockImplementationOnce(() => new Promise(r => { resolve = r; })).mockResolvedValue(profile('22222222222'));
  render(<Harness />);fireEvent.change(screen.getByLabelText(/Citizenship ID/), { target: { value: '11111111111' } });
  await waitFor(() => expect(applicationService.lookupCitizen).toHaveBeenCalled());
  fireEvent.change(screen.getByLabelText(/Citizenship ID/), { target: { value: '22222222222' } });
  resolve({ ...profile('11111111111'), fullName: 'Wrong Citizen' });
  await waitFor(() => expect(screen.getByLabelText(/Full Name/)).toHaveValue('Citizen Test'));
  expect(JSON.parse(screen.getByTestId('state').textContent).cid).toBe('22222222222');
  fireEvent.change(screen.getByLabelText(/Citizenship ID/), { target: { value: '' } });
  expect(screen.getByLabelText(/Full Name/)).toHaveValue('');
  expect(screen.queryByLabelText('Date of Birth')).not.toBeInTheDocument();
 });
});
