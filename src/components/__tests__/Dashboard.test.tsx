import '@testing-library/jest-dom/vitest';
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Dashboard } from '../Dashboard';

// Mock dependencies
vi.mock('../../context/StoreContext', () => ({
  useStore: () => ({
    userProfile: { name: 'Ibrahim Tester', targetGpa: 3.8 },
    courses: [
      { id: '1', credits: 3, gradeProgress: 90, impactLevel: 'heavy' },
      { id: '2', credits: 4, gradeProgress: 80, impactLevel: 'standard' }
    ],
    deadlines: [
      { id: '1', title: 'Test Deadline', dueDate: '2026-05-30' }
    ]
  })
}));

vi.mock('../../hooks/useAI', () => ({
  useAI: () => ({
    getDashboardInsight: vi.fn().mockResolvedValue('Mocked AI insight'),
    loading: false
  })
}));

vi.mock('../../utils/dateUtils', () => ({
  getGreeting: () => 'Good morning',
  getDeadlineStatus: () => ({ text: '2 days left', isUrgent: true })
}));

describe('Dashboard', () => {
  it('renders dynamic stats and enhancements correctly', () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    // 1. Check if the dynamic time-aware name is rendered
    expect(screen.getByText(/Good morning, Ibrahim/i)).toBeInTheDocument();

    // 2. Check if upcoming deadlines banner is dynamic
    expect(screen.getByText(/1 upcoming deadline/i)).toBeInTheDocument();

    // 3. Check calculated GPA and target visualization
    expect(screen.getByText('3.13 / 3.80')).toBeInTheDocument();
    
    // 4. Check active courses and pending tasks
    expect(screen.getByText('2')).toBeInTheDocument(); // Active Courses
    expect(screen.getByText('1')).toBeInTheDocument(); // Pending Tasks
    
    // 5. Check if deadline countdown badge is shown
    expect(screen.getByText('2 days left')).toBeInTheDocument();
  });
});
