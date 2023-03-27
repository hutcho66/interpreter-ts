import SymbolTable, {SymbolScope, ISymbol} from '../symbol_table';

describe('symbol_table', () => {
  it('should define symbols', () => {
    const expected: {[key: string]: ISymbol} = {
      a: {name: 'a', scope: SymbolScope.GlobalScope, index: 0},
      b: {name: 'b', scope: SymbolScope.GlobalScope, index: 1},
      c: {name: 'c', scope: SymbolScope.LocalScope, index: 0},
      d: {name: 'd', scope: SymbolScope.LocalScope, index: 1},
      e: {name: 'e', scope: SymbolScope.LocalScope, index: 0},
      f: {name: 'f', scope: SymbolScope.LocalScope, index: 1},
    };

    const globals = new SymbolTable();

    const a = globals.define('a');
    expect(a).toEqual(expected.a);

    const b = globals.define('b');
    expect(b).toEqual(expected.b);

    const locals = new SymbolTable(globals);

    const c = locals.define('c');
    expect(c).toEqual(expected.c);

    const d = locals.define('d');
    expect(d).toEqual(expected.d);

    const nested = new SymbolTable(locals);

    const e = nested.define('e');
    expect(e).toEqual(expected.e);

    const f = nested.define('f');
    expect(f).toEqual(expected.f);
  });

  it('should resolve symbols', () => {
    const globals = new SymbolTable();
    globals.define('a');
    globals.defineBuiltin(0, 'l');
    globals.defineFunctionName('func');

    // shadowing should work
    globals.defineFunctionName('b');
    globals.define('b');

    const locals = new SymbolTable(globals);
    locals.define('c');
    locals.define('d');

    const nested = new SymbolTable(locals);
    nested.define('e');
    nested.define('f');

    const tests = [
      {
        table: globals,
        expectedSymbols: [
          {name: 'a', scope: SymbolScope.GlobalScope, index: 0},
          {name: 'b', scope: SymbolScope.GlobalScope, index: 1},
          {name: 'l', scope: SymbolScope.BuiltinScope, index: 0},
          {name: 'func', scope: SymbolScope.FunctionScope, index: 0},
        ],
        expectedFreeSymbols: [],
      },
      {
        table: locals,
        expectedSymbols: [
          {name: 'a', scope: SymbolScope.GlobalScope, index: 0},
          {name: 'b', scope: SymbolScope.GlobalScope, index: 1},
          {name: 'c', scope: SymbolScope.LocalScope, index: 0},
          {name: 'd', scope: SymbolScope.LocalScope, index: 1},
          {name: 'l', scope: SymbolScope.BuiltinScope, index: 0},
        ],
        expectedFreeSymbols: [],
      },
      {
        table: nested,
        expectedSymbols: [
          {name: 'a', scope: SymbolScope.GlobalScope, index: 0},
          {name: 'b', scope: SymbolScope.GlobalScope, index: 1},
          {name: 'c', scope: SymbolScope.FreeScope, index: 0},
          {name: 'd', scope: SymbolScope.FreeScope, index: 1},
          {name: 'e', scope: SymbolScope.LocalScope, index: 0},
          {name: 'f', scope: SymbolScope.LocalScope, index: 1},
          {name: 'l', scope: SymbolScope.BuiltinScope, index: 0},
        ],
        expectedFreeSymbols: [
          {name: 'c', scope: SymbolScope.LocalScope, index: 0},
          {name: 'd', scope: SymbolScope.LocalScope, index: 1},
        ],
      },
    ];

    tests.forEach(test => {
      test.expectedSymbols.forEach(expectedSymbol => {
        const actual = test.table.resolve(expectedSymbol.name);
        expect(actual).toEqual(expectedSymbol);
      });

      test.expectedFreeSymbols.forEach((expectedFreeSymbol, idx) => {
        const actual = test.table.freeSymbols[idx];
        expect(actual).toEqual(expectedFreeSymbol);
      });
    });
  });

  it('should not resolve unresolvable free symbols', () => {
    const globals = new SymbolTable();
    globals.define('a');

    const locals = new SymbolTable(globals);
    locals.define('c');

    const nested = new SymbolTable(locals);
    nested.define('e');
    nested.define('f');

    const b = nested.resolve('b');
    expect(b).toBeUndefined();
    const d = nested.resolve('d');
    expect(d).toBeUndefined();
  });
});
