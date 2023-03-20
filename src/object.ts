import {Identifier, BlockStatement} from './ast';

export const enum ObjectType {
  EMPTY_OBJ = 'EMPTY',
  NULL_OBJ = 'NULL',
  UNDEFINED_OBJ = 'UNDEFINED',
  INTEGER_OBJ = 'INTEGER',
  STRING_OBJ = 'STRING',
  BOOLEAN_OBJ = 'BOOLEAN',
  RETURN_VALUE_OBJ = 'RETURN_VALUE',
  BREAK_OBJ = 'BREAK',
  ERROR_OBJ = 'ERROR',
  FUNCTION_OBJ = 'FUNCTION',
  BUILTIN_OBJ = 'BUILTIN',
  ARRAY_OBJ = 'ARRAY',
  HASH_OBJ = 'HASH',
}

export class Environment {
  private store: {[key: string]: Obj};
  private outer: Environment | undefined;

  constructor() {
    this.store = {};
  }

  static enclosedEnv(outer: Environment): Environment {
    const env = new Environment();
    env.outer = outer;
    return env;
  }

  get(name: string): Obj {
    const obj = this.store[name];
    if (!obj && this.outer) {
      return this.outer.get(name);
    }
    return obj;
  }

  set(name: string, value: Obj): Obj {
    this.store[name] = value;
    return value;
  }

  // this function only calls set on current scope if
  // already defined on current scope, otherwise tries to call
  // set on outer scope, which allows for shadowing
  // If no matches found, will return undefined
  reassign(name: string, value: Obj): Obj | undefined {
    if (this.store[name] !== undefined) {
      return this.set(name, value);
    } else if (this.outer) {
      return this.outer.reassign(name, value);
    }
    return undefined;
  }
}

export type BuiltinFunction = (args: Obj[]) => Obj;

export interface Obj {
  type: () => ObjectType;
  inspect: () => string;
  display: () => string;
}

export type HashKey = {type: ObjectType; value: number};
export interface Hashable {
  hash: () => HashKey;
}

export class IntegerObj implements Obj, Hashable {
  private static HASHES: {[key: number]: HashKey} = {};

  constructor(public value: number) {}
  type = () => ObjectType.INTEGER_OBJ;
  inspect = () => `${this.value}`;
  display = this.inspect;
  hash = () => {
    let hash = IntegerObj.HASHES[this.value];
    if (!hash) {
      hash = {type: this.type(), value: this.value};
      IntegerObj.HASHES[this.value] = hash;
    }
    return hash;
  };
}

export class BooleanObj implements Obj, Hashable {
  private static HASHES = {
    TRUE: {type: ObjectType.BOOLEAN_OBJ, value: 1},
    FALSE: {type: ObjectType.BOOLEAN_OBJ, value: 0},
  };

  constructor(public value: boolean) {}
  type = () => ObjectType.BOOLEAN_OBJ;
  inspect = () => `${this.value}`;
  display = this.inspect;
  hash = () => (this.value ? BooleanObj.HASHES.TRUE : BooleanObj.HASHES.FALSE);
}

export class StringObj implements Obj, Hashable {
  private static HASHES: {[key: string]: HashKey} = {};

  constructor(public value: string) {}
  type = () => ObjectType.STRING_OBJ;
  inspect = () => `"${this.value}"`;
  display = () => this.value;
  hash = () => {
    let hash = StringObj.HASHES[this.value];
    if (!hash) {
      let hashValue = 0;
      for (let i = 0; i < this.value.length; i++) {
        const chr = this.value.charCodeAt(i);
        hashValue = (hashValue << 5) - hashValue + chr;
        hashValue |= 0;
      }
      hash = {type: this.type(), value: hashValue};
      StringObj.HASHES[this.value] = hash;
    }

    return hash;
  };
}

export class NullObj implements Obj {
  constructor() {}
  type = () => ObjectType.NULL_OBJ;
  inspect = () => 'null';
  display = this.inspect;
}

export class EmptyObj implements Obj {
  constructor() {}
  type = () => ObjectType.EMPTY_OBJ;
  inspect = () => '';
  display = this.inspect;
}

export class BreakObj implements Obj {
  constructor() {}
  type = () => ObjectType.BREAK_OBJ;
  inspect = () => '';
  display = this.inspect;
}

export class ReturnValueObj implements Obj {
  constructor(public returnValue: Obj) {}
  type = () => ObjectType.RETURN_VALUE_OBJ;
  inspect = this.returnValue.inspect;
  display = this.inspect;
}

export class ErrorObj implements Obj {
  constructor(public message: string) {}
  type = () => ObjectType.ERROR_OBJ;
  inspect = () => `ERROR: ${this.message}`;
  display = this.inspect;
}

export class FunctionObj implements Obj {
  constructor(
    public parameters: Identifier[],
    public body: BlockStatement,
    public env: Environment
  ) {}
  type = () => ObjectType.FUNCTION_OBJ;
  inspect = () => {
    return '[Function]';
  };
  display = this.inspect;
}

export class BuiltinObj implements Obj {
  constructor(public func: BuiltinFunction) {}
  type = () => ObjectType.BUILTIN_OBJ;
  inspect = () => '[Builtin]';
  display = this.inspect;
}

export class ArrayObj implements Obj {
  constructor(public elements: Obj[]) {}
  type = () => ObjectType.ARRAY_OBJ;
  inspect = () => `[${this.elements.map(e => e.inspect()).join(', ')}]`;
  display = this.inspect;
}

export type HashPair = {key: Obj; value: Obj};
export class HashObj implements Obj {
  constructor(public pairs: Map<HashKey, HashPair>) {}
  type = () => ObjectType.HASH_OBJ;
  inspect = () => {
    const strings: string[] = [];
    this.pairs.forEach(pair =>
      strings.push(`${pair.key.inspect()}: ${pair.value.inspect()}`)
    );

    return `{${strings.join(', ')}}`;
  };
  display = this.inspect;
}
