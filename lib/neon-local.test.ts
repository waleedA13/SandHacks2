import { neonConfig } from "@neondatabase/serverless";
import { beforeEach, describe, expect, it } from "vitest";
import { configureNeonForUrl, isLocalNeonHost } from "./neon-local";

const local = "postgres://postgres:postgres@db.localtest.me:5432/main";
const neonUrl = "postgresql://u:p@ep-cool-123.us-east-2.aws.neon.tech/neondb";

const defaults = {
  fetchEndpoint: neonConfig.fetchEndpoint,
  wsProxy: neonConfig.wsProxy,
  useSecureWebSocket: neonConfig.useSecureWebSocket,
  pipelineTLS: neonConfig.pipelineTLS,
  pipelineConnect: neonConfig.pipelineConnect,
};

beforeEach(() => {
  Object.assign(neonConfig, defaults);
});

describe("isLocalNeonHost", () => {
  it("is true for the Docker proxy host", () => {
    expect(isLocalNeonHost(local)).toBe(true);
  });

  it("is false for a Neon-hosted database", () => {
    expect(isLocalNeonHost(neonUrl)).toBe(false);
  });
});

describe("configureNeonForUrl", () => {
  it("points the driver at the local proxy for the Docker host", () => {
    configureNeonForUrl(local);
    const endpoint = neonConfig.fetchEndpoint;
    expect(neonConfig.useSecureWebSocket).toBe(false);
    expect(
      typeof endpoint === "function"
        ? endpoint("db.localtest.me", 5432)
        : endpoint,
    ).toBe("http://db.localtest.me:4444/sql");
  });

  it("leaves the driver alone for a Neon-hosted database", () => {
    configureNeonForUrl(local);
    Object.assign(neonConfig, defaults);
    configureNeonForUrl(neonUrl);
    expect(neonConfig.useSecureWebSocket).toBe(true);
  });
});
