import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
// Static source text of App (Vite `?raw` import — does not execute the module).
// Used only for the routing assertion (spec item C.7), matching the precedent
// set in HonestUI.test.tsx.
import appSource from '../../App.tsx?raw';
import { Auth } from '../Auth';
import { ResetPassword } from '../ResetPassword';

// This suite runs without vitest globals, so Testing Library's automatic
// afterEach cleanup never registers — unmount explicitly between tests.
afterEach(cleanup);

// ---------------------------------------------------------------------------
// Mocks — nothing touches the network or the real Supabase client.
// ---------------------------------------------------------------------------

const authApi = vi.hoisted(() => ({
  resetPasswordForEmail: vi.fn(),
  updateUser: vi.fn(),
  signInWithOAuth: vi.fn(),
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
}));

vi.mock('../../lib/supabase', () => ({
  supabase: { auth: authApi },
}));

// jsdom cannot play audio; the sound helper is irrelevant to the spec.
vi.mock('../../utils/sound', () => ({
  playSound: vi.fn(),
  setSoundEnabled: vi.fn(),
  SOUNDS: {},
}));

// Mutable auth state so each test can choose loading / session-present /
// session-absent before rendering ResetPassword.
type MockAuthValue = { user: object | null; session: object | null; loading: boolean };
const authState = vi.hoisted(() => ({
  current: { user: null, session: null, loading: false } as MockAuthValue,
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => authState.current,
}));

beforeEach(() => {
  vi.clearAllMocks();
  authState.current = { user: null, session: null, loading: false };
  authApi.resetPasswordForEmail.mockResolvedValue({ error: null });
  authApi.updateUser.mockResolvedValue({ data: {}, error: null });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TEST_EMAIL = 'student@uni.edu';

const renderAuth = () =>
  render(
    <MemoryRouter initialEntries={['/auth']}>
      <Auth />
    </MemoryRouter>
  );

/** Renders Auth and moves it into the "Reset your password" view. */
const renderRecoveryView = () => {
  const utils = renderAuth();
  fireEvent.click(screen.getByRole('button', { name: /forgot password\?/i }));
  return utils;
};

/** Fills the recovery email and submits the form. */
const submitRecovery = (email: string) => {
  fireEvent.change(screen.getByRole('textbox'), { target: { value: email } });
  fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));
};

/** Renders ResetPassword with marker routes for the navigation targets. */
const renderResetPassword = () =>
  render(
    <MemoryRouter initialEntries={['/reset-password']}>
      <Routes>
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/post-auth" element={<div>POST_AUTH_LANDING</div>} />
        <Route path="/auth" element={<div>AUTH_LANDING</div>} />
      </Routes>
    </MemoryRouter>
  );

const passwordInputs = (container: HTMLElement) =>
  container.querySelectorAll('input[type="password"]');

/** Fills the two password inputs and submits the "Set a new password" form. */
const submitNewPassword = (container: HTMLElement, newPass: string, confirmPass: string) => {
  const inputs = passwordInputs(container);
  fireEvent.change(inputs[0], { target: { value: newPass } });
  fireEvent.change(inputs[1], { target: { value: confirmPass } });
  const submit = container.querySelector('button[type="submit"]');
  expect(submit).not.toBeNull();
  fireEvent.click(submit!);
};

// ---------------------------------------------------------------------------
// A. Auth page — "Forgot password?" recovery flow
// ---------------------------------------------------------------------------

