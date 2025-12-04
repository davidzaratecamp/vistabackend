const userService = require('../services/userService');

class UserController {
  async getAllUsers(req, res) {
    try {
      const { role, managerId, search } = req.query;
      const filters = { role, managerId, search };
      
      const users = await userService.getAllUsers(req.user.id, req.user.role, filters);
      
      res.status(200).json({
        success: true,
        data: users
      });
    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async getUserById(req, res) {
    try {
      const user = await userService.getUserById(req.params.id, req.user.id, req.user.role);
      
      res.status(200).json({
        success: true,
        data: user
      });
    } catch (error) {
      console.error('Get user error:', error);
      res.status(404).json({
        success: false,
        error: error.message
      });
    }
  }

  async createUser(req, res) {
    try {
      const user = await userService.createUser(req.body, req.user.id, req.user.role);
      
      res.status(201).json({
        success: true,
        message: 'User created successfully',
        data: user
      });
    } catch (error) {
      console.error('Create user error:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  async updateUser(req, res) {
    try {
      const user = await userService.updateUser(req.params.id, req.body, req.user.id, req.user.role);
      
      res.status(200).json({
        success: true,
        message: 'User updated successfully',
        data: user
      });
    } catch (error) {
      console.error('Update user error:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  async deleteUser(req, res) {
    try {
      const result = await userService.deleteUser(req.params.id, req.user.id, req.user.role);
      
      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      console.error('Delete user error:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  async getMyTeam(req, res) {
    try {
      const team = await userService.getUsersUnderManager(req.user.id);
      
      res.status(200).json({
        success: true,
        data: team
      });
    } catch (error) {
      console.error('Get my team error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async getUserStats(req, res) {
    try {
      const stats = await userService.getUserStats(req.user.id, req.user.role);
      
      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Get user stats error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = new UserController();