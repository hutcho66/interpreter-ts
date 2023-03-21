export type Instructions = Buffer;

export const enum Opcode {
  OpConstant,
  OpTrue,
  OpFalse,
  OpPop,
  OpAdd,
  OpSub,
  OpMul,
  OpDiv,
  OpEqual,
  OpNotEqual,
  OpGreaterThan,
}

type Definition = {
  name: string;
  operandWidths: number[];
};

const definitions: {[key in Opcode]?: Definition} = {
  [Opcode.OpConstant]: {
    name: 'OpConstant',
    operandWidths: [2],
  },
  [Opcode.OpTrue]: {
    name: 'OpTrue',
    operandWidths: [],
  },
  [Opcode.OpFalse]: {
    name: 'OpFalse',
    operandWidths: [],
  },
  [Opcode.OpPop]: {
    name: 'OpPop',
    operandWidths: [],
  },
  [Opcode.OpAdd]: {
    name: 'OpAdd',
    operandWidths: [],
  },
  [Opcode.OpSub]: {
    name: 'OpSub',
    operandWidths: [],
  },
  [Opcode.OpMul]: {
    name: 'OpMul',
    operandWidths: [],
  },
  [Opcode.OpDiv]: {
    name: 'OpDiv',
    operandWidths: [],
  },
  [Opcode.OpEqual]: {
    name: 'OpEqual',
    operandWidths: [],
  },
  [Opcode.OpNotEqual]: {
    name: 'OpNotEqual',
    operandWidths: [],
  },
  [Opcode.OpGreaterThan]: {
    name: 'OpGreaterThan',
    operandWidths: [],
  },
};

export function lookupDefinition(op: Opcode): Definition | undefined {
  return definitions[op];
}

export function make(op: Opcode, ...operands: number[]): Instructions {
  const def = lookupDefinition(op);
  if (!def) return Buffer.alloc(0);

  const instructionLength = 1 + def.operandWidths.reduce((a, b) => a + b, 0);
  const buffer = Buffer.alloc(instructionLength);
  buffer.writeUint8(op);

  let offset = 1;
  operands.forEach((operand, i) => {
    const width = def.operandWidths[i];
    switch (width) {
      case 2:
        buffer.writeUint16BE(operand, offset);
    }
    offset += width;
  });

  return buffer;
}

export function readOperands(
  def: Definition,
  instructions: Instructions,
  startOffset: number
): {operands: number[]; bytesRead: number} {
  const operands: number[] = [];
  let offset = startOffset;
  for (const width of def.operandWidths) {
    switch (width) {
      case 2:
        operands.push(instructions.readUint16BE(offset));
    }

    offset += width;
  }

  return {operands, bytesRead: offset - startOffset};
}

export function disassemble(instructions: Instructions) {
  const s: string[] = [];

  let offset = 0;
  while (offset < instructions.length) {
    const def = lookupDefinition(instructions.readUInt8(offset));
    if (!def) {
      s.push(`ERROR: invalid opcode ${instructions.readUInt8(offset)}`);
      continue;
    }

    const readResponse = readOperands(def, instructions, offset + 1);
    s.push(
      `${offset.toString().padStart(4, '0')} ${formatInstruction(
        def,
        readResponse.operands
      )}`
    );

    offset += 1 + readResponse.bytesRead;
  }

  return s.join('\n');
}

function formatInstruction(def: Definition, operands: number[]) {
  if (operands.length !== def.operandWidths.length) {
    return `ERROR: operand len ${operands.length} does not match defined ${def.operandWidths.length}`;
  }

  switch (operands.length) {
    case 0:
      return def.name;
    case 1:
      return `${def.name} ${operands[0]}`;
  }

  return `ERROR: unhandled operand count for ${def.name}`;
}
