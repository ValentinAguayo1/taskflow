import {
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import { TaskService } from '../../services/task';
import { AuthService } from '../../services/auth';
import { Task } from '../../models/task';

@Component({
  selector: 'app-task-form',
  imports: [FormsModule],
  templateUrl: './task-form.html',
  styleUrl: './task-form.scss'
})
export class TaskForm {

  private taskService = inject(TaskService);
  private authService = inject(AuthService);

  taskToEdit = input<Task | null>(null);
  initialDueDate = input<string | null>(null);
  saved = output<void>();
  cancelled = output<void>();

  title = '';
  description = '';
  dueDate = '';

  private editingId = signal<string | null>(null);
  loading = signal(false);
  errorMessage = signal('');

  readonly isEditing = computed(() => this.editingId() !== null);

  constructor() {
    effect(() => {
      const task = this.taskToEdit();

      if (task?.id) {
        this.editingId.set(task.id);
        this.title = task.title;
        this.description = task.description ?? '';
        this.dueDate = task.dueDate ?? '';
        this.errorMessage.set('');
        return;
      }

      if (this.editingId() !== null) {
        this.resetForm();
      }

      this.dueDate = this.initialDueDate() ?? '';
    });
  }

  async submit() {
    if (!this.title.trim()) {
      this.errorMessage.set('El título es obligatorio.');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');

    try {
      const user = this.authService.currentUser;

      if (!user) {
        this.errorMessage.set('Debes iniciar sesión.');
        return;
      }

      const due = this.dueDate || null;
      const editingId = this.editingId();

      if (editingId) {
        await this.taskService.updateTaskDetails(
          editingId,
          this.title.trim(),
          this.description.trim(),
          due
        );
      } else {
        await this.taskService.createTask(
          this.title.trim(),
          this.description.trim(),
          user.uid,
          due
        );
      }

      this.resetForm();
      this.saved.emit();

    } catch (error) {
      console.error(error);
      this.errorMessage.set(
        this.isEditing()
          ? 'No se pudo actualizar la tarea.'
          : 'No se pudo crear la tarea.'
      );
    } finally {
      this.loading.set(false);
    }
  }

  cancelEdit() {
    this.resetForm();
    this.cancelled.emit();
  }

  private resetForm() {
    this.editingId.set(null);
    this.title = '';
    this.description = '';
    this.dueDate = '';
    this.errorMessage.set('');
  }
}
