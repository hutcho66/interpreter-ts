import {
  Node,
  Program,
  ExpressionStatement,
  InfixExpression,
  IntegerLiteral,
  Expression,
  FunctionLiteral,
} from './ast';
import {Instructions, make, Opcode} from './code';
import {Obj, IntegerObj, StringObj, CompiledFunctionObj} from './object';
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
import SymbolTable, {SymbolScope} from './symbol_table';
import {IndexExpression, ReturnStatement, CallExpression} from './ast';
import {BUILTIN} from './builtins';
import {ISymbol} from './symbol_table';

export type Bytecode = {
  instructions: Instructions;
  constants: Obj[];
};

type EmittedInstruction = {
  opcode: Opcode;
  position: number;
};

type CompilationScope = {
  instructions: Instructions;
  lastInstruction: EmittedInstruction;
  previousInstruction: EmittedInstruction;
};

class CompileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export default class Compiler {
  private constants: Obj[] = [];
  private symbolTable: SymbolTable = new SymbolTable();
  private scopes: CompilationScope[] = [];
  private scopeIndex = 0;

  public constructor(symbolTable?: SymbolTable, constants?: Obj[]) {
    if (symbolTable) {
      this.symbolTable = symbolTable;
    } else {
      this.symbolTable = new SymbolTable();
      // define builtins
      BUILTIN.forEach((value, i) =>
        this.symbolTable.defineBuiltin(i, value.name)
      );
    }
    if (constants) this.constants = constants;

    // add main scope
    this.scopes.push({
      instructions: Buffer.alloc(0),
      lastInstruction: {} as EmittedInstruction,
      previousInstruction: {} as EmittedInstruction,
    });
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
      const symbol = this.symbolTable.define(node.name.value);
      this.compile(node.value);
      if (symbol.scope === SymbolScope.GlobalScope)
        this.emit(Opcode.OpSetGlobal, symbol.index);
      else this.emit(Opcode.OpSetLocal, symbol.index);
    }

    if (node instanceof ReturnStatement) {
      this.compile(node.value);
      this.emit(Opcode.OpReturnValue);
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
      if (this.isLastOp(Opcode.OpPop)) this.removePop();

      // emit OpJump with placeholder value
      const jumpPosition = this.emit(Opcode.OpJump, 9999);

      // change position of OpJumpNotTruthy to after consequence
      const afterConsequencePosition = this.currentInstructions().length;
      this.changeOperand(jumpNotTruthyPosition, afterConsequencePosition);

      if (node.alternative) {
        // compile alternative and remove final pop so that expression result is left on stack
        this.compile(node.alternative);
        if (this.isLastOp(Opcode.OpPop)) this.removePop();
      } else {
        // emit OpNull as alternative
        this.emit(Opcode.OpNull);
      }

      // change position of OpJump to after alternative
      const afterAlternativePosition = this.currentInstructions().length;
      this.changeOperand(jumpPosition, afterAlternativePosition);
    }

    if (node instanceof IndexExpression) {
      this.compile(node.left);
      this.compile(node.index);
      this.emit(Opcode.OpIndex);
    }

    if (node instanceof CallExpression) {
      this.compile(node.func);
      node.args.forEach(arg => this.compile(arg));
      this.emit(Opcode.OpCall, node.args.length);
    }

    if (node instanceof Identifier) {
      const symbol = this.symbolTable.resolve(node.value);
      if (!symbol) {
        throw new CompileError(`undefined variable ${node.value}`);
      }

      this.loadSymbol(symbol);
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

    if (node instanceof FunctionLiteral) {
      this.enterScope();

      if (node.name) this.symbolTable.defineFunctionName(node.name);

      node.parameters.forEach(param => this.symbolTable.define(param.value));

      this.compile(node.body);
      // replace last pop with return value
      if (this.isLastOp(Opcode.OpPop)) this.replacePopWithReturn();

      // if there is no pop, inject null return
      if (!this.isLastOp(Opcode.OpReturnValue)) this.emit(Opcode.OpReturnNull);

      const freeSymbols = this.symbolTable.freeSymbols;
      const numLocals = this.symbolTable.numDefinitions;
      const instructions = this.leaveScope();

      freeSymbols.forEach(s => this.loadSymbol(s));

      const compiledFunction = new CompiledFunctionObj(
        instructions,
        numLocals,
        node.parameters.length
      );
      const funcIndex = this.addConstant(compiledFunction);
      this.emit(Opcode.OpClosure, funcIndex, freeSymbols.length);
    }

    return null;
  }

