# ✨ Single Command Development Setup

**Excellent choice!** Anda sekarang punya setup yang **professional** dan **single command** seperti Next.js.

## 🎯 Sebelum vs Sesudah

### ❌ SEBELUM (2 Commands)
```bash
# Terminal 1
npm run dev:api

# Terminal 2
npm run dev:dashboard
```
- Perlu buka 2 terminal
- Lebih kompleks untuk onboarding
- Output tercampur jika 1 terminal

---

### ✅ SESUDAH (1 Command - Professional)
```bash
npm run dev
```
- **Satu command saja!**
- Output terpisah dengan warna berbeda [API] dan [DASHBOARD]
- Startup message yang cantik
- Seperti Next.js / Vite projects

---

## 🚀 Cara Menggunakan

### **Minimal Setup (yang direkomendasikan)**
```bash
# 1. Install (jika belum)
npm install

# 2. Run dev - just one command!
npm run dev
```

Itu saja! 🎉

**Output akan terlihat seperti ini:**
```
╔════════════════════════════════════════════════════════════════╗
║          🚀 GINEM DEV - Development Server Starting...        ║
║                                                                ║
║  🔵 Backend  API............ http://localhost:3000            ║
║  🔵 Frontend Dashboard...... http://localhost:5173            ║
╚════════════════════════════════════════════════════════════════╝

⌨️  Keyboard shortcuts:
   • Press 'rs' in either terminal to restart
   • Press 'h' in Vite terminal for help
   • Press Ctrl+C to stop all services

[API]       🚀 API server running on port 3000
[DASHBOARD] ➜  Local:   http://localhost:5173/
```

---

## 📊 Apa yang Berubah?

### **package.json**
```json
{
  "scripts": {
    "dev": "bash ./scripts/dev-startup.sh && concurrently --names \"API,DASHBOARD\" --prefix \"[{name}]\" --prefix-colors \"blue,cyan\" \"npm run dev:api\" \"npm run dev:dashboard\"",
    "dev:api": "npm run dev -w packages/api",
    "dev:dashboard": "npm run dev -w packages/dashboard"
  }
}
```

**Penjelasan:**
- `scripts/dev-startup.sh` - Menampilkan welcome message yang cantik
- `concurrently` - Menjalankan 2 process secara parallel
- `--names "API,DASHBOARD"` - Label untuk setiap process
- `--prefix-colors "blue,cyan"` - Warna berbeda untuk setiap output

### **File Baru**
- `scripts/dev-startup.sh` - Welcome message dan info

---

## 💡 Fitur Unggulan

### 1️⃣ **Colored Output**
```
[API]       message dari backend
[DASHBOARD] message dari frontend
```
Setiap app punya warna berbeda, mudah dibedakan!

### 2️⃣ **Welcome Screen**
Menampilkan URL dan keyboard shortcuts saat startup

### 3️⃣ **Easy Stop**
```bash
Ctrl+C  # Berhenti keduanya sekaligus
```

### 4️⃣ **Independent Commands**
Kalau hanya mau run satu saja:
```bash
npm run dev:api
npm run dev:dashboard
```

---

## 🔗 Available Commands

| Command | Apa | Terminal |
|---------|-----|----------|
| `npm run dev` | ✨ **UTAMA** - Run keduanya | 1 |
| `npm run dev:api` | Run API saja | 1 |
| `npm run dev:dashboard` | Run Dashboard saja | 1 |
| `npm run build` | Build untuk production | 1 |
| `npm run build:api` | Build API saja | 1 |
| `npm run build:dashboard` | Build Dashboard saja | 1 |
| `npm run test` | Run semua tests | 1 |
| `npm run lint` | Check code quality | 1 |
| `npm run lint:fix` | Fix issues otomatis | 1 |

---

## 🎯 Troubleshooting

### Error: "concurrently: command not found"
```bash
npm install
npm run dev
```

### Error: Port already in use
```bash
# Kill process di port
lsof -i :3000 | awk 'NR!=1 {print $2}' | xargs kill -9
lsof -i :5173 | awk 'NR!=1 {print $2}' | xargs kill -9

npm run dev
```

### Only API running, Dashboard blank
1. Cek browser console (F12)
2. Pastikan API running di port 3000
3. Check `.env` di packages/dashboard

---

## 📦 Tech Stack

| Component | Package | Purpose |
|-----------|---------|---------|
| API | `tsx` | TypeScript runner |
| Dashboard | `vite` | Frontend dev server |
| Parallel | `concurrently` | Run multiple scripts |
| Backend | `express` | Node framework |
| Frontend | `react` | UI library |

---

## 🎯 Best Practices

✅ **Do:**
- Gunakan `npm run dev` untuk development
- Cek logs di terminal untuk debugging
- Update `.env` sebelum jalankan
- Commit atomic changes ke git

❌ **Don't:**
- Jangan hapus `scripts/dev-startup.sh`
- Jangan modifikasi concurrently config tanpa alasan
- Jangan run `npm install` di dalam packages/

---

## 📈 Scalability

Kalau nanti ada service/package baru (e.g., worker, admin):

```json
{
  "dev": "concurrently --names \"API,DASHBOARD,WORKER\" ... \"npm run dev:api\" \"npm run dev:dashboard\" \"npm run dev:worker\""
}
```

Tetap 1 command! 🎉

---

## 🎉 Summary

Anda sekarang punya:
- ✅ Single command development (`npm run dev`)
- ✅ Professional output dengan colors
- ✅ Welcome screen yang cantik
- ✅ Seperti industry-standard projects (Next.js, Vite)
- ✅ Mudah untuk onboarding tim baru

**ENJOY! 🚀**

```bash
npm run dev
```

That's all you need! ✨
