// convex/foodLogs.ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const addFoodLog = mutation({
  args: {
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
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("foodLogs", args);
  },
});

export const getFoodLogsByDate = query({
  args: {
    userId: v.id("users"),
    logDate: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("foodLogs")
      .withIndex("by_userId_date", (q) =>
        q.eq("userId", args.userId).eq("logDate", args.logDate)
      )
      .order("asc")
      .take(100);
  },
});

export const getWeeklyCalories = query({
  args: {
    userId: v.id("users"),
    dates: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const result: Record<string, number> = {};
    for (const date of args.dates) {
      result[date] = 0;
    }

    for (const date of args.dates) {
      const logs = await ctx.db
        .query("foodLogs")
        .withIndex("by_userId_date", (q) =>
          q.eq("userId", args.userId).eq("logDate", date)
        )
        .take(200);

      result[date] = logs.reduce((sum, log) => sum + log.calories, 0);
    }

    return result;
  },
});

export const deleteFoodLog = mutation({
  args: { logId: v.id("foodLogs") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.logId);
    return true;
  },
});
