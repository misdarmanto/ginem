/* eslint-disable @typescript-eslint/space-before-function-paren */
/* eslint-disable @typescript-eslint/no-var-requires */
'use strict'

const { BaseModelFields } = require('../baseModel')

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, DataTypes) {
    await queryInterface.createTable('agent_logs', {
      ...BaseModelFields,
      agent_log_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true
      },
      request_id: { type: DataTypes.STRING(191), allowNull: false },
      user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      session_id: { type: DataTypes.STRING(191), allowNull: true },
      source: { type: DataTypes.ENUM('web', 'whatsapp'), allowNull: false },
      channel: { type: DataTypes.ENUM('chat', 'voice'), allowNull: false },
      command: { type: DataTypes.TEXT, allowNull: false },
      reply: { type: DataTypes.TEXT, allowNull: true },
      status: {
        type: DataTypes.ENUM('pending', 'success', 'failed', 'clarification'),
        allowNull: false,
        defaultValue: 'pending'
      },
      status_reason: { type: DataTypes.STRING(500), allowNull: true },
      model: { type: DataTypes.STRING(100), allowNull: true },
      input_tokens: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      output_tokens: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      total_tokens: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      cached_input_tokens: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      estimated_cost_usd: { type: DataTypes.DECIMAL(12, 8), allowNull: true },
      queue_wait_ms: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      context_latency_ms: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      agent_latency_ms: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      server_latency_ms: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      client_latency_ms: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      tool_calls: { type: DataTypes.JSON, allowNull: true }
    })

    await queryInterface.addIndex('agent_logs', ['request_id'])
    await queryInterface.addIndex('agent_logs', ['user_id'])
    await queryInterface.addIndex('agent_logs', ['status'])
    await queryInterface.addIndex('agent_logs', ['created_at'])
  },

  async down(queryInterface) {
    await queryInterface.dropTable('agent_logs')
  }
}
