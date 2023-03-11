import {Token, TokenType, lookupIdentifier} from '../token/token';

export default class Lexer {
  tokenIterator: IterableIterator<Token>;
  iteratorIndex = 0;

  constructor(private input: string) {
    this.tokenIterator = this.tokens();
  }

  nextToken(): Token {
    const result = this.tokenIterator.next();
    if (!result.value) return new Token(TokenType.EOF, '');

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
            yield new Token(TokenType.EQ, '==');
            this.readChar(); // need to eat the extra char
          } else {
            yield new Token(TokenType.ASSIGN, char);
          }
          break;
        case '!':
          if (this.peekChar() === '=') {
            yield new Token(TokenType.NEQ, '!=');
            this.readChar(); // need to eat the extra char
          } else {
            yield new Token(TokenType.BANG, char);
          }
          break;
        case ';':
          yield new Token(TokenType.SEMICOLON, char);
          break;
        case '(':
          yield new Token(TokenType.LPAREN, char);
          break;
        case ')':
          yield new Token(TokenType.RPAREN, char);
          break;
        case ',':
          yield new Token(TokenType.COMMA, char);
          break;
        case '+':
          yield new Token(TokenType.PLUS, char);
          break;
        case '-':
          yield new Token(TokenType.MINUS, char);
          break;
        case '*':
          yield new Token(TokenType.ASTERISK, char);
          break;
        case '/':
          yield new Token(TokenType.SLASH, char);
          break;
        case '<':
          yield new Token(TokenType.LT, char);
          break;
        case '>':
          yield new Token(TokenType.GT, char);
          break;
        case '{':
          yield new Token(TokenType.LBRACE, char);
          break;
        case '}':
          yield new Token(TokenType.RBRACE, char);
          break;
        default:
          if (this.isLetter(char)) {
            const literal = this.readIdentifier();
            yield new Token(lookupIdentifier(literal), literal);
          } else if (this.isDigit(char)) {
            const literal = this.readNumber();
            yield new Token(TokenType.INT, literal);
          } else {
            yield new Token(TokenType.ILLEGAL, char);
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
