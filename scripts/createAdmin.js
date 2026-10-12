import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from '../src/models.js';

const ADMIN_EMAIL = process.argv[2] || process.env.ADMIN_EMAIL || 'admin@college.com';
const ADMIN_PASSWORD = process.argv[3] || process.env.ADMIN_PASSWORD || 'AdminPassword123!';
const ADMIN_NAME = process.env.ADMIN_NAME || 'System Admin';

async function createAdmin() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/college_portal';

  console.log('Connecting to database...');
  await mongoose.connect(mongoUri);
  console.log(`Connected to database: ${mongoose.connection.host}`);

  const normalizedEmail = ADMIN_EMAIL.trim().toLowerCase();
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, salt);

  // Check if admin already exists
  let admin = await User.findOne({ loginId: normalizedEmail });

  if (admin) {
    admin.name = ADMIN_NAME;
    admin.email = normalizedEmail;
    admin.role = 'admin';
    admin.password = hashedPassword;
    admin.isActive = true;
    admin.mustChangePassword = false;
    await admin.save();

    console.log('\n==========================================');
    console.log('✓ Existing Admin user updated successfully:');
    console.log(`  Email/LoginId : ${normalizedEmail}`);
    console.log(`  Password      : ${ADMIN_PASSWORD}`);
    console.log(`  Role          : ${admin.role}`);
    console.log(`  Status        : Active`);
    console.log('==========================================\n');
  } else {
    admin = await User.create({
      name: ADMIN_NAME,
      email: normalizedEmail,
      loginId: normalizedEmail,
      role: 'admin',
      password: hashedPassword,
      isActive: true,
      mustChangePassword: false,
    });

    console.log('\n==========================================');
    console.log('✓ New Admin user created successfully:');
    console.log(`  Email/LoginId : ${normalizedEmail}`);
    console.log(`  Password      : ${ADMIN_PASSWORD}`);
    console.log(`  Role          : ${admin.role}`);
    console.log(`  Status        : Active`);
    console.log('==========================================\n');
  }

  await mongoose.connection.close();
  console.log('Database connection closed.');
  process.exit(0);
}

createAdmin().catch(async (error) => {
  console.error('[Create Admin Error]:', error);
  try {
    await mongoose.connection.close();
  } catch (_) {}
  process.exit(1);
});
