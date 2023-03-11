import prompt from 'prompt-sync';
import history from 'prompt-sync-history';
import Lexer from './lexer';
import {TokenType} from './token';

const PROMPT = '>> ';
const prompter = prompt({
  history: history(),
  sigint: true,
  eot: true,
});

export default function start() {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const input = prompter(PROMPT);
    const lexer = new Lexer(input);
    let token;
    do {
      token = lexer.nextToken();
      console.log(`{type: ${token.type}, literal: ${token.literal}}`);
    } while (token.type !== TokenType.EOF);
  }
}
