const vscode = require("vscode");

/**
 * Provides hover info for symbols, keywords, and types.
 */
class LuminarHoverProvider {
  provideHover(document, position) {
    const wordRange = document.getWordRangeAtPosition(position, /[A-Za-z_][A-Za-z0-9_]*/);
    if (!wordRange) return null;

    const word = document.getText(wordRange);

    // Keyword info
    const keywordDocs = {
      // Control flow
      if: "Conditional branch. Syntax: `if (condition) { ... }`",
      else: "Alternative branch for if statement. Syntax: `if (x) { ... } else { ... }`",
      elif: "Else-if branch. Syntax: `if (x) { ... } elif (y) { ... }`",
      for: "C-style for loop. Syntax: `for (var i = 0; i < n; i += 1) { ... }`",
      iter: "Iterator loop. Syntax: `iter (item in collection) { ... }` or `iter (i in 1..10) { ... }`",
      while: "While loop. Syntax: `while (condition) { ... }`",
      match: "Pattern matching. Syntax: `match (value) { val(x) => ..., err(e) => ... }`",
      break: "Exit from a loop.",
      continue: "Skip to next iteration of a loop.",
      return: "Return a value from a function.",
      
      // Async/Concurrency
      task: "Defines a parallel task. Syntax: `task(i in 1..10) { ... }`",
      worker: "Defines a worker for concurrent stream processing. Syntax: `worker(data in stream) { ... }`",
      async: "Marks a function as asynchronous.",
      await: "Waits for an async result.",
      unsafe: "Marks a block as unsafe, allowing low-level operations.",
      staged: "Staged compilation / execution block.",
      defer: "Defers execution until function exit.",
      parallel: "Execute operations across parallel cores. Syntax: `parallel(cores=2) { ... }`",
      concurrent: "Execute channel-based operations concurrently. Syntax: `concurrent(cores=2) { ... }`",
      
      // Declarations & OOP
      fn: "Function definition. Syntax: `fn name(param: Type): ReturnType { ... }`",
      type: "Type alias or definition. Syntax: `type Name = Type;`",
      class: "Class definition.",
      frame: "Frame definition (canonical class-like OOP structure in Limitly). Supports `pub`, `prot` and private members. Syntax: `frame Foo { pub x: int; pub init(x: int) { self.x = x; } }`",
      enum: "Enum definition. Syntax: `enum Name { Variant1, Variant2, ... }`",
      trait: "Trait (interface) declaration. Syntax: `trait Name { fn method(): int; }`",
      interface: "Interface definition.",
      mixin: "Mixin definition.",
      implements: "Trait or interface implementation.",
      module: "Module definition.",
      import: "Import a module or symbols. Syntax: `import std.collections show Iterator;`",
      from: "Import source module. Syntax: `from std.collections import List;`",
      show: "Import filter to expose symbols. Syntax: `import std.collections show Iterator;`",
      hide: "Import filter to hide symbols.",
      export: "Export a symbol from a module.",
      impl: "Implement a trait for a type. Syntax: `impl Trait for Type { ... }`",
      var: "Mutable variable declaration. Syntax: `var x: int = 42;`",
      val: "Immutable local variable binding. Syntax: `val y = 100;`",
      const: "Constant declaration. Syntax: `const PI = 3.14;`",
      atomic: "Atomic primitive type for thread-safe operations. Syntax: `var c: atomic = 0;`",
      mut: "Marks a binding as mutable.",
      pub: "Public visibility modifier for frame fields and methods.",
      prot: "Protected visibility modifier for frame fields and methods.",
      static: "Static member modifier.",
      abstract: "Abstract member or class modifier.",
      final: "Final modifier preventing inheritance or overriding.",

      // Lifecycle
      init: "Frame lifecycle constructor method. Syntax: `pub init(...) { ... }`",
      deinit: "Frame lifecycle destructor method. Syntax: `pub deinit() { ... }`",
      
      // Operators
      and: "Logical AND operator.",
      or: "Logical OR operator.",
      not: "Logical NOT operator.",
      in: "Membership test or iteration. Used in `iter (x in list)` or `task (i in 1..10)`",
      as: "Explicit type casting operator. Syntax: `x as float`",
      is: "Type checking operator.",
      where: "Refined type constraint. Syntax: `type Positive = int where value > 0;`",
      
      // Error handling
      ok: "Success value constructor for fallible returns. Syntax: `return ok(value);`",
      err: "Error constructor for fallible returns. Syntax: `return err(ErrorType);` or `return err();`",
      val: "Immutable binding keyword or match success pattern binding: `val success => { ... }`",
      
      // Special
      contract: "Runtime assertion. Syntax: `contract(condition, \"error message\");`",
      self: "Canonical reference to current instance inside frame methods (`this` is unsupported).",
      super: "Reference to parent frame or class.",
      
      // Built-in functions
      is_error: "Check if a fallible value is an error.",
      is_success: "Check if a fallible value is a success.",
      matches: "Pattern matching function. Syntax: `matches(value, pattern)`"
    };

    // Built-in function signatures
    const typeHints = {
      print: "fn print(...values: any) -> void\n\nPrints values to the console.",
      
      // Error handling
      ok: "fn ok<T>(value: T) -> T?\n\nConstructs a success value for error handling.",
      err: "fn err<E>(error: E) -> ?E\n\nConstructs an error value.",
      is_error: "fn is_error<T>(value: T?) -> bool\n\nReturns true if value is an error.",
      is_success: "fn is_success<T>(value: T?) -> bool\n\nReturns true if value is a success.",
      
      // Collections
      len: "fn len(value: list|str|dict) -> int\n\nReturns the number of elements.",
      append: "fn append<T>(list: [T], item: T) -> void\n\nAppends an item to a list.",
      join: "fn join(list: [str], separator: str) -> str\n\nJoins strings with a separator.",
      
      // Pattern matching
      matches: "fn matches(value: str, pattern: str) -> bool\n\nTests if a string matches a regex pattern.",
      
      // File I/O
      open: "fn open(filename: str, mode: str) -> File\n\nOpens a file for reading or writing.",
      
      // Higher-order functions
      map: "fn map<T, R>(items: [T], fn: (T) -> R) -> [R]\n\nApplies a function to each item.",
      filter: "fn filter<T>(items: [T], predicate: (T) -> bool) -> [T]\n\nFilters items based on a predicate.",
      reduce: "fn reduce<T, R>(items: [T], fn: (R, T) -> R, init: R) -> R\n\nReduces items to a single value.",
      
      // Contracts
      contract: "fn contract(condition: bool, message: str) -> void\n\nRuntime assertion that throws if condition is false."
    };
    
    // Built-in types documentation
    const typeDocs = {
      // Primitive types
      int: "Signed integer type (platform-dependent size).",
      uint: "Unsigned integer type (platform-dependent size).",
      float: "Floating-point number (platform-dependent size).",
      i8: "8-bit signed integer.",
      i16: "16-bit signed integer.",
      i32: "32-bit signed integer.",
      i64: "64-bit signed integer.",
      u8: "8-bit unsigned integer.",
      u16: "16-bit unsigned integer.",
      u32: "32-bit unsigned integer.",
      u64: "64-bit unsigned integer.",
      f32: "32-bit floating-point number.",
      f64: "64-bit floating-point number.",
      bool: "Boolean type (true or false).",
      str: "String type.",
      any: "Any type - can hold any value.",
      nil: "Null/None type.",
      
      // Complex types
      Option: "Optional type - represents a value that may or may not exist. Union of Some | nil.",
      Result: "Result type - represents success or error. Union of Success | Error.",
      Error: "Error type for error handling.",
      list: "List/array type. Syntax: `[Type]` e.g., `[int]`, `[str]`",
      dict: "Dictionary/map type. Syntax: `{KeyType: ValueType}` e.g., `{str: int}`",
      tuple: "Tuple type for fixed-size heterogeneous collections."
    };

    if (keywordDocs[word]) {
      return new vscode.Hover(
        new vscode.MarkdownString(`**Keyword:** \`${word}\`\n\n${keywordDocs[word]}`)
      );
    }

    if (typeHints[word]) {
      return new vscode.Hover(
        new vscode.MarkdownString(`**Built-in Function**\n\n\`\`\`luminar\n${typeHints[word]}\n\`\`\``)
      );
    }
    
    if (typeDocs[word]) {
      return new vscode.Hover(
        new vscode.MarkdownString(`**Type:** \`${word}\`\n\n${typeDocs[word]}`)
      );
    }

    if (/^[A-Z]/.test(word)) {
      return new vscode.Hover(
        new vscode.MarkdownString(`**Type:** \`${word}\`\n\nUser-defined type or class.`)
      );
    }

    return null;
  }
}

module.exports = { LuminarHoverProvider };
