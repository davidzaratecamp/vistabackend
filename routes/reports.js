const express = require('express');
const reportController = require('../controllers/reportController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Middleware: all routes require authentication and department head roles
router.use(authenticateToken);
router.use((req, res, next) => {
  if (req.user.role !== 'jefe_desarrollo' && req.user.role !== 'jefe_workforce') {
    return res.status(403).json({
      success: false,
      error: 'Access denied. Only department heads can generate reports.'
    });
  }
  next();
});

// GET /api/reports/monthly - Generate and download monthly Excel report
router.get('/monthly', reportController.generateMonthlyReport);

// GET /api/reports/available-months - Get list of available months for reports
router.get('/available-months', reportController.getAvailableMonths);

// GET /api/reports/preview - Get report preview/summary without generating Excel
router.get('/preview', reportController.getReportPreview);

module.exports = router;