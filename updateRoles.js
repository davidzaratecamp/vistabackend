const { sequelize } = require('./config/database');
const { User } = require('./models');

async function updateRoles() {
    try {
        await sequelize.authenticate();
        console.log('Database connection established.');

        // 1. Update existing users to map to new roles
        // Map 'coordinador' to 'jefe_desarrollo' (defaulting to dev head for now)
        // You might want to manually adjust this later
        console.log('Migrating users...');

        // We need to use raw queries because the model definition has changed 
        // and might conflict with existing data before migration
        await sequelize.query(`
      UPDATE users 
      SET role = 'jefe_desarrollo' 
      WHERE role = 'coordinador'
    `);

        console.log('Users migrated.');

        // 2. Update the ENUM column definition
        console.log('Updating column definition...');
        await sequelize.query(`
      ALTER TABLE users 
      MODIFY COLUMN role ENUM('jefe_desarrollo', 'jefe_workforce', 'desarrollador', 'workforce') 
      NOT NULL DEFAULT 'desarrollador'
    `);

        console.log('Column definition updated.');

        console.log('✅ Migration completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error updating roles:', error);
        process.exit(1);
    }
}

updateRoles();
