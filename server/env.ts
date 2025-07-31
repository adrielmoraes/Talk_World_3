// Load environment variables from .env file
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

try {
  const envPath = resolve(__dirname, '../.env');
  const envContent = readFileSync(envPath, 'utf8');

  const envVars = envContent.split('\n').reduce((acc, line) => {
    // Skip comments and empty lines
    if (!line || line.startsWith('#')) return acc;

    // Split by first equals sign
    const equalIndex = line.indexOf('=');
    if (equalIndex === -1) return acc;

    const key = line.substring(0, equalIndex).trim();
    const value = line.substring(equalIndex + 1).trim();

    if (key && value) {
      // Remove quotes if present
      const cleanValue = value.replace(/^['"](.+)['"]$/, '$1');
      process.env[key] = cleanValue;
    }

    return acc;
  }, {});

  console.log('Environment variables loaded successfully');
} catch (error) {
  console.error('Error loading environment variables:', error);
}