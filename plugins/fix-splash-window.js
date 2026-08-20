const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

module.exports = function fixSplashWindow(config) {
  return withDangerousMod(config, [
    "android",
    (mod) => {
      const stylesPath = path.join(
        mod.modRequest.platformProjectRoot,
        "app/src/main/res/values/styles.xml"
      );
      if (fs.existsSync(stylesPath)) {
        let contents = fs.readFileSync(stylesPath, "utf-8");
        contents = contents.replace(
          /<item name="android:windowBackground">@drawable\/splashscreen_logo<\/item>/g,
          '<item name="android:windowBackground">@drawable/ic_launcher_background</item>'
        );
        fs.writeFileSync(stylesPath, contents, "utf-8");
      }
      return mod;
    },
  ]);
};
