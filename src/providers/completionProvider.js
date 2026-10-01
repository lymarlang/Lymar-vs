const vscode = require("vscode");

class LuminarCompletionProvider {
  provideCompletionItems(document, position, token, context) {
    const completions = [];
    const line = document.lineAt(position.line).text;
    const beforeCursor = line.substring(0, position.character);
    
    // Context-aware completions
    const isAfterColon = beforeCursor.match(/:\s*$/);
    const isAfterType = beforeCursor.match(/\btype\s+[A-Z][A-Za-z0-9_]*\s*=\s*$/);
    const isInErrorType = beforeCursor.match(/\?\s*$/);
    const isMemberAccess = beforeCursor.match(/\.[a-zA-Z0-9_]*$/);

    // If after a dot (member access), never suggest keywords or snippets.
    // Return method/field suggestions appropriate for member access.
    if (isMemberAccess) {
      const commonMethods = [
        { label: "length", insertText: "length()", detail: "Collection length" },
        { label: "is_empty", insertText: "is_empty()", detail: "Check if empty" },
        { label: "push_back", insertText: "push_back(${1:value})", detail: "Append element to back" },
        { label: "push_front", insertText: "push_front(${1:value})", detail: "Prepend element to front" },
        { label: "pop_back", insertText: "pop_back()", detail: "Remove & return last element" },
        { label: "pop_front", insertText: "pop_front()", detail: "Remove & return first element" },
        { label: "iterator", insertText: "iterator()", detail: "Get iterator" },
        { label: "next", insertText: "next()", detail: "Next element from iterator" },
        { label: "append", insertText: "append(${1:value})", detail: "Append item to list" },
        { label: "clear", insertText: "clear()", detail: "Clear elements" },
        { label: "keys", insertText: "keys()", detail: "Dictionary keys" },
        { label: "values", insertText: "values()", detail: "Dictionary values" }
      ];

      commonMethods.forEach(m => {
        const item = new vscode.CompletionItem(m.label, vscode.CompletionItemKind.Method);
        item.insertText = new vscode.SnippetString(m.insertText);
        item.detail = m.detail;
        completions.push(item);
      });

      return completions;
    }

    // If after colon, prioritize types
    if (isAfterColon || isAfterType || isInErrorType) {
      // Return only type completions
      const types = [
        { name: "int", detail: "Signed integer" },
        { name: "uint", detail: "Unsigned integer" },
        { name: "i8", detail: "8-bit signed integer" },
        { name: "i16", detail: "16-bit signed integer" },
        { name: "i32", detail: "32-bit signed integer" },
        { name: "i64", detail: "64-bit signed integer" },
        { name: "i128", detail: "128-bit signed integer" },
        { name: "u8", detail: "8-bit unsigned integer" },
        { name: "u16", detail: "16-bit unsigned integer" },
        { name: "u32", detail: "32-bit unsigned integer" },
        { name: "u64", detail: "64-bit unsigned integer" },
        { name: "u128", detail: "128-bit unsigned integer" },
        { name: "float", detail: "Floating-point" },
        { name: "f32", detail: "32-bit float" },
        { name: "f64", detail: "64-bit float" },
        { name: "d2", detail: "Decimal with 2 fractional digits" },
        { name: "d4", detail: "Decimal with 4 fractional digits" },
        { name: "d6", detail: "Decimal with 6 fractional digits" },
        { name: "decimal", detail: "Fixed-precision decimal" },
        { name: "bool", detail: "Boolean" },
        { name: "str", detail: "String" },
        { name: "any", detail: "Any dynamic type" },
        { name: "nil", detail: "Null type" },
        { name: "channel", detail: "Concurrency channel" },
        { name: "atomic", detail: "Atomic primitive type" }
      ];
      
      types.forEach(t => {
        const item = new vscode.CompletionItem(t.name, vscode.CompletionItemKind.TypeParameter);
        item.detail = t.detail;
        completions.push(item);
      });
      
      return completions;
    }

    // --- Keywords ---
    const keywords = [
      // Control flow
      "if", "else", "elif", "for", "iter", "while", "match", "break", "continue", "return",
      // Concurrency & execution
      "task", "worker", "async", "await", "unsafe", "staged", "defer", "parallel", "concurrent",
      // Declarations & OOP
      "fn", "type", "class", "frame", "trait", "interface", "mixin", "implements", "enum", "module", "import", "from", "export", "impl",
      "var", "val", "const", "mut", "atomic",
      // Modifiers & Visibility
      "pub", "prot", "static", "abstract", "final", "show", "hide",
      // Lifecycle
      "init", "deinit",
      // Operators & predicates
      "and", "or", "not", "in", "as", "is", "where",
      // Error handling
      "ok", "err",
      // Special
      "self", "super", "contract", "true", "false", "nil"
    ];

    keywords.forEach(k => {
      completions.push(
        new vscode.CompletionItem(k, vscode.CompletionItemKind.Keyword)
      );
    });

    // --- Built-in Types ---
    const types = [
      // Primitive integers
      { name: "int", detail: "Signed integer (platform-dependent)" },
      { name: "uint", detail: "Unsigned integer (platform-dependent)" },
      { name: "i8", detail: "8-bit signed integer" },
      { name: "i16", detail: "16-bit signed integer" },
      { name: "i32", detail: "32-bit signed integer" },
      { name: "i64", detail: "64-bit signed integer" },
      { name: "i128", detail: "128-bit signed integer" },
      { name: "u8", detail: "8-bit unsigned integer" },
      { name: "u16", detail: "16-bit unsigned integer" },
      { name: "u32", detail: "32-bit unsigned integer" },
      { name: "u64", detail: "64-bit unsigned integer" },
      { name: "u128", detail: "128-bit unsigned integer" },
      // Floating point & decimal
      { name: "float", detail: "Floating-point (platform-dependent)" },
      { name: "f32", detail: "32-bit floating-point" },
      { name: "f64", detail: "64-bit floating-point" },
      { name: "d2", detail: "Decimal with 2 fractional digits" },
      { name: "d4", detail: "Decimal with 4 fractional digits" },
      { name: "d6", detail: "Decimal with 6 fractional digits" },
      { name: "decimal", detail: "Fixed-precision decimal" },
      // Other primitives
      { name: "bool", detail: "Boolean type" },
      { name: "str", detail: "String type" },
      { name: "any", detail: "Dynamic type" },
      { name: "nil", detail: "Null/None type" },
      { name: "channel", detail: "Concurrency channel type" },
      { name: "atomic", detail: "Thread-safe atomic type" },
      { name: "list", detail: "List/array type" },
      { name: "dict", detail: "Dictionary/map type" },
      { name: "tuple", detail: "Tuple type" }
    ];

    types.forEach(t => {
      const item = new vscode.CompletionItem(t.name, vscode.CompletionItemKind.TypeParameter);
      item.detail = t.detail;
      completions.push(item);
    });

    // --- Built-in Functions ---
    const builtins = [
      // I/O
      { label: "print", insertText: "print(${1:value})", documentation: "Prints values to the console." },
      
      // Error handling
      { label: "ok", insertText: "ok(${1:value})", documentation: "Constructs a success value." },
      { label: "err", insertText: "err(${1:ErrorType})", documentation: "Constructs an error value." },
      { label: "is_error", insertText: "is_error(${1:value})", documentation: "Checks if a value is an error." },
      { label: "is_success", insertText: "is_success(${1:value})", documentation: "Checks if a value is a success." },
      
      // Collections
      { label: "len", insertText: "len(${1:collection})", documentation: "Returns the length of a collection." },
      { label: "append", insertText: "append(${1:list}, ${2:item})", documentation: "Appends an item to a list." },
      { label: "join", insertText: "join(${1:list}, ${2:separator})", documentation: "Joins strings with a separator." },
      
      // Pattern matching
      { label: "matches", insertText: "matches(${1:value}, ${2:pattern})", documentation: "Tests if a string matches a regex pattern." },
      
      // File I/O
      { label: "open", insertText: "open(${1:filename}, ${2:mode})", documentation: "Opens a file for reading or writing." },
      
      // Higher-order functions
      { label: "map", insertText: "map(${1:items}, ${2:fn})", documentation: "Applies a function to each item." },
      { label: "filter", insertText: "filter(${1:items}, ${2:predicate})", documentation: "Filters items based on a predicate." },
      { label: "reduce", insertText: "reduce(${1:items}, ${2:fn}, ${3:init})", documentation: "Reduces items to a single value." },
      
      // Contracts
      { label: "contract", insertText: "contract(${1:condition}, ${2:\"error message\"})", documentation: "Runtime assertion." }
    ];

    builtins.forEach(fn => {
      const item = new vscode.CompletionItem(fn.label, vscode.CompletionItemKind.Function);
      item.insertText = new vscode.SnippetString(fn.insertText);
      item.documentation = new vscode.MarkdownString(fn.documentation);
      completions.push(item);
    });

    // --- Snippets ---
    const snippets = [
      {
        label: "fn",
        insertText: new vscode.SnippetString("fn ${1:name}(${2:param}: ${3:Type}): ${4:ReturnType} {\n\t$0\n}"),
        documentation: "Function definition"
      },
      {
        label: "fn (simple)",
        insertText: new vscode.SnippetString("fn ${1:name}() {\n\t$0\n}"),
        documentation: "Simple function without parameters"
      },
      {
        label: "fn (error handling)",
        insertText: new vscode.SnippetString("fn ${1:name}(${2:param}: ${3:Type}): ${4:ReturnType}?${5:ErrorType} {\n\t$0\n}"),
        documentation: "Function with error handling"
      },
      {
        label: "class",
        insertText: new vscode.SnippetString("class ${1:Name} {\n\tfn init(${2:params}) {\n\t\t$0\n\t}\n}"),
        documentation: "Class with init method"
      },
      {
        label: "class (inline constructor)",
        insertText: new vscode.SnippetString("class ${1:Name}(${2:param}: ${3:Type}) {\n\t$0\n}"),
        documentation: "Class with inline constructor"
      },
      {
        label: "class (inheritance)",
        insertText: new vscode.SnippetString("class ${1:Name}(${2:params}) : ${3:Parent}(${4:args}) {\n\t$0\n}"),
        documentation: "Class with inheritance"
      },
      {
        label: "type",
        insertText: new vscode.SnippetString("type ${1:Name} = ${2:Type};"),
        documentation: "Type alias"
      },
      {
        label: "type (struct)",
        insertText: new vscode.SnippetString("type ${1:Name} = { ${2:field}: ${3:Type} };"),
        documentation: "Structural type definition"
      },
      {
        label: "type (union)",
        insertText: new vscode.SnippetString("type ${1:Name} = ${2:Type1} | ${3:Type2};"),
        documentation: "Union type definition"
      },
      {
        label: "type (refined)",
        insertText: new vscode.SnippetString("type ${1:Name} = ${2:Type} where ${3:condition};"),
        documentation: "Refined type with constraint"
      },
      {
        label: "for",
        insertText: new vscode.SnippetString("for (var ${1:i} = 0; ${1:i} < ${2:n}; ${1:i} += 1) {\n\t$0\n}"),
        documentation: "C-style for loop"
      },
      {
        label: "iter",
        insertText: new vscode.SnippetString("iter (${1:item} in ${2:collection}) {\n\t$0\n}"),
        documentation: "Iterator loop"
      },
      {
        label: "iter (range)",
        insertText: new vscode.SnippetString("iter (${1:i} in ${2:start}..${3:end}) {\n\t$0\n}"),
        documentation: "Range-based iterator loop"
      },
      {
        label: "while",
        insertText: new vscode.SnippetString("while (${1:condition}) {\n\t$0\n}"),
        documentation: "While loop"
      },
      {
        label: "if",
        insertText: new vscode.SnippetString("if (${1:condition}) {\n\t$0\n}"),
        documentation: "If statement"
      },
      {
        label: "if-else",
        insertText: new vscode.SnippetString("if (${1:condition}) {\n\t${2}\n} else {\n\t$0\n}"),
        documentation: "If-else statement"
      },
      {
        label: "match",
        insertText: new vscode.SnippetString("match (${1:value}) {\n\tval(${2:x}) => { $3 },\n\terr(${4:e}) => { $0 }\n}"),
        documentation: "Match expression for error handling"
      },
      {
        label: "? else",
        insertText: new vscode.SnippetString("${1:expression}? else ${2:error} {\n\t$0\n}"),
        documentation: "Error handling with else clause"
      },
      {
        label: "contract",
        insertText: new vscode.SnippetString("contract(${1:condition}, ${2:\"error message\"});"),
        documentation: "Runtime assertion"
      },
      {
        label: "enum",
        insertText: new vscode.SnippetString("enum ${1:Name} {\n\t${2:Variant1},\n\t${3:Variant2}\n}"),
        documentation: "Enum definition"
      },
      {
        label: "trait",
        insertText: new vscode.SnippetString("trait ${1:Name} {\n\tfn ${2:method}(${3:params});\n}"),
        documentation: "Trait (interface) definition"
      },
      {
        label: "impl",
        insertText: new vscode.SnippetString("impl ${1:Trait} for ${2:Type} {\n\tfn ${3:method}(${4:params}) {\n\t\t$0\n\t}\n}"),
        documentation: "Trait implementation"
      },
      {
        label: "task",
        insertText: new vscode.SnippetString("task ${1:name} {\n\t$0\n}"),
        documentation: "Async task definition"
      },
      {
        label: "worker",
        insertText: new vscode.SnippetString("worker ${1:name} {\n\t$0\n}"),
        documentation: "Worker for concurrent execution"
      }
    ];

    snippets.forEach(s => {
      const item = new vscode.CompletionItem(s.label, vscode.CompletionItemKind.Snippet);
      item.insertText = s.insertText;
      item.documentation = new vscode.MarkdownString(s.documentation);
      item.sortText = "0" + s.label; // Prioritize snippets
      completions.push(item);
    });
    
    // --- Decorators ---
    const decorators = [
      { label: "@public", documentation: "Makes a member publicly accessible." },
      { label: "@private", documentation: "Makes a member private to the file." },
      { label: "@protected", documentation: "Makes a member accessible within the module." }
    ];
    
    decorators.forEach(d => {
      const item = new vscode.CompletionItem(d.label, vscode.CompletionItemKind.Keyword);
      item.documentation = new vscode.MarkdownString(d.documentation);
      completions.push(item);
    });

    return completions;
  }
}

module.exports = { LuminarCompletionProvider };
