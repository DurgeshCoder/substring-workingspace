import { z } from 'zod';

export const departmentSchema = z.object({
  name: z.string().min(2, 'Department name must be at least 2 characters').max(50),
  description: z.string().max(500).optional().nullable(),
});

export type DepartmentInput = z.infer<typeof departmentSchema>;
