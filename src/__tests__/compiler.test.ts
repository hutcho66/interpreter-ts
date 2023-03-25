import {make, Opcode, Instructions, disassemble} from '../code';
import Lexer from '../lexer';
import Parser from '../parser';
import Compiler from '../compiler';
import {IntegerObj, Obj, StringObj} from '../object';

function parse(input: string) {
  const l = new Lexer(input);
  const p = new Parser(l);
  return p.parseProgram();
}

function concatInstructions(insArray: Instructions[]): Instructions {
  return Buffer.concat(insArray);
}

function testIntegerObject(expected: number, actual: Obj) {
  expect(actual).toBeInstanceOf(IntegerObj);
  expect((<IntegerObj>actual).value).toBe(expected);
}

function testStringObject(expected: string, actual: Obj) {
  expect(actual).toBeInstanceOf(StringObj);
  expect((<StringObj>actual).value).toBe(expected);
}

type CompilerTestCase = {
  input: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  expectedConstants: unknown[];
  expectedInstructions: Instructions[];
};

function runCompilerTests(tests: CompilerTestCase[]) {
  for (const test of tests) {
    const expectedInstructions = concatInstructions(test.expectedInstructions);

    const p = parse(test.input);
    const c = new Compiler();
    c.compile(p);

    const bytecode = c.bytecode();
    expect(disassemble(bytecode.instructions)).toEqual(
      disassemble(expectedInstructions)
    );
    for (const i in test.expectedConstants) {
      const constant = test.expectedConstants[i];
      if (typeof constant === 'number')
        testIntegerObject(constant, bytecode.constants[i]);
      if (typeof constant === 'string')
        testStringObject(constant, bytecode.constants[i]);
    }
  }
}

