# Format JSON yang Dihasilkan LLM

Dokumen ini menjelaskan seluruh JSON yang dibuat atau dikonsumsi LLM pada fitur
**kontrol perangkat**, **monitoring**, **scheduler**, dan **aturan dinamis (Rule Engine)**.

Definisi lengkap parameter tiap tool (tipe, wajib, batasan, JSON Schema): [`llm-tool-definitions.md`](llm-tool-definitions.md).

Sumber kebenaran: skema zod di `packages/api/src/services/mcp/tools/device/*` dan
`packages/api/src/schemas/RuleSchema.ts`.

## 1. Prinsip kerja

```
Pengguna ──(bahasa alami)──▶ LLM ──(tool call: JSON argumen)──▶ Tool (kode deterministik)
                                                                      │
Pengguna ◀──(jawaban bahasa alami)── LLM ◀──(hasil tool: JSON)────────┘
```

- LLM **tidak** mengeksekusi apa pun. LLM hanya mengisi **argumen JSON** sebuah tool, yang
  divalidasi zod sebelum dijalankan.
- Hasil tool dikembalikan ke LLM sebagai JSON, lalu LLM merangkumnya untuk pengguna.
- Aturan dinamis (Rule Engine) disimpan sebagai JSON terstruktur dan dievaluasi
  **tanpa LLM** saat telemetry masuk.
- Perangkat dicocokkan lewat **nama persis** (`deviceName`), bukan ID.

### 1.1 Amplop tool call (LangChain)

Setiap pemanggilan tool oleh LLM berbentuk:

```json
{
  "id": "call_abc123",
  "name": "set_actuator_state_by_device_name",
  "args": { "deviceName": "Kipas", "state": "on" }
}
```

Hanya `args` yang dirancang oleh LLM. Bagian bawah dokumen ini menjelaskan isi `args`
untuk tiap tool.

### 1.2 Daftar tool

| Kelompok | Tool |
|---|---|
| Kontrol | `set_actuator_state_by_device_name` |
| Aturan dinamis | `create_automation_rule`, `list_automation_rules`, `get_automation_rule`, `set_automation_rule_active`, `delete_automation_rule` |
| Scheduler | `schedule_actuator_state_at`, `schedule_sensor_data_at`, `get_scheduled_job_result`, `list_scheduled_jobs` |
| Monitoring | `list_devices`, `get_device_by_id`, `get_last_log_by_device_name`, `get_last_10_logs_by_device_name`, `create_device_log` |
| Suara | `ask_assistant` (hanya pada sesi voice realtime) |

---

## 2. Kontrol perangkat

### 2.1 `set_actuator_state_by_device_name`

Menyalakan atau mematikan aktuator seketika.

**Argumen dari LLM**

```json
{ "deviceName": "Kipas", "state": "on" }
```

| Field | Tipe | Aturan |
|---|---|---|
| `deviceName` | string | Wajib, minimal 1 karakter, nama persis perangkat bertipe `actuator`. |
| `state` | `"on"` \| `"off"` | Wajib. `on` = hidupkan, `off` = matikan. |

**Hasil tool: perangkat mengonfirmasi**

```json
{
  "success": true,
  "confirmation": "confirmed",
  "message": "Device turned on and the device confirmed it.",
  "deviceName": "Kipas",
  "deviceId": 10,
  "deviceType": "actuator",
  "deviceLogId": 137,
  "deviceLogData": "1",
  "createdAt": "2026-10-24T09:04:09.000Z",
  "mqtt": {
    "topic": "iot/v1/device/10/command",
    "value": "1",
    "brokerConnected": true
  }
}
```

`confirmation` bernilai salah satu dari:

| Nilai | Arti | `success` |
|---|---|---|
| `confirmed` | Perangkat melaporkan state yang diminta setelah perintah dikirim. | `true` |
| `mismatch` | Perangkat terus melaporkan state yang berbeda. | `false` |
| `unconfirmed` | Perangkat tidak melapor dalam 5 detik (offline, pesan hilang, atau firmware lama). | `false` |

**Hasil tool: error**

```json
{ "error": "Device not found", "deviceName": "TV" }
```

```json
{
  "error": "Device is not an actuator",
  "deviceName": "Suhu ruangan",
  "deviceType": "sensor",
  "message": "Only devices with deviceType \"actuator\" can be turned on or off. Use create_device_value for other devices."
}
```

---

## 3. Aturan dinamis (Rule Engine)

### 3.1 `create_automation_rule`

