import NextAuth from "next-auth";
import type { Provider } from "next-auth/providers";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import {
  createOrLinkGoogleUser,
  findUserByUsernameOrEmail,
  verifyPassword,
} from "@/lib/users";

const providers: Provider[] = [
  Credentials({
    name: "credentials",
    credentials: {
      login: { label: "Username or email", type: "text" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      const login = credentials?.login as string | undefined;
      const password = credentials?.password as string | undefined;
      if (!login?.trim() || !password) return null;

      const user = findUserByUsernameOrEmail(login);
      if (!user || !(await verifyPassword(user, password))) return null;

      return {
        id: user.id,
        name: user.name || user.username,
        email: user.email,
      };
    },
  }),
];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.unshift(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: {
    signIn: "/login",
  },
  providers,
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider === "google") {
        const email = profile?.email;
        const googleId = account.providerAccountId;
        if (!email || !googleId) return false;
        createOrLinkGoogleUser({
          email,
          name: profile?.name,
          googleId,
        });
      }
      return true;
    },
    async jwt({ token, user, account, profile }) {
      if (account?.provider === "google" && profile?.email) {
        const linked = createOrLinkGoogleUser({
          email: profile.email,
          name: profile.name,
          googleId: account.providerAccountId,
        });
        token.sub = linked.id;
        token.name = linked.name || linked.username;
        token.email = linked.email;
      } else if (user?.id) {
        token.sub = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
});
