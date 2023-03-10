export enum TokenType {
  ILLEGAL = 'ILLEGAL',
  EOF = 'EOF',

  // Identifiers and literals
  IDENT = 'IDENT',
  INT = 'INT',

  // Operators
  ASSIGN = '=',
  PLUS = '+',
  MINUS = '-',
  BANG = '!',
  ASTERISK = '*',
  SLASH = '/',

  // Comparison Operators
  LT = '<',
  GT = '>',
  EQ = '==',
  NEQ = '!=',

  // Delimiters
  COMMA = ',',
  SEMICOLON = ';',

  LPAREN = '(',
  RPAREN = ')',
  LBRACE = '{',
  RBRACE = '}',

  // Keywords
  FUNCTION = 'FUNCTION',
  LET = 'LET',
  TRUE = 'TRUE',
  FALSE = 'FALSE',
  IF = 'IF',
  ELSE = 'ELSE',
  RETURN = 'RETURN',
}

export interface Token {
  type: TokenType;
  literal: string;
}

const keywords: {[keyword: string]: TokenType} = {
  fn: TokenType.FUNCTION,
  let: TokenType.LET,
  true: TokenType.TRUE,
  false: TokenType.FALSE,
  if: TokenType.IF,
  else: TokenType.ELSE,
  return: TokenType.RETURN,
};

export function lookupIdentifier(identifier: string) {
  if (keywords[identifier] !== undefined) {
    return keywords[identifier];
  }
  return TokenType.IDENT;
}
