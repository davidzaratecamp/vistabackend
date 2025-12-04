const express = require('express');
const userController = require('../controllers/userController');
const { authenticateToken } = require('../middleware/auth');
const { validateUser, validateId } = require('../middleware/validation');

const router = express.Router();

router.use(authenticateToken);

// Get all users (with role-based filtering)
router.get('/', userController.getAllUsers);

// Get current user's team
router.get('/my-team', userController.getMyTeam);

// Get user statistics
router.get('/stats', userController.getUserStats);

// Get user by ID
router.get('/:id', validateId, userController.getUserById);

// Create new user (only coordinators and managers can create users)
router.post('/', validateUser, userController.createUser);

// Update user
router.put('/:id', validateId, userController.updateUser);

// Delete user (only coordinators and managers)
router.delete('/:id', validateId, userController.deleteUser);

module.exports = router;