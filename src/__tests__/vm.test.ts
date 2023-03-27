import {NULL} from '../builtins';
import Compiler from '../compiler';
import Lexer from '../lexer';
import {
  Obj,
  IntegerObj,
  BooleanObj,
  StringObj,
  ArrayObj,
  HashKey,
} from '../object';
import Parser from '../parser';
import VM from '../vm';
import {HashObj} from '../object';

function parse(input: string) {
  const l = new Lexer(input);
  const p = new Parser(l);
  return p.parseProgram();
}

function testIntegerObject(expected: number, actual: Obj) {
  expect(actual).toBeInstanceOf(IntegerObj);
  expect((<IntegerObj>actual).value).toBe(expected);
}

function testStringObject(expected: string, actual: Obj) {
  expect(actual).toBeInstanceOf(StringObj);
  expect((<StringObj>actual).value).toBe(expected);
}

function testBooleanObject(expected: boolean, actual: Obj) {
  expect(actual).toBeInstanceOf(BooleanObj);
  expect((<BooleanObj>actual).value).toBe(expected);
}

function testArrayObject(expected: unknown[], actual: Obj) {
  expect(actual).toBeInstanceOf(ArrayObj);
  const actualArray = actual as ArrayObj;
  expect(actualArray.elements).toHaveLength(expected.length);
  expected.forEach((el, idx) => {
    testExpectedObject(el, actualArray.elements[idx]);
  });
}

function testHashObject(expected: Map<HashKey, unknown>, actual: Obj) {
  expect(actual).toBeInstanceOf(HashObj);
  const actualHash = actual as HashObj;
  expect(actualHash.pairs.size).toBe(expected.size);
  expected.forEach((val, key) => {
    const actualPair = actualHash.pairs.get(key);
    expect(actualPair).not.toBeUndefined();
    testExpectedObject(key, actualPair!.key);
    testExpectedObject(val, actualPair!.value);
  });
}

function testError(expected: Error, actual: Error) {
  expect(actual.message).toEqual(expected.message);
}

function testExpectedObject(expected: unknown, actual: Obj) {
  switch (typeof expected) {
    case 'number':
      return testIntegerObject(expected, actual);
    case 'boolean':
      return testBooleanObject(expected, actual);
    case 'string':
      return testStringObject(expected, actual);
    case 'object':
      if (expected instanceof Array) {
        return testArrayObject(expected, actual);
      } else if (expected instanceof Map) {
        return testHashObject(expected, actual);
      } else if (expected === null) {
        expect(actual).toEqual(NULL);
      }
  }
}

type VMTestCase = {
  input: string;
  expected: unknown;
};

function runVmTests(tests: VMTestCase[]) {
  for (const test of tests) {
    const program = parse(test.input);
    const compiler = new Compiler();

    compiler.compile(program);

    // console.log(compiler.bytecode().constants);
    // console.log(disassemble(compiler.bytecode().instructions));

    const vm = new VM(compiler.bytecode());
    if (test.expected instanceof Error) {
      try {
        vm.run();
      } catch (e) {
        expect(e).toBeInstanceOf(Error);
        testError(test.expected, e as Error);
        continue;
      }
    }

    vm.run();

    const stackElement = vm.lastPoppedStackElement();

    expect(stackElement).not.toBeNull();
    testExpectedObject(test.expected, stackElement!);
  }
}

