// Prints the bcrypt hash of a password, for adding or updating a user by hand.
//
//   npm run db:hash -- "MyNewPassword"
//
// Then, in MySQL:
//   UPDATE users SET password_hash = '<the hash>' WHERE email = 'someone@example.com';

import bcrypt from 'bcrypt';

const password = process.argv[2];

if (!password) {
  console.error('Usage: npm run db:hash -- "ThePassword"');
  process.exit(1);
}
if (password.length < 8) {
  console.error('Please use a password of at least 8 characters.');
  process.exit(1);
}

console.log(await bcrypt.hash(password, 10));
