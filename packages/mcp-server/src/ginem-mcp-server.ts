import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  TextContent,
  ToolUseBlock,
} from "@modelcontextprotocol/sdk/types.js";

interface DeviceInfo {
  id: string;
  name: string;
  type: "sensor" | "actuator" | "switch";
  status: "online" | "offline";
  lastSeen: string;
}

interface ToolResult {
  success: boolean;
  message: string;
  data?: unknown;
}

// Ginem MCP Server - Exposes AI Agent capabilities to Claude
const server = new Server(
  {
    name: "ginem-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Tool: List all registered devices
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "list_devices",
        description: "List all registered IoT devices in Ginem system",
        inputSchema: {
          type: "object",
          properties: {
            device_type: {
              type: "string",
              enum: ["sensor", "actuator", "switch", "all"],
              description: "Filter devices by type",
            },
            status: {
              type: "string",
              enum: ["online", "offline", "all"],
              description: "Filter devices by status",
            },
          },
        },
      },
      {
        name: "get_device_status",
        description: "Get current status and telemetry of a specific device",
        inputSchema: {
          type: "object",
          properties: {
            device_id: {
              type: "string",
              description: "ID of the device",
            },
          },
          required: ["device_id"],
        },
      },
      {
        name: "control_device",
        description: "Control an IoT device (turn on/off, set value)",
        inputSchema: {
          type: "object",
          properties: {
            device_id: {
              type: "string",
              description: "ID of the device to control",
            },
            action: {
              type: "string",
              description: "Action to perform (on, off, toggle, set_value)",
            },
            value: {
              type: "number",
              description: "Value to set (for devices that support it)",
            },
          },
          required: ["device_id", "action"],
        },
      },
      {
        name: "get_telemetry",
        description: "Get sensor telemetry data (temperature, humidity, etc)",
        inputSchema: {
          type: "object",
          properties: {
            device_id: {
              type: "string",
              description: "ID of the sensor device",
            },
            limit: {
              type: "number",
              description: "Number of recent readings to return (default: 10)",
            },
          },
          required: ["device_id"],
        },
      },
      {
        name: "create_schedule",
        description:
          "Create a one-time or recurring automation schedule for devices",
        inputSchema: {
          type: "object",
          properties: {
            device_id: {
              type: "string",
              description: "ID of the device",
            },
            action: {
              type: "string",
              description: "Action to perform (on, off, toggle)",
            },
            schedule_type: {
              type: "string",
              enum: ["once", "daily", "weekly"],
              description: "Type of schedule",
            },
            time: {
              type: "string",
              description: "Time in HH:MM format",
            },
            description: {
              type: "string",
              description: "Human-readable description of the schedule",
            },
          },
          required: ["device_id", "action", "schedule_type", "time"],
        },
      },
      {
        name: "create_rule",
        description:
          "Create an event-condition-action automation rule for sensors",
        inputSchema: {
          type: "object",
          properties: {
            trigger_device_id: {
              type: "string",
              description: "ID of the sensor device that triggers the rule",
            },
            condition: {
              type: "string",
              description:
                "Condition in natural language (e.g., 'temperature > 30')",
            },
            target_device_id: {
              type: "string",
              description: "ID of the device to control when condition is met",
            },
            action: {
              type: "string",
              description: "Action to perform (on, off, toggle)",
            },
            description: {
              type: "string",
              description: "Human-readable description of the rule",
            },
          },
          required: [
            "trigger_device_id",
            "condition",
            "target_device_id",
            "action",
          ],
        },
      },
      {
        name: "query_natural_language",
        description:
          "Send a natural language query to Ginem AI Agent for processing",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Natural language query or command",
            },
            context: {
              type: "string",
              description: "Optional context about the user or environment",
            },
          },
          required: ["query"],
        },
      },
    ],
  };
});

