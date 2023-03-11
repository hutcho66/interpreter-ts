import {Program, LetStatement, Identifier, ReturnStatement} from '../ast';
import {Token, TokenType} from '../token';
describe('ast', () => {
  it('should return string representation of program', () => {
    const program = new Program([
      new LetStatement(
        new Token(TokenType.LET, 'let'),
        new Identifier(new Token(TokenType.IDENT, 'myVar'), 'myVar'),
        new Identifier(new Token(TokenType.IDENT, 'anotherVar'), 'anotherVar')
      ),
      new ReturnStatement(
        new Token(TokenType.RETURN, 'return'),
        new Identifier(new Token(TokenType.IDENT, 'myVar'), 'myVar')
      ),
    ]);

    expect(program.string()).toBe('let myVar = anotherVar;return myVar;');
  });
});
