const vscode = require("vscode");

/**
 * Provides document symbols for the outline view and symbol search (Ctrl+Shift+O).
 * Extracts functions, classes, types, and modules from the document.
 */
class LuminarDocumentSymbolProvider {
  provideDocumentSymbols(document, token) {
    const symbols = [];
    const text = document.getText();
    const lines = text.split(/\r?\n/);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i;

      // Match function definitions: fn name(...)
      const fnMatch = line.match(/\bfn\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/);
      if (fnMatch) {
        const name = fnMatch[1];
        const startPos = new vscode.Position(lineNumber, line.indexOf(name));
        const endPos = this.findBlockEnd(lines, lineNumber);
        const range = new vscode.Range(startPos, endPos);
        const selectionRange = new vscode.Range(startPos, startPos.translate(0, name.length));
        
        symbols.push(new vscode.DocumentSymbol(
          name,
          '',
          vscode.SymbolKind.Function,
          range,
          selectionRange
        ));
      }

      // Match class and frame definitions: class Name or frame Name
      const classMatch = line.match(/\b(?:class|frame)\s+([A-Z][A-Za-z0-9_]*)/);
      if (classMatch) {
        const name = classMatch[1];
        const startPos = new vscode.Position(lineNumber, line.indexOf(name));
        const endPos = this.findBlockEnd(lines, lineNumber);
        const range = new vscode.Range(startPos, endPos);
        const selectionRange = new vscode.Range(startPos, startPos.translate(0, name.length));
        
        const classSymbol = new vscode.DocumentSymbol(
          name,
          line.trim().startsWith('frame') ? 'frame' : 'class',
          vscode.SymbolKind.Class,
          range,
          selectionRange
        );

        // Find methods within the class/frame
        classSymbol.children = this.findClassMembers(lines, lineNumber, endPos.line);
        symbols.push(classSymbol);
      }

      // Match type definitions: type Name
      const typeMatch = line.match(/\btype\s+([A-Z][A-Za-z0-9_]*)/);
      if (typeMatch && !classMatch) { // Avoid duplicate with class
        const name = typeMatch[1];
        const startPos = new vscode.Position(lineNumber, line.indexOf(name));
        const endPos = new vscode.Position(lineNumber, line.length);
        const range = new vscode.Range(startPos, endPos);
        const selectionRange = new vscode.Range(startPos, startPos.translate(0, name.length));
        
        symbols.push(new vscode.DocumentSymbol(
          name,
          '',
          vscode.SymbolKind.TypeParameter,
          range,
          selectionRange
        ));
      }

      // Match module definitions: module Name
      const moduleMatch = line.match(/\bmodule\s+([A-Z][A-Za-z0-9_]*)/);
      if (moduleMatch) {
        const name = moduleMatch[1];
        const startPos = new vscode.Position(lineNumber, line.indexOf(name));
        const endPos = this.findBlockEnd(lines, lineNumber);
        const range = new vscode.Range(startPos, endPos);
        const selectionRange = new vscode.Range(startPos, startPos.translate(0, name.length));
        
        symbols.push(new vscode.DocumentSymbol(
          name,
          '',
          vscode.SymbolKind.Module,
          range,
          selectionRange
        ));
      }

      // Match enum definitions: enum Name
      const enumMatch = line.match(/\benum\s+([A-Z][A-Za-z0-9_]*)/);
      if (enumMatch) {
        const name = enumMatch[1];
        const startPos = new vscode.Position(lineNumber, line.indexOf(name));
        const endPos = this.findBlockEnd(lines, lineNumber);
        const range = new vscode.Range(startPos, endPos);
        const selectionRange = new vscode.Range(startPos, startPos.translate(0, name.length));
        
        symbols.push(new vscode.DocumentSymbol(
          name,
          '',
          vscode.SymbolKind.Enum,
          range,
          selectionRange
        ));
      }

      // Match trait definitions: trait Name
      const traitMatch = line.match(/\btrait\s+([A-Z][A-Za-z0-9_]*)/);
      if (traitMatch) {
        const name = traitMatch[1];
        const startPos = new vscode.Position(lineNumber, line.indexOf(name));
        const endPos = this.findBlockEnd(lines, lineNumber);
        const range = new vscode.Range(startPos, endPos);
        const selectionRange = new vscode.Range(startPos, startPos.translate(0, name.length));
        
        symbols.push(new vscode.DocumentSymbol(
          name,
          '',
          vscode.SymbolKind.Interface,
          range,
          selectionRange
        ));
      }

      // Match variable declarations: var name
      // Match variable declarations: var name, val name, const name
      const varMatch = line.match(/\b(?:var|val|const)\s+([a-z_][A-Za-z0-9_]*)/);
      if (varMatch) {
        const name = varMatch[1];
        const startPos = new vscode.Position(lineNumber, line.indexOf(name));
        const endPos = new vscode.Position(lineNumber, line.length);
        const range = new vscode.Range(startPos, endPos);
        const selectionRange = new vscode.Range(startPos, startPos.translate(0, name.length));
        
        symbols.push(new vscode.DocumentSymbol(
          name,
          '',
          vscode.SymbolKind.Variable,
          range,
          selectionRange
        ));
      }
    }

