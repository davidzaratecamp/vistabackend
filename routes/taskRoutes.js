const express = require('express');
const taskController = require('../controllers/taskController');
const { authenticateToken } = require('../middleware/auth');
const { validateTask, validateComment, validateId } = require('../middleware/validation');

const router = express.Router();

router.use(authenticateToken);

router.get('/', taskController.getAllTasks);
router.post('/', validateTask, taskController.createTask);
router.get('/my-tasks', taskController.getMyTasks);
router.get('/stats', taskController.getTaskStats);
router.get('/:id', validateId, taskController.getTaskById);
router.put('/:id', validateId, taskController.updateTask);
router.patch('/:id/status', validateId, taskController.updateTaskStatus);
router.delete('/:id', validateId, taskController.deleteTask);
router.post('/:id/comments', validateId, validateComment, taskController.addComment);
router.get('/:id/comments', validateId, taskController.getTaskComments);

module.exports = router;