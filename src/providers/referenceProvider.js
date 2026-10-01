const vscode = require("vscode");

/**
 * Provides "Find All References" functionality.
 * Finds all occurrences of a symbol in the document.
 */
class LuminarReferenceProvider {
  async provideReferences(document, position, context, token) {
    const wordRange = document.getWordRangeAtPosition(position, /[A-Za-z_][A-Za-z0-9_]*/);
    if (!wordRange) return [];

    const word = document.getText(wordRange);
    const text = document.getText();
    const references = [];

    // Helper to find references in a document text
    const findInText = (targetDocUri, docText) => {
      const pattern = new RegExp(`\\b${word}\\b`, 'g');
      let match;
      while ((match = pattern.exec(docText)) !== null) {
        const beforeMatch = docText.substring(0, match.index);
        const lines = beforeMatch.split(/\r?\n/);
        const line = lines.length - 1;
        const character = lines[lines.length - 1].length;
        const pos = new vscode.Position(line, character);
        const endPos = new vscode.Position(line, character + word.length);
        const range = new vscode.Range(pos, endPos);

        const lineText = docText.split(/\r?\n/)[line] || '';
        const beforeWord = lineText.substring(0, character);
        const isDef = /\b(?:fn|frame|class|type|module|var|val|const|trait|enum|impl|pub|prot)\s+$/.test(beforeWord);

        if (context.includeDeclaration || !isDef) {
          references.push(new vscode.Location(targetDocUri, range));
        }
      }
    };

    // 1. Search active document
    findInText(document.uri, text);

    // 2. Search workspace .lm files
    try {
      const files = await vscode.workspace.findFiles('**/*.lm', '**/node_modules/**', 100);
      for (const fileUri of files) {
        if (fileUri.toString() === document.uri.toString()) continue;
        const fileData = await vscode.workspace.fs.readFile(fileUri);
        const fileText = Buffer.from(fileData).toString('utf-8');
        findInText(fileUri, fileText);
      }
    } catch (err) {
      console.warn('LuminarReferenceProvider workspace search error:', err);
    }

    return references;
  }

  /**
   * Check if the position is a definition (fn, class, type, var, etc.)
   */
  isDefinition(document, position, word) {
    const line = document.lineAt(position.line).text;
    const beforeWord = line.substring(0, position.character);
    return /\b(?:fn|frame|class|type|module|var|val|const|trait|enum|impl|pub|prot)\s+$/.test(beforeWord);
  }

}

module.exports = { LuminarReferenceProvider };
