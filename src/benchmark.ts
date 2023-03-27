import Compiler from './compiler';
import Lexer from './lexer';
import Parser from './parser';
import VM from './vm';
import {Environment} from './object';
import {evaluate} from './evaluate';

const input = `
  let fib = fn(x) {
    if (x == 0) {
      return 0;
    } else {
      if (x == 1) {
        return 1;
      } else {
        return fib(x - 1) + fib(x - 2);
      }
    }
  };
  fib(35);`;

const mode = process.argv[2].substring(2);
if (!['interpreter', 'compiler'].includes(mode)) {
  console.log('Run with --interpreter or --compiler flag');
}

const hrToMs = (hrStart: bigint, hrEnd: bigint) => {
  return (hrEnd - hrStart) / 1000000n;
};

const main = () => {
  const env = new Environment();
  const start = process.hrtime.bigint();

  const l = new Lexer(input);
  const lexerFinish = process.hrtime.bigint();

  const p = new Parser(l).parseProgram();
  const parserFinish = process.hrtime.bigint();

  if (mode === 'compiler') {
    const c = new Compiler();
    c.compile(p);
    const compilerFinish = process.hrtime.bigint();

    const vm = new VM(c.bytecode());
    vm.run();
    const vmFinish = process.hrtime.bigint();

    const result = vm.lastPoppedStackElement();

    console.log(`Engine: ${mode}. fib(35) = ${result?.display()}.
    \tLexer finished in ${hrToMs(start, lexerFinish)}ms
    \tParser finished in ${hrToMs(lexerFinish, parserFinish)}ms
    \tCompiler finished in ${hrToMs(parserFinish, compilerFinish)}ms
    \tVM finished in ${hrToMs(compilerFinish, vmFinish)}ms`);
  } else if (mode === 'interpreter') {
    const result = evaluate(p, env);
    const evaluatorFinish = process.hrtime.bigint();

    console.log(`Engine: ${mode}. fib(35) = ${result.display()}.
    \tLexer finished in ${hrToMs(start, lexerFinish)}ms
    \tParser finished in ${hrToMs(lexerFinish, parserFinish)}ms
    \tEvaluator finished in ${hrToMs(parserFinish, evaluatorFinish)}ms`);
  }
};

main();
