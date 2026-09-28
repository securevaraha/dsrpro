// Build a cPanel (CloudLinux Phusion Passenger) ready zip.
// Usage: npm run build:cpanel   ->  dsrpro-cpanel.zip
import { execSync } from 'node:child_process';
import { cpSync, rmSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';

const OUT = 'deploy';
const ZIP = 'dsrpro-cpanel.zip';
const run = (cmd) => execSync(cmd, { stdio: 'inherit' });

console.log('🧹 Cleaning old build...');
rmSync('.next', { recursive: true, force: true });
rmSync(OUT, { recursive: true, force: true });
rmSync(ZIP, { force: true });

console.log('🏗  Building Next.js (standalone)...');
run('npx next build');

if (!existsSync('.next/standalone/server.js')) {
  console.error("❌ .next/standalone/server.js not found. Check output: 'standalone' in next.config.js");
  process.exit(1);
}

console.log('📦 Assembling deploy folder...');
cpSync('.next/standalone', OUT, { recursive: true });
mkdirSync(`${OUT}/.next`, { recursive: true });
cpSync('.next/static', `${OUT}/.next/static`, { recursive: true });
if (existsSync('public')) cpSync('public', `${OUT}/public`, { recursive: true });
for (const f of ['.env', '.env.production']) {
  if (existsSync(f)) cpSync(f, `${OUT}/${f}`);
}

// Phusion Passenger startup file (set "Application startup file" = app.js in cPanel)
writeFileSync(`${OUT}/app.js`, `// cPanel / Phusion Passenger entry point
process.env.NODE_ENV = 'production';
process.env.PORT = process.env.PORT || '3000';
process.env.HOSTNAME = '0.0.0.0';
require('./server.js');
`);

console.log('🗜  Creating zip...');
run(`cd ${OUT} && zip -qr ../${ZIP} .`);

console.log(`\n✅ Done → ${ZIP}`);
console.log('   Upload to your cPanel app folder → Extract → Setup Node.js App → Restart');