Membuat aturan Event-Condition-Action. Contoh kalimat pengguna:
*"Nyalakan kipas jika suhu ruangan di atas 35 derajat"*.

**Argumen dari LLM**

```json
{
  "name": "Kipas hidup saat suhu > 35",
  "originalPrompt": "Nyalakan kipas jika suhu ruangan di atas 35 derajat",
  "conditionLogic": "AND",
  "cooldownSec": 60,
  "isActive": true,
  "trigger": {
    "deviceName": "Suhu ruangan",
    "metric": "temperature"
  },
  "conditions": [
    {
      "deviceName": "Suhu ruangan",
      "metric": "temperature",
      "operator": ">",
      "threshold": 35,
      "unit": "celsius"
    }
  ],
  "actions": [
    { "deviceName": "Kipas", "state": "on" }
  ]
}
```

| Field | Tipe | Wajib | Aturan |
|---|---|---|---|
| `name` | string | tidak | 1–150 karakter. |
| `originalPrompt` | string | **ya** | Kalimat asli pengguna, minimal 1 karakter. |
| `conditionLogic` | `"AND"` \| `"OR"` | tidak | Default `AND`. |
| `cooldownSec` | integer | tidak | 0–86400, default `60`. Jeda minimal antar eksekusi rule. |
| `isActive` | boolean | tidak | Default `true`. |
| `trigger.deviceName` | string | **ya** | Harus bertipe **sensor**. |
| `trigger.metric` | string | **ya** | 1–64 karakter, contoh `temperature`, `humidity`. |
| `conditions[]` | array | **ya** | Minimal 1 elemen. |
| `conditions[].deviceName` | string | tidak | Default: perangkat trigger. |
| `conditions[].metric` | string | **ya** | 1–64 karakter. |
| `conditions[].operator` | enum | **ya** | `>`, `>=`, `<`, `<=`, `==`, `!=`. |
| `conditions[].threshold` | number | **ya** | Angka (string numerik ikut dikonversi). |
| `conditions[].unit` | string | tidak | Maksimal 32 karakter, informatif. |
| `actions[]` | array | **ya** | Minimal 1 elemen. |
| `actions[].deviceName` | string | **ya** | Harus bertipe **actuator**. |
| `actions[].state` | `"on"` \| `"off"` | **ya** | |

**Contoh dengan dua kondisi (OR)**

```json
{
  "originalPrompt": "Nyalakan kipas jika suhu di atas 35 atau kelembapan di atas 80",
  "conditionLogic": "OR",
  "trigger": { "deviceName": "Suhu ruangan", "metric": "temperature" },
  "conditions": [
    { "metric": "temperature", "operator": ">", "threshold": 35 },
    { "deviceName": "Kelembapan", "metric": "humidity", "operator": ">", "threshold": 80 }
  ],
  "actions": [{ "deviceName": "Kipas", "state": "on" }]
}
```

**Hasil tool: berhasil**

```json
{
  "success": true,
  "message": "Automation rule created and stored. It will run when matching sensor events arrive (no LLM needed at execution time).",
  "rule": {
    "ruleId": 30,
    "name": "Kipas hidup saat suhu > 35",
    "originalPrompt": "Nyalakan kipas jika suhu ruangan di atas 35 derajat",
    "conditionLogic": "AND",
    "isActive": true,
    "cooldownSec": 60,
    "lastTriggeredAt": null,
    "trigger": {
      "deviceId": 9,
      "deviceName": "Suhu ruangan",
      "metric": "temperature",
      "eventType": "telemetry"
    },
    "conditions": [
      {
        "deviceId": 9,
        "deviceName": "Suhu ruangan",
        "metric": "temperature",
        "operator": ">",
        "threshold": 35,
        "unit": "celsius"
      }
    ],
    "actions": [
      {
        "deviceId": 10,
        "deviceName": "Kipas",
        "actionType": "set_state",
        "state": "on"
      }
    ]
  }
}
```

**Hasil tool: error** (misalnya trigger bukan sensor, aksi bukan aktuator, atau perangkat tidak ditemukan)

```json
{ "error": "Use a sensor.", "statusCode": 400 }
```

### 3.2 Tool pengelola aturan

