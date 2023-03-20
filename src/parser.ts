import Lexer from './lexer';
import {Token, TokenType} from './token';
import {
  HashLiteral,
  AssignmentStatement,
  WhileExpression,
  BreakStatement,
} from './ast';
import {
  CallExpression,
  StringLiteral,
  ArrayLiteral,
  IndexExpression,
} from './ast';
import {
  BooleanLiteral,
  IfExpression,
  BlockStatement,
  FunctionLiteral,
} from './ast';
import {
  ExpressionStatement,
  InfixExpression,
  IntegerLiteral,
  PrefixExpression,
} from './ast';
import {
  Program,
  Statement,
  LetStatement,
  Identifier,
  ReturnStatement,
  Expression,
} from './ast';

type PrefixParsingFunction = () => Expression | null;
type InfixParsingFunction = (expression: Expression) => Expression | null;

enum Precedence {
  LOWEST,
  EQUALS,
  LESSGREATER,
  SUM,
  PRODUCT,
  PREFIX,
  CALL,
  INDEX,
}

const PrecedenceMap: {[token in TokenType]?: Precedence} = {
  [TokenType.EQ]: Precedence.EQUALS,
  [TokenType.NEQ]: Precedence.EQUALS,
  [TokenType.LT]: Precedence.LESSGREATER,
  [TokenType.GT]: Precedence.LESSGREATER,
  [TokenType.PLUS]: Precedence.SUM,
  [TokenType.MINUS]: Precedence.SUM,
  [TokenType.SLASH]: Precedence.PRODUCT,
  [TokenType.ASTERISK]: Precedence.PRODUCT,
  [TokenType.LPAREN]: Precedence.CALL,
  [TokenType.LBRACKET]: Precedence.INDEX,
};

export default class Parser {
  private currentToken: Token;
  private peekToken: Token;
  private prefixParsingFunctions: {
    [token in TokenType]?: PrefixParsingFunction;
  };
  private infixParsingFunctions: {[token in TokenType]?: InfixParsingFunction};
  public errors: string[] = [];

  constructor(private lexer: Lexer) {
    // initialise tokens
    this.currentToken = lexer.nextToken();
    this.peekToken = lexer.nextToken();
    this.prefixParsingFunctions = {
      [TokenType.IDENT]: this.parseIdentifier,
      [TokenType.INT]: this.parseIntegerLiteral,
      [TokenType.STRING]: this.parseStringLiteral,
      [TokenType.MINUS]: this.parsePrefixExpression,
      [TokenType.BANG]: this.parsePrefixExpression,
      [TokenType.TRUE]: this.parseBooleanLiteral,
      [TokenType.FALSE]: this.parseBooleanLiteral,
      [TokenType.LPAREN]: this.parseGroupedExpression,
      [TokenType.LBRACKET]: this.parseArrayLiteral,
      [TokenType.LBRACE]: this.parseHashLiteral,
      [TokenType.IF]: this.parseIfExpression,
      [TokenType.WHILE]: this.parseWhileExpression,
      [TokenType.FUNCTION]: this.parseFunctionLiteral,
    };
    this.infixParsingFunctions = {
      [TokenType.PLUS]: this.parseInfixExpression,
      [TokenType.MINUS]: this.parseInfixExpression,
      [TokenType.SLASH]: this.parseInfixExpression,
      [TokenType.ASTERISK]: this.parseInfixExpression,
      [TokenType.EQ]: this.parseInfixExpression,
      [TokenType.NEQ]: this.parseInfixExpression,
      [TokenType.LT]: this.parseInfixExpression,
      [TokenType.GT]: this.parseInfixExpression,
      [TokenType.LPAREN]: this.parseCallExpression,
      [TokenType.LBRACKET]: this.parseIndexExpression,
    };
  }

  public parseProgram(): Program {
    const program = new Program([]);

    while (this.currentToken.type !== TokenType.EOF) {
      const statement = this.parseStatement();
      if (statement !== null) {
        program.statements.push(statement);
      }

      this.nextToken();
    }

    return program;
  }

  // parse an identifier - must be arrow function to retain this context
  private parseIdentifier = () => {
    return new Identifier(this.currentToken, this.currentToken.literal);
  };

