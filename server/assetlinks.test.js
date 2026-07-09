import { createRequire } from "node:module";
import { afterEach, describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const {
  buildAssetLinks,
  getAidantSha256CertFingerprints,
} = require("./assetlinks");

describe("asset links", () => {
  afterEach(() => {
    delete process.env.ANDROID_AIDANT_SHA256_CERT_FINGERPRINTS;
  });

  it("publishes the aidant Android app link statement", () => {
    const statements = buildAssetLinks();

    expect(statements).toHaveLength(1);
    expect(statements[0]).toMatchObject({
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: "com.ma.voix.aidant",
      },
    });
    expect(statements[0].target.sha256_cert_fingerprints).toContain(
      "79:4A:FC:47:98:71:BE:86:6F:EE:4E:C1:EA:2A:13:D2:A4:40:64:B6:1E:4A:17:B9:40:45:03:9E:70:34:15:55"
    );
  });

  it("allows the Play signing fingerprint to be added from the environment", () => {
    process.env.ANDROID_AIDANT_SHA256_CERT_FINGERPRINTS =
      "AA:BB:CC\n11:22:33; aa:bb:cc";

    expect(getAidantSha256CertFingerprints()).toEqual([
      "79:4A:FC:47:98:71:BE:86:6F:EE:4E:C1:EA:2A:13:D2:A4:40:64:B6:1E:4A:17:B9:40:45:03:9E:70:34:15:55",
      "AA:BB:CC",
      "11:22:33",
    ]);
  });
});
