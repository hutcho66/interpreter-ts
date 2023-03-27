/* eslint-disable no-case-declarations */
import {Opcode} from './code';
import {
  IntegerObj,
  Obj,
  BooleanObj,
  StringObj,
  ArrayObj,
  HashKey,
  HashPair,
  Hashable,
  CompiledFunctionObj,
  ClosureObj,
} from './object';
import {Bytecode} from './compiler';
import {BOOLEAN, BUILTIN, INTEGER, NULL} from './builtins';
import {HashObj, BuiltinObj, ErrorObj} from './object';
import {Frame} from './frame';

export const STACK_SIZE = 2048;
export const GLOBALS_SIZE = 65536;
export const FRAMES_SIZE = 1024;

class ExecutionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export default class VM {
  private constants: Obj[];

  private stack = new Array<Obj>(STACK_SIZE);
  private globals = new Array<Obj>(GLOBALS_SIZE);
  private sp = 0;

  private frames: Frame[] = new Array<Frame>(FRAMES_SIZE);
  private framesIndex = 1;

  constructor(bytecode: Bytecode, globals?: Obj[]) {
    this.constants = bytecode.constants;

    if (globals) this.globals = globals;

    const mainFrame = new Frame(
      new ClosureObj(new CompiledFunctionObj(bytecode.instructions, 0, 0), []),
      0
    );
    this.frames[0] = mainFrame;
  }

