const dashboardService = require('../services/dashboardService');

class DashboardController {
  async getDashboard(req, res) {
    try {
      const dashboardData = await dashboardService.getDashboardData(req.user.id, req.user.role);
      
      res.status(200).json({
        success: true,
        data: dashboardData
      });
    } catch (error) {
      console.error('Dashboard error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async getFilteredTasks(req, res) {
    try {
      const { status, priority, projectId, assignedTo, dateFrom, dateTo } = req.query;
      const filters = { status, priority, projectId, assignedTo, dateFrom, dateTo };
      
      const tasks = await dashboardService.getFilteredTasks(req.user.id, req.user.role, filters);
      
      res.status(200).json({
        success: true,
        data: tasks
      });
    } catch (error) {
      console.error('Filtered tasks error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async getSummaryStats(req, res) {
    try {
      const stats = await dashboardService.getSummaryStats(req.user.id, req.user.role);
      
      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Summary stats error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async getRecentActivity(req, res) {
    try {
      const { limit } = req.query;
      const activity = await dashboardService.getRecentActivity(req.user.id, req.user.role, limit ? parseInt(limit) : 15);
      
      res.status(200).json({
        success: true,
        data: activity
      });
    } catch (error) {
      console.error('Recent activity error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = new DashboardController();