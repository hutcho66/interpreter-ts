export type Instructions = Buffer;

export const enum Opcode {
  OpConstant,
  OpTrue,
  OpFalse,
  OpNull,
  OpPop,
  OpMinus,
  OpBang,
  OpAdd,
  OpSub,
  OpMul,
  OpDiv,
  OpEqual,
  OpNotEqual,
  OpGreaterThan,
  OpJumpNotTruthy,
  OpJump,
  OpGetGlobal,
  OpSetGlobal,
  OpGetLocal,
  OpSetLocal,
  OpGetBuiltin,
  OpArray,
  OpHash,
  OpIndex,
  OpCall,
  OpReturnValue,
  OpReturnNull,
  OpClosure,
  OpGetFree,
  OpCurrentClosure,
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
  [Opcode.OpNull]: {
    name: 'OpNull',
    operandWidths: [],
  },
  [Opcode.OpPop]: {
    name: 'OpPop',
    operandWidths: [],
  },
  [Opcode.OpMinus]: {
    name: 'OpMinus',
    operandWidths: [],
  },
  [Opcode.OpBang]: {
    name: 'OpBang',
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
  [Opcode.OpJumpNotTruthy]: {
    name: 'OpJumpNotTruthy',
    operandWidths: [2],
  },
  [Opcode.OpJump]: {
    name: 'OpJump',
    operandWidths: [2],
  },
  [Opcode.OpGetGlobal]: {
    name: 'OpGetGlobal',
    operandWidths: [2],
  },
  [Opcode.OpSetGlobal]: {
    name: 'OpSetGlobal',
    operandWidths: [2],
  },
  [Opcode.OpGetLocal]: {
    name: 'OpGetLocal',
    operandWidths: [1],
  },
  [Opcode.OpSetLocal]: {
    name: 'OpSetLocal',
    operandWidths: [1],
  },
  [Opcode.OpGetBuiltin]: {
    name: 'OpGetBuiltin',
    operandWidths: [1],
  },
  [Opcode.OpArray]: {
    name: 'OpArray',
    operandWidths: [2],
  },
  [Opcode.OpHash]: {
    name: 'OpHash',
    operandWidths: [2],
  },
  [Opcode.OpIndex]: {
    name: 'OpIndex',
    operandWidths: [],
  },
  [Opcode.OpCall]: {
    name: 'OpCall',
    operandWidths: [1],
  },
  [Opcode.OpReturnValue]: {
    name: 'OpReturnValue',
    operandWidths: [],
  },
  [Opcode.OpReturnNull]: {
    name: 'OpReturnNull',
    operandWidths: [],
  },
  [Opcode.OpClosure]: {
    name: 'OpClosure',
    operandWidths: [2, 1],
  },
  [Opcode.OpGetFree]: {
    name: 'OpGetFree',
    operandWidths: [1],
  },
  [Opcode.OpCurrentClosure]: {
    name: 'OpCurrentClosure',
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
      case 1:
        buffer.writeUint8(operand, offset);
        break;
      case 2:
        buffer.writeUint16BE(operand, offset);
        break;
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
      case 1:
        operands.push(instructions.readUInt8(offset));
        break;
      case 2:
        operands.push(instructions.readUint16BE(offset));
        break;
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
    case 2:
      return `${def.name} ${operands[0]} ${operands[1]}`;
  }

  return `ERROR: unhandled operand count for ${def.name}`;
}
