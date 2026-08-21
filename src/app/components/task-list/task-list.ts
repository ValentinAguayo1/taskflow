import { Component, inject, input, output, signal } from '@angular/core';

import { TaskService } from '../../services/task';
import { Task, isTaskOverdue, formatDueDate } from '../../models/task';

@Component({
  selector: 'app-task-list',
  imports: [],
  templateUrl: './task-list.html',
  styleUrl: './task-list.scss'
})
export class TaskList {

  private taskService = inject(TaskService);

  tasks = input.required<Task[]>();
  canReorder = input(false);

  edit = output<Task>();
  toggleFailed = output<void>();
  deleteFailed = output<void>();
  reorderFailed = output<void>();

  reordering = signal(false);
  private dragIndex: number | null = null;

  async toggleTask(task: Task) {
    if (!task.id) return;

    try {
      await this.taskService.setCompleted(task.id, !task.completed);
    } catch (error) {
      console.error(error);
      this.toggleFailed.emit();
    }
  }

  async deleteTask(task: Task) {
    if (!task.id) return;

    try {
      await this.taskService.deleteTask(task.id);
    } catch (error) {
      console.error(error);
      this.deleteFailed.emit();
    }
  }

  onDragStart(index: number, event: DragEvent) {
    if (!this.canReorder()) {
      event.preventDefault();
      return;
    }

    this.dragIndex = index;
    event.dataTransfer?.setData('text/plain', String(index));
    event.dataTransfer!.effectAllowed = 'move';
  }

  onDragOver(event: DragEvent) {
    if (!this.canReorder() || this.dragIndex === null) return;
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }

  async onDrop(targetIndex: number, event: DragEvent) {
    event.preventDefault();

    if (!this.canReorder() || this.dragIndex === null || this.dragIndex === targetIndex) {
      this.dragIndex = null;
      return;
    }

    const ordered = [...this.tasks()];
    const [moved] = ordered.splice(this.dragIndex, 1);
    ordered.splice(targetIndex, 0, moved);
    this.dragIndex = null;

    this.reordering.set(true);

    try {
      await this.taskService.reorderTasks(
        ordered.map((task, index) => ({ ...task, order: index }))
      );
    } catch (error) {
      console.error(error);
      this.reorderFailed.emit();
    } finally {
      this.reordering.set(false);
    }
  }

  onDragEnd() {
    this.dragIndex = null;
  }

  formatDueDate(dueDate: string): string {
    return formatDueDate(dueDate);
  }

  isOverdue(task: Task): boolean {
    return isTaskOverdue(task);
  }
}
