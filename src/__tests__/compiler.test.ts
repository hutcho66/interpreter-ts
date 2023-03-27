import {make, Opcode, Instructions, disassemble} from '../code';
import Lexer from '../lexer';
import Parser from '../parser';
import Compiler from '../compiler';
import {CompiledFunctionObj, IntegerObj, Obj, StringObj} from '../object';

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

function testInstructions(expected: Instructions[], actual: Instructions) {
  const expectedInstructions = concatInstructions(expected);
  expect(actual).toBeInstanceOf(Buffer);
  expect(disassemble(actual as unknown as Buffer)).toEqual(
    disassemble(expectedInstructions)
  );
}

type CompilerTestCase = {
  input: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  expectedConstants: unknown[];
  expectedInstructions: Instructions[];
};

function runCompilerTests(tests: CompilerTestCase[]) {
  for (const test of tests) {
    const p = parse(test.input);
    const c = new Compiler();
    c.compile(p);

    const bytecode = c.bytecode();
    testInstructions(test.expectedInstructions, bytecode.instructions);

    for (const i in test.expectedConstants) {
      const constant = test.expectedConstants[i];
      if (typeof constant === 'number')
        testIntegerObject(constant, bytecode.constants[i]);
      if (typeof constant === 'string')
        testStringObject(constant, bytecode.constants[i]);
      if (constant instanceof Array && constant[0] instanceof Buffer) {
        const fn = bytecode.constants[i] as CompiledFunctionObj;
        testInstructions(constant, fn.instructions);
      }
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

  it('should compile local let statements', () => {
    const tests = [
      {
        input: 'fn() { let num = 55; num }',
        expectedConstants: [
          55,
          [
            make(Opcode.OpConstant, 0),
            make(Opcode.OpSetLocal, 0),
            make(Opcode.OpGetLocal, 0),
            make(Opcode.OpReturnValue),
          ],
        ],
        expectedInstructions: [
          make(Opcode.OpClosure, 1, 0),
          make(Opcode.OpPop),
        ],
      },
    ];

    runCompilerTests(tests);
  });

  it('should compile function literals', () => {
    const tests = [
      {
        input: 'fn() { return 5 + 10 }',
        expectedConstants: [
          5,
          10,
          [
            make(Opcode.OpConstant, 0),
            make(Opcode.OpConstant, 1),
            make(Opcode.OpAdd),
            make(Opcode.OpReturnValue),
          ],
        ],
        expectedInstructions: [
          make(Opcode.OpClosure, 2, 0),
          make(Opcode.OpPop),
        ],
      },
      {
        input: 'fn() { 5 + 10 }',
        expectedConstants: [
          5,
          10,
          [
            make(Opcode.OpConstant, 0),
            make(Opcode.OpConstant, 1),
            make(Opcode.OpAdd),
            make(Opcode.OpReturnValue),
          ],
        ],
        expectedInstructions: [
          make(Opcode.OpClosure, 2, 0),
          make(Opcode.OpPop),
        ],
      },
      {
        input: 'fn() { 1; 2 }',
        expectedConstants: [
          1,
          2,
          [
            make(Opcode.OpConstant, 0),
            make(Opcode.OpPop),
            make(Opcode.OpConstant, 1),
            make(Opcode.OpReturnValue),
          ],
        ],
        expectedInstructions: [
          make(Opcode.OpClosure, 2, 0),
          make(Opcode.OpPop),
        ],
      },
      {
        input: 'fn() { }',
        expectedConstants: [[make(Opcode.OpReturnNull)]],
        expectedInstructions: [
          make(Opcode.OpClosure, 0, 0),
          make(Opcode.OpPop),
        ],
      },
    ];

    runCompilerTests(tests);
  });

  it('should compile function calls', () => {
    const tests = [
      {
        input: 'fn() { 24 }()',
        expectedConstants: [
          24,
          [make(Opcode.OpConstant, 0), make(Opcode.OpReturnValue)],
        ],
        expectedInstructions: [
          make(Opcode.OpClosure, 1, 0),
          make(Opcode.OpCall, 0),
          make(Opcode.OpPop),
        ],
      },
      {
        input: 'let noArg = fn() { 24 }; noArg();',
        expectedConstants: [
          24,
          [make(Opcode.OpConstant, 0), make(Opcode.OpReturnValue)],
        ],
        expectedInstructions: [
          make(Opcode.OpClosure, 1, 0),
          make(Opcode.OpSetGlobal, 0),
          make(Opcode.OpGetGlobal, 0),
          make(Opcode.OpCall, 0),
          make(Opcode.OpPop),
        ],
      },
      {
        input: 'let withArgs = fn(a, b, c) {a; b; c;}; withArgs(24, 25, 26);',
        expectedConstants: [
          [
            make(Opcode.OpGetLocal, 0),
            make(Opcode.OpPop),
            make(Opcode.OpGetLocal, 1),
            make(Opcode.OpPop),
            make(Opcode.OpGetLocal, 2),
            make(Opcode.OpReturnValue),
          ],
          24,
          25,
          26,
        ],
        expectedInstructions: [
          make(Opcode.OpClosure, 0, 0),
          make(Opcode.OpSetGlobal, 0),
          make(Opcode.OpGetGlobal, 0),
          make(Opcode.OpConstant, 1),
          make(Opcode.OpConstant, 2),
          make(Opcode.OpConstant, 3),
          make(Opcode.OpCall, 3),
          make(Opcode.OpPop),
        ],
      },
    ];

    runCompilerTests(tests);
  });

  it('should compile builtin calls', () => {
    const tests = [
      {
        input: 'len([]); push([], 1);',
        expectedConstants: [1],
        expectedInstructions: [
          make(Opcode.OpGetBuiltin, 0),
          make(Opcode.OpArray, 0),
          make(Opcode.OpCall, 1),
          make(Opcode.OpPop),
          make(Opcode.OpGetBuiltin, 5),
          make(Opcode.OpArray, 0),
          make(Opcode.OpConstant, 0),
          make(Opcode.OpCall, 2),
          make(Opcode.OpPop),
        ],
      },
    ];

    runCompilerTests(tests);
  });

  it('should compile closures', () => {
    const tests = [
      {
        input: 'fn(a) { fn(b) { a + b } }',
        expectedConstants: [
          [
            make(Opcode.OpGetFree, 0), // a
            make(Opcode.OpGetLocal, 0), // b
            make(Opcode.OpAdd),
            make(Opcode.OpReturnValue),
          ],
          [
            make(Opcode.OpGetLocal, 0), // a
            make(Opcode.OpClosure, 0, 1),
            make(Opcode.OpReturnValue),
          ],
        ],
        expectedInstructions: [
          make(Opcode.OpClosure, 1, 0),
          make(Opcode.OpPop),
        ],
      },
      {
        input: 'fn(a) { fn(b) { fn(c) { a + b + c } } }',
        expectedConstants: [
          [
            make(Opcode.OpGetFree, 0), // a
            make(Opcode.OpGetFree, 1), // b
            make(Opcode.OpAdd),
            make(Opcode.OpGetLocal, 0), // c
            make(Opcode.OpAdd),
            make(Opcode.OpReturnValue),
          ],
          [
            make(Opcode.OpGetFree, 0), // a
            make(Opcode.OpGetLocal, 0), // b
            make(Opcode.OpClosure, 0, 2), // frees: a, b
            make(Opcode.OpReturnValue),
          ],
          [
            make(Opcode.OpGetLocal, 0), // a
            make(Opcode.OpClosure, 1, 1), // frees: a
            make(Opcode.OpReturnValue),
          ],
        ],
        expectedInstructions: [
          make(Opcode.OpClosure, 2, 0),
          make(Opcode.OpPop),
        ],
      },
      {
        input: `let global = 55;
        fn() {
          let a = 66;
          fn() {
            let b = 77;
            fn() {
              let c = 88;
              global + a + b + c;
            }
          }
        }`,
        expectedConstants: [
          55,
          66,
          77,
          88,
          [
            make(Opcode.OpConstant, 3),
            make(Opcode.OpSetLocal, 0), // setting c as local
            make(Opcode.OpGetGlobal, 0), // global is global variable
            make(Opcode.OpGetFree, 0), // a is free to innermost func
            make(Opcode.OpAdd),
            make(Opcode.OpGetFree, 1), // b is free to innermost func
            make(Opcode.OpAdd),
            make(Opcode.OpGetLocal, 0), // c is local
            make(Opcode.OpAdd),
            make(Opcode.OpReturnValue),
          ],
          [
            make(Opcode.OpConstant, 2),
            make(Opcode.OpSetLocal, 0), // setting b as local
            make(Opcode.OpGetFree, 0), // a is free to middle func
            make(Opcode.OpGetLocal, 0), // b is local
            make(Opcode.OpClosure, 4, 2), // create closure with a and b as free variables
            make(Opcode.OpReturnValue),
          ],
          [
            make(Opcode.OpConstant, 1),
            make(Opcode.OpSetLocal, 0), // setting a as local
            make(Opcode.OpGetLocal, 0), // a is local
            make(Opcode.OpClosure, 5, 1), // create closure with a as free variable
            make(Opcode.OpReturnValue),
          ],
        ],
        expectedInstructions: [
          make(Opcode.OpConstant, 0),
          make(Opcode.OpSetGlobal, 0), // set global
          make(Opcode.OpClosure, 6, 0), // create closure with no free variables
          make(Opcode.OpPop),
        ],
      },
      {
        input: 'let countdown = fn(x) { countdown(x - 1); }; countdown(1);',
        expectedConstants: [
          1,
          [
            make(Opcode.OpCurrentClosure),
            make(Opcode.OpGetLocal, 0),
            make(Opcode.OpConstant, 0),
            make(Opcode.OpSub),
            make(Opcode.OpCall, 1),
            make(Opcode.OpReturnValue),
          ],
          1,
        ],
        expectedInstructions: [
          make(Opcode.OpClosure, 1, 0),
          make(Opcode.OpSetGlobal, 0),
          make(Opcode.OpGetGlobal, 0),
          make(Opcode.OpConstant, 2),
          make(Opcode.OpCall, 1),
          make(Opcode.OpPop),
        ],
      },
      {
        input: `let wrapper = fn() {
            let countdown = fn(x) {
              countdown(x - 1);
            };
            countdown(1);
          };
          wrapper();`,
        expectedConstants: [
          1,
          [
            make(Opcode.OpCurrentClosure),
            make(Opcode.OpGetLocal, 0),
            make(Opcode.OpConstant, 0),
            make(Opcode.OpSub),
            make(Opcode.OpCall, 1),
            make(Opcode.OpReturnValue),
          ],
          1,
          [
            make(Opcode.OpClosure, 1, 0),
            make(Opcode.OpSetLocal, 0),
            make(Opcode.OpGetLocal, 0),
            make(Opcode.OpConstant, 2),
            make(Opcode.OpCall, 1),
            make(Opcode.OpReturnValue),
          ],
        ],
        expectedInstructions: [
          make(Opcode.OpClosure, 3, 0),
          make(Opcode.OpSetGlobal, 0),
          make(Opcode.OpGetGlobal, 0),
          make(Opcode.OpCall, 0),
          make(Opcode.OpPop),
        ],
      },
    ];

    runCompilerTests(tests);
  });
});

describe('compiler scopes', () => {
  it('should create scopes', () => {
    const compiler = new Compiler();
    expect(compiler['scopeIndex']).toBe(0);
    const globalSymbols = compiler['symbolTable'];

    // Add OpMul to outer scope
    compiler['emit'](Opcode.OpMul);

    // Enter scope and emit OpSub
    compiler['enterScope']();
    expect(compiler['scopeIndex']).toBe(1);
    compiler['emit'](Opcode.OpSub);
    expect(
      compiler['scopes'][compiler['scopeIndex']].instructions
    ).toHaveLength(1);
    const lastInScope =
      compiler['scopes'][compiler['scopeIndex']].lastInstruction;
    expect(lastInScope.opcode).toBe(Opcode.OpSub);
    expect(compiler['symbolTable']['outer']).toEqual(globalSymbols);

    // Leave scope and emit OpAdd, verify that OpSub is not in outer scope
    compiler['leaveScope']();
    expect(compiler['scopeIndex']).toBe(0);
    compiler['emit'](Opcode.OpAdd);
    expect(
      compiler['scopes'][compiler['scopeIndex']].instructions
    ).toHaveLength(2);
    const lastOutOfScope =
      compiler['scopes'][compiler['scopeIndex']].lastInstruction;
    expect(lastOutOfScope.opcode).toBe(Opcode.OpAdd);
    const previousOutOfScope =
      compiler['scopes'][compiler['scopeIndex']].previousInstruction;
    expect(previousOutOfScope.opcode).toBe(Opcode.OpMul);
    expect(compiler['symbolTable']).toEqual(globalSymbols);
    expect(compiler['symbolTable']['outer']).toBeUndefined();
  });
});
