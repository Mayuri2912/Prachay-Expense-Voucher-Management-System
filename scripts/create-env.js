// Creates the .env file from .env.example and fills in a random JWT secret.
//
//   npm run env:init
//
// It never overwrites an existing .env file.

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const examplePath = path.join(root, '.env.example');
const envPath = path.join(root, '.env');

if (fs.existsSync(envPath)) {
  console.log('.env already exists - nothing was changed.');
  process.exit(0);
}

const secret = crypto.randomBytes(48).toString('hex');
const content = fs.readFileSync(examplePath, 'utf8').replace(/^JWT_SECRET=.*$/m, `JWT_SECRET=${secret}`);

fs.writeFileSync(envPath, content);

console.log('Created .env with a new random JWT_SECRET.');
console.log('Next: open .env and set DB_PASSWORD to your MySQL password.');