| Tool | Argumen dari LLM | Hasil |
|---|---|---|
| `list_automation_rules` | `{ "isActive": true, "limit": 20 }` (semua opsional, `limit` 1–100) | `{ "totalItems", "items": [Rule], "totalPages", "currentPage" }` |
| `get_automation_rule` | `{ "ruleId": 30 }` | Objek `Rule` seperti pada 3.1. |
| `set_automation_rule_active` | `{ "ruleId": 30, "isActive": false }` | `{ "success": true, "rule": Rule }` |
| `delete_automation_rule` | `{ "ruleId": 30 }` | `{ "success": true, "ruleId": 30, "deleted": true }` |

`ruleId` harus integer positif. Error umum: `{ "error": "Rule not found", "statusCode": 404 }`.

### 3.3 JSON yang dipakai Rule Engine saat eksekusi (tanpa LLM)

**Telemetry masuk (dari perangkat via MQTT)** pada `iot/v1/device/{id}/telemetry`:

```json
{ "value": "36" }
```

Format lain yang juga dibaca: `{ "metric": "temperature", "value": 36 }`,
`{ "temperature": 36, "humidity": 60 }`, atau angka mentah.

**Catatan eksekusi rule** (disimpan di log eksekusi, dilihat di halaman Rules):

```json
{
  "eventSnapshot": {
    "deviceId": 9,
    "metrics": { "value": 36 },
    "receivedAt": "2026-10-24T09:04:09.000Z",
    "rawPayload": { "value": "36" }
  },
  "conditionResult": {
    "logic": "AND",
    "passed": true,
    "details": [
      {
        "deviceId": 9,
        "metric": "temperature",
        "operator": ">",
        "threshold": 35,
        "reading": 36,
        "ok": true
      }
    ]
  },
  "actionResult": {
    "actions": [
      {
        "deviceId": 10,
        "state": "on",
        "published": true,
        "confirmation": "confirmed",
        "attempts": 1,
        "deviceLogId": 137,
        "deviceLogData": "1"
      }
    ]
  },
  "success": true,
  "errorMessage": null,
  "latencyMs": 412
}
```

Jika perangkat tidak mengonfirmasi setelah 2 percobaan: `confirmation` menjadi
`"unconfirmed"` atau `"mismatch"`, `success` menjadi `false`, dan `errorMessage` berisi
`"Device did not confirm the command: device 10 (unconfirmed)"`.

---

## 4. Scheduler

Zona waktu semua jadwal: **WIB (UTC+7)**.

### 4.1 Parameter bersama

| Field | Tipe | Aturan |
|---|---|---|
| `category` | `"once"` \| `"repeat"` | `once` = satu kali, `repeat` = **setiap hari** pada jam tersebut. |
| `hour` | integer | **Wajib**, 0–23 (24 jam). |
| `minute` | integer | **Wajib**, 0–59. |
| `date` | string | Hanya untuk `once`. `DD-MM-YYYY` atau `YYYY-MM-DD`. Kosong = hari ini (atau besok bila jam sudah lewat). |
| `year` | integer | Opsional, 2024–2100, hanya `once`. |
| `month` | integer | Opsional, 1–12, hanya `once`. |
| `day` | integer | Opsional, 1–31, hanya `once`. |

Untuk `repeat`, mengisi `date`, `year`, `month`, atau `day` ditolak dengan
`{ "error": "Repeat schedule uses daily time only. Omit date/year/month/day." }`.

### 4.2 `schedule_actuator_state_at`

**Sekali, pada waktu tertentu hari ini**

```json
{ "deviceName": "Lampu kamar", "state": "on", "category": "once", "hour": 18, "minute": 0 }
```

**Sekali, pada tanggal tertentu**

```json
{
  "deviceName": "Lampu kamar",
  "state": "on",
  "category": "once",
  "hour": 18,
  "minute": 0,
  "date": "20-06-2026"
}
```

**Setiap hari**

```json
{ "deviceName": "Lampu kamar", "state": "off", "category": "repeat", "hour": 6, "minute": 0 }
```

Permintaan "nyalakan jam 18:00 dan matikan jam 06:00 setiap hari" membuat **dua** pemanggilan
tool terpisah.

**Hasil tool: `once`**

```json
{
  "success": true,
  "message": "Scheduled once: Turn on \"Lampu kamar\" at 20-06-2026 18:00 WIB",
  "jobId": "schedule-1788...",
  "deviceName": "Lampu kamar",
  "state": "on",
  "category": "once",
  "status": "pending",
  "runAt": "2026-06-20T11:00:00.000Z",
  "schedule": {
    "category": "once",
    "year": 2026,
    "month": 6,
    "day": 20,
    "hour": 18,
    "minute": 0,
    "timeOnly": false,
    "timezone": "WIB (UTC+7)",
    "label": "20-06-2026 18:00 WIB",
    "inferredDate": "explicit"
  }
}
```

