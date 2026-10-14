# Deploy ke AWS (1 EC2 + Docker Compose)

Satu perintah membuat server, memasang Docker, membangun dashboard, meng-upload, dan menjalankan semuanya dengan HTTPS otomatis.

## Prasyarat (sekali saja)

- AWS CLI terpasang dan login: `aws configure` (IAM user dengan akses EC2 dan SSM read).
- `packages/api/.env` terisi (API key LLM, MQTT, dll.). Dipakai sebagai dasar konfigurasi produksi.

## Deploy

```bash
bash deploy/aws/deploy.sh
```

Pertama kali: membuat EC2 `t3.medium` (Ubuntu 24.04, 30 GB) di `ap-southeast-1`, Elastic IP, dan security group. Jalankan perintah yang sama untuk setiap update berikutnya.

Selesai, Anda mendapat alamat seperti `https://1-2-3-4.sslip.io` (dashboard) dan `/api/v1` (API). Domain `sslip.io` memberi HTTPS tanpa perlu beli domain.

Opsi: `AWS_REGION=us-east-1 INSTANCE_TYPE=t3.large bash deploy/aws/deploy.sh` (hanya berlaku saat server pertama dibuat).

## Yang dilakukan otomatis

| Hal | Detail |
| --- | --- |
| Server | EC2 + Elastic IP (IP tetap), swap 2 GB |
| Layanan | MySQL, Redis, RabbitMQ, API, Caddy (HTTPS + dashboard) di Docker |
| Keamanan | Hanya port 80/443 publik. SSH hanya dari IP Anda (diperbarui tiap deploy). DB, Redis, RabbitMQ tidak terekspos |
| Secret | Password DB dan RabbitMQ dibuat acak di `deploy/aws/.env.production` (di-gitignore). Jangan hapus file ini |
| Migrasi | Jalan otomatis saat API start |
| MQTT | `MQTT_CLIENT_ID` diberi akhiran `-prod` agar tidak bentrok dengan dev |
| Zona waktu | Server, MySQL, dan API memakai WIB (UTC+7, `Asia/Jakarta`). Setiap deploy mengatur dan memverifikasinya, dan gagal bila ada lapisan yang tidak WIB |

## Perlu Anda ketahui

- **Database produksi mulai kosong.** Data lokal tidak ikut. Seeder bawaan membuat user `admin1` dengan password default yang diketahui publik, jadi jangan dijalankan di produksi tanpa mengganti password.
- **Biaya** sekitar USD 35-40 per bulan (t3.medium + disk + IP) di region Singapura.
- **Backup** belum otomatis. Data ada di volume Docker pada server; buat snapshot EBS secara berkala.

## Perintah berguna

```bash
ssh -i ~/.ssh/ginem-key.pem ubuntu@<IP>
cd /opt/ginem && docker compose logs -f --tail 100 app   # log API
docker compose ps                                         # status container
```

## Menyamakan data server dengan data lokal

```bash
bash deploy/aws/sync-db.sh
```

Satu perintah untuk menggantikan seluruh data di server dengan data lokal Anda. Script akan menampilkan perbandingan jumlah data lokal dan server, meminta Anda mengetik `ya`, lalu:

1. membuat backup data server di `deploy/aws/backups/`,
2. menghentikan API sementara,
3. menimpa database server dengan ekspor database lokal,
4. memastikan jumlah baris setiap tabel sama persis, lalu menyalakan API lagi.

Kalau ada yang salah, kembalikan data lama dengan `bash deploy/aws/sync-db.sh --restore deploy/aws/backups/NAMA_FILE.sql.gz`. Tambahkan `--yes` untuk melewati pertanyaan. Server harus menyala dan sudah pernah di-deploy.

Yang ikut tersalin: semua tabel, termasuk akun pengguna beserta password-nya (login di server memakai akun lokal Anda). Yang tidak ikut: sesi WhatsApp dan antrean jadwal di Redis, karena bukan bagian dari database.

## Mengelola database dari laptop (SSH tunnel)

Database server tidak terbuka ke internet. Untuk melihat atau mengubah datanya, buka tunnel:

```bash
bash deploy/aws/db-tunnel.sh
```

Script ini membuka SSH hanya dari IP Anda saat ini, lalu menyambungkan `127.0.0.1:13306` di laptop ke MySQL di server. Password database otomatis disalin ke clipboard. Biarkan terminal tetap terbuka selama dipakai, dan tutup dengan Ctrl+C.

Lalu sambungkan client apa saja (DBeaver, TablePlus, Adminer, atau `mysql`):

| Kolom | Isi |
| --- | --- |
| Host | `127.0.0.1` |
| Port | `13306` (ganti lewat `LOCAL_PORT=23306 bash deploy/aws/db-tunnel.sh`) |
| User | `root` |
| Password | dari clipboard, atau `DB_PASSWORD` di `deploy/aws/.env.production` |
| Database | `ta_project` |

Server harus menyala dan sudah pernah di-deploy. Port 3306 dan 8889 di laptop dipakai MySQL lokal, jadi tunnel sengaja memakai port lain.

## Hapus semuanya

```bash
bash deploy/aws/destroy.sh
```

Ini menghapus server dan **seluruh datanya**, lalu meminta konfirmasi lebih dulu.
