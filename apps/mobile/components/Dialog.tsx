import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { View, Text, Modal, Pressable, StyleSheet } from "react-native";
import { colors, shape, type, useStyles, type Colors } from "../constants/theme";
import { AnimInScale, PressableScale } from "./motion";
import { Icon } from "./Icon";

export interface DialogButton {
  text: string;
  onPress?: () => void;
  style?: "default" | "cancel" | "destructive";
}
export interface DialogOptions {
  icon?: string;
  /** Tapping the scrim dismisses (default true). */
  cancelable?: boolean;
}
interface DialogRequest {
  id: number;
  title: string;
  message?: string;
  buttons: DialogButton[];
  options: DialogOptions;
}

type AlertFn = (title: string, message?: string, buttons?: DialogButton[], options?: DialogOptions) => void;
const DialogContext = createContext<{ alert: AlertFn }>({ alert: () => {} });

/**
 * Material 3 basic dialog (28dp radius, headline, supporting text, text buttons) replacing the
 * platform Alert. `alert()` keeps Alert.alert's signature so call sites read the same.
 */
export function DialogProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<DialogRequest[]>([]);
  const styles = useStyles(makeStyles);

  const alert = useCallback<AlertFn>((title, message, buttons, options) => {
    setQueue((q) => [...q, { id: Date.now() + Math.random(), title, message, buttons: buttons?.length ? buttons : [{ text: "Đóng", style: "cancel" }], options: options ?? {} }]);
  }, []);
  const value = useMemo(() => ({ alert }), [alert]);
  const current = queue[0];
  const close = () => setQueue((q) => q.slice(1));
  const cancelable = current?.options.cancelable !== false;

  return (
    <DialogContext.Provider value={value}>
      {children}
      <Modal visible={!!current} transparent animationType="fade" statusBarTranslucent onRequestClose={() => cancelable && close()}>
        {current && (
          <View style={styles.scrim}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => cancelable && close()} />
            <AnimInScale style={styles.card}>
              {current.options.icon ? (
                <View style={styles.iconWrap}>
                  <Icon name={current.options.icon} size={24} filled color={colors.secondary} />
                </View>
              ) : null}
              <Text style={[styles.title, current.options.icon ? { textAlign: "center" } : null]}>{current.title}</Text>
              {current.message ? <Text style={[styles.message, current.options.icon ? { textAlign: "center" } : null]}>{current.message}</Text> : null}
              <View style={styles.actions}>
                {current.buttons.map((b, i) => {
                  const last = i === current.buttons.length - 1;
                  const destructive = b.style === "destructive";
                  return (
                    <PressableScale
                      key={`${b.text}-${i}`}
                      haptic
                      scaleTo={0.94}
                      style={[styles.btn, last && !destructive && b.style !== "cancel" && styles.btnFilled]}
                      onPress={() => {
                        close();
                        b.onPress?.();
                      }}
                    >
                      <Text style={[styles.btnText, destructive && { color: colors.error }, last && !destructive && b.style !== "cancel" && { color: colors.onPrimary }]}>{b.text}</Text>
                    </PressableScale>
                  );
                })}
              </View>
            </AnimInScale>
          </View>
        )}
      </Modal>
    </DialogContext.Provider>
  );
}

export function useDialog() {
  return useContext(DialogContext);
}

const makeStyles = (c: Colors) =>
  StyleSheet.create({
    scrim: { flex: 1, backgroundColor: c.scrim, alignItems: "center", justifyContent: "center", padding: 28 },
    card: { width: "100%", maxWidth: 420, backgroundColor: c.surfaceContainerHigh, borderRadius: shape.xl, padding: 24 },
    iconWrap: { alignItems: "center", marginBottom: 16 },
    title: {  ...type.headlineSmall, color: c.onSurface, fontSize: 22, lineHeight: 28, fontWeight: "600" },
    message: { ...type.bodyMedium, color: c.onSurfaceVariant, marginTop: 12, lineHeight: 21 },
    actions: { flexDirection: "row", justifyContent: "flex-end", flexWrap: "wrap", gap: 6, marginTop: 24, alignItems: "center" },
    btn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: shape.full, minWidth: 64, alignItems: "center", flexShrink: 0 },
    btnFilled: { backgroundColor: c.primary, paddingHorizontal: 20 },
    btnText: { ...type.labelLarge, color: c.primary, fontSize: 14, lineHeight: 20, flexShrink: 0, includeFontPadding: false },
  });
