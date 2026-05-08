import {
    fetchBranches,
    fetchFlowFolders,
    fetchYamlFiles,
    fetchRawYaml,
    matchDomainToBranch,
} from "../fetch-github";

// ─── helpers ────────────────────────────────────────────────────────────────

function mockOkJson(body: unknown) {
    return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(body),
    } as Response);
}

function mockOkText(text: string) {
    return Promise.resolve({
        ok: true,
        text: () => Promise.resolve(text),
    } as Response);
}

function mockError(status: number, statusText: string) {
    return Promise.resolve({ ok: false, status, statusText } as Response);
}

// ─── setup ──────────────────────────────────────────────────────────────────
// jest.spyOn is type-safe: no direct assignment to global.fetch needed.

let fetchSpy: jest.SpyInstance;

beforeEach(() => {
    fetchSpy = jest.spyOn(globalThis, "fetch");
});

afterEach(() => {
    jest.restoreAllMocks();
});

// ─── fetchBranches ──────────────────────────────────────────────────────────

describe("fetchBranches", () => {
    it("returns branch names from API response", async () => {
        fetchSpy.mockReturnValueOnce(
            mockOkJson([{ name: "RET18" }, { name: "TRV11" }, { name: "FIS12" }])
        );

        const result = await fetchBranches();

        expect(result).toEqual(["RET18", "TRV11", "FIS12"]);
    });

    it("calls the correct GitHub API URL with per_page=100", async () => {
        fetchSpy.mockReturnValueOnce(mockOkJson([]));

        await fetchBranches();

        expect(fetchSpy).toHaveBeenCalledWith(
            expect.stringContaining("/branches?per_page=100"),
            expect.objectContaining({ headers: expect.any(Object) })
        );
    });

    it("returns empty array when repo has no branches", async () => {
        fetchSpy.mockReturnValueOnce(mockOkJson([]));

        const result = await fetchBranches();

        expect(result).toEqual([]);
    });

    it("throws human-readable error on 404", async () => {
        fetchSpy.mockReturnValueOnce(mockError(404, "Not Found"));

        await expect(fetchBranches()).rejects.toThrow("Path not found on this branch");
    });

    it("throws rate-limit error on 403", async () => {
        fetchSpy.mockReturnValueOnce(mockError(403, "Forbidden"));

        await expect(fetchBranches()).rejects.toThrow("rate limit");
    });

    it("throws generic error for other HTTP failures", async () => {
        fetchSpy.mockReturnValueOnce(mockError(500, "Internal Server Error"));

        await expect(fetchBranches()).rejects.toThrow("GitHub API error 500");
    });
});

// ─── fetchFlowFolders ───────────────────────────────────────────────────────

describe("fetchFlowFolders", () => {
    it("returns only directory entries, not files", async () => {
        fetchSpy.mockReturnValueOnce(
            mockOkJson([
                { name: "buyer_initiated_return", type: "dir" },
                { name: "README.md", type: "file" },
                { name: "seller_cancel", type: "dir" },
                { name: "schema.json", type: "file" },
            ])
        );

        const result = await fetchFlowFolders("RET18");

        expect(result).toEqual(["buyer_initiated_return", "seller_cancel"]);
        expect(result).not.toContain("README.md");
        expect(result).not.toContain("schema.json");
    });

    it("URL-encodes branch name containing slashes", async () => {
        fetchSpy.mockReturnValueOnce(mockOkJson([]));

        await fetchFlowFolders("feat/my-branch");

        expect(fetchSpy).toHaveBeenCalledWith(
            expect.stringContaining("feat%2Fmy-branch"),
            expect.any(Object)
        );
    });

    it("includes correct config/flows path in URL", async () => {
        fetchSpy.mockReturnValueOnce(mockOkJson([]));

        await fetchFlowFolders("RET18");

        expect(fetchSpy).toHaveBeenCalledWith(
            expect.stringContaining("/contents/config/flows"),
            expect.any(Object)
        );
    });

    it("returns empty array when folder has no subdirectories", async () => {
        fetchSpy.mockReturnValueOnce(mockOkJson([{ name: "README.md", type: "file" }]));

        const result = await fetchFlowFolders("RET18");

        expect(result).toEqual([]);
    });

    it("throws readable error on 404", async () => {
        fetchSpy.mockReturnValueOnce(mockError(404, "Not Found"));

        await expect(fetchFlowFolders("nonexistent-branch")).rejects.toThrow(
            "Path not found on this branch"
        );
    });
});

