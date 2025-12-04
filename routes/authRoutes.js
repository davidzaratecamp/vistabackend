const express = require('express');
const authController = require('../controllers/authController');
const { authenticateToken, isJefe } = require('../middleware/auth');
const { validateLogin, validateRegister } = require('../middleware/validation');

const router = express.Router();

router.post('/login', validateLogin, authController.login);
router.post('/register', authenticateToken, isJefe, validateRegister, authController.register);
router.get('/profile', authenticateToken, authController.getProfile);
router.put('/profile', authenticateToken, authController.updateProfile);
router.put('/change-password', authenticateToken, authController.changePassword);
router.post('/logout', authenticateToken, authController.logout);

module.exports = router;