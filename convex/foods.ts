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
    image: v.optional(v.string()),
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
      image: args.image,
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
      // Prioritas 1: Cari yang namanya sama persis
      const exactMatch = searchResults.find(
        (f) => f.name.toLowerCase() === args.name.toLowerCase()
      );
      if (exactMatch) return exactMatch;

      // Prioritas 2: Cari yang mengandung kata utuh (misal AI: "Apel", DB: "Apel segar")
      const partialMatch = searchResults.find(
        (f) => f.name.toLowerCase().includes(args.name.toLowerCase()) || args.name.toLowerCase().includes(f.name.toLowerCase())
      );
      if (partialMatch) return partialMatch;

      // Jika tidak ada yang cocok sama sekali (misal AI cari Nasi Padang, DB cuma ada Soto Padang)
      // Kembalikan null agar AI yang mengestimasi kalorinya
      return null;
    }
    
    // Fallback: pencarian manual
    const allFoods = await ctx.db.query("foods").take(1500);
    const match = allFoods.find((f) => f.name.toLowerCase() === args.name.toLowerCase() || f.name.toLowerCase().includes(args.name.toLowerCase()));
    
    return match ?? null;
  },
});

export const updateFoodImage = mutation({
  args: { 
    id: v.id("foods"),
    image: v.string() 
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { image: args.image });
    return true;
  },
});
