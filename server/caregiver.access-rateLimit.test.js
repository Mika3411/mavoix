import { createRequire } from "node:module";
import { afterEach, describe, expect, it, vi } from "vitest";

const require = createRequire(import.meta.url);
const {
  buildCaregiverRoomKey,
  parseCaregiverAccess,
  requireCaregiverAccess,
} = require("./caregiver/access");
const { enforceRateLimit } = require("./caregiver/rateLimit");

function createRequest({ query = {}, body = {}, headers = {}, ip = "203.0.113.10" } = {}) {
  const normalizedHeaders = Object.fromEntries(
    Object.entries(headers).map(([name, value]) => [name.toLowerCase(), value])
  );

  return {
    query,
    body,
    ip,
    socket: { remoteAddress: ip },
    get(name) {
      return normalizedHeaders[String(name).toLowerCase()] || "";
    },
  };
}

function createResponse() {
  return {
    headers: {},
    statusCode: 200,
    payload: null,
    setHeader(name, value) {
      this.headers[name] = value;
      return this;
    },
    status(statusCode) {
      this.statusCode = statusCode;
      return this;
    },
    json(payload) {
      this.payload = payload;
      return this;
    },
  };
}

describe("caregiver access control", () => {
  it("hashes caregiver access keys into stable private room keys", () => {
    const accessKey = "caregiverAccessKey123456";
    const roomKey = buildCaregiverRoomKey("channel_12345", accessKey);

    expect(roomKey).toMatch(/^channel_12345:key:/);
    expect(roomKey).not.toContain(accessKey);
    expect(buildCaregiverRoomKey("channel_12345", accessKey)).toBe(roomKey);
  });

  it("reads valid access keys from the dedicated caregiver header", () => {
    const access = parseCaregiverAccess(
      createRequest({
        query: { channel: "channel_12345" },
        headers: { "x-caregiver-key": "caregiverAccessKey123456" },
      })
    );

    expect(access.channel).toBe("channel_12345");
    expect(access.accessKey).toBe("caregiverAccessKey123456");
    expect(access.invalidAccessKey).toBe(false);
    expect(access.roomKey).toMatch(/^channel_12345:key:/);
  });

  it("rejects malformed caregiver access keys before route logic runs", () => {
    const response = createResponse();
    const access = requireCaregiverAccess(
      createRequest({
        query: {
          channel: "channel_12345",
          key: "trop-court",
        },
      }),
      response,
      "Lien incomplet."
    );

    expect(access).toBeNull();
    expect(response.statusCode).toBe(400);
    expect(response.payload).toMatchObject({
      error: "Clé aidant invalide",
    });
  });
});

describe("caregiver rate limiting", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("limits requests per client, scope, and room, then opens a new window", () => {
    let now = 10_000;
    vi.spyOn(Date, "now").mockImplementation(() => now);

    const request = createRequest({
      headers: { "x-forwarded-for": "198.51.100.42, 10.0.0.1" },
    });

    expect(
      enforceRateLimit(request, createResponse(), "message-post-test", 2, 1000, [
        "room-a",
      ])
    ).toBe(true);
    expect(
      enforceRateLimit(request, createResponse(), "message-post-test", 2, 1000, [
        "room-a",
      ])
    ).toBe(true);

    const limitedResponse = createResponse();
    expect(
      enforceRateLimit(request, limitedResponse, "message-post-test", 2, 1000, [
        "room-a",
      ])
    ).toBe(false);
    expect(limitedResponse.statusCode).toBe(429);
    expect(limitedResponse.headers["Retry-After"]).toBe("1");

    now += 1000;
    expect(
      enforceRateLimit(request, createResponse(), "message-post-test", 2, 1000, [
        "room-a",
      ])
    ).toBe(true);
  });
});
