#!/usr/bin/env node
// Patches the freshly `expo prebuild`-generated android/app/build.gradle so the
// "release" build type is signed with our upload keystore instead of the debug key.
// Keystore path/credentials come from env vars set by the CI workflow.
const fs = require("fs");
const path = require("path");

const gradlePath = path.join(__dirname, "..", "android", "app", "build.gradle");
let content = fs.readFileSync(gradlePath, "utf8");

if (content.includes("ANDROID_KEYSTORE_PASSWORD")) {
  console.log("build.gradle already patched, skipping.");
  process.exit(0);
}

const releaseSigningConfig = `signingConfigs {
        release {
            storeFile file(System.getenv("ANDROID_KEYSTORE_PATH") ?: "my-release-key.jks")
            storePassword System.getenv("ANDROID_KEYSTORE_PASSWORD")
            keyAlias System.getenv("ANDROID_KEY_ALIAS")
            keyPassword System.getenv("ANDROID_KEY_PASSWORD")
        }
`;

if (!/signingConfigs\s*{/.test(content)) {
  throw new Error("Could not find `signingConfigs {` block in build.gradle");
}
content = content.replace(/signingConfigs\s*{/, releaseSigningConfig);

// Point the release buildType at our new signing config instead of the debug one.
const releaseBuildTypePattern = /(buildTypes\s*{[\s\S]*?release\s*{[\s\S]*?signingConfig signingConfigs\.)debug/;
if (!releaseBuildTypePattern.test(content)) {
  throw new Error("Could not find `release { signingConfig signingConfigs.debug }` in build.gradle");
}
content = content.replace(releaseBuildTypePattern, "$1release");

fs.writeFileSync(gradlePath, content);
console.log("Patched build.gradle release signing config.");
