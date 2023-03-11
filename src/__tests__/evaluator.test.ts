import Lexer from '../lexer';
import Parser from '../parser';
import {evaluate} from '../evaluate';
import {FunctionObj, StringObj} from '../object';
import {
  Obj,
  IntegerObj,
  BooleanObj,
  NullObj,
  ErrorObj,
  Environment,
} from '../object';

function testEvaluate(input: string): Obj {
  const lexer = new Lexer(input);
  const parser = new Parser(lexer);
  const program = parser.parseProgram();

  const env = new Environment();

  return evaluate(program, env);
}

describe('evaluator', () => {
  it('should reuse objects for simple literals', () => {
    expect(testEvaluate('true')).toBe(testEvaluate('true'));
    expect(testEvaluate('5')).toBe(testEvaluate('5'));
    expect(testEvaluate('--5')).toBe(testEvaluate('5'));
  });

  it('should throw errors', () => {
    const tests = [
      {input: '5 + true;', message: 'type mismatch: INTEGER + BOOLEAN'},
      {input: '5 + true; 5;', message: 'type mismatch: INTEGER + BOOLEAN'},
      {input: '-true;', message: 'unknown operator: -BOOLEAN'},
      {input: 'true + false;', message: 'unknown operator: BOOLEAN + BOOLEAN'},
      {
        input: '"hello" - "world";',
        message: 'unknown operator: STRING - STRING',
      },
      {
        input: '5; true + false; 5',
        message: 'unknown operator: BOOLEAN + BOOLEAN',
      },
      {
        input: 'if (10 > 1) { true + false; }',
        message: 'unknown operator: BOOLEAN + BOOLEAN',
      },
      {
        input: 'if (10 > 1) { if (10 > 1) { return true + false; } return 1; }',
        message: 'unknown operator: BOOLEAN + BOOLEAN',
      },
      {
        input: 'foobar',
        message: 'identifier not found: foobar',
      },
    ];

    for (const test of tests) {
      const evaluated = testEvaluate(test.input) as ErrorObj;
      expect(evaluated.message).toBe(test.message);
    }
  });

  it('should evaluate integer literals', () => {
    const tests = [
      {input: '5', expected: 5},
      {input: '10', expected: 10},
      {input: '-5', expected: -5},
      {input: '-10', expected: -10},
      {input: '5 + 5 + 5 + 5 - 10', expected: 10},
      {input: '5 * 2 + 10', expected: 20},
      {input: '50 / 2 * 2 + 10', expected: 60},
      {input: '2 * (5 + 10)', expected: 30},
      {input: '5 / 2', expected: 2},
      {input: '-5 / 2', expected: -2},
      {input: '5 / -2', expected: -2},
      {input: '-5 / -2', expected: 2},
    ];

    for (const test of tests) {
      const evaluated = testEvaluate(test.input) as IntegerObj;
      expect(evaluated.value).toBe(test.expected);
    }
  });

  it('should evaluate string literals', () => {
    const tests = [
      {input: '"hello world"', expected: 'hello world'},
      {input: '"hello" + " " + "world"', expected: 'hello world'},
      {input: '"hello" == "hello"', expected: true},
      {input: '"hello" != "hello"', expected: false},
      {input: '"hello" == "world"', expected: false},
      {input: '"hello" != "world"', expected: true},
    ];

    for (const test of tests) {
      const evaluated = testEvaluate(test.input) as StringObj;
      expect(evaluated.value).toBe(test.expected);
    }
  });

  it('should evaluate boolean literals', () => {
    const tests = [
      {input: 'true', expected: true},
      {input: 'false', expected: false},
      {input: 'true == true', expected: true},
      {input: 'false == false', expected: true},
      {input: 'true == false', expected: false},
      {input: 'true != false', expected: true},
      {input: 'true != true', expected: false},
      {input: '(1 < 2) == true', expected: true},
      {input: '(1 < 2) == false', expected: false},
      {input: '(1 > 2) == true', expected: false},
      {input: '(1 > 2) == false', expected: true},
      {input: '1 < 2', expected: true},
      {input: '1 > 2', expected: false},
      {input: '1 < 1', expected: false},
      {input: '1 > 1', expected: false},
      {input: '1 == 1', expected: true},
      {input: '1 != 1', expected: false},
      {input: '1 == 2', expected: false},
      {input: '1 != 2', expected: true},
    ];

    for (const test of tests) {
      const evaluated = testEvaluate(test.input) as BooleanObj;
      expect(evaluated.value).toBe(test.expected);
    }
  });

  it('should evaluate ! operator', () => {
    const tests = [
      {input: '!true', expected: false},
      {input: '!false', expected: true},
      {input: '!5', expected: false},
      {input: '!!true', expected: true},
      {input: '!!false', expected: false},
      {input: '!!5', expected: true},
    ];

    for (const test of tests) {
      const evaluated = testEvaluate(test.input) as BooleanObj;
      expect(evaluated.value).toBe(test.expected);
    }
  });

  it('should evaluate conditionals', () => {
    const tests = [
      {input: 'if (true) { 10 }', expected: 10},
      {input: 'if (false) { 10 }', expected: undefined},
      {input: 'if (1) { 10 }', expected: 10},
      {input: 'if (1 < 2) { 10 }', expected: 10},
      {input: 'if (1 > 2) { 10 }', expected: undefined},
      {input: 'if (1 > 2) { 10 } else { 20 }', expected: 20},
      {input: 'if (1 < 2) { 10 } else { 20 }', expected: 10},
    ];

    for (const test of tests) {
      const evaluated = testEvaluate(test.input) as BooleanObj;
      if (!evaluated.value) {
        expect(evaluated.inspect()).toBe(new NullObj().inspect());
      }
      expect(evaluated.value).toBe(test.expected);
    }
  });

  it('should evaluate return statements', () => {
    const tests = [
      {input: 'return 10;', expected: 10},
      {input: 'return 10; 9;', expected: 10},
      {input: 'return 2 * 5; 9;', expected: 10},
      {input: '9; return 2 * 5; 9;', expected: 10},
      {
        input: 'if (10 > 1) { if (10 > 1) { return 10; } return 1; }',
        expected: 10,
      },
    ];

    for (const test of tests) {
      const evaluated = testEvaluate(test.input) as IntegerObj;
      expect(evaluated.value).toBe(test.expected);
    }
  });

  it('should evaluate let statements', () => {
    const tests = [
      {input: 'let a = 5; a;', expected: 5},
      {input: 'let a = 5 * 5; a;', expected: 25},
      {input: 'let a = 5; let b = a; b;', expected: 5},
      {input: 'let a = 5; let b = a; let c = a + b + 5; c;', expected: 15},
    ];

    for (const test of tests) {
      const evaluated = testEvaluate(test.input) as IntegerObj;
      expect(evaluated.value).toBe(test.expected);
    }
  });

  it('should evaluate functions literals', () => {
    const input = 'fn(x) { x + 2; };';

    const evaluated = testEvaluate(input) as FunctionObj;
    expect(evaluated.parameters).toHaveLength(1);
    expect(evaluated.parameters[0].string()).toEqual('x');
    expect(evaluated.body.string()).toEqual('(x + 2);');
  });

  it('should evaluate functions calls', () => {
    const tests = [
      {input: 'let identity = fn(x) { x; }; identity(5);', expected: 5},
      {input: 'let identity = fn(x) { return x; }; identity(5);', expected: 5},
      {input: 'let double = fn(x) { x * 2; }; double(5);', expected: 10},
      {input: 'let add = fn(x, y) { x + y; }; add(5, 5);', expected: 10},
      {
        input: 'let add = fn(x, y) { x + y; }; add(5 + 5, add(5, 5));',
        expected: 20,
      },
      {input: 'fn(x) { x; }(5)', expected: 5},
    ];

    for (const test of tests) {
      const evaluated = testEvaluate(test.input) as IntegerObj;
      expect(evaluated.value).toBe(test.expected);
    }
  });

  it('should evaluate closures', () => {
    const input = `
      let newAdder = fn(x) {
        fn(y) { x + y };
      };

      let addTwo = newAdder(2);
      addTwo(2);
    `;

    const evaluated = testEvaluate(input) as IntegerObj;
    expect(evaluated.value).toBe(4);
  });

  it('should evaluate builtins', () => {
    const tests = [
      {input: 'len("");', expected: 0},
      {input: 'len("four");', expected: 4},
      {input: 'len("hello world");', expected: 11},
      {input: 'len(1);', expected: "argument INTEGER to 'len' not supported"},
      {
        input: 'len("one", "two");',
        expected: 'invalid number of arguments for `len`',
      },
    ];

    for (const test of tests) {
      const evaluated = testEvaluate(test.input);
      if (evaluated instanceof ErrorObj) {
        expect(evaluated.message).toBe(test.expected);
      } else {
        const evaluatedInt = evaluated as IntegerObj;
        expect(evaluatedInt.value).toBe(test.expected);
      }
    }
  });
});
