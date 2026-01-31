#!/usr/bin/env node

import { init } from '../creator/init.js';

init().catch((error) => {
  console.error('Error during setup:', error.message);
  process.exit(1);
});
