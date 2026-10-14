/* eslint-disable @typescript-eslint/space-before-function-paren */
/* eslint-disable @typescript-eslint/no-var-requires */
'use strict'

/**
 * Models whose id or name did not match what the provider actually offers.
 * - "Claude Haiku 4" does not exist; the model is Claude Haiku 4.5.
 * - deepseek-v4-flash is a deprecated alias; the current name is deepseek-flash (V4.1).
 */
const RENAMES = [
  {
    from: { id: 'claude-haiku-4', name: 'Claude Haiku 4' },
    to: { id: 'claude-haiku-4-5', name: 'Claude Haiku 4.5' }
  },
  {
    from: { id: 'deepseek-v4-flash', name: 'DeepSeek V4 Flash' },
    to: { id: 'deepseek-flash', name: 'DeepSeek V4.1 Flash' }
  }
]

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    for (const { from, to } of RENAMES) {
      await queryInterface.bulkUpdate('llm_models', to, { id: from.id })
    }
  },

  async down(queryInterface) {
    for (const { from, to } of RENAMES) {
      await queryInterface.bulkUpdate('llm_models', from, { id: to.id })
    }
  }
}