  // parse an integer literal - must be arrow function to retain this context
  private parseIntegerLiteral = () => {
    const value = Number(this.currentToken.literal);
    return new IntegerLiteral(this.currentToken, value);
  };

  // parse an string literal - must be arrow function to retain this context
  private parseStringLiteral = () => {
    const value = this.currentToken.literal;
    return new StringLiteral(this.currentToken, value);
  };

  // parse a boolean literal - must be arrow function to retain this context
  private parseBooleanLiteral = () => {
    const value = this.currentToken.type === TokenType.TRUE; // this will return a javascript boolean!
    return new BooleanLiteral(this.currentToken, value);
  };

  // hands off to a dedicated statment parser depending on token type
  private parseStatement(): Statement | null {
    switch (this.currentToken.type) {
      case TokenType.LET:
        return this.parseLetStatement();
      case TokenType.RETURN:
        return this.parseReturnStatement();
      case TokenType.IDENT:
        if (this.isPeekToken(TokenType.ASSIGN)) {
          return this.parseAssignmentStatement();
        } else {
          return this.parseExpressionStatement();
        }
      case TokenType.BREAK:
        return this.parseBreakStatement();
      default:
        return this.parseExpressionStatement();
    }
  }

  private parseBreakStatement(): BreakStatement | null {
    const token = this.currentToken;

    if (this.isPeekToken(TokenType.SEMICOLON)) {
      this.nextToken();
    }

    return new BreakStatement(token);
  }

  private parseAssignmentStatement(): AssignmentStatement | null {
    const identifier = new Identifier(
      this.currentToken,
      this.currentToken.literal
    );

    this.nextToken();
    const token = this.currentToken; // token should be '='

    this.nextToken();
    const exp = this.parseExpression(Precedence.LOWEST);
    if (exp === null) return null;

    if (this.isPeekToken(TokenType.SEMICOLON)) {
      this.nextToken();
    }

    return new AssignmentStatement(token, identifier, exp);
  }

  // parse a let statment
  private parseLetStatement(): LetStatement | null {
    // token should be the let token
    const token = this.currentToken;

    // return null if next token isn't an identifier
    if (!this.expectNextToken(TokenType.IDENT)) return null;

    // get the next token and set it to name
    const name = new Identifier(this.currentToken, this.currentToken.literal);

    // verify the next token is assign
    if (!this.expectNextToken(TokenType.ASSIGN)) return null;
    this.nextToken();

    const expression = this.parseExpression(Precedence.LOWEST);
    if (expression === null) {
      return null;
    }

    if (this.isPeekToken(TokenType.SEMICOLON)) {
      this.nextToken();
    }

    return new LetStatement(token, name, expression);
  }

  // parse a return statement
  private parseReturnStatement(): ReturnStatement | null {
    // token should be the return token
    const token = this.currentToken;

    this.nextToken();

    const expression = this.parseExpression(Precedence.LOWEST);
    if (expression === null) {
      return null;
    }

    if (this.isPeekToken(TokenType.SEMICOLON)) {
      this.nextToken();
    }

    return new ReturnStatement(token, expression);
  }

  // parse a block statement
  private parseBlockStatement() {
    const token = this.currentToken;
    const statements = [];

    this.nextToken();
    while (
      !this.isCurrentToken(TokenType.RBRACE) &&
      !this.isCurrentToken(TokenType.EOF)
    ) {
      const statement = this.parseStatement();
      if (statement !== null) {
        statements.push(statement);
      }

      this.nextToken();
    }

    return new BlockStatement(token, statements);
  }

  // parse an expression statement
  private parseExpressionStatement(): ExpressionStatement | null {
    const token = this.currentToken;
    const value = this.parseExpression(Precedence.LOWEST);

    if (this.isPeekToken(TokenType.SEMICOLON)) {
      this.nextToken();
    }

    if (value === null) {
      return null;
    }

    return new ExpressionStatement(token, value!);
  }

