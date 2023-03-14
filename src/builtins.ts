import {
  Obj,
  ErrorObj,
  StringObj,
  BuiltinObj,
  BooleanObj,
  EmptyObj,
  IntegerObj,
  NullObj,
  ArrayObj,
} from './object';

const NULL = new NullObj();
const EMPTY = new EmptyObj();
const BOOLEAN = {
  TRUE: new BooleanObj(true),
  FALSE: new BooleanObj(false),
};
const integerMap: {[key: number]: IntegerObj} = {};
const INTEGER = (value: number) => {
  let lookupInteger = integerMap[value];
  if (!lookupInteger) {
    lookupInteger = new IntegerObj(value);
    integerMap[value] = lookupInteger;
  }
  return lookupInteger;
};

/*
 * Define builtins here and add to map below
 */

// returns length of string or array type
const len = (args: Obj[]) => {
  if (args.length !== 1)
    return new ErrorObj("invalid number of arguments for 'len'");

  const arg = args[0];
  if (arg instanceof StringObj) return INTEGER(arg.value.length);
  if (arg instanceof ArrayObj) return INTEGER(arg.elements.length);

  return new ErrorObj(`argument ${arg.type()} to 'len' not supported`);
};

// return first element of array
const first = (args: Obj[]) => {
  if (args.length !== 1)
    return new ErrorObj("invalid number of arguments for 'first'");

  const arg = args[0];
  if (arg instanceof ArrayObj)
    return arg.elements.length > 0 ? arg.elements[0] : NULL;

  return new ErrorObj(`argument ${arg.type()} to 'first' not supported`);
};

// return last element of array
const last = (args: Obj[]) => {
  if (args.length !== 1)
    return new ErrorObj("invalid number of arguments for 'last'");

  const arg = args[0];
  if (arg instanceof ArrayObj) {
    const length = arg.elements.length;
    return length > 0 ? arg.elements[length - 1] : NULL;
  }

  return new ErrorObj(`argument ${arg.type()} to 'last' not supported`);
};

// return rest of array excluding first element
const rest = (args: Obj[]) => {
  if (args.length !== 1)
    return new ErrorObj("invalid number of arguments for 'rest'");

  const arg = args[0];
  if (arg instanceof ArrayObj) {
    const length = arg.elements.length;
    if (length < 1) return NULL;

    return new ArrayObj(arg.elements.slice(1));
  }

  return new ErrorObj(`argument ${arg.type()} to 'rest' not supported`);
};

// adds new element to array
const push = (args: Obj[]) => {
  if (args.length !== 2)
    return new ErrorObj("invalid number of arguments for 'push'");

  const array = args[0];
  const newElement = args[1];
  if (array instanceof ArrayObj) {
    return new ArrayObj(array.elements.concat(newElement));
  }

  return new ErrorObj(`argument ${array.type()} to 'push' not supported`);
};

// print object
const puts = (args: Obj[]) => {
  for (const arg of args) {
    console.log(arg.display());
  }

  return EMPTY;
};

const BUILTIN: {[key: string]: BuiltinObj} = {
  len: new BuiltinObj(len),
  first: new BuiltinObj(first),
  last: new BuiltinObj(last),
  rest: new BuiltinObj(rest),
  push: new BuiltinObj(push),
  puts: new BuiltinObj(puts),
};

export {BOOLEAN, INTEGER, NULL, EMPTY, BUILTIN};

// let map = fn(arr, f) { let iter = fn(arr, accumulated) { if (len(arr) == 0) { accumulated} else { iter(rest(arr), push(accumulated, f(first(arr))));}}; iter(arr, []);};
