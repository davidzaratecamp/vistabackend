const reportService = require('../services/reportService');

class ReportController {
  async generateMonthlyReport(req, res) {
    try {
      const { year, month } = req.query;
      
      // Validate required parameters
      if (!year || !month) {
        return res.status(400).json({
          success: false,
          error: 'Year and month parameters are required'
        });
      }

      const yearNum = parseInt(year);
      const monthNum = parseInt(month);

      // Validate year and month ranges
      if (yearNum < 2020 || yearNum > new Date().getFullYear() + 1) {
        return res.status(400).json({
          success: false,
          error: 'Invalid year. Must be between 2020 and current year + 1'
        });
      }

      if (monthNum < 1 || monthNum > 12) {
        return res.status(400).json({
          success: false,
          error: 'Invalid month. Must be between 1 and 12'
        });
      }

      // Generate the Excel report
      const workbook = await reportService.generateMonthlyReport(
        yearNum, 
        monthNum, 
        req.user.id, 
        req.user.role
      );

      // Set response headers for file download
      const fileName = `VISTA_Reporte_${reportService.getMonthName(monthNum)}_${yearNum}.xlsx`;
      
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${fileName}"`
      );

      // Write the workbook to response
      await workbook.xlsx.write(res);
      res.end();

    } catch (error) {
      console.error('Generate monthly report error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Error generating report'
      });
    }
  }

  async getAvailableMonths(req, res) {
    try {
      // Get the range of available data for reports
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth() + 1;

      const availableMonths = [];
      
      // Generate last 12 months including current month
      for (let i = 11; i >= 0; i--) {
        const date = new Date(currentDate);
        date.setMonth(date.getMonth() - i);
        
        availableMonths.push({
          year: date.getFullYear(),
          month: date.getMonth() + 1,
          monthName: reportService.getMonthName(date.getMonth() + 1),
          label: `${reportService.getMonthName(date.getMonth() + 1)} ${date.getFullYear()}`,
          isCurrent: date.getFullYear() === currentYear && date.getMonth() + 1 === currentMonth
        });
      }

      res.status(200).json({
        success: true,
        data: {
          availableMonths,
          currentMonth: {
            year: currentYear,
            month: currentMonth,
            monthName: reportService.getMonthName(currentMonth)
          }
        }
      });

    } catch (error) {
      console.error('Get available months error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Error getting available months'
      });
    }
  }

  async getReportPreview(req, res) {
    try {
      const { year, month } = req.query;
      
      if (!year || !month) {
        return res.status(400).json({
          success: false,
          error: 'Year and month parameters are required'
        });
      }

      const yearNum = parseInt(year);
      const monthNum = parseInt(month);

      // Get date range for the month
      const startDate = new Date(yearNum, monthNum - 1, 1);
      const endDate = new Date(yearNum, monthNum, 0, 23, 59, 59);

      // Get preview data without generating full Excel
      const data = await reportService.getMonthlyData(
        startDate, 
        endDate, 
        req.user.id, 
        req.user.role
      );

      // Calculate summary statistics
      const totalTasks = data.tasks.length;
      const completedTasks = data.tasks.filter(t => t.status === 'completado').length;
      const inProgressTasks = data.tasks.filter(t => t.status === 'en_progreso').length;
      const pendingTasks = data.tasks.filter(t => t.status === 'pendiente').length;
      const totalProjects = data.projects.length;
      const activeProjects = data.projects.filter(p => p.status === 'activo').length;

      const summary = {
        period: {
          year: yearNum,
          month: monthNum,
          monthName: reportService.getMonthName(monthNum),
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0]
        },
        metrics: {
          totalUsers: data.users.length,
          totalProjects,
          activeProjects,
          totalTasks,
          completedTasks,
          inProgressTasks,
          pendingTasks,
          completionRate: totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(1) : 0
        },
        hasData: totalTasks > 0 || totalProjects > 0
      };

      res.status(200).json({
        success: true,
        data: summary
      });

    } catch (error) {
      console.error('Get report preview error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Error getting report preview'
      });
    }
  }
}

module.exports = new ReportController();