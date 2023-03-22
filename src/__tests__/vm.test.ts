import Compiler from '../compiler';
import Lexer from '../lexer';
import {Obj, IntegerObj, BooleanObj} from '../object';
import Parser from '../parser';
import VM from '../vm';

function parse(input: string) {
  const l = new Lexer(input);
  const p = new Parser(l);
  return p.parseProgram();
}

function testIntegerObject(expected: number, actual: Obj) {
  expect(actual).toBeInstanceOf(IntegerObj);
  expect((<IntegerObj>actual).value).toBe(expected);
}

function testBooleanObject(expected: boolean, actual: Obj) {
  expect(actual).toBeInstanceOf(BooleanObj);
  expect((<BooleanObj>actual).value).toBe(expected);
}

function testExpectedObject(expected: unknown, actual: Obj) {
  switch (typeof expected) {
    case 'number':
      return testIntegerObject(expected, actual);
    case 'boolean':
      return testBooleanObject(expected, actual);
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
      // {input: '1', expected: 1},
      // {input: '2', expected: 2},
      // {input: '-3', expected: -3},
      // {input: '1 + 2', expected: 3},
      // {input: '1 - 2', expected: -1},
      // {input: '1 * 2', expected: 2},
      // {input: '6 / 2', expected: 3},
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
    ];

    runVmTests(tests);
  });
});
