#!/usr/bin/env bash
set -euo pipefail

# Install Android SDK 35 and JDK 21, then set ANDROID_HOME and JAVA_HOME.
if [[ -z "${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}" ]]; then
  echo "Android SDK introuvable. Definis ANDROID_HOME (ou ANDROID_SDK_ROOT)." >&2
  exit 1
fi
if [[ -n "${JAVA_HOME:-}" ]]; then
  export PATH="$JAVA_HOME/bin:$PATH"
fi
if ! command -v java >/dev/null || ! java -version 2>&1 | grep -q 'version "21'; then
  echo "Java 21 est requis. Definis JAVA_HOME vers un JDK 21." >&2
  exit 1
fi

cd "$(dirname "$0")/.."
npm run build
npx cap sync android
(
  cd android
  ./gradlew assembleDebug --no-daemon
)
cp android/app/build/outputs/apk/debug/app-debug.apk Mario-Rush-Android.apk
echo "APK pret : $(pwd)/Mario-Rush-Android.apk"