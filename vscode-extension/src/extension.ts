import * as vscode from 'vscode';
import * as WebSocket from 'ws';

let wss: WebSocket.Server;
let editorConnection: WebSocket | null = null;

export function activate(context: vscode.ExtensionContext) {
  wss = new WebSocket.Server({ port: 9001 });
  wss.on('connection', (ws) => {
    editorConnection = ws;
    ws.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      handleCommand(msg.action, msg.params);
    });
  });
  context.subscriptions.push(
    vscode.commands.registerCommand('jarvis.insertCode', () => {})
  );
  vscode.window.showInformationMessage('J.A.R.V.I.S. Bridge attivo sulla porta 9001');
}

async function handleCommand(action: string, params: any) {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;
  if (action === 'insert') {
    await editor.edit(edit => { edit.insert(editor.selection.active, params.text); });
  } else if (action === 'replace') {
    await editor.edit(edit => { edit.replace(editor.selection, params.text); });
  } else if (action === 'get_diagnostics') {
    const diagnostics = vscode.languages.getDiagnostics(editor.document.uri);
    if (editorConnection) {
      editorConnection.send(JSON.stringify({ type: 'diagnostics', errors: diagnostics.map(d => d.message) }));
    }
  }
}

export function deactivate() { if (wss) wss.close(); }
