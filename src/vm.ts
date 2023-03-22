/* eslint-disable no-case-declarations */
import {Instructions, Opcode} from './code';
import {IntegerObj, Obj} from './object';
import {Bytecode} from './compiler';
import {BOOLEAN, INTEGER} from './builtins';

const STACK_SIZE = 2048;

class ExecutionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export default class VM {
  private constants: Obj[];
  private instructions: Instructions;

  private stack = new Array<Obj>(STACK_SIZE);
  private sp = 0;

  constructor(bytecode: Bytecode) {
    this.constants = bytecode.constants;
    this.instructions = bytecode.instructions;
  }

  public lastPoppedStackElement(): Obj | null {
    return this.stack[this.sp];
  }

  public run() {
    for (let ip = 0; ip < this.instructions.length; ip++) {
      const op = this.instructions[ip] as Opcode;

      switch (op) {
        case Opcode.OpConstant:
          this.push(this.constants[this.instructions.readUInt16BE(ip + 1)]);
          ip += 2;
          break;
        case Opcode.OpTrue:
          this.push(BOOLEAN.TRUE);
          break;
        case Opcode.OpFalse:
          this.push(BOOLEAN.FALSE);
          break;
        case Opcode.OpBang:
          this.executeBangOperator();
          break;
        case Opcode.OpMinus:
          this.executeMinusOperator();
          break;
        case Opcode.OpAdd:
        case Opcode.OpSub:
        case Opcode.OpMul:
        case Opcode.OpDiv:
          this.executeBinaryOperation(op);
          break;
        case Opcode.OpEqual:
        case Opcode.OpNotEqual:
        case Opcode.OpGreaterThan:
          this.executeComparison(op);
          break;
        case Opcode.OpPop:
          this.pop();
      }
    }
  }

  private executeBangOperator = () => {
    const operand = this.pop();

    switch (operand) {
      case BOOLEAN.FALSE:
        return this.push(BOOLEAN.TRUE);
      case BOOLEAN.TRUE:
      default:
        return this.push(BOOLEAN.FALSE);
    }
  };

  private executeMinusOperator = () => {
    const operand = this.pop();

    if (operand instanceof IntegerObj) {
      return this.push(INTEGER(-operand.value));
    }

    throw new ExecutionError(
      `unsupported type for negation: ${operand.type()}`
    );
  };

  private executeComparison = (op: Opcode) => {
    const right = this.pop();
    const left = this.pop();

    if (left instanceof IntegerObj && right instanceof IntegerObj) {
      return this.executeIntegerComparison(op, left, right);
    }

    switch (op) {
      case Opcode.OpEqual:
        return this.push(left === right ? BOOLEAN.TRUE : BOOLEAN.FALSE);
      case Opcode.OpNotEqual:
        return this.push(left !== right ? BOOLEAN.TRUE : BOOLEAN.FALSE);
    }

    throw new ExecutionError(
      `unknown operator: ${op} (${left.type()} ${right.type()})`
    );
  };

  private executeIntegerComparison = (
    op: Opcode,
    left: IntegerObj,
    right: IntegerObj
  ) => {
    switch (op) {
      case Opcode.OpEqual:
        return this.push(left === right ? BOOLEAN.TRUE : BOOLEAN.FALSE);
      case Opcode.OpNotEqual:
        return this.push(left !== right ? BOOLEAN.TRUE : BOOLEAN.FALSE);
      case Opcode.OpGreaterThan:
        return this.push(
          left.value > right.value ? BOOLEAN.TRUE : BOOLEAN.FALSE
        );
      default:
        throw new ExecutionError(`unknown operator: ${op}`);
    }
  };

  private executeBinaryOperation = (op: Opcode) => {
    const right = this.pop();
    const left = this.pop();

    if (left instanceof IntegerObj && right instanceof IntegerObj) {
      return this.executeBinaryIntegerOperation(op, left, right);
    }

    throw new ExecutionError(
      `unsupported types for binary operation: ${left.type()} ${right.type()}`
    );
  };

  private executeBinaryIntegerOperation = (
    op: Opcode,
    left: IntegerObj,
    right: IntegerObj
  ) => {
    let result: number;
    switch (op) {
      case Opcode.OpAdd:
        result = left.value + right.value;
        break;
      case Opcode.OpSub:
        result = left.value - right.value;
        break;
      case Opcode.OpMul:
        result = left.value * right.value;
        break;
      case Opcode.OpDiv:
        result = Math.trunc(left.value / right.value);
        break;
      default:
        throw new ExecutionError(`unknown integer operator: ${op}`);
    }

    this.push(INTEGER(result));
  };

  private push = (obj: Obj) => {
    if (this.sp >= STACK_SIZE) throw new ExecutionError('stack overflow');

    this.stack[this.sp] = obj;
    this.sp++;
  };

  private pop = (): Obj => {
    const obj = this.stack[this.sp - 1];
    this.sp--;
    return obj;
  };
}