`inferredDate` bernilai `"explicit"` jika tanggal diberikan, atau
`"today (or tomorrow if time already passed)"` jika hanya jam.

**Hasil tool: `repeat`**

```json
{
  "success": true,
  "message": "Scheduled daily: Turn off \"Lampu kamar\" ...",
  "jobId": "schedule-1788...",
  "deviceName": "Lampu kamar",
  "state": "off",
  "category": "repeat",
  "status": "active",
  "schedule": {
    "category": "repeat",
    "hour": 6,
    "minute": 0,
    "cronPattern": "0 6 * * *",
    "timezone": "WIB (UTC+7)",
    "label": "...",
    "nextRunAt": "2026-10-25T23:00:00.000Z"
  }
}
```

### 4.3 `schedule_sensor_data_at`

Mengambil data sensor pada waktu terjadwal. Argumen sama dengan 4.2 tanpa `state`.

```json
{ "deviceName": "Suhu ruangan", "category": "repeat", "hour": 7, "minute": 30 }
```

Hasil: bentuknya sama dengan 4.2 tanpa field `state`.

### 4.4 `get_scheduled_job_result`

```json
{ "jobId": "schedule-1788..." }
```

Hasil:

```json
{
  "jobId": "schedule-1788...",
  "type": "actuator",
  "category": "once",
  "deviceName": "Lampu kamar",
  "state": "on",
  "scheduledAt": "2026-10-24T09:00:00.000Z",
  "runAt": "2026-10-24T11:00:00.000Z",
  "cronPattern": null,
  "timezone": "Asia/Jakarta",
  "status": "completed",
  "result": {
    "success": true,
    "category": "once",
    "message": "Device turned on (value 1)",
    "confirmation": "confirmed",
    "attempts": 1,
    "deviceName": "Lampu kamar",
    "deviceId": 8,
    "deviceLogId": 140,
    "deviceLogData": "1",
    "executedAt": "2026-10-24T11:00:00.512Z",
    "mqtt": {
      "topic": "iot/v1/device/8/command",
      "value": "1",
      "brokerConnected": true
    }
  },
  "error": null
}
```

`type` bernilai `actuator` (kontrol on/off) atau `sensor_data` (ambil data sensor).
`status` salah satu dari `pending`, `active` (jadwal harian yang masih berjalan),
`completed`, `failed`. Job aktuator menjadi `failed` jika perangkat tidak mengonfirmasi
setelah 2 percobaan, dengan `error` seperti
`"Device \"Lampu kamar\" did not confirm the command (unconfirmed) after 2 attempts"`.

Tidak ditemukan: `{ "error": "Scheduled job not found", "jobId": "..." }`.

### 4.5 `list_scheduled_jobs`

```json
{ "limit": 20 }
```

`limit` opsional, 1–100 (default 20). Hasil:

```json
{
  "count": 2,
  "jobs": [
    {
      "jobId": "schedule-1788...",
      "type": "actuator",
      "category": "repeat",
      "deviceName": "Lampu kamar",
      "state": "off",
      "scheduledAt": "...",
      "runAt": "...",
      "cronPattern": "0 6 * * *",
      "timezone": "Asia/Jakarta",
      "status": "active",
      "result": null,
      "error": null
    }
  ]
}
```

---

## 5. Monitoring data perangkat

| Tool | Argumen dari LLM | Catatan |
|---|---|---|
| `list_devices` | `{ "page": 0, "size": 10 }` | Semua opsional. `page` berbasis 0, `size` 1–100. |
| `get_device_by_id` | `{ "deviceId": 8 }` | Integer positif. |
| `get_last_log_by_device_name` | `{ "deviceName": "Suhu ruangan" }` | |
| `get_last_10_logs_by_device_name` | `{ "deviceName": "Suhu ruangan" }` | Terbaru lebih dulu. |
| `create_device_log` | `{ "deviceName": "Suhu ruangan", "deviceLogData": "28" }` | **Bukan** untuk on/off. |

**`get_last_log_by_device_name`**

```json
{
  "deviceName": "Suhu ruangan",
  "deviceId": 9,
  "lastValue": "36",
  "deviceLogId": 2201,
  "createdAt": "2026-10-24 16:04:09"
}
```

Jika belum ada data: `{ "deviceName": "...", "deviceId": 9, "message": "No device values recorded yet", "lastValue": null }`.

**`get_last_10_logs_by_device_name`**

