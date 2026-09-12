// Uses only disposable Docker resources; never connects to an existing database.
const { execFileSync } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const run = (args) =>
  execFileSync('docker', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 60000,
  });
const prefix = `nestjs-smoke-${randomUUID()}`;
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'nestjs-smoke-'));
const envFile = path.join(directory, 'test.env');
const image = process.argv[2] || 'nestjs-starter:ci';
const pause = () => new Promise((resolve) => setTimeout(resolve, 1000));
async function checkEventually(check) {
  for (let attempt = 0; attempt < 30; attempt++) {
    try {
      check();
      return;
    } catch {
      await pause();
    }
  }
  throw new Error('Container readiness deadline exceeded');
}
(async () => {
  try {
    run(['network', 'create', prefix]);
    run([
      'run',
      '-d',
      '--name',
      `${prefix}-db`,
      '--network',
      prefix,
      '-e',
      'POSTGRES_USER=test',
      '-e',
      'POSTGRES_PASSWORD=test',
      '-e',
      'POSTGRES_DB=test',
      'postgres:16-alpine',
    ]);
    await checkEventually(() =>
      run(['exec', `${prefix}-db`, 'pg_isready', '-U', 'test', '-d', 'test']),
    );
    fs.writeFileSync(
      envFile,
      `NODE_ENV=production\nAPP_NAME=Smoke\nAPP_DESCRIPTION=Smoke\nDB_HOST=${prefix}-db\nDB_PORT=5432\nDB_USER=test\nDB_PASSWORD=test\nDB_NAME=test\nDB_SYNC=false\nDB_LOGGING=false\nJWT_SECRET=${randomUUID() + randomUUID()}\nSWAGGER_ENABLED=false\nLOG_LEVEL=error\n`,
      { mode: 0o600 },
    );
    const base = ['--network', prefix, '--env-file', envFile];
    run([
      'run',
      '--rm',
      ...base,
      image,
      'node',
      'dist/database/cli.js',
      'migrate',
    ]);
    run([
      'run',
      '--rm',
      ...base,
      image,
      'node',
      'dist/database/cli.js',
      'seed',
    ]);
    run([
      'run',
      '-d',
      '--name',
      `${prefix}-api`,
      '--read-only',
      '--tmpfs',
      '/tmp',
      '--cap-drop',
      'ALL',
      '--security-opt',
      'no-new-privileges',
      ...base,
      image,
    ]);
    await checkEventually(() =>
      run([
        'exec',
        `${prefix}-api`,
        'node',
        '-e',
        "fetch('http://127.0.0.1:3030/v1/health/ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))",
      ]),
    );
    run([
      'exec',
      `${prefix}-api`,
      'node',
      '-e',
      "const fs=require('fs');if(process.getuid()===0||fs.existsSync('.env')||fs.existsSync('src'))process.exit(1);try{require.resolve('eslint');process.exit(1)}catch{}",
    ]);
    const config = JSON.parse(run(['inspect', `${prefix}-api`]))[0].Config;
    assert.equal(config.User, 'node');
    run(['exec', `${prefix}-api`, 'sh', '-c', config.Healthcheck.Test[1]]);
    run(['stop', '--time', '10', `${prefix}-api`]);
    assert.notEqual(
      JSON.parse(run(['inspect', `${prefix}-api`]))[0].State.ExitCode,
      137,
    );
    console.log(
      'Container migrations, seed, readiness, healthcheck, non-root/read-only runtime, exclusions and graceful stop passed',
    );
  } finally {
    for (const name of [`${prefix}-api`, `${prefix}-db`]) {
      try {
        run(['rm', '-f', name]);
      } catch {}
    }
    try {
      run(['network', 'rm', prefix]);
    } catch {}
    fs.rmSync(directory, { recursive: true, force: true });
  }
})().catch(() => {
  console.error('Container smoke test failed');
  process.exitCode = 1;
});
