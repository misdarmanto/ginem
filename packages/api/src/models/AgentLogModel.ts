import { DataTypes, type Model } from 'sequelize'
import { sequelizeInit } from '../configs/database'
import { BaseModelFields, type IBaseModelFields } from '../interfaces/baseModelFields'

export type AgentLogStatus = 'pending' | 'success' | 'failed' | 'clarification'
export type AgentLogSource = 'web' | 'whatsapp'
export type AgentLogChannel = 'chat' | 'voice'

export interface IAgentToolCall {
  name: string
  args: Record<string, unknown>
  ok?: boolean
  error?: string
  output?: string
}

export interface IAgentLogAttributes extends IBaseModelFields {
  agentLogId: number
  requestId: string
  userId: number | null
  sessionId: string | null
  source: AgentLogSource
  channel: AgentLogChannel
  command: string
  reply: string | null
  status: AgentLogStatus
  statusReason: string | null
  model: string | null
  inputTokens: number | null
  outputTokens: number | null
  totalTokens: number | null
  cachedInputTokens: number | null
  /** DECIMAL columns come back from MySQL as strings. */
  estimatedCostUsd: string | number | null
  queueWaitMs: number | null
  /** Time spent loading memory and searching the knowledge base before the LLM was called. */
  contextLatencyMs: number | null
  agentLatencyMs: number | null
  serverLatencyMs: number | null
  clientLatencyMs: number | null
  toolCalls: IAgentToolCall[] | null
}

export type IAgentLogCreationAttributes = Omit<
IAgentLogAttributes,
'agentLogId' | 'createdAt' | 'updatedAt' | 'deletedAt'
>

export interface AgentLogInstance
  extends Model<IAgentLogAttributes, IAgentLogCreationAttributes>,
  IAgentLogAttributes {}

export const AgentLogModel = sequelizeInit.define<AgentLogInstance>(
  'AgentLogs',
  {
    ...BaseModelFields,
    agentLogId: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    requestId: { type: DataTypes.STRING(191), allowNull: false },
    userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    sessionId: { type: DataTypes.STRING(191), allowNull: true },
    source: { type: DataTypes.ENUM('web', 'whatsapp'), allowNull: false },
    channel: { type: DataTypes.ENUM('chat', 'voice'), allowNull: false },
    command: { type: DataTypes.TEXT, allowNull: false },
    reply: { type: DataTypes.TEXT, allowNull: true },
    status: {
      type: DataTypes.ENUM('pending', 'success', 'failed', 'clarification'),
      allowNull: false,
      defaultValue: 'pending'
    },
    statusReason: { type: DataTypes.STRING(500), allowNull: true },
    model: { type: DataTypes.STRING(100), allowNull: true },
    inputTokens: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    outputTokens: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    totalTokens: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    cachedInputTokens: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    estimatedCostUsd: { type: DataTypes.DECIMAL(12, 8), allowNull: true },
    queueWaitMs: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    contextLatencyMs: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    agentLatencyMs: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    serverLatencyMs: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    clientLatencyMs: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    toolCalls: { type: DataTypes.JSON, allowNull: true }
  },
  {
    tableName: 'agent_logs',
    timestamps: true,
    paranoid: false,
    underscored: true,
    freezeTableName: true,
    engine: 'InnoDB'
  }
)