  // parse an expression at a given precedence level
  private parseExpression(precedence: Precedence) {
    const prefixFunction = this.prefixParsingFunctions[this.currentToken.type];
    if (prefixFunction === undefined) {
      this.errors.push(
        `ParsingError: no prefix parsing function found for ${
          this.currentToken.type
        }${
          this.currentToken.type === TokenType.ILLEGAL
            ? ' ' + this.currentToken.literal
            : ''
        }`
      );
      return null;
    }

    let left = prefixFunction();
    if (left === null) return left;

    while (
      !this.isPeekToken(TokenType.SEMICOLON) &&
      precedence < this.peekPrecedence()!
    ) {
      const infixFunction = this.infixParsingFunctions[this.peekToken.type];
      if (infixFunction === undefined) {
        return left;
      }

      this.nextToken();
      left = infixFunction(left);
      if (left === null) return left;
    }

    return left;
  }

  // parse an prefix expression - must be arrow function to retain this context
  private parsePrefixExpression = () => {
    const token = this.currentToken;
    const operator = this.currentToken.literal;

    this.nextToken();

    const right = this.parseExpression(Precedence.PREFIX);
    if (right === null) {
      return null;
    }

    return new PrefixExpression(token, operator, right);
  };

  // parse an infix expression - must be arrow function to retain this context
  private parseInfixExpression = (left: Expression) => {
    const token = this.currentToken;
    const operator = this.currentToken.literal;

    const precedence = this.currentPrecedence();
    if (precedence === undefined) {
      this.errors.push(
        `ParsingError: no precendence defined for ${this.currentToken.type}`
      );
      return null;
    }

    this.nextToken();
    const right = this.parseExpression(precedence);
    if (right === null) {
      return null;
    }

    return new InfixExpression(token, operator, left, right);
  };

  // parse a grouped expression - must be arrow function to retain this context
  private parseGroupedExpression = () => {
    this.nextToken();

    const expression = this.parseExpression(Precedence.LOWEST);
    if (!this.expectNextToken(TokenType.RPAREN)) {
      return null;
    }

    return expression;
  };

  // parse an if expression - must be arrow function to retain this context
  private parseIfExpression = () => {
    const token = this.currentToken;
    if (!this.expectNextToken(TokenType.LPAREN)) {
      return null;
    }

    this.nextToken();
    const condition = this.parseExpression(Precedence.LOWEST);
    if (condition === null) {
      return null;
    }

    if (!this.expectNextToken(TokenType.RPAREN)) {
      return null;
    }

    if (!this.expectNextToken(TokenType.LBRACE)) {
      return null;
    }

    const consequence = this.parseBlockStatement();
    if (consequence === null) {
      return null;
    }

    if (this.isPeekToken(TokenType.ELSE)) {
      this.nextToken();

      if (!this.expectNextToken(TokenType.LBRACE)) {
        return null;
      }

      const alternative = this.parseBlockStatement();

      return new IfExpression(token, condition, consequence, alternative);
    }

    return new IfExpression(token, condition, consequence);
  };

  // parse an while expression - must be arrow function to retain this context
  private parseWhileExpression = () => {
    const token = this.currentToken;
    if (!this.expectNextToken(TokenType.LPAREN)) {
      return null;
    }

    this.nextToken();
    const condition = this.parseExpression(Precedence.LOWEST);
    if (condition === null) {
      return null;
    }

    if (!this.expectNextToken(TokenType.RPAREN)) {
      return null;
    }

    if (!this.expectNextToken(TokenType.LBRACE)) {
      return null;
    }

    const loop = this.parseBlockStatement();
    if (loop === null) {
      return null;
    }

    return new WhileExpression(token, condition, loop);
  };

  // parse a function literal - must be arrow function to retain this context
  private parseFunctionLiteral = () => {
    const token = this.currentToken;
    if (!this.expectNextToken(TokenType.LPAREN)) {
      return null;
    }

    const parameters = this.parseFunctionParameters();
    if (parameters === null) {
      return null;
    }

    if (!this.expectNextToken(TokenType.LBRACE)) {
      return null;
    }

    const body = this.parseBlockStatement();
    if (body === null) {
      return null;
    }

    return new FunctionLiteral(token, parameters, body);
  };

