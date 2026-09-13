import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { createApp } from "./index";
import { createDatabase, ensureSchema, seedDatabase, seedResourceSubmenus } from "./db";
import type { readAsset, uploadAsset } from "./storage";

const ADMIN_TOKEN = "test-admin-token";

let database: ReturnType<typeof createDatabase>;
let app: ReturnType<typeof createApp>;
let uploadShouldFail = false;
const storedAssets = new Map<string, { bytes: Uint8Array; contentType: string }>();

const mockedUploadAsset: typeof uploadAsset = async (file) => {
  if (uploadShouldFail) throw new Error("storage unavailable");
  const key = `uploads/test-${file.name}`;
  storedAssets.set(key, { bytes: new Uint8Array(await file.arrayBuffer()), contentType: file.type });
  return key;
};

const mockedReadAsset: typeof readAsset = async (key) => {
  const asset = storedAssets.get(key);
  if (!asset) throw new Error("asset not found");
  return {
    ContentType: asset.contentType,
    Body: { transformToByteArray: async () => asset.bytes },
  } as Awaited<ReturnType<typeof readAsset>>;
};

beforeEach(() => {
  database = createDatabase(":memory:");
  ensureSchema(database.sqlite);
  seedDatabase(database.sqlite);
  seedResourceSubmenus(database.sqlite);
  storedAssets.clear();
  uploadShouldFail = false;
  app = createApp({ db: database.db, adminToken: ADMIN_TOKEN, uploadAsset: mockedUploadAsset, readAsset: mockedReadAsset });
});

afterEach(() => database.sqlite.close());

function adminHeaders(extra: HeadersInit = {}) {
  return { "x-admin-token": ADMIN_TOKEN, ...extra };
}

function jsonRequest(method: string, body: unknown, authenticated = true) {
  return {
    method,
    headers: authenticated ? adminHeaders({ "content-type": "application/json" }) : { "content-type": "application/json" },
    body: JSON.stringify(body),
  };
}

describe("public API", () => {
  test("health endpoint reports a healthy service", async () => {
    const response = await app.request("/api/health");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, service: "lia-physics-hub" });
  });

  test("site endpoint returns profile, resources, nested resources, works, socials, and an active fact", async () => {
    const response = await app.request("/api/site");
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.profile.name).toBe("Lia Prastiwi Susanti");
    expect(body.resources).toHaveLength(25);
    expect(body.resources.filter((resource: { parentId: number | null }) => resource.parentId === null)).toHaveLength(6);
    expect(body.resources.some((resource: { parentId: number | null }) => resource.parentId !== null)).toBe(true);
    expect(body.works).toHaveLength(3);
    expect(body.socials).toHaveLength(4);
    expect(body.fact.question).toBeString();
  });
});

describe("admin authentication and profile endpoints", () => {
  test("rejects protected endpoints without the admin token", async () => {
    const response = await app.request("/api/admin/stats");

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Token admin tidak valid" });
  });

  test("returns admin stats with the admin token", async () => {
    const response = await app.request("/api/admin/stats", { headers: adminHeaders() });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.profile.name).toBe("Lia Prastiwi Susanti");
    expect(body.resources).toHaveLength(25);
    expect(body.works).toHaveLength(3);
    expect(body.facts).toHaveLength(3);
    expect(body.socials).toHaveLength(4);
  });

  test("updates the profile", async () => {
    const response = await app.request("/api/admin/profile", jsonRequest("PATCH", {
      name: "Lia Baru",
      role: "Guru Fisika",
      school: "SMKN Senduro",
      tagline: "Tagline baru",
      bio: "Bio baru",
      avatarUrl: "https://example.com/avatar.png",
      whatsapp: "628111111111",
      email: "lia@example.com",
    }));

    expect(response.status).toBe(200);
    expect((await response.json()).name).toBe("Lia Baru");
    const siteResponse = await app.request("/api/site");
    expect((await siteResponse.json()).profile.email).toBe("lia@example.com");
  });

  test("returns not found when updating a missing profile", async () => {
    database.sqlite.run("DELETE FROM profiles");
    const response = await app.request("/api/admin/profile", jsonRequest("PATCH", {}));

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Profil tidak ditemukan" });
  });

  test("updates a social link and handles an unknown social link", async () => {
    const updated = await app.request("/api/admin/socials/1", jsonRequest("PATCH", { label: "Instagram Lia", url: "https://instagram.com/lia" }));
    const missing = await app.request("/api/admin/socials/9999", jsonRequest("PATCH", {}));

    expect(updated.status).toBe(200);
    expect((await updated.json()).url).toBe("https://instagram.com/lia");
    expect(missing.status).toBe(404);
    expect(await missing.json()).toEqual({ error: "Link media sosial tidak ditemukan" });
  });
});

