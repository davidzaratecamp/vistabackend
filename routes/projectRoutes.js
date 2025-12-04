const express = require('express');
const projectController = require('../controllers/projectController');
const { authenticateToken, isJefeOrDeveloper } = require('../middleware/auth');
const { validateProject, validateId } = require('../middleware/validation');

const router = express.Router();

router.use(authenticateToken);

router.get('/', projectController.getAllProjects);
router.post('/', isJefeOrDeveloper, validateProject, projectController.createProject);
router.get('/:id', validateId, projectController.getProjectById);
router.put('/:id', validateId, validateProject, projectController.updateProject);
router.delete('/:id', validateId, projectController.deleteProject);
router.post('/:id/members', validateId, projectController.addMember);
router.delete('/:id/members', validateId, projectController.removeMember);
router.get('/:id/stats', validateId, projectController.getProjectStats);

module.exports = router;