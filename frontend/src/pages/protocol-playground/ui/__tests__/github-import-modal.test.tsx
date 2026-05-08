import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GitHubImportModal } from "../github-import-modal";
import * as fetchGithubModule from "@pages/protocol-playground/utils/fetch-github";
import MockRunner from "@ondc/automation-mock-runner";
import { parse as yamlParse } from "yaml";

// ─── module mocks ─────────────────────────────────────────────────────────────
// Factories use only internal jest.fn() to avoid const TDZ issues.

jest.mock("@pages/protocol-playground/utils/fetch-github", () => ({
    fetchBranches: jest.fn(),
    fetchFlowFolders: jest.fn(),
    fetchYamlFiles: jest.fn(),
    fetchRawYaml: jest.fn(),
    matchDomainToBranch: jest.fn(),
}));

jest.mock("@ondc/automation-mock-runner", () => ({
    __esModule: true,
    default: jest.fn(),
}));

jest.mock("yaml", () => ({
    parse: jest.fn(),
}));

jest.mock("@components/ui/pop-up/pop-up", () => ({
    __esModule: true,
    default: ({ children, isOpen }: { children: React.ReactNode; isOpen: boolean }) =>
        isOpen ? <>{children}</> : null,
}));

// ─── typed aliases (safe: not used inside any factory above) ──────────────────

const mockFetchBranches = fetchGithubModule.fetchBranches as jest.Mock;
const mockFetchFlowFolders = fetchGithubModule.fetchFlowFolders as jest.Mock;
const mockFetchYamlFiles = fetchGithubModule.fetchYamlFiles as jest.Mock;
const mockFetchRawYaml = fetchGithubModule.fetchRawYaml as jest.Mock;
const mockMatchDomainToBranch = fetchGithubModule.matchDomainToBranch as jest.Mock;
const mockYamlParse = yamlParse as jest.Mock;
const MockRunnerCtor = MockRunner as unknown as jest.Mock;

// ─── fixtures ─────────────────────────────────────────────────────────────────

const BRANCHES = ["RET18", "TRV11", "FIS12"];
const FOLDERS = ["buyer_initiated_return", "seller_cancel"];
const FILES = [
    { name: "search_flow.yaml", download_url: "https://raw.github.com/search_flow.yaml" },
    { name: "on_search_flow.yaml", download_url: "https://raw.github.com/on_search_flow.yaml" },
];
const MOCK_CONFIG = {
    meta: { domain: "RET18", version: "2.0.0", flowId: "buyer_return" },
    steps: [],
    transaction_history: [],
    helperLib: "",
};

// ─── helpers ─────────────────────────────────────────────────────────────────

const baseProps = {
    isOpen: true,
    defaultDomain: "RET18",
    onClose: jest.fn(),
    onImport: jest.fn(),
};

function renderModal(props: Partial<typeof baseProps> = {}) {
    return render(<GitHubImportModal {...baseProps} {...props} />);
}

/** Waits until the full async cascade (branches → folders → files) completes. */
const waitForFiles = () => screen.findByText("search_flow.yaml");

// ─── setup ────────────────────────────────────────────────────────────────────

let mockValidateConfig: jest.Mock;

beforeEach(() => {
    jest.resetAllMocks();

    // MockRunner: constructor returns an object with validateConfig
    mockValidateConfig = jest.fn().mockReturnValue({ success: true });
    MockRunnerCtor.mockImplementation(() => ({ validateConfig: mockValidateConfig }));

    // Default happy-path API responses
    mockFetchBranches.mockResolvedValue(BRANCHES);
    mockFetchFlowFolders.mockResolvedValue(FOLDERS);
    mockFetchYamlFiles.mockResolvedValue(FILES);
    mockFetchRawYaml.mockResolvedValue("meta:\n  domain: RET18");
    mockMatchDomainToBranch.mockImplementation((domain: string, branches: string[]) =>
        branches.includes(domain) ? domain : branches[0]
    );
    mockYamlParse.mockReturnValue(MOCK_CONFIG);

    // Reset callback mocks
    baseProps.onClose = jest.fn();
    baseProps.onImport = jest.fn();
});

// ─── rendering ───────────────────────────────────────────────────────────────

