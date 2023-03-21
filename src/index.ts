import start from './repl';

const mode = process.argv[2].substring(2) ?? 'interpreter';

console.log('Welcome to Monkey REPL!');
console.log(`We are in ${mode} mode.`);
console.log('Press CTRL-D to exit.');
console.log('Please enter commands below:');

if (mode === 'compiler') {
  start('compiler');
} else {
  start('interpreter');
}
