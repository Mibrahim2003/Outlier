import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Settings } from '../Settings';

afterEach(cleanup);

// Hoisted so the vi.mock factories (which run when Settings imports its deps)
// can reference these safely.
const h = vi.hoisted(() => ({
  user: null as any,
  setUserProfile: vi.fn(),
  setUserProfileAsync: vi.fn(),
  updateUser: vi.fn(),
  signOut: vi.fn(),
}));

const PROFILE = {
  name: 'Ibrahim Tester',
  registrationNumber: '2021034',
  degree: 'BSCS',
  universityName: 'FAST NUCES',
  graduationYear: '2027',
  currentCgpa: 3.2,
  targetGpa: 3.8,
  semester: '3',
  courseCount: 5,
  gradingScale: undefined,
  aiPersona: 'tactical' as const,
  autoGenerateInsights: false,
  soundEnabled: true,
};

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: h.user, session: null, loading: false }),
}));

vi.mock('../../domain/profile/useProfile', () => ({
  useProfile: () => ({
    userProfile: PROFILE,
    isLoading: false,
    setUserProfile: h.setUserProfile,
    setUserProfileAsync: h.setUserProfileAsync,
  }),
}));

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      updateUser: h.updateUser,
      signOut: h.signOut,
    },
  },
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

beforeEach(() => {
  h.user = { id: 'u1', email: 'mj0000pppp@gmail.com', identities: [{ provider: 'email' }] };
  h.setUserProfile.mockReset();
  h.setUserProfileAsync.mockReset();
  h.setUserProfileAsync.mockResolvedValue(undefined);
  h.updateUser.mockReset();
  h.updateUser.mockResolvedValue({ error: null });
  h.signOut.mockReset();
  h.signOut.mockResolvedValue({ error: null });
});

const renderSettings = () =>
  render(
    <MemoryRouter>
      <Settings />
    </MemoryRouter>
  );

// Sections stay mounted and are hidden via the `hidden` utility class, so
// "visible" here means the wrapping <section> does not carry that class.
const sectionOf = (headingName: string) =>
  screen.getByRole('heading', { name: headingName }).closest('section')!;

