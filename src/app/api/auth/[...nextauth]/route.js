import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { sql } from "@vercel/postgres";
import crypto from "crypto";

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      try {
        // Find if user already exists
        const { rows } = await sql`SELECT id FROM users WHERE email = ${user.email} LIMIT 1`;
        
        if (rows.length === 0) {
          // If not, we insert
          const newId = "usr_" + crypto.randomUUID();
          await sql`
            INSERT INTO users (id, name, email, pix_key)
            VALUES (${newId}, ${user.name}, ${user.email}, null)
          `;
          user.dbId = newId;
        } else {
          user.dbId = rows[0].id;
        }
        return true;
      } catch (error) {
        console.error("NextAuth signIn Error:", error);
        return false; // block sign in if DB is unreachable — user must retry
      }
    },
    async session({ session, token, user }) {
      // Append dbId to session to be used in routes
      if (session.user) {
        try {
           const { rows } = await sql`SELECT id, name FROM users WHERE email = ${session.user.email} LIMIT 1`;
           if (rows.length > 0) {
             session.user.id = rows[0].id; // Give frontend the real ID
             session.user.name = rows[0].name;
           }
        } catch (err) {
          console.error("NextAuth session callback Error:", err);
        }
      }
      return session;
    }
  },
  session: { strategy: "jwt" }
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
