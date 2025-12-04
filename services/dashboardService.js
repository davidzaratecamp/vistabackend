const { User, Project, Task, ProjectMember } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');

class DashboardService {
  async getDashboardData(userId, userRole) {
    try {
      const dashboardData = {
        summary: await this.getSummaryStats(userId, userRole),
        recentTasks: await this.getRecentTasks(userId, userRole),
        myProjects: await this.getUserProjects(userId, userRole),
        tasksByStatus: await this.getTasksByStatus(userId, userRole),
        tasksByPriority: await this.getTasksByPriority(userId, userRole),
        recentActivity: await this.getRecentActivity(userId, userRole)
      };

      return dashboardData;
    } catch (error) {
      console.error('Dashboard service error:', error);
      throw error;
    }
  }

  async getSummaryStats(userId, userRole) {
    let projectsQuery, tasksQuery;

    if (['jefe_desarrollo', 'jefe_workforce'].includes(userRole)) {
      projectsQuery = {};
      tasksQuery = {};
    } else {
      // For subordinate roles, only show projects they created
      projectsQuery = {
        createdBy: userId
      };
      tasksQuery = {
        [Op.or]: [
          { assignedTo: userId },
          { createdBy: userId }
        ]
      };
    }

    const [totalProjects, activeProjects, totalTasks, pendingTasks, inProgressTasks, completedTasks] = await Promise.all([
      Project.count({
        where: projectsQuery
      }),
      Project.count({
        where: { ...projectsQuery, status: 'activo' }
      }),
      Task.count({ where: tasksQuery }),
      Task.count({ where: { ...tasksQuery, status: 'pendiente' } }),
      Task.count({ where: { ...tasksQuery, status: 'en_progreso' } }),
      Task.count({ where: { ...tasksQuery, status: 'completado' } })
    ]);

    return {
      totalProjects,
      activeProjects,
      totalTasks,
      pendingTasks,
      inProgressTasks,
      completedTasks
    };
  }

  async getRecentTasks(userId, userRole, limit = 10) {
    let whereClause = {};

    if (!['jefe_desarrollo', 'jefe_workforce'].includes(userRole)) {
      whereClause = {
        [Op.or]: [
          { assignedTo: userId },
          { createdBy: userId }
        ]
      };
    }

    const tasks = await Task.findAll({
      where: whereClause,
      include: [
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name']
        },
        {
          model: User,
          as: 'assignee',
          attributes: ['id', 'firstName', 'lastName']
        }
      ],
      order: [['updatedAt', 'DESC']],
      limit
    });

    return tasks;
  }

  async getUserProjects(userId, userRole, limit = 5) {
    let whereClause = {};
    let include = [
      {
        model: User,
        as: 'creator',
        attributes: ['id', 'firstName', 'lastName']
      }
    ];

    // Department heads can see all projects, others see only their own projects
    if (!['jefe_desarrollo', 'jefe_workforce'].includes(userRole)) {
      whereClause = {
        createdBy: userId
      };
    }

    const projects = await Project.findAll({
      where: whereClause,
      include,
      order: [['updatedAt', 'DESC']],
      limit
    });

    const projectsWithStats = await Promise.all(
      projects.map(async (project) => {
        const taskStats = await Task.findAll({
          where: { projectId: project.id },
          attributes: [
            'status',
            [sequelize.fn('COUNT', sequelize.col('id')), 'count']
          ],
          group: ['status'],
          raw: true
        });

        const stats = {
          pendiente: 0,
          en_progreso: 0,
          completado: 0,
          total: 0
        };

        taskStats.forEach(stat => {
          stats[stat.status] = parseInt(stat.count);
          stats.total += parseInt(stat.count);
        });

        return {
          ...project.toJSON(),
          taskStats: stats
        };
      })
    );

    return projectsWithStats;
  }

  async getTasksByStatus(userId, userRole) {
    let whereClause = {};

    if (!['jefe_desarrollo', 'jefe_workforce'].includes(userRole)) {
      whereClause = {
        [Op.or]: [
          { assignedTo: userId },
          { createdBy: userId }
        ]
      };
    }

    const taskStats = await Task.findAll({
      where: whereClause,
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['status'],
      raw: true
    });

    const stats = {
      pendiente: 0,
      en_progreso: 0,
      completado: 0
    };

    taskStats.forEach(stat => {
      stats[stat.status] = parseInt(stat.count);
    });

    return stats;
  }

  async getTasksByPriority(userId, userRole) {
    let whereClause = {};

    if (!['jefe_desarrollo', 'jefe_workforce'].includes(userRole)) {
      whereClause = {
        [Op.or]: [
          { assignedTo: userId },
          { createdBy: userId }
        ]
      };
    }

    const priorityStats = await Task.findAll({
      where: whereClause,
      attributes: [
        'priority',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['priority'],
      raw: true
    });

    const stats = {
      baja: 0,
      media: 0,
      alta: 0,
      critica: 0
    };

    priorityStats.forEach(stat => {
      stats[stat.priority] = parseInt(stat.count);
    });

    return stats;
  }

  async getRecentActivity(userId, userRole, limit = 15) {
    const activities = [];
    
    const recentTasks = await Task.findAll({
      where: !['jefe_desarrollo', 'jefe_workforce'].includes(userRole) ? {
        [Op.or]: [
          { assignedTo: userId },
          { createdBy: userId }
        ]
      } : {},
      include: [
        {
          model: Project,
          as: 'project',
          attributes: ['name']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['firstName', 'lastName']
        },
        {
          model: User,
          as: 'assignee',
          attributes: ['firstName', 'lastName']
        }
      ],
      order: [['updatedAt', 'DESC']],
      limit
    });

    recentTasks.forEach(task => {
      activities.push({
        type: 'task',
        action: 'updated',
        title: task.title,
        project: task.project?.name,
        user: task.creator ? `${task.creator.firstName} ${task.creator.lastName}` : 'Unknown',
        timestamp: task.updatedAt,
        status: task.status,
        priority: task.priority
      });
    });

    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    return activities.slice(0, limit);
  }

  async getFilteredTasks(userId, userRole, filters = {}) {
    let whereClause = {};
    
    if (!['jefe_desarrollo', 'jefe_workforce'].includes(userRole)) {
      whereClause[Op.or] = [
        { assignedTo: userId },
        { createdBy: userId }
      ];
    }

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

    if (filters.dateFrom || filters.dateTo) {
      whereClause.createdAt = {};
      if (filters.dateFrom) {
        whereClause.createdAt[Op.gte] = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        whereClause.createdAt[Op.lte] = new Date(filters.dateTo);
      }
    }

    const tasks = await Task.findAll({
      where: whereClause,
      include: [
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name']
        },
        {
          model: User,
          as: 'assignee',
          attributes: ['id', 'firstName', 'lastName']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName']
        }
      ],
      order: [['updatedAt', 'DESC']]
    });

    return tasks;
  }
}

module.exports = new DashboardService();