// Tool: Call handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result: ToolResult;

    switch (name) {
      case "list_devices":
        result = await handleListDevices(
          args.device_type as string,
          args.status as string
        );
        break;

      case "get_device_status":
        result = await handleGetDeviceStatus(args.device_id as string);
        break;

      case "control_device":
        result = await handleControlDevice(
          args.device_id as string,
          args.action as string,
          args.value as number
        );
        break;

      case "get_telemetry":
        result = await handleGetTelemetry(
          args.device_id as string,
          args.limit as number
        );
        break;

      case "create_schedule":
        result = await handleCreateSchedule(
          args.device_id as string,
          args.action as string,
          args.schedule_type as string,
          args.time as string,
          args.description as string
        );
        break;

      case "create_rule":
        result = await handleCreateRule(
          args.trigger_device_id as string,
          args.condition as string,
          args.target_device_id as string,
          args.action as string,
          args.description as string
        );
        break;

      case "query_natural_language":
        result = await handleNaturalLanguageQuery(
          args.query as string,
          args.context as string
        );
        break;

      default:
        result = {
          success: false,
          message: `Unknown tool: ${name}`,
        };
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              success: false,
              message: `Error executing tool: ${String(error)}`,
            },
            null,
            2
          ),
        },
      ],
      isError: true,
    };
  }
});

// Tool handlers (these would integrate with actual Ginem services)

async function handleListDevices(
  deviceType: string,
  status: string
): Promise<ToolResult> {
  // TODO: Call DeviceService to get devices
  return {
    success: true,
    message: "Listed all devices",
    data: [],
  };
}

async function handleGetDeviceStatus(deviceId: string): Promise<ToolResult> {
  // TODO: Call DeviceService to get device status
  return {
    success: true,
    message: `Device ${deviceId} status retrieved`,
    data: {
      device_id: deviceId,
      status: "online",
      last_seen: new Date().toISOString(),
    },
  };
}

async function handleControlDevice(
  deviceId: string,
  action: string,
  value?: number
): Promise<ToolResult> {
  // TODO: Call MQTT service to send command to device
  return {
    success: true,
    message: `Device ${deviceId} received command: ${action}`,
    data: {
      device_id: deviceId,
      action,
      value,
      executed_at: new Date().toISOString(),
    },
  };
}

async function handleGetTelemetry(
  deviceId: string,
  limit: number = 10
): Promise<ToolResult> {
  // TODO: Call DeviceLogService to get telemetry data
  return {
    success: true,
    message: `Telemetry for device ${deviceId}`,
    data: {
      device_id: deviceId,
      readings: [],
    },
  };
}

async function handleCreateSchedule(
  deviceId: string,
  action: string,
  scheduleType: string,
  time: string,
  description: string
): Promise<ToolResult> {
  // TODO: Call SchedulerService to create schedule
  return {
    success: true,
    message: `Schedule created for device ${deviceId}`,
    data: {
      device_id: deviceId,
      action,
      schedule_type: scheduleType,
      time,
      description,
      created_at: new Date().toISOString(),
    },
  };
}

async function handleCreateRule(
  triggerDeviceId: string,
  condition: string,
  targetDeviceId: string,
  action: string,
  description: string
): Promise<ToolResult> {
  // TODO: Call RuleManagementService to create rule
  return {
    success: true,
    message: "Rule created successfully",
    data: {
      trigger_device_id: triggerDeviceId,
      condition,
      target_device_id: targetDeviceId,
      action,
      description,
      created_at: new Date().toISOString(),
    },
  };
}

async function handleNaturalLanguageQuery(
  query: string,
  context?: string
): Promise<ToolResult> {
  // TODO: Call ChatService or AI Agent to process query
  return {
    success: true,
    message: "Query processed",
    data: {
      query,
      context,
      response: "Processing natural language query...",
    },
  };
}

// Start MCP server
const transport = new StdioServerTransport();
void server.connect(transport);

console.log("Ginem MCP Server started and listening for Claude connections");