// ─── fetchYamlFiles ─────────────────────────────────────────────────────────

describe("fetchYamlFiles", () => {
    it("returns only .yaml files with their download_url", async () => {
        fetchSpy.mockReturnValueOnce(
            mockOkJson([
                {
                    name: "search_flow.yaml",
                    type: "file",
                    download_url: "https://raw.github.com/search_flow.yaml",
                },
                {
                    name: "README.md",
                    type: "file",
                    download_url: "https://raw.github.com/README.md",
                },
                { name: "subdir", type: "dir", download_url: null },
                {
                    name: "on_search_flow.yaml",
                    type: "file",
                    download_url: "https://raw.github.com/on_search_flow.yaml",
                },
            ])
        );

        const result = await fetchYamlFiles("RET18", "buyer_initiated_return");

        expect(result).toHaveLength(2);
        expect(result[0]).toEqual({
            name: "search_flow.yaml",
            download_url: "https://raw.github.com/search_flow.yaml",
        });
        expect(result[1]).toEqual({
            name: "on_search_flow.yaml",
            download_url: "https://raw.github.com/on_search_flow.yaml",
        });
    });

    it("excludes non-yaml files and directories", async () => {
        fetchSpy.mockReturnValueOnce(
            mockOkJson([
                { name: "config.json", type: "file", download_url: "https://..." },
                { name: "nested", type: "dir", download_url: null },
            ])
        );

        const result = await fetchYamlFiles("RET18", "buyer_initiated_return");

        expect(result).toHaveLength(0);
    });

    it("URL-encodes both branch and folder names in the API URL", async () => {
        fetchSpy.mockReturnValueOnce(mockOkJson([]));

        await fetchYamlFiles("feat/my-branch", "folder with spaces");

        expect(fetchSpy).toHaveBeenCalledWith(
            expect.stringContaining("feat%2Fmy-branch"),
            expect.anything()
        );
        expect(fetchSpy).toHaveBeenCalledWith(
            expect.stringContaining("folder%20with%20spaces"),
            expect.anything()
        );
    });
});

// ─── fetchRawYaml ───────────────────────────────────────────────────────────

describe("fetchRawYaml", () => {
    it("returns raw text content of the file", async () => {
        const rawYaml = "meta:\n  domain: RET18\n  version: 2.0.0";
        fetchSpy.mockReturnValueOnce(mockOkText(rawYaml));

        const result = await fetchRawYaml("https://raw.githubusercontent.com/test.yaml");

        expect(result).toBe(rawYaml);
    });

    it("fetches the exact URL passed without modification", async () => {
        fetchSpy.mockReturnValueOnce(mockOkText(""));

        const url = "https://raw.githubusercontent.com/ONDC-Official/test/main/flow.yaml";
        await fetchRawYaml(url);

        expect(fetchSpy).toHaveBeenCalledWith(url);
    });

    it("throws an error when the fetch fails", async () => {
        fetchSpy.mockReturnValueOnce(mockError(404, "Not Found"));

        await expect(fetchRawYaml("https://raw.github.com/missing.yaml")).rejects.toThrow(
            "Failed to fetch file"
        );
    });
});

// ─── matchDomainToBranch ────────────────────────────────────────────────────

describe("matchDomainToBranch", () => {
    const branches = ["RET18", "TRV11", "FIS12", "B2B"];

    it("returns the branch on exact match", () => {
        expect(matchDomainToBranch("RET18", branches)).toBe("RET18");
    });

    it("strips ONDC: prefix before matching", () => {
        expect(matchDomainToBranch("ONDC:RET18", branches)).toBe("RET18");
    });

    it("strips ondc: prefix case-insensitively", () => {
        expect(matchDomainToBranch("ondc:TRV11", branches)).toBe("TRV11");
    });

    it("falls back to case-insensitive match", () => {
        expect(matchDomainToBranch("ret18", branches)).toBe("RET18");
        expect(matchDomainToBranch("fis12", branches)).toBe("FIS12");
    });

    it("returns undefined when no branch matches", () => {
        expect(matchDomainToBranch("XYZ99", branches)).toBeUndefined();
    });

    it("returns undefined for empty branch list", () => {
        expect(matchDomainToBranch("RET18", [])).toBeUndefined();
    });

    it("handles domain with ONDC: prefix and case-insensitive branch", () => {
        expect(matchDomainToBranch("ONDC:b2b", branches)).toBe("B2B");
    });
});
