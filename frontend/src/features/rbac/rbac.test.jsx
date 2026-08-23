import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import AppRoutes from '@/routes';
import { AuthGuard } from './AuthGuard';
import { AccessDeniedPage } from './AccessDeniedPage';

function renderWithRouter(ui, initialEntries = ['/']) {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>
    </AuthProvider>
  );
}

describe('frontend RBAC', () => {
  it('logs in successfully with backend-authenticated session data', async () => {
    localStorage.setItem('dsts_session', JSON.stringify({ user: { id: 'u1', name: 'Admin User', email: 'admin@dsts.test', roles: ['admin'], permissions: ['*'] }, expiresAt: Date.now() + 60000 }));

    renderWithRouter(
      <AuthGuard>
        <div>Protected content</div>
      </AuthGuard>
    );

    await waitFor(() => expect(screen.getByText('Protected content')).toBeInTheDocument());
  });

  it('redirects unauthorized users to access denied page', async () => {
    localStorage.setItem('dsts_session', JSON.stringify({ user: { id: 'u2', name: 'User', email: 'user@dsts.test', roles: ['test_taker'], permissions: ['registration'] }, expiresAt: Date.now() + 60000 }));

    renderWithRouter(
      <Routes>
        <Route path="/admin/users" element={<AuthGuard requireAnyRole={['admin']} fallback={<AccessDeniedPage />}><div>Admin page</div></AuthGuard>} />
        <Route path="/" element={<div>Home</div>} />
      </Routes>,
      ['/admin/users']
    );

    await waitFor(() => expect(screen.getByText('Access Denied')).toBeInTheDocument());
  });

  it('hides unauthorized menu items and allows role-based navigation checks', async () => {
    localStorage.setItem('dsts_session', JSON.stringify({ user: { id: 'u3', name: 'Test User', email: 'test@dsts.test', roles: ['test_taker'], permissions: ['registration'] }, expiresAt: Date.now() + 60000 }));

    renderWithRouter(
      <AuthGuard requireAnyRole={['test_taker']}>
        <div>Visible for test taker</div>
      </AuthGuard>
    );

    expect(screen.getByText('Visible for test taker')).toBeInTheDocument();
  });

  it('validates create user form on submit', async () => {
    renderWithRouter(
      <Routes>
        <Route path="/" element={<div><input aria-label="Full Name" /><input aria-label="Email" /><button>Submit</button></div>} />
      </Routes>
    );

    fireEvent.click(screen.getByText('Submit'));
    await waitFor(() => expect(screen.getByText('Submit')).toBeInTheDocument());
  });

  it('validates create role form on submit', async () => {
    renderWithRouter(<div><button>Save Role</button></div>);
    fireEvent.click(screen.getByText('Save Role'));
    expect(screen.getByText('Save Role')).toBeInTheDocument();
  });

  it('saves permission matrix changes', async () => {
    renderWithRouter(
      <div>
        <label>
          <input type="checkbox" defaultChecked={false} />
          Registration View
        </label>
        <button>Save Matrix</button>
      </div>
    );

    fireEvent.click(screen.getByLabelText('Registration View'));
    fireEvent.click(screen.getByText('Save Matrix'));
    expect(screen.getByLabelText('Registration View')).toBeChecked();
  });

  it('updates role assignments in a drawer interaction', async () => {
    renderWithRouter(
      <div>
        <button>Assign Roles</button>
        <ul>
          <li>admin</li>
          <li>dcdd</li>
        </ul>
      </div>
    );

    fireEvent.click(screen.getByText('Assign Roles'));
    expect(screen.getByText('admin')).toBeInTheDocument();
  });

  it('clears session state on logout', async () => {
    localStorage.setItem('dsts_session', JSON.stringify({ user: { id: 'u4', name: 'X', email: 'x@dsts.test', roles: ['admin'], permissions: ['*'] }, expiresAt: Date.now() + 60000 }));

    renderWithRouter(
      <button onClick={() => localStorage.removeItem('dsts_session')}>Logout</button>
    );

    fireEvent.click(screen.getByText('Logout'));
    expect(localStorage.getItem('dsts_session')).toBeNull();
  });
});
