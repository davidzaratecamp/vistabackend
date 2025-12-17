const { body, param, query, validationResult } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

const validateLogin = [
  body('email')
    .isEmail()
    .withMessage('Email must be valid'),
  body('password')
    .isLength({ min: 1 })
    .withMessage('Password is required'),
  handleValidationErrors
];

const validateRegister = [
  body('email')
    .isEmail()
    .withMessage('Email must be valid'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('firstName')
    .notEmpty()
    .withMessage('First name is required'),
  body('lastName')
    .notEmpty()
    .withMessage('Last name is required'),
  body('role')
    .isIn(['jefe_desarrollo', 'jefe_workforce', 'desarrollador', 'workforce', 'disenador'])
    .withMessage('Role must be one of: jefe_desarrollo, jefe_workforce, desarrollador, workforce, disenador'),
  handleValidationErrors
];

const validateUser = [
  body('email')
    .isEmail()
    .withMessage('Email must be valid'),
  body('password')
    .optional()
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('firstName')
    .notEmpty()
    .withMessage('First name is required'),
  body('lastName')
    .notEmpty()
    .withMessage('Last name is required'),
  body('role')
    .isIn(['jefe_desarrollo', 'jefe_workforce', 'desarrollador', 'workforce', 'disenador'])
    .withMessage('Role must be one of: jefe_desarrollo, jefe_workforce, desarrollador, workforce, disenador'),
  body('managerId')
    .optional({ nullable: true })
    .if(body('managerId').exists())
    .isInt({ min: 1 })
    .withMessage('Manager ID must be a valid integer'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
  handleValidationErrors
];

const validateProject = [
  body('name')
    .notEmpty()
    .withMessage('Project name is required')
    .isLength({ max: 255 })
    .withMessage('Project name must not exceed 255 characters'),
  body('description')
    .optional()
    .isLength({ max: 5000 })
    .withMessage('Description must not exceed 5000 characters'),
  body('status')
    .optional()
    .isIn(['activo', 'en_pausa', 'terminado'])
    .withMessage('Status must be one of: activo, en_pausa, terminado'),
  body('priority')
    .optional()
    .isIn(['baja', 'media', 'alta', 'critica'])
    .withMessage('Priority must be one of: baja, media, alta, critica'),
  body('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid date'),
  body('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid date'),
  handleValidationErrors
];

const validateTask = [
  body('title')
    .notEmpty()
    .withMessage('Task title is required')
    .isLength({ max: 255 })
    .withMessage('Task title must not exceed 255 characters'),
  body('description')
    .optional()
    .isLength({ max: 5000 })
    .withMessage('Description must not exceed 5000 characters'),
  body('status')
    .optional()
    .isIn(['pendiente', 'en_progreso', 'completado'])
    .withMessage('Status must be one of: pendiente, en_progreso, completado'),
  body('priority')
    .optional()
    .isIn(['baja', 'media', 'alta', 'critica'])
    .withMessage('Priority must be one of: baja, media, alta, critica'),
  body('estimatedDate')
    .optional({ nullable: true })
    .if(body('estimatedDate').exists())
    .isISO8601()
    .withMessage('Estimated date must be a valid date'),
  body('projectId')
    .isInt({ min: 1 })
    .withMessage('Project ID must be a valid integer'),
  body('assignedTo')
    .optional({ nullable: true })
    .if(body('assignedTo').exists())
    .isInt({ min: 1 })
    .withMessage('Assigned user ID must be a valid integer'),
  handleValidationErrors
];

const validateComment = [
  body('comment')
    .notEmpty()
    .withMessage('Comment is required')
    .isLength({ max: 2000 })
    .withMessage('Comment must not exceed 2000 characters'),
  handleValidationErrors
];

const validateId = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID must be a valid integer'),
  handleValidationErrors
];

module.exports = {
  validateLogin,
  validateRegister,
  validateUser,
  validateProject,
  validateTask,
  validateComment,
  validateId,
  handleValidationErrors
};