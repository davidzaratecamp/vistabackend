const bcrypt = require('bcryptjs');
const { User } = require('./models');
const { sequelize } = require('./config/database');

async function createAdminUser() {
    try {
        // Connect to database
        await sequelize.authenticate();
        console.log('Database connection established.');

        // Sync models
        await sequelize.sync({ alter: true });
        console.log('Database synchronized.');

        // Check if admin already exists
        const existingAdmin = await User.findOne({
            where: { email: 'admin@vista.com' }
        });

        if (existingAdmin) {
            console.log('Admin user already exists!');
            console.log('Email:', existingAdmin.email);
            console.log('Name:', existingAdmin.firstName, existingAdmin.lastName);
            console.log('Role:', existingAdmin.role);
            console.log('Active:', existingAdmin.isActive);
            process.exit(0);
        }

        // Create admin user
        const hashedPassword = await bcrypt.hash('admin123', 12);

        const admin = await User.create({
            firstName: 'Admin',
            lastName: 'Sistema',
            email: 'admin@vista.com',
            password: hashedPassword,
            role: 'coordinador',
            isActive: true,
            managerId: null
        });

        console.log('✅ Admin user created successfully!');
        console.log('Email:', admin.email);
        console.log('Password: admin123');
        console.log('Role:', admin.role);
        console.log('\nYou can now login with these credentials.');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error creating admin user:', error);
        process.exit(1);
    }
}

createAdminUser();