describe("resource endpoints", () => {
  test("creates a resource with a parent resource", async () => {
    const response = await app.request("/api/admin/resources", jsonRequest("POST", {
      title: "Kelas XIII",
      description: "Materi tambahan",
      category: "Belajar",
      icon: "book-open",
      url: "https://drive.google.com/new",
      parentId: 1,
    }));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.title).toBe("Kelas XIII");
    expect(body.parentId).toBe(1);
  });

  test("updates a resource and handles an unknown resource", async () => {
    const updated = await app.request("/api/admin/resources/1", jsonRequest("PATCH", {
      title: "Materi Fisika Terbaru",
      description: "Deskripsi terbaru",
      category: "Eksplorasi",
      icon: "sparkles",
      url: "https://example.com/materi",
      parentId: null,
    }));
    const missing = await app.request("/api/admin/resources/9999", jsonRequest("PATCH", {}));

    expect(updated.status).toBe(200);
    expect((await updated.json()).title).toBe("Materi Fisika Terbaru");
    expect(missing.status).toBe(404);
    expect(await missing.json()).toEqual({ error: "Sumber belajar tidak ditemukan" });
  });

  test("deletes a resource", async () => {
    const response = await app.request("/api/admin/resources/1", { method: "DELETE", headers: adminHeaders() });
    const siteResponse = await app.request("/api/site");
    const site = await siteResponse.json();

    expect(response.status).toBe(204);
    expect(site.resources.some((resource: { id: number }) => resource.id === 1)).toBe(false);
  });
});

describe("work endpoints", () => {
  test("creates a work with the default thumbnail", async () => {
    const response = await app.request("/api/admin/works", jsonRequest("POST", {
      title: "Karya Baru",
      description: "Media pembelajaran",
      url: "https://example.com/work",
    }));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.title).toBe("Karya Baru");
    expect(body.imageUrl).toContain("images.unsplash.com");
  });

  test("updates a work and handles an unknown work", async () => {
    const updated = await app.request("/api/admin/works/1", jsonRequest("PATCH", {
      title: "Eksperimen Terbaru",
      description: "Eksperimen yang diperbarui",
      imageUrl: "https://example.com/work.png",
      url: "https://example.com/work",
    }));
    const missing = await app.request("/api/admin/works/9999", jsonRequest("PATCH", {}));

    expect(updated.status).toBe(200);
    expect((await updated.json()).title).toBe("Eksperimen Terbaru");
    expect(missing.status).toBe(404);
    expect(await missing.json()).toEqual({ error: "Karya tidak ditemukan" });
  });

  test("deletes a work", async () => {
    const response = await app.request("/api/admin/works/1", { method: "DELETE", headers: adminHeaders() });
    const siteResponse = await app.request("/api/site");
    const site = await siteResponse.json();

    expect(response.status).toBe(204);
    expect(site.works.some((work: { id: number }) => work.id === 1)).toBe(false);
  });
});

describe("upload and asset endpoints", () => {
  test("validates upload authentication, file type, and file size", async () => {
    const unauthorized = await app.request("/api/uploads", { method: "POST" });
    const missing = await app.request("/api/uploads", { method: "POST", headers: adminHeaders() });
    const invalidType = new FormData();
    invalidType.append("file", new File(["text"], "notes.txt", { type: "text/plain" }));
    const invalidTypeResponse = await app.request("/api/uploads", { method: "POST", headers: adminHeaders(), body: invalidType });
    const tooLarge = new FormData();
    tooLarge.append("file", new File([new Uint8Array(5 * 1024 * 1024 + 1)], "large.png", { type: "image/png" }));
    const tooLargeResponse = await app.request("/api/uploads", { method: "POST", headers: adminHeaders(), body: tooLarge });

    expect(unauthorized.status).toBe(401);
    expect(missing.status).toBe(400);
    expect(invalidTypeResponse.status).toBe(400);
    expect(tooLargeResponse.status).toBe(400);
  });

  test("uploads an image and returns an encoded asset URL", async () => {
    const form = new FormData();
    form.append("file", new File(["image-data"], "profile photo.png", { type: "image/png" }));
    const response = await app.request("/api/uploads", { method: "POST", headers: adminHeaders(), body: form });
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.url).toBe("/api/assets/uploads/test-profile%20photo.png");
  });

  test("returns a service unavailable response when storage upload fails", async () => {
    uploadShouldFail = true;
    const originalConsoleError = console.error;
    console.error = () => {};
    const form = new FormData();
    form.append("file", new File(["image-data"], "profile.png", { type: "image/png" }));
    const response = await app.request("/api/uploads", { method: "POST", headers: adminHeaders(), body: form });
    console.error = originalConsoleError;

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "Upload gagal. Pastikan RustFS sedang berjalan." });
  });

  test("serves an uploaded asset and returns not found for a missing asset", async () => {
    const form = new FormData();
    form.append("file", new File(["asset-data"], "asset.png", { type: "image/png" }));
    const uploadResponse = await app.request("/api/uploads", { method: "POST", headers: adminHeaders(), body: form });
    const { url } = await uploadResponse.json();
    const assetResponse = await app.request(url);
    const missingResponse = await app.request("/api/assets/uploads/missing.png");

    expect(assetResponse.status).toBe(200);
    expect(assetResponse.headers.get("content-type")).toContain("image/png");
    expect(new TextDecoder().decode(await assetResponse.arrayBuffer())).toBe("asset-data");
    expect(missingResponse.status).toBe(404);
    expect(await missingResponse.json()).toEqual({ error: "Aset tidak ditemukan" });
  });
});

test("returns a JSON 404 for an unknown API endpoint", async () => {
  const response = await app.request("/api/unknown");

  expect(response.status).toBe(404);
  expect(await response.json()).toEqual({ error: "Endpoint tidak ditemukan" });
});
