// convex/scanHistory.ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const saveScan = mutation({
  args: {
    userId: v.id("users"),
    detectedFood: v.string(),
    confidence: v.number(),
    calories: v.number(),
    protein: v.number(),
    carbs: v.number(),
    fat: v.number(),
    portionGram: v.number(),
    aiAnalysis: v.string(),
    imageStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("scanHistory", {
      ...args,
      scanTimestamp: Date.now(),
      isSaved: false,
    });
  },
});

export const generateUploadUrl = mutation(async (ctx) => {
  return await ctx.storage.generateUploadUrl();
});

export const getScanHistory = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("scanHistory")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(50);
  },
});

export const getScanById = query({
  args: { scanId: v.id("scanHistory") },
  handler: async (ctx, args) => {
    const scan = await ctx.db.get(args.scanId);
    if (!scan) return null;
    
    let imageUrl = null;
    if (scan.imageStorageId) {
      imageUrl = await ctx.storage.getUrl(scan.imageStorageId);
    }
    
    return { ...scan, imageUrl };
  },
});

export const markScanAsSaved = mutation({
  args: { scanId: v.id("scanHistory") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.scanId, { isSaved: true });
    return true;
  },
});

export const getAllScans = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("scanHistory").order("desc").take(200);
  },
});
