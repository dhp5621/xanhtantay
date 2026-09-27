import { Platform, View, type StyleProp, type ViewStyle } from "react-native";
import { Image } from "expo-image";
import { SvgUri } from "react-native-svg";
import { API_URL } from "../constants/api";
import { shape } from "../constants/theme";

/**
 * /api/qr/[id] returns SVG, which neither RN <Image> nor expo-image decodes on iOS/Android —
 * render it through react-native-svg instead (the browser handles SVG natively on web).
 */
export function QrImage({ orderId, size = 150, style }: { orderId: string; size?: number; style?: StyleProp<ViewStyle> }) {
  const uri = `${API_URL}/api/qr/${orderId}`;
  return (
    <View style={[{ width: size, height: size, backgroundColor: "#fff", borderRadius: shape.sm, overflow: "hidden" }, style]}>
      {Platform.OS === "web" ? <Image source={{ uri }} style={{ width: size, height: size }} contentFit="contain" /> : <SvgUri uri={uri} width={size} height={size} />}
    </View>
  );
}
