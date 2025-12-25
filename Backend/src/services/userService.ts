import { v4 as uuidv4 } from 'uuid';
import { query, getConnection } from '../config/database';
import { hashPassword, comparePassword } from '../utils/password';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

// ----------------------------------------------------------------------

export interface User {
  id: string;
  displayName: string;
  email: string;
  photoURL: string | null;
  phoneNumber: string | null;
  country: string | null;
  address: string | null;
  state: string | null;
  city: string | null;
  zipCode: string | null;
  about: string | null;
  role: 'admin' | 'manager' | 'staff' | 'tester' | 'user';
  status: 'active' | 'inactive' | 'banned';
  isPublic: boolean;
  isVerified: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserWithPassword extends User {
  passwordHash: string;
}

export interface CreateUserInput {
  email: string;
  password: string;
  displayName: string;
  role?: 'admin' | 'manager' | 'staff' | 'tester' | 'user';
  phoneNumber?: string;
  country?: string;
  address?: string;
  state?: string;
  city?: string;
  zipCode?: string;
  about?: string;
  photoURL?: string;
  isPublic?: boolean;
}

export interface UpdateUserInput {
  displayName?: string;
  email?: string;
  phoneNumber?: string;
  country?: string;
  address?: string;
  state?: string;
  city?: string;
  zipCode?: string;
  about?: string;
  photoURL?: string;
  isPublic?: boolean;
  role?: 'admin' | 'manager' | 'staff' | 'tester' | 'user';
  status?: 'active' | 'inactive' | 'banned';
}

// ----------------------------------------------------------------------

/**
 * Convert database row to User object (camelCase)
 */
const rowToUser = (row: RowDataPacket): User => ({
  id: row.id,
  displayName: row.display_name,
  email: row.email,
  photoURL: row.photo_url,
  phoneNumber: row.phone_number,
  country: row.country,
  address: row.address,
  state: row.state,
  city: row.city,
  zipCode: row.zip_code,
  about: row.about,
  role: row.role,
  status: row.status,
  isPublic: Boolean(row.is_public),
  isVerified: Boolean(row.is_verified),
  lastLoginAt: row.last_login_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const rowToUserWithPassword = (row: RowDataPacket): UserWithPassword => ({
  ...rowToUser(row),
  passwordHash: row.password_hash,
});

// ----------------------------------------------------------------------

/**
 * Find a user by email
 */
export const findByEmail = async (email: string): Promise<UserWithPassword | null> => {
  const rows = (await query(
    'SELECT * FROM users WHERE email = ?',
    [email]
  )) as RowDataPacket[];

  if (rows.length === 0) {
    return null;
  }

  return rowToUserWithPassword(rows[0]);
};

/**
 * Find a user by ID
 */
export const findById = async (id: string): Promise<User | null> => {
  const rows = (await query(
    'SELECT * FROM users WHERE id = ?',
    [id]
  )) as RowDataPacket[];

  if (rows.length === 0) {
    return null;
  }

  return rowToUser(rows[0]);
};

/**
 * Create a new user
 */
export const createUser = async (input: CreateUserInput): Promise<User> => {
  const id = uuidv4();
  const passwordHash = await hashPassword(input.password);

  await query(
    `INSERT INTO users (
      id, display_name, email, password_hash, role,
      phone_number, country, address, state, city,
      zip_code, about, photo_url, is_public, status, is_verified
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', false)`,
    [
      id,
      input.displayName,
      input.email,
      passwordHash,
      input.role || 'user',
      input.phoneNumber || null,
      input.country || null,
      input.address || null,
      input.state || null,
      input.city || null,
      input.zipCode || null,
      input.about || null,
      input.photoURL || null,
      input.isPublic !== undefined ? input.isPublic : true,
    ]
  );

  const user = await findById(id);
  if (!user) {
    throw new Error('Failed to create user');
  }

  return user;
};

/**
 * Validate user credentials
 */
export const validateCredentials = async (
  email: string,
  password: string
): Promise<User | null> => {
  const user = await findByEmail(email);

  if (!user) {
    return null;
  }

  const isValid = await comparePassword(password, user.passwordHash);

  if (!isValid) {
    return null;
  }

  // Update last login time
  await query('UPDATE users SET last_login_at = NOW() WHERE id = ?', [user.id]);

  // Return user without password hash
  const { passwordHash, ...userWithoutPassword } = user;
  return userWithoutPassword;
};

/**
 * Update user profile
 */
export const updateUser = async (id: string, input: UpdateUserInput): Promise<User | null> => {
  const updates: string[] = [];
  const values: any[] = [];

  if (input.displayName !== undefined) {
    updates.push('display_name = ?');
    values.push(input.displayName);
  }
  if (input.email !== undefined) {
    updates.push('email = ?');
    values.push(input.email);
  }
  if (input.phoneNumber !== undefined) {
    updates.push('phone_number = ?');
    values.push(input.phoneNumber);
  }
  if (input.country !== undefined) {
    updates.push('country = ?');
    values.push(input.country);
  }
  if (input.address !== undefined) {
    updates.push('address = ?');
    values.push(input.address);
  }
  if (input.state !== undefined) {
    updates.push('state = ?');
    values.push(input.state);
  }
  if (input.city !== undefined) {
    updates.push('city = ?');
    values.push(input.city);
  }
  if (input.zipCode !== undefined) {
    updates.push('zip_code = ?');
    values.push(input.zipCode);
  }
  if (input.about !== undefined) {
    updates.push('about = ?');
    values.push(input.about);
  }
  if (input.photoURL !== undefined) {
    updates.push('photo_url = ?');
    values.push(input.photoURL);
  }
  if (input.isPublic !== undefined) {
    updates.push('is_public = ?');
    values.push(input.isPublic);
  }
  if (input.role !== undefined) {
    updates.push('role = ?');
    values.push(input.role);
  }
  if (input.status !== undefined) {
    updates.push('status = ?');
    values.push(input.status);
  }

  if (updates.length === 0) {
    return findById(id);
  }

  values.push(id);

  await query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);

  return findById(id);
};

/**
 * Change user password
 */
export const changePassword = async (
  id: string,
  oldPassword: string,
  newPassword: string
): Promise<boolean> => {
  const rows = (await query(
    'SELECT password_hash FROM users WHERE id = ?',
    [id]
  )) as RowDataPacket[];

  if (rows.length === 0) {
    return false;
  }

  const isValid = await comparePassword(oldPassword, rows[0].password_hash);

  if (!isValid) {
    return false;
  }

  const newHash = await hashPassword(newPassword);
  await query('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, id]);

  return true;
};

/**
 * Reset password (admin or via reset token)
 */
export const resetPassword = async (id: string, newPassword: string): Promise<boolean> => {
  const newHash = await hashPassword(newPassword);
  const result = (await query(
    'UPDATE users SET password_hash = ? WHERE id = ?',
    [newHash, id]
  )) as ResultSetHeader;

  return result.affectedRows > 0;
};

/**
 * Get all users (with pagination and filters)
 */
export const getAllUsers = async (options?: {
  page?: number;
  limit?: number;
  role?: string;
  status?: string;
  search?: string;
}): Promise<{ users: User[]; total: number }> => {
  const page = options?.page || 1;
  const limit = options?.limit || 10;
  const offset = (page - 1) * limit;

  let whereClause = '1=1';
  const params: any[] = [];

  if (options?.role && options.role !== 'all') {
    whereClause += ' AND role = ?';
    params.push(options.role);
  }

  if (options?.status && options.status !== 'all') {
    whereClause += ' AND status = ?';
    params.push(options.status);
  }

  if (options?.search) {
    whereClause += ' AND (display_name LIKE ? OR email LIKE ?)';
    const searchTerm = `%${options.search}%`;
    params.push(searchTerm, searchTerm);
  }

  // Get total count
  const countResult = (await query(
    `SELECT COUNT(*) as total FROM users WHERE ${whereClause}`,
    params
  )) as RowDataPacket[];
  const total = countResult[0].total;

  // Get paginated results
  const rows = (await query(
    `SELECT * FROM users WHERE ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  )) as RowDataPacket[];

  return {
    users: rows.map(rowToUser),
    total,
  };
};

/**
 * Delete a user
 */
export const deleteUser = async (id: string): Promise<boolean> => {
  const result = (await query('DELETE FROM users WHERE id = ?', [id])) as ResultSetHeader;
  return result.affectedRows > 0;
};

/**
 * Check if email exists
 */
export const emailExists = async (email: string, excludeId?: string): Promise<boolean> => {
  let sql = 'SELECT COUNT(*) as count FROM users WHERE email = ?';
  const params: any[] = [email];

  if (excludeId) {
    sql += ' AND id != ?';
    params.push(excludeId);
  }

  const rows = (await query(sql, params)) as RowDataPacket[];
  return rows[0].count > 0;
};

/**
 * Update user status
 */
export const updateUserStatus = async (
  id: string,
  status: 'active' | 'inactive' | 'banned'
): Promise<boolean> => {
  const result = (await query(
    'UPDATE users SET status = ? WHERE id = ?',
    [status, id]
  )) as ResultSetHeader;

  return result.affectedRows > 0;
};
