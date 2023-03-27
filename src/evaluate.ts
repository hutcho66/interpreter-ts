import {
  ArrayObj,
  HashKey,
  HashPair,
  Hashable,
  HashObj,
  Obj,
  IntegerObj,
  ObjectType,
  ReturnValueObj,
  BreakObj,
} from './object';
import {
  IndexExpression,
  HashLiteral,
  AssignmentStatement,
  WhileExpression,
} from './ast';
import {
  Node,
  IntegerLiteral,
  Program,
  ExpressionStatement,
  LetStatement,
  FunctionLiteral,
  ArrayLiteral,
} from './ast';
import {
  ReturnStatement,
  Identifier,
  CallExpression,
  StringLiteral,
} from './ast';
import {
  ErrorObj,
  Environment,
  FunctionObj,
  StringObj,
  BuiltinObj,
} from './object';
import {
  Expression,
  BooleanLiteral,
  PrefixExpression,
  InfixExpression,
  BlockStatement,
  IfExpression,
} from './ast';
import {BOOLEAN, BUILTIN, EMPTY, INTEGER, NULL} from './builtins';
import {BreakStatement} from './ast';
import {NullObj, EmptyObj} from './object';

export function evaluate(node: Node, env: Environment): Obj {
  if (node instanceof Program) {
    return evaluateProgram(node, env);
  }

  if (node instanceof BlockStatement) {
    return evaluateBlockStatement(node, env);
  }

  if (node instanceof ReturnStatement) {
    const value = evaluate(node.value, env);
    if (value instanceof ErrorObj) return value;
    return new ReturnValueObj(value);
  }

  if (node instanceof BreakStatement) {
    return new BreakObj();
  }

  if (node instanceof LetStatement) {
    const value = evaluate(node.value, env);
    if (value instanceof ErrorObj) return value;
    if (
      value instanceof NullObj ||
      value instanceof EmptyObj ||
      value instanceof BreakObj
    ) {
      return new ErrorObj(`cant assign null to variable '${node.name.value}'`);
    }
    env.set(node.name.value, value);

    // Unlike the go implementation, typescript won't allow us
    // to default to a 'nil' return which means that LET statements
    // would otherwise return NULL which prints to the REPL
    // This special object type is explicitly ignored by the REPL
    return EMPTY;
  }

  if (node instanceof AssignmentStatement) {
    const value = evaluate(node.value, env);
    if (value instanceof ErrorObj) return value;
    if (
      value instanceof NullObj ||
      value instanceof EmptyObj ||
      value instanceof BreakObj
    ) {
      return new ErrorObj(`cant assign null to variable '${node.name.value}'`);
    }

    const result = env.reassign(node.name.value, value);

    if (result === undefined) {
      return new ErrorObj(
        `cant assign to undefined identifier: '${node.name.value}'`
      );
    }

    return EMPTY;
  }

  if (node instanceof Identifier) {
    return evaluateIdentifier(node, env);
  }

  if (node instanceof ExpressionStatement) {
    return evaluate(node.value, env);
  }

  if (node instanceof PrefixExpression) {
    const right = evaluate(node.right, env);
    if (right instanceof ErrorObj) return right;
    return evaluatePrefixExpression(node.operator, right);
  }

  if (node instanceof InfixExpression) {
    const left = evaluate(node.left, env);
    if (left instanceof ErrorObj) return left;
    const right = evaluate(node.right, env);
    if (right instanceof ErrorObj) return right;
    return evaluateInfixExpression(node.operator, left, right);
  }

  if (node instanceof IfExpression) {
    return evaluateIfExpression(node, env);
  }

  if (node instanceof WhileExpression) {
    return evaluateWhileExpression(node, env);
  }

  if (node instanceof CallExpression) {
    const func = evaluate(node.func, env);
    if (func instanceof ErrorObj) return func;

    const args = evaluateExpressions(node.args, env);
    if (args instanceof ErrorObj) return args;

    return applyFunction(func, args);
  }

  if (node instanceof IndexExpression) {
    const left = evaluate(node.left, env);
    if (left instanceof ErrorObj) return left;

    const index = evaluate(node.index, env);
    if (index instanceof ErrorObj) return index;

    return evaluateIndexExpression(left, index);
  }

  if (node instanceof IntegerLiteral) {
    return INTEGER(node.value);
  }

  if (node instanceof StringLiteral) {
    return new StringObj(node.value);
  }

  if (node instanceof BooleanLiteral) {
    return node.value ? BOOLEAN.TRUE : BOOLEAN.FALSE;
  }

  if (node instanceof FunctionLiteral) {
    return new FunctionObj(node.parameters, node.body, env);
  }

  if (node instanceof ArrayLiteral) {
    const elements = evaluateExpressions(node.elements, env);
    if (elements instanceof ErrorObj) return elements;
    return new ArrayObj(elements);
  }

  if (node instanceof HashLiteral) {
    return evaluateHashLiteral(node, env);
  }

  return NULL;
}

