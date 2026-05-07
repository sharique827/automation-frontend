const REPO = "ONDC-Official/automation-specifications";
const GITHUB_API = `https://api.github.com/repos/${REPO}`;

interface GitHubBranch {
    name: string;
}

interface GitHubContent {
    name: string;
    type: "file" | "dir";
    download_url: string | null;
}

export interface GitHubFile {
    name: string;
    download_url: string;
}

async function githubFetch<T>(url: string): Promise<T> {
    const response = await fetch(url, {
        headers: { Accept: "application/vnd.github.v3+json" },
    });
    if (!response.ok) {
        if (response.status === 404) {
            throw new Error(
                "Path not found on this branch. The branch may not contain a config/flows folder."
            );
        }
        if (response.status === 403) {
            throw new Error("GitHub API rate limit exceeded. Please wait a minute and try again.");
        }
        throw new Error(`GitHub API error ${response.status}: ${response.statusText}`);
    }
    return response.json() as Promise<T>;
}

export async function fetchBranches(): Promise<string[]> {
    const data = await githubFetch<GitHubBranch[]>(`${GITHUB_API}/branches?per_page=100`);
    return data.map((b) => b.name);
}

export async function fetchFlowFolders(branch: string): Promise<string[]> {
    const data = await githubFetch<GitHubContent[]>(
        `${GITHUB_API}/contents/config/flows?ref=${encodeURIComponent(branch)}`
    );
    return data.filter((item) => item.type === "dir").map((item) => item.name);
}

export async function fetchYamlFiles(branch: string, folder: string): Promise<GitHubFile[]> {
    const data = await githubFetch<GitHubContent[]>(
        `${GITHUB_API}/contents/config/flows/${encodeURIComponent(folder)}?ref=${encodeURIComponent(branch)}`
    );
    return data
        .filter((item) => item.type === "file" && item.name.endsWith(".yaml"))
        .map((item) => ({ name: item.name, download_url: item.download_url! }));
}

export async function fetchRawYaml(downloadUrl: string): Promise<string> {
    const response = await fetch(downloadUrl);
    if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
    }
    return response.text();
}

/**
 * Tries to match a domain string (e.g. "ONDC:RET18" or "RET18") to a branch name.
 * Returns the matching branch name or undefined.
 */
export function matchDomainToBranch(domain: string, branches: string[]): string | undefined {
    // exact match first
    if (branches.includes(domain)) return domain;
    // strip "ONDC:" prefix (e.g. "ONDC:RET18" → "RET18")
    const stripped = domain.replace(/^ONDC:/i, "");
    if (branches.includes(stripped)) return stripped;
    // case-insensitive fallback
    const lower = stripped.toLowerCase();
    return branches.find((b) => b.toLowerCase() === lower);
}
