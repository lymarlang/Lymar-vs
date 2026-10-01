const vscode = require("vscode");

/**
 * Semantic token types — defines what kinds of symbols Luminar recognizes.
 */
const tokenTypes = [
  "namespace",
  "type",
  "class",
  "enum",
  "interface",
  "struct",
  "typeParameter",
  "parameter",
  "variable",
  "property",
  "enumMember",
  "event",
  "function",
  "method",
  "macro",
  "keyword",
  "modifier",
  "comment",
  "string",
  "number",
  "regexp",
  "operator"
];

const tokenModifiers = [
  "declaration",
  "definition",
  "readonly",
  "static",
  "deprecated",
  "abstract",
  "async",
  "documentation",
  "defaultLibrary"
];

const legend = new vscode.SemanticTokensLegend(tokenTypes, tokenModifiers);

/**
 * Helper function to encode modifiers as bitmask
 */
function encodeModifiers(modifierIndices) {
  let result = 0;
  for (const index of modifierIndices) {
    result |= (1 << index);
  }
  return result;
}

/**
 * Simple Luminar Semantic Tokenizer
 * (You can later replace this with a language server for full context-aware semantics.)
 */
class LuminarSemanticTokensProvider {
  provideDocumentSemanticTokens(document) {
    const builder = new vscode.SemanticTokensBuilder(legend);
    const text = document.getText();
    const lines = text.split(/\r?\n/);

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];

      // Highlight keywords (control flow)
      const controlKeywordRegex = /\b(if|else|elif|for|iter|while|match|break|continue|return|task|worker|async|await|unsafe|staged|defer|parallel|concurrent)\b/g;
      let match;
      while ((match = controlKeywordRegex.exec(line))) {
        builder.push(lineIndex, match.index, match[0].length, tokenTypes.indexOf("keyword"));
      }

      // Highlight declaration keywords
      const declKeywordRegex = /\b(fn|type|class|frame|enum|trait|interface|mixin|implements|module|import|from|export|mut|const|var|val|atomic|impl)\b/g;
      while ((match = declKeywordRegex.exec(line))) {
        builder.push(lineIndex, match.index, match[0].length, tokenTypes.indexOf("keyword"));
      }

      // Highlight modifiers
      const modifierKeywordRegex = /\b(pub|prot|static|abstract|final|show|hide)\b/g;
      while ((match = modifierKeywordRegex.exec(line))) {
        builder.push(lineIndex, match.index, match[0].length, tokenTypes.indexOf("modifier"));
      }

      // Highlight lifecycle methods
      const lifecycleKeywordRegex = /\b(init|deinit)\b/g;
      while ((match = lifecycleKeywordRegex.exec(line))) {
        builder.push(lineIndex, match.index, match[0].length, tokenTypes.indexOf("function"));
      }

      // Highlight operator keywords
      const opKeywordRegex = /\b(and|or|not|in|as|is|where|contract)\b/g;
      while ((match = opKeywordRegex.exec(line))) {
        builder.push(lineIndex, match.index, match[0].length, tokenTypes.indexOf("keyword"));
      }

      // Highlight special language keywords (self, super)
      const langKeywordRegex = /\b(self|super)\b/g;
      while ((match = langKeywordRegex.exec(line))) {
        builder.push(lineIndex, match.index, match[0].length, tokenTypes.indexOf("variable"), encodeModifiers([tokenModifiers.indexOf("readonly")]));
      }

      // Highlight error handling keywords (ok, err, val)
      const errorKeywordRegex = /\b(ok|err)\b/g;
      while ((match = errorKeywordRegex.exec(line))) {
        builder.push(lineIndex, match.index, match[0].length, tokenTypes.indexOf("keyword"));
      }

      // Highlight function definitions
      const functionRegex = /\bfn\s+([A-Za-z_][A-Za-z0-9_]*)/g;
      while ((match = functionRegex.exec(line))) {
        const fnKeywordEnd = match.index + 2;
        const nameStart = line.indexOf(match[1], fnKeywordEnd);
        builder.push(lineIndex, nameStart, match[1].length, tokenTypes.indexOf("function"), encodeModifiers([tokenModifiers.indexOf("declaration")]));
      }

