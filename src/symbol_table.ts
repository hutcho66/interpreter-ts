export const enum SymbolScope {
  GlobalScope = 'GLOBAL',
}

export interface ISymbol {
  name: string;
  scope: SymbolScope;
  index: number;
}

export default class SymbolTable {
  private store: {[key: string]: ISymbol} = {};
  private numDefinitions = 0;

  constructor() {}

  public define(name: string): ISymbol {
    const symbol = {
      name,
      scope: SymbolScope.GlobalScope,
      index: this.numDefinitions,
    };
    this.store[name] = symbol;
    this.numDefinitions++;

    return symbol;
  }

  public resolve(name: string): ISymbol {
    return this.store[name];
  }
}
