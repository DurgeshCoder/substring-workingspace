'use server';

import { db } from '@/lib/db';
import { taskSchema, TaskInput } from '@/validations/task';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { TaskStatus } from '@prisma/client';

async function checkUser() {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthorized. Access required.');
  }
  return session.user;
}

export async function createTask(data: TaskInput) {
  try {
    const creator = await checkUser();
    
    // Prevent non-admins from creating tasks
    if (creator.role !== 'ADMIN') {
      return { error: 'Unauthorized. Only admins can create and assign tasks.' };
    }

    const parsed = taskSchema.safeParse(data);
    if (!parsed.success) {
      return { error: 'Invalid task fields: ' + JSON.stringify(parsed.error.flatten().fieldErrors) };
    }

    const val = parsed.data;

    const task = await db.task.create({
      data: {
        title: val.title,
        description: val.description,
        priority: val.priority,
        status: val.status,
        assignedById: creator.id,
        assignedToId: val.assignedToId,
        dueDate: val.dueDate ? new Date(val.dueDate) : null,
      },
    });

    // Create activity log
    await db.activityLog.create({
      data: {
        action: `Created task: ${val.title} and assigned it`,
        entityType: 'Task',
        entityId: task.id,
        performedBy: `${creator.firstName} ${creator.lastName}`,
      },
    });

    // Send notifications to the assigned employee
    await db.notification.create({
      data: {
        title: 'New Task Assigned',
        message: `You have been assigned a new task: "${val.title}" with priority ${val.priority}.`,
        userId: val.assignedToId,
      },
    });

    revalidatePath('/admin/tasks');
    revalidatePath('/employee/tasks');
    return { success: true, task };
  } catch (error: any) {
    return { error: error.message || 'Failed to create task.' };
  }
}

export async function updateTask(id: string, data: TaskInput) {
  try {
    const user = await checkUser();
    
    // Prevent non-admins from updating tasks
    if (user.role !== 'ADMIN') {
      return { error: 'Unauthorized. Only admins can modify task allocations.' };
    }

    const parsed = taskSchema.safeParse(data);
    if (!parsed.success) {
      return { error: 'Invalid task fields.' };
    }

    const val = parsed.data;

    const oldTask = await db.task.findUnique({ where: { id } });
    if (!oldTask) {
      return { error: 'Task not found.' };
    }

    const task = await db.task.update({
      where: { id },
      data: {
        title: val.title,
        description: val.description,
        priority: val.priority,
        status: val.status,
        assignedToId: val.assignedToId,
        dueDate: val.dueDate ? new Date(val.dueDate) : null,
      },
    });

    await db.activityLog.create({
      data: {
        action: `Updated task specifications: ${val.title}`,
        entityType: 'Task',
        entityId: task.id,
        performedBy: `${user.firstName} ${user.lastName}`,
      },
    });

    // If assignment changed, notify the new assignee
    if (oldTask.assignedToId !== val.assignedToId) {
      await db.notification.create({
        data: {
          title: 'Task Reassigned',
          message: `The task "${val.title}" has been reassigned to you.`,
          userId: val.assignedToId,
        },
      });
    }

    revalidatePath('/admin/tasks');
    revalidatePath('/employee/tasks');
    return { success: true, task };
  } catch (error: any) {
    return { error: error.message || 'Failed to update task.' };
  }
}

export async function updateTaskStatus(id: string, status: TaskStatus) {
  try {
    const user = await checkUser();

    const task = await db.task.findUnique({
      where: { id },
      include: { assignedTo: true },
    });

    if (!task) {
      return { error: 'Task not found.' };
    }

    // Protection: Employees can only update their own assigned tasks
    if (user.role !== 'ADMIN' && task.assignedToId !== user.id) {
      return { error: 'Unauthorized. You can only update tasks assigned to you.' };
    }

    const updatedTask = await db.task.update({
      where: { id },
      data: { status },
    });

    await db.activityLog.create({
      data: {
        action: `Updated status of task "${task.title}" to ${status}`,
        entityType: 'Task',
        entityId: task.id,
        performedBy: `${user.firstName} ${user.lastName}`,
      },
    });

    // If update performed by employee, notify the admin creator
    if (user.id === task.assignedToId && task.assignedById !== user.id) {
      await db.notification.create({
        data: {
          title: 'Task Status Updated',
          message: `Employee ${user.firstName} ${user.lastName} changed the status of "${task.title}" to ${status}.`,
          userId: task.assignedById,
        },
      });
    }

    revalidatePath('/admin/tasks');
    revalidatePath('/employee/tasks');
    return { success: true, task: updatedTask };
  } catch (error: any) {
    return { error: error.message || 'Failed to update task status.' };
  }
}

export async function deleteTask(id: string) {
  try {
    const user = await checkUser();
    
    if (user.role !== 'ADMIN') {
      return { error: 'Unauthorized. Only admins can delete tasks.' };
    }

    const task = await db.task.delete({
      where: { id },
    });

    await db.activityLog.create({
      data: {
        action: `Deleted task: ${task.title}`,
        entityType: 'Task',
        entityId: id,
        performedBy: `${user.firstName} ${user.lastName}`,
      },
    });

    revalidatePath('/admin/tasks');
    revalidatePath('/employee/tasks');
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to delete task.' };
  }
}