describe('compiler', () => {
  it('should compile integer arithmetic', () => {
    const tests = [
      {
        input: '1; 2',
        expectedConstants: [1, 2],
        expectedInstructions: [
          make(Opcode.OpConstant, 0),
          make(Opcode.OpPop),
          make(Opcode.OpConstant, 1),
          make(Opcode.OpPop),
        ],
      },
      {
        input: '1 + 2',
        expectedConstants: [1, 2],
        expectedInstructions: [
          make(Opcode.OpConstant, 0),
          make(Opcode.OpConstant, 1),
          make(Opcode.OpAdd),
          make(Opcode.OpPop),
        ],
      },
      {
        input: '1 - 2',
        expectedConstants: [1, 2],
        expectedInstructions: [
          make(Opcode.OpConstant, 0),
          make(Opcode.OpConstant, 1),
          make(Opcode.OpSub),
          make(Opcode.OpPop),
        ],
      },
      {
        input: '1 * 2',
        expectedConstants: [1, 2],
        expectedInstructions: [
          make(Opcode.OpConstant, 0),
          make(Opcode.OpConstant, 1),
          make(Opcode.OpMul),
          make(Opcode.OpPop),
        ],
      },
      {
        input: '2 / 1',
        expectedConstants: [2, 1],
        expectedInstructions: [
          make(Opcode.OpConstant, 0),
          make(Opcode.OpConstant, 1),
          make(Opcode.OpDiv),
          make(Opcode.OpPop),
        ],
      },
      {
        input: '-3',
        expectedConstants: [3],
        expectedInstructions: [
          make(Opcode.OpConstant, 0),
          make(Opcode.OpMinus),
          make(Opcode.OpPop),
        ],
      },
    ];

    runCompilerTests(tests);
  });

  it('should compile boolean expressions', () => {
    const tests = [
      {
        input: 'true',
        expectedConstants: [],
        expectedInstructions: [make(Opcode.OpTrue), make(Opcode.OpPop)],
      },
      {
        input: 'false',
        expectedConstants: [],
        expectedInstructions: [make(Opcode.OpFalse), make(Opcode.OpPop)],
      },
      {
        input: '1 > 2',
        expectedConstants: [1, 2],
        expectedInstructions: [
          make(Opcode.OpConstant, 0),
          make(Opcode.OpConstant, 1),
          make(Opcode.OpGreaterThan),
          make(Opcode.OpPop),
        ],
      },
      {
        input: '1 < 2',
        expectedConstants: [2, 1],
        expectedInstructions: [
          make(Opcode.OpConstant, 0),
          make(Opcode.OpConstant, 1),
          make(Opcode.OpGreaterThan),
          make(Opcode.OpPop),
        ],
      },
      {
        input: '1 == 2',
        expectedConstants: [1, 2],
        expectedInstructions: [
          make(Opcode.OpConstant, 0),
          make(Opcode.OpConstant, 1),
          make(Opcode.OpEqual),
          make(Opcode.OpPop),
        ],
      },
      {
        input: '1 != 2',
        expectedConstants: [1, 2],
        expectedInstructions: [
          make(Opcode.OpConstant, 0),
          make(Opcode.OpConstant, 1),
          make(Opcode.OpNotEqual),
          make(Opcode.OpPop),
        ],
      },
      {
        input: 'true == false',
        expectedConstants: [],
        expectedInstructions: [
          make(Opcode.OpTrue),
          make(Opcode.OpFalse),
          make(Opcode.OpEqual),
          make(Opcode.OpPop),
        ],
      },
      {
        input: 'true != false',
        expectedConstants: [],
        expectedInstructions: [
          make(Opcode.OpTrue),
          make(Opcode.OpFalse),
          make(Opcode.OpNotEqual),
          make(Opcode.OpPop),
        ],
      },
      {
        input: '!true',
        expectedConstants: [],
        expectedInstructions: [
          make(Opcode.OpTrue),
          make(Opcode.OpBang),
          make(Opcode.OpPop),
        ],
      },
    ];

    runCompilerTests(tests);
  });

  it('should compile string expressions', () => {
    const tests = [
      {
        input: '"monkey"',
        expectedConstants: ['monkey'],
        expectedInstructions: [make(Opcode.OpConstant, 0), make(Opcode.OpPop)],
      },
      {
        input: '"mon" + "key"',
        expectedConstants: ['mon', 'key'],
        expectedInstructions: [
          make(Opcode.OpConstant, 0),
          make(Opcode.OpConstant, 1),
          make(Opcode.OpAdd),
          make(Opcode.OpPop),
        ],
      },
    ];

    runCompilerTests(tests);
  });

  it('should compile array literals', () => {
    const tests = [
      {
        input: '[]',
        expectedConstants: [],
        expectedInstructions: [make(Opcode.OpArray, 0), make(Opcode.OpPop)],
      },
      {
        input: '[1, 2, 3]',
        expectedConstants: [1, 2, 3],
        expectedInstructions: [
          make(Opcode.OpConstant, 0),
          make(Opcode.OpConstant, 1),
          make(Opcode.OpConstant, 2),
          make(Opcode.OpArray, 3),
          make(Opcode.OpPop),
        ],
      },
      {
        input: '[1 + 2, 3 - 4, 5 * 6]',
        expectedConstants: [1, 2, 3, 4, 5, 6],
        expectedInstructions: [
          make(Opcode.OpConstant, 0),
          make(Opcode.OpConstant, 1),
          make(Opcode.OpAdd),
          make(Opcode.OpConstant, 2),
          make(Opcode.OpConstant, 3),
          make(Opcode.OpSub),
          make(Opcode.OpConstant, 4),
          make(Opcode.OpConstant, 5),
          make(Opcode.OpMul),
          make(Opcode.OpArray, 3),
          make(Opcode.OpPop),
        ],
      },
    ];

    runCompilerTests(tests);
  });

  it('should compile hash literals', () => {
    const tests = [
      {
        input: '{}',
        expectedConstants: [],
        expectedInstructions: [make(Opcode.OpHash, 0), make(Opcode.OpPop)],
      },
      {
        input: '{1: 2, 3: 4, 5: 6}',
        expectedConstants: [1, 2, 3, 4, 5, 6],
        expectedInstructions: [
          make(Opcode.OpConstant, 0),
          make(Opcode.OpConstant, 1),
          make(Opcode.OpConstant, 2),
          make(Opcode.OpConstant, 3),
          make(Opcode.OpConstant, 4),
          make(Opcode.OpConstant, 5),
          make(Opcode.OpHash, 6),
          make(Opcode.OpPop),
        ],
      },
      {
        input: '{1: 2 + 3, 4: 5 * 6}',
        expectedConstants: [1, 2, 3, 4, 5, 6],
        expectedInstructions: [
          make(Opcode.OpConstant, 0),
          make(Opcode.OpConstant, 1),
          make(Opcode.OpConstant, 2),
          make(Opcode.OpAdd),
          make(Opcode.OpConstant, 3),
          make(Opcode.OpConstant, 4),
          make(Opcode.OpConstant, 5),
          make(Opcode.OpMul),
          make(Opcode.OpHash, 4),
          make(Opcode.OpPop),
        ],
      },
    ];

    runCompilerTests(tests);
  });

  it('should compile index expressions', () => {
    const tests = [
      {
        input: '[1, 2, 3][1 + 1]',
        expectedConstants: [1, 2, 3, 1, 1],
        expectedInstructions: [
          make(Opcode.OpConstant, 0),
          make(Opcode.OpConstant, 1),
          make(Opcode.OpConstant, 2),
          make(Opcode.OpArray, 3),
          make(Opcode.OpConstant, 3),
          make(Opcode.OpConstant, 4),
          make(Opcode.OpAdd),
          make(Opcode.OpIndex),
          make(Opcode.OpPop),
        ],
      },
      {
        input: '{1: 2}[2 - 1]',
        expectedConstants: [1, 2, 2, 1],
        expectedInstructions: [
          make(Opcode.OpConstant, 0),
          make(Opcode.OpConstant, 1),
          make(Opcode.OpHash, 2),
          make(Opcode.OpConstant, 2),
          make(Opcode.OpConstant, 3),
          make(Opcode.OpSub),
          make(Opcode.OpIndex),
          make(Opcode.OpPop),
        ],
      },
    ];

    runCompilerTests(tests);
  });

  it('should compile conditionals', () => {
    const tests = [
      {
        input: 'if (true) { 10 }; 3333;',
        expectedConstants: [10, 3333],
        expectedInstructions: [
          // 0000
          make(Opcode.OpTrue),
          // 0001
          make(Opcode.OpJumpNotTruthy, 10),
          // 0004
          make(Opcode.OpConstant, 0),
          // 0007
          make(Opcode.OpJump, 11),
          // 0010
          make(Opcode.OpNull),
          // 0011
          make(Opcode.OpPop),
          // 0012
          make(Opcode.OpConstant, 1),
          // 0015
          make(Opcode.OpPop),
        ],
      },
      {
        input: 'if (true) { 10 } else { 20 }; 3333;',
        expectedConstants: [10, 20, 3333],
        expectedInstructions: [
          // 0000
          make(Opcode.OpTrue),
          // 0001
          make(Opcode.OpJumpNotTruthy, 10),
          // 0004
          make(Opcode.OpConstant, 0),
          // 0007
          make(Opcode.OpJump, 13),
          // 0010
          make(Opcode.OpConstant, 1),
          // 0013
          make(Opcode.OpPop),
          // 0014
          make(Opcode.OpConstant, 2),
          // 0017
          make(Opcode.OpPop),
        ],
      },
    ];

    runCompilerTests(tests);
  });

  it('should compile global let statements', () => {
    const tests = [
      {
        input: 'let one = 1; let two = 2;',
        expectedConstants: [1, 2],
        expectedInstructions: [
          make(Opcode.OpConstant, 0),
          make(Opcode.OpSetGlobal, 0),
          make(Opcode.OpConstant, 1),
          make(Opcode.OpSetGlobal, 1),
        ],
      },
      {
        input: 'let one = 1; one;',
        expectedConstants: [1],
        expectedInstructions: [
          make(Opcode.OpConstant, 0),
          make(Opcode.OpSetGlobal, 0),
          make(Opcode.OpGetGlobal, 0),
          make(Opcode.OpPop),
        ],
      },
      {
        input: 'let one = 1; let two = one; two;',
        expectedConstants: [1],
        expectedInstructions: [
          make(Opcode.OpConstant, 0),
          make(Opcode.OpSetGlobal, 0),
          make(Opcode.OpGetGlobal, 0),
          make(Opcode.OpSetGlobal, 1),
          make(Opcode.OpGetGlobal, 1),
          make(Opcode.OpPop),
        ],
      },
    ];

    runCompilerTests(tests);
  });
});
