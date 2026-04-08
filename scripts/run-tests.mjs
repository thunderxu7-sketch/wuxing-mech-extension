import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const testBuildDir = join(process.cwd(), 'node_modules', '.tmp', 'test-build');
const testOutputDir = join(testBuildDir, 'tests');

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

run(process.execPath, ['./node_modules/typescript/bin/tsc', '-p', 'tsconfig.test.json']);

mkdirSync(testBuildDir, { recursive: true });
writeFileSync(join(testBuildDir, 'package.json'), JSON.stringify({ type: 'commonjs' }));

const testFiles = readdirSync(testOutputDir)
  .filter((file) => file.endsWith('.test.js'))
  .map((file) => join(testOutputDir, file));

run(process.execPath, ['--test', ...testFiles]);
