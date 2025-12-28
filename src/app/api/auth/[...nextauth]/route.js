import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import NextAuth from "next-auth"

export const authOptions = {
  // Configure one or more authentication providers
  providers: [

    CredentialsProvider({
      name: "credentials",
      credentials: {},

      async authorize(credentials) {
        const { email, password } = credentials;
        try {
          await dbConnect();
          const user = await User.findOne({ email });

          if (!user) {
            return null;
          }

          if (!user.password) {
            // User might have signed up with provider
            return null;
          }

          const passwordsMatch = await bcrypt.compare(password, user.password);

          if (!passwordsMatch) {
            return null;
          }

          return user;

        } catch (error) {
          console.log("Error: ", error);
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account }) {

      if (user) {
        token.id = user.id || user._id; // Handle both mongoose _id and NextAuth id
      }
      if (account) {
        token.accessToken = account.access_token;
      }

      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id;
      return session
    },

    async signIn({ user, account }) {
      if (account.provider === "credentials") {
        return true;
      }
      await dbConnect();
      let dbUser = await User.findOne({ email: user.email })

      //if user not found create a new user
      if (!dbUser) {
        dbUser = await User.create({
          name: user.name,
          email: user.email,
          profilePicture: user.image,
          isVerified: true
        })
      }
      user.id = dbUser._id.toString();
      return true;
    }
  },
  session: {
    strategy: 'jwt',
    maxAge: 90 * 24 * 60 * 60
  },
  pages: {
    signIn: '/user-auth',
  }
}

const handle = NextAuth(authOptions)
export { handle as POST, handle as GET };