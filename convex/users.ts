// convex/users.ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// =============================================
// GOOGLE SSO — expo-auth-session (Expo Go compatible)
// =============================================

/**
 * Dipanggil setelah user login dengan Google via expo-auth-session.
 * Menerima googleId, name, email dari Google OAuth response.
 * cocok untuk testing di Expo Go.
 */
export const upsertGoogleUser = mutation({
  args: {
    googleId: v.string(),   // sub field dari Google ID token
    name: v.string(),
    email: v.string(),
    picture: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const tokenIdentifier = `google:${args.googleId}`;

    // Cek apakah user sudah ada (by googleId)
    const existingByToken = await ctx.db
      .query("users")
      .withIndex("by_tokenIdentifier", (q) =>
        q.eq("tokenIdentifier", tokenIdentifier)
      )
      .unique();

    if (existingByToken) {
      // Update data terbaru dari Google
      await ctx.db.patch(existingByToken._id, {
        name: args.name,
        picture: args.picture,
      });
      return { userId: existingByToken._id, role: existingByToken.role };
    }

    // Cek apakah email sudah terdaftar via email/password
    const existingByEmail = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .unique();

    if (existingByEmail) {
      // Hubungkan akun Google ke akun email yang sudah ada
      await ctx.db.patch(existingByEmail._id, {
        tokenIdentifier,
        picture: args.picture,
        authProvider: "google",
      });
      return { userId: existingByEmail._id, role: existingByEmail.role };
    }

    // User baru — buat record baru
    const userId = await ctx.db.insert("users", {
      name: args.name,
      email: args.email.toLowerCase(),
      role: "user",
      tokenIdentifier,
      picture: args.picture,
      authProvider: "google",
      dailyCalorieTarget: 2000,
      createdAt: Date.now(),
    });

    return { userId, role: "user" };
  },
});

// =============================================
// EMAIL / PASSWORD AUTH (existing)
// =============================================


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

    const role = "user";

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
