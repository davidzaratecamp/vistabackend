const taskService = require('../services/taskService');

class TaskController {
  async createTask(req, res) {
    try {
      const task = await taskService.createTask(req.body, req.user.id);
      
      res.status(201).json({
        success: true,
        message: 'Task created successfully',
        data: task
      });
    } catch (error) {
      console.error('Create task error:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  async getAllTasks(req, res) {
    try {
      const { status, priority, projectId, assignedTo, search } = req.query;
      const filters = { status, priority, projectId, assignedTo, search };
      
      const tasks = await taskService.getAllTasks(req.user.id, req.user.role, filters);
      
      res.status(200).json({
        success: true,
        data: tasks
      });
    } catch (error) {
      console.error('Get tasks error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async getTaskById(req, res) {
    try {
      const task = await taskService.getTaskById(req.params.id, req.user.id);
      
      res.status(200).json({
        success: true,
        data: task
      });
    } catch (error) {
      console.error('Get task error:', error);
      res.status(404).json({
        success: false,
        error: error.message
      });
    }
  }

  async updateTask(req, res) {
    try {
      const task = await taskService.updateTask(req.params.id, req.body, req.user.id);
      
      res.status(200).json({
        success: true,
        message: 'Task updated successfully',
        data: task
      });
    } catch (error) {
      console.error('Update task error:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  async deleteTask(req, res) {
    try {
      const result = await taskService.deleteTask(req.params.id, req.user.id);
      
      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      console.error('Delete task error:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  async addComment(req, res) {
    try {
      const comment = await taskService.addComment(req.params.id, req.body, req.user.id);
      
      res.status(201).json({
        success: true,
        message: 'Comment added successfully',
        data: comment
      });
    } catch (error) {
      console.error('Add comment error:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  async getTaskComments(req, res) {
    try {
      const comments = await taskService.getTaskComments(req.params.id, req.user.id);
      
      res.status(200).json({
        success: true,
        data: comments
      });
    } catch (error) {
      console.error('Get comments error:', error);
      res.status(404).json({
        success: false,
        error: error.message
      });
    }
  }

  async getMyTasks(req, res) {
    try {
      const { status, priority } = req.query;
      const filters = { status, priority };
      
      const tasks = await taskService.getTasksByUser(req.user.id, filters);
      
      res.status(200).json({
        success: true,
        data: tasks
      });
    } catch (error) {
      console.error('Get my tasks error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async getTaskStats(req, res) {
    try {
      const { projectId } = req.query;
      const stats = await taskService.getTaskStats(req.user.id, projectId);
      
      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Get task stats error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async updateTaskStatus(req, res) {
    try {
      const { status } = req.body;
      const task = await taskService.updateTaskStatus(req.params.id, status, req.user.id);
      
      res.status(200).json({
        success: true,
        message: 'Task status updated successfully',
        data: task
      });
    } catch (error) {
      console.error('Update task status error:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = new TaskController();