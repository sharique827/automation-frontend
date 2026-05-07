/** @type {import('jest').Config} */
module.exports = {
    testEnvironment: "jsdom",
    setupFilesAfterEnv: ["<rootDir>/src/test-setup.ts"],
    transform: {
        "^.+\\.(ts|tsx|js|jsx)$": ["babel-jest", { configFile: "./babel.config.cjs" }],
    },
    moduleNameMapper: {
        "^@pages/(.*)$": "<rootDir>/src/pages/$1",
        "^@components/(.*)$": "<rootDir>/src/components/$1",
        "^@utils/(.*)$": "<rootDir>/src/utils/$1",
        "^@hooks/(.*)$": "<rootDir>/src/hooks/$1",
        "^@context/(.*)$": "<rootDir>/src/context/$1",
        "^@services/(.*)$": "<rootDir>/src/services/$1",
        "^@constants/(.*)$": "<rootDir>/src/constants/$1",
        "^@styles/(.*)$": "<rootDir>/src/styles/$1",
        "^@/(.*)$": "<rootDir>/src/$1",
        "\\.(css|less|scss|sass)$": "identity-obj-proxy",
        "\\.(png|jpg|jpeg|gif|svg)$": "<rootDir>/src/__mocks__/fileMock.cjs",
    },
    testMatch: ["**/__tests__/**/*.(test|spec).(ts|tsx)", "**/*.(test|spec).(ts|tsx)"],
    moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],
    // Allow 'yaml' (ESM build) to be transformed by babel-jest
    transformIgnorePatterns: ["/node_modules/(?!(yaml)/)"],
    collectCoverageFrom: [
        "src/pages/protocol-playground/utils/fetch-github.ts",
        "src/pages/protocol-playground/ui/github-import-modal.tsx",
    ],
};
