# Ginem MCP Server

Model Context Protocol (MCP) server that enables Claude and other AI systems to control and monitor Ginem smart home devices.

## Quick Start

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Run in production
npm start
```

## What it does

The MCP server exposes these tools to Claude:

- **list_devices** - List all registered IoT devices
- **get_device_status** - Get device status and metadata
- **control_device** - Turn devices on/off or set values
- **get_telemetry** - Retrieve sensor readings
- **create_schedule** - Create automation schedules
- **create_rule** - Create sensor-triggered rules
- **query_natural_language** - Send queries to Ginem AI Agent

## Configuration

See [../MCP_SETUP.md](../MCP_SETUP.md) for Claude Desktop setup instructions.

## Architecture

- Implements Model Context Protocol (MCP)
- Uses stdio transport for Claude communication
- Minimal dependencies (just MCP SDK)
- Stateless design for easy deployment

## Development

```bash
npm run lint      # Check code
npm run lint:fix  # Fix linting issues
npm run build     # Compile TypeScript
```

---

For full setup documentation, see the root [MCP_SETUP.md](../MCP_SETUP.md).
