/* eslint-disable @typescript-eslint/space-before-function-paren */
/* eslint-disable @typescript-eslint/no-var-requires */
'use strict'

/**
 * Devices are either a sensor or an actuator. Existing hybrid devices become actuators: the only
 * ones in use were gates and the like, which are driven by commands.
 */
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, DataTypes) {
    await queryInterface.sequelize.query(
      "UPDATE devices SET device_type = 'actuator' WHERE device_type = 'hybrid'"
    )
    await queryInterface.changeColumn('devices', 'device_type', {
      type: DataTypes.ENUM('sensor', 'actuator'),
      allowNull: false
    })
  },

  async down(queryInterface, DataTypes) {
    // Devices that were converted stay actuators; only the option is brought back.
    await queryInterface.changeColumn('devices', 'device_type', {
      type: DataTypes.ENUM('sensor', 'actuator', 'hybrid'),
      allowNull: false
    })
  }
}
