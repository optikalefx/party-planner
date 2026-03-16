import { action } from "./_generated/server";
import { v } from "convex/values";

export const validateAdmin = action({
  args: { username: v.string(), password: v.string() },
  handler: async (_ctx, { username, password }) => {
    return username === "sean" && password === "clark";
  },
});
