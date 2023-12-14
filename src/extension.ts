import * as vscode from "vscode";
import * as fs from "fs";

import {
    EncoreDebugConfigurationProvider,
    getEncoreGoOverrideFilePath,
    manualLaunchDebugSession,
} from "./encore";
import {
    MessageType,
    createFileIfNotExist,
    deleteFileIfExist,
    getEncoreExecutablePath,
    getGoExecutablePath,
    makeScriptExecutable,
    showMessage,
} from "./utils";

const GO_CONFIG_SECTION = "go";
const ENCORE_DEBUG_CONFIG_NAME = "encore-debug";

async function checkDependencies(): Promise<{
    isValid: boolean;
    encoreAppFilePath?: string;
    goPath?: string;
}> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];

    if (!workspaceFolder) {
        showMessage("No workspace folder found.", MessageType.Error);
        return { isValid: false };
    }

    const encoreAppFilePath = workspaceFolder.uri.fsPath;
    if (!fs.existsSync(`${encoreAppFilePath}/encore.app`)) {
        showMessage(
            "encore.app file not found in the workspace.",
            MessageType.Error
        );
        return { isValid: false };
    }

    const goPath = getGoExecutablePath();
    if (!goPath) {
        showMessage("Go not found", MessageType.Error);
        return { isValid: false };
    }

    if (!vscode.extensions.getExtension("golang.go")) {
        vscode.window.showErrorMessage(
            "The Go extension for Visual Studio Code is not installed."
        );
        return { isValid: false };
    }

    return { isValid: true, encoreAppFilePath, goPath };
}

function setupEncoreDebugConfiguration(
    context: vscode.ExtensionContext,
    goPath: string
): void {
    const encoreOverridePath = getEncoreGoOverrideFilePath();
    const encorePath = getEncoreExecutablePath();

    createFileIfNotExist(
        encoreOverridePath,
        `#!/bin/sh

if [ $1 = 'test' ]
then
    ${encorePath} $@
else
    ${goPath} $@
fi`
    );

    makeScriptExecutable(encoreOverridePath);

    const config = vscode.workspace.getConfiguration(GO_CONFIG_SECTION);
    config.update(
        "alternateTools",
        { go: encoreOverridePath },
        vscode.ConfigurationTarget.Workspace
    );

    const provider = new EncoreDebugConfigurationProvider();
    context.subscriptions.push(
        vscode.debug.registerDebugConfigurationProvider(
            ENCORE_DEBUG_CONFIG_NAME,
            provider
        )
    );
}

function registerManualCommand(context: vscode.ExtensionContext): void {
    const disposable = vscode.commands.registerCommand(
        "encore.runDebugger",
        manualLaunchDebugSession
    );
    context.subscriptions.push(disposable);
}

export function activate(context: vscode.ExtensionContext): void {
    checkDependencies().then((prerequisites) => {
        if (!prerequisites.isValid) {
            return;
        }
        showMessage("activated");
        const { goPath } = prerequisites;
        setupEncoreDebugConfiguration(context, goPath as string); // if valid goPath is definately found.
        registerManualCommand(context);
    });
}

export function deactivate(): void {
    const encoreOverridePath = getEncoreGoOverrideFilePath();
    deleteFileIfExist(encoreOverridePath);

    const config = vscode.workspace.getConfiguration(GO_CONFIG_SECTION);
    config.update(
        "alternateTools",
        { go: "" },
        vscode.ConfigurationTarget.Workspace
    );
}
