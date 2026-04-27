import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const saveMealPlan = mutation({
  args: {
    userId: v.id("users"),
    planData: v.any(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Nonaktifkan semua rencana sebelumnya
    const existingPlans = await ctx.db
      .query("mealPlans")
      .withIndex("by_userId_active", (q) => 
        q.eq("userId", args.userId).eq("isActive", true)
      )
      .collect();

    for (const plan of existingPlans) {
      await ctx.db.patch(plan._id, { isActive: false });
    }

    // Simpan rencana baru sebagai yang aktif
    const planId = await ctx.db.insert("mealPlans", {
      userId: args.userId,
      planData: args.planData,
      notes: args.notes,
      isActive: true,
      createdAt: Date.now(),
    });

    return planId;
  },
});

export const getActiveMealPlan = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("mealPlans")
      .withIndex("by_userId_active", (q) => 
        q.eq("userId", args.userId).eq("isActive", true)
      )
      .unique();
  },
});

export const deleteMealPlan = mutation({
  args: { planId: v.id("mealPlans") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.planId);
  },
});
