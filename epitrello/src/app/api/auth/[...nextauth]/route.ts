import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { AuthOptions } from "next-auth";
import { prisma } from '../../../lib/prisma'
import { PrismaAdapter } from "@next-auth/prisma-adapter"


export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Request missing email or password");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.password) {
          throw new Error("User not found");
        }

        const isCorrectPassword = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isCorrectPassword) {
          throw new Error("Invalid password");
        }

        return user;
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, trigger, session, user }) {
      if (user) {
        token.id = user.id;
      }
      // Allow client to update session
      if (trigger === "update") {
        if (session?.name) token.name = session.name;
        if (session?.email) token.email = session.email;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        // ID is critical for identifying user if email changes. 
        // token.sub is standard standard for user ID in NextAuth
        const userId = token.id || token.sub;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (userId) (session.user as any).id = userId;

        if (token.name) session.user.name = token.name;
        if (token.email) session.user.email = token.email;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };