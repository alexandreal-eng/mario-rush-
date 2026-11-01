import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.mariorush.game",
  appName: "Mario Rush",
  webDir: "dist",
  android: {
    backgroundColor: "#0b1020",
    allowMixedContent: false,
  },
};

export default config;