/**
 * API Routes Constants
 *
 * Centralized constants for all API endpoints used throughout the application.
 * This ensures consistency and makes it easier to update routes if needed.
 */

export const API_ROUTES = {
    // Flow routes
    FLOW: {
        TRIGGER: "/flow/trigger",
        TRIGGER_ACTION: (action: string) => `/flow/trigger/${action}`,
        CURRENT_STATE: "/flow/current-state",
        PROCEED: "/flow/proceed",
        NEW: "/flow/new",
        EXTERNAL_FORM: "/flow/external-form",
        CUSTOM_FLOW: "/flow/custom-flow",
        ACTIONS: "/flow/actions",
    },

    // Session routes
    SESSIONS: {
        BASE: "/sessions",
        CLEAR_FLOW: "/sessions/clearFlow",
        TRANSACTION: "/sessions/transaction",
        EXPECTATION: "/sessions/expectation",
        FLOW_PERMISSION: "/sessions/flowPermission",
    },

    // Database routes
    DB: {
        PAYLOAD: "/db/payload",
        REPORT: "/db/report",
        SESSIONS: "/db/sessions",
        ADMIN_AUTH: "/db/admin/auth",
        PAYLOADS: (domain: string, version: string, action: string, page?: string) =>
            `/db/payloads/${domain}/${version}/${action}/${page || "1"}`,
    },

    // Config routes
    CONFIG: {
        SCENARIO_FORM_DATA: "/config/senarioFormData",
        REPORTING_STATUS: "/config/reportingStatus",
    },

    // Logs routes
    LOGS: {
        BASE: "/logs",
    },

    // API routes (external services)
    API: {
        SESSIONS_FLOWS: (sessionId: string) => `/api/sessions/flows/${sessionId}`,
    },

    AUTH: {
        // LOGOUT: "/auth/logout",
        ME: "/auth/api/me",
        EXCHANGE: "/auth/exchange",
    },

    USER: {
        SCENARIO_PREFERENCES: "/user/scenario-preferences",
        SCENARIO_PREFERENCE_BY_KEY: (configKey: string) =>
            `/user/scenario-preferences/${configKey}`,
    },

    HEALTH: {
        API_SERVICE: "/health/api-service",
    },

    NOTES: {
        BASE: "api/notes",
        BY_ID: (noteId: string) => `api/notes/${noteId}`,
    },

    COMMENTS: {
        BASE: "api/comments",
        BY_ID: (commentsId: string) => `api/comments/${commentsId}`,
        RESOLVE: (commentsId: string) => `api/comments/${commentsId}/resolve`,
    },

    DEV_GUIDE: {
        BUILDS: "dev-guide/available-builds",
        SPEC: (domain: string, version: string) =>
            `dev-guide/spec/${encodeURIComponent(domain)}/${encodeURIComponent(version)}`,
    },
} as const;