describe("rendering", () => {
    it("renders nothing when isOpen is false", () => {
        renderModal({ isOpen: false });
        expect(screen.queryByText("Import Flow from GitHub")).not.toBeInTheDocument();
    });

    it("renders the modal title when isOpen is true", async () => {
        renderModal();
        expect(screen.getByText("Import Flow from GitHub")).toBeInTheDocument();
        // Wait for async effects to settle so no act() warnings leak
        await waitForFiles();
    });

    it("renders Domain, Flow Folder and Flow File labels", async () => {
        renderModal();
        await waitForFiles();
        expect(screen.getByText("Domain (Branch)")).toBeInTheDocument();
        expect(screen.getByText("Flow Folder")).toBeInTheDocument();
        expect(screen.getByText("Flow File")).toBeInTheDocument();
    });

    it("shows Cancel and Import Selected File buttons", async () => {
        renderModal();
        await waitForFiles();
        expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /import selected file/i })).toBeInTheDocument();
    });
});

// ─── branch loading ───────────────────────────────────────────────────────────

describe("branch loading", () => {
    it("calls fetchBranches exactly once when the modal opens", async () => {
        renderModal();
        await waitForFiles();
        expect(mockFetchBranches).toHaveBeenCalledTimes(1);
    });

    it("populates the Domain dropdown with fetched branch names", async () => {
        renderModal();
        await waitForFiles();

        BRANCHES.forEach((branch) => {
            expect(screen.getByRole("option", { name: branch })).toBeInTheDocument();
        });
    });

    it("auto-selects the branch returned by matchDomainToBranch", async () => {
        mockMatchDomainToBranch.mockReturnValue("TRV11");
        renderModal({ defaultDomain: "TRV11" });
        await waitForFiles();

        const branchSelect = screen.getByLabelText(/domain/i) as HTMLSelectElement;
        expect(branchSelect.value).toBe("TRV11");
    });

    it("shows inline error when fetchBranches rejects", async () => {
        mockFetchBranches.mockRejectedValue(new Error("Network error"));
        renderModal();

        await screen.findByText("Network error");
    });
});

// ─── folder loading ───────────────────────────────────────────────────────────

describe("folder loading", () => {
    it("calls fetchFlowFolders with the selected branch", async () => {
        renderModal();
        await waitForFiles();
        expect(mockFetchFlowFolders).toHaveBeenCalledWith("RET18");
    });

    it("populates the Flow Folder dropdown", async () => {
        renderModal();
        await waitForFiles();

        FOLDERS.forEach((folder) => {
            expect(screen.getByRole("option", { name: folder })).toBeInTheDocument();
        });
    });

    it("re-fetches folders when branch selection changes", async () => {
        renderModal();
        await waitForFiles();

        fireEvent.change(screen.getByLabelText(/domain/i), { target: { value: "TRV11" } });

        await waitFor(() => {
            expect(mockFetchFlowFolders).toHaveBeenCalledWith("TRV11");
        });
    });

    it("shows inline error when fetchFlowFolders rejects", async () => {
        mockFetchFlowFolders.mockRejectedValue(
            new Error(
                "Path not found on this branch. The branch may not contain a config/flows folder."
            )
        );
        renderModal();

        await screen.findByText(/path not found on this branch/i);
    });
});

// ─── file loading ─────────────────────────────────────────────────────────────

describe("file loading", () => {
    it("calls fetchYamlFiles with the selected branch and folder", async () => {
        renderModal();
        await waitForFiles();
        expect(mockFetchYamlFiles).toHaveBeenCalledWith("RET18", FOLDERS[0]);
    });

    it("renders each yaml filename as a selectable button", async () => {
        renderModal();
        await waitForFiles();

        expect(screen.getByText("search_flow.yaml")).toBeInTheDocument();
        expect(screen.getByText("on_search_flow.yaml")).toBeInTheDocument();
    });

    it("shows 'No YAML files found' when the folder returns no yaml files", async () => {
        mockFetchYamlFiles.mockResolvedValue([]);
        renderModal();

        await screen.findByText(/no yaml files found/i);
    });

    it("re-fetches files when the folder selection changes", async () => {
        renderModal();
        await waitForFiles();

        fireEvent.change(screen.getByLabelText(/flow folder/i), {
            target: { value: "seller_cancel" },
        });

        await waitFor(() => {
            expect(mockFetchYamlFiles).toHaveBeenCalledWith("RET18", "seller_cancel");
        });
    });
});

// ─── file selection ───────────────────────────────────────────────────────────

