import { existsSync } from "node:fs";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import type { Context, Next } from "hono";
import { cors } from "hono/cors";
import { serveStatic } from "hono/bun";
import { desc, eq } from "drizzle-orm";
import { db, ensureSchema, seedDatabase } from "./db";
import { physicsFacts, profiles, resources, socialLinks, works } from "./db/schema";
import { readAsset, uploadAsset } from "./storage";

ensureSchema();
seedDatabase();

const app = new Hono();
app.use("/api/*", cors());

const adminToken = process.env.ADMIN_TOKEN ?? "dev-admin-token";
const requireAdmin = async (c: Context, next: Next) => {
  if (c.req.header("x-admin-token") !== adminToken) return c.json({ error: "Token admin tidak valid" }, 401);
  await next();
};
app.use("/api/admin/*", requireAdmin);
app.use("/api/uploads", requireAdmin);

app.get("/api/health", (c) => c.json({ ok: true, service: "lia-physics-hub" }));

app.get("/api/site", (c) => {
  const profile = db.select().from(profiles).limit(1).get();
  const resourceItems = db.select().from(resources).orderBy(resources.sortOrder).all();
  const workItems = db.select().from(works).orderBy(works.sortOrder).all();
  const socialItems = db.select().from(socialLinks).orderBy(socialLinks.sortOrder).all();
  const factItems = db
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
    profile: db.select().from(profiles).limit(1).get(),
    resources: db.select().from(resources).orderBy(desc(resources.id)).all(),
    works: db.select().from(works).orderBy(desc(works.id)).all(),
    facts: db.select().from(physicsFacts).orderBy(desc(physicsFacts.id)).all(),
  });
});

app.post("/api/admin/resources", async (c) => {
  const body = await c.req.json<Record<string, unknown>>();
  const result = db
    .insert(resources)
    .values({
      category: String(body.category ?? "Belajar"),
      title: String(body.title ?? "Sumber Belajar"),
      description: String(body.description ?? ""),
      icon: String(body.icon ?? "book-open"),
      url: String(body.url ?? "#"),
      sortOrder: Number(body.sortOrder ?? 99),
      isFeatured: Boolean(body.isFeatured ?? true),
    })
    .returning()
    .get();
  return c.json(result, 201);
});

app.delete("/api/admin/resources/:id", (c) => {
  const id = Number(c.req.param("id"));
  db.delete(resources).where(eq(resources.id, id)).run();
  return c.body(null, 204);
});

app.post("/api/admin/works", async (c) => {
  const body = await c.req.json<Record<string, unknown>>();
  const result = db
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
  db.delete(works).where(eq(works.id, Number(c.req.param("id")))).run();
  return c.body(null, 204);
});

app.post("/api/uploads", async (c) => {
  const body = await c.req.parseBody();
  const file = body.file;
  if (!(file instanceof File)) return c.json({ error: "File tidak ditemukan" }, 400);
  if (!file.type.startsWith("image/")) return c.json({ error: "Hanya file gambar yang didukung" }, 400);
  if (file.size > 5 * 1024 * 1024) return c.json({ error: "Ukuran gambar maksimal 5 MB" }, 400);

  try {
    const key = await uploadAsset(file);
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
    const asset = await readAsset(key);
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

const port = Number(process.env.PORT ?? 3000);
console.log(`Lia Physics Hub berjalan di http://localhost:${port}`);
serve({ fetch: app.fetch, port });
