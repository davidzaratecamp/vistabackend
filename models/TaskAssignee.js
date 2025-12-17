const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const TaskAssignee = sequelize.define('TaskAssignee', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  taskId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'tasks',
      key: 'id'
    }
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  assignedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'task_assignees',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['taskId', 'userId']
    }
  ]
});

module.exports = TaskAssignee;