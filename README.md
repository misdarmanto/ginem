# Ginem - Smart Home Automation, Powered by AI

<p align="center">
  <strong>Control, monitor, schedule, and automate real IoT devices using natural language.</strong>
</p>

<p align="center">
WhatsApp + Web Chat · LLM Agent · RabbitMQ · RAG · MQTT · IoT Devices · Scheduler · Dynamic Rule Engine
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-22+-339933?style=flat-square&logo=node.js&logoColor=white" />
  <img src="https://img.shields.io/badge/TypeScript-5+-3178C6?style=flat-square&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Express.js-Backend-000000?style=flat-square&logo=express&logoColor=white" />
  <img src="https://img.shields.io/badge/React-Frontend-61DAFB?style=flat-square&logo=react&logoColor=white" />
  <img src="https://img.shields.io/badge/RabbitMQ-Message%20Queue-FF6600?style=flat-square&logo=rabbitmq&logoColor=white" />
  <img src="https://img.shields.io/badge/Redis-Cache%20%2F%20Jobs-DC382D?style=flat-square&logo=redis&logoColor=white" />
  <img src="https://img.shields.io/badge/MySQL-Database-4479A1?style=flat-square&logo=mysql&logoColor=white" />
  <img src="https://img.shields.io/badge/MQTT-HiveMQ-660066?style=flat-square&logo=hivemq&logoColor=white" />
  <img src="https://img.shields.io/badge/IoT-MQTT%20Devices-black?style=flat-square" />
  <img src="https://img.shields.io/badge/LangChain-AI%20Agent-purple?style=flat-square" />
  <img src="https://img.shields.io/badge/Pinecone-RAG-000000?style=flat-square" />
  <img src="https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker&logoColor=white" />
</p>

<p align="center">
  <a href="https://github.com/misdarmanto">GitHub</a> ·
  <a href="https://www.linkedin.com/in/misdar-manto-06a8b2231/">LinkedIn</a>
</p>

---

## What is Ginem?

**Ginem** is an AI Agent-powered Smart Home IoT platform that lets users control, monitor, schedule, and automate physical devices using natural language.

Traditional IoT apps often feel harder than they should be. Too many buttons, too many menus, too many settings, and too much context users need to understand before they can actually control their own devices.

Ginem takes a different approach: just say what you want.

Users can control devices, check sensor data, create schedules, or define automation rules using simple everyday language through WhatsApp or web chat.

```text
Turn on the living room light
What is the current temperature?
Turn off all devices at 11 PM
Turn on the fan if temperature is above 30°C
Turn on all the lights in my house at 6 PM and turn them off at 6 AM every day
```

The system processes the command through an LLM-based AI Agent, retrieves device context using RAG, executes validated backend tools, and communicates with real IoT devices through MQTT.

Ginem is designed to be device-agnostic. The current prototype uses ESP32 with DHT11, relay, and LED as the reference hardware, but the platform is not limited to ESP32. Any internet-connected microcontroller or IoT device can be integrated as long as it is registered in the dashboard and follows the MQTT topic and payload contract.

