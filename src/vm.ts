/* eslint-disable no-case-declarations */
import {Instructions, Opcode} from './code';
import {
  IntegerObj,
  Obj,
  BooleanObj,
  StringObj,
  ArrayObj,
  HashKey,
  HashPair,
  Hashable,
} from './object';
import {Bytecode} from './compiler';
import {BOOLEAN, INTEGER, NULL} from './builtins';
import {HashObj} from './object';

export const STACK_SIZE = 2048;
export const GLOBALS_SIZE = 65536;

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
  private globals = new Array<Obj>(GLOBALS_SIZE);
  private sp = 0;

  constructor(bytecode: Bytecode, globals?: Obj[]) {
    this.constants = bytecode.constants;
    this.instructions = bytecode.instructions;

    if (globals) this.globals = globals;
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
        case Opcode.OpNull:
          this.push(NULL);
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
          break;
        case Opcode.OpJump:
          // move ip to one before jump location, since ip is advance in the loop
          ip = this.instructions.readUint16BE(ip + 1) - 1;
          break;
        case Opcode.OpJumpNotTruthy:
          // store jump pos
          const jumpPos = this.instructions.readUint16BE(ip + 1);
          // advance ip by two to get instruction after jump
          ip += 2;
          // if top of stack is falsey, set ip to jump pos
          if (!this.isTruthy(this.pop())) ip = jumpPos - 1;
          break;
        case Opcode.OpSetGlobal: {
          // get index and increment pointer to next instruction
          const globalIndex = this.instructions.readUint16BE(ip + 1);
          ip += 2;
          // set global to top of stack
          this.globals[globalIndex] = this.pop();
          break;
        }
        case Opcode.OpGetGlobal: {
          // get index and increment pointer to next instruction
          const globalIndex = this.instructions.readUint16BE(ip + 1);
          ip += 2;
          // retrieve global and push to stack
          this.push(this.globals[globalIndex]);
          break;
        }
        case Opcode.OpArray: {
          // read number of elements from instruction and progress pointer to next instruction
          const numElements = this.instructions.readUint16BE(ip + 1);
          ip += 2;

          // build array from last N stack elements
          const array = this.buildArray(this.sp - numElements, this.sp);
          // push array to stack, replacing stack contents used to build the array
          this.sp -= numElements;
          this.push(array);
          break;
        }
        case Opcode.OpHash: {
          // read number of elements from instruction and progress pointer to next instruction
          const numElements = this.instructions.readUint16BE(ip + 1);
          ip += 2;

          // build hash from last N stack elements
          const hash = this.buildHash(this.sp - numElements, this.sp);
          // push hash to stack, replacing stack contents used to build the hash
          this.sp -= numElements;
          this.push(hash);
          break;
        }
        case Opcode.OpIndex: {
          const index = this.pop();
          const left = this.pop();

          this.executeIndexExpression(left, index);
          break;
        }
      }
    }
  }

  private executeBangOperator = () => {
    const operand = this.pop();

    switch (operand) {
      case BOOLEAN.FALSE:
      case NULL:
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
    if (left instanceof StringObj && right instanceof StringObj) {
      return this.executeBinaryStringOperation(op, left, right);
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

  private executeBinaryStringOperation = (
    op: Opcode,
    left: StringObj,
    right: StringObj
  ) => {
    let result: string;
    switch (op) {
      case Opcode.OpAdd:
        result = left.value + right.value;
        break;
      default:
        throw new ExecutionError(`unknown string operator: ${op}`);
    }

    this.push(new StringObj(result));
  };

  private executeIndexExpression = (left: Obj, index: Obj) => {
    if (left instanceof ArrayObj && index instanceof IntegerObj) {
      return this.executeArrayIndexExpression(left, index);
    }

    if (left instanceof HashObj) {
      return this.executeHashIndexExpression(left, index);
    }

    throw new ExecutionError(
      `index operator not supported: ${left.type()}[${index.type()}]`
    );
  };

  private executeArrayIndexExpression = (
    array: ArrayObj,
    index: IntegerObj
  ) => {
    const idx = index.value;
    const max = array.elements.length - 1;

    if (idx < 0 || idx > max) return this.push(NULL);

    return this.push(array.elements[idx]);
  };

  private executeHashIndexExpression = (hash: HashObj, index: Obj) => {
    if (!('hash' in index)) {
      throw new ExecutionError(`unusable as hash key: ${index.type()}`);
    }

    const key = index as unknown as Hashable;
    const pair = hash.pairs.get(key.hash());
    if (!pair) return this.push(NULL);

    return this.push(pair.value);
  };

  private buildArray = (startIndex: number, endIndex: number): Obj => {
    const elements = new Array<Obj>(endIndex - startIndex);

    // create array by pulling last N elements off stack
    for (let i = startIndex; i < endIndex; i++)
      elements[i - startIndex] = this.stack[i];

    return new ArrayObj(elements);
  };

  private buildHash = (startIndex: number, endIndex: number): Obj => {
    const pairs = new Map<HashKey, HashPair>();

    // create hash by pulling last N elements off stack pair by pair
    for (let i = startIndex; i < endIndex; i += 2) {
      const key = this.stack[i];
      const value = this.stack[i + 1];

      if (!('hash' in key)) {
        throw new ExecutionError(`unusable as hash key: ${key.type()}`);
      }
      const hashKey = key as unknown as Hashable;
      const pair: HashPair = {key, value};

      pairs.set(hashKey.hash(), pair);
    }

    return new HashObj(pairs);
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

  private isTruthy(obj: Obj) {
    if (obj instanceof BooleanObj) return obj.value;
    if (obj === NULL) return false;
    return true;
  }
}