  public run() {
    while (
      this.currentFrame().ip <
      this.currentFrame().instructions().length - 1
    ) {
      this.currentFrame().ip++;

      const ip = this.currentFrame().ip;
      const instructions = this.currentFrame().instructions();

      const op = instructions[ip] as Opcode;

      switch (op) {
        case Opcode.OpConstant:
          this.push(this.constants[instructions.readUInt16BE(ip + 1)]);
          this.currentFrame().ip += 2;
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
          this.currentFrame().ip = instructions.readUint16BE(ip + 1) - 1;
          break;
        case Opcode.OpJumpNotTruthy:
          // store jump pos
          const jumpPos = instructions.readUint16BE(ip + 1);
          // advance ip by two to get instruction after jump
          this.currentFrame().ip += 2;
          // if top of stack is falsey, set ip to jump pos
          if (!this.isTruthy(this.pop())) this.currentFrame().ip = jumpPos - 1;
          break;
        case Opcode.OpSetGlobal: {
          // get index and increment pointer to next instruction
          const globalIndex = instructions.readUint16BE(ip + 1);
          this.currentFrame().ip += 2;
          // set global to top of stack
          this.globals[globalIndex] = this.pop();
          break;
        }
        case Opcode.OpGetGlobal: {
          // get index and increment pointer to next instruction
          const globalIndex = instructions.readUint16BE(ip + 1);
          this.currentFrame().ip += 2;
          // retrieve global and push to stack
          this.push(this.globals[globalIndex]);
          break;
        }
        case Opcode.OpSetLocal: {
          // get index and increment pointer to next instruction
          const localIndex = instructions.readUInt8(ip + 1);
          this.currentFrame().ip += 1;
          // set local inside reserved space on stack
          const frame = this.currentFrame();
          this.stack[frame.basePointer + localIndex] = this.pop();
          break;
        }
        case Opcode.OpGetLocal: {
          // get index and increment pointer to next instruction
          const localIndex = instructions.readUInt8(ip + 1);
          this.currentFrame().ip += 1;
          // retrieve local from reserved space on stack
          const frame = this.currentFrame();
          this.push(this.stack[frame.basePointer + localIndex]);
          break;
        }
        case Opcode.OpArray: {
          // read number of elements from instruction and progress pointer to next instruction
          const numElements = instructions.readUint16BE(ip + 1);
          this.currentFrame().ip += 2;

          // build array from last N stack elements
          const array = this.buildArray(this.sp - numElements, this.sp);
          // push array to stack, replacing stack contents used to build the array
          this.sp -= numElements;
          this.push(array);
          break;
        }
        case Opcode.OpHash: {
          // read number of elements from instruction and progress pointer to next instruction
          const numElements = instructions.readUint16BE(ip + 1);
          this.currentFrame().ip += 2;

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
        case Opcode.OpReturnNull: {
          // pop frame and return stack pointer to before call
          const frame = this.popFrame();
          this.sp = frame.basePointer - 1;

          this.push(NULL);
          break;
        }
        case Opcode.OpReturnValue: {
          const returnValue = this.pop();

          // pop frame and return stack pointer to before call
          const frame = this.popFrame();
          this.sp = frame.basePointer - 1;

          this.push(returnValue);
          break;
        }
        case Opcode.OpCall: {
          const numArgs = instructions.readUint8(ip + 1);
          this.currentFrame().ip += 1;

          this.executeCall(numArgs);
          break;
        }
        case Opcode.OpGetBuiltin: {
          const builtinIndex = instructions.readUint8(ip + 1);
          this.currentFrame().ip += 1;

          const definition = BUILTIN[builtinIndex];
          this.push(definition.builtin);
          break;
        }
        case Opcode.OpClosure: {
          const fnIndex = instructions.readUInt16BE(ip + 1);
          const numFree = instructions.readUint8(ip + 3);
          this.currentFrame().ip += 3;

          this.pushClosure(fnIndex, numFree);
          break;
        }
        case Opcode.OpGetFree: {
          const freeIndex = instructions.readUInt8(ip + 1);
          this.currentFrame().ip += 1;

          const currentClosure = this.currentFrame().cl;
          this.push(currentClosure.free[freeIndex]);
          break;
        }
        case Opcode.OpCurrentClosure: {
          const currentClosure = this.currentFrame().cl;
          this.push(currentClosure);
          break;
        }
      }
    }
  }

  public lastPoppedStackElement(): Obj | null {
    return this.stack[this.sp];
  }

  private executeCall(numArgs: number) {
    const callee = this.stack[this.sp - 1 - numArgs];
    if (callee instanceof ClosureObj) {
      return this.callClosure(callee, numArgs);
    }
    if (callee instanceof BuiltinObj) {
      return this.callBuiltin(callee, numArgs);
    }

    throw new ExecutionError(`cannot call object of type ${callee.type()}`);
  }

  private callClosure(closure: ClosureObj, numArgs: number) {
    if (numArgs !== closure.func.numParameters) {
      throw new ExecutionError(
        `wrong number of arguments: expected ${closure.func.numParameters}, got ${numArgs}`
      );
    }

    const frame = new Frame(closure, this.sp - numArgs);
    this.pushFrame(frame);

    this.sp = frame.basePointer + closure.func.numLocals;
  }

  private callBuiltin(builtin: BuiltinObj, numArgs: number) {
    const args = this.stack.slice(this.sp - numArgs, this.sp);
    const result = builtin.func(args);
    this.sp = this.sp - numArgs - 1;

    if (result instanceof ErrorObj) {
      throw new ExecutionError(result.message);
    }

    this.push(result);
  }

  private pushClosure(fnIndex: number, numFree: number) {
    const fnConstant = this.constants[fnIndex];
    if (!(fnConstant instanceof CompiledFunctionObj)) {
      throw new ExecutionError(
        `cant create closure for type: ${fnConstant.type()}`
      );
    }

    const free: Obj[] = [];
    for (let i = 0; i < numFree; i++) {
      free.push(this.stack[this.sp - numFree + i]);
    }

    this.push(new ClosureObj(fnConstant, free));
  }

  private currentFrame() {
    return this.frames[this.framesIndex - 1];
  }

  private pushFrame(f: Frame) {
    this.frames[this.framesIndex] = f;
    this.framesIndex++;
  }

  private popFrame() {
    this.framesIndex--;
    return this.frames[this.framesIndex];
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
        return this.push(
          left.value === right.value ? BOOLEAN.TRUE : BOOLEAN.FALSE
        );
      case Opcode.OpNotEqual:
        return this.push(
          left.value !== right.value ? BOOLEAN.TRUE : BOOLEAN.FALSE
        );
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
