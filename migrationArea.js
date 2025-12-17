require("dotenv").config();
const { sequelize } = require('./config/database');

async function addAreaColumns() {
    try {
        // Connect to database
        await sequelize.authenticate();
        console.log('Database connection established.');

        console.log('Adding area column to projects table...');
        try {
            await sequelize.query(`
                ALTER TABLE projects 
                ADD COLUMN area ENUM('desarrollo', 'workforce', 'tecnologia') 
                NOT NULL DEFAULT 'desarrollo'
            `);
        } catch (error) {
            if (error.message.includes('Duplicate column name')) {
                console.log('Area column already exists in projects table, skipping...');
            } else {
                throw error;
            }
        }

        console.log('Adding area column to tasks table...');
        try {
            await sequelize.query(`
                ALTER TABLE tasks 
                ADD COLUMN area ENUM('desarrollo', 'workforce', 'tecnologia') 
                NOT NULL DEFAULT 'desarrollo'
            `);
        } catch (error) {
            if (error.message.includes('Duplicate column name')) {
                console.log('Area column already exists in tasks table, skipping...');
            } else {
                throw error;
            }
        }

        console.log('Updating existing tasks to inherit area from their projects...');
        await sequelize.query(`
            UPDATE tasks 
            SET area = (
                SELECT projects.area 
                FROM projects 
                WHERE projects.id = tasks.projectId
            )
            WHERE tasks.area = 'desarrollo'
        `);

        console.log('✅ Migration completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error during migration:', error);
        process.exit(1);
    }
}

addAreaColumns();