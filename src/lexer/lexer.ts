import {Token, TokenType, lookupIdentifier} from '../token/token';

export default class Lexer {
  tokenIterator: IterableIterator<Token>;
  iteratorIndex = 0;

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
    let char = this.peekChar();

    while (this.iteratorIndex < this.input.length) {
      // eat whitespace
      char = this.eatWhitespace();

      switch (char) {
        case '=':
          if (this.peekChar() === '=') {
            yield {type: TokenType.EQ, literal: '=='};
            this.readChar(); // need to eat the extra char
          } else {
            yield {type: TokenType.ASSIGN, literal: char};
          }
          break;
        case '!':
          if (this.peekChar() === '=') {
            yield {type: TokenType.NEQ, literal: '!='};
            this.readChar(); // need to eat the extra char
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
            const literal = this.readIdentifier();
            yield {
              type: lookupIdentifier(literal),
              literal,
            };
          } else if (this.isDigit(char)) {
            const literal = this.readNumber();
            yield {type: TokenType.INT, literal};
          } else {
            yield {type: TokenType.ILLEGAL, literal: char};
          }
      }

      // Increment char
      char = this.readChar();
    }
  }

  // return next char and progress index
  private readChar() {
    return this.input[++this.iteratorIndex];
  }

  // return next char without progressing index
  private peekChar() {
    return this.input[this.iteratorIndex + 1];
  }

  // consume any whitespace and leave index pointing at next non-whitespace char
  // return next non-whitespace char
  private eatWhitespace() {
    let char = this.input[this.iteratorIndex];
    while (char === ' ' || char === '\t' || char === '\n' || char === '\r') {
      this.iteratorIndex++;
      char = this.input[this.iteratorIndex];
    }
    return char;
  }

  // consume chars to find an identifier,
  // leave index pointing at last char of identifier so
  // that progressing the index doesn't skip a char
  private readIdentifier() {
    const start = this.iteratorIndex;
    let char = this.input[this.iteratorIndex];
    while (this.isLetter(char)) {
      char = this.input[++this.iteratorIndex];
    }

    this.iteratorIndex--; // move index back to point at last char of identifier
    return this.input.substring(start, this.iteratorIndex + 1);
  }

  // consume chars to find an number,
  // leave index pointing at last char of number so
  // that progressing the index doesn't skip a char
  private readNumber() {
    const start = this.iteratorIndex;
    let char = this.input[this.iteratorIndex];
    while (this.isDigit(char)) {
      char = this.input[++this.iteratorIndex];
    }

    this.iteratorIndex--; // move index back to point at last char of identifier
    return this.input.substring(start, this.iteratorIndex + 1);
  }

  private isLetter(char: string) {
    return ('a' <= char && 'z' >= char) || ('A' <= char && 'Z' >= char);
  }

  private isDigit(char: string) {
    return '0' <= char && '9' >= char;
  }
}
