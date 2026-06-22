import type { NextAuthConfig } from 'next-auth';

export const authConfig = {
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isAdminRoute = nextUrl.pathname.startsWith('/admin');
      const isEmployeeRoute = nextUrl.pathname.startsWith('/employee');
      const isAuthRoute = nextUrl.pathname === '/login';
      const isRootRoute = nextUrl.pathname === '/';

      if (isRootRoute) {
        if (isLoggedIn) {
          const role = (auth?.user as any)?.role;
          const redirectUrl = role === 'ADMIN' ? '/admin/dashboard' : '/employee/dashboard';
          return Response.redirect(new URL(redirectUrl, nextUrl));
        }
        return Response.redirect(new URL('/login', nextUrl));
      }

      if (isAuthRoute) {
        if (isLoggedIn) {
          const role = (auth?.user as any)?.role;
          const redirectUrl = role === 'ADMIN' ? '/admin/dashboard' : '/employee/dashboard';
          return Response.redirect(new URL(redirectUrl, nextUrl));
        }
        return true;
      }

      if (!isLoggedIn && (isAdminRoute || isEmployeeRoute)) {
        return false;
      }

      if (isLoggedIn) {
        const role = (auth?.user as any)?.role;
        if (isAdminRoute && role !== 'ADMIN') {
          return Response.redirect(new URL('/employee/dashboard', nextUrl));
        }
        if (isEmployeeRoute && role !== 'EMPLOYEE') {
          return Response.redirect(new URL('/admin/dashboard', nextUrl));
        }
      }

      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        const u = user as any;
        token.id = u.id!;
        token.role = u.role;
        token.status = u.status;
        token.employeeCode = u.employeeCode;
        token.firstName = u.firstName;
        token.lastName = u.lastName;
        token.designation = u.designation;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        const t = token as any;
        session.user.id = t.id;
        session.user.role = t.role;
        session.user.status = t.status;
        session.user.employeeCode = t.employeeCode;
        session.user.firstName = t.firstName;
        session.user.lastName = t.lastName;
        session.user.designation = t.designation;
      }
      return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
