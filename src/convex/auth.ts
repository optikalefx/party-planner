import { convexAuth } from "@convex-dev/auth/server";
import Google from "@auth/core/providers/google";

const ALLOWED_ORIGINS = [
  "https://mysteryinvite.com",
  "https://party-planner-livid.vercel.app",
  "http://localhost:5173",
];

export const { auth, signIn, signOut, store } = convexAuth({
  providers: [Google],
  callbacks: {
    async redirect({ redirectTo }) {
      for (const origin of ALLOWED_ORIGINS) {
        if (redirectTo === origin || redirectTo.startsWith(origin + "/")) {
          return redirectTo;
        }
      }
      return "https://mysteryinvite.com";
    },
  },
});
