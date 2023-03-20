export const enum TokenType {
  ILLEGAL = 'ILLEGAL',
  EOF = 'EOF',

  // Identifiers and literals
  IDENT = 'IDENT',
  INT = 'INT',
  STRING = 'STRING',

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
  COLON = ':',

  LPAREN = '(',
  RPAREN = ')',
  LBRACE = '{',
  RBRACE = '}',
  LBRACKET = '[',
  RBRACKET = ']',

  // Keywords
  FUNCTION = 'FUNCTION',
  LET = 'LET',
  TRUE = 'TRUE',
  FALSE = 'FALSE',
  IF = 'IF',
  ELSE = 'ELSE',
  // WHILE = 'WHILE',
  RETURN = 'RETURN',
}

export class Token {
  constructor(public type: TokenType, public literal: string) {}
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
