import {Token, TokenType, lookupIdentifier} from '../token/token';

export default class Lexer {
  tokenIterator: IterableIterator<Token>;

  constructor(private input: string) {
    this.tokenIterator = this.tokens();
  }

  nextToken(): Token {
    const result = this.tokenIterator.next();
    if (!result.value) return {type: TokenType.EOF, literal: ''};

    return result.value;
  }

  // create token generator
  private *tokens(): IterableIterator<Token> {
    let index = 0;
    while (index < this.input.length) {
      let char = this.input[index];

      // skip whitespace
      while (this.isWhitespace(char)) {
        index++;
        char = this.input[index];
      }

      switch (char) {
        case '=':
          if (this.input[index + 1] === '=') {
            yield {type: TokenType.EQ, literal: '=='};
            index++;
          } else {
            yield {type: TokenType.ASSIGN, literal: char};
          }
          break;
        case '!':
          if (this.input[index + 1] === '=') {
            yield {type: TokenType.NEQ, literal: '!='};
            index++;
          } else {
            yield {type: TokenType.BANG, literal: char};
          }
          break;
        case ';':
          yield {type: TokenType.SEMICOLON, literal: char};
          break;
        case '(':
          yield {type: TokenType.LPAREN, literal: char};
          break;
        case ')':
          yield {type: TokenType.RPAREN, literal: char};
          break;
        case ',':
          yield {type: TokenType.COMMA, literal: char};
          break;
        case '+':
          yield {type: TokenType.PLUS, literal: char};
          break;
        case '-':
          yield {type: TokenType.MINUS, literal: char};
          break;
        case '*':
          yield {type: TokenType.ASTERISK, literal: char};
          break;
        case '/':
          yield {type: TokenType.SLASH, literal: char};
          break;
        case '<':
          yield {type: TokenType.LT, literal: char};
          break;
        case '>':
          yield {type: TokenType.GT, literal: char};
          break;
        case '{':
          yield {type: TokenType.LBRACE, literal: char};
          break;
        case '}':
          yield {type: TokenType.RBRACE, literal: char};
          break;
        default:
          if (this.isLetter(char)) {
            // keep consuming while next char is letter
            const start = index; // store initial position
            while (this.isLetter(this.input[index])) {
              index += 1;
            }
            // index now points at next non-char
            const literal = this.input.substring(start, index);
            yield {
              type: lookupIdentifier(literal),
              literal,
            };
            // because index is progressed switch, move it back one position
            index--;
          } else if (this.isDigit(char)) {
            // keep consuming while next char is digit
            const start = index; // store initial position
            while (this.isDigit(this.input[index])) {
              index += 1;
            }
            // index now points at next non-char
            const literal = this.input.substring(start, index);
            yield {type: TokenType.INT, literal};
            // because index is progressed switch, move it back one position
            index--;
          } else {
            yield {type: TokenType.ILLEGAL, literal: char};
          }
      }
      index++;
    }
  }

  private isLetter(char: string) {
    return ('a' <= char && 'z' >= char) || ('A' <= char && 'Z' >= char);
  }

  private isDigit(char: string) {
    return '0' <= char && '9' >= char;
  }

  private isWhitespace(char: string) {
    return char === ' ' || char === '\t' || char === '\n' || char === '\r';
  }
}
