import {
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal
} from '@angular/core';
import { Router } from '@angular/router';

import { TaskService } from '../../services/task';
import { AuthService } from '../../services/auth';
import {
  Task,
  TaskFilter,
  formatDueDate,
  isFocusTask,
  isTaskOverdue,
  todayStamp
} from '../../models/task';
import { TaskForm } from '../../components/task-form/task-form';
import { TaskList } from '../../components/task-list/task-list';

@Component({
  selector: 'app-dashboard',
  imports: [TaskForm, TaskList],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class Dashboard implements OnInit, OnDestroy {

  private taskService = inject(TaskService);
  private authService = inject(AuthService);
  private router = inject(Router);

  readonly tasks = signal<Task[]>([]);
  readonly filter = signal<TaskFilter>('focus');
  readonly editingTask = signal<Task | null>(null);
  readonly formOpen = signal(false);
  readonly draftDue = signal<string | null>(null);
  readonly loading = signal(true);
  readonly errorMessage = signal('');
  private readonly skippedIds = signal<string[]>([]);

  private unsubscribeTasks?: () => void;

  readonly completedTasks = computed(
    () => this.tasks().filter(task => task.completed).length
  );

  readonly pendingTasks = computed(
    () => this.tasks().filter(task => !task.completed).length
  );

  readonly focusCount = computed(() => this.focusTasks().length);

  readonly focusTasks = computed(() => {
    const today = todayStamp();
    return this.tasks().filter(task => isFocusTask(task, today));
  });

  readonly undatedPending = computed(() =>
    this.tasks().filter(task => !task.completed && !task.dueDate)
  );

  readonly filteredTasks = computed(() => {
    const tasks = this.tasks();

    switch (this.filter()) {
      case 'completed':
        return tasks.filter(task => task.completed);
      case 'focus':
        return this.focusTasks();
      default:
        return tasks.filter(task => !task.completed);
    }
  });

  readonly canReorder = computed(
    () => this.filter() === 'all' && !this.loading()
  );

  readonly currentFocus = computed(() => {
    const queue = this.focusTasks();
    const skipped = new Set(this.skippedIds());
    return queue.find(task => task.id && !skipped.has(task.id)) ?? queue[0] ?? null;
  });

  readonly laterFocus = computed(() => {
    const currentId = this.currentFocus()?.id;
    return this.focusTasks().filter(task => task.id !== currentId);
  });

  readonly heading = computed(() => {
    switch (this.filter()) {
      case 'focus':
        return 'Ahora';
      case 'completed':
        return 'Hechas';
      default:
        return 'Todas';
    }
  });

  async ngOnInit() {
    await this.loadTasks();
  }

  ngOnDestroy() {
    this.unsubscribeTasks?.();
  }

  setFilter(filter: TaskFilter) {
    this.filter.set(filter);
    if (filter !== 'focus') {
      this.skippedIds.set([]);
    }
  }

  startFocus() {
    this.filter.set('focus');
  }

  openForm(dueDate: string | null = null) {
    this.editingTask.set(null);
    this.draftDue.set(dueDate);
    this.formOpen.set(true);
  }

  openTodayForm() {
    this.openForm(todayStamp());
  }

  startEdit(task: Task) {
    this.draftDue.set(null);
    this.editingTask.set({ ...task });
    this.formOpen.set(true);
  }

  closeForm() {
    this.formOpen.set(false);
    this.editingTask.set(null);
    this.draftDue.set(null);
  }

  onListError(message: string) {
    this.errorMessage.set(message);
  }

  formatDue(dueDate: string): string {
    return formatDueDate(dueDate);
  }

  isOverdue(task: Task): boolean {
    return isTaskOverdue(task);
  }

  skipCurrent() {
    const current = this.currentFocus();
    if (!current?.id || this.laterFocus().length === 0) return;
    this.skippedIds.update(ids =>
      ids.includes(current.id!) ? ids : [...ids, current.id!]
    );
  }

  async completeFocus(task: Task) {
    if (!task.id) return;

    try {
      await this.taskService.setCompleted(task.id, true);
    } catch (error) {
      console.error(error);
      this.errorMessage.set('No se pudo actualizar la tarea.');
    }
  }

  async markDueToday(task: Task) {
    if (!task.id) return;

    try {
      await this.taskService.updateTaskDetails(
        task.id,
        task.title,
        task.description ?? '',
        todayStamp()
      );
    } catch (error) {
      console.error(error);
      this.errorMessage.set('No se pudo poner la fecha.');
    }
  }

  async loadTasks() {
    this.loading.set(true);
    this.errorMessage.set('');

    const user = await this.authService.waitForUser();

    if (!user) {
      await this.router.navigate(['/login']);
      return;
    }

    this.unsubscribeTasks?.();

    this.unsubscribeTasks = this.taskService.listenToTasks(
      user.uid,
      tasks => {
        this.tasks.set(tasks);
        this.loading.set(false);

        const editing = this.editingTask();
        if (editing?.id && !tasks.some(task => task.id === editing.id)) {
          this.closeForm();
        }
      },
      error => {
        console.error(error);
        this.errorMessage.set('No se pudieron cargar las tareas.');
        this.loading.set(false);
      }
    );
  }

  async logout() {
    await this.authService.logout();
    await this.router.navigate(['/']);
  }
}
