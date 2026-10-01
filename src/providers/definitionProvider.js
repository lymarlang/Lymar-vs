const vscode = require("vscode");

/**
 * Provides "Go to Definition" and "Peek Definition" functionality.
 * This is a simplified implementation that searches for function and class definitions.
 */
class LuminarDefinitionProvider {
  async provideDefinition(document, position, token) {
    const wordRange = document.getWordRangeAtPosition(position, /[A-Za-z_][A-Za-z0-9_]*/);
    if (!wordRange) return null;

    const word = document.getText(wordRange);
    const text = document.getText();

    const patterns = [
      new RegExp(`\\b(?:pub\\s+|prot\\s+)?fn\\s+${word}\\s*\\(`, 'g'),
      new RegExp(`\\b(?:class|frame)\\s+${word}\\b`, 'g'),
      new RegExp(`\\btype\\s+${word}\\b`, 'g'),
      new RegExp(`\\bmodule\\s+${word}\\b`, 'g'),
      new RegExp(`\\b(?:pub\\s+|prot\\s+)?(?:var|val|const)\\s+${word}\\b`, 'g'),
      new RegExp(`\\benum\\s+${word}\\b`, 'g'),
      new RegExp(`\\btrait\\s+${word}\\b`, 'g')
    ];

    // 1. Search current file
    for (const pat of patterns) {
      pat.lastIndex = 0;
      const match = pat.exec(text);
      if (match) {
        const pos = document.positionAt(match.index);
        return new vscode.Location(document.uri, pos);
      }
    }

    // 2. Search workspace files if available
    try {
      const files = await vscode.workspace.findFiles('**/*.lm', '**/node_modules/**', 100);
      for (const fileUri of files) {
        if (fileUri.toString() === document.uri.toString()) continue;
        const fileData = await vscode.workspace.fs.readFile(fileUri);
        const fileText = Buffer.from(fileData).toString('utf-8');

        for (const pat of patterns) {
          pat.lastIndex = 0;
          const match = pat.exec(fileText);
          if (match) {
            const beforeMatch = fileText.substring(0, match.index);
            const lines = beforeMatch.split(/\r?\n/);
            const line = lines.length - 1;
            const character = lines[lines.length - 1].length;
            const pos = new vscode.Position(line, character);
            return new vscode.Location(fileUri, pos);
          }
        }
      }
    } catch (err) {
      console.warn('LuminarDefinitionProvider workspace search error:', err);
    }

    return null;
  }

}

module.exports = { LuminarDefinitionProvider };
