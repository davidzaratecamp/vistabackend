require('dotenv').config();
const bcrypt = require('bcryptjs');
const { User } = require('./models');
const { sequelize } = require('./config/database');

async function createAndersonUser() {
    try {
        // Connect to database
        await sequelize.authenticate();
        console.log('Database connection established.');

        // Sync models
        await sequelize.sync({ alter: true });
        console.log('Database synchronized.');

        // Check if Anderson already exists
        const existingUser = await User.findOne({
            where: { email: 'anderson.zarate@vista.com' }
        });

        if (existingUser) {
            console.log('Anderson user already exists!');
            console.log('Email:', existingUser.email);
            console.log('Name:', existingUser.firstName, existingUser.lastName);
            console.log('Role:', existingUser.role);
            console.log('Active:', existingUser.isActive);
            
            // Update password if needed
            const isPasswordCorrect = await existingUser.comparePassword('anderson123');
            if (!isPasswordCorrect) {
                await existingUser.update({ password: 'anderson123' });
                console.log('Password updated for Anderson user');
            }
            
            process.exit(0);
        }

        // Create Anderson user
        const anderson = await User.create({
            firstName: 'Anderson',
            lastName: 'Zarate',
            email: 'anderson.zarate@vista.com',
            password: 'anderson123',
            role: 'jefe_desarrollo',
            isActive: true,
            managerId: null
        });

        console.log('✅ Anderson user created successfully!');
        console.log('Email:', anderson.email);
        console.log('Password: anderson123');
        console.log('Role:', anderson.role);
        console.log('\nYou can now login with these credentials.');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error creating Anderson user:', error);
        process.exit(1);
    }
}

createAndersonUser();