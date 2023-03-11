import {Identifier, BlockStatement} from './ast';
export const enum ObjectType {
  NULL_OBJ = 'NULL',
  INTEGER_OBJ = 'INTEGER',
  BOOLEAN_OBJ = 'BOOLEAN',
  RETURN_VALUE_OBJ = 'RETURN_VALUE',
  ERROR_OBJ = 'ERROR_OBJ',
  FUNCTION_OBJ = 'FUNCTION_OBJ',
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

export class NullObj implements Obj {
  constructor() {}
  type = () => ObjectType.NULL_OBJ;
  inspect = () => 'null';
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
    return `fn(${this.parameters
      .map(p => p.string())
      .join(', ')})) {\n${this.body.string()}\n}`;
  };
}
