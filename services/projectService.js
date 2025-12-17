const { Project, User, ProjectMember, Task } = require('../models');
const { Op } = require('sequelize');

class ProjectService {
  async createProject(projectData, userId) {
    const user = await User.findByPk(userId);
    
    // Determine project area based on user role
    let area = 'desarrollo';
    if (user.role === 'jefe_workforce' || user.role === 'workforce') {
      area = 'workforce';
    }

    const project = await Project.create({
      ...projectData,
      createdBy: userId,
      area: area
    });

    // Map user role to project role
    let projectRole = 'desarrollador'; // default for jefe_desarrollo, desarrollador
    if (user.role === 'jefe_workforce' || user.role === 'workforce') {
      projectRole = 'workforce';
    }

    await ProjectMember.create({
      projectId: project.id,
      userId: userId,
      role: projectRole
    });

    return this.getProjectById(project.id, userId);
  }

  async getAllProjects(userId, userRole, filters = {}) {
    const whereClause = {};
    const include = [
      {
        model: User,
        as: 'creator',
        attributes: ['id', 'firstName', 'lastName', 'email']
      },
      {
        model: User,
        as: 'members',
        attributes: ['id', 'firstName', 'lastName', 'email', 'role'],
        through: { attributes: ['role', 'joinedAt'] }
      }
    ];

    if (filters.status) {
      whereClause.status = filters.status;
    }

    if (filters.priority) {
      whereClause.priority = filters.priority;
    }

    if (filters.search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${filters.search}%` } },
        { description: { [Op.like]: `%${filters.search}%` } }
      ];
    }

    // Area segregation - users can only see projects from their area
    if (userRole === 'jefe_desarrollo' || userRole === 'desarrollador') {
      whereClause.area = 'desarrollo';
    } else if (userRole === 'jefe_workforce' || userRole === 'workforce') {
      whereClause.area = 'workforce';
    }

    // For non-jefe roles, filter projects where user is a member
    if (!['jefe_desarrollo', 'jefe_workforce'].includes(userRole)) {
      // We need to add a condition to show only projects where the user is a member
      // This will be handled by modifying the whereClause to include member check
      const existingOr = whereClause[Op.or] || [];
      whereClause[Op.and] = [
        { area: whereClause.area }, // Maintain area restriction
        {
          [Op.or]: [
            { createdBy: userId },
            { '$members.id$': userId },
            ...existingOr
          ]
        }
      ];
      delete whereClause.area; // Remove area from main where clause since it's now in Op.and
    }

    const projects = await Project.findAll({
      where: whereClause,
      include,
      order: [['updatedAt', 'DESC']]
    });

    return projects;
  }

  async getProjectById(projectId, userId) {
    const project = await Project.findByPk(projectId, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: User,
          as: 'members',
          attributes: ['id', 'firstName', 'lastName', 'email', 'role'],
          through: { attributes: ['role', 'joinedAt'] }
        },
        {
          model: Task,
          as: 'tasks',
          attributes: ['id', 'title', 'status', 'priority', 'estimatedDate'],
          include: [
            {
              model: User,
              as: 'assignee',
              attributes: ['id', 'firstName', 'lastName']
            }
          ]
        }
      ]
    });

    if (!project) {
      throw new Error('Project not found');
    }

    return project;
  }

  async updateProject(projectId, updateData, userId) {
    const project = await Project.findByPk(projectId);
    
    if (!project) {
      throw new Error('Project not found');
    }

    // Check if user is a department head or project creator
    const user = await User.findByPk(userId);
    const isManager = user.role === 'jefe_desarrollo' || user.role === 'jefe_workforce';

    if (!isManager && project.createdBy !== userId) {
      throw new Error('Not authorized to update this project');
    }

    await project.update(updateData);
    return this.getProjectById(projectId, userId);
  }

  async deleteProject(projectId, userId) {
    const project = await Project.findByPk(projectId);
    
    if (!project) {
      throw new Error('Project not found');
    }

    // Check if user is a department head or project creator
    const user = await User.findByPk(userId);
    const isManager = user.role === 'jefe_desarrollo' || user.role === 'jefe_workforce';

    if (!isManager && project.createdBy !== userId) {
      throw new Error('Only department heads or project creator can delete the project');
    }

    await project.destroy();
    return { message: 'Project deleted successfully' };
  }

  async addMemberToProject(projectId, userId, targetUserId, role = 'desarrollador') {
    const project = await Project.findByPk(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    // Check if user is a department head, project creator, or project member
    const user = await User.findByPk(userId);
    const isManager = user.role === 'jefe_desarrollo' || user.role === 'jefe_workforce';
    
    const isMember = await ProjectMember.findOne({
      where: { projectId, userId }
    });

    if (!isManager && project.createdBy !== userId && !isMember) {
      throw new Error('Only department heads, project creator, or project members can add members');
    }

    const existingMember = await ProjectMember.findOne({
      where: { projectId, userId: targetUserId }
    });

    if (existingMember) {
      throw new Error('User is already a member of this project');
    }

    const member = await ProjectMember.create({
      projectId,
      userId: targetUserId,
      role
    });

    return member;
  }

  async removeMemberFromProject(projectId, userId, targetUserId) {
    const project = await Project.findByPk(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    // Check if user is a department head or project creator
    const user = await User.findByPk(userId);
    const isManager = user.role === 'jefe_desarrollo' || user.role === 'jefe_workforce';

    if (!isManager && project.createdBy !== userId) {
      throw new Error('Only department heads can remove members');
    }

    const member = await ProjectMember.findOne({
      where: { projectId, userId: targetUserId }
    });

    if (!member) {
      throw new Error('User is not a member of this project');
    }

    await member.destroy();
    return { message: 'Member removed successfully' };
  }

  async getProjectStats(projectId) {
    const tasks = await Task.findAll({
      where: { projectId },
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
}

module.exports = new ProjectService();