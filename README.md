# Lia Physics Hub

Full stack micro site **Digital Teacher Profile** untuk Lia Prastiwi Susanti, Guru Fisika di SMKN Senduro. Aplikasi ini menggabungkan profil guru, ruang belajar Fisika, karya pembelajaran, pertanyaan harian, dan panel pengelola.

## Stack

- Bun + Vite + React + TypeScript
- Hono untuk API dan static server production
- Tailwind CSS v4 dan komponen lokal bergaya shadcn/ui
- Drizzle ORM dengan SQLite melalui `bun:sqlite`
- RustFS sebagai S3-compatible object storage untuk aset
- Docker Compose untuk app, SQLite volume, dan RustFS volume

## Menjalankan lokal

```bash
bun install
cp .env.example .env
bun run dev
```

Buka `http://localhost:5173`. Server API berjalan di `http://localhost:3000`.

Panel pengelola tersedia di `http://localhost:5173/admin`. Token admin diambil dari `ADMIN_TOKEN` pada `.env`.

## Menjalankan dengan Docker

```bash
docker compose up --build
```

Aplikasi tersedia di `http://localhost:3000`, API RustFS di `http://localhost:9000`, dan console RustFS di `http://localhost:9001`. Jika port tersebut sudah dipakai, jalankan dengan port host alternatif:

```bash
APP_PORT=13000 RUSTFS_PORT=19000 RUSTFS_CONSOLE_PORT=19001 docker compose up --build
```

Gunakan `ADMIN_TOKEN` yang kuat ketika aplikasi akan diakses di luar komputer lokal. Nilai pada Compose adalah fallback development.

## API utama

- `GET /api/site` mengambil seluruh data untuk situs publik.
- `GET /api/health` memeriksa API.
- `GET /api/admin/stats` mengambil data dashboard dan memerlukan header `x-admin-token`.
- `POST /api/admin/resources` dan `DELETE /api/admin/resources/:id` mengelola sumber belajar.
- Sumber belajar dapat memiliki banyak sub-menu melalui field `parentId`; `PATCH /api/admin/resources/:id` memperbarui induk atau isi sub-menu.
- `POST /api/admin/works` dan `DELETE /api/admin/works/:id` mengelola karya.
- `POST /api/uploads` menerima gambar multipart dengan field `file` dan menyimpannya ke RustFS.

Database dibuat dan di-seed otomatis saat server pertama kali berjalan. File database lokal berada di `data/lia-physics.db`; pada Compose data disimpan dalam volume `sqlite-data`.