describe("file selection", () => {
    it("Import button is disabled when no file is selected", async () => {
        renderModal();
        await waitForFiles();

        expect(screen.getByRole("button", { name: /import selected file/i })).toBeDisabled();
    });

    it("Import button is enabled after a file is clicked", async () => {
        const user = userEvent.setup();
        renderModal();
        await waitForFiles();

        await user.click(screen.getByText("search_flow.yaml"));

        expect(screen.getByRole("button", { name: /import selected file/i })).not.toBeDisabled();
    });

    it("updates the breadcrumb to include the selected filename", async () => {
        const user = userEvent.setup();
        renderModal();
        await waitForFiles();

        await user.click(screen.getByText("search_flow.yaml"));

        // Filename appears in both the file-list button AND the breadcrumb after selection
        const matches = screen.getAllByText(/search_flow\.yaml/);
        expect(matches.length).toBeGreaterThanOrEqual(2);
    });
});

// ─── breadcrumb ───────────────────────────────────────────────────────────────

describe("breadcrumb", () => {
    it("shows selected branch in the breadcrumb after loading", async () => {
        renderModal();
        await waitForFiles();

        // There will be at least one element containing "RET18" (breadcrumb or dropdown value)
        expect(screen.getAllByText(/RET18/).length).toBeGreaterThan(0);
    });
});

// ─── import action ────────────────────────────────────────────────────────────

describe("import action", () => {
    it("fetches raw YAML, parses, validates and calls onImport on success", async () => {
        const user = userEvent.setup();
        renderModal();
        await waitForFiles();

        await user.click(screen.getByText("search_flow.yaml"));
        await user.click(screen.getByRole("button", { name: /import selected file/i }));

        await waitFor(() => {
            expect(mockFetchRawYaml).toHaveBeenCalledWith(FILES[0].download_url);
            expect(mockYamlParse).toHaveBeenCalledWith("meta:\n  domain: RET18");
            expect(mockValidateConfig).toHaveBeenCalled();
            expect(baseProps.onImport).toHaveBeenCalledWith(MOCK_CONFIG);
        });
    });

    it("shows inline error and does NOT call onImport when validation fails", async () => {
        mockValidateConfig.mockReturnValue({ success: false, errors: ["Missing meta.flowId"] });

        const user = userEvent.setup();
        renderModal();
        await waitForFiles();

        await user.click(screen.getByText("search_flow.yaml"));
        await user.click(screen.getByRole("button", { name: /import selected file/i }));

        await screen.findByText(/invalid config.*missing meta\.flowId/i);
        expect(baseProps.onImport).not.toHaveBeenCalled();
    });

    it("shows inline error when fetchRawYaml throws", async () => {
        mockFetchRawYaml.mockRejectedValue(new Error("Failed to fetch file: 404 Not Found"));

        const user = userEvent.setup();
        renderModal();
        await waitForFiles();

        await user.click(screen.getByText("search_flow.yaml"));
        await user.click(screen.getByRole("button", { name: /import selected file/i }));

        await screen.findByText(/failed to fetch file/i);
        expect(baseProps.onImport).not.toHaveBeenCalled();
    });

    it("shows inline error when YAML parsing throws", async () => {
        mockYamlParse.mockImplementation(() => {
            throw new Error("Invalid YAML syntax at line 3");
        });

        const user = userEvent.setup();
        renderModal();
        await waitForFiles();

        await user.click(screen.getByText("search_flow.yaml"));
        await user.click(screen.getByRole("button", { name: /import selected file/i }));

        await screen.findByText(/invalid yaml syntax/i);
    });

    it("shows 'Importing...' label while the import is in progress", async () => {
        // Never resolves → keeps the loading state visible
        mockFetchRawYaml.mockImplementation(() => new Promise(() => {}));

        const user = userEvent.setup();
        renderModal();
        await waitForFiles();

        await user.click(screen.getByText("search_flow.yaml"));
        await user.click(screen.getByRole("button", { name: /import selected file/i }));

        expect(await screen.findByText("Importing...")).toBeInTheDocument();
    });
});

// ─── cancel and close ────────────────────────────────────────────────────────

describe("cancel and close", () => {
    it("calls onClose when the Cancel button is clicked", async () => {
        renderModal();
        await waitForFiles();

        fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

        expect(baseProps.onClose).toHaveBeenCalledTimes(1);
    });
});
