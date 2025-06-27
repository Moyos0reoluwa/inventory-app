import NextAuth from 'next-auth/next';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
// @ts-expect-error – temporary fix for broken NextAuthOptions type
import type { NextAuthOptions, Session } from 'next-auth';
import type { JWT } from 'next-auth/jwt';
import type { AdapterUser } from 'next-auth/adapters';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'example@example.com' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        await connectDB();

        if (!credentials?.email || !credentials?.password) {
          throw new Error('Missing email or password');
        }

        const user = await User.findOne({ email: credentials.email });

        if (!user) {
          throw new Error('No user found');
        }

        const isValid = await bcrypt.compare(credentials.password, user.password);
        if (!isValid) {
          throw new Error('Invalid password');
        }

        return {
          id: user._id.toString(),
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({
      token,
      user,
    }: {
      token: JWT;
      user?: AdapterUser;
    }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.role = (user as any).role ?? 'admin';
      }
      return token;
    },
    async session({
      session,
      token,
    }: {
      session: Session;
      token: JWT;
    }) {
      session.user.id = token.id as string;
      session.user.email = token.email as string;
      session.user.role = token.role as 'admin' | 'superAdmin';
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
