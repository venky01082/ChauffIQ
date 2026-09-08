const { spawnSync } = require('child_process');
const path = require('path');

const repoUrl = process.argv[2];
if (!repoUrl) {
  console.error('Usage: node scripts/push_to_github.js <github-repo-url>');
  console.error('Example: node scripts/push_to_github.js https://github.com/username/chauffiq.git');
  process.exit(1);
}

const gitExe = path.join(process.env.LOCALAPPDATA, 'Programs', 'Git', 'cmd', 'git.exe');
const projectDir = path.resolve(__dirname, '..');

function run(args) {
  console.log('> git ' + args.join(' '));
  const res = spawnSync(gitExe, args, { cwd: projectDir, stdio: 'inherit' });
  return res.status;
}

// Set or update origin remote
const remotes = spawnSync(gitExe, ['remote'], { cwd: projectDir, encoding: 'utf8' }).stdout || '';
if (remotes.includes('origin')) {
  run(['remote', 'set-url', 'origin', repoUrl]);
} else {
  run(['remote', 'add', 'origin', repoUrl]);
}

run(['branch', '-M', 'main']);
console.log('\nPushing branch main to origin (' + repoUrl + ')...');
const status = run(['push', '-u', 'origin', 'main']);
if (status === 0) {
  console.log('\n✅ Successfully pushed ChauffIQ codebase to GitHub!');
} else {
  console.log('\nNote: If GitHub requested authentication, ensure you are signed in or use a GitHub Personal Access Token.');
}
