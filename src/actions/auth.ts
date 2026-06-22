'use server';

import { signIn, signOut } from '@/auth';
import { AuthError } from 'next-auth';
import { loginSchema, LoginInput } from '@/validations/auth';

export async function loginAction(data: LoginInput) {
  const parsed = loginSchema.safeParse(data);
  if (!parsed.success) {
    return { error: 'Invalid credentials structure.' };
  }

  const { email, password } = parsed.data;

  try {
    await signIn('credentials', {
      email,
      password,
      redirect: false,
    });
    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return { error: 'Invalid email or password.' };
        default:
          return { error: 'Authentication failed. Please try again.' };
      }
    }
    // Re-throw redirect errors so Next.js handles them properly
    if ((error as Error).message === 'NEXT_REDIRECT') {
      throw error;
    }
    return { error: 'An unexpected error occurred during login.' };
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: '/login' });
}
