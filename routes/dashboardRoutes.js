const express = require('express');
const dashboardController = require('../controllers/dashboardController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);

router.get('/', dashboardController.getDashboard);
router.get('/tasks/filtered', dashboardController.getFilteredTasks);
router.get('/stats', dashboardController.getSummaryStats);
router.get('/activity', dashboardController.getRecentActivity);

module.exports = router;