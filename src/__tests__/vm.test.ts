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

    const vm = new VM(compiler.bytecode());
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
});
