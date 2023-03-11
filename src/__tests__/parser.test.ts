import Lexer from '../lexer';
import Parser from '../parser';
import {
  LetStatement,
  ReturnStatement,
  ExpressionStatement,
  Identifier,
  IntegerLiteral,
  PrefixExpression,
  InfixExpression,
} from '../ast';

describe('parser', () => {
  it('should skip invalid statements', () => {
    const input = `let x 5;
    let 5;
    +5;
    !let;`;

    const lexer = new Lexer(input);
    const parser = new Parser(lexer);

    parser.parseProgram();

    expect(parser.errors).toHaveLength(4);
    expect(parser.errors[0]).toMatch(/expected =, got INT/);
    expect(parser.errors[1]).toMatch(/expected IDENT, got INT/);
    expect(parser.errors[2]).toMatch(/no prefix parsing function found for \+/);
    expect(parser.errors[3]).toMatch(
      /no prefix parsing function found for LET/
    );
  });

  it('should parse let statements', () => {
    const input = `let x = 5;
      let y = 10;
      let foobar = 838383;`;

    const lexer = new Lexer(input);
    const parser = new Parser(lexer);

    const program = parser.parseProgram();

    expect(program.statements).toHaveLength(3);
    expect(parser.errors).toHaveLength(0);

    const expectedIdentifiers = ['x', 'y', 'foobar'];
    for (const index in expectedIdentifiers) {
      const statement = program.statements[index] as LetStatement;
      expect(statement.tokenLiteral()).toBe('let');
      expect(statement.name.value).toBe(expectedIdentifiers[index]);
      expect(statement.name.tokenLiteral()).toBe(expectedIdentifiers[index]);
    }
  });

  it('should parse return statements', () => {
    const input = `return 5;
      return 10;
      return 838383;`;

    const lexer = new Lexer(input);
    const parser = new Parser(lexer);

    const program = parser.parseProgram();

    expect(program.statements).toHaveLength(3);
    expect(parser.errors).toHaveLength(0);

    const expectedReturnValues = ['5', '10', '838383'];
    for (const index in expectedReturnValues) {
      const statement = program.statements[index] as ReturnStatement;
      expect(statement.tokenLiteral()).toBe('return');
    }
  });

  it('should parse identifier expressions', () => {
    const input = 'foobar;';

    const lexer = new Lexer(input);
    const parser = new Parser(lexer);

    const program = parser.parseProgram();

    expect(program.statements).toHaveLength(1);
    expect(parser.errors).toHaveLength(0);

    const statement = program.statements[0] as ExpressionStatement;
    const expression = statement.value as Identifier;
    expect(expression.value).toBe('foobar');
    expect(expression.tokenLiteral()).toBe('foobar');
  });

  it('should parse integer expressions', () => {
    const input = '5;';

    const lexer = new Lexer(input);
    const parser = new Parser(lexer);

    const program = parser.parseProgram();

    expect(program.statements).toHaveLength(1);
    expect(parser.errors).toHaveLength(0);

    const statement = program.statements[0] as ExpressionStatement;
    const expression = statement.value as IntegerLiteral;
    expect(expression.value).toBe(5);
    expect(expression.tokenLiteral()).toBe('5');
  });

  it('should parse prefix expressions', () => {
    const tests = [
      {input: '!5;', operator: '!', right: 5},
      {input: '-15;', operator: '-', right: 15},
    ];

    for (const test of tests) {
      const lexer = new Lexer(test.input);
      const parser = new Parser(lexer);
      const program = parser.parseProgram();

      expect(program.statements).toHaveLength(1);
      expect(parser.errors).toHaveLength(0);

      const statement = program.statements[0] as ExpressionStatement;
      const expression = statement.value as PrefixExpression;
      const right = expression.right as IntegerLiteral;
      expect(expression.operator).toBe(test.operator);
      expect(right.value).toBe(test.right);
      expect(right.tokenLiteral()).toBe(`${test.right}`);
    }
  });

  it('should parse infix expressions', () => {
    const tests = [
      {input: '5 + 5;', operator: '+', left: 5, right: 5},
      {input: '5 - 5;', operator: '-', left: 5, right: 5},
      {input: '5 * 5;', operator: '*', left: 5, right: 5},
      {input: '5 / 5;', operator: '/', left: 5, right: 5},
      {input: '5 > 5;', operator: '>', left: 5, right: 5},
      {input: '5 < 5;', operator: '<', left: 5, right: 5},
      {input: '5 == 5;', operator: '==', left: 5, right: 5},
      {input: '5 != 5;', operator: '!=', left: 5, right: 5},
    ];

    for (const test of tests) {
      const lexer = new Lexer(test.input);
      const parser = new Parser(lexer);
      const program = parser.parseProgram();

      expect(parser.errors).toHaveLength(0);
      expect(program.statements).toHaveLength(1);

      const statement = program.statements[0] as ExpressionStatement;
      const expression = statement.value as InfixExpression;
      const left = expression.left as IntegerLiteral;
      const right = expression.right as IntegerLiteral;
      expect(expression.operator).toBe(test.operator);
      expect(left.value).toBe(test.left);
      expect(left.tokenLiteral()).toBe(`${test.left}`);
      expect(right.value).toBe(test.right);
      expect(right.tokenLiteral()).toBe(`${test.right}`);
    }
  });

  it('should apply operator precedence', () => {
    const tests = [
      {input: '-a * b', expected: '((-a) * b)'},
      {input: '!-a', expected: '(!(-a))'},
      {input: 'a + b + c', expected: '((a + b) + c)'},
      {input: 'a + b - c', expected: '((a + b) - c)'},
      {input: 'a * b * c', expected: '((a * b) * c)'},
      {input: 'a * b / c', expected: '((a * b) / c)'},
      {input: 'a + b / c', expected: '(a + (b / c))'},
      {
        input: 'a + b * c + d / e - f',
        expected: '(((a + (b * c)) + (d / e)) - f)',
      },
      {input: '3 + 4; -5 * 5', expected: '(3 + 4)\n((-5) * 5)'},
      {input: '5 > 4 == 3 < 4', expected: '((5 > 4) == (3 < 4))'},
      {input: '5 > 4 != 3 < 4', expected: '((5 > 4) != (3 < 4))'},
      {
        input: '3 + 4 * 5 == 3 * 1 + 4 * 5',
        expected: '((3 + (4 * 5)) == ((3 * 1) + (4 * 5)))',
      },
    ];

    for (const test of tests) {
      const lexer = new Lexer(test.input);
      const parser = new Parser(lexer);
      const program = parser.parseProgram();

      expect(program.string()).toEqual(test.expected);
    }
  });
});
