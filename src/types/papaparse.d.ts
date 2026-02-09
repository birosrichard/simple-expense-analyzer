declare module 'papaparse' {
  export interface ParseError {
    type: string;
    code: string;
    message: string;
    row?: number;
  }

  export interface ParseMeta {
    delimiter: string;
    linebreak: string;
    aborted: boolean;
    fields?: string[];
    truncated?: boolean;
  }

  export interface ParseResult<T> {
    data: T[];
    errors: ParseError[];
    meta: ParseMeta;
  }

  export function parse<T = unknown>(
    input: string,
    config?: {
      delimiter?: string;
      newline?: string;
      quoteChar?: string;
      header?: boolean;
      dynamicTyping?: boolean;
      skipEmptyLines?: boolean;
      transformHeader?: (header: string) => string;
    }
  ): ParseResult<T>;

  const Papa: {
    parse: typeof parse;
  };
  export default Papa;
}
