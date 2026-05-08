import "@testing-library/jest-dom";

if (!globalThis.fetch) {
    globalThis.fetch = jest.fn();
}
