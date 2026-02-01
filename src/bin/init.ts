#!/usr/bin/env node

// Load environment variables from .env file
import 'dotenv/config';

import { init } from '../creator/init.js';

init().catch((error) => {
  console.error('Error during setup:', error.message);
  process.exit(1);
});