    return symbols;
  }

  /**
   * Find the end of a block (matching closing brace)
   */
  findBlockEnd(lines, startLine) {
    let braceCount = 0;
    let foundOpenBrace = false;

    for (let i = startLine; i < lines.length; i++) {
      const line = lines[i];
      
      for (const char of line) {
        if (char === '{') {
          braceCount++;
          foundOpenBrace = true;
        } else if (char === '}') {
          braceCount--;
          if (foundOpenBrace && braceCount === 0) {
            return new vscode.Position(i, line.length);
          }
        }
      }
    }

    return new vscode.Position(lines.length - 1, lines[lines.length - 1].length);
  }

  /**
   * Find methods and fields within a class or frame
   */
  findClassMembers(lines, startLine, endLine) {
    const members = [];

    for (let i = startLine + 1; i < endLine; i++) {
      const line = lines[i];

      // Match method definitions: fn name(...) or pub/prot fn name(...) or lifecycle init/deinit
      const fnMatch = line.match(/\b(?:pub\s+|prot\s+)?fn\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/) ||
                      line.match(/\b(?:pub\s+|prot\s+)?(init|deinit)\s*\(/);
      if (fnMatch) {
        const name = fnMatch[1];
        const startPos = new vscode.Position(i, line.indexOf(name));
        const methodEndPos = this.findBlockEnd(lines, i);
        const range = new vscode.Range(startPos, methodEndPos);
        const selectionRange = new vscode.Range(startPos, startPos.translate(0, name.length));
        
        members.push(new vscode.DocumentSymbol(
          name,
          name === 'init' || name === 'deinit' ? 'constructor' : '',
          vscode.SymbolKind.Method,
          range,
          selectionRange
        ));
      }

      // Match field declarations: pub field: Type or var field or val field
      const fieldMatch = line.match(/^\s*(?:pub\s+|prot\s+)?(?:var|val)\s+([a-z_][A-Za-z0-9_]*)/) ||
                         line.match(/^\s*(?:pub\s+|prot\s+)([a-z_][A-Za-z0-9_]*)\s*:/);
      if (fieldMatch) {
        const name = fieldMatch[1];
        const startPos = new vscode.Position(i, line.indexOf(name));
        const endPos = new vscode.Position(i, line.length);
        const range = new vscode.Range(startPos, endPos);
        const selectionRange = new vscode.Range(startPos, startPos.translate(0, name.length));
        
        members.push(new vscode.DocumentSymbol(
          name,
          '',
          vscode.SymbolKind.Property,
          range,
          selectionRange
        ));
      }
    }

    return members;
  }
}

module.exports = { LuminarDocumentSymbolProvider };
