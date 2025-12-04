const projectService = require('../services/projectService');

class ProjectController {
  async createProject(req, res) {
    try {
      const project = await projectService.createProject(req.body, req.user.id);
      
      res.status(201).json({
        success: true,
        message: 'Project created successfully',
        data: project
      });
    } catch (error) {
      console.error('Create project error:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  async getAllProjects(req, res) {
    try {
      const { status, priority, search } = req.query;
      const filters = { status, priority, search };
      
      const projects = await projectService.getAllProjects(req.user.id, req.user.role, filters);
      
      res.status(200).json({
        success: true,
        data: projects
      });
    } catch (error) {
      console.error('Get projects error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async getProjectById(req, res) {
    try {
      const project = await projectService.getProjectById(req.params.id, req.user.id);
      
      res.status(200).json({
        success: true,
        data: project
      });
    } catch (error) {
      console.error('Get project error:', error);
      res.status(404).json({
        success: false,
        error: error.message
      });
    }
  }

  async updateProject(req, res) {
    try {
      const project = await projectService.updateProject(req.params.id, req.body, req.user.id);
      
      res.status(200).json({
        success: true,
        message: 'Project updated successfully',
        data: project
      });
    } catch (error) {
      console.error('Update project error:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  async deleteProject(req, res) {
    try {
      const result = await projectService.deleteProject(req.params.id, req.user.id);
      
      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      console.error('Delete project error:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  async addMember(req, res) {
    try {
      const { userId, role } = req.body;
      const member = await projectService.addMemberToProject(req.params.id, req.user.id, userId, role);
      
      res.status(201).json({
        success: true,
        message: 'Member added successfully',
        data: member
      });
    } catch (error) {
      console.error('Add member error:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  async removeMember(req, res) {
    try {
      const { userId } = req.body;
      const result = await projectService.removeMemberFromProject(req.params.id, req.user.id, userId);
      
      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      console.error('Remove member error:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  async getProjectStats(req, res) {
    try {
      const stats = await projectService.getProjectStats(req.params.id);
      
      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Get project stats error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = new ProjectController();