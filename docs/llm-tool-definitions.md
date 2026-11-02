# Definisi Tool LLM (Parameter dan Struktur)

Definisi lengkap setiap tool yang diberikan ke LLM pada fitur kontrol, monitoring, scheduler, dan aturan dinamis.

- Diekstrak otomatis dari kode (`packages/api/src/services/mcp/tools/*`) ke format function-calling.
- File mesin-baca persis seperti yang dikirim ke model: [`llm-tool-definitions.json`](llm-tool-definitions.json).
- Format hasil tool dan JSON turunannya (MQTT, log eksekusi, voice, penilai agent): [`llm-json-formats.md`](llm-json-formats.md).

Total **15 tool**. Parameter yang punya `default` bersifat opsional: bila tidak diisi, server memakai nilainya (JSON Schema di bawah mencantumkannya di `required` karena format function-calling mengharuskan semua properti ber-default dianggap terkirim). Semua parameter berupa objek JSON tanpa properti tambahan di luar yang tercantum.

## Kontrol perangkat

### `set_actuator_state_by_device_name`

Turn ON or OFF an actuator device immediately by its name. Use for instant control without scheduling.

| Parameter | Tipe | Wajib | Batasan | Deskripsi |
|---|---|---|---|---|
| `deviceName` | string | ya | panjang min 1 | The exact device name (must be an actuator) |
| `state` | `"on"` \| `"off"` | ya | - | on = hidupkan, off = matikan |

**Contoh argumen dari LLM**

```json
{
  "deviceName": "Kipas",
  "state": "on"
}
```

<details><summary>JSON Schema lengkap</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "deviceName": {
      "type": "string",
      "minLength": 1,
      "description": "The exact device name (must be an actuator)"
    },
    "state": {
      "type": "string",
      "enum": [
        "on",
        "off"
      ],
      "description": "on = hidupkan, off = matikan"
    }
  },
  "required": [
    "deviceName",
    "state"
  ],
  "additionalProperties": false
}
```

</details>

## Aturan dinamis (Rule Engine)

### `create_automation_rule`

Create an Event-Condition-Action automation rule from natural language intent. Use when the user wants automatic cooperation between devices (e.g. "turn on fan if temperature > 25"). Do NOT use for immediate on/off (use set_actuator_state_by_device_name) or time schedules (use schedule_*). Trigger device must be a sensor; action devices must be an actuator. Metric is a string like temperature or humidity.

| Parameter | Tipe | Wajib | Batasan | Deskripsi |
|---|---|---|---|---|
| `name` | string | tidak | panjang min 1, panjang maks 150 | Nama singkat aturan (opsional). |
| `originalPrompt` | string | ya | panjang min 1 | The user original natural-language request |
| `conditionLogic` | `"AND"` \| `"OR"` | tidak | default "AND" | `AND` = semua kondisi harus terpenuhi, `OR` = salah satu cukup. |
| `cooldownSec` | integer | tidak | min 0, maks 86400, default 60 | Jeda minimal antar eksekusi rule, dalam detik. |
| `isActive` | boolean | tidak | default true | Aturan langsung aktif saat dibuat. |
| `trigger` | object | ya | - | Event pemicu: telemetry dari satu sensor. |
| `trigger.deviceName` | string | ya | panjang min 1 | Nama persis perangkat pemicu, harus bertipe sensor. |
| `trigger.metric` | string | ya | panjang min 1, panjang maks 64 | Nama metrik, contoh `temperature`, `humidity`. |
| `conditions` | array | ya | minimal 1 elemen | Daftar kondisi yang dievaluasi saat event masuk. |
| `conditions[].deviceName` | string | tidak | panjang min 1 | Perangkat yang dibaca; kosong = perangkat trigger. |
| `conditions[].metric` | string | ya | panjang min 1, panjang maks 64 | Metrik yang dibandingkan. |
| `conditions[].operator` | `">"` \| `">="` \| `"<"` \| `"<="` \| `"=="` \| `"!="` | ya | - | Operator pembanding. |
| `conditions[].threshold` | number | ya | - | Nilai ambang (angka). |
| `conditions[].unit` | string | tidak | panjang maks 32 | Satuan, hanya informatif. |
| `actions` | array | ya | minimal 1 elemen | Daftar aksi yang dijalankan bila kondisi terpenuhi. |
| `actions[].deviceName` | string | ya | panjang min 1 | Nama persis perangkat target, harus bertipe actuator. |
| `actions[].state` | `"on"` \| `"off"` | ya | - | Keadaan target: `on` atau `off`. |

**Contoh argumen dari LLM**

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
    {
      "deviceName": "Kipas",
      "state": "on"
    }
  ]
}
```

