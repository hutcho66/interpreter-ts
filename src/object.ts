import {Identifier, BlockStatement} from './ast';

export const enum ObjectType {
  EMPTY_OBJ = 'EMPTY',
  NULL_OBJ = 'NULL',
  UNDEFINED_OBJ = 'UNDEFINED',
  INTEGER_OBJ = 'INTEGER',
  STRING_OBJ = 'STRING',
  BOOLEAN_OBJ = 'BOOLEAN',
  RETURN_VALUE_OBJ = 'RETURN_VALUE',
  ERROR_OBJ = 'ERROR',
  FUNCTION_OBJ = 'FUNCTION',
  BUILTIN_OBJ = 'BUILTIN',
  ARRAY_OBJ = 'ARRAY',
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
}

export type BuiltinFunction = (args: Obj[]) => Obj;

export interface Obj {
  type: () => ObjectType;
  inspect: () => string;
}

export class IntegerObj implements Obj {
  constructor(public value: number) {}
  type = () => ObjectType.INTEGER_OBJ;
  inspect = () => `${this.value}`;
}

export class BooleanObj implements Obj {
  constructor(public value: boolean) {}
  type = () => ObjectType.BOOLEAN_OBJ;
  inspect = () => `${this.value}`;
}

export class StringObj implements Obj {
  constructor(public value: string) {}
  type = () => ObjectType.STRING_OBJ;
  inspect = () => `"${this.value}"`;
}

export class NullObj implements Obj {
  constructor() {}
  type = () => ObjectType.NULL_OBJ;
  inspect = () => 'null';
}

export class EmptyObj implements Obj {
  constructor() {}
  type = () => ObjectType.EMPTY_OBJ;
  inspect = () => '';
}

export class UndefinedObj implements Obj {
  constructor() {}
  type = () => ObjectType.UNDEFINED_OBJ;
  inspect = () => 'undefined';
}

export class ReturnValueObj implements Obj {
  constructor(public returnValue: Obj) {}
  type = () => ObjectType.RETURN_VALUE_OBJ;
  inspect = this.returnValue.inspect;
}

export class ErrorObj implements Obj {
  constructor(public message: string) {}
  type = () => ObjectType.ERROR_OBJ;
  inspect = () => `ERROR: ${this.message}`;
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
}

export class BuiltinObj implements Obj {
  constructor(public func: BuiltinFunction) {}
  type = () => ObjectType.BUILTIN_OBJ;
  inspect = () => '[Builtin]';
}

export class ArrayObj implements Obj {
  constructor(public elements: Obj[]) {}
  type = () => ObjectType.ARRAY_OBJ;
  inspect = () => `[${this.elements.map(e => e.inspect()).join(', ')}]`;
}