function evaluateProgram(program: Program, env: Environment): Obj {
  let result: Obj = NULL;
  for (const statement of program.statements) {
    result = evaluate(statement, env);

    if (result instanceof ReturnValueObj) {
      return result.returnValue;
    }

    if (result instanceof ErrorObj) {
      return result;
    }
  }

  return result;
}

function evaluateBlockStatement(block: BlockStatement, env: Environment): Obj {
  let result: Obj = NULL;

  for (const statement of block.statements) {
    result = evaluate(statement, env);

    if (
      result !== NULL &&
      (result instanceof ReturnValueObj ||
        result instanceof BreakObj ||
        result instanceof ErrorObj)
    ) {
      return result;
    }
  }

  return result;
}

function evaluateIdentifier(node: Identifier, env: Environment): Obj {
  const value = env.get(node.value);
  if (value) return value;

  const builtin = BUILTIN.find(value => value.name === node.value)?.builtin;
  if (builtin) return builtin;

  return new ErrorObj(`identifier not found: ${node.value}`);
}

function evaluateExpressions(
  exps: Expression[],
  env: Environment
): Obj[] | ErrorObj {
  const results: Obj[] = [];
  for (const exp of exps) {
    const evaluated = evaluate(exp, env);
    if (evaluated instanceof ErrorObj) return evaluated;
    results.push(evaluated);
  }

  return results;
}

function evaluatePrefixExpression(operator: string, right: Obj): Obj {
  switch (operator) {
    case '!':
      return evaluateBangExpression(right);
    case '-':
      return evaluateMinusPrefixExpression(right);
    default:
      return new ErrorObj(`unknown operator: ${operator}${right.type()}`);
  }
}

function evaluateIndexExpression(left: Obj, index: Obj): Obj {
  if (left instanceof ArrayObj && index instanceof IntegerObj) {
    return evaluateArrayIndexExpression(left, index);
  }

  if (left instanceof HashObj) {
    return evaluateHashIndexExpression(left, index);
  }

  return new ErrorObj(`unknown operator for indexing: ${left.type()}`);
}

function evaluateArrayIndexExpression(array: ArrayObj, index: IntegerObj): Obj {
  const maxIndex = array.elements.length - 1;

  if (index.value < 0 || index.value > maxIndex) {
    return NULL;
  }

  return array.elements[index.value];
}

function evaluateHashIndexExpression(hash: HashObj, index: Obj): Obj {
  if (!('hash' in index)) {
    return new ErrorObj(`unusable as hash key: ${index.type()}`);
  }
  const hashKey = (index as unknown as Hashable).hash();

  const pair = hash.pairs.get(hashKey);
  if (pair === undefined) return NULL;

  return pair.value;
}

function applyFunction(func: Obj, args: Obj[]): Obj {
  if (func instanceof FunctionObj) {
    const enclosingEnv = Environment.enclosedEnv(func.env);
    for (const idx in func.parameters) {
      enclosingEnv.set(func.parameters[idx].value, args[idx]);
    }

    const evaluated = evaluate(func.body, enclosingEnv);
    if (evaluated instanceof ReturnValueObj) {
      return evaluated.returnValue;
    } else {
      return evaluated;
    }
  }

  if (func instanceof BuiltinObj) {
    return func.func(args);
  }

  return new ErrorObj(`not a function: ${func.type()}`);
}

function isTruthy(obj: Obj) {
  switch (obj) {
    case NULL:
    case BOOLEAN.FALSE:
      return false;
    case BOOLEAN.TRUE:
    default:
      return true;
  }
}

function evaluateBangExpression(obj: Obj): Obj {
  return isTruthy(obj) ? BOOLEAN.FALSE : BOOLEAN.TRUE;
}

function evaluateMinusPrefixExpression(obj: Obj): Obj {
  if (obj.type() !== ObjectType.INTEGER_OBJ) {
    return new ErrorObj(`unknown operator: -${obj.type()}`);
  }

  const value = -(<IntegerObj>obj).value;
  return INTEGER(value);
}