const DEFAULT_LETTERS = ['A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'F'];

describe('Settings — section navigation', () => {
  it('shows 5 nav buttons, starts on Account, and switches sections on click', () => {
    const { container } = renderSettings();

    const nav = container.querySelector('nav')!;
    const navButtons = within(nav).getAllByRole('button');
    expect(navButtons).toHaveLength(5);
    expect(navButtons.map((b) => b.textContent)).toEqual([
      'Account',
      'Academic Profile',
      'Grading Scale',
      'AI Engine',
      'Feedback & Sound',
    ]);

    expect(sectionOf('Account').classList.contains('hidden')).toBe(false);
    expect(sectionOf('Academic Profile').classList.contains('hidden')).toBe(true);
    expect(sectionOf('Grading Scale').classList.contains('hidden')).toBe(true);
    expect(sectionOf('AI Engine').classList.contains('hidden')).toBe(true);
    expect(sectionOf('Feedback & Sound').classList.contains('hidden')).toBe(true);

    fireEvent.click(within(nav).getByRole('button', { name: 'Grading Scale' }));
    expect(sectionOf('Grading Scale').classList.contains('hidden')).toBe(false);
    expect(sectionOf('Account').classList.contains('hidden')).toBe(true);
  });
});

describe('Settings — Academic Profile form', () => {
  it('prefills fields from the profile and disables Save until edited', async () => {
    renderSettings();
    const section = sectionOf('Academic Profile');

    expect(within(section).getByDisplayValue('Ibrahim Tester')).toBeInTheDocument();
    expect(within(section).getByDisplayValue('2021034')).toBeInTheDocument();
    expect(within(section).getByDisplayValue('FAST NUCES')).toBeInTheDocument();
    expect(within(section).getByDisplayValue('BSCS')).toBeInTheDocument();
    expect(within(section).getByDisplayValue('2027')).toBeInTheDocument();
    expect(within(section).getByDisplayValue('3')).toBeInTheDocument();
    expect(within(section).getByDisplayValue('3.2')).toBeInTheDocument();
    expect(within(section).getByDisplayValue('3.8')).toBeInTheDocument();

    const saveBtn = within(section).getByRole('button', { name: /save changes/i });
    expect(saveBtn).toBeDisabled();

    fireEvent.change(within(section).getByDisplayValue('Ibrahim Tester'), {
      target: { value: 'Ibrahim Edited' },
    });
    await waitFor(() => expect(saveBtn).toBeEnabled());
  });

  it('rejects a cleared name with "Your name is required" and does not save', async () => {
    renderSettings();
    const section = sectionOf('Academic Profile');
    const saveBtn = within(section).getByRole('button', { name: /save changes/i });

    fireEvent.change(within(section).getByDisplayValue('Ibrahim Tester'), {
      target: { value: '' },
    });
    await waitFor(() => expect(saveBtn).toBeEnabled());
    fireEvent.click(saveBtn);

    expect(await within(section).findByText('Your name is required')).toBeInTheDocument();
    expect(h.setUserProfileAsync).not.toHaveBeenCalled();
  });

  it('rejects a CGPA above 4.0 with "Cannot exceed 4.0" and does not save', async () => {
    renderSettings();
    const section = sectionOf('Academic Profile');

    fireEvent.change(within(section).getByDisplayValue('3.2'), { target: { value: '4.5' } });
    // Submit the form directly: the input also carries a native max="4", whose
    // constraint validation would otherwise intercept a submit-button click
    // before the zod resolver gets to render its message.
    fireEvent.submit(section.querySelector('form')!);

    expect(await within(section).findByText('Cannot exceed 4.0')).toBeInTheDocument();
    expect(h.setUserProfileAsync).not.toHaveBeenCalled();
  });

  it('saves a valid edit exactly once with the full merged profile', async () => {
    renderSettings();
    const section = sectionOf('Academic Profile');
    const saveBtn = within(section).getByRole('button', { name: /save changes/i });

    fireEvent.change(within(section).getByDisplayValue('Ibrahim Tester'), {
      target: { value: 'New Name' },
    });
    await waitFor(() => expect(saveBtn).toBeEnabled());
    fireEvent.click(saveBtn);

    await waitFor(() => expect(h.setUserProfileAsync).toHaveBeenCalledTimes(1));
    // Changed field is new; untouched fields (targetGpa, aiPersona, courseCount…) survive.
    expect(h.setUserProfileAsync).toHaveBeenCalledWith({
      ...PROFILE,
      name: 'New Name',
    });
  });
});

describe('Settings — Grading Scale form', () => {
  it('shows the 11 default rows when the profile has no custom scale', () => {
    renderSettings();
    const section = sectionOf('Grading Scale');

    const letterInputs = within(section).getAllByPlaceholderText('e.g. A');
    expect(letterInputs).toHaveLength(11);
    expect(letterInputs.map((i) => (i as HTMLInputElement).value)).toEqual(DEFAULT_LETTERS);

    // Every row carries an accessible remove button.
    expect(within(section).getAllByRole('button', { name: 'Remove row' })).toHaveLength(11);
  });

  it('"Add Grade" appends a new row', () => {
    renderSettings();
    const section = sectionOf('Grading Scale');

    fireEvent.click(within(section).getByRole('button', { name: /add grade/i }));
    expect(within(section).getAllByPlaceholderText('e.g. A')).toHaveLength(12);
    expect(within(section).getAllByRole('button', { name: 'Remove row' })).toHaveLength(12);
  });

  it('rejects duplicate letter grades and does not save', async () => {
    renderSettings();
    const section = sectionOf('Grading Scale');

    const letterInputs = within(section).getAllByPlaceholderText('e.g. A');
    // Rename A- to A → collides with the existing A row.
    fireEvent.change(letterInputs[1], { target: { value: 'A' } });

    const saveBtn = within(section).getByRole('button', { name: /save changes/i });
    await waitFor(() => expect(saveBtn).toBeEnabled());
    fireEvent.click(saveBtn);

    expect(await within(section).findByText(/Duplicate grade/)).toBeInTheDocument();
    expect(h.setUserProfileAsync).not.toHaveBeenCalled();
  });

  it('rejects a GPC above 5 with "Max 5"', async () => {
    renderSettings();
    const section = sectionOf('Grading Scale');

    const gpcInputs = within(section).getAllByPlaceholderText('e.g. 4.0');
    fireEvent.change(gpcInputs[0], { target: { value: '6' } });

    const saveBtn = within(section).getByRole('button', { name: /save changes/i });
    await waitFor(() => expect(saveBtn).toBeEnabled());
    fireEvent.click(saveBtn);

    expect(await within(section).findByText('Max 5')).toBeInTheDocument();
    expect(h.setUserProfileAsync).not.toHaveBeenCalled();
  });

  it('rejects a minimum percentage above 100 with "Max 100"', async () => {
    renderSettings();
    const section = sectionOf('Grading Scale');

    const pctInputs = within(section).getAllByPlaceholderText('e.g. 85');
    fireEvent.change(pctInputs[0], { target: { value: '150' } });

    const saveBtn = within(section).getByRole('button', { name: /save changes/i });
    await waitFor(() => expect(saveBtn).toBeEnabled());
    fireEvent.click(saveBtn);

    expect(await within(section).findByText('Max 100')).toBeInTheDocument();
    expect(h.setUserProfileAsync).not.toHaveBeenCalled();
  });

  it('"Reset to Default" restores the 11 default rows', () => {
    renderSettings();
    const section = sectionOf('Grading Scale');

    fireEvent.click(within(section).getByRole('button', { name: /add grade/i }));
    expect(within(section).getAllByPlaceholderText('e.g. A')).toHaveLength(12);

    fireEvent.click(within(section).getByRole('button', { name: /reset to default/i }));
    const letterInputs = within(section).getAllByPlaceholderText('e.g. A');
    expect(letterInputs).toHaveLength(11);
    expect(letterInputs.map((i) => (i as HTMLInputElement).value)).toEqual(DEFAULT_LETTERS);
  });
});

describe('Settings — AI Engine personas', () => {
  it('renders three persona cards with aria-pressed reflecting the current selection', () => {
    renderSettings();
    const section = sectionOf('AI Engine');

    const tactical = within(section).getByRole('button', { name: /tactical/i });
    const supportive = within(section).getByRole('button', { name: /supportive/i });
    const bareMinimum = within(section).getByRole('button', { name: /bare minimum/i });

    expect(tactical).toHaveAttribute('aria-pressed', 'true');
    expect(supportive).toHaveAttribute('aria-pressed', 'false');
    expect(bareMinimum).toHaveAttribute('aria-pressed', 'false');
  });

  it('clicking a different persona applies instantly via setUserProfile', () => {
    renderSettings();
    const section = sectionOf('AI Engine');

    fireEvent.click(within(section).getByRole('button', { name: /supportive/i }));

    expect(h.setUserProfile).toHaveBeenCalledTimes(1);
    expect(h.setUserProfile).toHaveBeenCalledWith({ ...PROFILE, aiPersona: 'supportive' });
    // Instant apply — the awaitable save path is not involved.
    expect(h.setUserProfileAsync).not.toHaveBeenCalled();
  });
});

describe('Settings — Account section', () => {
  it('validates a too-short password without calling supabase', async () => {
    renderSettings();
    const section = sectionOf('Account');

    fireEvent.change(within(section).getByPlaceholderText('Min. 8 characters'), {
      target: { value: 'short12' },
    });
    fireEvent.change(within(section).getByPlaceholderText('Repeat it'), {
      target: { value: 'short12' },
    });
    fireEvent.click(within(section).getByRole('button', { name: /update password/i }));

    expect(
      await within(section).findByText('Password must be at least 8 characters.')
    ).toBeInTheDocument();
    expect(h.updateUser).not.toHaveBeenCalled();
  });

  it('validates mismatched confirmation without calling supabase', async () => {
    renderSettings();
    const section = sectionOf('Account');

    fireEvent.change(within(section).getByPlaceholderText('Min. 8 characters'), {
      target: { value: 'password123' },
    });
    fireEvent.change(within(section).getByPlaceholderText('Repeat it'), {
      target: { value: 'password124' },
    });
    fireEvent.click(within(section).getByRole('button', { name: /update password/i }));

    expect(await within(section).findByText('Passwords do not match.')).toBeInTheDocument();
    expect(h.updateUser).not.toHaveBeenCalled();
  });

  it('hides the password form for Google-only accounts and explains why', () => {
    h.user = { id: 'u1', email: 'mj0000pppp@gmail.com', identities: [{ provider: 'google' }] };
    renderSettings();
    const section = sectionOf('Account');

    expect(within(section).queryByPlaceholderText('Min. 8 characters')).not.toBeInTheDocument();
    expect(
      within(section).queryByRole('button', { name: /update password/i })
    ).not.toBeInTheDocument();
    expect(
      within(section).getByText(/password is managed by your Google account/i)
    ).toBeInTheDocument();
  });
});
