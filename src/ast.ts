import {Token} from './token';
export interface Node {
  // All nodes must have a function that returns a literal value
  tokenLiteral: () => string;
  string: () => string;
}

// An expression is a node that has a return value
export interface Expression extends Node {
  type: 'expression';
}

// A statement is a node that has no return value
export interface Statement extends Node {
  type: 'statement';
}

// A program is a node consisting of a sequence of statements
export class Program implements Node {
  constructor(public statements: Statement[]) {}

  // A program's token literal is the token literal of its first statement
  tokenLiteral() {
    if (this.statements.length > 0) {
      return this.statements[0].tokenLiteral();
    } else {
      return '';
    }
  }

  string() {
    return this.statements.map(s => s.string()).join(' ');
  }
}

// A let statement has an identifier and an expression value
export class LetStatement implements Statement {
  type = 'statement' as const;
  constructor(
    public token: Token,
    public name: Identifier,
    public value: Expression
  ) {}

  tokenLiteral() {
    return this.token.literal;
  }

  string() {
    return `let ${this.name.string()} = ${this.value.string()};`;
  }
}

// A return statement only has an expression value
export class ReturnStatement implements Statement {
  type = 'statement' as const;
  constructor(public token: Token, public value: Expression) {}

  tokenLiteral() {
    return this.token.literal;
  }

  string() {
    return `return ${this.value.string()};`;
  }
}

// An expression statement is an expression that returns itself
export class ExpressionStatement implements Statement {
  type = 'statement' as const;
  constructor(public token: Token, public value: Expression) {}

  tokenLiteral() {
    return this.token.literal;
  }

  string() {
    return `${this.value.string()};`;
  }
}

// An block statement is an array of statements
export class BlockStatement implements Statement {
  type = 'statement' as const;
  constructor(public token: Token, public statements: Statement[]) {}

  tokenLiteral() {
    return this.token.literal;
  }

  string() {
    return this.statements.map(s => s.string()).join('');
  }
}

// An identifier is an expression that returns itself
export class Identifier implements Expression {
  type = 'expression' as const;
  constructor(public token: Token, public value: string) {}

  tokenLiteral() {
    return this.token.literal;
  }

  string() {
    return this.value;
  }
}

// An integer literal is an expression that returns the number value of an integer
export class IntegerLiteral implements Expression {
  type = 'expression' as const;
  constructor(public token: Token, public value: number) {}

  tokenLiteral() {
    return this.token.literal;
  }

  string() {
    return this.token.literal;
  }
}

// An string literal is an expression that returns the string
export class StringLiteral implements Expression {
  type = 'expression' as const;
  constructor(public token: Token, public value: string) {}

  tokenLiteral() {
    return this.token.literal;
  }

  string() {
    return this.token.literal;
  }
}

// An boolean literal is an expression that returns a boolean
export class BooleanLiteral implements Expression {
  type = 'expression' as const;
  constructor(public token: Token, public value: boolean) {}

  tokenLiteral() {
    return this.token.literal;
  }

  string() {
    return this.token.literal;
  }
}

// A prefix expression has a prefix operator and a right expression
export class PrefixExpression implements Expression {
  type = 'expression' as const;
  constructor(
    public token: Token,
    public operator: string,
    public right: Expression
  ) {}

  tokenLiteral() {
    return this.token.literal;
  }

  string() {
    return `(${this.operator}${this.right.string()})`;
  }
}

// An infix expression has an operator, a left and a right expression
export class InfixExpression implements Expression {
  type = 'expression' as const;
  constructor(
    public token: Token,
    public operator: string,
    public left: Expression,
    public right: Expression
  ) {}

  tokenLiteral() {
    return this.token.literal;
  }

  string() {
    return `(${this.left.string()} ${this.operator} ${this.right.string()})`;
  }
}

// An if expression has a condition expression and a consequence and alternative block statement
export class IfExpression implements Expression {
  type = 'expression' as const;
  constructor(
    public token: Token,
    public condition: Expression,
    public consequence: BlockStatement,
    public alternative?: BlockStatement
  ) {}

  tokenLiteral() {
    return this.token.literal;
  }

  string() {
    let s = `if ${this.condition.string()} ${this.consequence.string()}`;
    if (this.alternative) s += ` else ${this.alternative.string()}`;

    return s;
  }
}

// An function literal has a list of parameters and a body
export class FunctionLiteral implements Expression {
  type = 'expression' as const;
  constructor(
    public token: Token,
    public parameters: Identifier[],
    public body: BlockStatement
  ) {}

  tokenLiteral() {
    return this.token.literal;
  }

  string() {
    let s = `${this.token.literal} (`;
    s += this.parameters.map(param => param.string());
    s += `) ${this.body.string()}`;

    return s;
  }
}

// An call literal has an expression returning a function and a list of arguments
export class CallExpression implements Expression {
  type = 'expression' as const;
  constructor(
    public token: Token,
    public func: Expression,
    public args: Expression[]
  ) {}

  tokenLiteral() {
    return this.token.literal;
  }

  string() {
    let s = `${this.func.string()}(`;
    s += this.args.map(arg => arg.string()).join(', ');
    s += ')';

    return s;
  }
}

export class ArrayLiteral implements Expression {
  type = 'expression' as const;
  constructor(public token: Token, public elements: Expression[]) {}

  tokenLiteral() {
    return this.token.literal;
  }

  string() {
    const s = `[${this.elements.map(e => e.string()).join(', ')}]`;

    return s;
  }
}

export class IndexExpression implements Expression {
  type = 'expression' as const;
  constructor(
    public token: Token,
    public left: Expression,
    public index: Expression
  ) {}

  tokenLiteral() {
    return this.token.literal;
  }

  string() {
    const s = `(${this.left.string()}[${this.index.string()}])`;

    return s;
  }
}

export class HashLiteral implements Expression {
  type = 'expression' as const;
  constructor(
    public token: Token,
    public pairs: Map<Expression, Expression> // cant use JS object as we are using expressions as keys!
  ) {}

  tokenLiteral() {
    return this.token.literal;
  }

  string() {
    const strings: string[] = [];
    this.pairs.forEach((key, value) => {
      strings.push(`${key.string()}: ${value.string()}`);
    });

    const s = `{${strings.join(', ')}}`;

    return s;
  }
}
