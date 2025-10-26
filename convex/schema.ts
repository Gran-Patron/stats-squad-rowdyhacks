import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,
  songChoices: defineTable({
    songId: v.id("songs"),
    choice: v.union(
      v.literal("like"),
      v.literal("dislike"),
      v.literal("superDislike"),
      v.literal("superLike"),
    ),
  }),
  spotifyAuthStates: defineTable({
    userId: v.id("users"),
    state: v.string(),
  }).index("by_state", ["state"]),
  spotifyTokens: defineTable({
    userId: v.id("users"),
    accessToken: v.string(),
    refreshToken: v.string(),
    expiresAt: v.number(),
    scope: v.optional(v.string()),
  }).index("by_user", ["userId"]),
});