describe('vm', () => {
  it('should run integer arithmetic', () => {
    const tests: VMTestCase[] = [
      {input: '1', expected: 1},
      {input: '2', expected: 2},
      {input: '-3', expected: -3},
      {input: '1 + 2', expected: 3},
      {input: '1 - 2', expected: -1},
      {input: '1 * 2', expected: 2},
      {input: '6 / 2', expected: 3},
      {input: '5 * (2 + -10)', expected: -40},
    ];

    runVmTests(tests);
  });

  it('should run boolean expressions', () => {
    const tests: VMTestCase[] = [
      {input: 'true', expected: true},
      {input: 'false', expected: false},
      {input: '!true', expected: false},
      {input: '!!true', expected: true},
      {input: '1 < 2', expected: true},
      {input: '1 > 2', expected: false},
      {input: '1 == 2', expected: false},
      {input: '1 != 2', expected: true},
      {input: 'true == true', expected: true},
      {input: 'true == false', expected: false},
      {input: '!(if (false) { 5; })', expected: true},
    ];

    runVmTests(tests);
  });

  it('should run string expressions', () => {
    const tests: VMTestCase[] = [
      {input: '"monkey"', expected: 'monkey'},
      {input: '"mon" + "key"', expected: 'monkey'},
      {input: '"mon" + "key" + "banana"', expected: 'monkeybanana'},
    ];

    runVmTests(tests);
  });

  it('should run array literals', () => {
    const tests: VMTestCase[] = [
      {input: '[]', expected: []},
      {input: '[1, 2, 3]', expected: [1, 2, 3]},
      {input: '[1 + 2, 3 * 4, 5 + 6]', expected: [3, 12, 11]},
    ];

    runVmTests(tests);
  });

  it('should run hash literals', () => {
    const tests: VMTestCase[] = [
      {input: '{}', expected: new Map<HashKey, Obj>()},
      {
        input: '{1: 2, 2: 3}',
        expected: new Map<HashKey, number>([
          [new IntegerObj(1).hash(), 2],
          [new IntegerObj(2).hash(), 3],
        ]),
      },
      {
        input: '{1+1: 2*2, 3+3: 4*4}',
        expected: new Map<HashKey, number>([
          [new IntegerObj(2).hash(), 4],
          [new IntegerObj(6).hash(), 16],
        ]),
      },
    ];

    runVmTests(tests);
  });

  it('should run index expressions', () => {
    const tests: VMTestCase[] = [
      {input: '[1, 2, 3][1]', expected: 2},
      {input: '[1, 2, 3][0+2]', expected: 3},
      {input: '[[1, 1, 1]][0][0]', expected: 1},
      {input: '[][0]', expected: null},
      {input: '[1, 2, 3][99]', expected: null},
      {input: '[1][-1]', expected: null},
      {input: '{1: 1, 2: 2}[1]', expected: 1},
      {input: '{1: 1, 2: 2}[2]', expected: 2},
      {input: '{1: 1}[0]', expected: null},
      {input: '{}[0]', expected: null},
    ];

    runVmTests(tests);
  });

  it('should run conditional expressions', () => {
    const tests: VMTestCase[] = [
      {input: 'if (true) { 10 }', expected: 10},
      {input: 'if (true) { 10 } else { 20 }', expected: 10},
      {input: 'if (false) { 10 } else { 20 }', expected: 20},
      {input: 'if (1) { 10 }', expected: 10},
      {input: 'if (1 < 2) { 10 }', expected: 10},
      {input: 'if (1 < 2) { 10 } else { 20 }', expected: 10},
      {input: 'if (1 > 2) { 10 } else { 20 }', expected: 20},
      {input: 'if (1 > 2) { 10 }', expected: null},
      {input: 'if (false) { 10 }', expected: null},
      {input: 'if (if (false) { 10 }) { 10 } else { 20 }', expected: 20},
    ];

    runVmTests(tests);
  });

  it('should run global let statements', () => {
    const tests: VMTestCase[] = [
      {input: 'let one = 1; one', expected: 1},
      {input: 'let one = 1; let two = 2; one + two', expected: 3},
      {input: 'let one = 1; let two = one + one; one + two', expected: 3},
    ];

    runVmTests(tests);
  });

  it('should run function literals and calls', () => {
    const tests: VMTestCase[] = [
      {
        input: 'let fivePlusTen = fn() { 5 + 10; }; fivePlusTen();',
        expected: 15,
      },
      {
        input: 'let one = fn() { 1; }; let two = fn() { 2; }; one() + two();',
        expected: 3,
      },
      {
        input:
          'let a = fn() { 1; }; let b = fn() { a() + 1; }; let c = fn() { b() + 1;}; c();',
        expected: 3,
      },
      {
        input: 'let earlyExit = fn() { return 99; 100; }; earlyExit();',
        expected: 99,
      },
      {
        input: 'let earlyExit = fn() { return 99; return 100; }; earlyExit();',
        expected: 99,
      },
      {
        input: 'let noReturn = fn() { }; noReturn();',
        expected: null,
      },
      {
        input: 'let noReturn = fn() { }; fn() { noReturn(); }();',
        expected: null,
      },
      {
        input: `let globalSeed = 50;
        let minusOne = fn() {
          let num = 1;
          globalSeed - num;
        }
        let minusTwo = fn() {
          let num = 2;
          globalSeed - num;
        }
        minusOne() + minusTwo();`,
        expected: 97,
      },
      {
        input: `let globalNum = 10;
        let sum = fn(a, b) {
          let c = a + b;
          c + globalNum;
        };

        let outer = fn() {
          sum(1, 2) + sum(3, 4) + globalNum;
        };

        outer() + globalNum;`,
        expected: 50,
      },
      {
        input: 'fn() { 1; }(1)',
        expected: new Error('wrong number of arguments: expected 0, got 1'),
      },
      {
        input: 'fn(a) { a; }()',
        expected: new Error('wrong number of arguments: expected 1, got 0'),
      },
      {
        input: 'fn(a, b) { a + b; }(1)',
        expected: new Error('wrong number of arguments: expected 2, got 1'),
      },
      {
        input: 'fn(a) { a(); }(1)',
        expected: new Error('cannot call object of type INTEGER'),
      },
    ];

    runVmTests(tests);
  });

  it('should run builtin calls', () => {
    const tests: VMTestCase[] = [
      {
        input: 'len("")',
        expected: 0,
      },
      {
        input: 'len("four")',
        expected: 4,
      },
      {
        input: 'len(1)',
        expected: new Error("argument INTEGER to 'len' not supported"),
      },
      {
        input: 'len("one", "two")',
        expected: new Error("invalid number of arguments for 'len'"),
      },
    ];

    runVmTests(tests);
  });

  it('should run closures', () => {
    const tests: VMTestCase[] = [
      {
        input: `let newClosure = fn(a) {
          fn() { a; }
        };
        let closure = newClosure(99);
        closure();`,
        expected: 99,
      },
      {
        input: `let newAdder = fn(a, b) {
          fn(c) { a + b + c};
        };
        let adder = newAdder(1, 2);
        adder(8);`,
        expected: 11,
      },
      {
        input: `let newAdder = fn(a, b) {
          let c = a + b;
          fn(d) { c + d }
        };
        let adder = newAdder(1, 2);
        adder(8);`,
        expected: 11,
      },
      {
        input: `let newClosure = fn(a, b) {
          let one = fn() { a; };
          let two = fn() { b; };
          return fn() { one() + two(); };
        };
        let closure = newClosure(9, 90);
        closure();`,
        expected: 99,
      },
      {
        input: `let countdown = fn(x) {
          if (x == 0) {
            return 0;
          } else {
            countdown(x - 1);
          }
        };
        countdown(1);
        `,
        expected: 0,
      },
      {
        input: `let countdown = fn(x) {
          if (x == 0) {
            return 0;
          } else {
            countdown(x - 1);
          }
        };
        let wrapper = fn() {
          countdown(1);
        }
        wrapper();
        `,
        expected: 0,
      },
      {
        input: `let wrapper = fn() {
          let countdown = fn(x) {
            if (x == 0) {
              return 0;
            } else {
              countdown(x - 1);
            }
          };
          countdown(1);
        };
        wrapper();
        `,
        expected: 0,
      },
    ];

    runVmTests(tests);
  });
});

describe('RUNS FIBONACCI RECURSION!', () => {
  it('should run recursive fibonacci function', () => {
    const tests: VMTestCase[] = [
      {
        input: `
        let fib = fn(x) {
          if (x == 0) {
            return 0;
          } else {
            if (x == 1) {
              return 1;
            } else {
              return fib(x - 1) + fib(x - 2);
            }
          }
        };
        fib(15);`,
        expected: 610,
      },
    ];

    runVmTests(tests);
  });
});