  // Parse function parameters
  private parseFunctionParameters = () => {
    const identifiers: Identifier[] = [];

    if (this.isPeekToken(TokenType.RPAREN)) {
      this.nextToken();
      return identifiers;
    }

    this.nextToken();

    identifiers.push(
      new Identifier(this.currentToken, this.currentToken.literal)
    );

    while (this.isPeekToken(TokenType.COMMA)) {
      // move past comma
      this.nextToken();
      this.nextToken();

      identifiers.push(
        new Identifier(this.currentToken, this.currentToken.literal)
      );
    }

    if (!this.expectNextToken(TokenType.RPAREN)) {
      return null;
    }

    return identifiers;
  };

  // parse a call expression - must be arrow function to retain this context
  private parseCallExpression = (func: Expression) => {
    const token = this.currentToken;
    const args = this.parseExpressionList(TokenType.RPAREN);
    if (args === null) return null;

    return new CallExpression(token, func, args);
  };

  // parse an array literal - must be arrow function to retain this context
  private parseArrayLiteral = () => {
    const token = this.currentToken;
    const elements = this.parseExpressionList(TokenType.RBRACKET);
    if (elements === null) return null;

    return new ArrayLiteral(token, elements);
  };

  // Parse call arguments
  private parseExpressionList = (end: TokenType) => {
    const list: Expression[] = [];

    if (this.isPeekToken(end)) {
      this.nextToken();
      return list;
    }

    this.nextToken();

    let exp = this.parseExpression(Precedence.LOWEST);
    if (exp === null) return null;
    list.push(exp);

    while (this.isPeekToken(TokenType.COMMA)) {
      // move past comma
      this.nextToken();
      this.nextToken();

      exp = this.parseExpression(Precedence.LOWEST);
      if (exp === null) return null;
      list.push(exp);
    }

    if (!this.expectNextToken(end)) {
      return null;
    }

    return list;
  };

  // parse an index expression - must be arrow function to retain this context
  private parseIndexExpression = (left: Expression) => {
    const token = this.currentToken;

    this.nextToken();

    const index = this.parseExpression(Precedence.LOWEST);

    if (index === null || !this.expectNextToken(TokenType.RBRACKET)) {
      return null;
    }

    return new IndexExpression(token, left, index);
  };

  // parse a hash literal - must be arrow function to retain this context
  private parseHashLiteral = () => {
    const token = this.currentToken;
    const pairs = new Map<Expression, Expression>();

    while (!this.isPeekToken(TokenType.RBRACE)) {
      this.nextToken();
      const key = this.parseExpression(Precedence.LOWEST);
      if (key === null) return key;

      if (!this.expectNextToken(TokenType.COLON)) return null;
      this.nextToken();
      const value = this.parseExpression(Precedence.LOWEST);
      if (value === null) return value;

      pairs.set(key, value);

      if (
        !this.isPeekToken(TokenType.RBRACE) &&
        !this.expectNextToken(TokenType.COMMA)
      )
        return null;
    }

    if (!this.expectNextToken(TokenType.RBRACE)) return null;

    return new HashLiteral(token, pairs);
  };

  // Check precedence of next token
  private peekPrecedence() {
    if (PrecedenceMap[this.peekToken.type] !== undefined) {
      return PrecedenceMap[this.peekToken.type];
    }

    return Precedence.LOWEST;
  }

  // Check precedence of current token
  private currentPrecedence() {
    if (PrecedenceMap[this.currentToken.type] !== undefined) {
      return PrecedenceMap[this.currentToken.type];
    }

    return Precedence.LOWEST;
  }

  // Check peek token type
  private isPeekToken(type: TokenType) {
    return this.peekToken.type === type;
  }

  // Check current token type
  private isCurrentToken(type: TokenType) {
    return this.currentToken.type === type;
  }

  // check type of next token
  // if it's correct, increment token and return true
  // if not, raise error and return false
  private expectNextToken(type: TokenType) {
    if (this.peekToken.type !== type) {
      this.errors.push(
        `SyntaxError: expected ${type}, got ${this.peekToken.type}`
      );
      return false;
    }

    this.nextToken();
    return true;
  }

  // get the next token from the lexer
  private nextToken() {
    this.currentToken = this.peekToken;
    this.peekToken = this.lexer.nextToken();
  }
}
