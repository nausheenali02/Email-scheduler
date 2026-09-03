import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "mock-google-client-id",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "mock-google-client-secret",
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "oliver.brown@reachinbox.com" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (credentials?.email) {
          const emailParts = credentials.email.split("@")[0].split(/[._-]/);
          const derivedName = emailParts
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join(" ");

          return {
            id: `user-${credentials.email}`,
            name: derivedName || credentials.email,
            email: credentials.email,
            image: `https://ui-avatars.com/api/?name=${encodeURIComponent(derivedName || credentials.email)}&background=059669&color=fff`,
          };
        }
        return null;
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET || "email-scheduler-nextauth-secret-key-32-chars",
};
