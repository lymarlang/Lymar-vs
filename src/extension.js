const vscode = require('vscode');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

let LanguageClient = null;
let languageClientLoadError = null;
try {
  LanguageClient = require('vscode-languageclient/node').LanguageClient;
} catch (e) {
  languageClientLoadError = e.message;
  console.warn('vscode-languageclient not loaded:', e.message);
}

// Client-side fallback providers
const { LuminarSemanticTokensProvider, luminarSemanticTokensLegend } = require("./providers/semanticTokens.js");
const { LuminarHoverProvider } = require("./providers/hoverProvider.js");
const { LuminarCompletionProvider } = require("./providers/completionProvider.js");
const { LuminarSignatureHelpProvider } = require("./providers/signatureHelpProvider.js");
const { LuminarDefinitionProvider } = require("./providers/definitionProvider.js");
const { LuminarReferenceProvider } = require("./providers/referenceProvider.js");
const { LuminarDocumentSymbolProvider } = require("./providers/documentSymbolProvider.js");

let lspClient = null;
let statusBarItem = null;
let fallbackDisposables = [];
let outputChannel = null;

/**
 * Resolve the compiler / LSP executable path from:
 * 1. limitly.lsp.path (custom LSP binary override)
 * 2. limitly.compiler.path (main compiler setting)
 * 3. Workspace folders (bin/limitly.exe, build/limitly.exe, etc.)
 * 4. Known project default path
 * 5. System PATH lookup
 */