describe('Auth — Forgot password? recovery view', () => {
  it('switches from login to a recovery view without Google sign-in or a password field', () => {
    const { container } = renderAuth();

    // Starts in login mode.
    expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /forgot password\?/i }));

    expect(screen.getByRole('heading', { name: /reset your password/i })).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument(); // the email input
    expect(screen.getByRole('button', { name: /send reset link/i })).toBeInTheDocument();

    // Login-only controls must be gone.
    expect(screen.queryByText(/sign in with google/i)).not.toBeInTheDocument();
    expect(passwordInputs(container).length).toBe(0);
  });

  it('calls resetPasswordForEmail with the email and a /reset-password redirect', async () => {
    renderRecoveryView();
    submitRecovery(TEST_EMAIL);

    await waitFor(() => {
      expect(authApi.resetPasswordForEmail).toHaveBeenCalledWith(TEST_EMAIL, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
    });
  });

  it('on success shows a confirmation mentioning the email, and Back to Login returns to login', async () => {
    renderRecoveryView();
    submitRecovery(TEST_EMAIL);

    // Wait for the confirmation itself (it mentions the submitted email) —
    // the recovery form also has a "Back to login" control, so waiting on the
    // button text alone could grab the form's (soon-detached) button instead.
    await waitFor(() => expect(document.body.textContent).toContain(TEST_EMAIL));
    expect(
      screen.queryByRole('button', { name: /send reset link/i })
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /back to login/i }));
    expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
  });

  it('on failure shows the error message and stays on the recovery form', async () => {
    authApi.resetPasswordForEmail.mockResolvedValueOnce({
      error: { message: 'Rate limit exceeded' },
    });
    renderRecoveryView();
    submitRecovery(TEST_EMAIL);

    expect(await screen.findByText(/rate limit exceeded/i)).toBeInTheDocument();
    // Still on the recovery form — heading and submit button remain.
    expect(screen.getByRole('heading', { name: /reset your password/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send reset link/i })).toBeInTheDocument();
  });

  it('offers a back-to-login control on the recovery form itself, without sending anything', () => {
    renderRecoveryView();

    fireEvent.click(screen.getByRole('button', { name: /back to login/i }));

    expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
    expect(authApi.resetPasswordForEmail).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// B. ResetPassword page
// ---------------------------------------------------------------------------

describe('ResetPassword', () => {
  it('shows a loading screen (no form) while auth is loading', () => {
    authState.current = { user: null, session: null, loading: true };
    const { container } = renderResetPassword();

    expect(container.querySelector('form')).toBeNull();
    expect(passwordInputs(container).length).toBe(0);
    expect(screen.queryByRole('heading', { name: /set a new password/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/link expired/i)).not.toBeInTheDocument();
  });

  it('with a session renders the Set a new password form with two password inputs', () => {
    authState.current = { user: { id: 'u1' }, session: { user: { id: 'u1' } }, loading: false };
    const { container } = renderResetPassword();

    expect(screen.getByRole('heading', { name: /set a new password/i })).toBeInTheDocument();
    expect(passwordInputs(container).length).toBe(2);
    expect(container.querySelector('button[type="submit"]')).not.toBeNull();
  });

  it('rejects passwords shorter than 6 chars without calling updateUser', async () => {
    authState.current = { user: { id: 'u1' }, session: { user: { id: 'u1' } }, loading: false };
    const { container } = renderResetPassword();

    submitNewPassword(container, '123', '123');

    expect(await screen.findByText(/at least 6/i)).toBeInTheDocument();
    expect(authApi.updateUser).not.toHaveBeenCalled();
  });

  it('rejects mismatched passwords without calling updateUser', async () => {
    authState.current = { user: { id: 'u1' }, session: { user: { id: 'u1' } }, loading: false };
    const { container } = renderResetPassword();

    submitNewPassword(container, 'secret123', 'secret124');

    expect(await screen.findByText(/do not match/i)).toBeInTheDocument();
    expect(authApi.updateUser).not.toHaveBeenCalled();
  });

  it('on a valid submit calls updateUser with the password and navigates to /post-auth', async () => {
    authState.current = { user: { id: 'u1' }, session: { user: { id: 'u1' } }, loading: false };
    const { container } = renderResetPassword();

    submitNewPassword(container, 'secret123', 'secret123');

    await waitFor(() => {
      expect(authApi.updateUser).toHaveBeenCalledWith({ password: 'secret123' });
    });
    expect(await screen.findByText('POST_AUTH_LANDING')).toBeInTheDocument();
  });

  it('shows the updateUser error and stays on the page when the update fails', async () => {
    authState.current = { user: { id: 'u1' }, session: { user: { id: 'u1' } }, loading: false };
    authApi.updateUser.mockResolvedValueOnce({
      data: null,
      error: { message: 'Recovery token invalid' },
    });
    const { container } = renderResetPassword();

    submitNewPassword(container, 'secret123', 'secret123');

    expect(await screen.findByText(/recovery token invalid/i)).toBeInTheDocument();
    // Still on the reset page — no navigation happened.
    expect(screen.getByRole('heading', { name: /set a new password/i })).toBeInTheDocument();
    expect(screen.queryByText('POST_AUTH_LANDING')).not.toBeInTheDocument();
  });

  it('without a session shows Link Expired (no form) with a button back to /auth', () => {
    authState.current = { user: null, session: null, loading: false };
    const { container } = renderResetPassword();

    expect(screen.getByText(/link expired/i)).toBeInTheDocument();
    expect(passwordInputs(container).length).toBe(0);
    expect(container.querySelector('form')).toBeNull();

    // The expired view has a single action: return to the sign-in page.
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText('AUTH_LANDING')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// C. Routing — /reset-password exists and is NOT wrapped in PublicOnlyRoute
// ---------------------------------------------------------------------------

describe('App routing — /reset-password', () => {
  it('declares a /reset-password route rendering ResetPassword', () => {
    expect(appSource).toContain('path="/reset-password"');

    const routeTag = appSource.match(/<Route\s+path="\/reset-password"[\s\S]*?\/>/);
    expect(routeTag).not.toBeNull();
    expect(routeTag![0]).toContain('<ResetPassword');
  });

  it('does not wrap the /reset-password route in PublicOnlyRoute', () => {
    // Recovery emails sign the user in; PublicOnlyRoute would bounce them
    // away before they could set a new password.
    const routeTag = appSource.match(/<Route\s+path="\/reset-password"[\s\S]*?\/>/);
    expect(routeTag).not.toBeNull();
    expect(routeTag![0]).not.toContain('PublicOnlyRoute');
  });
});
