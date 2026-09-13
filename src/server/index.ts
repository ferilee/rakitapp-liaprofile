import { existsSync } from "node:fs";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import type { Context, Next } from "hono";
import { cors } from "hono/cors";
import { serveStatic } from "hono/bun";
import { desc, eq } from "drizzle-orm";
import { db, ensureSchema, seedDatabase, seedResourceSubmenus } from "./db";
import { physicsFacts, profiles, resources, socialLinks, works } from "./db/schema";
import { readAsset, uploadAsset } from "./storage";

export type AppDependencies = {
  db: typeof db;
  uploadAsset: typeof uploadAsset;
  readAsset: typeof readAsset;
  adminToken: string;
};

export function createApp(overrides: Partial<AppDependencies> = {}) {
  const database = overrides.db ?? db;
  const upload = overrides.uploadAsset ?? uploadAsset;
  const read = overrides.readAsset ?? readAsset;
  const adminToken = overrides.adminToken ?? process.env.ADMIN_TOKEN ?? "dev-admin-token";
  const app = new Hono();

  app.use("/api/*", cors());

  const requireAdmin = async (c: Context, next: Next) => {
    if (c.req.header("x-admin-token") !== adminToken) return c.json({ error: "Token admin tidak valid" }, 401);
    await next();
  };

  app.use("/api/admin/*", requireAdmin);
  app.use("/api/uploads", requireAdmin);

  app.get("/api/health", (c) => c.json({ ok: true, service: "lia-physics-hub" }));

  app.get("/api/site", (c) => {
    const profile = database.select().from(profiles).limit(1).get();
    const resourceItems = database.select().from(resources).orderBy(resources.sortOrder).all();
    const workItems = database.select().from(works).orderBy(works.sortOrder).all();
    const socialItems = database.select().from(socialLinks).orderBy(socialLinks.sortOrder).all();
    const factItems = database
      .select()
      .from(physicsFacts)
      .where(eq(physicsFacts.active, true))
      .orderBy(physicsFacts.sortOrder)
      .all();
    const fact = factItems.length ? factItems[Math.floor(Math.random() * factItems.length)] : null;

    return c.json({ profile, resources: resourceItems, works: workItems, socials: socialItems, fact });
  });

  app.get("/api/admin/stats", (c) => {
    return c.json({
      profile: database.select().from(profiles).limit(1).get(),
      resources: database.select().from(resources).orderBy(desc(resources.id)).all(),
      works: database.select().from(works).orderBy(desc(works.id)).all(),
      facts: database.select().from(physicsFacts).orderBy(desc(physicsFacts.id)).all(),
      socials: database.select().from(socialLinks).orderBy(socialLinks.sortOrder).all(),
    });
  });

  app.patch("/api/admin/profile", async (c) => {
    const body = await c.req.json<Record<string, unknown>>();
    const result = database
      .update(profiles)
      .set({
        name: String(body.name ?? "Lia Prastiwi Susanti"),
        role: String(body.role ?? "Guru Fisika"),
        school: String(body.school ?? "SMKN Senduro"),
        tagline: String(body.tagline ?? ""),
        bio: String(body.bio ?? ""),
        avatarUrl: String(body.avatarUrl ?? ""),
        whatsapp: String(body.whatsapp ?? ""),
        email: String(body.email ?? ""),
        updatedAt: new Date(),
      })
      .where(eq(profiles.id, 1))
      .returning()
      .get();
    if (!result) return c.json({ error: "Profil tidak ditemukan" }, 404);
    return c.json(result);
  });

  app.patch("/api/admin/socials/:id", async (c) => {
    const body = await c.req.json<Record<string, unknown>>();
    const result = database
      .update(socialLinks)
      .set({
        label: String(body.label ?? "Media sosial"),
        url: String(body.url ?? "#"),
      })
      .where(eq(socialLinks.id, Number(c.req.param("id"))))
      .returning()
      .get();
    if (!result) return c.json({ error: "Link media sosial tidak ditemukan" }, 404);
    return c.json(result);
  });

  app.post("/api/admin/resources", async (c) => {
    const body = await c.req.json<Record<string, unknown>>();
    const result = database
      .insert(resources)
      .values({
        category: String(body.category ?? "Belajar"),
        title: String(body.title ?? "Sumber Belajar"),
        description: String(body.description ?? ""),
        icon: String(body.icon ?? "book-open"),
        url: String(body.url ?? "#"),
        parentId: body.parentId ? Number(body.parentId) : null,
        sortOrder: Number(body.sortOrder ?? 99),
        isFeatured: Boolean(body.isFeatured ?? true),
      })
      .returning()
      .get();
    return c.json(result, 201);
  });

  app.delete("/api/admin/resources/:id", (c) => {
    const id = Number(c.req.param("id"));
    database.delete(resources).where(eq(resources.id, id)).run();
    return c.body(null, 204);
  });

  app.patch("/api/admin/resources/:id", async (c) => {
    const body = await c.req.json<Record<string, unknown>>();
    const result = database
      .update(resources)
      .set({
        category: String(body.category ?? "Belajar"),
        title: String(body.title ?? "Sumber Belajar"),
        description: String(body.description ?? ""),
        icon: String(body.icon ?? "book-open"),
        url: String(body.url ?? "#"),
        parentId: body.parentId ? Number(body.parentId) : null,
      })
      .where(eq(resources.id, Number(c.req.param("id"))))
      .returning()
      .get();
    if (!result) return c.json({ error: "Sumber belajar tidak ditemukan" }, 404);
    return c.json(result);
  });

  app.post("/api/admin/works", async (c) => {
    const body = await c.req.json<Record<string, unknown>>();
    const result = database
      .insert(works)
      .values({
        title: String(body.title ?? "Karya Baru"),
        description: String(body.description ?? ""),
        imageUrl: String(body.imageUrl ?? "https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=900&q=85"),
        url: String(body.url ?? "#"),
        sortOrder: Number(body.sortOrder ?? 99),
      })
      .returning()
      .get();
    return c.json(result, 201);
  });

  app.delete("/api/admin/works/:id", (c) => {
    database.delete(works).where(eq(works.id, Number(c.req.param("id")))).run();
    return c.body(null, 204);
  });

  app.patch("/api/admin/works/:id", async (c) => {
    const body = await c.req.json<Record<string, unknown>>();
    const result = database
      .update(works)
      .set({
        title: String(body.title ?? "Karya Baru"),
        description: String(body.description ?? ""),
        imageUrl: String(body.imageUrl ?? ""),
        url: String(body.url ?? "#"),
      })
      .where(eq(works.id, Number(c.req.param("id"))))
      .returning()
      .get();
    if (!result) return c.json({ error: "Karya tidak ditemukan" }, 404);
    return c.json(result);
  });

  app.post("/api/uploads", async (c) => {
    const body = await c.req.parseBody();
    const file = body.file;
    if (!(file instanceof File)) return c.json({ error: "File tidak ditemukan" }, 400);
    if (!file.type.startsWith("image/")) return c.json({ error: "Hanya file gambar yang didukung" }, 400);
    if (file.size > 5 * 1024 * 1024) return c.json({ error: "Ukuran gambar maksimal 5 MB" }, 400);

    try {
      const key = await upload(file);
      const url = `/api/assets/${key.split("/").map(encodeURIComponent).join("/")}`;
      return c.json({ url }, 201);
    } catch (error) {
      console.error(error);
      return c.json({ error: "Upload gagal. Pastikan RustFS sedang berjalan." }, 503);
    }
  });

  app.get("/api/assets/*", async (c) => {
    const key = c.req.path.slice("/api/assets/".length).split("/").map(decodeURIComponent).join("/");
    try {
      const asset = await read(key);
      const body = await asset.Body?.transformToByteArray();
      if (!body) return c.json({ error: "Aset tidak ditemukan" }, 404);
      const bytes = new Uint8Array(body.byteLength);
      bytes.set(body);
      return c.body(bytes, 200, { "Content-Type": asset.ContentType ?? "application/octet-stream", "Cache-Control": "public, max-age=31536000, immutable" });
    } catch {
      return c.json({ error: "Aset tidak ditemukan" }, 404);
    }
  });

  app.notFound((c) => {
    if (c.req.path.startsWith("/api/")) return c.json({ error: "Endpoint tidak ditemukan" }, 404);
    const indexPath = "./dist/client/index.html";
    if (existsSync(indexPath)) return c.html(Bun.file(indexPath).text());
    return c.text("Lia Physics Hub sedang berjalan dalam mode API.", 404);
  });

  app.use("/*", serveStatic({ root: "./dist/client" }));
  return app;
}

export const app = createApp();

if (import.meta.main) {
  ensureSchema();
  seedDatabase();
  seedResourceSubmenus();
  const port = Number(process.env.PORT ?? 3000);
  console.log(`Lia Physics Hub berjalan di http://localhost:${port}`);
  serve({ fetch: app.fetch, port });
}
