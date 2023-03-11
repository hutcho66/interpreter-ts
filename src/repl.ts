import prompt from 'prompt-sync';
import history from 'prompt-sync-history';
import Lexer from './lexer';
import Parser from './parser';
import {evaluate} from './evaluate';
import {Environment, NullObj} from './object';

const PROMPT = '>> ';
const prompter = prompt({
  history: history(),
  sigint: true,
  eot: true,
});

export default function start() {
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
    if (evaluated instanceof NullObj) {
      continue;
    }
    console.log(evaluated.inspect());
  }
}