```json
{
  "deviceName": "Suhu ruangan",
  "deviceId": 9,
  "count": 10,
  "values": [
    { "deviceLogId": 2201, "deviceLogData": "36", "createdAt": "2026-10-24 16:04:09" }
  ]
}
```

**`create_device_log`**

```json
{
  "success": true,
  "message": "Device log created",
  "deviceName": "Suhu ruangan",
  "deviceId": 9,
  "deviceLogId": 2202,
  "deviceLogData": "28",
  "createdAt": "2026-10-24 16:05:00"
}
```

**`list_devices`**

```json
{
  "totalItems": 5,
  "totalPages": 1,
  "currentPage": 0,
  "items": [
    {
      "deviceId": 10,
      "deviceName": "Kipas",
      "deviceDescription": "Kipas angin ruang tamu",
      "deviceType": "actuator",
      "deviceStatus": "online",
      "deviceFirmwareVersion": "v1.0.0",
      "deviceMetadata": { "room": "ruang tamu" },
      "deviceLogs": [{ "deviceLogId": 137, "deviceLogData": "1", "createdAt": "..." }]
    }
  ]
}
```

`get_device_by_id` mengembalikan satu objek device dengan bentuk yang sama.
Error: `{ "error": "Device not found", "deviceId": 99 }`.

---

## 6. Pesan MQTT yang dihasilkan sistem (turunan dari keputusan LLM)

LLM tidak membuat pesan ini, tetapi inilah dampak dari tool kontrol dan aturan.

| Arah | Topic | Isi |
|---|---|---|
| Server → perangkat (QoS 1) | `iot/v1/device/{id}/command` | `{ "value": "1" }` (on) atau `{ "value": "0" }` (off) |
| Perangkat → server | `iot/v1/device/{id}/state` | `{ "state": "on" }` atau `{ "state": "off" }` |
| Perangkat → server | `iot/v1/device/{id}/telemetry` | `{ "value": "36" }` |

Perangkat mengirim `state` setelah menjalankan perintah, saat tersambung, dan tiap 30 detik.
Server menunggu `state` itu maksimal 5 detik untuk menentukan `confirmation`.

---

## 7. JSON lain yang melibatkan LLM

### 7.1 Voice realtime: `ask_assistant`

Model suara memanggil satu tool yang meneruskan permintaan ke agen teks.

```json
{ "query": "nyalakan lampu depan" }
```

Hasil yang dikembalikan ke model suara:

```json
{ "reply": "Udah nyala nih." }
```

atau jika gagal: `{ "error": "Request failed" }`.

### 7.2 Penilai hasil perintah agent

Dipanggil bila hasil tool tidak cukup untuk menentukan status. Model **diwajibkan** membalas
JSON saja:

```json
{ "status": "success", "reason": "Lampu sudah dinyalakan." }
```

| Field | Nilai |
|---|---|
| `status` | `success`, `failed`, atau `clarification` |
| `reason` | Satu kalimat bahasa Indonesia, dipotong maksimal 200 karakter. |

Hasil dengan `status` di luar tiga nilai itu diabaikan.

### 7.3 Aturan penentuan status agent dari hasil tool

Dilakukan kode, bukan LLM:

- Hasil tool mengandung `"error": "..."` → status `failed`.
- Hasil tool mengandung `"success": false` (misalnya `confirmation` bukan `confirmed`) →
  status `failed`, alasannya diambil dari `message`.
- Tool yang mengubah data berjalan tanpa error → status `success`.

---

## 8. Ringkasan batasan penting

| Hal | Batasan |
|---|---|
| Nama perangkat | Harus sama persis; tidak ditemukan → `Device not found`. |
| Trigger rule | Harus bertipe `sensor`. |
| Aksi rule, kontrol, jadwal on/off | Harus bertipe `actuator`. |
| `state` | Hanya `on` atau `off`. |
| `operator` | `>`, `>=`, `<`, `<=`, `==`, `!=`. |
| `conditionLogic` | `AND` atau `OR`. |
| `cooldownSec` | 0–86400 detik, default 60. |
| Jadwal `repeat` | Setiap hari, tanpa tanggal. Tidak ada jadwal mingguan atau bulanan. |
| Zona waktu jadwal | WIB (UTC+7). |
| Konfirmasi perangkat | Timeout 5 detik per percobaan; rule dan scheduler mencoba maksimal 2 kali. |
| Kontrol lewat chat atau voice | Satu percobaan; hasilnya bisa `unconfirmed`. |
