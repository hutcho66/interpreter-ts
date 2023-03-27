import {
  Opcode,
  make,
  Instructions,
  disassemble,
  lookupDefinition,
  readOperands,
} from '../code';

function concatInstructions(insArray: Instructions[]): Instructions {
  return Buffer.concat(insArray);
}

describe('code', () => {
  it('should read operands from instructions', () => {
    const tests = [
      {
        op: Opcode.OpConstant,
        operands: [65535],
        bytesRead: 2,
      },
      {
        op: Opcode.OpGetLocal,
        operands: [255],
        bytesRead: 1,
      },
      {
        op: Opcode.OpClosure,
        operands: [65535, 255],
        bytesRead: 3,
      },
    ];

    for (const test of tests) {
      const instruction = make(test.op, ...test.operands);
      const def = lookupDefinition(test.op);
      expect(def).not.toBeUndefined();

      const readResponse = readOperands(def!, instruction, 1);
      expect(readResponse.bytesRead).toEqual(test.bytesRead);
      expect(readResponse.operands).toEqual(test.operands);
    }
  });

  it('should print instructions', () => {
    const instructions = concatInstructions([
      make(Opcode.OpAdd),
      make(Opcode.OpGetLocal, 1),
      make(Opcode.OpConstant, 2),
      make(Opcode.OpConstant, 65535),
      make(Opcode.OpClosure, 65535, 255),
    ]);

    const expected =
      '0000 OpAdd\n' +
      '0001 OpGetLocal 1\n' +
      '0003 OpConstant 2\n' +
      '0006 OpConstant 65535\n' +
      '0009 OpClosure 65535 255';

    expect(disassemble(instructions)).toEqual(expected);
  });

  it('should create bytecode instructions', () => {
    const tests = [
      {
        op: Opcode.OpConstant,
        operands: [65534],
        expected: Buffer.from([Opcode.OpConstant, 255, 254]),
      },
      {
        op: Opcode.OpAdd,
        operands: [],
        expected: Buffer.from([Opcode.OpAdd]),
      },
      {
        op: Opcode.OpGetLocal,
        operands: [255],
        expected: Buffer.from([Opcode.OpGetLocal, 255]),
      },
      {
        op: Opcode.OpClosure,
        operands: [65534, 255],
        expected: Buffer.from([Opcode.OpClosure, 255, 254, 255]),
      },
    ];

    for (const test of tests) {
      const instruction = make(test.op, ...test.operands);
      expect(instruction.length).toBe(test.expected.length);
      expect(instruction).toEqual(test.expected);
    }
  });
});
