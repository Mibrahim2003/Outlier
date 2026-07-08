import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { CourseFormModal } from '../CourseFormModal';
import { Course } from '../../types';

afterEach(cleanup);

const baseCourse: Course = {
  id: 'c1',
  code: 'CS-101',
  name: 'INTRO TO CS',
  credits: 3,
  gradeProgress: 40,
  impactLevel: 'standard',
  themeColor: 'pink',
  grade: 'B+',
  weightage: { quizzes: 15, assignments: 5, midterm: 30, final: 40, project: 10 },
};

const renderAdd = () => {
  const onClose = vi.fn();
  const onSubmit = vi.fn();
  render(<CourseFormModal onClose={onClose} onSubmit={onSubmit} />);
  return { onClose, onSubmit };
};

const renderEdit = (deliverableCount: number) => {
  const onClose = vi.fn();
  const onSubmit = vi.fn();
  const onDelete = vi.fn();
  render(
    <CourseFormModal
      onClose={onClose}
      onSubmit={onSubmit}
      course={baseCourse}
      onDelete={onDelete}
      deliverableCount={deliverableCount}
    />
  );
  return { onClose, onSubmit, onDelete };
};

const codeInput = () => screen.getByPlaceholderText('e.g. CS50');
const nameInput = () => screen.getByPlaceholderText('e.g. Intro to Computer Science');
const submitButton = (label: string) => screen.getByRole('button', { name: label });

// The confirmation copy is split across JSX nodes, so match on the paragraph's
// full text content.
const confirmParagraph = (snippet: string) =>
  screen.getByText(
    (_, el) => el?.tagName === 'P' && (el.textContent ?? '').includes(snippet)
  );

describe('CourseFormModal — add mode', () => {
  it('shows the Add Course header and a valid default weight indicator', () => {
    renderAdd();
    expect(screen.getByRole('heading', { name: 'Add Course' })).toBeInTheDocument();
    expect(screen.getByText('100% / 100%')).toBeInTheDocument();
  });

  it('disables submit until Course Code and Course Name are filled', () => {
    renderAdd();
    const submit = submitButton('Add Course');
    expect(submit).toBeDisabled();

    fireEvent.change(codeInput(), { target: { value: 'cs50' } });
    expect(submit).toBeDisabled();

    fireEvent.change(nameInput(), { target: { value: 'intro' } });
    expect(submit).toBeEnabled();
  });

  it('flags a broken weight sum, disables submit, and recovers when restored', () => {
    renderAdd();
    fireEvent.change(codeInput(), { target: { value: 'cs50' } });
    fireEvent.change(nameInput(), { target: { value: 'intro' } });
    const submit = submitButton('Add Course');
    expect(submit).toBeEnabled();

    // Default midterm weight is 25; bumping it to 30 makes the total 105.
    const midtermInput = screen.getByDisplayValue('25');
    fireEvent.change(midtermInput, { target: { value: '30' } });

    expect(screen.getByText('Weights must add up to exactly 100%')).toBeInTheDocument();
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByDisplayValue('30'), { target: { value: '25' } });
    expect(screen.queryByText('Weights must add up to exactly 100%')).not.toBeInTheDocument();
    expect(submit).toBeEnabled();
  });

  it('submits a normalized course (trimmed as-typed, heavy impact for 4 credits, defaults) then closes', () => {
    const { onClose, onSubmit } = renderAdd();

    // Code/name are stored as typed (only trimmed) — display uppercases via CSS,
    // so the DB keeps proper case and AI prompts don't get shouty names.
    fireEvent.change(codeInput(), { target: { value: '  cs50 ' } });
    fireEvent.change(nameInput(), { target: { value: ' Intro to CS ' } });
    fireEvent.change(screen.getByDisplayValue('3'), { target: { value: '4' } }); // credits
    fireEvent.click(submitButton('Add Course'));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const submitted = onSubmit.mock.calls[0][0];
    expect(submitted).toMatchObject({
      code: 'cs50',
      name: 'Intro to CS',
      credits: 4,
      impactLevel: 'heavy',
      themeColor: 'yellow',
      gradeProgress: 0,
      grade: 'N/A',
      weightage: { quizzes: 10, assignments: 20, midterm: 25, final: 35, project: 10 },
    });
    expect(typeof submitted.id).toBe('string');
    expect(submitted.id.length).toBeGreaterThan(0);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('derives standard impact for 3 credits and minimal below 3', () => {
    // 3 credits (the default) → standard
    const first = renderAdd();
    fireEvent.change(codeInput(), { target: { value: 'cs50' } });
    fireEvent.change(nameInput(), { target: { value: 'intro' } });
    fireEvent.click(submitButton('Add Course'));
    expect(first.onSubmit.mock.calls[0][0].impactLevel).toBe('standard');
    cleanup();

    // 2 credits → minimal
    const second = renderAdd();
    fireEvent.change(codeInput(), { target: { value: 'cs50' } });
    fireEvent.change(nameInput(), { target: { value: 'intro' } });
    fireEvent.change(screen.getByDisplayValue('3'), { target: { value: '2' } });
    fireEvent.click(submitButton('Add Course'));
    expect(second.onSubmit.mock.calls[0][0].impactLevel).toBe('minimal');
  });

  it('has no Danger Zone in add mode', () => {
    renderAdd();
    expect(screen.queryByText('Danger Zone')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete course/i })).not.toBeInTheDocument();
  });
});

describe('CourseFormModal — edit mode', () => {
  it('shows the Edit header with prefilled fields', () => {
    renderEdit(3);
    expect(screen.getByRole('heading', { name: 'Edit CS-101' })).toBeInTheDocument();
    expect(codeInput()).toHaveValue('CS-101');
    expect(nameInput()).toHaveValue('INTRO TO CS');
    expect(screen.getByDisplayValue('40')).toBeInTheDocument(); // final weight prefilled
  });

  it('requires two steps to delete, spelling out the 3 deliverables at stake', () => {
    const { onDelete, onClose } = renderEdit(3);

    // Step 1: the Danger Zone offers Delete Course but nothing is deleted yet.
    fireEvent.click(screen.getByRole('button', { name: /delete course/i }));
    expect(onDelete).not.toHaveBeenCalled();

    // Step 2: explicit confirmation names the course and its data.
    const confirmation = confirmParagraph('Delete CS-101 permanently?');
    expect(confirmation.textContent).toContain('3 recorded deliverables');

    fireEvent.click(screen.getByRole('button', { name: /yes, delete everything/i }));
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('uses the singular "deliverable" when only one would be deleted', () => {
    renderEdit(1);
    fireEvent.click(screen.getByRole('button', { name: /delete course/i }));

    const confirmation = confirmParagraph('Delete CS-101 permanently?');
    expect(confirmation.textContent).toContain('1 recorded deliverable (');
    expect(confirmation.textContent).not.toContain('deliverables');
  });

  it('omits the deliverable sentence entirely when the course has none', () => {
    renderEdit(0);
    fireEvent.click(screen.getByRole('button', { name: /delete course/i }));

    const confirmation = confirmParagraph('Delete CS-101 permanently?');
    expect(confirmation.textContent).not.toContain('recorded deliverable');
  });

  it('"Keep Course" backs out of the confirmation without deleting', () => {
    const { onDelete, onClose } = renderEdit(3);

    fireEvent.click(screen.getByRole('button', { name: /delete course/i }));
    fireEvent.click(screen.getByRole('button', { name: /keep course/i }));

    expect(onDelete).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(
      screen.queryByRole('button', { name: /yes, delete everything/i })
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete course/i })).toBeInTheDocument();
  });
});
