import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL ?? "./data/lia-physics.db";
mkdirSync(dirname(databaseUrl), { recursive: true });

export const sqlite = new Database(databaseUrl);
sqlite.run("PRAGMA journal_mode = WAL;");
sqlite.run("PRAGMA foreign_keys = ON;");

export const db = drizzle(sqlite, { schema });

export function ensureSchema() {
  sqlite.run(`
    CREATE TABLE IF NOT EXISTS profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      school TEXT NOT NULL,
      tagline TEXT NOT NULL,
      bio TEXT NOT NULL,
      avatar_url TEXT NOT NULL,
      whatsapp TEXT NOT NULL,
      email TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS resources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      icon TEXT NOT NULL,
      url TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_featured INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS works (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      image_url TEXT NOT NULL,
      url TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS social_links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      platform TEXT NOT NULL,
      label TEXT NOT NULL,
      url TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS physics_facts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      source_url TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1
    );
  `);
}

export function seedDatabase() {
  const profile = sqlite.query("SELECT id FROM profiles LIMIT 1").get() as { id: number } | null;
  if (profile) return;

  const now = Date.now();
  sqlite.run(
    `INSERT INTO profiles (name, role, school, tagline, bio, avatar_url, whatsapp, email, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      "Lia Prastiwi Susanti",
      "Guru Fisika",
      "SMKN Senduro",
      "Memahami alam melalui Fisika, mengubah rasa ingin tahu menjadi pengetahuan.",
      "Saya percaya Fisika akan terasa dekat ketika kita berani menghubungkan rumus dengan kejadian sehari-hari. Di ruang belajar ini, kita mengeksplorasi konsep, mencoba eksperimen, dan tumbuh bersama melalui pertanyaan-pertanyaan yang sederhana.",
      "https://images.unsplash.com/photo-1580894732444-8ecded7900cd?auto=format&fit=crop&w=640&q=85",
      "6281234567890",
      "lia.prastiwi@smknsenduro.sch.id",
      now,
    ],
  );

  const insertResource = sqlite.prepare(
    `INSERT INTO resources (category, title, description, icon, url, sort_order, is_featured) VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );
  [
    ["Belajar", "Materi Fisika", "Ringkasan konsep dan peta belajar", "book-open", "https://drive.google.com", 1, 1],
    ["Belajar", "Modul & LKPD", "Lembar kerja untuk belajar aktif", "notebook-pen", "https://drive.google.com", 2, 1],
    ["Belajar", "Video Pembelajaran", "Penjelasan singkat yang mudah diikuti", "play-circle", "https://youtube.com", 3, 1],
    ["Eksplorasi", "Simulasi Fisika", "Amati konsep bekerja secara interaktif", "flask-conical", "https://phet.colorado.edu", 4, 1],
    ["Latihan", "Latihan Soal", "Uji pemahaman dengan soal bertahap", "target", "https://forms.google.com", 5, 1],
    ["Latihan", "Kuis Interaktif", "Belajar sambil bermain dan berdiskusi", "sparkles", "https://quizizz.com", 6, 1],
  ].forEach((row) => insertResource.run(...row));

  const insertWork = sqlite.prepare(
    `INSERT INTO works (title, description, image_url, url, sort_order) VALUES (?, ?, ?, ?, ?)`,
  );
  [
    ["Eksperimen Sederhana di Kelas", "Membawa konsep gerak dan energi lebih dekat melalui alat di sekitar kita.", "https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=900&q=85", "https://drive.google.com", 1],
    ["Fisika dalam Kehidupan", "Kumpulan media visual untuk menghubungkan teori dengan fenomena harian.", "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=900&q=85", "https://drive.google.com", 2],
    ["Proyek Energi Terbarukan", "Proyek kolaboratif siswa tentang solusi energi untuk masa depan.", "https://images.unsplash.com/photo-1466611653911-95081537e5b7?auto=format&fit=crop&w=900&q=85", "https://drive.google.com", 3],
  ].forEach((row) => insertWork.run(...row));

  const insertSocial = sqlite.prepare(
    `INSERT INTO social_links (platform, label, url, sort_order) VALUES (?, ?, ?, ?)`,
  );
  [
    ["instagram", "Instagram", "https://instagram.com", 1],
    ["youtube", "YouTube", "https://youtube.com", 2],
    ["facebook", "Facebook", "https://facebook.com", 3],
    ["drive", "Google Drive", "https://drive.google.com", 4],
  ].forEach((row) => insertSocial.run(...row));

  const insertFact = sqlite.prepare(
    `INSERT INTO physics_facts (question, answer, source_url, sort_order, active) VALUES (?, ?, ?, ?, ?)`,
  );
  [
    ["Mengapa langit berwarna biru?", "Cahaya biru lebih mudah dihamburkan oleh molekul udara dibandingkan warna lain. Itulah mengapa langit tampak biru saat siang hari.", "https://id.wikipedia.org/wiki/Penyebaran_Rayleigh", 1, 1],
    ["Mengapa kita tidak merasa Bumi sedang bergerak?", "Tubuh kita ikut bergerak bersama Bumi dengan kecepatan yang hampir konstan. Kita lebih mudah merasakan perubahan gerak daripada gerak konstan.", "https://id.wikipedia.org/wiki/Hukum_gerak_Newton", 2, 1],
    ["Kenapa es bisa mengapung di air?", "Struktur kristal es membuat jarak antar molekulnya lebih renggang, sehingga massa jenis es lebih kecil daripada air cair.", "https://id.wikipedia.org/wiki/Es", 3, 1],
  ].forEach((row) => insertFact.run(...row));
}
