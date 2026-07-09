const DEFAULT_AIDANT_SHA256_CERT_FINGERPRINTS = [
  "79:4A:FC:47:98:71:BE:86:6F:EE:4E:C1:EA:2A:13:D2:A4:40:64:B6:1E:4A:17:B9:40:45:03:9E:70:34:15:55",
];

function parseFingerprintList(value) {
  if (!value) return [];

  return value
    .split(/[,\n;]/)
    .map((fingerprint) => fingerprint.trim().toUpperCase())
    .filter(Boolean);
}

function unique(values) {
  return Array.from(new Set(values));
}

function getAidantSha256CertFingerprints() {
  return unique([
    ...DEFAULT_AIDANT_SHA256_CERT_FINGERPRINTS,
    ...parseFingerprintList(process.env.ANDROID_AIDANT_SHA256_CERT_FINGERPRINTS),
  ]);
}

function buildAssetLinks() {
  return [
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: "com.ma.voix.aidant",
        sha256_cert_fingerprints: getAidantSha256CertFingerprints(),
      },
    },
  ];
}

function registerAssetLinksRoute(app) {
  app.get("/.well-known/assetlinks.json", (_req, res) => {
    res.type("application/json").send(buildAssetLinks());
  });
}

module.exports = {
  buildAssetLinks,
  getAidantSha256CertFingerprints,
  registerAssetLinksRoute,
};
