import { Role, UserStatus } from '@prisma/client';
import { type DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface User {
    id?: string;
    role: Role;
    status: UserStatus;
    employeeCode: string;
    firstName: string;
    lastName: string;
    designation?: string | null;
  }

  interface Session {
    user: {
      id: string;
      role: Role;
      status: UserStatus;
      employeeCode: string;
      firstName: string;
      lastName: string;
      designation?: string | null;
    } & DefaultSession['user'];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: Role;
    status: UserStatus;
    employeeCode: string;
    firstName: string;
    lastName: string;
    designation?: string | null;
  }
}