<details><summary>JSON Schema lengkap</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "minLength": 1,
      "maxLength": 150
    },
    "originalPrompt": {
      "type": "string",
      "minLength": 1,
      "description": "The user original natural-language request"
    },
    "conditionLogic": {
      "default": "AND",
      "type": "string",
      "enum": [
        "AND",
        "OR"
      ]
    },
    "cooldownSec": {
      "default": 60,
      "type": "integer",
      "minimum": 0,
      "maximum": 86400
    },
    "isActive": {
      "default": true,
      "type": "boolean"
    },
    "trigger": {
      "type": "object",
      "properties": {
        "deviceName": {
          "type": "string",
          "minLength": 1
        },
        "metric": {
          "type": "string",
          "minLength": 1,
          "maxLength": 64
        }
      },
      "required": [
        "deviceName",
        "metric"
      ],
      "additionalProperties": false
    },
    "conditions": {
      "minItems": 1,
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "deviceName": {
            "type": "string",
            "minLength": 1
          },
          "metric": {
            "type": "string",
            "minLength": 1,
            "maxLength": 64
          },
          "operator": {
            "type": "string",
            "enum": [
              ">",
              ">=",
              "<",
              "<=",
              "==",
              "!="
            ]
          },
          "threshold": {
            "type": "number"
          },
          "unit": {
            "type": "string",
            "maxLength": 32
          }
        },
        "required": [
          "metric",
          "operator",
          "threshold"
        ],
        "additionalProperties": false
      }
    },
    "actions": {
      "minItems": 1,
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "deviceName": {
            "type": "string",
            "minLength": 1
          },
          "state": {
            "type": "string",
            "enum": [
              "on",
              "off"
            ]
          }
        },
        "required": [
          "deviceName",
          "state"
        ],
        "additionalProperties": false
      }
    }
  },
  "required": [
    "originalPrompt",
    "conditionLogic",
    "cooldownSec",
    "isActive",
    "trigger",
    "conditions",
    "actions"
  ],
  "additionalProperties": false
}
```

</details>

### `list_automation_rules`

List stored automation (ECA) rules.

| Parameter | Tipe | Wajib | Batasan | Deskripsi |
|---|---|---|---|---|
| `isActive` | boolean | tidak | - | Filter aturan aktif atau tidak aktif; kosong = semua. |
| `limit` | integer | tidak | min 1, maks 100 | Jumlah maksimal aturan (default 20). |

**Contoh argumen dari LLM**

```json
{
  "isActive": true,
  "limit": 20
}
```

<details><summary>JSON Schema lengkap</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "isActive": {
      "type": "boolean"
    },
    "limit": {
      "type": "integer",
      "minimum": 1,
      "maximum": 100
    }
  },
  "additionalProperties": false
}
```

</details>

### `get_automation_rule`

Get one automation rule by ruleId.

| Parameter | Tipe | Wajib | Batasan | Deskripsi |
|---|---|---|---|---|
| `ruleId` | integer | ya | maks 9007199254740991, > 0 | ID aturan. |

**Contoh argumen dari LLM**

```json
{
  "ruleId": 30
}
```

<details><summary>JSON Schema lengkap</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "ruleId": {
      "type": "integer",
      "exclusiveMinimum": 0,
      "maximum": 9007199254740991
    }
  },
  "required": [
    "ruleId"
  ],
  "additionalProperties": false
}
```

</details>

### `set_automation_rule_active`

Enable or disable an automation rule by ruleId.

| Parameter | Tipe | Wajib | Batasan | Deskripsi |
|---|---|---|---|---|
| `ruleId` | integer | ya | maks 9007199254740991, > 0 | ID aturan. |
| `isActive` | boolean | ya | - | `true` = aktifkan, `false` = nonaktifkan. |

**Contoh argumen dari LLM**

```json
{
  "ruleId": 30,
  "isActive": false
}
```

<details><summary>JSON Schema lengkap</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "ruleId": {
      "type": "integer",
      "exclusiveMinimum": 0,
      "maximum": 9007199254740991
    },
    "isActive": {
      "type": "boolean"
    }
  },
  "required": [
    "ruleId",
    "isActive"
  ],
  "additionalProperties": false
}
```

