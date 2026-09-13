# Deployment production Lia Physics Hub

Panduan ini mengikuti layout VM yang sudah digunakan:

```text
/srv/apps/rakitapp-liaprofile/              Compose production dan environment
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

## 2. Siapkan stack di Arcane

Workflow GitHub Actions akan menjalankan test, typecheck, build, lalu mempublikasikan image ke GHCR dengan tag commit pendek dan `latest`. Arcane mengambil file Compose dari repository atau konfigurasi stack yang sudah Anda kelola.

Gunakan pengaturan berikut di Arcane:

```text
Repository:  git@github.com:ferilee/rakitapp-liaprofile.git
Branch:      main
Compose:     docker-compose.production.yml
Image:       ghcr.io/ferilee/rakitapp-liaprofile:<tag>
```

Jika Arcane menyimpan Compose secara langsung, tempel isi `docker-compose.production.yml` dan pastikan image GHCR dapat dipull oleh Docker host.

Tidak diperlukan `git clone` manual di VM. Arcane mengambil source Compose dari Git atau menggunakan Compose yang disimpan di dalam stack.

## 3. Atur environment production di Arcane

Masukkan variable berikut pada bagian Environment/Variables stack Arcane:

```text
APP_PORT=13021
IMAGE_TAG=latest
APP_DATA_DIR=/srv/data/rakitapp-liaprofile
RUSTFS_ENDPOINT=http://host.docker.internal:9000
RUSTFS_ACCESS_KEY=liaadmin
RUSTFS_SECRET_KEY=ganti-dengan-secret-rustfs-yang-sama
RUSTFS_BUCKET=lia-assets
ADMIN_TOKEN=ganti-dengan-token-admin-panjang-dan-acak
```

Buat token rahasia dengan `openssl rand -hex 32`. Credential RustFS harus sama dengan service RustFS di `/srv/platform/rustfs`. Tandai `RUSTFS_SECRET_KEY` dan `ADMIN_TOKEN` sebagai secret bila Arcane mendukungnya.

Jika Compose dijalankan manual dari shell, variable yang sama dapat disimpan dalam file `.env` di samping file Compose. File tersebut tidak boleh di-commit.

Untuk deploy versi tertentu, ubah `IMAGE_TAG` ke tag commit, misalnya `f9785dc`. Jangan bergantung pada `latest` untuk rollback.

## 4. Pastikan RustFS sehat

```bash
cd /srv/platform/rustfs
docker compose ps
curl -f http://127.0.0.1:9000/health
```

Jika RustFS tidak mempublish port 9000 ke host, ganti `RUSTFS_ENDPOINT` dengan alamat service pada Docker network bersama, misalnya `http://rustfs:9000`, lalu tambahkan network eksternal yang sesuai ke Compose production.

## 5. Deploy dari Arcane

Di Arcane, jalankan urutan berikut setiap ada image baru:

```text
Pull image GHCR
Redeploy atau recreate stack
Periksa status health container
```

Jika perlu menjalankan dari shell VM untuk troubleshooting:

```bash
docker compose -f docker-compose.production.yml pull
docker compose -f docker-compose.production.yml up -d --force-recreate
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

Update normal dilakukan dengan push ke branch `main`:

```bash
git add .
git commit -m "Update application"
git push origin main
```

Setelah GitHub Actions selesai, Arcane pull dan redeploy. Untuk rollback, ubah `IMAGE_TAG` di Arcane ke tag commit sebelumnya, lalu pull dan redeploy ulang.

```bash
docker pull ghcr.io/ferilee/rakitapp-liaprofile:<commit-sebelumnya>
```

Pastikan Arcane sudah login ke `ghcr.io` jika package GHCR bersifat private. Volume SQLite tetap dipertahankan saat container diganti.

## 9. Pemeriksaan rutin

```bash
docker compose -f /srv/apps/rakitapp-liaprofile/docker-compose.production.yml ps
docker system df
curl -f https://domain-anda.example/api/health
```

Pantau log aplikasi dan RustFS. Pastikan backup SQLite tersedia, bucket RustFS ikut dibackup, token admin tidak muncul di repository, dan port RustFS tidak terbuka ke Internet.
