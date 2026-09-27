import { useState } from "react";
import { View, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { Image, type ImageContentFit } from "expo-image";
import { colors } from "../constants/theme";
import { Loader } from "./Loader";
import { Icon } from "./Icon";

/**
 * The web's SmartImage: the M3 loader plays while the image loads (never a static grey box),
 * the image fades in when ready, and a broken-image glyph replaces it on error.
 */
export function SmartImage({ uri, style, contentFit = "cover", loaderSize = 22, transition = 250 }: { uri?: string | null; style?: StyleProp<ViewStyle>; contentFit?: ImageContentFit; loaderSize?: number; transition?: number }) {
  const [state, setState] = useState<"loading" | "done" | "error">("loading");
  return (
    <View style={[{ backgroundColor: colors.surfaceContainerHigh, overflow: "hidden" }, style]}>
      {uri && state !== "error" && (
        <Image
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          contentFit={contentFit}
          transition={transition}
          cachePolicy="memory-disk"
          onLoad={() => setState("done")}
          onError={() => setState("error")}
        />
      )}
      {(state === "loading" && uri) && (
        <View style={[StyleSheet.absoluteFill, { alignItems: "center", justifyContent: "center" }]} pointerEvents="none">
          <Loader size={loaderSize} />
        </View>
      )}
      {(state === "error" || !uri) && (
        <View style={[StyleSheet.absoluteFill, { alignItems: "center", justifyContent: "center" }]} pointerEvents="none">
          <Icon name={uri ? "broken_image" : "image"} size={Math.max(20, loaderSize)} color={colors.onSurfaceVariant} />
        </View>
      )}
    </View>
  );
}
