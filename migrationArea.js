require("dotenv").config();
const { sequelize } = require('./config/database');

async function addAreaColumns() {
    try {
        // Connect to database
        await sequelize.authenticate();
        console.log('Database connection established.');

        console.log('Adding area column to projects table...');
        await sequelize.query(`
            ALTER TABLE projects 
            ADD COLUMN IF NOT EXISTS area ENUM('desarrollo', 'workforce') 
            NOT NULL DEFAULT 'desarrollo'
        `);

        console.log('Adding area column to tasks table...');
        await sequelize.query(`
            ALTER TABLE tasks 
            ADD COLUMN IF NOT EXISTS area ENUM('desarrollo', 'workforce') 
            NOT NULL DEFAULT 'desarrollo'
        `);

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