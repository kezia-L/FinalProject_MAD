// convex/foods.ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getFoods = query({
  args: {
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const foods = await ctx.db.query("foods").order("asc").take(100);
    if (args.search) {
      const lower = args.search.toLowerCase();
      return foods.filter((f) => f.name.toLowerCase().includes(lower));
    }
    return foods;
  },
});

export const addFood = mutation({
  args: {
    name: v.string(),
    calories: v.number(),
    protein: v.number(),
    carbs: v.number(),
    fat: v.number(),
    fiber: v.optional(v.number()),
    category: v.optional(v.string()),
    isCustom: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("foods", {
      name: args.name,
      calories: args.calories,
      protein: args.protein,
      carbs: args.carbs,
      fat: args.fat,
      fiber: args.fiber,
      category: args.category ?? "custom",
      isCustom: args.isCustom ?? true,
    });
  },
});

export const deleteFood = mutation({
  args: { foodId: v.id("foods") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.foodId);
    return true;
  },
});