      // Highlight built-in functions
      const builtinFunctionRegex = /\b(is_error|is_success|matches|print|open|append|join|len|map|filter|reduce)\s*\(/g;
      while ((match = builtinFunctionRegex.exec(line))) {
        const funcName = match[1];
        builder.push(lineIndex, match.index, funcName.length, tokenTypes.indexOf("function"), encodeModifiers([tokenModifiers.indexOf("defaultLibrary")]));
      }

      // Highlight function calls
      const functionCallRegex = /\b([A-Za-z_][A-Za-z0-9_]*)\s*\(/g;
      while ((match = functionCallRegex.exec(line))) {
        // Skip if it's a function definition or built-in
        const beforeMatch = line.substring(0, match.index);
        if (!beforeMatch.match(/\bfn\s*$/) && !match[1].match(/^(is_error|is_success|matches|print|open|append|join|len|map|filter|reduce)$/)) {
          builder.push(lineIndex, match.index, match[1].length, tokenTypes.indexOf("function"));
        }
      }

      // Highlight method calls
      const methodCallRegex = /\.([A-Za-z_][A-Za-z0-9_]*)\s*\(/g;
      while ((match = methodCallRegex.exec(line))) {
        builder.push(lineIndex, match.index + 1, match[1].length, tokenTypes.indexOf("method"));
      }

      // Highlight property access (without function call)
      const propertyAccessRegex = /\.([A-Za-z_][A-Za-z0-9_]*)(?!\s*\()/g;
      while ((match = propertyAccessRegex.exec(line))) {
        builder.push(lineIndex, match.index + 1, match[1].length, tokenTypes.indexOf("property"));
      }

      // Highlight type definitions
      const typeDefRegex = /\btype\s+([A-Z][A-Za-z0-9_]*)/g;
      while ((match = typeDefRegex.exec(line))) {
        const typeKeywordEnd = match.index + 4;
        const nameStart = line.indexOf(match[1], typeKeywordEnd);
        builder.push(lineIndex, nameStart, match[1].length, tokenTypes.indexOf("type"), encodeModifiers([tokenModifiers.indexOf("declaration")]));
      }

      // Highlight class and frame definitions
      const classDefRegex = /\b(?:class|frame)\s+([A-Z][A-Za-z0-9_]*)/g;
      while ((match = classDefRegex.exec(line))) {
        const keywordEnd = match.index + (match[0].startsWith("frame") ? 5 : 5);
        const nameStart = line.indexOf(match[1], keywordEnd);
        builder.push(lineIndex, nameStart, match[1].length, tokenTypes.indexOf("class"), encodeModifiers([tokenModifiers.indexOf("declaration")]));
      }

      // Highlight module definitions
      const moduleDefRegex = /\bmodule\s+([A-Z][A-Za-z0-9_]*)/g;
      while ((match = moduleDefRegex.exec(line))) {
        const moduleKeywordEnd = match.index + 6;
        const nameStart = line.indexOf(match[1], moduleKeywordEnd);
        builder.push(lineIndex, nameStart, match[1].length, tokenTypes.indexOf("namespace"), encodeModifiers([tokenModifiers.indexOf("declaration")]));
      }

      // Highlight enum definitions
      const enumDefRegex = /\benum\s+([A-Z][A-Za-z0-9_]*)/g;
      while ((match = enumDefRegex.exec(line))) {
        const enumKeywordEnd = match.index + 4;
        const nameStart = line.indexOf(match[1], enumKeywordEnd);
        builder.push(lineIndex, nameStart, match[1].length, tokenTypes.indexOf("enum"), encodeModifiers([tokenModifiers.indexOf("declaration")]));
      }

      // Highlight trait definitions
      const traitDefRegex = /\btrait\s+([A-Z][A-Za-z0-9_]*)/g;
      while ((match = traitDefRegex.exec(line))) {
        const traitKeywordEnd = match.index + 5;
        const nameStart = line.indexOf(match[1], traitKeywordEnd);
        builder.push(lineIndex, nameStart, match[1].length, tokenTypes.indexOf("interface"), encodeModifiers([tokenModifiers.indexOf("declaration")]));
      }

      // Highlight impl blocks
      const implDefRegex = /\bimpl\s+([A-Z][A-Za-z0-9_]*)/g;
      while ((match = implDefRegex.exec(line))) {
        const implKeywordEnd = match.index + 4;
        const nameStart = line.indexOf(match[1], implKeywordEnd);
        builder.push(lineIndex, nameStart, match[1].length, tokenTypes.indexOf("interface"), encodeModifiers([tokenModifiers.indexOf("declaration")]));
      }

      // Highlight primitive types
      const primitiveTypeRegex = /\b(int|uint|float|nil|i8|i16|i32|i64|i128|u8|u16|u32|u64|u128|f32|f64|d2|d4|d6|decimal|bool|str|any|channel|atomic|list|dict|tuple|array)\b/g;
      while ((match = primitiveTypeRegex.exec(line))) {
        builder.push(lineIndex, match.index, match[0].length, tokenTypes.indexOf("type"));
      }

      // Highlight user-defined types (PascalCase)
      const userTypeRegex = /\b[A-Z][A-Za-z0-9_]*\b/g;
      while ((match = userTypeRegex.exec(line))) {
        // Skip if already highlighted as type/class/frame/module definition
        const beforeMatch = line.substring(Math.max(0, match.index - 10), match.index);
        if (!beforeMatch.match(/\b(type|class|frame|module)\s*$/)) {
          builder.push(lineIndex, match.index, match[0].length, tokenTypes.indexOf("type"));
        }
      }

      // Highlight strings with interpolation support
      const stringRegex = /"(?:[^"\\]|\\.|\\\{[^}]*\})*"/g;
      while ((match = stringRegex.exec(line))) {
        const stringContent = match[0];
        const stringStart = match.index;
        
        // First, push the parts of the string that aren't interpolations
        let lastIndex = 0;
        const interpolationRegex = /(\\)?\{([^}]+)\}/g;
        let interpMatch;
        
        while ((interpMatch = interpolationRegex.exec(stringContent))) {
          // Push the string part before this interpolation
          if (interpMatch.index > lastIndex) {
            const stringPart = stringContent.substring(lastIndex, interpMatch.index);
            builder.push(lineIndex, stringStart + lastIndex, stringPart.length, tokenTypes.indexOf("string"));
          }
          
          // Skip escaped braces
          if (interpMatch[1] === '\\') {
            lastIndex = interpMatch.index + interpMatch[0].length;
            continue;
          }
          
          // Push the variable part
          const varStart = stringStart + interpMatch.index + 1; // +1 to skip {
          const varLength = interpMatch[2].length;
          builder.push(lineIndex, varStart, varLength, tokenTypes.indexOf("variable"));
          
          lastIndex = interpMatch.index + interpMatch[0].length;
        }
        
        // Push any remaining string part after the last interpolation
        if (lastIndex < stringContent.length) {
          const remainingString = stringContent.substring(lastIndex);
          builder.push(lineIndex, stringStart + lastIndex, remainingString.length, tokenTypes.indexOf("string"));
        }
      }