  public bytecode(): Bytecode {
    return {
      instructions: this.currentInstructions(),
      constants: this.constants,
    };
  }

  private enterScope() {
    this.scopes.push({
      instructions: Buffer.alloc(0),
      lastInstruction: {} as EmittedInstruction,
      previousInstruction: {} as EmittedInstruction,
    });

    this.symbolTable = new SymbolTable(this.symbolTable);

    this.scopeIndex++;
  }

  private leaveScope() {
    // move up a scope level and return current scope instructions
    const instructions = this.currentInstructions();

    this.scopes = this.scopes.slice(0, this.scopes.length - 1);
    this.scopeIndex--;

    this.symbolTable = this.symbolTable.outer!;

    return instructions;
  }

  private loadSymbol(s: ISymbol) {
    switch (s.scope) {
      case SymbolScope.GlobalScope:
        this.emit(Opcode.OpGetGlobal, s.index);
        break;
      case SymbolScope.LocalScope:
        this.emit(Opcode.OpGetLocal, s.index);
        break;
      case SymbolScope.BuiltinScope:
        this.emit(Opcode.OpGetBuiltin, s.index);
        break;
      case SymbolScope.FreeScope:
        this.emit(Opcode.OpGetFree, s.index);
        break;
      case SymbolScope.FunctionScope:
        this.emit(Opcode.OpCurrentClosure);
        break;
    }
  }

  private addConstant(obj: Obj): number {
    this.constants.push(obj);
    return this.constants.length - 1;
  }

  private addInstruction(instruction: Instructions): number {
    const position = this.currentInstructions().length;
    this.scopes[this.scopeIndex].instructions = Buffer.concat([
      this.currentInstructions(),
      instruction,
    ]);

    return position;
  }

  private emit(op: Opcode, ...operands: number[]): number {
    const instruction = make(op, ...operands);
    const position = this.addInstruction(instruction);

    this.setLastInstruction(op, position);

    return position;
  }

  private currentInstructions() {
    return this.scopes[this.scopeIndex].instructions;
  }

  private setLastInstruction(op: Opcode, position: number) {
    const previous = this.scopes[this.scopeIndex].lastInstruction;
    const last: EmittedInstruction = {opcode: op, position};

    this.scopes[this.scopeIndex].previousInstruction = previous;
    this.scopes[this.scopeIndex].lastInstruction = last;
  }

  private isLastOp(op: Opcode) {
    const lastInstruction = this.scopes[this.scopeIndex].lastInstruction;
    return lastInstruction.opcode === op;
  }

  private removePop() {
    const lastInstruction = this.scopes[this.scopeIndex].lastInstruction;
    const prevInstruction = this.scopes[this.scopeIndex].previousInstruction;

    const oldInstructions = this.currentInstructions();
    const newInstructions = oldInstructions.slice(0, lastInstruction.position);

    this.scopes[this.scopeIndex].instructions = newInstructions;
    this.scopes[this.scopeIndex].lastInstruction = prevInstruction;
  }

  private replacePopWithReturn() {
    const lastPosition = this.scopes[this.scopeIndex].lastInstruction.position;
    this.replaceInstruction(lastPosition, make(Opcode.OpReturnValue));

    this.scopes[this.scopeIndex].lastInstruction.opcode = Opcode.OpReturnValue;
  }

  private changeOperand(opPosition: number, operand: number) {
    const op = this.currentInstructions()[opPosition];
    const newInstruction = make(op, operand);

    this.replaceInstruction(opPosition, newInstruction);
  }

  private replaceInstruction(position: number, newInstruction: Instructions) {
    for (let i = 0; i < newInstruction.length; i++) {
      this.currentInstructions()[position + i] = newInstruction[i];
    }
  }
}
