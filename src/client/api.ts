export type Profile = {
  id: number;
  name: string;
  role: string;
  school: string;
  tagline: string;
  bio: string;
  avatarUrl: string;
  whatsapp: string;
  email: string;
};

export type Resource = {
  id: number;
  category: string;
  title: string;
  description: string;
  icon: string;
  url: string;
  parentId: number | null;
  sortOrder: number;
  isFeatured: boolean;
};

export type Work = { id: number; title: string; description: string; imageUrl: string; url: string; sortOrder: number };
export type Social = { id: number; platform: string; label: string; url: string; sortOrder: number };
export type Fact = { id: number; question: string; answer: string; sourceUrl: string; sortOrder: number; active: boolean };
export type SiteData = { profile: Profile; resources: Resource[]; works: Work[]; socials: Social[]; fact: Fact | null };

export async function getSite(): Promise<SiteData> {
  const response = await fetch("/api/site");
  if (!response.ok) throw new Error("Gagal memuat data situs");
  return response.json();
}

export async function adminRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const token = typeof localStorage === "undefined" ? "" : localStorage.getItem("lia-admin-token") ?? "";
  const response = await fetch(path, { headers: { "Content-Type": "application/json", "x-admin-token": token, ...(init?.headers ?? {}) }, ...init });
  if (!response.ok) throw new Error((await response.json().catch(() => null))?.error ?? "Permintaan gagal");
  return response.status === 204 ? (undefined as T) : response.json();
}

export async function uploadAdminAsset(file: File): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append("file", file);
  const token = typeof localStorage === "undefined" ? "" : localStorage.getItem("lia-admin-token") ?? "";
  const response = await fetch("/api/uploads", { method: "POST", headers: { "x-admin-token": token }, body: formData });
  if (!response.ok) throw new Error((await response.json().catch(() => null))?.error ?? "Upload foto gagal");
  return response.json();
}