</details>

### `delete_automation_rule`

Delete an automation rule by ruleId.

| Parameter | Tipe | Wajib | Batasan | Deskripsi |
|---|---|---|---|---|
| `ruleId` | integer | ya | maks 9007199254740991, > 0 | ID aturan yang dihapus. |

**Contoh argumen dari LLM**

```json
{
  "ruleId": 30
}
```

<details><summary>JSON Schema lengkap</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "ruleId": {
      "type": "integer",
      "exclusiveMinimum": 0,
      "maximum": 9007199254740991
    }
  },
  "required": [
    "ruleId"
  ],
  "additionalProperties": false
}
```

</details>

## Scheduler

### `schedule_actuator_state_at`

Schedule actuator ON/OFF with category once or repeat (WIB). ONCE examples: "hidupkan lampu depan di jam 18:00 WIB" → category=once, hour=18, minute=0 (no date). "hidupkan lampu depan di 20-06-2026 jam 18:00" → category=once, date="20-06-2026", hour=18, minute=0. REPEAT examples: "hidupkan lampu depan setiap hari jam 18:00 WIB" → category=repeat, hour=18, minute=0. "matikan lampu depan setiap jam 06:00" → category=repeat, hour=6, minute=0. User may request TWO separate jobs for daily on and daily off.

| Parameter | Tipe | Wajib | Batasan | Deskripsi |
|---|---|---|---|---|
| `deviceName` | string | ya | panjang min 1 | The exact device name (must be an actuator) |
| `state` | `"on"` \| `"off"` | ya | - | on = hidupkan, off = matikan |
| `category` | `"once"` \| `"repeat"` | ya | - | once = run ONE time only (e.g. "hidupkan lampu jam 18:00" today, or "20-06-2026 jam 18:00"). repeat = EVERY DAY at hour:minute WIB (e.g. "setiap hari jam 18:00", "setiap jam 06:00 matikan"). |
| `hour` | integer | ya | min 0, maks 23 | Hour 0–23 (24h, WIB). Required. e.g. "jam 10:11" → hour=10 |
| `minute` | integer | ya | min 0, maks 59 | Minute 0–59. Required. e.g. "jam 10:11" → minute=11 |
| `date` | string | tidak | - | For category=once only. Specific date DD-MM-YYYY (e.g. "20-06-2026") or YYYY-MM-DD. Omit for time-only (defaults to today WIB). |
| `year` | integer | tidak | min 2024, maks 2100 | Opsional, hanya untuk `once`. Alternatif dari `date`. |
| `month` | integer | tidak | min 1, maks 12 | Opsional, hanya untuk `once`. |
| `day` | integer | tidak | min 1, maks 31 | Opsional, hanya untuk `once`. |

**Contoh argumen dari LLM**

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

<details><summary>JSON Schema lengkap</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "deviceName": {
      "type": "string",
      "minLength": 1,
      "description": "The exact device name (must be an actuator)"
    },
    "state": {
      "type": "string",
      "enum": [
        "on",
        "off"
      ],
      "description": "on = hidupkan, off = matikan"
    },
    "category": {
      "type": "string",
      "enum": [
        "once",
        "repeat"
      ],
      "description": "once = run ONE time only (e.g. \"hidupkan lampu jam 18:00\" today, or \"20-06-2026 jam 18:00\"). repeat = EVERY DAY at hour:minute WIB (e.g. \"setiap hari jam 18:00\", \"setiap jam 06:00 matikan\")."
    },
    "hour": {
      "type": "integer",
      "minimum": 0,
      "maximum": 23,
      "description": "Hour 0–23 (24h, WIB). Required. e.g. \"jam 10:11\" → hour=10"
    },
    "minute": {
      "type": "integer",
      "minimum": 0,
      "maximum": 59,
      "description": "Minute 0–59. Required. e.g. \"jam 10:11\" → minute=11"
    },
    "date": {
      "description": "For category=once only. Specific date DD-MM-YYYY (e.g. \"20-06-2026\") or YYYY-MM-DD. Omit for time-only (defaults to today WIB).",
      "type": "string"
    },
    "year": {
      "type": "integer",
      "minimum": 2024,
      "maximum": 2100
    },
    "month": {
      "type": "integer",
      "minimum": 1,
      "maximum": 12
    },
    "day": {
      "type": "integer",
      "minimum": 1,
      "maximum": 31
    }
  },
  "required": [
    "deviceName",
    "state",
    "category",
    "hour",
    "minute"
  ],
  "additionalProperties": false
}
```

