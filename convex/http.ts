// convex/http.ts
// HTTP Action untuk menerima callback dari Google OAuth
// URL: https://rapid-sturgeon-227.convex.site/auth/google/callback

import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

const http = httpRouter();

http.route({
  path: "/auth/google/callback",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const rawState = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    // Ekstrak sessionId dan returnUri yang di-encode dari aplikasi
    let sessionId = rawState;
    let returnUri: string | null = null;
    try {
      if (rawState) {
        const decodedStr = atob(rawState);
        const stateObj = JSON.parse(decodedStr);
        sessionId = stateObj.id;
        returnUri = stateObj.returnUri;
      }
    } catch (e) {
      // Abaikan jika bukan base64/JSON valid, gunakan rawState sebagai sessionId
    }

    // HTML helper
    const htmlPage = (title: string, message: string, isError = false) =>
      new Response(
        `<!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>${title}</title>
            <style>
              body { font-family: -apple-system, sans-serif; display: flex; align-items: center;
                justify-content: center; min-height: 100vh; margin: 0; background: #f0fdf4; }
              .card { text-align: center; padding: 40px; background: white; border-radius: 16px;
                box-shadow: 0 4px 24px rgba(0,0,0,0.08); max-width: 320px; }
              .icon { font-size: 48px; margin-bottom: 16px; }
              h2 { margin: 0 0 8px; color: ${isError ? "#ef4444" : "#16a34a"}; }
              p { color: #6b7280; margin: 0; }
            </style>
          </head>
          <body>
            <div class="card">
              <div class="icon">${isError ? "❌" : "✅"}</div>
              <h2>${title}</h2>
              <p>${message}</p>
            </div>
          </body>
        </html>`,
        { headers: { "Content-Type": "text/html" } }
      );

    // Handle error dari Google
    if (error) {
      return htmlPage("Login Dibatalkan", "Kamu membatalkan login Google. Silakan coba lagi di aplikasi.", true);
    }

    if (!code || !sessionId) {
      return htmlPage("Error", "Parameter tidak lengkap.", true);
    }

    try {
      // Exchange authorization code untuk access token
      const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
      const redirectUri = process.env.CONVEX_SITE_URL + "/auth/google/callback";

      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: clientId!,
          client_secret: clientSecret!,
          redirect_uri: redirectUri!,
          grant_type: "authorization_code",
        }).toString(),
      });

      const tokens = await tokenRes.json();

      if (!tokens.access_token) {
        console.error("Token exchange failed:", tokens);
        return htmlPage("Login Gagal", "Tidak bisa mendapatkan token dari Google.", true);
      }

      // Ambil info user dari Google
      const userRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      const userInfo = await userRes.json();

      // Simpan user ke Convex dan buat session
      await ctx.runMutation(api.users.upsertGoogleUser, {
        googleId: userInfo.sub,
        name: userInfo.name ?? "Pengguna Google",
        email: userInfo.email ?? "",
        picture: userInfo.picture,
      });

      // Simpan session dengan sessionId sebagai key (agar app bisa poll)
      await ctx.runMutation(api.googleAuth.storeSession, {
        state: sessionId!,
        googleId: userInfo.sub,
        name: userInfo.name ?? "Pengguna Google",
        email: userInfo.email ?? "",
      });

      // Jika ada returnUri (app berjalan), redirect ke sana agar browser menutup otomatis
      if (returnUri) {
        return new Response(null, {
          status: 302,
          headers: { Location: returnUri },
        });
      }

      // Jika tidak ada returnUri (fallback)
      return htmlPage(
        "Login Berhasil!",
        "Kamu bisa menutup halaman ini dan kembali ke aplikasi HealthMate."
      );
    } catch (err) {
      console.error("Google OAuth callback error:", err);
      return htmlPage("Error", "Terjadi kesalahan internal. Silakan coba lagi.", true);
    }
  }),
});

export default http;
