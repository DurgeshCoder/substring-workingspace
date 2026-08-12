import { z } from 'zod';

export const receiptSchema = z.object({
  studentId: z.string().max(50),
  studentName: z.string().min(2, 'Student name must be at least 2 characters').max(100),
  batch: z.string().min(1, 'Batch is required').max(50),
  batchCode: z.string().max(50),
  totalAmount: z.number().min(0, 'Total course amount must be a positive number'),
  dueAmount: z.number().min(0, 'Due amount must be a positive number'),
  paidAmount: z.number().min(0.01, 'Paid amount must be greater than 0'),
  paymentDate: z.string().optional(),
});

export type ReceiptInput = z.infer<typeof receiptSchema>;
