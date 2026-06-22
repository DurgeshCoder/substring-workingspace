import { z } from 'zod';
import { Priority, TaskStatus } from '@prisma/client';

export const taskSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().optional().nullable(),
  priority: z.nativeEnum(Priority).default(Priority.MEDIUM),
  status: z.nativeEnum(TaskStatus).default(TaskStatus.TODO),
  assignedToId: z.string().min(1, 'Please assign this task to an employee'),
  dueDate: z.string().optional().nullable().or(z.date()),
});

export type TaskInput = z.infer<typeof taskSchema>;