      // Highlight decorators
      const decoratorRegex = /@(public|private|protected|async|deprecated|[A-Za-z_][A-Za-z0-9_]*)/g;
      while ((match = decoratorRegex.exec(line))) {
        builder.push(lineIndex, match.index, match[0].length, tokenTypes.indexOf("macro"));
      }

      // Highlight modifiers (mut, const)
      const modifierRegex = /\b(mut|const)\b/g;
      while ((match = modifierRegex.exec(line))) {
        builder.push(lineIndex, match.index, match[0].length, tokenTypes.indexOf("modifier"));
      }

      // Highlight error handling operators (? and ? else)
      const errorPropagationRegex = /\?(?=\s*(else|[,;\)\}]))/g;
      while ((match = errorPropagationRegex.exec(line))) {
        builder.push(lineIndex, match.index, 1, tokenTypes.indexOf("operator"));
      }

      // Highlight range operator (..)
      const rangeOperatorRegex = /\.\./g;
      while ((match = rangeOperatorRegex.exec(line))) {
        builder.push(lineIndex, match.index, 2, tokenTypes.indexOf("operator"));
      }

      // Highlight arrow operator (=>)
      const arrowOperatorRegex = /=>/g;
      while ((match = arrowOperatorRegex.exec(line))) {
        builder.push(lineIndex, match.index, 2, tokenTypes.indexOf("operator"));
      }

      // Highlight spread operator (...)
      const spreadOperatorRegex = /\.\.\.(?=[A-Z])/g;
      while ((match = spreadOperatorRegex.exec(line))) {
        builder.push(lineIndex, match.index, 3, tokenTypes.indexOf("operator"));
      }

      // Highlight power operator (**)
      const powerOperatorRegex = /\*\*/g;
      while ((match = powerOperatorRegex.exec(line))) {
        builder.push(lineIndex, match.index, 2, tokenTypes.indexOf("operator"));
      }

      // Highlight error type annotations (?ErrorType)
      const errorTypeRegex = /\?([A-Z][A-Za-z0-9_]*)/g;
      while ((match = errorTypeRegex.exec(line))) {
        builder.push(lineIndex, match.index + 1, match[1].length, tokenTypes.indexOf("type"));
      }

      // Highlight numbers (float, hex, integer)
      const floatRegex = /\b\d+\.\d+([eE][+-]?\d+)?\b/g;
      while ((match = floatRegex.exec(line))) {
        builder.push(lineIndex, match.index, match[0].length, tokenTypes.indexOf("number"));
      }
      
      const hexRegex = /\b0x[0-9A-Fa-f]+\b/g;
      while ((match = hexRegex.exec(line))) {
        builder.push(lineIndex, match.index, match[0].length, tokenTypes.indexOf("number"));
      }
      
      const intRegex = /\b\d+\b/g;
      while ((match = intRegex.exec(line))) {
        // Skip if it's part of a float (already handled)
        if (!line.charAt(match.index + match[0].length).match(/\./)) {
          builder.push(lineIndex, match.index, match[0].length, tokenTypes.indexOf("number"));
        }
      }

      // Highlight constants (true, false, nil)
      const constantRegex = /\b(true|false|nil)\b/g;
      while ((match = constantRegex.exec(line))) {
        builder.push(lineIndex, match.index, match[0].length, tokenTypes.indexOf("variable"), encodeModifiers([tokenModifiers.indexOf("readonly")]));
      }

      // Highlight parameters in function signatures
      const paramRegex = /\b([a-z_][A-Za-z0-9_]*)\s*:/g;
      while ((match = paramRegex.exec(line))) {
        // Skip if it's a dictionary key or property
        const beforeMatch = line.substring(Math.max(0, match.index - 5), match.index);
        if (!beforeMatch.match(/[{,]\s*$/)) {
          builder.push(lineIndex, match.index, match[1].length, tokenTypes.indexOf("parameter"));
        }
      }

      // Highlight match pattern variables (val(x), err(e))
      const matchPatternRegex = /\b(val|err)\(([A-Za-z_][A-Za-z0-9_]*)\)/g;
      while ((match = matchPatternRegex.exec(line))) {
        const varStart = match.index + match[1].length + 1;
        builder.push(lineIndex, varStart, match[2].length, tokenTypes.indexOf("variable"));
      }

      // Highlight block comments (handled separately for multi-line)
      const blockCommentStartRegex = /\/\*/g;
      while ((match = blockCommentStartRegex.exec(line))) {
        const endMatch = line.indexOf('*/', match.index);
        if (endMatch !== -1) {
          builder.push(lineIndex, match.index, endMatch - match.index + 2, tokenTypes.indexOf("comment"));
        }
      }

      // Highlight comments (must be last to override other tokens)
      const commentRegex = /\/\/.*/g;
      while ((match = commentRegex.exec(line))) {
        builder.push(lineIndex, match.index, match[0].length, tokenTypes.indexOf("comment"));
      }
    }

    return builder.build();
  }
}

module.exports = {
  LuminarSemanticTokensProvider,
  luminarSemanticTokensLegend: legend
};
