/* eslint-disable @typescript-eslint/space-before-function-paren */
/* eslint-disable @typescript-eslint/no-var-requires */
'use strict'

const { Op } = require('sequelize')

/** Models removed from the Settings list. Everything else stays selectable. */
const REMOVED_MODEL_IDS = [
  'claude-3-5-sonnet',
  'claude-opus-4',
  'deepseek-chat',
  'deepseek-coder',
  'deepseek-reasoner',
  'o1',
  'o1-mini'
]

/** If the selected model is one of the removed ones, selection moves here. */
const FALLBACK_MODEL_ID = 'gpt-4o-mini'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const [selectedRemoved] = await queryInterface.sequelize.query(
      'SELECT id FROM llm_models WHERE deleted = 0 AND is_selected = 1 AND id IN (:ids)',
      { replacements: { ids: REMOVED_MODEL_IDS } }
    )

    await queryInterface.bulkUpdate(
      'llm_models',
      { deleted: true, deleted_at: new Date(), is_selected: false },
      { id: { [Op.in]: REMOVED_MODEL_IDS }, deleted: false }
    )

    if (selectedRemoved.length > 0) {
      await queryInterface.bulkUpdate(
        'llm_models',
        { is_selected: true },
        { id: FALLBACK_MODEL_ID }
      )
    }
  },

  async down(queryInterface) {
    await queryInterface.bulkUpdate(
      'llm_models',
      { deleted: false, deleted_at: null },
      { id: { [Op.in]: REMOVED_MODEL_IDS } }
    )
  }
}
