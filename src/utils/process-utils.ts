import * as childProcess from "child_process";
import { showMessage } from ".";

interface ProcessCommand {
    command: string;
    args: string[];
}

const getPlatformDebugEncoreProcessCommand = (
    encoreId: string
): ProcessCommand => {
    let command: string;
    let args: string[];

    switch (process.platform) {
        case "linux":
        case "darwin":
            command = "sh";
            args = [
                "-c",
                `ps aux | grep [e]ncore | grep [e]ncore-build | grep ${encoreId} | awk '{print $2}'`,
            ];
            break;
        case "win32":
            // todo this is most likely not working, converted above with AI.
            command = "powershell";
            args = [
                "Get-Process",
                "|",
                "Where-Object",
                `{ $_.ProcessName -match 'encore' -and $_.MainModule.FileName -match 'encore-build' -and $_.ProcessName -match '${encoreId}' }`,
                "|",
                "Select-Object",
                "-ExpandProperty",
                "Id",
            ];
            break;
        default:
            throw new Error(`Unsupported platform: ${process.platform}`);
    }

    return {
        command,
        args,
    };
};

export async function getPlatformDebugEncoreProcess(
    encoreId: string | undefined
): Promise<string | undefined> {
    if (!encoreId) {
        return undefined;
    }
    const command = getPlatformDebugEncoreProcessCommand(encoreId);

    const { stdout } = await runCommand(command);
    return stdout;
}

async function runCommand(processCmd: ProcessCommand): Promise<{
    err: childProcess.ExecFileException | null;
    stdout: string;
    stderr: string;
}> {
    return await new Promise<{
        err: childProcess.ExecFileException | null;
        stdout: string;
        stderr: string;
    }>((resolve) => {
        childProcess.execFile(
            processCmd.command,
            processCmd.args,
            (err, stdout, stderr) => {
                resolve({ err, stdout, stderr });
            }
        );
    });
}
