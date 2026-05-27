import apiClient from "./apiClient";
import { API_ROUTES } from "./apiRoutes";
import type {
    BuildEntry,
    SpecResponse,
    OpenAPISpecification,
    FlowEntry,
    ValidationTableSection,
    ChangelogEntry,
} from "@pages/developer-guide/types";

/**
 * Fetch available domains and versions from the backend.
 */
export async function fetchBuilds(): Promise<BuildEntry[]> {
    const response = await apiClient.get<BuildEntry[]>(API_ROUTES.DEV_GUIDE.BUILDS);
    return response.data ?? [];
}

export interface FetchSpecOptions {
    include?: string[];
    usecase?: string;
    flowId?: string;
    tag?: string;
    docSlug?: string;
}

/**
 * Fetch spec data for a domain/version and transform it into the
 * OpenAPISpecification shape that frontend components expect.
 */
export async function fetchSpec(
    domain: string,
    version: string,
    options?: FetchSpecOptions
): Promise<OpenAPISpecification> {
    const raw = await fetchSpecRaw(domain, version, options);
    return specResponseToOpenAPI(raw, domain, version);
}

/**
 * Fetch raw spec response without transformation.
 */
export async function fetchSpecRaw(
    domain: string,
    version: string,
    options?: FetchSpecOptions
): Promise<SpecResponse> {
    const params: Record<string, string> = {};

    if (options?.include?.length) {
        params.include = options.include.join(",");
    }
    if (options?.usecase) params.usecase = options.usecase;
    if (options?.flowId) params.flowId = options.flowId;
    if (options?.tag) params.tag = options.tag;
    if (options?.docSlug) params.docSlug = options.docSlug;

    const response = await apiClient.get<SpecResponse>(API_ROUTES.DEV_GUIDE.SPEC(domain, version), {
        params,
    });

    return response.data;
}

// ─── Lazy-load helpers ───────────────────────────────────────────────────────

/**
 * Fetch validation table for a domain/version.
 * Returns the table keyed by action name, or null.
 */
export async function fetchValidationTable(
    domain: string,
    version: string
): Promise<ValidationTableSection | null> {
    const raw = await fetchSpecRaw(domain, version, { include: ["validationTable"] });
    return (raw.validationTable as ValidationTableSection) ?? null;
}

/**
 * Fetch changelog entries for a domain/version.
 */
export async function fetchChangelog(domain: string, version: string): Promise<ChangelogEntry[]> {
    const raw = await fetchSpecRaw(domain, version, { include: ["changelog"] });
    return (raw.changelog as ChangelogEntry[] | undefined) ?? [];
}

/**
 * Fetch docs for a domain/version.
 * Returns a slug→content map (sorted by order).
 */
export async function fetchDocs(
    domain: string,
    version: string,
    options?: Pick<FetchSpecOptions, "docSlug" | "usecase">
): Promise<Record<string, string>> {
    const raw = await fetchSpecRaw(domain, version, {
        include: ["docs"],
        ...(options?.docSlug ? { docSlug: options.docSlug } : {}),
        ...(options?.usecase ? { usecase: options.usecase } : {}),
    });
    if (!raw.docs?.length) return {};
    return Object.fromEntries(
        raw.docs.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map((d) => [d.slug, d.content])
    );
}

// ─── Transform helpers ───────────────────────────────────────────────────────

function specResponseToOpenAPI(
    raw: SpecResponse,
    domain: string,
    version: string
): OpenAPISpecification {
    const meta = (raw.meta ?? {}) as Record<string, unknown>;

    const flows: FlowEntry[] | undefined = raw.flows?.map((f) => ({
        domain: str(f.domain, domain),
        version: str(f.version, version),
        type: str(f.type, "playground"),
        flowId: str(f.flowId, ""),
        usecase: str(f.usecase, ""),
        tags: Array.isArray(f.tags) ? f.tags : [],
        description: str(f.description, ""),
        config: f.config ?? { steps: [] },
    }));

    // API returns attributeSet (camelCase); frontend expects attribute_set
    const attributes = raw.attributes?.map((a) => ({
        meta: { use_case_id: a.useCaseId },
        attribute_set: a.attributeSet,
    }));

    // API returns docs as array of { slug, content, order }
    const docs: Record<string, string> | undefined = raw.docs?.length
        ? Object.fromEntries(
              raw.docs
                  .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                  .map((d) => [d.slug, d.content])
          )
        : undefined;

    // API returns meta.errorCodes as flat array (camelCase, no x- prefix)
    const rawErrorCodes = meta.errorCodes as
        | Array<{ Event: string; Description: string; From: string; code: string | number }>
        | undefined;

    // API returns meta.supportedActions and meta.apiProperties as separate fields
    const rawSupportedActions = meta.supportedActions as Record<string, string[]> | undefined;
    const rawApiProperties = meta.apiProperties as
        | Record<string, { async_predecessor: string | null; transaction_partner: string[] }>
        | undefined;

    // Validations section: API returns { validations: unknown } wrapper
    const rawValidations = raw.validations?.validations;

    return {
        openapi: str(meta.openapi, "3.0.0"),
        info: {
            title: str(meta.title, ""),
            description: str(meta.description, ""),
            version: str(meta.version, version),
            domain: str(meta.domain, domain),
            "x-usecases": asStringArray(meta.usecases),
            "x-branch-name": str(meta.branchName, undefined),
            "x-reporting": typeof meta.reporting === "boolean" ? meta.reporting : undefined,
        },
        paths: (meta.paths as OpenAPISpecification["paths"]) ?? undefined,
        components: (meta.components as OpenAPISpecification["components"]) ?? undefined,
        security: (meta.security as OpenAPISpecification["security"]) ?? undefined,
        "x-flows": flows,
        "x-attributes": attributes,
        "x-validations": rawValidations
            ? (rawValidations as OpenAPISpecification["x-validations"])
            : undefined,
        "x-errorcodes": rawErrorCodes?.length ? { code: rawErrorCodes } : undefined,
        "x-supported-actions":
            rawSupportedActions && Object.keys(rawSupportedActions).length > 0
                ? {
                      supportedActions: rawSupportedActions,
                      apiProperties: rawApiProperties ?? {},
                  }
                : undefined,
        "x-docs": docs,
    };
}

function str(v: unknown, fallback: string): string;
function str(v: unknown, fallback: undefined): string | undefined;
function str(v: unknown, fallback: string | undefined): string | undefined {
    return typeof v === "string" ? v : fallback;
}

function asStringArray(v: unknown): string[] | undefined {
    return Array.isArray(v) ? v.filter((i): i is string => typeof i === "string") : undefined;
}
