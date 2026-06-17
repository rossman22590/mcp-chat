import NextAuth, { type User, type Session } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import GoogleProvider from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter"

import { validateAitutorSsoToken } from '@/lib/aitutor-sso';
import { db } from '@/lib/db/queries';

import { authConfig } from './auth.config';
import { accounts, user } from '@/lib/db/schema';

interface ExtendedSession extends Session {
  user: User;
}

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  ...authConfig,
  secret: process.env.AUTH_SECRET,

  adapter: DrizzleAdapter(db, {
    usersTable: user,
    accountsTable: accounts,
  }),
  providers: [
    Credentials({
      id: 'aitutor-sso',
      name: 'AiTutor SSO',
      credentials: {
        sso_token: { label: 'SSO Token', type: 'text' },
      },
      async authorize(credentials) {
        const ssoToken = credentials?.sso_token;
        if (!ssoToken || typeof ssoToken !== 'string') {
          return null;
        }

        const result = await validateAitutorSsoToken(ssoToken);
        if (!result.ok) {
          return null;
        }

        return {
          id: result.user.id,
          email: result.user.email,
          name: result.user.email ? result.user.email.split('@')[0] : '',
        };
      },
    }),
    GoogleProvider({
      allowDangerousEmailAccountLinking: true,
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }

      return token;
    },
    async session({
      session,
      token,
    }: {
      session: ExtendedSession;
      token: any;
    }) {
      if (session.user) {
        session.user.id = token.id as string;
      }

      return session;
    },
  },
});
