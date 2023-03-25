import prompt from 'prompt-sync';
import history from 'prompt-sync-history';
import Lexer from './lexer';
import Parser from './parser';
import {evaluate} from './evaluate';
import {Environment, EmptyObj, BreakObj, Obj} from './object';
import Compiler from './compiler';
import VM from './vm';
import {GLOBALS_SIZE} from './vm';
import SymbolTable from './symbol_table';

const PROMPT = '>> ';
const prompter = prompt({
  history: history(),
  sigint: true,
  eot: true,
});

export default function start(mode: 'compiler' | 'interpreter') {
  if (mode === 'compiler') {
    compiler();
  } else {
    interpreter();
  }
}

function compiler() {
  const constants: Obj[] = [];
  const globals = new Array<Obj>(GLOBALS_SIZE);
  const symbolTable = new SymbolTable();

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const input = prompter(PROMPT);
    const lexer = new Lexer(input);
    const parser = new Parser(lexer);
    const program = parser.parseProgram();
    if (parser.errors.length > 0) {
      console.log('Error parsing statement:');
      for (const error of parser.errors) {
        console.log(`\t${error}`);
      }
      continue;
    }

    const compiler = new Compiler(symbolTable, constants);
    try {
      compiler.compile(program);
    } catch (error) {
      if (error instanceof Error)
        console.log(`${error.name}: ${error.message}`);
      continue;
    }

    const vm = new VM(compiler.bytecode(), globals);
    try {
      vm.run();
    } catch (error) {
      if (error instanceof Error)
        console.log(`${error.name}: ${error.message}`);
      continue;
    }

    const stackTop = vm.lastPoppedStackElement();

    if (stackTop instanceof EmptyObj || stackTop instanceof BreakObj) {
      continue;
    }

    console.log(stackTop!.inspect());
  }
}

function interpreter() {
  const env = new Environment();

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const input = prompter(PROMPT);
    const lexer = new Lexer(input);
    const parser = new Parser(lexer);
    const program = parser.parseProgram();
    if (parser.errors.length > 0) {
      console.log('Error parsing statement:');
      for (const error of parser.errors) {
        console.log(`\t${error}`);
      }
      continue;
    }

    const evaluated = evaluate(program, env);
    if (evaluated instanceof EmptyObj || evaluated instanceof BreakObj) {
      continue;
    }
    console.log(evaluated.inspect());
  }
}
