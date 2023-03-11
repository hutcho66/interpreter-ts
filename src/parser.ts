import Lexer from './lexer';
import {Token, TokenType} from './token';
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
      [TokenType.MINUS]: this.parsePrefixExpression,
      [TokenType.BANG]: this.parsePrefixExpression,
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

  // hands off to a dedicated statment parser depending on token type
  private parseStatement(): Statement | null {
    switch (this.currentToken.type) {
      case TokenType.LET:
        return this.parseLetStatement();
      case TokenType.RETURN:
        return this.parseReturnStatement();
      default:
        return this.parseExpressionStatement();
    }
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
        `ParsingError: no prefix parsing function found for ${this.currentToken.type}`
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

  // parse an identifier - must be arrow function to retain this context
  private parseIdentifier = () => {
    return new Identifier(this.currentToken, this.currentToken.literal);
  };

  // parse an integer literal - must be arrow function to retain this context
  private parseIntegerLiteral = () => {
    const value = Number(this.currentToken.literal);
    return new IntegerLiteral(this.currentToken, value);
  };

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