function evaluateInfixExpression(operator: string, left: Obj, right: Obj): Obj {
  if (left.type() !== right.type()) {
    return new ErrorObj(
      `type mismatch: ${left.type()} ${operator} ${right.type()}`
    );
  }

  if (
    left.type() === ObjectType.STRING_OBJ &&
    right.type() === ObjectType.STRING_OBJ
  ) {
    return evaluateStringInfixExpression(operator, left, right);
  }

  if (
    left.type() === ObjectType.INTEGER_OBJ &&
    right.type() === ObjectType.INTEGER_OBJ
  ) {
    return evaluateIntegerInfixExpression(operator, left, right);
  }

  if (operator === '==') return left === right ? BOOLEAN.TRUE : BOOLEAN.FALSE;
  if (operator === '!=') return left !== right ? BOOLEAN.TRUE : BOOLEAN.FALSE;

  return new ErrorObj(
    `unknown operator: ${left.type()} ${operator} ${right.type()}`
  );
}

function evaluateIntegerInfixExpression(
  operator: string,
  left: Obj,
  right: Obj
): Obj {
  // we can do boolean eq and neq without unwrapping because of the integer map
  // this makes integer equivalence faster!
  switch (operator) {
    case '==':
      return left === right ? BOOLEAN.TRUE : BOOLEAN.FALSE;
    case '!=':
      return left !== right ? BOOLEAN.TRUE : BOOLEAN.FALSE;
    default:
      break;
  }

  // all other operations require unwrapping the integers
  const leftValue = (<IntegerObj>left).value;
  const rightValue = (<IntegerObj>right).value;

  switch (operator) {
    case '+':
      return INTEGER(leftValue + rightValue);
    case '-':
      return INTEGER(leftValue - rightValue);
    case '*':
      return INTEGER(leftValue * rightValue);
    case '/': // integer division!
      return INTEGER(Math.trunc(leftValue / rightValue));
    case '<':
      return leftValue < rightValue ? BOOLEAN.TRUE : BOOLEAN.FALSE;
    case '>':
      return leftValue > rightValue ? BOOLEAN.TRUE : BOOLEAN.FALSE;
    default:
      return new ErrorObj(
        `unknown operator: ${left.type()} ${operator} ${right.type()}`
      );
  }
}

function evaluateStringInfixExpression(
  operator: string,
  left: Obj,
  right: Obj
): Obj {
  const leftValue = (<StringObj>left).value;
  const rightValue = (<StringObj>right).value;

  switch (operator) {
    case '==':
      return leftValue === rightValue ? BOOLEAN.TRUE : BOOLEAN.FALSE;
    case '!=':
      return leftValue !== rightValue ? BOOLEAN.TRUE : BOOLEAN.FALSE;
    case '+':
      return new StringObj(leftValue + rightValue);
    default:
      return new ErrorObj(
        `unknown operator: ${left.type()} ${operator} ${right.type()}`
      );
  }
}

function evaluateIfExpression(node: IfExpression, env: Environment): Obj {
  const condition = evaluate(node.condition, env);
  if (condition instanceof ErrorObj) return condition;

  if (isTruthy(condition)) {
    const enclosingEnv = Environment.enclosedEnv(env);
    return evaluate(node.consequence, enclosingEnv);
  } else if (node.alternative) {
    const enclosingEnv = Environment.enclosedEnv(env);
    return evaluate(node.alternative, enclosingEnv);
  }

  return NULL;
}

function evaluateWhileExpression(node: WhileExpression, env: Environment): Obj {
  let condition = evaluate(node.condition, env);
  if (condition instanceof ErrorObj) return condition;

  let result: Obj = NULL;

  while (condition === BOOLEAN.TRUE) {
    const enclosingEnv = Environment.enclosedEnv(env);
    result = evaluate(node.loop, enclosingEnv);
    if (result instanceof ErrorObj) return result;
    if (result instanceof BreakObj) return EMPTY;

    // re-evaluate condition using outer env
    condition = evaluate(node.condition, env);
    if (condition instanceof ErrorObj) return condition;
  }

  return result;
}

function evaluateHashLiteral(node: HashLiteral, env: Environment): Obj {
  const pairs = new Map<HashKey, HashPair>();

  node.pairs.forEach((valueNode, keyNode) => {
    const key = evaluate(keyNode, env);
    if (key instanceof ErrorObj) return key;

    if (!('hash' in key)) {
      return new ErrorObj(`unusable as hash key: ${key.type()}`);
    }
    const hash = (key as unknown as Hashable).hash();

    const value = evaluate(valueNode, env);
    if (value instanceof ErrorObj) return value;

    pairs.set(hash, {key: key, value: value});
    return;
  });

  return new HashObj(pairs);
}
