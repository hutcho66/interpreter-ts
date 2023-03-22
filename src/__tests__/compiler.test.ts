import {make, Opcode, Instructions, disassemble} from '../code';
import Lexer from '../lexer';
import Parser from '../parser';
import Compiler from '../compiler';
import {IntegerObj, Obj} from '../object';

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

type CompilerTestCase = {
  input: string;
  expectedConstants: number[];
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
      testIntegerObject(test.expectedConstants[i], bytecode.constants[i]);
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
});
