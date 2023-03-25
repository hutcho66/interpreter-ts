import {
  Node,
  Program,
  ExpressionStatement,
  InfixExpression,
  IntegerLiteral,
  Expression,
} from './ast';
import {Instructions, make, Opcode} from './code';
import {Obj, IntegerObj, StringObj} from './object';
import {
  LetStatement,
  Identifier,
  StringLiteral,
  ArrayLiteral,
  HashLiteral,
} from './ast';
import {
  BooleanLiteral,
  PrefixExpression,
  IfExpression,
  BlockStatement,
} from './ast';
import SymbolTable from './symbol_table';
import {IndexExpression} from './ast';

export type Bytecode = {
  instructions: Instructions;
  constants: Obj[];
};

type EmittedInstruction = {
  opcode: Opcode;
  position: number;
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
  private lastInstruction: EmittedInstruction = {} as EmittedInstruction;
  private previousInstruction: EmittedInstruction = {} as EmittedInstruction;
  private symbolTable: SymbolTable = new SymbolTable();

  public constructor(symbolTable?: SymbolTable, constants?: Obj[]) {
    if (symbolTable) this.symbolTable = symbolTable;
    if (constants) this.constants = constants;
  }

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

    if (node instanceof BlockStatement) {
      for (const statement of node.statements) {
        this.compile(statement);
      }
    }

    if (node instanceof LetStatement) {
      this.compile(node.value);
      const symbol = this.symbolTable.define(node.name.value);
      this.emit(Opcode.OpSetGlobal, symbol.index);
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

    if (node instanceof PrefixExpression) {
      this.compile(node.right);

      switch (node.operator) {
        case '!':
          this.emit(Opcode.OpBang);
          break;
        case '-':
          this.emit(Opcode.OpMinus);
          break;
        default:
          throw new CompileError(`unknown operator ${node.operator}`);
      }
    }

    if (node instanceof IfExpression) {
      this.compile(node.condition);

      // emit OpJumpNotTruthy with placeholder value
      const jumpNotTruthyPosition = this.emit(Opcode.OpJumpNotTruthy, 9999);

      // compile consequence and remove final pop so that expression result is left on stack
      this.compile(node.consequence);
      this.removeLastPopIfPresent();

      // emit OpJump with placeholder value
      const jumpPosition = this.emit(Opcode.OpJump, 9999);

      // change position of OpJumpNotTruthy to after consequence
      const afterConsequencePosition = this.instructions.length;
      this.changeOperand(jumpNotTruthyPosition, afterConsequencePosition);

      if (node.alternative) {
        // compile alternative and remove final pop so that expression result is left on stack
        this.compile(node.alternative);
        this.removeLastPopIfPresent();
      } else {
        // emit OpNull as alternative
        this.emit(Opcode.OpNull);
      }

      // change position of OpJump to after alternative
      const afterAlternativePosition = this.instructions.length;
      this.changeOperand(jumpPosition, afterAlternativePosition);
    }

    if (node instanceof IndexExpression) {
      this.compile(node.left);
      this.compile(node.index);
      this.emit(Opcode.OpIndex);
    }

    if (node instanceof Identifier) {
      const symbol = this.symbolTable.resolve(node.value);
      if (!symbol) {
        throw new CompileError(`undefined variable ${node.value}`);
      }
      this.emit(Opcode.OpGetGlobal, symbol.index);
    }

    if (node instanceof IntegerLiteral) {
      const integer = new IntegerObj(node.value);
      this.emit(Opcode.OpConstant, this.addConstant(integer));
    }

    if (node instanceof BooleanLiteral) {
      node.value ? this.emit(Opcode.OpTrue) : this.emit(Opcode.OpFalse);
    }

    if (node instanceof StringLiteral) {
      const string = new StringObj(node.value);
      this.emit(Opcode.OpConstant, this.addConstant(string));
    }

    if (node instanceof ArrayLiteral) {
      node.elements.forEach(el => {
        this.compile(el);
      });
      this.emit(Opcode.OpArray, node.elements.length);
    }

    if (node instanceof HashLiteral) {
      const keys: Expression[] = [];
      node.pairs.forEach((_, k) => keys.push(k));

      // compile the keys in alphabetic order for ease of testing
      const sortedKeys = keys.sort((a, b) =>
        a.string() < b.string() ? -1 : 1
      );

      sortedKeys.forEach(key => {
        // compile key and value
        this.compile(key);
        this.compile(node.pairs.get(key)!);
      });

      this.emit(Opcode.OpHash, node.pairs.size * 2);
    }

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

    this.setLastInstruction(op, position);

    return position;
  }

  private setLastInstruction(op: Opcode, position: number) {
    const previous = this.lastInstruction;
    const last: EmittedInstruction = {opcode: op, position};

    this.previousInstruction = previous;
    this.lastInstruction = last;
  }

  private removeLastPopIfPresent() {
    if (this.lastInstruction.opcode === Opcode.OpPop) {
      this.instructions = this.instructions.slice(
        0,
        this.lastInstruction.position
      );
      this.lastInstruction = this.previousInstruction;
    }
  }

  private changeOperand(opPosition: number, operand: number) {
    const op = this.instructions[opPosition];
    const newInstruction = make(op, operand);

    this.replaceInstruction(opPosition, newInstruction);
  }

  private replaceInstruction(position: number, newInstruction: Instructions) {
    for (let i = 0; i < newInstruction.length; i++) {
      this.instructions[position + i] = newInstruction[i];
    }
  }
}
