const { User } = require('../models');
const { Op } = require('sequelize');
const bcrypt = require('bcryptjs');

class UserService {
  async getAllUsers(currentUserId, currentUserRole, filters = {}) {
    const whereClause = {};
    const include = [
      {
        model: User,
        as: 'manager',
        attributes: ['id', 'firstName', 'lastName', 'email', 'role']
      }
    ];

    // Apply filters
    if (filters.role) {
      whereClause.role = filters.role;
    }

    if (filters.managerId) {
      whereClause.managerId = filters.managerId;
    }

    if (filters.search) {
      whereClause[Op.or] = [
        { firstName: { [Op.like]: `%${filters.search}%` } },
        { lastName: { [Op.like]: `%${filters.search}%` } },
        { email: { [Op.like]: `%${filters.search}%` } }
      ];
    }

    // Role-based access control - Area segregation
    if (currentUserRole === 'jefe_desarrollo') {
      // Development head can only see development team (desarrollador, disenador) and themselves
      whereClause.role = { [Op.in]: ['jefe_desarrollo', 'desarrollador', 'disenador'] };
    } else if (currentUserRole === 'jefe_workforce') {
      // Workforce head can only see workforce team and themselves
      whereClause.role = { [Op.in]: ['jefe_workforce', 'workforce'] };
    } else if (currentUserRole === 'desarrollador' || currentUserRole === 'disenador') {
      // Development team can see others in their area
      whereClause.role = { [Op.in]: ['jefe_desarrollo', 'desarrollador', 'disenador'] };
    } else if (currentUserRole === 'workforce') {
      // Workforce team can see others in their area
      whereClause.role = { [Op.in]: ['jefe_workforce', 'workforce'] };
    }

    const users = await User.findAll({
      where: whereClause,
      include,
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']]
    });

    return users;
  }

  async getUserById(userId, currentUserId, currentUserRole) {
    const user = await User.findByPk(userId, {
      include: [
        {
          model: User,
          as: 'manager',
          attributes: ['id', 'firstName', 'lastName', 'email', 'role']
        }
      ],
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Check permissions
    if (!['jefe_desarrollo', 'jefe_workforce'].includes(currentUserRole) &&
      user.managerId !== currentUserId &&
      user.id !== currentUserId) {
      throw new Error('Not authorized to view this user');
    }

    return user;
  }

  async createUser(userData, currentUserId, currentUserRole) {
    // Validate role hierarchy
    const allowedRoles = this.getAllowedRolesToCreate(currentUserRole);

    if (!allowedRoles.includes(userData.role)) {
      throw new Error(`You are not authorized to create users with role: ${userData.role}`);
    }

    // Set manager based on role hierarchy
    if (currentUserRole === 'jefe_desarrollo' || currentUserRole === 'jefe_workforce') {
      // Department heads become the manager of their created users
      userData.managerId = currentUserId;
    } else {
      // Other roles creating subordinates become their manager
      userData.managerId = currentUserId;
    }

    // Generate temporary password if not provided
    if (!userData.password) {
      userData.password = this.generateTemporaryPassword();
    }

    const user = await User.create(userData);

    return this.getUserById(user.id, currentUserId, currentUserRole);
  }

  async updateUser(userId, updateData, currentUserId, currentUserRole) {
    const user = await User.findByPk(userId);

    if (!user) {
      throw new Error('User not found');
    }

    // Check permissions
    if (!['jefe_desarrollo', 'jefe_workforce'].includes(currentUserRole) &&
      user.managerId !== currentUserId &&
      user.id !== currentUserId) {
      throw new Error('Not authorized to update this user');
    }

    // Prevent role escalation
    if (updateData.role) {
      const allowedRoles = this.getAllowedRolesToCreate(currentUserRole);
      if (!allowedRoles.includes(updateData.role) && user.id !== currentUserId) {
        throw new Error(`You are not authorized to assign role: ${updateData.role}`);
      }
    }

    // Prevent changing manager unless you're a department head
    if (updateData.managerId && !['jefe_desarrollo', 'jefe_workforce'].includes(currentUserRole)) {
      delete updateData.managerId;
    }

    await user.update(updateData);

    return this.getUserById(userId, currentUserId, currentUserRole);
  }

  async deleteUser(userId, currentUserId, currentUserRole) {
    const user = await User.findByPk(userId);

    if (!user) {
      throw new Error('User not found');
    }

    // Check permissions
    // Check permissions
    if (!['jefe_desarrollo', 'jefe_workforce'].includes(currentUserRole) && user.managerId !== currentUserId) {
      throw new Error('Not authorized to delete this user');
    }

    // Don't allow self-deletion
    if (user.id === currentUserId) {
      throw new Error('You cannot delete yourself');
    }

    // Check if user has subordinates
    const subordinates = await User.count({
      where: { managerId: userId }
    });

    if (subordinates > 0) {
      throw new Error('Cannot delete user with subordinates. Please reassign them first.');
    }

    await user.destroy();
    return { message: 'User deleted successfully' };
  }

  async getUsersUnderManager(managerId) {
    return await User.findAll({
      where: { managerId },
      attributes: { exclude: ['password'] },
      order: [['firstName', 'ASC']]
    });
  }

  async getUserStats(currentUserId, currentUserRole) {
    let whereClause = {};

    if (!['jefe_desarrollo', 'jefe_workforce'].includes(currentUserRole)) {
      whereClause = {
        [Op.or]: [
          { managerId: currentUserId },
          { id: currentUserId }
        ]
      };
    }

    const users = await User.findAll({
      where: whereClause,
      attributes: ['role', 'isActive']
    });

    const stats = {
      total: users.length,
      active: users.filter(u => u.isActive).length,
      inactive: users.filter(u => !u.isActive).length,
      by_role: {
        jefe_desarrollo: users.filter(u => u.role === 'jefe_desarrollo').length,
        jefe_workforce: users.filter(u => u.role === 'jefe_workforce').length,
        desarrollador: users.filter(u => u.role === 'desarrollador').length,
        workforce: users.filter(u => u.role === 'workforce').length,
        disenador: users.filter(u => u.role === 'disenador').length
      }
    };

    return stats;
  }

  getAllowedRolesToCreate(currentRole) {
    const roleHierarchy = {
      'jefe_desarrollo': ['desarrollador', 'disenador'],
      'jefe_workforce': ['workforce'],
      'desarrollador': [],
      'workforce': [],
      'disenador': []
    };

    return roleHierarchy[currentRole] || [];
  }

  generateTemporaryPassword() {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }
}

module.exports = new UserService();