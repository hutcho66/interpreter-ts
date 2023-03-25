import SymbolTable, {SymbolScope, ISymbol} from '../symbol_table';

describe('symbol_table', () => {
  it('should define global symbols', () => {
    const expected: {[key: string]: ISymbol} = {
      a: {name: 'a', scope: SymbolScope.GlobalScope, index: 0},
      b: {name: 'b', scope: SymbolScope.GlobalScope, index: 1},
    };

    const globals = new SymbolTable();

    const a = globals.define('a');
    expect(a).toEqual(expected.a);

    const b = globals.define('b');
    expect(b).toEqual(expected.b);
  });

  it('should resolve global symbols', () => {
    const globals = new SymbolTable();
    globals.define('a');
    globals.define('b');

    const expected: ISymbol[] = [
      {name: 'a', scope: SymbolScope.GlobalScope, index: 0},
      {name: 'b', scope: SymbolScope.GlobalScope, index: 1},
    ];

    for (const i in expected) {
      const sym = expected[i];
      const result = globals.resolve(sym.name);

      expect(result).not.toBeUndefined();
      expect(result).toEqual(sym);
    }
  });
});
