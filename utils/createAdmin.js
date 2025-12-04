require('dotenv').config();
const bcrypt = require('bcryptjs');
const { sequelize } = require('../config/database');
const { User } = require('../models');

const createAdminUser = async () => {
  try {
    // Conectar a la base de datos
    await sequelize.authenticate();
    console.log('Database connection established.');

    // Verificar si ya existe un usuario admin
    const existingAdmin = await User.findOne({
      where: { email: 'admin@vista.com' }
    });

    if (existingAdmin) {
      console.log('Admin user already exists!');
      process.exit(0);
    }

    // Crear el usuario administrador
    const adminUser = await User.create({
      firstName: 'Admin',
      lastName: 'Sistema',
      email: 'admin@vista.com',
      password: 'admin123', // Será encriptado automáticamente por el hook
      role: 'coordinador',
      isActive: true
    });

    console.log('Admin user created successfully!');
    console.log('Email: admin@vista.com');
    console.log('Password: admin123');
    console.log('Role: coordinador');

    process.exit(0);
  } catch (error) {
    console.error('Error creating admin user:', error);
    process.exit(1);
  }
};

createAdminUser();