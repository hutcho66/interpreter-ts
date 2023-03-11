import {Token, TokenType} from '../token';
import Lexer from '../lexer';

describe('lexer', () => {
  it('should get next token from string - basic chars', () => {
    const input = '=+-/*!<>(){},;';
    const expectedTokens: Token[] = [
      {type: TokenType.ASSIGN, literal: '='},
      {type: TokenType.PLUS, literal: '+'},
      {type: TokenType.MINUS, literal: '-'},
      {type: TokenType.SLASH, literal: '/'},
      {type: TokenType.ASTERISK, literal: '*'},
      {type: TokenType.BANG, literal: '!'},
      {type: TokenType.LT, literal: '<'},
      {type: TokenType.GT, literal: '>'},
      {type: TokenType.LPAREN, literal: '('},
      {type: TokenType.RPAREN, literal: ')'},
      {type: TokenType.LBRACE, literal: '{'},
      {type: TokenType.RBRACE, literal: '}'},
      {type: TokenType.COMMA, literal: ','},
      {type: TokenType.SEMICOLON, literal: ';'},
      {type: TokenType.EOF, literal: ''},
    ];
    const lexer = new Lexer(input);
    for (const expectedToken of expectedTokens) {
      const token = lexer.nextToken();
      expect(token.type).toBe(expectedToken.type);
      expect(token.literal).toBe(expectedToken.literal);
    }
  });

  it('should get next token from string - complex tokens', () => {
    const input = `let five = 5;
      let ten = 10;
      let add = fn(x, y) {
        x + y;
      };
      let result = add(five, ten);
      if (5 < 10) {
        return true;
      } else {
        return false;
      }
      let eq = 10 == 10;
      let neq = 10 != 9;`;
    const expectedTokens: Token[] = [
      {type: TokenType.LET, literal: 'let'},
      {type: TokenType.IDENT, literal: 'five'},
      {type: TokenType.ASSIGN, literal: '='},
      {type: TokenType.INT, literal: '5'},
      {type: TokenType.SEMICOLON, literal: ';'},
      {type: TokenType.LET, literal: 'let'},
      {type: TokenType.IDENT, literal: 'ten'},
      {type: TokenType.ASSIGN, literal: '='},
      {type: TokenType.INT, literal: '10'},
      {type: TokenType.SEMICOLON, literal: ';'},
      {type: TokenType.LET, literal: 'let'},
      {type: TokenType.IDENT, literal: 'add'},
      {type: TokenType.ASSIGN, literal: '='},
      {type: TokenType.FUNCTION, literal: 'fn'},
      {type: TokenType.LPAREN, literal: '('},
      {type: TokenType.IDENT, literal: 'x'},
      {type: TokenType.COMMA, literal: ','},
      {type: TokenType.IDENT, literal: 'y'},
      {type: TokenType.RPAREN, literal: ')'},
      {type: TokenType.LBRACE, literal: '{'},
      {type: TokenType.IDENT, literal: 'x'},
      {type: TokenType.PLUS, literal: '+'},
      {type: TokenType.IDENT, literal: 'y'},
      {type: TokenType.SEMICOLON, literal: ';'},
      {type: TokenType.RBRACE, literal: '}'},
      {type: TokenType.SEMICOLON, literal: ';'},
      {type: TokenType.LET, literal: 'let'},
      {type: TokenType.IDENT, literal: 'result'},
      {type: TokenType.ASSIGN, literal: '='},
      {type: TokenType.IDENT, literal: 'add'},
      {type: TokenType.LPAREN, literal: '('},
      {type: TokenType.IDENT, literal: 'five'},
      {type: TokenType.COMMA, literal: ','},
      {type: TokenType.IDENT, literal: 'ten'},
      {type: TokenType.RPAREN, literal: ')'},
      {type: TokenType.SEMICOLON, literal: ';'},
      {type: TokenType.IF, literal: 'if'},
      {type: TokenType.LPAREN, literal: '('},
      {type: TokenType.INT, literal: '5'},
      {type: TokenType.LT, literal: '<'},
      {type: TokenType.INT, literal: '10'},
      {type: TokenType.RPAREN, literal: ')'},
      {type: TokenType.LBRACE, literal: '{'},
      {type: TokenType.RETURN, literal: 'return'},
      {type: TokenType.TRUE, literal: 'true'},
      {type: TokenType.SEMICOLON, literal: ';'},
      {type: TokenType.RBRACE, literal: '}'},
      {type: TokenType.ELSE, literal: 'else'},
      {type: TokenType.LBRACE, literal: '{'},
      {type: TokenType.RETURN, literal: 'return'},
      {type: TokenType.FALSE, literal: 'false'},
      {type: TokenType.SEMICOLON, literal: ';'},
      {type: TokenType.RBRACE, literal: '}'},
      {type: TokenType.LET, literal: 'let'},
      {type: TokenType.IDENT, literal: 'eq'},
      {type: TokenType.ASSIGN, literal: '='},
      {type: TokenType.INT, literal: '10'},
      {type: TokenType.EQ, literal: '=='},
      {type: TokenType.INT, literal: '10'},
      {type: TokenType.SEMICOLON, literal: ';'},
      {type: TokenType.LET, literal: 'let'},
      {type: TokenType.IDENT, literal: 'neq'},
      {type: TokenType.ASSIGN, literal: '='},
      {type: TokenType.INT, literal: '10'},
      {type: TokenType.NEQ, literal: '!='},
      {type: TokenType.INT, literal: '9'},
      {type: TokenType.SEMICOLON, literal: ';'},
      {type: TokenType.EOF, literal: ''},
    ];
    const lexer = new Lexer(input);
    for (const expectedToken of expectedTokens) {
      const token = lexer.nextToken();
      expect(token.type).toBe(expectedToken.type);
      expect(token.literal).toBe(expectedToken.literal);
    }
  });

  it('should return ILLEGAL token if invalid input', () => {
    const input = '~';
    const lexer = new Lexer(input);
    const token = lexer.nextToken();

    expect(token.type).toBe(TokenType.ILLEGAL);
    expect(token.literal).toBe('~');
  });
});
