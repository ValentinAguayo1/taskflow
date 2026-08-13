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
  isFocusTask,
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
  readonly filter = signal<TaskFilter>('all');
  readonly editingTask = signal<Task | null>(null);
  readonly loading = signal(true);
  readonly errorMessage = signal('');

  private unsubscribeTasks?: () => void;

  readonly completedTasks = computed(
    () => this.tasks().filter(task => task.completed).length
  );

  readonly pendingTasks = computed(
    () => this.tasks().filter(task => !task.completed).length
  );

  readonly focusCount = computed(() => {
    const today = todayStamp();
    return this.tasks().filter(task => isFocusTask(task, today)).length;
  });

  readonly filteredTasks = computed(() => {
    const today = todayStamp();
    const tasks = this.tasks();

    switch (this.filter()) {
      case 'pending':
        return tasks.filter(task => !task.completed);
      case 'completed':
        return tasks.filter(task => task.completed);
      case 'focus':
        return tasks.filter(task => isFocusTask(task, today));
      default:
        return tasks;
    }
  });

  readonly canReorder = computed(
    () => this.filter() === 'all' && !this.loading()
  );

  readonly nextFocusTask = computed(
    () => this.filteredTasks()[0] ?? null
  );

  async ngOnInit() {
    await this.loadTasks();
  }

  ngOnDestroy() {
    this.unsubscribeTasks?.();
  }

  setFilter(filter: TaskFilter) {
    this.filter.set(filter);
  }

  startFocus() {
    this.filter.set('focus');
    queueMicrotask(() => {
      document.getElementById('tasks-panel')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    });
  }

  startEdit(task: Task) {
    this.editingTask.set({ ...task });
    document.getElementById('task-form-title')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  }

  clearEdit() {
    this.editingTask.set(null);
  }

  onListError(message: string) {
    this.errorMessage.set(message);
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

    // Single source of truth: Firestore onSnapshot updates the signal.
    this.unsubscribeTasks = this.taskService.listenToTasks(
      user.uid,
      tasks => {
        this.tasks.set(tasks);
        this.loading.set(false);

        const editing = this.editingTask();
        if (editing?.id && !tasks.some(task => task.id === editing.id)) {
          this.editingTask.set(null);
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