[![Demo Video](https://img.youtube.com/vi/UWavfmRbfrg/maxresdefault.jpg)](https://www.youtube.com/watch?v=UWavfmRbfrg "Klik untuk menonton demo")
<img width="1280" height="691" alt="1-ginem-portof" src="https://github.com/user-attachments/assets/836a2fd8-0d29-4c52-859f-9a7b6ec9f056" />


---

## System Architecture

The LLM does not directly control hardware. Every device action must pass through validated backend tools before an MQTT command is published to a registered IoT device.

<img width="1447" height="1087" alt="ginem-architecture" src="https://github.com/user-attachments/assets/f8549be7-fc99-4e3d-aedc-e35a9e8e085a" />


**Flow:**
1. User sends natural language command via WhatsApp or Web Chat
2. AI Agent (LangChain) interprets the command and calls backend tools
3. Backend tools validate device existence, permissions, and action compatibility
4. Valid commands are published to MQTT broker
5. IoT devices receive and execute the command
6. Device response is logged and returned to user

---

## Project Structure

This is a **monorepo** containing both API backend and web dashboard in a single repository using npm workspaces.

```
ginem-dev-monorepo/
├── packages/
│   ├── api/              # Express.js backend, AI Agent, services
│   └── dashboard/        # React frontend, web chat, admin dashboard
├── docker-compose.yml    # MySQL, Redis, RabbitMQ, and API container
└── package.json          # npm workspaces root
```

### Quick Start

**Prerequisites:**
- Node.js 22+ (use `nvm use 22`)
- Docker & Docker Compose (recommended), or MySQL, Redis, RabbitMQ running locally
- HiveMQ MQTT broker (cloud or local)

**Option A: Run with Docker (recommended)**

This spins up MySQL, Redis, RabbitMQ, and the API backend together via `docker-compose.yml`.

```bash
# 1. Copy and configure environment variables at the project root
cp packages/api/.env.example .env

# 2. Build and start all services
docker compose up -d --build

# 3. Check logs
docker compose logs -f app

# Stop all services
docker compose down
```

The API container runs migrations automatically on startup (`RUN_MIGRATIONS=true`). The dashboard is not included in `docker-compose.yml` and should be run separately:

```bash
cd packages/dashboard
npm install
npm run dev
```

**Option B: Run manually (without Docker)**

Make sure MySQL, Redis, and RabbitMQ are running locally, then:

```bash
# Install all dependencies
npm install

# Development (API + Dashboard together)
npm run dev

# Production build
npm run build

# Production start
npm start
```

**Access:**
- Dashboard: `http://localhost:5173`
- API: `http://localhost:8000`
- Swagger Docs: `http://localhost:8000/docs`
- RabbitMQ Management UI: `http://localhost:15672` (Docker only)

---

## Core Features

### Natural Language Device Control

Users can control IoT devices through WhatsApp or web chat.

```text
Turn on the living room light
Turn off all devices
```

The AI Agent converts the command into a backend tool call, validates the target device and action based on the registered device metadata, then publishes an MQTT command to the target IoT device.

### Sensor Monitoring

Registered IoT devices can publish telemetry data through MQTT, such as temperature, humidity, power state, or other sensor readings depending on the device capability.

```text
What is the current temperature?
Show me the last 10 humidity readings
```

Telemetry is stored in MySQL and can be queried through the AI Agent, web chat, or dashboard.

### Scheduler Automation

Users can create one-time or recurring automation schedules using natural language.

```text
Turn off the light every day at 11 PM
Turn on the fan tomorrow at 7 AM
```

Schedules are stored in MySQL and executed using Redis-backed BullMQ workers.

### Dynamic Rule Engine

Users can define condition-based automation rules using natural language.

```text
Turn on the fan if temperature is above 30°C
```

The system converts the command into an Event-Condition-Action rule:

```json
{
  "event": "telemetry received from a registered sensor device",
  "condition": "temperature > 30",
  "action": "publish MQTT command to the registered fan actuator"
}
```

Rules are stored in MySQL, cached in Redis, and evaluated automatically whenever new telemetry arrives through MQTT.

### WhatsApp and Web Chat Interfaces

Ginem supports two interaction channels:

- **WhatsApp**, for mobile-first natural language control via Baileys integration
- **Web Chat**, for dashboard-integrated interaction and web-based interface

---

## Engineering Highlights

| Area | Implementation |
|------|----------------|
| Backend Architecture | Modular Node.js, Express.js, and TypeScript backend |
| Frontend | React with TypeScript, Material-UI, TanStack Query |
| AI Agent | LangChain-based agent with structured tool/function calling |
| Message Queue | RabbitMQ for asynchronous AI Agent request processing |
| RAG | Pinecone vector database for device and system context retrieval |
| IoT Communication | MQTT over TLS using HiveMQ Cloud |
| Hardware Integration | Supports registered MQTT-capable IoT devices; ESP32 is used as the reference implementation |
| Scheduler | Redis + BullMQ for one-time and recurring device automation |
| Dynamic Rules | Event-Condition-Action rule engine for sensor-triggered automation |
| Database | MySQL with Sequelize ORM for users, devices, telemetry, schedules, rules, and logs |
| Interfaces | WhatsApp via Baileys and web chat through REST API |
| Observability | Structured logging for AI interactions, MQTT commands, telemetry, schedules, and rule execution |
| Safety | LLM cannot execute arbitrary hardware commands; all actions are validated by backend services |
| Package Management | npm workspaces for monorepo management |
| Deployment | Docker Compose for local development and containerized deployment |

---

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| Backend | Node.js 22+, Express.js, TypeScript, Sequelize |
| Frontend | React 18+, TypeScript, Material-UI (MUI), TanStack Query, React Router |
| Database | MySQL, Sequelize ORM |
| Queue & Jobs | RabbitMQ, Redis, BullMQ |
| AI Agent | LangChain, LLM Function Calling, OpenAI / DeepSeek / Anthropic |
| RAG | Pinecone Vector Database |
| IoT | MQTT-compatible IoT devices, ESP32 reference firmware, sensors, actuators |
| Messaging | MQTT, HiveMQ Cloud |
| Integrations | WhatsApp via Baileys |
| Documentation | Swagger/OpenAPI |
| Infrastructure | Docker, Docker Compose, npm workspaces |

---

<p align="center">
  <strong>Ginem - Smart Home IoT, powered by AI.</strong>
</p>

<p align="center">
  Made with ❤️
</p>
