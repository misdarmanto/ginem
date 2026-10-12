/* eslint-disable @typescript-eslint/space-before-function-paren */
/* eslint-disable @typescript-eslint/no-var-requires */
'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, DataTypes) {
    await queryInterface.addColumn('users', 'user_voice', {
      type: DataTypes.STRING(32),
      allowNull: true
    })
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('users', 'user_voice')
  }
}
