# Ginem MCP Server Setup

Enable Claude and other AI systems to control, monitor, and automate your Ginem smart home through the Model Context Protocol (MCP).

## What is MCP?

The Model Context Protocol (MCP) allows Claude and other AI systems to interact with external tools and services. With the Ginem MCP server, Claude can:

- 🔌 List and control all registered IoT devices
- 📊 Read sensor telemetry data (temperature, humidity, etc)
- ⏰ Create automation schedules
- 🤖 Create dynamic rules for sensor-triggered automation
- 💬 Process natural language commands through Ginem AI Agent

## Installation & Setup

### 1. Start Ginem MCP Server

The MCP server runs as a separate service that Claude connects to via stdio.

```bash
# In a new terminal, from the ginem-dev-monorepo root:
cd packages/mcp-server
npm run dev
```

Or for production:
```bash
npm start
```

You should see:
```
Ginem MCP Server started and listening for Claude connections
```

### 2. Configure Claude Desktop Client

Create or update `~/.claude/profiles.json` (on macOS/Linux) or `%AppData%\Anthropic\Claude\profiles.json` (on Windows):

```json
{
  "default": {
    "apiKey": "your-api-key-here",
    "mcp": {
      "servers": {
        "ginem": {
          "command": "tsx",
          "args": [
            "/path/to/ginem-dev-monorepo/packages/mcp-server/src/ginem-mcp-server.ts"
          ],
          "disabled": false
        }
      }
    }
  }
}
```

Replace `/path/to/ginem-dev-monorepo` with your actual project path.

### 3. Verify Connection

In Claude (web or desktop), ask:

```
What devices do I have connected in Ginem?
```

Claude should respond with the list of devices from your Ginem system.

## Available Tools

Once connected, Claude can use these tools:

### list_devices
List all registered IoT devices.

```
Filter by device type: sensor, actuator, switch
Filter by status: online, offline
```

**Example:**
```
Show me all online temperature sensors
List all devices that are currently offline
```

### get_device_status
Get current status and telemetry of a specific device.

**Example:**
```
What is the status of the living room light?
Is the bedroom fan currently on?
```

### control_device
Control an IoT device (turn on/off, toggle, set value).

**Example:**
```
Turn on the kitchen light
Turn off all devices
Set the fan speed to 50%
```

### get_telemetry
Get sensor telemetry data (temperature, humidity, etc).

**Example:**
```
What was the temperature in the last 10 readings?
Show me the humidity data for the past hour
```

### create_schedule
Create one-time or recurring automation schedules.

**Example:**
```
Turn off all lights every day at 11 PM
Turn on the bedroom fan tomorrow at 7 AM
```

### create_rule
Create event-condition-action automation rules.

**Example:**
```
Turn on the fan if temperature goes above 30°C
Turn off the light when motion is not detected for 5 minutes
```

### query_natural_language
Send natural language queries to Ginem AI Agent.

**Example:**
```
I'm going to sleep, please set everything to night mode
It's too hot, cool down the house
```

## Examples with Claude

### Natural Device Control

**You:** "It's getting hot in the living room"

**Claude:** Uses `get_telemetry` to check current temperature, then `control_device` to turn on the fan if needed.

### Automation Setup

**You:** "Automatically turn on the lights when I arrive home"

**Claude:** Uses `create_rule` to create a rule that triggers lights when motion is detected.

### Status Check

**You:** "Are all my devices online?"

**Claude:** Uses `list_devices` with status filter to show which devices are offline.

### Schedule Creation

**You:** "I want the lights to turn on at 6 AM and off at 11 PM every day"

**Claude:** Uses `create_schedule` to set up both recurring schedules.

## Architecture

```
Claude (Chat Interface)
    ↓ (MCP Protocol via stdio)
Ginem MCP Server (ginem-mcp-server.ts)
    ↓ (HTTP/API calls)
Ginem API Backend
    ├─ DeviceService → Device management & control
    ├─ DeviceLogService → Telemetry data
    ├─ SchedulerService → Schedule automation
    ├─ RuleManagementService → Dynamic rules
    └─ ChatService/AI Agent → Natural language processing
    ↓
MQTT Broker (HiveMQ)
    ↓
IoT Devices (ESP32, sensors, actuators)
```

## Troubleshooting

### MCP Server won't start
```bash
# Make sure you're in the right directory
cd /path/to/ginem-dev-monorepo/packages/mcp-server

# Check Node.js version
node --version  # Should be 22+

# Try running directly
npx tsx src/ginem-mcp-server.ts
```

### Claude can't access MCP tools
- Verify the MCP server is running
- Check that the path in `profiles.json` is correct
- Restart Claude Desktop after updating `profiles.json`
- Check Claude's logs for connection errors

### Tools return empty results
- Ensure Ginem API backend is running (`npm run dev` in root)
- Verify devices are registered in the dashboard
- Check that devices have proper MQTT connectivity

## Security Notes

⚠️ **Important:**
- MCP server runs locally on your machine
- Only use over secure connections
- Don't expose the MCP server port to the internet
- Keep your API credentials secure
- MCP tools validate all device commands before execution

## Future Enhancements

- [ ] WebSocket support for real-time device updates
- [ ] Advanced analytics and insights through Claude
- [ ] Multi-user access control
- [ ] Device grouping and scene management
- [ ] Energy consumption analysis

---

**Questions?** Check the main [README.md](./README.md) or create an issue on GitHub.
