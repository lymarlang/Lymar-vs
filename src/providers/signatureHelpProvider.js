const vscode = require("vscode");

class LuminarSignatureHelpProvider {
  provideSignatureHelp(document, position) {
    const line = document.lineAt(position.line).text;
    const beforeCursor = line.substring(0, position.character);

    // Simple heuristic: get the function name before the '('
    const match = beforeCursor.match(/([A-Za-z_][A-Za-z0-9_]*)\s*\($/);
    if (!match) return null;

    const fn = match[1];

    // Define built-in function signatures
    const signatures = {
      // I/O
      print: {
        label: "print(...values: any) -> void",
        documentation: "Prints values to the console.",
        parameters: ["...values: any"]
      },
      
      // Error handling
      ok: {
        label: "ok<T>(value: T) -> T?",
        documentation: "Constructs a success value for error handling.",
        parameters: ["value: T"]
      },
      err: {
        label: "err<E>(error: E) -> ?E",
        documentation: "Constructs an error value.",
        parameters: ["error: E"]
      },
      is_error: {
        label: "is_error<T>(value: T?) -> bool",
        documentation: "Returns true if value is an error.",
        parameters: ["value: T?"]
      },
      is_success: {
        label: "is_success<T>(value: T?) -> bool",
        documentation: "Returns true if value is a success.",
        parameters: ["value: T?"]
      },
      
      // Collections
      len: {
        label: "len(value: list|str|dict) -> int",
        documentation: "Returns the number of elements in a collection.",
        parameters: ["value: list|str|dict"]
      },
      append: {
        label: "append<T>(list: [T], item: T) -> void",
        documentation: "Appends an item to a list.",
        parameters: ["list: [T]", "item: T"]
      },
      join: {
        label: "join(list: [str], separator: str) -> str",
        documentation: "Joins strings with a separator.",
        parameters: ["list: [str]", "separator: str"]
      },
      
      // Pattern matching
      matches: {
        label: "matches(value: str, pattern: str) -> bool",
        documentation: "Tests if a string matches a regex pattern.",
        parameters: ["value: str", "pattern: str"]
      },
      
      // File I/O
      open: {
        label: "open(filename: str, mode: str) -> File",
        documentation: "Opens a file for reading or writing. Modes: 'read', 'write', 'append'",
        parameters: ["filename: str", "mode: str"]
      },
      
      // Higher-order functions
      map: {
        label: "map<T, R>(items: [T], fn: (T) -> R) -> [R]",
        documentation: "Applies a transformation function to each item in a collection.",
        parameters: ["items: [T]", "fn: (T) -> R"]
      },
      filter: {
        label: "filter<T>(items: [T], predicate: (T) -> bool) -> [T]",
        documentation: "Filters a list based on a predicate function.",
        parameters: ["items: [T]", "predicate: (T) -> bool"]
      },
      reduce: {
        label: "reduce<T, R>(items: [T], fn: (R, T) -> R, init: R) -> R",
        documentation: "Reduces items to a single value using an accumulator function.",
        parameters: ["items: [T]", "fn: (R, T) -> R", "init: R"]
      },
      
      // Contracts
      contract: {
        label: "contract(condition: bool, message: str) -> void",
        documentation: "Runtime assertion that throws an error if condition is false.",
        parameters: ["condition: bool", "message: str"]
      },
      
      // String methods
      split: {
        label: "split(str: str, separator: str) -> [str]",
        documentation: "Splits a string by a separator.",
        parameters: ["str: str", "separator: str"]
      },
      replace: {
        label: "replace(str: str, old: str, new: str) -> str",
        documentation: "Replaces occurrences of a substring.",
        parameters: ["str: str", "old: str", "new: str"]
      },
      trim: {
        label: "trim(str: str) -> str",
        documentation: "Removes leading and trailing whitespace.",
        parameters: ["str: str"]
      },
      
      // Class constructors (examples from sample)
      Dog: {
        label: "Dog(name: str, breed: str)",
        documentation: "Creates a Dog instance.",
        parameters: ["name: str", "breed: str"]
      },
      Cat: {
        label: "Cat(name: str)",
        documentation: "Creates a Cat instance.",
        parameters: ["name: str"]
      },
      Bird: {
        label: "Bird(name: str, species: str, canFly: bool)",
        documentation: "Creates a Bird instance.",
        parameters: ["name: str", "species: str", "canFly: bool"]
      },
      Fish: {
        label: "Fish(name: str, waterType: str)",
        documentation: "Creates a Fish instance.",
        parameters: ["name: str", "waterType: str"]
      }
    };

    const info = signatures[fn];
    if (!info) return null;

    const sigInfo = new vscode.SignatureInformation(info.label, info.documentation);
    
    // Use predefined parameters if available, otherwise parse from label
    if (info.parameters) {
      sigInfo.parameters = info.parameters.map(p => new vscode.ParameterInformation(p));
    } else {
      const paramInfo = info.label.match(/\(([^)]*)\)/);
      if (paramInfo) {
        const params = paramInfo[1].split(",").map(p => p.trim());
        sigInfo.parameters = params.map(p => new vscode.ParameterInformation(p));
      }
    }

    // Calculate active parameter based on comma count
    const openParenIndex = beforeCursor.lastIndexOf('(');
    const afterParen = beforeCursor.substring(openParenIndex + 1);
    const commaCount = (afterParen.match(/,/g) || []).length;
    const activeParam = Math.min(commaCount, sigInfo.parameters.length - 1);

    const sigHelp = new vscode.SignatureHelp();
    sigHelp.signatures = [sigInfo];
    sigHelp.activeSignature = 0;
    sigHelp.activeParameter = activeParam;

    return sigHelp;
  }
}

module.exports = { LuminarSignatureHelpProvider };
