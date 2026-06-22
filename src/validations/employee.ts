import { z } from 'zod';
import { Role, UserStatus } from '@prisma/client';

export const createEmployeeSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone: z.string().optional().nullable(),
  role: z.nativeEnum(Role).default(Role.EMPLOYEE),
  departmentId: z.string().min(1, 'Please select a department').optional().nullable(),
  designation: z.string().min(2, 'Designation is required').optional().nullable(),
  salary: z.coerce.number().min(0, 'Salary must be a positive number').optional().nullable(),
  gender: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  status: z.nativeEnum(UserStatus).default(UserStatus.ACTIVE),
});

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;

export const updateEmployeeSchema = createEmployeeSchema.extend({
  password: z.string().min(6, 'Password must be at least 6 characters').optional().or(z.literal('')),
});

export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;
