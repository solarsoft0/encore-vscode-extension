import * as vscode from "vscode";
import {
    WorkspaceFolder,
    DebugConfiguration,
    ProviderResult,
    CancellationToken,
} from "vscode";
import * as os from "os";
import * as path from "path";
import { MessageType, getEncoreId, showMessage } from "./utils";
import { getPlatformDebugEncoreProcess } from "./utils/process-utils";

export class EncoreDebugConfigurationProvider
    implements vscode.DebugConfigurationProvider
{
    resolveDebugConfiguration(
        folder: WorkspaceFolder | undefined,
        config: DebugConfiguration,
    ): ProviderResult<DebugConfiguration> {
        // delegate to existing provider.
        launchEncoreDebugSession(folder, { noDebug: config.noDebug });
        return undefined; // Cancel this debug session
    }
}

export function manualLaunchDebugSession() {
    if (!vscode.workspace.workspaceFolders) {
        showMessage("No active workspace folders");
        return;
    }
    launchEncoreDebugSession(vscode.workspace.workspaceFolders[0], {
        noDebug: false,
    });
}

export function getEncoreGoOverrideFilePath(): string {
    const fileName = "encore-go.sh";
    const homeDir = os.homedir();
    return path.join(homeDir, fileName);
}

export async function launchEncoreDebugSession(
    folder: WorkspaceFolder | undefined,
    options: vscode.DebugSessionOptions | undefined
) {
    const activeTextEditor = vscode.window.activeTextEditor;

    if (!activeTextEditor) {
        showMessage("No active text editor.", MessageType.Error);
        return;
    }

    const activeFilenameWithPath = activeTextEditor.document.fileName;
    const fileExtension = path
        .extname(activeFilenameWithPath)
        .toLowerCase()
        .replace(".", "");

    const debugConfigInfo: DebugConfigInfo | undefined = getDebugConfigInfo(
        fileExtension,
        options
    );

    if (!debugConfigInfo) {
        showMessage(`Unsupported file type: ${fileExtension}`);
        return;
    }
    const workspaceFolders = vscode.workspace.workspaceFolders;

    if (workspaceFolders && workspaceFolders.length > 0) {
        const encoreId = getEncoreIdFromWorkspace(workspaceFolders);

        let wProcessId = await promptForEncoreProcessId(encoreId, options);

        if (!wProcessId) {
            // regardless of no debug we stop if processId not found. not sure how that will be handled.
            return;
        }

        vscode.debug.startDebugging(folder, {
            ...options,
            ...debugConfigInfo,
            processId: options?.noDebug ? undefined : wProcessId,
        });
    } else {
        console.error("No active workspace folders.");
    }
}

async function promptForEncoreProcessId(
    encoreId: string | undefined,
    options: vscode.DebugSessionOptions | undefined
): Promise<number | undefined> {
    if (!options?.noDebug) {
        let wProcessId = await getPlatformDebugEncoreProcess(encoreId);
        if (wProcessId) {
            showMessage("process detected.");
            return parseInt(wProcessId as string, 10);
        }
        wProcessId = await vscode.window.showInputBox({
            prompt: "Enter Process ID",
            placeHolder: "91811",
        });

        if (!wProcessId) {
            showMessage("No process ID provided.", MessageType.Error);
            return undefined;
        }

        return parseInt(wProcessId as string, 10);
    }

    return undefined;
}

function getEncoreIdFromWorkspace(
    workspaceFolders: readonly vscode.WorkspaceFolder[]
): string | undefined {
    const workspaceRoot = workspaceFolders[0].uri.fsPath;
    const encoreId = getEncoreId(workspaceRoot);

    if (!encoreId) {
        return undefined;
    }

    return encoreId;
}

interface DebugConfigInfo extends DebugConfiguration {
    program: string;
    mode?: string;
}

function getDebugConfigInfo(
    fileExtension: string | undefined,
    options: vscode.DebugSessionOptions | undefined
): DebugConfigInfo | undefined {
    if (fileExtension === "go") {
        // todo try to get process, but this should prompt process selection
        return {
            name: "Encore Debugging",
            type: "go",
            request: options?.noDebug ? "launch" : "attach",
            mode: options?.noDebug ? "debug" : "local",
            program: "${file}",
        };
    } else if (fileExtension === "js" || fileExtension === "mjs") {
        // TODO: Add JavaScript support
    }

    return undefined;
}
