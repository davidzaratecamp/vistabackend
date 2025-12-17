const { Task, User, Project, TaskComment, ProjectMember } = require('../models');
const { Op } = require('sequelize');

class TaskService {
  async createTask(taskData, userId) {
    const project = await Project.findByPk(taskData.projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    const isMember = await ProjectMember.findOne({
      where: {
        projectId: taskData.projectId,
        userId
      }
    });

    if (!isMember && project.createdBy !== userId) {
      throw new Error('Not authorized to create tasks in this project');
    }

    const task = await Task.create({
      ...taskData,
      createdBy: userId,
      area: project.area // Inherit area from project
    });

    return this.getTaskById(task.id, userId);
  }

  async getAllTasks(userId, userRole, filters = {}) {
    const whereClause = {};
    const include = [
      {
        model: User,
        as: 'assignee',
        attributes: ['id', 'firstName', 'lastName', 'email']
      },
      {
        model: User,
        as: 'creator',
        attributes: ['id', 'firstName', 'lastName', 'email']
      },
      {
        model: Project,
        as: 'project',
        attributes: ['id', 'name', 'status']
      }
    ];

    if (filters.status) {
      whereClause.status = filters.status;
    }

    if (filters.priority) {
      whereClause.priority = filters.priority;
    }

    if (filters.projectId) {
      whereClause.projectId = filters.projectId;
    }

    if (filters.assignedTo) {
      whereClause.assignedTo = filters.assignedTo;
    }

    if (filters.search) {
      whereClause[Op.or] = [
        { title: { [Op.like]: `%${filters.search}%` } },
        { description: { [Op.like]: `%${filters.search}%` } }
      ];
    }

    // Area segregation - users can only see tasks from their area
    if (userRole === 'jefe_desarrollo' || userRole === 'desarrollador') {
      whereClause.area = 'desarrollo';
    } else if (userRole === 'jefe_workforce' || userRole === 'workforce') {
      whereClause.area = 'workforce';
    }

    if (userRole !== 'jefe_desarrollo' && userRole !== 'jefe_workforce') {
      // Combine area restriction with member/assignment check
      const existingOr = whereClause[Op.or] || [];
      whereClause[Op.and] = [
        { area: whereClause.area }, // Maintain area restriction
        {
          [Op.or]: [
            { assignedTo: userId },
            { createdBy: userId },
            {
              '$project.members.id$': userId
            },
            ...existingOr
          ]
        }
      ];
      delete whereClause.area; // Remove area from main where clause since it's now in Op.and

      include[2].include = [{
        model: User,
        as: 'members',
        attributes: ['id'],
        through: { attributes: [] }
      }];
    }

    const tasks = await Task.findAll({
      where: whereClause,
      include,
      order: [['updatedAt', 'DESC']]
    });

    return tasks;
  }

  async getTaskById(taskId, userId) {
    const task = await Task.findByPk(taskId, {
      include: [
        {
          model: User,
          as: 'assignee',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name', 'status']
        },
        {
          model: TaskComment,
          as: 'comments',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'firstName', 'lastName']
            }
          ],
          order: [['createdAt', 'ASC']]
        }
      ]
    });

    if (!task) {
      throw new Error('Task not found');
    }

    return task;
  }

  async updateTask(taskId, updateData, userId) {
    const task = await Task.findByPk(taskId, {
      include: [
        {
          model: Project,
          as: 'project',
          include: [
            {
              model: User,
              as: 'members',
              through: { attributes: [] }
            }
          ]
        }
      ]
    });

    if (!task) {
      throw new Error('Task not found');
    }

    const isAssignee = task.assignedTo === userId;
    const isCreator = task.createdBy === userId;
    const isProjectMember = task.project.members.some(member => member.id === userId);
    const isProjectCreator = task.project.createdBy === userId;

    if (!isAssignee && !isCreator && !isProjectMember && !isProjectCreator) {
      throw new Error('Not authorized to update this task');
    }

    if (updateData.status === 'completado' && !updateData.completedDate) {
      updateData.completedDate = new Date();
    }

    if (updateData.status !== 'completado' && updateData.completedDate) {
      updateData.completedDate = null;
    }

    await task.update(updateData);
    return this.getTaskById(taskId, userId);
  }

  async deleteTask(taskId, userId) {
    const task = await Task.findByPk(taskId);
    
    if (!task) {
      throw new Error('Task not found');
    }

    if (task.createdBy !== userId) {
      throw new Error('Only task creator can delete the task');
    }

    await task.destroy();
    return { message: 'Task deleted successfully' };
  }

  async addComment(taskId, commentData, userId) {
    const task = await Task.findByPk(taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    const comment = await TaskComment.create({
      ...commentData,
      taskId,
      userId
    });

    const fullComment = await TaskComment.findByPk(comment.id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName']
        }
      ]
    });

    return fullComment;
  }

  async getTaskComments(taskId, userId) {
    const task = await Task.findByPk(taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    const comments = await TaskComment.findAll({
      where: { taskId },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName']
        }
      ],
      order: [['createdAt', 'ASC']]
    });

    return comments;
  }

  async getTasksByUser(userId, filters = {}) {
    const user = await User.findByPk(userId);
    
    const whereClause = {
      [Op.and]: [
        {
          [Op.or]: [
            { assignedTo: userId },
            { createdBy: userId }
          ]
        }
      ]
    };

    // Area segregation
    if (user.role === 'jefe_desarrollo' || user.role === 'desarrollador') {
      whereClause[Op.and].push({ area: 'desarrollo' });
    } else if (user.role === 'jefe_workforce' || user.role === 'workforce') {
      whereClause[Op.and].push({ area: 'workforce' });

    if (filters.status) {
      whereClause.status = filters.status;
    }

    if (filters.priority) {
      whereClause.priority = filters.priority;
    }

    const tasks = await Task.findAll({
      where: whereClause,
      include: [
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name', 'area']
        }
      ],
      order: [['updatedAt', 'DESC']]
    });

    return tasks;
  }

  async getTaskStats(userId, projectId = null) {
    const whereClause = {};
    
    if (projectId) {
      whereClause.projectId = projectId;
    }

    whereClause[Op.or] = [
      { assignedTo: userId },
      { createdBy: userId }
    ];

    const tasks = await Task.findAll({
      where: whereClause,
      attributes: ['status', 'priority']
    });

    const stats = {
      total: tasks.length,
      pendiente: tasks.filter(t => t.status === 'pendiente').length,
      en_progreso: tasks.filter(t => t.status === 'en_progreso').length,
      completado: tasks.filter(t => t.status === 'completado').length,
      by_priority: {
        baja: tasks.filter(t => t.priority === 'baja').length,
        media: tasks.filter(t => t.priority === 'media').length,
        alta: tasks.filter(t => t.priority === 'alta').length,
        critica: tasks.filter(t => t.priority === 'critica').length
      }
    };

    return stats;
  }

  async updateTaskStatus(taskId, status, userId) {
    const task = await Task.findByPk(taskId, {
      include: [
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name', 'createdBy']
        }
      ]
    });

    if (!task) {
      throw new Error('Task not found');
    }

    // Check if user has permission to update task status
    // Allow task creator, assignee, project creator, and managers
    const user = await User.findByPk(userId);
    const isManager = user.role === 'jefe_desarrollo' || user.role === 'jefe_workforce';
    const hasPermission = task.createdBy === userId || 
                         task.assignedTo === userId || 
                         task.project.createdBy === userId ||
                         isManager;

    if (!hasPermission) {
      throw new Error('Not authorized to update this task status');
    }

    const updateData = { status };

    // Auto-set completion date when marking as completed
    if (status === 'completado') {
      updateData.completedDate = new Date();
    } else if (task.status === 'completado' && status !== 'completado') {
      // Remove completion date if changing from completed to other status
      updateData.completedDate = null;
    }

    await task.update(updateData);
    return this.getTaskById(taskId, userId);
  }
}

module.exports = new TaskService();