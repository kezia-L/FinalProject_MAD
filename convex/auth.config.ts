// convex/auth.config.ts
// Konfigurasi JWT dari Clerk untuk Convex backend
// Domain diambil dari Publishable Key: becoming-cub-22.clerk.accounts.dev
export default {
  providers: [
    {
      domain: "https://becoming-cub-22.clerk.accounts.dev",
      applicationID: "convex",
    },
  ],
};
