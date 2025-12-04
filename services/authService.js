const jwt = require('jsonwebtoken');
const { User } = require('../models');

class AuthService {
  generateToken(userId) {
    return jwt.sign(
      { userId },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
  }

  async login(email, password) {
    const user = await User.findOne({
      where: { email, isActive: true }
    });

    if (!user || !(await user.comparePassword(password))) {
      throw new Error('Invalid credentials');
    }

    const token = this.generateToken(user.id);
    return { user, token };
  }

  async register(userData) {
    const existingUser = await User.findOne({
      where: { email: userData.email }
    });

    if (existingUser) {
      throw new Error('Email already registered');
    }

    const user = await User.create(userData);
    const token = this.generateToken(user.id);
    return { user, token };
  }

  async getUserProfile(userId) {
    const user = await User.findByPk(userId);
    if (!user || !user.isActive) {
      throw new Error('User not found');
    }
    return user;
  }

  async updateUserProfile(userId, updateData) {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const allowedFields = ['firstName', 'lastName'];
    const filteredData = {};
    
    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        filteredData[field] = updateData[field];
      }
    });

    await user.update(filteredData);
    return user;
  }

  async changePassword(userId, currentPassword, newPassword) {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (!(await user.comparePassword(currentPassword))) {
      throw new Error('Current password is incorrect');
    }

    await user.update({ password: newPassword });
    return user;
  }
}

module.exports = new AuthService();