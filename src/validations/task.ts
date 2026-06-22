import { z } from 'zod';

export const taskSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().optional().nullable(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  status: z.enum(['TODO', 'IN_PROGRESS', 'REVIEW', 'COMPLETED', 'CANCELLED']).default('TODO'),
  assignedToId: z.string().min(1, 'Please assign this task to an employee'),
  dueDate: z.string().optional().nullable().or(z.date()),
});

export type TaskInput = z.infer<typeof taskSchema>;
