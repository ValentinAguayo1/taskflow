export interface Task {
  id?: string;
  title: string;
  description: string;
  completed: boolean;
  createdAt?: Date;
  dueDate?: string | null;
  order?: number;
  userId: string;
}

export type TaskFilter = 'all' | 'pending' | 'completed' | 'focus';

export const TASKS_COLLECTION = 'tasks';

/** Local calendar date as YYYY-MM-DD */
export function todayStamp(): string {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

export function isTaskOverdue(task: Task, today = todayStamp()): boolean {
  return !task.completed && !!task.dueDate && task.dueDate < today;
}

export function isFocusTask(task: Task, today = todayStamp()): boolean {
  return !task.completed && !!task.dueDate && task.dueDate <= today;
}
