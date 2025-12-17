require("dotenv").config();
const { sequelize } = require('./config/database');

async function createTaskAssigneesTable() {
    try {
        // Connect to database
        await sequelize.authenticate();
        console.log('Database connection established.');

        console.log('Creating task_assignees table...');
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS task_assignees (
                id INT AUTO_INCREMENT PRIMARY KEY,
                taskId INT NOT NULL,
                userId INT NOT NULL,
                assignedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (taskId) REFERENCES tasks(id) ON DELETE CASCADE,
                FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE KEY unique_task_user (taskId, userId)
            );
        `);

        console.log('✅ task_assignees table created successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error creating table:', error);
        process.exit(1);
    }
}

createTaskAssigneesTable();