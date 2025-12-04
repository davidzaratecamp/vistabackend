const User = require('./User');
const Project = require('./Project');
const Task = require('./Task');
const TaskComment = require('./TaskComment');
const ProjectMember = require('./ProjectMember');

User.hasMany(Project, { foreignKey: 'createdBy', as: 'createdProjects' });
Project.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

User.hasMany(Task, { foreignKey: 'assignedTo', as: 'assignedTasks' });
Task.belongsTo(User, { foreignKey: 'assignedTo', as: 'assignee' });

User.hasMany(Task, { foreignKey: 'createdBy', as: 'createdTasks' });
Task.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

Project.hasMany(Task, { foreignKey: 'projectId', as: 'tasks' });
Task.belongsTo(Project, { foreignKey: 'projectId', as: 'project' });

Task.hasMany(TaskComment, { foreignKey: 'taskId', as: 'comments' });
TaskComment.belongsTo(Task, { foreignKey: 'taskId', as: 'task' });

User.hasMany(TaskComment, { foreignKey: 'userId', as: 'comments' });
TaskComment.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.belongsToMany(Project, { through: ProjectMember, foreignKey: 'userId', as: 'projects' });
Project.belongsToMany(User, { through: ProjectMember, foreignKey: 'projectId', as: 'members' });

ProjectMember.belongsTo(User, { foreignKey: 'userId', as: 'user' });
ProjectMember.belongsTo(Project, { foreignKey: 'projectId', as: 'project' });

// User hierarchy relations
User.hasMany(User, { foreignKey: 'managerId', as: 'subordinates' });
User.belongsTo(User, { foreignKey: 'managerId', as: 'manager' });

module.exports = {
  User,
  Project,
  Task,
  TaskComment,
  ProjectMember
};