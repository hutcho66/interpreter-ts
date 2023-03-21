import {
  Node,
  Program,
  ExpressionStatement,
  InfixExpression,
  IntegerLiteral,
} from './ast';
import {Instructions, make, Opcode} from './code';
import {Obj, IntegerObj} from './object';
import {BooleanLiteral} from './ast';

export type Bytecode = {
  instructions: Instructions;
  constants: Obj[];
};

class CompileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export default class Compiler {
  private instructions: Instructions = Buffer.alloc(0);
  private constants: Obj[] = [];

  public compile(node: Node) {
    if (node instanceof Program) {
      for (const statement of node.statements) {
        this.compile(statement);
      }
    }

    if (node instanceof ExpressionStatement) {
      this.compile(node.value);
      this.emit(Opcode.OpPop);
    }

    if (node instanceof InfixExpression) {
      // Convert LessThan to GreaterThan
      if (node.operator === '<') {
        this.compile(node.right);
        this.compile(node.left);
        this.emit(Opcode.OpGreaterThan);
        return;
      }

      this.compile(node.left);
      this.compile(node.right);

      switch (node.operator) {
        case '+':
          this.emit(Opcode.OpAdd);
          break;
        case '-':
          this.emit(Opcode.OpSub);
          break;
        case '*':
          this.emit(Opcode.OpMul);
          break;
        case '/':
          this.emit(Opcode.OpDiv);
          break;
        case '>':
          this.emit(Opcode.OpGreaterThan);
          break;
        case '==':
          this.emit(Opcode.OpEqual);
          break;
        case '!=':
          this.emit(Opcode.OpNotEqual);
          break;
        default:
          throw new CompileError(`unknown operator: ${node.operator}`);
      }
    }

    if (node instanceof IntegerLiteral) {
      const integer = new IntegerObj(node.value);
      this.emit(Opcode.OpConstant, this.addConstant(integer));
    }

    if (node instanceof BooleanLiteral)
      node.value ? this.emit(Opcode.OpTrue) : this.emit(Opcode.OpFalse);

    return null;
  }

  public bytecode(): Bytecode {
    return {
      instructions: this.instructions,
      constants: this.constants,
    };
  }

  private addConstant(obj: Obj): number {
    this.constants.push(obj);
    return this.constants.length - 1;
  }

  private addInstruction(instruction: Instructions): number {
    const position = this.instructions.length;
    this.instructions = Buffer.concat([this.instructions, instruction]);

    return position;
  }

  private emit(op: Opcode, ...operands: number[]): number {
    const instruction = make(op, ...operands);
    const position = this.addInstruction(instruction);
    return position;
  }
}
