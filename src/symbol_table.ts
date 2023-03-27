export const enum SymbolScope {
  GlobalScope = 'GLOBAL',
  LocalScope = 'LOCAL',
  BuiltinScope = 'BUILTIN',
  FreeScope = 'FREE',
  FunctionScope = 'FUNCTION',
}

export interface ISymbol {
  name: string;
  scope: SymbolScope;
  index: number;
}

export default class SymbolTable {
  public numDefinitions = 0;
  public outer: SymbolTable | undefined;
  public freeSymbols: ISymbol[] = [];
  private store: {[key: string]: ISymbol} = {};

  constructor(outer?: SymbolTable) {
    if (outer) this.outer = outer;
  }

  public define(name: string): ISymbol {
    const scope = this.outer ? SymbolScope.LocalScope : SymbolScope.GlobalScope;

    const symbol = {
      name,
      scope: scope,
      index: this.numDefinitions,
    };
    this.store[name] = symbol;
    this.numDefinitions++;

    return symbol;
  }

  public defineBuiltin(index: number, name: string): ISymbol {
    const symbol = {
      name,
      scope: SymbolScope.BuiltinScope,
      index: index,
    };
    this.store[name] = symbol;
    return symbol;
  }

  public defineFunctionName(name: string): ISymbol {
    const symbol = {
      name,
      scope: SymbolScope.FunctionScope,
      index: 0,
    };
    this.store[name] = symbol;
    return symbol;
  }

  public resolve(name: string): ISymbol | undefined {
    const local = this.store[name];
    if (local) return local;

    if (!this.outer) return undefined;

    const obj = this.outer.resolve(name);
    if (!obj) return undefined;

    if (
      obj.scope === SymbolScope.GlobalScope ||
      obj.scope === SymbolScope.BuiltinScope
    ) {
      return obj;
    }

    const free = this.defineFree(obj);
    return free;
  }

  private defineFree(original: ISymbol) {
    this.freeSymbols.push(original);

    const symbol: ISymbol = {
      name: original.name,
      index: this.freeSymbols.length - 1,
      scope: SymbolScope.FreeScope,
    };

    this.store[original.name] = symbol;
    return symbol;
  }
}
