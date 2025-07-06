import { Task } from '@/types/api';

class TaskStorage {
  private tasks: Map<string, Task> = new Map();

  createTask(id: string, prompt: string, files?: string[]): Task {
    const task: Task = {
      id,
      status: 'queued',
      prompt,
      files,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.tasks.set(id, task);
    return task;
  }

  getTask(id: string): Task | undefined {
    return this.tasks.get(id);
  }

  updateTask(id: string, updates: Partial<Task>): Task | undefined {
    const task = this.tasks.get(id);
    if (!task) return undefined;

    const updatedTask = {
      ...task,
      ...updates,
      updated_at: new Date().toISOString(),
    };

    this.tasks.set(id, updatedTask);
    return updatedTask;
  }

  deleteTask(id: string): boolean {
    return this.tasks.delete(id);
  }

  getAllTasks(): Task[] {
    return Array.from(this.tasks.values());
  }

  getTasksByStatus(status: Task['status']): Task[] {
    return Array.from(this.tasks.values()).filter(task => task.status === status);
  }

  // クリーンアップ: 24時間以上前のタスクを削除
  cleanup(): void {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    for (const [id, task] of this.tasks.entries()) {
      if (new Date(task.created_at) < twentyFourHoursAgo) {
        this.tasks.delete(id);
      }
    }
  }
}

// グローバルシングルトンとしてタスクストレージを管理
const globalForTaskStorage = globalThis as unknown as {
  taskStorage: TaskStorage | undefined;
};

export const taskStorage = globalForTaskStorage.taskStorage ?? new TaskStorage();

if (process.env.NODE_ENV !== 'production') {
  globalForTaskStorage.taskStorage = taskStorage;
}

// 定期的なクリーンアップ (開発環境では無効化)
if (process.env.NODE_ENV === 'production') {
  setInterval(() => {
    taskStorage.cleanup();
  }, 60 * 60 * 1000); // 1時間ごと
}