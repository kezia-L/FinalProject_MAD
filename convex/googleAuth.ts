// convex/googleAuth.ts
// Fungsi untuk mengelola Google OAuth session (polling mechanism)
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

/**
 * Simpan session setelah HTTP callback berhasil menerima dari Google.
 * Dipanggil dari http.ts setelah token exchange berhasil.
 */
export const storeSession = mutation({
  args: {
    state: v.string(),
    googleId: v.string(),
    name: v.string(),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    // Cari userId berdasarkan googleId
    const tokenIdentifier = `google:${args.googleId}`;
    const user = await ctx.db
      .query("users")
      .withIndex("by_tokenIdentifier", (q) =>
        q.eq("tokenIdentifier", tokenIdentifier)
      )
      .unique();

    if (!user) {
      // Cari by email sebagai fallback
      const byEmail = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
        .unique();
      if (!byEmail) throw new Error("User not found after upsert");

      await ctx.db.insert("googleSessions", {
        state: args.state,
        userId: byEmail._id,
        name: args.name,
        role: byEmail.role,
        createdAt: Date.now(),
      });
      return;
    }

    await ctx.db.insert("googleSessions", {
      state: args.state,
      userId: user._id,
      name: args.name,
      role: user.role,
      createdAt: Date.now(),
    });
  },
});

/**
 * Poll untuk cek apakah session sudah tersedia.
 * App memanggil ini secara reaktif setelah buka browser Google.
 */
export const checkSession = query({
  args: { state: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("googleSessions")
      .withIndex("by_state", (q) => q.eq("state", args.state))
      .unique();
  },
});

/**
 * Hapus session setelah app berhasil login (cleanup).
 */
export const deleteSession = mutation({
  args: { state: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("googleSessions")
      .withIndex("by_state", (q) => q.eq("state", args.state))
      .unique();
    if (session) {
      await ctx.db.delete(session._id);
    }
  },
});
