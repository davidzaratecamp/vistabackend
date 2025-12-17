const ExcelJS = require('exceljs');
const { User, Task, Project, ProjectMember } = require('../models');
const { Op } = require('sequelize');

class ReportService {
  async generateMonthlyReport(year, month, currentUserId, currentUserRole) {
    // Create workbook
    const workbook = new ExcelJS.Workbook();
    
    // Set workbook properties
    workbook.creator = 'VISTA - Sistema de Gestión de Proyectos';
    workbook.lastModifiedBy = 'Sistema VISTA';
    workbook.created = new Date();
    workbook.modified = new Date();

    // Get date range for the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    // Get all data for the month
    const data = await this.getMonthlyData(startDate, endDate, currentUserId, currentUserRole);

    // Create sheets
    await this.createExecutiveSummarySheet(workbook, data, year, month);
    await this.createWorkerPerformanceSheet(workbook, data);
    await this.createProjectsSheet(workbook, data);
    await this.createTasksSheet(workbook, data);
    await this.createAreaMetricsSheet(workbook, data);
    await this.createTimelineSheet(workbook, data, startDate, endDate);

    return workbook;
  }

  async getMonthlyData(startDate, endDate, currentUserId, currentUserRole) {
    // Apply area restrictions based on user role
    let userWhereClause = {};
    if (currentUserRole === 'jefe_desarrollo') {
      userWhereClause.role = { [Op.in]: ['jefe_desarrollo', 'desarrollador', 'disenador'] };
    } else if (currentUserRole === 'jefe_workforce') {
      userWhereClause.role = { [Op.in]: ['jefe_workforce', 'workforce'] };
    }

    // Get users within the user's scope
    const users = await User.findAll({
      where: userWhereClause,
      attributes: ['id', 'firstName', 'lastName', 'email', 'role', 'createdAt']
    });

    const userIds = users.map(u => u.id);

    // Get tasks created or updated in the month
    const tasks = await Task.findAll({
      where: {
        [Op.or]: [
          { createdAt: { [Op.between]: [startDate, endDate] } },
          { updatedAt: { [Op.between]: [startDate, endDate] } },
          { completedDate: { [Op.between]: [startDate, endDate] } }
        ],
        [Op.or]: [
          { createdBy: { [Op.in]: userIds } },
          { assignedTo: { [Op.in]: userIds } }
        ]
      },
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'role']
        },
        {
          model: User,
          as: 'assignee',
          attributes: ['id', 'firstName', 'lastName', 'role']
        },
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name', 'status']
        }
      ]
    });

    // Get all projects that are active or had activity in the month
    const projects = await Project.findAll({
      where: {
        [Op.or]: [
          { createdAt: { [Op.between]: [startDate, endDate] } },
          { updatedAt: { [Op.between]: [startDate, endDate] } },
          { status: 'activo' } // Include all active projects regardless of dates
        ]
      },
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'role']
        },
        {
          model: User,
          as: 'members',
          through: {
            attributes: ['role', 'joinedAt']
          },
          attributes: ['id', 'firstName', 'lastName', 'role']
        }
      ]
    });

    // Filter projects to only include those where the user has access
    const accessibleProjects = projects.filter(project => {
      const hasAccessibleMembers = project.members.some(member => 
        userIds.includes(member.id)
      );
      const isCreator = userIds.includes(project.createdBy);
      return hasAccessibleMembers || isCreator;
    });

    return {
      users,
      tasks,
      projects: accessibleProjects,
      dateRange: { start: startDate, end: endDate }
    };
  }

  async createExecutiveSummarySheet(workbook, data, year, month) {
    const sheet = workbook.addWorksheet('📊 Resumen Ejecutivo', {
      properties: { tabColor: { argb: 'FF1F4E79' } }
    });

    // Header styling
    const headerStyle = {
      font: { name: 'Segoe UI', size: 16, bold: true, color: { argb: 'FFFFFFFF' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E79' } },
      alignment: { horizontal: 'center', vertical: 'middle' },
      border: {
        top: { style: 'thin' }, left: { style: 'thin' }, 
        bottom: { style: 'thin' }, right: { style: 'thin' }
      }
    };

    const subHeaderStyle = {
      font: { name: 'Segoe UI', size: 12, bold: true, color: { argb: 'FF1F4E79' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F4FD' } },
      alignment: { horizontal: 'center', vertical: 'middle' }
    };

    // Title
    sheet.mergeCells('A1:F1');
    sheet.getCell('A1').value = `REPORTE MENSUAL - ${this.getMonthName(month)} ${year}`;
    sheet.getCell('A1').style = headerStyle;
    sheet.getRow(1).height = 30;

    // Company info
    sheet.mergeCells('A2:F2');
    sheet.getCell('A2').value = 'VISTA - Sistema de Gestión de Proyectos';
    sheet.getCell('A2').style = { 
      font: { name: 'Segoe UI', size: 12, italic: true },
      alignment: { horizontal: 'center' }
    };

    // Subtitle explaining the scope
    sheet.mergeCells('A3:F3');
    sheet.getCell('A3').value = `Incluye: Proyectos activos y actividad del período seleccionado`;
    sheet.getCell('A3').style = { 
      font: { name: 'Segoe UI', size: 10, color: { argb: 'FF666666' } },
      alignment: { horizontal: 'center' }
    };

    // Metrics
    const totalTasks = data.tasks.length;
    const completedTasks = data.tasks.filter(t => t.status === 'completado').length;
    const inProgressTasks = data.tasks.filter(t => t.status === 'en_progreso').length;
    const pendingTasks = data.tasks.filter(t => t.status === 'pendiente').length;
    const totalProjects = data.projects.length;
    const activeProjects = data.projects.filter(p => p.status === 'activo').length;

    // KPIs section
    sheet.getCell('A5').value = '📊 INDICADORES CLAVE';
    sheet.getCell('A5').style = subHeaderStyle;
    sheet.mergeCells('A5:B5');

    const kpis = [
      ['Total de Tareas:', totalTasks],
      ['✅ Completadas:', completedTasks],
      ['⚡ En Progreso:', inProgressTasks],
      ['📋 Pendientes:', pendingTasks],
      ['📁 Total Proyectos:', totalProjects],
      ['🟢 Proyectos Activos:', activeProjects],
      ['👥 Personal Activo:', data.users.length],
      ['📈 Tasa de Finalización:', `${totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(1) : 0}%`]
    ];

    kpis.forEach((kpi, index) => {
      const rowNum = 6 + index;
      sheet.getCell(`A${rowNum}`).value = kpi[0];
      sheet.getCell(`B${rowNum}`).value = kpi[1];
      
      sheet.getCell(`A${rowNum}`).style = { 
        font: { name: 'Segoe UI', size: 11, bold: true },
        alignment: { horizontal: 'right' }
      };
      sheet.getCell(`B${rowNum}`).style = { 
        font: { name: 'Segoe UI', size: 11 },
        alignment: { horizontal: 'left' }
      };
    });

    // Top performers
    const workerStats = this.calculateWorkerStats(data);
    
    sheet.getCell('D5').value = '🏆 MEJORES RENDIMIENTOS';
    sheet.getCell('D5').style = subHeaderStyle;
    sheet.mergeCells('D5:F5');

    sheet.getCell('D6').value = 'Trabajador';
    sheet.getCell('E6').value = 'Tareas Completadas';
    sheet.getCell('F6').value = 'Proyectos Activos';

    ['D6', 'E6', 'F6'].forEach(cell => {
      sheet.getCell(cell).style = {
        font: { name: 'Segoe UI', size: 10, bold: true },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F4FD' } },
        alignment: { horizontal: 'center' }
      };
    });

    const topPerformers = workerStats
      .sort((a, b) => b.completedTasks - a.completedTasks)
      .slice(0, 5);

    topPerformers.forEach((worker, index) => {
      const rowNum = 7 + index;
      sheet.getCell(`D${rowNum}`).value = worker.name;
      sheet.getCell(`E${rowNum}`).value = worker.completedTasks;
      sheet.getCell(`F${rowNum}`).value = worker.activeProjects;
    });

    // Column widths
    sheet.columns = [
      { width: 25 }, { width: 15 }, { width: 5 }, 
      { width: 25 }, { width: 18 }, { width: 18 }
    ];
  }

  async createWorkerPerformanceSheet(workbook, data) {
    const sheet = workbook.addWorksheet('👥 Rendimiento por Trabajador', {
      properties: { tabColor: { argb: 'FF28A745' } }
    });

    // Headers
    const headers = [
      'Trabajador', 'Área', 'Tareas Asignadas', 'Completadas', 
      'En Progreso', 'Pendientes', '% Finalización', 
      'Proyectos Participando', 'Última Actividad'
    ];

    headers.forEach((header, index) => {
      const cell = sheet.getCell(1, index + 1);
      cell.value = header;
      cell.style = {
        font: { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFFFFFFF' } },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF28A745' } },
        alignment: { horizontal: 'center', vertical: 'middle' },
        border: {
          top: { style: 'thin' }, left: { style: 'thin' }, 
          bottom: { style: 'thin' }, right: { style: 'thin' }
        }
      };
    });

    // Worker data
    const workerStats = this.calculateWorkerStats(data);

    workerStats.forEach((worker, index) => {
      const rowNum = index + 2;
      const completionRate = worker.totalTasks > 0 ? 
        ((worker.completedTasks / worker.totalTasks) * 100).toFixed(1) : 0;

      const rowData = [
        worker.name,
        worker.area,
        worker.totalTasks,
        worker.completedTasks,
        worker.inProgressTasks,
        worker.pendingTasks,
        `${completionRate}%`,
        worker.activeProjects,
        worker.lastActivity
      ];

      rowData.forEach((value, colIndex) => {
        const cell = sheet.getCell(rowNum, colIndex + 1);
        cell.value = value;
        cell.style = {
          font: { name: 'Segoe UI', size: 10 },
          alignment: { horizontal: 'center', vertical: 'middle' },
          border: {
            top: { style: 'thin' }, left: { style: 'thin' }, 
            bottom: { style: 'thin' }, right: { style: 'thin' }
          }
        };

        // Color coding for completion rate
        if (colIndex === 6) { // % Finalización column
          const rate = parseFloat(completionRate);
          if (rate >= 80) {
            cell.style.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD4EDDA' } };
          } else if (rate >= 60) {
            cell.style.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFEAA7' } };
          } else {
            cell.style.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8D7DA' } };
          }
        }
      });
    });

    // Column widths
    sheet.columns = [
      { width: 25 }, { width: 15 }, { width: 15 }, { width: 12 },
      { width: 12 }, { width: 12 }, { width: 15 }, { width: 20 }, { width: 18 }
    ];

    // Freeze first row
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
  }

  calculateWorkerStats(data) {
    return data.users.map(user => {
      const userTasks = data.tasks.filter(task => 
        task.assignedTo === user.id || task.createdBy === user.id
      );

      const completedTasks = userTasks.filter(t => t.status === 'completado').length;
      const inProgressTasks = userTasks.filter(t => t.status === 'en_progreso').length;
      const pendingTasks = userTasks.filter(t => t.status === 'pendiente').length;

      const userProjects = data.projects.filter(project => 
        project.members.some(member => member.id === user.id) ||
        project.createdBy === user.id
      );

      const lastTask = userTasks
        .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))[0];
      
      const lastActivity = lastTask ? 
        new Date(lastTask.updatedAt).toLocaleDateString() : 'Sin actividad';

      const area = user.role === 'jefe_desarrollo' || user.role === 'desarrollador' || user.role === 'disenador' ? 
        'Desarrollo' : 'Workforce';

      return {
        name: `${user.firstName} ${user.lastName}`,
        area,
        totalTasks: userTasks.length,
        completedTasks,
        inProgressTasks,
        pendingTasks,
        activeProjects: userProjects.length,
        lastActivity
      };
    });
  }

  async createProjectsSheet(workbook, data) {
    const sheet = workbook.addWorksheet('📁 Proyectos', {
      properties: { tabColor: { argb: 'FF6F42C1' } }
    });

    const headers = [
      'Proyecto', 'Estado', 'Prioridad', 'Creador', 'Miembros', 
      'Tareas Totales', 'Completadas', 'En Progreso', 
      'Fecha Creación', 'Última Actualización'
    ];

    // Header styling
    headers.forEach((header, index) => {
      const cell = sheet.getCell(1, index + 1);
      cell.value = header;
      cell.style = {
        font: { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFFFFFFF' } },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6F42C1' } },
        alignment: { horizontal: 'center', vertical: 'middle' },
        border: {
          top: { style: 'thin' }, left: { style: 'thin' }, 
          bottom: { style: 'thin' }, right: { style: 'thin' }
        }
      };
    });

    // Project data
    data.projects.forEach((project, index) => {
      const rowNum = index + 2;
      const projectTasks = data.tasks.filter(t => t.projectId === project.id);
      const completedTasks = projectTasks.filter(t => t.status === 'completado').length;
      const inProgressTasks = projectTasks.filter(t => t.status === 'en_progreso').length;

      const memberNames = project.members.map(m => 
        `${m.firstName} ${m.lastName}`
      ).join(', ');

      const rowData = [
        project.name,
        this.getStatusEmoji(project.status) + ' ' + project.status,
        this.getPriorityEmoji(project.priority) + ' ' + project.priority,
        project.creator ? `${project.creator.firstName} ${project.creator.lastName}` : 'N/A',
        memberNames || 'Sin miembros',
        projectTasks.length,
        completedTasks,
        inProgressTasks,
        new Date(project.createdAt).toLocaleDateString(),
        new Date(project.updatedAt).toLocaleDateString()
      ];

      rowData.forEach((value, colIndex) => {
        const cell = sheet.getCell(rowNum, colIndex + 1);
        cell.value = value;
        cell.style = {
          font: { name: 'Segoe UI', size: 10 },
          alignment: { horizontal: colIndex <= 4 ? 'left' : 'center', vertical: 'middle' },
          border: {
            top: { style: 'thin' }, left: { style: 'thin' }, 
            bottom: { style: 'thin' }, right: { style: 'thin' }
          }
        };

        // Status color coding
        if (colIndex === 1) { // Status column
          const statusColors = {
            'activo': { argb: 'FFD4EDDA' },
            'en_pausa': { argb: 'FFFFEAA7' },
            'terminado': { argb: 'FFE2E3E5' }
          };
          const color = statusColors[project.status];
          if (color) {
            cell.style.fill = { type: 'pattern', pattern: 'solid', fgColor: color };
          }
        }
      });
    });

    // Column widths
    sheet.columns = [
      { width: 25 }, { width: 15 }, { width: 12 }, { width: 20 },
      { width: 30 }, { width: 12 }, { width: 12 }, { width: 12 },
      { width: 15 }, { width: 18 }
    ];

    sheet.views = [{ state: 'frozen', ySplit: 1 }];
  }

  async createTasksSheet(workbook, data) {
    const sheet = workbook.addWorksheet('✅ Tareas Detalladas', {
      properties: { tabColor: { argb: 'FFDC3545' } }
    });

    const headers = [
      'Tarea', 'Proyecto', 'Asignado a', 'Creado por', 'Estado', 
      'Prioridad', 'Fecha Estimada', 'Fecha Completada', 
      'Días en Progreso', 'Descripción'
    ];

    // Header styling
    headers.forEach((header, index) => {
      const cell = sheet.getCell(1, index + 1);
      cell.value = header;
      cell.style = {
        font: { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFFFFFFF' } },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDC3545' } },
        alignment: { horizontal: 'center', vertical: 'middle' },
        border: {
          top: { style: 'thin' }, left: { style: 'thin' }, 
          bottom: { style: 'thin' }, right: { style: 'thin' }
        }
      };
    });

    // Task data
    data.tasks.forEach((task, index) => {
      const rowNum = index + 2;
      
      const daysInProgress = task.createdAt ? 
        Math.ceil((new Date() - new Date(task.createdAt)) / (1000 * 60 * 60 * 24)) : 0;

      const rowData = [
        task.title,
        task.project?.name || 'Sin proyecto',
        task.assignee ? `${task.assignee.firstName} ${task.assignee.lastName}` : 'Sin asignar',
        task.creator ? `${task.creator.firstName} ${task.creator.lastName}` : 'N/A',
        this.getStatusEmoji(task.status) + ' ' + task.status,
        this.getPriorityEmoji(task.priority) + ' ' + task.priority,
        task.estimatedDate ? new Date(task.estimatedDate).toLocaleDateString() : 'No definida',
        task.completedDate ? new Date(task.completedDate).toLocaleDateString() : '-',
        daysInProgress,
        task.description || 'Sin descripción'
      ];

      rowData.forEach((value, colIndex) => {
        const cell = sheet.getCell(rowNum, colIndex + 1);
        cell.value = value;
        cell.style = {
          font: { name: 'Segoe UI', size: 10 },
          alignment: { 
            horizontal: colIndex <= 5 ? 'left' : 'center', 
            vertical: 'middle' 
          },
          border: {
            top: { style: 'thin' }, left: { style: 'thin' }, 
            bottom: { style: 'thin' }, right: { style: 'thin' }
          }
        };

        // Status and priority color coding
        if (colIndex === 4) { // Status
          const statusColors = {
            'completado': { argb: 'FFD4EDDA' },
            'en_progreso': { argb: 'FFD1ECF1' },
            'pendiente': { argb: 'FFFFEAA7' }
          };
          const color = statusColors[task.status];
          if (color) {
            cell.style.fill = { type: 'pattern', pattern: 'solid', fgColor: color };
          }
        } else if (colIndex === 5) { // Priority
          const priorityColors = {
            'critica': { argb: 'FFF8D7DA' },
            'alta': { argb: 'FFFDEAA7' },
            'media': { argb: 'FFD1ECF1' },
            'baja': { argb: 'FFE2E3E5' }
          };
          const color = priorityColors[task.priority];
          if (color) {
            cell.style.fill = { type: 'pattern', pattern: 'solid', fgColor: color };
          }
        }
      });
    });

    // Column widths
    sheet.columns = [
      { width: 30 }, { width: 20 }, { width: 20 }, { width: 20 },
      { width: 15 }, { width: 12 }, { width: 15 }, { width: 15 },
      { width: 12 }, { width: 40 }
    ];

    sheet.views = [{ state: 'frozen', ySplit: 1 }];
  }

  async createAreaMetricsSheet(workbook, data) {
    const sheet = workbook.addWorksheet('📈 Métricas por Área', {
      properties: { tabColor: { argb: 'FFFD7E14' } }
    });

    // Area comparison
    const developmentUsers = data.users.filter(u => 
      u.role === 'jefe_desarrollo' || u.role === 'desarrollador' || u.role === 'disenador'
    );
    const workforceUsers = data.users.filter(u => 
      u.role === 'jefe_workforce' || u.role === 'workforce'
    );

    const developmentTasks = data.tasks.filter(t => 
      developmentUsers.some(u => u.id === t.assignedTo || u.id === t.createdBy)
    );
    const workforceTasks = data.tasks.filter(t => 
      workforceUsers.some(u => u.id === t.assignedTo || u.id === t.createdBy)
    );

    // Title
    sheet.mergeCells('A1:E1');
    sheet.getCell('A1').value = '📈 COMPARACIÓN POR ÁREAS';
    sheet.getCell('A1').style = {
      font: { name: 'Segoe UI', size: 16, bold: true, color: { argb: 'FFFFFFFF' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFD7E14' } },
      alignment: { horizontal: 'center', vertical: 'middle' }
    };

    // Headers
    const headers = ['Métrica', 'Desarrollo', 'Workforce', 'Total', 'Diferencia'];
    headers.forEach((header, index) => {
      const cell = sheet.getCell(3, index + 1);
      cell.value = header;
      cell.style = {
        font: { name: 'Segoe UI', size: 12, bold: true },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F4FD' } },
        alignment: { horizontal: 'center', vertical: 'middle' },
        border: {
          top: { style: 'thin' }, left: { style: 'thin' }, 
          bottom: { style: 'thin' }, right: { style: 'thin' }
        }
      };
    });

    // Metrics
    const metrics = [
      {
        name: '👥 Personal',
        dev: developmentUsers.length,
        wf: workforceUsers.length
      },
      {
        name: '📋 Total Tareas',
        dev: developmentTasks.length,
        wf: workforceTasks.length
      },
      {
        name: '✅ Tareas Completadas',
        dev: developmentTasks.filter(t => t.status === 'completado').length,
        wf: workforceTasks.filter(t => t.status === 'completado').length
      },
      {
        name: '⚡ En Progreso',
        dev: developmentTasks.filter(t => t.status === 'en_progreso').length,
        wf: workforceTasks.filter(t => t.status === 'en_progreso').length
      },
      {
        name: '📈 Tasa Completadas (%)',
        dev: developmentTasks.length > 0 ? 
          ((developmentTasks.filter(t => t.status === 'completado').length / developmentTasks.length) * 100).toFixed(1) : 0,
        wf: workforceTasks.length > 0 ? 
          ((workforceTasks.filter(t => t.status === 'completado').length / workforceTasks.length) * 100).toFixed(1) : 0
      }
    ];

    metrics.forEach((metric, index) => {
      const rowNum = 4 + index;
      const total = typeof metric.dev === 'string' ? 
        parseFloat(metric.dev) + parseFloat(metric.wf) : 
        metric.dev + metric.wf;
      const diff = Math.abs(metric.dev - metric.wf);

      sheet.getCell(rowNum, 1).value = metric.name;
      sheet.getCell(rowNum, 2).value = metric.dev;
      sheet.getCell(rowNum, 3).value = metric.wf;
      sheet.getCell(rowNum, 4).value = typeof metric.dev === 'string' ? 
        total.toFixed(1) + '%' : total;
      sheet.getCell(rowNum, 5).value = typeof metric.dev === 'string' ? 
        diff.toFixed(1) + '%' : diff;

      // Styling
      for (let col = 1; col <= 5; col++) {
        sheet.getCell(rowNum, col).style = {
          font: { name: 'Segoe UI', size: 11 },
          alignment: { horizontal: col === 1 ? 'left' : 'center', vertical: 'middle' },
          border: {
            top: { style: 'thin' }, left: { style: 'thin' }, 
            bottom: { style: 'thin' }, right: { style: 'thin' }
          }
        };
      }
    });

    // Column widths
    sheet.columns = [
      { width: 25 }, { width: 15 }, { width: 15 }, { width: 15 }, { width: 15 }
    ];
  }

  async createTimelineSheet(workbook, data, startDate, endDate) {
    const sheet = workbook.addWorksheet('📅 Cronología', {
      properties: { tabColor: { argb: 'FF20C997' } }
    });

    // Title
    sheet.mergeCells('A1:E1');
    sheet.getCell('A1').value = '📅 CRONOLOGÍA DE ACTIVIDADES';
    sheet.getCell('A1').style = {
      font: { name: 'Segoe UI', size: 16, bold: true, color: { argb: 'FFFFFFFF' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF20C997' } },
      alignment: { horizontal: 'center', vertical: 'middle' }
    };

    // Headers
    const headers = ['Fecha', 'Tipo', 'Elemento', 'Acción', 'Usuario'];
    headers.forEach((header, index) => {
      const cell = sheet.getCell(3, index + 1);
      cell.value = header;
      cell.style = {
        font: { name: 'Segoe UI', size: 12, bold: true },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F4FD' } },
        alignment: { horizontal: 'center', vertical: 'middle' },
        border: {
          top: { style: 'thin' }, left: { style: 'thin' }, 
          bottom: { style: 'thin' }, right: { style: 'thin' }
        }
      };
    });

    // Create timeline events
    const events = [];

    // Task events
    data.tasks.forEach(task => {
      if (task.createdAt >= startDate && task.createdAt <= endDate) {
        events.push({
          date: task.createdAt,
          type: '📋 Tarea',
          element: task.title,
          action: 'Creada',
          user: task.creator ? `${task.creator.firstName} ${task.creator.lastName}` : 'Sistema'
        });
      }

      if (task.completedDate && task.completedDate >= startDate && task.completedDate <= endDate) {
        events.push({
          date: task.completedDate,
          type: '✅ Tarea',
          element: task.title,
          action: 'Completada',
          user: task.assignee ? `${task.assignee.firstName} ${task.assignee.lastName}` : 'N/A'
        });
      }
    });

    // Project events
    data.projects.forEach(project => {
      if (project.createdAt >= startDate && project.createdAt <= endDate) {
        events.push({
          date: project.createdAt,
          type: '📁 Proyecto',
          element: project.name,
          action: 'Creado',
          user: project.creator ? `${project.creator.firstName} ${project.creator.lastName}` : 'Sistema'
        });
      }
    });

    // Sort events by date
    events.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Add events to sheet
    events.forEach((event, index) => {
      const rowNum = 4 + index;

      const rowData = [
        new Date(event.date).toLocaleDateString(),
        event.type,
        event.element,
        event.action,
        event.user
      ];

      rowData.forEach((value, colIndex) => {
        const cell = sheet.getCell(rowNum, colIndex + 1);
        cell.value = value;
        cell.style = {
          font: { name: 'Segoe UI', size: 10 },
          alignment: { horizontal: 'center', vertical: 'middle' },
          border: {
            top: { style: 'thin' }, left: { style: 'thin' }, 
            bottom: { style: 'thin' }, right: { style: 'thin' }
          }
        };

        // Alternate row colors
        if (index % 2 === 0) {
          cell.style.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F9FA' } };
        }
      });
    });

    // Column widths
    sheet.columns = [
      { width: 15 }, { width: 15 }, { width: 30 }, { width: 15 }, { width: 25 }
    ];

    sheet.views = [{ state: 'frozen', ySplit: 3 }];
  }

  getMonthName(month) {
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return months[month - 1];
  }

  getStatusEmoji(status) {
    const emojis = {
      'completado': '✅',
      'en_progreso': '⚡',
      'pendiente': '📋',
      'activo': '🟢',
      'en_pausa': '⏸️',
      'terminado': '✅'
    };
    return emojis[status] || '📋';
  }

  getPriorityEmoji(priority) {
    const emojis = {
      'critica': '🔴',
      'alta': '🟠',
      'media': '🟡',
      'baja': '🟢'
    };
    return emojis[priority] || '🟡';
  }
}

module.exports = new ReportService();