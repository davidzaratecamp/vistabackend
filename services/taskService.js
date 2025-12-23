const { Task, User, Project, TaskComment, ProjectMember, TaskAssignee } = require('../models');
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

    // Extract assignees and create task without assignedTo
    const { assignees, assignedTo, ...taskDataClean } = taskData;
    
    const task = await Task.create({
      ...taskDataClean,
      assignedTo: null, // We'll use the new system
      createdBy: userId,
      area: project.area // Inherit area from project
    });

    // Handle multiple assignees
    if (assignees && assignees.length > 0) {
      const assigneePromises = assignees.map(assigneeId => 
        TaskAssignee.create({
          taskId: task.id,
          userId: assigneeId
        })
      );
      await Promise.all(assigneePromises);
    } else if (assignedTo) {
      // Backward compatibility: if assignedTo is provided, use it
      await TaskAssignee.create({
        taskId: task.id,
        userId: assignedTo
      });
    }

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
        as: 'assignees',
        attributes: ['id', 'firstName', 'lastName', 'email'],
        through: { attributes: ['assignedAt'] }
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
    if (userRole === 'jefe_desarrollo' || userRole === 'desarrollador' || userRole === 'disenador') {
      whereClause.area = 'desarrollo';
    } else if (userRole === 'jefe_workforce' || userRole === 'workforce') {
      whereClause.area = 'workforce';
    } else {
      whereClause.area = 'desarrollo'; // Default area
    }

    if (userRole !== 'jefe_desarrollo' && userRole !== 'jefe_workforce') {
      // Combine area restriction with member/assignment check
      const existingOr = whereClause[Op.or] || [];
      whereClause[Op.and] = [
        { area: whereClause.area }, // Maintain area restriction
        {
          [Op.or]: [
            { assignedTo: userId }, // Legacy support
            { '$assignees.id$': userId }, // New multi-assignee support
            { createdBy: userId },
            {
              '$project.members.id$': userId
            },
            ...existingOr
          ]
        }
      ];
      delete whereClause.area; // Remove area from main where clause since it's now in Op.and

      include[3].include = [{
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
          as: 'assignees',
          attributes: ['id', 'firstName', 'lastName', 'email'],
          through: { attributes: ['assignedAt'] }
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
          model: User,
          as: 'assignees',
          through: { attributes: [] }
        },
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

    const isOldAssignee = task.assignedTo === userId;
    const isNewAssignee = task.assignees.some(assignee => assignee.id === userId);
    const isCreator = task.createdBy === userId;
    const isProjectMember = task.project.members.some(member => member.id === userId);
    const isProjectCreator = task.project.createdBy === userId;

    if (!isOldAssignee && !isNewAssignee && !isCreator && !isProjectMember && !isProjectCreator) {
      throw new Error('Not authorized to update this task');
    }

    // Handle assignees update
    const { assignees, assignedTo, ...taskUpdateData } = updateData;
    
    if (assignees !== undefined) {
      // Remove all current assignees
      await TaskAssignee.destroy({ where: { taskId } });
      
      // Add new assignees
      if (assignees.length > 0) {
        const assigneePromises = assignees.map(assigneeId => 
          TaskAssignee.create({
            taskId: taskId,
            userId: assigneeId
          })
        );
        await Promise.all(assigneePromises);
      }
    } else if (assignedTo !== undefined) {
      // Backward compatibility: if assignedTo is provided, use it
      await TaskAssignee.destroy({ where: { taskId } });
      if (assignedTo) {
        await TaskAssignee.create({
          taskId: taskId,
          userId: assignedTo
        });
      }
    }

    if (taskUpdateData.status === 'completado' && !taskUpdateData.completedDate) {
      taskUpdateData.completedDate = new Date();
    }

    if (taskUpdateData.status !== 'completado' && taskUpdateData.completedDate) {
      taskUpdateData.completedDate = null;
    }

    await task.update(taskUpdateData);
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
            { assignedTo: userId }, // Legacy support
            { '$assignees.id$': userId }, // New multi-assignee support
            { createdBy: userId }
          ]
        }
      ]
    };

    // Area segregation
    if (user.role === 'jefe_desarrollo' || user.role === 'desarrollador' || user.role === 'disenador') {
      whereClause[Op.and].push({ area: 'desarrollo' });
    } else if (user.role === 'jefe_workforce' || user.role === 'workforce') {
      whereClause[Op.and].push({ area: 'workforce' });
    }

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
          model: User,
          as: 'assignees',
          attributes: ['id', 'firstName', 'lastName'],
          through: { attributes: [] }
        },
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

  async updateTaskStatus(taskId, status, userId) {
    const task = await Task.findByPk(taskId, {
      include: [
        {
          model: User,
          as: 'assignees',
          through: { attributes: [] }
        },
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

    // Check if user has permission to update the task status
    const isOldAssignee = task.assignedTo === userId;
    const isNewAssignee = task.assignees.some(assignee => assignee.id === userId);
    const isCreator = task.createdBy === userId;
    const isProjectMember = task.project.members.some(member => member.id === userId);
    const isProjectCreator = task.project.createdBy === userId;

    if (!isOldAssignee && !isNewAssignee && !isCreator && !isProjectMember && !isProjectCreator) {
      throw new Error('Not authorized to update this task status');
    }

    // Update the status and handle completedDate
    const updateData = { status };
    
    if (status === 'completado' && !task.completedDate) {
      updateData.completedDate = new Date();
    }

    if (status !== 'completado' && task.completedDate) {
      updateData.completedDate = null;
    }

    await task.update(updateData);
    return this.getTaskById(taskId, userId);
  }
}

module.exports = new TaskService();
