import { Injectable } from '@angular/core';

import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  onSnapshot,
  query,
  updateDoc,
  where,
  writeBatch
} from 'firebase/firestore';

import { db } from '../core/firebase.config';
import { TASKS_COLLECTION, Task } from '../models/task';

const NO_DUE_SORT_KEY = '9999-12-31';

@Injectable({
  providedIn: 'root'
})
export class TaskService {

  private tasksCollection = collection(db, TASKS_COLLECTION);

  async createTask(
    title: string,
    description: string,
    userId: string,
    dueDate?: string | null
  ) {
    return addDoc(this.tasksCollection, {
      title,
      description,
      completed: false,
      createdAt: new Date(),
      order: Date.now(),
      userId,
      ...(dueDate ? { dueDate } : {})
    });
  }

  listenToTasks(
    userId: string,
    onChange: (tasks: Task[]) => void,
    onError?: (error: Error) => void
  ) {
    const q = query(
      this.tasksCollection,
      where('userId', '==', userId)
    );

    return onSnapshot(
      q,
      snapshot => {
        const tasks = snapshot.docs.map(document => ({
          id: document.id,
          ...document.data()
        })) as Task[];

        onChange(this.sortTasks(tasks));
      },
      error => {
        onError?.(error);
      }
    );
  }

  async setCompleted(taskId: string, completed: boolean) {
    return updateDoc(doc(db, TASKS_COLLECTION, taskId), { completed });
  }

  async updateTaskDetails(
    taskId: string,
    title: string,
    description: string,
    dueDate?: string | null
  ) {
    return updateDoc(doc(db, TASKS_COLLECTION, taskId), {
      title,
      description,
      dueDate: dueDate ? dueDate : deleteField()
    });
  }

  async reorderTasks(orderedTasks: Task[]) {
    const batch = writeBatch(db);

    orderedTasks.forEach((task, index) => {
      if (!task.id) return;
      batch.update(doc(db, TASKS_COLLECTION, task.id), { order: index });
    });

    return batch.commit();
  }

  async deleteTask(taskId: string) {
    return deleteDoc(doc(db, TASKS_COLLECTION, taskId));
  }

  private sortTasks(tasks: Task[]): Task[] {
    return [...tasks].sort((a, b) => {
      if (a.completed !== b.completed) {
        return a.completed ? 1 : -1;
      }

      const aOrder = a.order ?? Number.MAX_SAFE_INTEGER;
      const bOrder = b.order ?? Number.MAX_SAFE_INTEGER;
      if (aOrder !== bOrder) {
        return aOrder - bOrder;
      }

      const aDue = a.dueDate ?? NO_DUE_SORT_KEY;
      const bDue = b.dueDate ?? NO_DUE_SORT_KEY;
      return aDue.localeCompare(bDue);
    });
  }
}