function resolveCompilerPath() {
  const config = vscode.workspace.getConfiguration('limitly');

  // 1. Explicit LSP path override
  const lspPath = config.get('lsp.path');
  if (lspPath && typeof lspPath === 'string' && lspPath.trim() !== '') {
    const trimmed = lspPath.trim();
    if (fs.existsSync(trimmed)) {
      return trimmed;
    }
  }

  // 2. Explicit compiler path
  const compilerPath = config.get('compiler.path');
  if (compilerPath && typeof compilerPath === 'string' && compilerPath.trim() !== '') {
    const trimmed = compilerPath.trim();
    if (fs.existsSync(trimmed)) {
      return trimmed;
    }
  }

  // 3. Workspace search
  const isWindows = process.platform === 'win32';
  const binaryName = isWindows ? 'limitly.exe' : 'limitly';
  const folders = vscode.workspace.workspaceFolders;
  if (folders && folders.length > 0) {
    for (const folder of folders) {
      const candidates = [
        path.join(folder.uri.fsPath, 'bin', binaryName),
        path.join(folder.uri.fsPath, 'build', binaryName),
        path.join(folder.uri.fsPath, binaryName)
      ];
      for (const candidate of candidates) {
        if (fs.existsSync(candidate)) {
          return candidate;
        }
      }
    }
  }

  // 4. Known default path
  const defaultPath = isWindows ? 'c:\\Projects\\limitly\\bin\\limitly.exe' : '/usr/local/bin/limitly';
  if (fs.existsSync(defaultPath)) {
    return defaultPath;
  }

  // 5. System PATH lookup
  try {
    const cmd = isWindows ? `where.exe ${binaryName}` : `which ${binaryName}`;
    const output = execSync(cmd, { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    const firstLine = output.split(/\r?\n/)[0];
    if (firstLine && fs.existsSync(firstLine)) {
      return firstLine;
    }
  } catch {
    // Ignore PATH lookup failure
  }

  return null;
}

/**
 * Start or restart the LSP client.
 */
async function startLspClient(context) {
  // Stop existing client if any
  if (lspClient) {
    try {
      await lspClient.stop();
    } catch (e) {
      console.warn('Error stopping existing LSP client:', e);
    }
    lspClient = null;
  }

  const config = vscode.workspace.getConfiguration('limitly');
  const enableLsp = config.get('lsp.enable', true);

  if (!enableLsp) {
    updateStatusBar(false, 'LSP Disabled');
    registerFallbackProviders(context);
    return;
  }

  if (!LanguageClient) {
    console.warn('LanguageClient class is unavailable. Using fallback providers.', languageClientLoadError);
    if (outputChannel) {
      outputChannel.appendLine(`[LSP Error] vscode-languageclient module unavailable: ${languageClientLoadError || 'unknown error'}`);
    }
    updateStatusBar(false, 'LSP Module Missing', languageClientLoadError || 'vscode-languageclient package missing');
    registerFallbackProviders(context);
    return;
  }

  const serverPath = resolveCompilerPath();

  if (!serverPath) {
    const configuredPath = config.get('compiler.path') || config.get('lsp.path') || 'not configured';
    console.warn(`Limitly compiler binary not found (configured: ${configuredPath}). Falling back to client-side providers.`);
    updateStatusBar(false, 'Compiler Not Found', 'Click to set Limitly compiler path in settings');
    registerFallbackProviders(context);
    return;
  }

  try {
    const serverOptions = {
      command: serverPath,
      args: ['-lsp'],
      options: { shell: false }
    };

    const clientOptions = {
      documentSelector: [
        { scheme: 'file', language: 'limitly' },
        { scheme: 'file', language: 'luminar' }
      ],
      synchronize: {
        fileEvents: vscode.workspace.createFileSystemWatcher('**/*.lm')
      },
      outputChannel: outputChannel
    };

    lspClient = new LanguageClient(
      'limitlyLanguageServer',
      'Limitly Language Server',
      serverOptions,
      clientOptions
    );

    await lspClient.start();
    updateStatusBar(true, 'Limitly LSP: Active', `Running: ${serverPath}`);
    if (outputChannel) {
      outputChannel.appendLine(`[LSP] Limitly Language Server started successfully with binary: ${serverPath}`);
    }
    // Remove fallback providers if LSP is active
    disposeFallbackProviders();
  } catch (err) {
    console.error('Failed to start Limitly Language Server:', err);
    if (outputChannel) {
      outputChannel.appendLine(`[LSP Error] Failed to start LSP: ${err.message}`);
    }
    updateStatusBar(false, 'LSP Start Failed', err.message);
    registerFallbackProviders(context);
  }
}

/**
 * Register client-side fallback providers when LSP is unavailable.
 */
function registerFallbackProviders(context) {
  if (fallbackDisposables.length > 0) return;

  const supportedLanguages = ['limitly', 'luminar'];
  for (const lang of supportedLanguages) {
    const selector = { language: lang, scheme: "file" };

    fallbackDisposables.push(
      vscode.languages.registerHoverProvider(selector, new LuminarHoverProvider())
    );

    fallbackDisposables.push(
      vscode.languages.registerCompletionItemProvider(
        selector,
        new LuminarCompletionProvider(),
        ".", ":", "(", "["
      )
    );

    fallbackDisposables.push(
      vscode.languages.registerSignatureHelpProvider(
        selector,
        new LuminarSignatureHelpProvider(),
        "(",
        ","
      )
    );

    fallbackDisposables.push(
      vscode.languages.registerDefinitionProvider(
        selector,
        new LuminarDefinitionProvider()
      )
    );

    fallbackDisposables.push(
      vscode.languages.registerReferenceProvider(
        selector,
        new LuminarReferenceProvider()
      )
    );

    fallbackDisposables.push(
      vscode.languages.registerDocumentSymbolProvider(
        selector,
        new LuminarDocumentSymbolProvider()
      )
    );

    fallbackDisposables.push(
      vscode.languages.registerDocumentFormattingEditProvider(lang, {
        provideDocumentFormattingEdits(document) {
          const text = document.getText();
          const formatted = formatLuminarCode(text);
          const firstLine = document.lineAt(0);
          const lastLine = document.lineAt(document.lineCount - 1);
          const fullRange = new vscode.Range(firstLine.range.start, lastLine.range.end);
          return [vscode.TextEdit.replace(fullRange, formatted)];
        }
      })
    );
  }
}

/**
 * Clean up fallback providers.
 */
function disposeFallbackProviders() {
  for (const d of fallbackDisposables) {
    d.dispose();
  }
  fallbackDisposables = [];
}

/**
 * Update the Status Bar item.
 */
function updateStatusBar(active, text, tooltip = '') {
  if (!statusBarItem) return;

  if (active) {
    statusBarItem.text = `$(check) ${text}`;
    statusBarItem.tooltip = tooltip || 'Limitly Language Server is running';
    statusBarItem.command = 'limitly.selectCompiler';
    statusBarItem.backgroundColor = undefined;
  } else {
    statusBarItem.text = `$(alert) Limitly: ${text}`;
    statusBarItem.tooltip = tooltip || 'Click to configure Limitly compiler path in settings';
    statusBarItem.command = 'limitly.selectCompiler';
    statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
  }
  statusBarItem.show();
}

/**
 * Main activation function.
 */
function activate(context) {
  console.log('Luminar / Limitly language extension activated');
  outputChannel = vscode.window.createOutputChannel('Limitly LSP');
  context.subscriptions.push(outputChannel);

  // Status Bar item
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  context.subscriptions.push(statusBarItem);

  // Commands
  context.subscriptions.push(
    vscode.commands.registerCommand('limitly.restartLsp', async () => {
      vscode.window.showInformationMessage('Restarting Limitly Language Server...');
      await startLspClient(context);
      vscode.window.showInformationMessage('Limitly Language Server restarted.');
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('limitly.selectCompiler', async () => {
      const options = ['Browse for limitly executable...', 'Enter path manually...'];
      const pick = await vscode.window.showQuickPick(options, {
        placeHolder: 'Choose how to specify the Limitly compiler location'
      });

      if (!pick) return;

      let selectedPath = null;
      if (pick === options[0]) {
        const uris = await vscode.window.showOpenDialog({
          canSelectFiles: true,
          canSelectFolders: false,
          canSelectMany: false,
          openLabel: 'Select Limitly Compiler',
          filters: process.platform === 'win32'
            ? { 'Executables': ['exe'], 'All Files': ['*'] }
            : { 'All Files': ['*'] }
        });
        if (uris && uris.length > 0) {
          selectedPath = uris[0].fsPath;
        }
      } else {
        const current = vscode.workspace.getConfiguration('limitly').get('compiler.path') || '';
        selectedPath = await vscode.window.showInputBox({
          prompt: 'Enter full path to limitly executable',
          value: current
        });
      }

      if (selectedPath && selectedPath.trim() !== '') {
        const config = vscode.workspace.getConfiguration('limitly');
        await config.update('compiler.path', selectedPath.trim(), vscode.ConfigurationTarget.Global);
        vscode.window.showInformationMessage(`Limitly compiler location updated: ${selectedPath.trim()}`);
        await startLspClient(context);
      }
    })
  );

  // Listen for configuration changes to automatically reload compiler/LSP
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(async (e) => {
      if (
        e.affectsConfiguration('limitly.compiler.path') ||
        e.affectsConfiguration('limitly.lsp.path') ||
        e.affectsConfiguration('limitly.lsp.enable')
      ) {
        if (outputChannel) {
          outputChannel.appendLine('[Config] Compiler or LSP setting changed. Reloading Language Server...');
        }
        await startLspClient(context);
      }
    })
  );

  // Semantic tokens (always active for rich syntax highlighting)
  const supportedLanguages = ['limitly', 'luminar'];
  for (const lang of supportedLanguages) {
    const selector = { language: lang, scheme: "file" };

    // Semantic Tokens
    context.subscriptions.push(
      vscode.languages.registerDocumentSemanticTokensProvider(
        selector,
        new LuminarSemanticTokensProvider(),
        luminarSemanticTokensLegend
      )
    );
  }


  // Initial LSP launch (handles completion, hover, signature help, definition, document symbols, and formatting)
  startLspClient(context);

  console.log('Luminar / Limitly: Extension registration complete');
}

async function deactivate() {
  disposeFallbackProviders();
  if (lspClient) {
    return await lspClient.stop();
  }
  return undefined;
}

exports.activate = activate;
exports.deactivate = deactivate;

/**
 * Luminar / Limitly formatting logic.
 */
function formatLuminarCode(text) {
  const lines = text.split(/\r?\n/);
  const formatted = [];
  let indentLevel = 0;
  const indentSize = 4;

  const blockStart = /^(fn|for|iter|if|else|elif|while|match|type|class|frame|module|trait|impl|contract|parallel|concurrent|task|worker)\b.*(\{)?$/;
  const blockEnd = /^\}/;

  for (let raw of lines) {
    let line = raw.trimRight();

    // Keep comments intact
    if (/^\s*(\/\/|\/\*)/.test(line)) {
      formatted.push(' '.repeat(indentLevel * indentSize) + line.trim());
      continue;
    }

    // Skip empty lines (preserve at most one)
    if (line.trim() === '') {
      if (formatted.length && formatted[formatted.length - 1].trim() !== '') {
        formatted.push('');
      }
      continue;
    }

    // Adjust indentation before applying it
    if (blockEnd.test(line)) {
      indentLevel = Math.max(indentLevel - 1, 0);
    }

    // Apply operator spacing
    line = line
      .replace(/\s*([=+\-*/<>!%&|]+)\s*/g, ' $1 ')
      .replace(/\s*:\s*/g, ': ')
      .replace(/\s*,\s*/g, ', ')
      .replace(/\s*;\s*/g, ';')
      .replace(/\s*(=>)\s*/g, ' $1 ')
      .replace(/\s*(\.\.)\s*/g, '$1');

    // Remove duplicate spaces
    line = line.replace(/\s{2,}/g, ' ').trim();

    // Apply indentation
    const indentedLine = ' '.repeat(indentLevel * indentSize) + line;
    formatted.push(indentedLine);

    // Increase indent for next line if this line opens a block
    if (blockStart.test(line) || line.endsWith('{')) {
      indentLevel++;
    }
  }

  return formatted.join('\n').trimEnd() + '\n';
}
