import type { User } from './src/types';

// Create the initial admin user that matches your Supabase user
const initialAdminUser: User = {
  id: '8452b4ad-3293-4379-8121-6f0b13d738a5',
  name: 'Shiras',
  email: 'shiras@fitness22.com',
  password: 'admin123', // You can change this password
  createdAt: new Date().toISOString(),
  isAdmin: true,
  department: 'Israel'
};

// Save to localStorage
const USERS_KEY = 'attendance_users';
const users = [initialAdminUser];
localStorage.setItem(USERS_KEY, JSON.stringify(users));

console.log('Initial admin user created:', initialAdminUser);
console.log('You can now log in with:');
console.log('Email: shiras@fitness22.com');
console.log('Password: admin123');