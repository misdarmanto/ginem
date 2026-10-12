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

## Hapus semuanya

```bash
bash deploy/aws/destroy.sh
```

Ini menghapus server dan **seluruh datanya**, lalu meminta konfirmasi lebih dulu.
