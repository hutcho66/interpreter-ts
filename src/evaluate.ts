import {
  Node,
  IntegerLiteral,
  Program,
  ExpressionStatement,
  LetStatement,
  FunctionLiteral,
} from './ast';
import {
  Obj,
  IntegerObj,
  NullObj,
  BooleanObj,
  ObjectType,
  ReturnValueObj,
} from './object';
import {ReturnStatement, Identifier, CallExpression} from './ast';
import {ErrorObj, Environment, FunctionObj} from './object';
import {
  Expression,
  BooleanLiteral,
  PrefixExpression,
  InfixExpression,
  BlockStatement,
  IfExpression,
} from './ast';

const BOOLEANS = {
  TRUE: new BooleanObj(true),
  FALSE: new BooleanObj(false),
};

const INTEGERS: {[key: number]: IntegerObj} = {};
function getIntegerObject(value: number) {
  let lookupInteger = INTEGERS[value];
  if (!lookupInteger) {
    lookupInteger = new IntegerObj(value);
    INTEGERS[value] = lookupInteger;
  }

  return lookupInteger;
}

const NULL = new NullObj();

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

  if (node instanceof LetStatement) {
    const value = evaluate(node.value, env);
    if (value instanceof ErrorObj) return value;
    env.set(node.name.value, value);
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

  if (node instanceof FunctionLiteral) {
    return new FunctionObj(node.parameters, node.body, env);
  }

  if (node instanceof CallExpression) {
    const func = evaluate(node.func, env);
    if (func instanceof ErrorObj) return func;

    const args = evaluateExpressions(node.args, env);
    if (args instanceof ErrorObj) return args;

    return applyFunction(func, args);
  }

  if (node instanceof IntegerLiteral) {
    return getIntegerObject(node.value);
  }

  if (node instanceof BooleanLiteral) {
    return node.value ? BOOLEANS.TRUE : BOOLEANS.FALSE;
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
      (result instanceof ReturnValueObj || result instanceof ErrorObj)
    ) {
      return result;
    }
  }

  return result;
}

function evaluateIdentifier(node: Identifier, env: Environment): Obj {
  const value = env.get(node.value);
  if (!value) {
    return new ErrorObj(`identifier not found: ${node.value}`);
  }

  return value;
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

function applyFunction(func: Obj, args: Obj[]): Obj {
  if (!(func instanceof FunctionObj)) {
    return new ErrorObj(`not a function: ${func.type()}`);
  }

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

function isTruthy(obj: Obj) {
  switch (obj) {
    case NULL:
    case BOOLEANS.FALSE:
      return false;
    case BOOLEANS.TRUE:
    default:
      return true;
  }
}

function evaluateBangExpression(obj: Obj): Obj {
  return isTruthy(obj) ? BOOLEANS.FALSE : BOOLEANS.TRUE;
}

function evaluateMinusPrefixExpression(obj: Obj): Obj {
  if (obj.type() !== ObjectType.INTEGER_OBJ) {
    return new ErrorObj(`unknown operator: -${obj.type()}`);
  }

  const value = -(<IntegerObj>obj).value;
  return getIntegerObject(value);
}

function evaluateInfixExpression(operator: string, left: Obj, right: Obj): Obj {
  if (left.type() !== right.type()) {
    return new ErrorObj(
      `type mismatch: ${left.type()} ${operator} ${right.type()}`
    );
  }

  if (
    left.type() === ObjectType.INTEGER_OBJ &&
    right.type() === ObjectType.INTEGER_OBJ
  ) {
    return evaluateIntegerInfixExpression(operator, left, right);
  }

  if (operator === '==') return left === right ? BOOLEANS.TRUE : BOOLEANS.FALSE;
  if (operator === '!=') return left !== right ? BOOLEANS.TRUE : BOOLEANS.FALSE;

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
      return left === right ? BOOLEANS.TRUE : BOOLEANS.FALSE;
    case '!=':
      return left !== right ? BOOLEANS.TRUE : BOOLEANS.FALSE;
    default:
      break;
  }

  // all other operations require unwrapping the integers
  const leftValue = (<IntegerObj>left).value;
  const rightValue = (<IntegerObj>right).value;

  switch (operator) {
    case '+':
      return getIntegerObject(leftValue + rightValue);
    case '-':
      return getIntegerObject(leftValue - rightValue);
    case '*':
      return getIntegerObject(leftValue * rightValue);
    case '/': // integer division!
      return getIntegerObject(Math.trunc(leftValue / rightValue));
    case '<':
      return leftValue < rightValue ? BOOLEANS.TRUE : BOOLEANS.FALSE;
    case '>':
      return leftValue > rightValue ? BOOLEANS.TRUE : BOOLEANS.FALSE;
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
    return evaluate(node.consequence, env);
  } else if (node.alternative) {
    return evaluate(node.alternative, env);
  }

  return NULL;
}
