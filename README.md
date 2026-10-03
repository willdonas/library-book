# Bookly — Local PDF Library

## Fitur
- Apple-inspired UI, tetapi dengan identitas Bookly sendiri
- Light/Dark mode
- Animasi dan interactive hover/modal/toast/form
- Login/Register + Enter untuk submit
- Username & password otomatis reset saat pindah tab
- Guest bisa Home, List Buku, buka PDF, dan download
- User login bisa Up-Vote/Down-Vote, rating 1–5, dan comment
- Admin tambah/edit/hapus buku PDF
- Discord webhook server-side untuk create/edit/delete, register/login, comment/vote/rating, download
- PostgreSQL lokal + Node.js/Express API

## Setup
1. Install Node.js LTS, PostgreSQL, VS Code.
2. Buat database PostgreSQL: `CREATE DATABASE book_library;`
3. Jalankan `database/schema.sql` pada database tersebut.
4. Buat `.env` dari `.env.example`.
5. Isi `DATABASE_URL` dan `JWT_SECRET`.
6. Opsional: isi `DISCORD_WEBHOOK_URL` dengan webhook Discord channel. Jangan masukkan URL ini ke frontend/Git.
7. Jalankan:

```powershell
cd backend
npm install
npm run seed:admin
npm run dev
```

8. Buka `http://localhost:3000`.

Admin demo: `admin` / `admin12345`.

## Discord webhook
Discord → Channel Settings → Integrations → Webhooks → Create Webhook → Copy URL → masukkan ke `.env`.

Event yang dikirim:
`BOOK_CREATED`, `BOOK_UPDATED`, `BOOK_DELETED`, `USER_REGISTERED`, `USER_LOGIN`, `BOOK_COMMENTED`, `BOOK_VOTED`, `BOOK_RATED`, `BOOK_DOWNLOADED`.

Webhook failure tidak membatalkan aksi website.

## Catatan
Untuk production tambahkan HTTPS, rate limiting, upload scanning, stricter CORS, moderation, backups, dan secret management. Jangan commit `.env`.
