# Deployment production Lia Physics Hub

Panduan ini mengikuti layout VM yang sudah digunakan:

```text
/srv/apps/rakitapp-liaprofile/              source code dan Compose
/srv/data/rakitapp-liaprofile/sqlite/       SQLite production
/srv/data/rakitapp-liaprofile/uploads/      direktori operasional
/srv/backups/rakitapp-liaprofile/sqlite/    backup database
/srv/backups/rakitapp-liaprofile/uploads/   backup aset bila diperlukan
```

Aplikasi menyimpan foto profil dan aset melalui RustFS. Karena VM sudah memiliki RustFS bersama di `/srv/platform/rustfs`, Compose production hanya menjalankan container aplikasi dan mengakses RustFS melalui port host 9000.

## 1. Siapkan folder

Jalankan di VM sebagai user yang memiliki akses Docker:

```bash
sudo mkdir -p \
  /srv/apps/rakitapp-liaprofile \
  /srv/data/rakitapp-liaprofile/sqlite \
  /srv/data/rakitapp-liaprofile/uploads \
  /srv/backups/rakitapp-liaprofile/sqlite \
  /srv/backups/rakitapp-liaprofile/uploads

sudo chown -R ferilee:ferilee \
  /srv/apps/rakitapp-liaprofile \
  /srv/data/rakitapp-liaprofile \
  /srv/backups/rakitapp-liaprofile
```

Folder `uploads` disiapkan untuk kebutuhan operasional. Runtime aplikasi menggunakan bucket RustFS sebagai storage utama.

## 2. Ambil source code

File `docker-compose.production.yml` sudah tersedia di repository dan tidak menjalankan RustFS kedua.

Instalasi baru:

```bash
git clone git@github.com:ferilee/rakitapp-liaprofile.git /srv/apps/rakitapp-liaprofile
cd /srv/apps/rakitapp-liaprofile
```

Update folder yang sudah ada:

```bash
cd /srv/apps/rakitapp-liaprofile
git fetch origin
git checkout main
git pull --ff-only origin main
```

## 3. Buat environment production

Buat `/srv/apps/rakitapp-liaprofile/.env`:

```bash
cd /srv/apps/rakitapp-liaprofile
umask 077
cat > .env <<'EOF'
APP_PORT=13021
APP_DATA_DIR=/srv/data/rakitapp-liaprofile
RUSTFS_ENDPOINT=http://host.docker.internal:9000
RUSTFS_ACCESS_KEY=liaadmin
RUSTFS_SECRET_KEY=ganti-dengan-secret-rustfs-yang-sama
RUSTFS_BUCKET=lia-assets
ADMIN_TOKEN=ganti-dengan-token-admin-panjang-dan-acak
EOF
```

Buat token rahasia dengan `openssl rand -hex 32`. Credential RustFS harus sama dengan service RustFS di `/srv/platform/rustfs`. Jangan commit `.env` ke Git.

## 4. Pastikan RustFS sehat

```bash
cd /srv/platform/rustfs
docker compose ps
curl -f http://127.0.0.1:9000/health
```

Jika RustFS tidak mempublish port 9000 ke host, ganti `RUSTFS_ENDPOINT` dengan alamat service pada Docker network bersama, misalnya `http://rustfs:9000`, lalu tambahkan network eksternal yang sesuai ke Compose production.

## 5. Jalankan aplikasi

```bash
cd /srv/apps/rakitapp-liaprofile
docker compose -f docker-compose.production.yml config
docker compose -f docker-compose.production.yml up -d --build
docker compose -f docker-compose.production.yml ps
docker compose -f docker-compose.production.yml logs --tail=100 app
curl -f http://127.0.0.1:13021/api/health
```

Respons health yang diharapkan:

```json
{"ok":true,"service":"lia-physics-hub"}
```

Pada start pertama, aplikasi membuat schema SQLite, mengisi data awal, dan membuat bucket `lia-assets` ketika upload pertama dilakukan. Uji `/admin` dan upload foto profil setelah aplikasi hidup.

## 6. Hubungkan Nginx Proxy Manager

Buat Proxy Host baru dengan nilai berikut:

```text
Domain Names: domain publik Lia Physics Hub
Scheme:       http
Forward Host: IP VM atau host Docker yang menjalankan app
Forward Port: 13021
```

Aktifkan SSL Let's Encrypt, Force SSL, dan HTTP/2. Jangan arahkan proxy publik ke port RustFS 9000 atau console RustFS 9001.

## 7. Backup SQLite

SQLite menggunakan WAL. Backup sederhana yang konsisten dilakukan dengan menghentikan app sebentar:

```bash
cd /srv/apps/rakitapp-liaprofile
docker compose -f docker-compose.production.yml stop app
sudo tar -czf /srv/backups/rakitapp-liaprofile/sqlite/lia-physics-$(date +%Y%m%d-%H%M%S).tgz -C /srv/data/rakitapp-liaprofile sqlite
docker compose -f docker-compose.production.yml start app
```

Aset upload berada di bucket RustFS, sehingga backup aset perlu dilakukan dari storage RustFS bersama, bukan dari direktori SQLite aplikasi.

## 8. Update dan rollback

Update normal:

```bash
cd /srv/apps/rakitapp-liaprofile
git fetch origin
git checkout main
git pull --ff-only origin main
docker compose -f docker-compose.production.yml up -d --build
curl -f http://127.0.0.1:13021/api/health
```

Rollback:

```bash
cd /srv/apps/rakitapp-liaprofile
git log --oneline -5
git checkout <commit-yang-ingin-dipakai>
docker compose -f docker-compose.production.yml up -d --build
```

Setelah rollback terverifikasi, kembalikan branch ke `main` sebelum deployment berikutnya.

## 9. Pemeriksaan rutin

```bash
docker compose -f /srv/apps/rakitapp-liaprofile/docker-compose.production.yml ps
docker system df
curl -f https://domain-anda.example/api/health
```

Pantau log aplikasi dan RustFS. Pastikan backup SQLite tersedia, bucket RustFS ikut dibackup, token admin tidak muncul di repository, dan port RustFS tidak terbuka ke Internet.
