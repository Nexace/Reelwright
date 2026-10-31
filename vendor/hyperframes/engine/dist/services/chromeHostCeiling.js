import { spawnSync } from "node:child_process";
import { debuglog } from "node:util";
import { release } from "node:os";
/** Chrome 151 dropped macOS 12 and older (Darwin < 22); 150 is the last major that launches there. */
const MACOS_12_LAST_CHROME_MAJOR = 150;
/** Newest Chrome major this host can run, or undefined when it has no ceiling. */
export function chromeMajorCeiling(hostPlatform = process.platform, hostRelease = release()) {
    if (hostPlatform !== "darwin")
        return undefined;
    return Number.parseInt(hostRelease, 10) < 22 ? MACOS_12_LAST_CHROME_MAJOR : undefined;
}
/** True when a cache dir name (`mac-152.0.1.2`) or build id (`152.0.1.2`) is newer than the ceiling. */
export function exceedsChromeCeiling(versionName, ceiling) {
    if (ceiling === undefined)
        return false;
    const major = Number.parseInt(versionName.slice(versionName.indexOf("-") + 1), 10);
    return major > ceiling;
}
// Deliberately Beta, not Canary: 153.0.8000.0 measured identical to this build on every probe. macOS 12 gets 150,
// the last headless shell that launches there; it exposes canvas.drawElementImage under CanvasDrawElement.
const CHROME_VERSION = "152.0.7977.30";
const MACOS_12_CHROME_VERSION = "150.0.7871.124";
export function managedChromeVersion(hostPlatform = process.platform, hostRelease = release()) {
    return chromeMajorCeiling(hostPlatform, hostRelease) === undefined
        ? CHROME_VERSION
        : MACOS_12_CHROME_VERSION;
}
export const isManagedChromeDir = (versionName) => versionName.slice(versionName.indexOf("-") + 1) === managedChromeVersion();
/** Newest first, by numeric build (`linux-148.0.1` before `linux-99.0.1`). */
export function compareBrowserVersionsDescending(left, right) {
    const parse = (value) => {
        const version = value.slice(value.indexOf("-") + 1);
        const segments = [];
        for (const segment of version.split(".")) {
            const parsed = Number.parseInt(segment, 10);
            if (!Number.isFinite(parsed))
                break;
            segments.push(parsed);
        }
        return segments;
    };
    const leftSegments = parse(left);
    const rightSegments = parse(right);
    const length = Math.max(leftSegments.length, rightSegments.length);
    for (let index = 0; index < length; index += 1) {
        const difference = (rightSegments[index] ?? 0) - (leftSegments[index] ?? 0);
        if (difference !== 0)
            return difference;
    }
    return 0;
}
const starts = new Map();
const debug = debuglog("hyperframes:browser");
/** Whether a shell loads a blank page and exits: an old build can die at launch on a newer OS. Asked once per path. */
export function shellStarts(binary, timeoutMs = 10_000) {
    let answer = starts.get(binary);
    if (answer === undefined) {
        const probe = ["--no-sandbox", "--dump-dom", "about:blank"];
        answer =
            spawnSync(binary, probe, {
                stdio: "ignore",
                timeout: timeoutMs,
                killSignal: "SIGKILL",
                windowsHide: true,
            })?.status === 0;
        if (!answer)
            debug("skipping %s: it did not start", binary);
        starts.set(binary, answer);
    }
    return answer;
}
/** The shared Puppeteer cache's shell: the managed build, else the newest under the host's ceiling that starts.
 * `shell` names a version dir's executable, or undefined when it holds no usable file. */
export function pickSharedShell(versions, shell) {
    const managed = versions.find(isManagedChromeDir);
    const pinned = managed && shell(managed);
    if (pinned)
        return pinned;
    const ceiling = chromeMajorCeiling();
    for (const version of [...versions].sort(compareBrowserVersionsDescending)) {
        if (version === managed || exceedsChromeCeiling(version, ceiling))
            continue;
        const binary = shell(version);
        if (binary && shellStarts(binary))
            return binary;
    }
    return undefined;
}
/** The browser binary an env var names. The CLI and the engine both resolve it here, HYPERFRAMES_BROWSER_PATH first. */
export function browserPathFromEnv(env = process.env) {
    for (const name of ["HYPERFRAMES_BROWSER_PATH", "PRODUCER_HEADLESS_SHELL_PATH"]) {
        const path = env[name];
        if (path)
            return { name, path };
    }
    return undefined;
}
