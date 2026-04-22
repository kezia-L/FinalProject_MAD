// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.string(),
    email: v.string(),
    passwordHash: v.optional(v.string()),
    role: v.string(),
    age: v.optional(v.number()),
    weight: v.optional(v.number()),
    height: v.optional(v.number()),
    goal: v.optional(v.string()),
    dailyCalorieTarget: v.optional(v.number()),
    createdAt: v.number(),
    tokenIdentifier: v.optional(v.string()),
    picture: v.optional(v.string()),
    authProvider: v.optional(v.string()),
  })
    .index("by_email", ["email"])
    .index("by_tokenIdentifier", ["tokenIdentifier"]),

  // Tabel sementara untuk menyimpan session Google OAuth
  // Data disimpan setelah Convex HTTP callback menerima dari Google
  googleSessions: defineTable({
    state: v.string(),       // random state yang dibuat app, dipakai sebagai key
    userId: v.id("users"),
    name: v.string(),
    role: v.string(),
    createdAt: v.number(),
  }).index("by_state", ["state"]),

  foods: defineTable({
    id: v.optional(v.number()),
    name: v.string(),
    calories: v.number(),
    protein: v.number(),
    carbs: v.number(),
    fat: v.number(),
    fiber: v.optional(v.number()),
    category: v.optional(v.string()),
    isCustom: v.optional(v.boolean()),
    image: v.optional(v.string()),
  }).searchIndex("search_name", { searchField: "name" }),

  foodLogs: defineTable({
    userId: v.id("users"),
    foodName: v.string(),
    calories: v.number(),
    protein: v.number(),
    carbs: v.number(),
    fat: v.number(),
    portionGram: v.optional(v.number()),
    mealType: v.union(
      v.literal("breakfast"),
      v.literal("lunch"),
      v.literal("dinner"),
      v.literal("snack")
    ),
    logDate: v.string(),
    logTimestamp: v.number(),
    fromScan: v.optional(v.boolean()),
    scanId: v.optional(v.id("scanHistory")),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_date", ["userId", "logDate"]),

  scanHistory: defineTable({
    userId: v.id("users"),
    detectedFood: v.string(),
    confidence: v.number(),
    calories: v.number(),
    protein: v.number(),
    carbs: v.number(),
    fat: v.number(),
    portionGram: v.number(),
    aiAnalysis: v.string(),
    scanTimestamp: v.number(),
    isSaved: v.boolean(),
    imageStorageId: v.optional(v.id("_storage")),
  }).index("by_userId", ["userId"]),
});