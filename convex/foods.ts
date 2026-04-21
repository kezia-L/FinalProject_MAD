// convex/foods.ts
import { mutation, query, internalQuery } from "./_generated/server";
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

export const searchFoodByName = internalQuery({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    // Attempt full-text search first
    const searchResults = await ctx.db
      .query("foods")
      .withSearchIndex("search_name", (q) => q.search("name", args.name))
      .take(5);

    if (searchResults.length > 0) {
      // Find exact match if possible, or fall back to the first best match
      const exactMatch = searchResults.find(
        (f) => f.name.toLowerCase() === args.name.toLowerCase()
      );
      return exactMatch ?? searchResults[0];
    }
    
    // Fallback: If search index fails (sometimes takes a moment to index new data),
    // do a simple filter over the first few hundred entries looking for a substring match.
    // In production, full-text search is sufficient.
    const allFoods = await ctx.db.query("foods").take(1500);
    const match = allFoods.find((f) => f.name.toLowerCase().includes(args.name.toLowerCase()));
    
    return match ?? null;
  },
});
