import { describe, expect, it } from 'vitest';

import { isFocusTask, isTaskOverdue } from './task';

describe('focus helpers', () => {
  const base = {
    title: 'Demo',
    description: '',
    completed: false,
    userId: 'u1'
  };

  it('includes overdue and today, excludes future and undated', () => {
    const today = '2026-08-11';

    expect(isFocusTask({ ...base, dueDate: '2026-08-10' }, today)).toBe(true);
    expect(isFocusTask({ ...base, dueDate: today }, today)).toBe(true);
    expect(isFocusTask({ ...base, dueDate: '2026-08-12' }, today)).toBe(false);
    expect(isFocusTask({ ...base, dueDate: null }, today)).toBe(false);
    expect(isFocusTask({ ...base, completed: true, dueDate: today }, today)).toBe(false);
  });

  it('detects overdue only before today', () => {
    expect(isTaskOverdue({ ...base, dueDate: '2026-08-10' }, '2026-08-11')).toBe(true);
    expect(isTaskOverdue({ ...base, dueDate: '2026-08-11' }, '2026-08-11')).toBe(false);
  });
});
