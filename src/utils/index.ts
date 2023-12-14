import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

export function createFileIfNotExist(
    filePath: string,
    fileContent: string
): void {
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, fileContent, "utf-8");
    }
}

export function deleteFileIfExist(filePath: string): void {
    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    } catch (error) {}
}

export function makeScriptExecutable(scriptPath: string): void {
    try {
        fs.chmodSync(scriptPath, "755");
    } catch (error) {}
}

export function getGoExecutablePath(): string | null {
    const platform = process.platform;
    const binName = platform === "win32" ? "go.exe" : "go";

    // Check the GOBIN environment variable
    const goBinPath = process.env["GOBIN"];
    if (goBinPath && fs.existsSync(path.join(goBinPath, binName))) {
        return path.join(goBinPath, binName);
    }

    // Check the preferred GOPATHs
    const preferredGopaths = process.env["GOPATH"]
        ? process.env["GOPATH"].split(path.delimiter)
        : [];
    for (const gopath of preferredGopaths) {
        const gopathBinPath = path.join(gopath, "bin", binName);
        if (fs.existsSync(gopathBinPath)) {
            return gopathBinPath;
        }
    }

    // Check GOROOT
    const goroot = process.env["GOROOT"] || "";
    const gorootBinPath = path.join(goroot, "bin", binName);
    if (goroot && fs.existsSync(gorootBinPath)) {
        return gorootBinPath;
    }

    // Check the default paths for go
    const defaultPathsForGo =
        platform === "win32"
            ? [
                  "C:\\Program Files\\Go\\bin\\go.exe",
                  "C:\\Program Files (x86)\\Go\\bin\\go.exe",
              ]
            : ["/usr/local/go/bin/go", "/usr/local/bin/go"];
    for (const p of defaultPathsForGo) {
        if (fs.existsSync(p)) {
            return p;
        }
    }

    // Return null if no executable found
    return null;
}

// assumption here is that encore works on windows. todo confirm with andre
export function getEncoreExecutablePath(): string | undefined {
    const platform = process.platform;
    const binName = platform === "win32" ? "encore.exe" : "encore";

    const defaultPaths =
        platform === "win32"
            ? [
                  `C:\\Program Files\\encore\\bin\\${binName}`,
                  `C:\\Program Files (x86)\\encore\\bin\\${binName}`,
              ]
            : [`/usr/local/encore/bin/${binName}`, `/usr/local/bin/${binName}`];

    for (const p of defaultPaths) {
        if (fs.existsSync(p)) {
            return p;
        }
    }

    return undefined;
}

export function getEncoreId(workspaceRoot: string): string | undefined {
    const filePath = path.join(workspaceRoot, "encore.app");

    try {
        if (!fs.existsSync(filePath)) {
            showMessage(`File not found: ${filePath}`);
            return undefined;
        }

        const jsonContent = fs.readFileSync(filePath, "utf-8");

        // Remove trailing commas before parsing
        const cleanedJsonContent = jsonContent.replace(/,\s*([\]}])/g, "$1");

        const parsedJson = JSON.parse(cleanedJsonContent);

        if (!parsedJson || typeof parsedJson.id !== "string") {
            showMessage(
                `Invalid JSON content or missing "id" property in encore.app`
            );
            return undefined;
        }

        return parsedJson.id;
    } catch (error) {
        showMessage(`Error parsing JSON in encore.app`, MessageType.Error);
        return undefined;
    }
}

export enum MessageType {
    Info = "info",
    Error = "error",
}

export function showMessage(
    message: string,
    messageType: MessageType = MessageType.Info
): void {
    switch (messageType) {
        case MessageType.Info:
            vscode.window.showInformationMessage(`[Encore] ${message}`);
            break;
        case MessageType.Error:
            vscode.window.showErrorMessage(`[Encore] ${message}`);
            break;
        default:
            vscode.window.showInformationMessage(`[Encore] ${message}`);
    }
}
