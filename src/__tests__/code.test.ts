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
      make(Opcode.OpConstant, 2),
      make(Opcode.OpConstant, 65535),
    ]);

    const expected =
      '0000 OpAdd\n' + '0001 OpConstant 2\n' + '0004 OpConstant 65535';

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
    ];

    for (const test of tests) {
      const instruction = make(test.op, ...test.operands);
      expect(instruction.length).toBe(test.expected.length);
      expect(instruction).toEqual(test.expected);
    }
  });
});
