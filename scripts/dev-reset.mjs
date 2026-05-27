#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import process from 'node:process';

const candidates = process.platform === 'win32'
  ? [['py', ['-3']], ['python', []], ['python3', []]]
  : [['python3', []], ['python', []]];

for (const [bin, args] of candidates) {
  const result = spawnSync(bin, [...args, './scripts/reset_next_dev.py'], {
    stdio: 'inherit',
    cwd: process.cwd(),
  });

  if (result.error && result.error.code === 'ENOENT') {
    continue;
  }

  process.exit(result.status ?? 1);
}

console.error('Python runtime not found. Install python3 (Linux/macOS) or py launcher (Windows).');
process.exit(1);