</details>

### `schedule_sensor_data_at`

Schedule sensor data fetch with category once or repeat (WIB). ONCE: specific time or date+time. REPEAT: every day at hour:minute (omit date).

| Parameter | Tipe | Wajib | Batasan | Deskripsi |
|---|---|---|---|---|
| `deviceName` | string | ya | panjang min 1 | The exact device name to fetch data from |
| `category` | `"once"` \| `"repeat"` | ya | - | once = run ONE time only (e.g. "hidupkan lampu jam 18:00" today, or "20-06-2026 jam 18:00"). repeat = EVERY DAY at hour:minute WIB (e.g. "setiap hari jam 18:00", "setiap jam 06:00 matikan"). |
| `hour` | integer | ya | min 0, maks 23 | Hour 0–23 (24h, WIB). Required. e.g. "jam 10:11" → hour=10 |
| `minute` | integer | ya | min 0, maks 59 | Minute 0–59. Required. e.g. "jam 10:11" → minute=11 |
| `date` | string | tidak | - | For category=once only. Specific date DD-MM-YYYY (e.g. "20-06-2026") or YYYY-MM-DD. Omit for time-only (defaults to today WIB). |
| `year` | integer | tidak | min 2024, maks 2100 | Opsional, hanya untuk `once`. Alternatif dari `date`. |
| `month` | integer | tidak | min 1, maks 12 | Opsional, hanya untuk `once`. |
| `day` | integer | tidak | min 1, maks 31 | Opsional, hanya untuk `once`. |

**Contoh argumen dari LLM**

```json
{
  "deviceName": "Suhu ruangan",
  "category": "repeat",
  "hour": 7,
  "minute": 30
}
```

<details><summary>JSON Schema lengkap</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "deviceName": {
      "type": "string",
      "minLength": 1,
      "description": "The exact device name to fetch data from"
    },
    "category": {
      "type": "string",
      "enum": [
        "once",
        "repeat"
      ],
      "description": "once = run ONE time only (e.g. \"hidupkan lampu jam 18:00\" today, or \"20-06-2026 jam 18:00\"). repeat = EVERY DAY at hour:minute WIB (e.g. \"setiap hari jam 18:00\", \"setiap jam 06:00 matikan\")."
    },
    "hour": {
      "type": "integer",
      "minimum": 0,
      "maximum": 23,
      "description": "Hour 0–23 (24h, WIB). Required. e.g. \"jam 10:11\" → hour=10"
    },
    "minute": {
      "type": "integer",
      "minimum": 0,
      "maximum": 59,
      "description": "Minute 0–59. Required. e.g. \"jam 10:11\" → minute=11"
    },
    "date": {
      "description": "For category=once only. Specific date DD-MM-YYYY (e.g. \"20-06-2026\") or YYYY-MM-DD. Omit for time-only (defaults to today WIB).",
      "type": "string"
    },
    "year": {
      "type": "integer",
      "minimum": 2024,
      "maximum": 2100
    },
    "month": {
      "type": "integer",
      "minimum": 1,
      "maximum": 12
    },
    "day": {
      "type": "integer",
      "minimum": 1,
      "maximum": 31
    }
  },
  "required": [
    "deviceName",
    "category",
    "hour",
    "minute"
  ],
  "additionalProperties": false
}
```

</details>

### `get_scheduled_job_result`

Get status/result of a scheduled job. Repeat jobs stay status=active and result shows last execution.

| Parameter | Tipe | Wajib | Batasan | Deskripsi |
|---|---|---|---|---|
| `jobId` | string | ya | panjang min 1 | The job ID returned when the task was scheduled |

**Contoh argumen dari LLM**

```json
{
  "jobId": "schedule-1788..."
}
```

<details><summary>JSON Schema lengkap</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "jobId": {
      "type": "string",
      "minLength": 1,
      "description": "The job ID returned when the task was scheduled"
    }
  },
  "required": [
    "jobId"
  ],
  "additionalProperties": false
}
```

</details>

### `list_scheduled_jobs`

List recent scheduled jobs (once and repeat).

| Parameter | Tipe | Wajib | Batasan | Deskripsi |
|---|---|---|---|---|
| `limit` | integer | tidak | min 1, maks 100 | Jumlah maksimal job (default 20). |

