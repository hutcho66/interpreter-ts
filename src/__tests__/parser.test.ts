import Lexer from '../lexer';
import Parser from '../parser';
import {
  CallExpression,
  ArrayLiteral,
  IndexExpression,
  HashLiteral,
  StringLiteral,
} from '../ast';
import {
  BooleanLiteral,
  Expression,
  IfExpression,
  BlockStatement,
  FunctionLiteral,
} from '../ast';
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
    const tests = [
      {input: 'let x 5;', error: /expected =, got INT/},
      {input: 'let 5;', error: /expected IDENT, got INT/},
      {input: '~5;', error: /no prefix parsing function found for ILLEGAL ~/},
      {input: '+5;', error: /no prefix parsing function found for \+/},
      {input: '!let', error: /no prefix parsing function found for LET/},
      {
        input: 'let x = let',
        error: /no prefix parsing function found for LET/,
      },
      {
        input: 'return +',
        error: /no prefix parsing function found for \+/,
      },
    ];

    for (const test of tests) {
      const lexer = new Lexer(test.input);
      const parser = new Parser(lexer);
      parser.parseProgram();

      expect(parser.errors).toHaveLength(1);
      expect(parser.errors[0]).toMatch(test.error);
    }
  });

  it('should parse let statements', () => {
    const input = 'let x = 5;';

    const lexer = new Lexer(input);
    const parser = new Parser(lexer);

    const program = parser.parseProgram();

    expect(program.statements).toHaveLength(1);
    expect(parser.errors).toHaveLength(0);

    const statement = program.statements[0] as LetStatement;
    expect(statement.tokenLiteral()).toBe('let');
    expect(statement.name.tokenLiteral()).toBe('x');
    expect(statement.value.tokenLiteral()).toBe('5');
  });

  it('should parse return statements', () => {
    const input = 'return 5;';

    const lexer = new Lexer(input);
    const parser = new Parser(lexer);

    const program = parser.parseProgram();

    expect(program.statements).toHaveLength(1);
    expect(parser.errors).toHaveLength(0);

    const statement = program.statements[0] as ReturnStatement;
    expect(statement.tokenLiteral()).toBe('return');
    expect(statement.value.tokenLiteral()).toBe('5');
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

  it('should parse string expressions', () => {
    const input = '"hello world";';

    const lexer = new Lexer(input);
    const parser = new Parser(lexer);

    const program = parser.parseProgram();

    expect(parser.errors).toHaveLength(0);
    expect(program.statements).toHaveLength(1);

    const statement = program.statements[0] as ExpressionStatement;
    const expression = statement.value as IntegerLiteral;
    expect(expression.value).toBe('hello world');
    expect(expression.tokenLiteral()).toBe('hello world');
  });

  it('should parse boolean literals', () => {
    const tests = [
      {input: 'true;', value: true},
      {input: 'false;', value: false},
    ];

    for (const test of tests) {
      const lexer = new Lexer(test.input);
      const parser = new Parser(lexer);
      const program = parser.parseProgram();

      expect(parser.errors).toHaveLength(0);
      expect(program.statements).toHaveLength(1);

      const statement = program.statements[0] as ExpressionStatement;
      const expression = statement.value as BooleanLiteral;
      expect(expression.tokenLiteral()).toBe(`${test.value}`);
      expect(expression.value).toBe(test.value);
    }
  });

  it('should parse prefix expressions', () => {
    const tests = [
      {input: '!5;', operator: '!', right: 5},
      {input: '-15;', operator: '-', right: 15},
      {input: '!true;', operator: '!', right: true},
      {input: '!false;', operator: '!', right: false},
    ];

    for (const test of tests) {
      const lexer = new Lexer(test.input);
      const parser = new Parser(lexer);
      const program = parser.parseProgram();

      expect(program.statements).toHaveLength(1);
      expect(parser.errors).toHaveLength(0);

      const statement = program.statements[0] as ExpressionStatement;
      const expression = statement.value as PrefixExpression;
      const right = expression.right as Expression;
      expect(expression.operator).toBe(test.operator);
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
      {input: 'true == true;', operator: '==', left: true, right: true},
      {input: 'true != false;', operator: '!=', left: true, right: false},
      {input: 'false == false;', operator: '==', left: false, right: false},
    ];

    for (const test of tests) {
      const lexer = new Lexer(test.input);
      const parser = new Parser(lexer);
      const program = parser.parseProgram();

      expect(parser.errors).toHaveLength(0);
      expect(program.statements).toHaveLength(1);

      const statement = program.statements[0] as ExpressionStatement;
      const expression = statement.value as InfixExpression;
      const left = expression.left as Expression;
      const right = expression.right as Expression;
      expect(expression.operator).toBe(test.operator);
      expect(left.tokenLiteral()).toBe(`${test.left}`);
      expect(right.tokenLiteral()).toBe(`${test.right}`);
    }
  });

  it('should apply operator precedence', () => {
    const tests = [
      {input: '-a * b', expected: '((-a) * b);'},
      {input: '!-a', expected: '(!(-a));'},
      {input: 'a + b + c', expected: '((a + b) + c);'},
      {input: 'a + b - c', expected: '((a + b) - c);'},
      {input: 'a * b * c', expected: '((a * b) * c);'},
      {input: 'a * b / c', expected: '((a * b) / c);'},
      {input: 'a + b / c', expected: '(a + (b / c));'},
      {
        input: 'a + b * c + d / e - f',
        expected: '(((a + (b * c)) + (d / e)) - f);',
      },
      {input: '3 + 4; -5 * 5', expected: '(3 + 4); ((-5) * 5);'},
      {input: '5 > 4 == 3 < 4', expected: '((5 > 4) == (3 < 4));'},
      {input: '5 > 4 != 3 < 4', expected: '((5 > 4) != (3 < 4));'},
      {
        input: '3 + 4 * 5 == 3 * 1 + 4 * 5',
        expected: '((3 + (4 * 5)) == ((3 * 1) + (4 * 5)));',
      },
      {input: 'true', expected: 'true;'},
      {input: 'false', expected: 'false;'},
      {input: '3 > 5 == false', expected: '((3 > 5) == false);'},
      {input: '3 < 5 == false', expected: '((3 < 5) == false);'},
      {input: '1 + (2 + 3) + 4', expected: '((1 + (2 + 3)) + 4);'},
      {input: '(5 + 5) * 2', expected: '((5 + 5) * 2);'},
      {input: '2 / (5 + 5)', expected: '(2 / (5 + 5));'},
      {input: '-(5 + 5)', expected: '(-(5 + 5));'},
      {input: '!(true == true)', expected: '(!(true == true));'},
      {input: 'a + add(b * c) + d', expected: '((a + add((b * c))) + d);'},
      {
        input: 'add(a, b, 1, 2 * 3, 4 + 5, add(6, 7 * 8))',
        expected: 'add(a, b, 1, (2 * 3), (4 + 5), add(6, (7 * 8)));',
      },
      {
        input: 'add(a + b + c * d / f + g)',
        expected: 'add((((a + b) + ((c * d) / f)) + g));',
      },
      {
        input: 'a * [1, 2, 3, 4][b * c] * d',
        expected: '((a * ([1, 2, 3, 4][(b * c)])) * d);',
      },
      {
        input: 'add(a * b[2], b[1], 2 * [1, 2][1])',
        expected: 'add((a * (b[2])), (b[1]), (2 * ([1, 2][1])));',
      },
    ];

    for (const test of tests) {
      const lexer = new Lexer(test.input);
      const parser = new Parser(lexer);
      const program = parser.parseProgram();

      expect(parser.errors).toHaveLength(0);

      expect(program.string()).toEqual(test.expected);
    }
  });

  it('should parse if expressions', () => {
    const input = 'if (x < y) { x }';

    const lexer = new Lexer(input);
    const parser = new Parser(lexer);

    const program = parser.parseProgram();

    expect(parser.errors).toHaveLength(0);
    expect(program.statements).toHaveLength(1);

    const statement = program.statements[0] as ExpressionStatement;
    const expression = statement.value as IfExpression;

    const condition = expression.condition as InfixExpression;
    expect(condition.left.tokenLiteral()).toEqual('x');
    expect(condition.operator).toEqual('<');
    expect(condition.right.tokenLiteral()).toEqual('y');

    const consequence = expression.consequence as BlockStatement;
    expect(consequence.statements).toHaveLength(1);
    expect(consequence.statements[0].tokenLiteral()).toEqual('x');
  });

  it('should parse if-else expressions', () => {
    const input = 'if (x < y) { x } else { y }';

    const lexer = new Lexer(input);
    const parser = new Parser(lexer);

    const program = parser.parseProgram();

    expect(parser.errors).toHaveLength(0);
    expect(program.statements).toHaveLength(1);

    const statement = program.statements[0] as ExpressionStatement;
    const expression = statement.value as IfExpression;

    const condition = expression.condition as InfixExpression;
    expect(condition.left.tokenLiteral()).toEqual('x');
    expect(condition.operator).toEqual('<');
    expect(condition.right.tokenLiteral()).toEqual('y');

    const consequence = expression.consequence as BlockStatement;
    expect(consequence.statements).toHaveLength(1);
    expect(consequence.statements[0].tokenLiteral()).toEqual('x');

    const alternative = expression.alternative as BlockStatement;
    expect(alternative.statements).toHaveLength(1);
    expect(alternative.statements[0].tokenLiteral()).toEqual('y');
  });

  it('should parse function parameters', () => {
    const tests = [
      {input: 'fn() {};', params: []},
      {input: 'fn(x) {};', params: ['x']},
      {input: 'fn(x, y, z) {};', params: ['x', 'y', 'z']},
    ];

    for (const test of tests) {
      const lexer = new Lexer(test.input);
      const parser = new Parser(lexer);

      const program = parser.parseProgram();

      expect(parser.errors).toHaveLength(0);
      expect(program.statements).toHaveLength(1);
      const expression = program.statements[0] as ExpressionStatement;
      const fn = expression.value as FunctionLiteral;

      expect(fn.parameters).toHaveLength(test.params.length);
      for (const i in fn.parameters) {
        expect(fn.parameters[i].string()).toEqual(test.params[i]);
      }
    }
  });

  it('should parse function literals', () => {
    const input = 'fn(x, y) { x + y; }';

    const lexer = new Lexer(input);
    const parser = new Parser(lexer);

    const program = parser.parseProgram();

    expect(parser.errors).toHaveLength(0);
    expect(program.statements).toHaveLength(1);

    const statement = program.statements[0] as ExpressionStatement;
    const expression = statement.value as FunctionLiteral;

    const parameters = expression.parameters as Identifier[];
    expect(parameters).toHaveLength(2);
    expect(parameters[0].tokenLiteral()).toEqual('x');
    expect(parameters[1].tokenLiteral()).toEqual('y');

    const body = expression.body as BlockStatement;
    expect(body.statements).toHaveLength(1);
    expect(body.statements[0].string()).toEqual('(x + y);');
  });

  it('should parse call expressions', () => {
    const input = 'add(1, 2 * 3, 4 + 5)';

    const lexer = new Lexer(input);
    const parser = new Parser(lexer);

    const program = parser.parseProgram();

    expect(parser.errors).toHaveLength(0);
    expect(program.statements).toHaveLength(1);

    const statement = program.statements[0] as ExpressionStatement;
    const expression = statement.value as CallExpression;

    const func = expression.func as Expression;
    expect(func.string()).toEqual('add');

    const args = expression.args as Expression[];
    expect(args).toHaveLength(3);
    expect(args[0].string()).toEqual('1');
    expect(args[1].string()).toEqual('(2 * 3)');
    expect(args[2].string()).toEqual('(4 + 5)');
  });

  it('should parse array literals', () => {
    const input = '[1, 2 * 2, 3 + 3]';

    const lexer = new Lexer(input);
    const parser = new Parser(lexer);

    const program = parser.parseProgram();

    expect(parser.errors).toHaveLength(0);
    expect(program.statements).toHaveLength(1);

    const statement = program.statements[0] as ExpressionStatement;
    const expression = statement.value as ArrayLiteral;

    const elements = expression.elements as Expression[];
    expect(elements).toHaveLength(3);
    expect(elements[0].string()).toEqual('1');
    expect(elements[1].string()).toEqual('(2 * 2)');
    expect(elements[2].string()).toEqual('(3 + 3)');
  });

  it('should parse index expressions', () => {
    const input = 'myArray[1 + 1]';

    const lexer = new Lexer(input);
    const parser = new Parser(lexer);

    const program = parser.parseProgram();

    expect(parser.errors).toHaveLength(0);
    expect(program.statements).toHaveLength(1);

    const statement = program.statements[0] as ExpressionStatement;
    const expression = statement.value as IndexExpression;

    expect(expression.left.string()).toEqual('myArray');
    expect(expression.index.string()).toEqual('(1 + 1)');
  });

  it('should parse empty hash literals', () => {
    const input = '{}';

    const lexer = new Lexer(input);
    const parser = new Parser(lexer);

    const program = parser.parseProgram();

    expect(parser.errors).toHaveLength(0);
    expect(program.statements).toHaveLength(1);

    const statement = program.statements[0] as ExpressionStatement;
    const hash = statement.value as HashLiteral;

    expect(hash.pairs.size).toBe(0);
  });

  it('should parse hash literals', () => {
    const input = '{"one": 1, "two": 2, "three": 3}';

    const lexer = new Lexer(input);
    const parser = new Parser(lexer);

    const program = parser.parseProgram();

    expect(parser.errors).toHaveLength(0);
    expect(program.statements).toHaveLength(1);

    const statement = program.statements[0] as ExpressionStatement;
    const hash = statement.value as HashLiteral;

    const expected: {[key: string]: number} = {
      one: 1,
      two: 2,
      three: 3,
    };

    expect(hash.pairs.size).toBe(3);
    for (const [key, value] of hash.pairs) {
      const keyString = (key as StringLiteral).value;
      const valueInt = (value as IntegerLiteral).value;

      expect(expected[keyString]).toBe(valueInt);
    }
  });
});
