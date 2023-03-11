import {Token} from './token';
interface Node {
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
    const statementStrings = [];
    for (const statement of this.statements) {
      statementStrings.push(statement.string());
    }

    return statementStrings.join('\n');
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
    return `${this.value.string()}`;
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