**Contoh argumen dari LLM**

```json
{
  "limit": 20
}
```

<details><summary>JSON Schema lengkap</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "limit": {
      "type": "integer",
      "minimum": 1,
      "maximum": 100
    }
  },
  "additionalProperties": false
}
```

</details>

## Monitoring data perangkat

### `list_devices`

List devices from the database with pagination. Use this when the user asks for device list, all devices, or paginated devices.

| Parameter | Tipe | Wajib | Batasan | Deskripsi |
|---|---|---|---|---|
| `page` | integer | tidak | min 0, maks 9007199254740991 | Zero-based page index |
| `size` | integer | tidak | min 1, maks 100 | Page size (default 10) |

**Contoh argumen dari LLM**

```json
{
  "page": 0,
  "size": 10
}
```

<details><summary>JSON Schema lengkap</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "page": {
      "description": "Zero-based page index",
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "size": {
      "description": "Page size (default 10)",
      "type": "integer",
      "minimum": 1,
      "maximum": 100
    }
  },
  "additionalProperties": false
}
```

</details>

### `get_device_by_id`

Get a single device by its numeric deviceId. Use this when the user asks for one device or details of a specific device.

| Parameter | Tipe | Wajib | Batasan | Deskripsi |
|---|---|---|---|---|
| `deviceId` | integer | ya | maks 9007199254740991, > 0 | The device ID |

**Contoh argumen dari LLM**

```json
{
  "deviceId": 8
}
```

<details><summary>JSON Schema lengkap</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "deviceId": {
      "type": "integer",
      "exclusiveMinimum": 0,
      "maximum": 9007199254740991,
      "description": "The device ID"
    }
  },
  "required": [
    "deviceId"
  ],
  "additionalProperties": false
}
```

</details>

### `get_last_log_by_device_name`

Get the latest (most recent) single log for a device by its name. Use when the user asks for the last log, current log, or latest reading of a device by name.

| Parameter | Tipe | Wajib | Batasan | Deskripsi |
|---|---|---|---|---|
| `deviceName` | string | ya | panjang min 1 | The exact device name (from Device table) |

**Contoh argumen dari LLM**

```json
{
  "deviceName": "Suhu ruangan"
}
```

<details><summary>JSON Schema lengkap</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "deviceName": {
      "type": "string",
      "minLength": 1,
      "description": "The exact device name (from Device table)"
    }
  },
  "required": [
    "deviceName"
  ],
  "additionalProperties": false
}
```

</details>

### `get_last_10_logs_by_device_name`

Get the last 10 logs (most recent first) for a device by its name. Use when the user asks for last 10 logs, recent readings, or history of logs for a device by name.

| Parameter | Tipe | Wajib | Batasan | Deskripsi |
|---|---|---|---|---|
| `deviceName` | string | ya | panjang min 1 | The exact device name (from Device table) |

**Contoh argumen dari LLM**

```json
{
  "deviceName": "Suhu ruangan"
}
```

<details><summary>JSON Schema lengkap</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "deviceName": {
      "type": "string",
      "minLength": 1,
      "description": "The exact device name (from Device table)"
    }
  },
  "required": [
    "deviceName"
  ],
  "additionalProperties": false
}
```

</details>

### `create_device_log`

Create a new device log for a device. Use the device name (deviceName) to identify the device, not deviceId. Use when the user wants to add a value, record a reading, or create a device log for a device by name. Do NOT use for turn on/off (hidupkan/matikan) — use set_actuator_state_by_device_name instead.

| Parameter | Tipe | Wajib | Batasan | Deskripsi |
|---|---|---|---|---|
| `deviceName` | string | ya | panjang min 1 | The exact device name (identifies which device to add the value to) |
| `deviceLogData` | string | ya | panjang min 1 | The data to store for this device log |

**Contoh argumen dari LLM**

```json
{
  "deviceName": "Suhu ruangan",
  "deviceLogData": "28"
}
```

<details><summary>JSON Schema lengkap</summary>

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "deviceName": {
      "type": "string",
      "minLength": 1,
      "description": "The exact device name (identifies which device to add the value to)"
    },
    "deviceLogData": {
      "type": "string",
      "minLength": 1,
      "description": "The data to store for this device log"
    }
  },
  "required": [
    "deviceName",
    "deviceLogData"
  ],
  "additionalProperties": false
}
```

</details>
