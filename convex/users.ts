// convex/users.ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const register = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    passwordHash: v.string(),
    goal: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if email already exists
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .unique();

    if (existing) {
      throw new Error("Email sudah terdaftar");
    }

    // First user gets admin role
    const allUsers = await ctx.db.query("users").take(1);
    const role = allUsers.length === 0 ? "admin" : "user";

    const dailyCalorieTarget = 2000;

    const userId = await ctx.db.insert("users", {
      name: args.name,
      email: args.email.toLowerCase(),
      passwordHash: args.passwordHash,
      role,
      goal: args.goal,
      dailyCalorieTarget,
      createdAt: Date.now(),
    });

    return { userId, role };
  },
});

export const getUserByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .unique();
  },
});

export const getUserById = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

export const getAllUsers = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("users").order("desc").take(200);
  },
});

export const updateProfile = mutation({
  args: {
    userId: v.id("users"),
    name: v.optional(v.string()),
    age: v.optional(v.number()),
    weight: v.optional(v.number()),
    height: v.optional(v.number()),
    goal: v.optional(v.string()),
    dailyCalorieTarget: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId, ...fields } = args;
    const updates: Record<string, string | number | undefined> = {};
    if (fields.name !== undefined) updates.name = fields.name;
    if (fields.age !== undefined) updates.age = fields.age;
    if (fields.weight !== undefined) updates.weight = fields.weight;
    if (fields.height !== undefined) updates.height = fields.height;
    if (fields.goal !== undefined) updates.goal = fields.goal;
    if (fields.dailyCalorieTarget !== undefined) updates.dailyCalorieTarget = fields.dailyCalorieTarget;
    await ctx.db.patch(userId, updates);
    return true;
  },
});
