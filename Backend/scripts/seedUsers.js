/**
 * Seed Script: Create Default User Accounts
 *
 * Run with: node scripts/seedUsers.js
 */

const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');

// Load environment variables
require('dotenv').config();

// ----------------------------------------------------------------------

// Default users to seed
const SEED_USERS = [
  {
    displayName: 'Admin User',
    email: 'admin@tms.com',
    password: 'Admin@123',
    role: 'admin',
  },
  {
    displayName: 'Regular User',
    email: 'user@tms.com',
    password: 'User@123',
    role: 'user',
  },
  {
    displayName: 'QA Tester',
    email: 'tester@tms.com',
    password: 'Tester@123',
    role: 'tester',
  },
  {
    displayName: 'Manager User',
    email: 'manager@tms.com',
    password: 'Manager@123',
    role: 'manager',
  },
  {
    displayName: 'Staff Member',
    email: 'staff@tms.com',
    password: 'Staff@123',
    role: 'staff',
  },
];

// ----------------------------------------------------------------------

async function seedUsers() {
  console.log('🌱 Starting user seed...\n');

  // Create database connection
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'tms_db',
    port: parseInt(process.env.DB_PORT || '3306', 10),
  });

  try {
    console.log('📦 Connected to database\n');

    for (const user of SEED_USERS) {
      // Check if user already exists
      const [existingUsers] = await connection.execute(
        'SELECT id FROM users WHERE email = ?',
        [user.email]
      );

      if (existingUsers.length > 0) {
        console.log(`⏭️  User ${user.email} already exists, skipping...`);
        continue;
      }

      // Hash the password
      const passwordHash = await bcrypt.hash(user.password, 10);

      // Insert the user
      await connection.execute(
        `INSERT INTO users (
          id, display_name, email, password_hash, role
        ) VALUES (?, ?, ?, ?, ?)`,
        [
          uuidv4(),
          user.displayName,
          user.email,
          passwordHash,
          user.role,
        ]
      );

      console.log(`✅ Created user: ${user.email} (${user.role})`);
    }

    console.log('\n🎉 User seed completed successfully!\n');
    console.log('You can now log in with the following credentials:');
    console.log('----------------------------------------');
    console.log('Admin:   admin@tms.com   / Admin@123');
    console.log('Manager: manager@tms.com / Manager@123');
    console.log('Staff:   staff@tms.com   / Staff@123');
    console.log('Tester:  tester@tms.com  / Tester@123');
    console.log('User:    user@tms.com    / User@123');
    console.log('----------------------------------------\n');
  } catch (error) {
    console.error('❌ Error seeding users:', error.message);
    throw error;
  } finally {
    await connection.end();
    console.log('📦 Database connection closed');
  }
}

// Run the seed
seedUsers().catch((error) => {
  console.error('Seed failed:', error.message);
  process.exit(1);
});
