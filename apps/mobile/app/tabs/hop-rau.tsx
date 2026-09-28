import { useCallback, useState } from "react";
import { View, Text, FlatList, StyleSheet, RefreshControl } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { apiFetch } from "../../constants/api";
import { colors, shape, type, useStyles, type Colors } from "../../constants/theme";
import { SHIP_FEE, groupMixes } from "../../constants/commerce";
import { formatVND } from "../../constants/format";
import type { BoxesResponse } from "../../constants/types";
import { useLiveRefresh } from "../../hooks/useLive";
import { AnimIn, Skeleton } from "../../components/motion";
import { EmptyState, PageHeader, Screen } from "../../components/ui";
import { MixCard } from "../../components/MixCard";
import { CutoffBanner } from "../../components/CutoffBanner";
import { Icon } from "../../components/Icon";

/** The mixes of the season open for pre-order, each in sizes S / M / L. */
export default function HopRauScreen() {
  const styles = useStyles(makeStyles);
  const [data, setData] = useState<BoxesResponse | null>(null);
  const [failed, setFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setData(await apiFetch("/boxes"));
      setFailed(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không tải được dữ liệu");
      setFailed(true);
    }
  }, []);

  useLiveRefresh(load);
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const mixes = groupMixes((data?.boxes ?? []).filter((b) => b.active !== false));
  const fee = data?.ship_fee ?? SHIP_FEE;

  return (
    <Screen>
      <FlatList
        data={mixes}
        keyExtractor={(m) => m.mix}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          <>
            <PageHeader icon="inventory_2" eyebrow="Thùng rau mẹ gửi" title="Hộp rau" subtitle="Chọn mix rau, rồi chọn size S, M hoặc L. Hộp nào cũng kèm thực đơn 7 ngày" />
            {error && (
              <View style={styles.errorBox}>
                <Icon name="error" size={18} color={colors.onErrorContainer} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}
            {data ? <CutoffBanner cutoffAt={data.cutoff_at} deliveryDate={data.delivery_date} style={{ marginBottom: 16 }} /> : null}
          </>
        }
        ListEmptyComponent={
          data === null && !failed ? (
            <View style={{ gap: 14 }}>
              <Skeleton height={76} radius={shape.xl} />
              <Skeleton height={380} radius={shape.xl} />
              <Skeleton height={380} radius={shape.xl} />
            </View>
          ) : (
            <EmptyState icon="inventory_2" title="Chưa có hộp rau nào mở bán" description="Các hộp rau mùa mới đang được chuẩn bị. Bạn quay lại sau nhé." />
          )
        }
        ListFooterComponent={
          mixes.length ? (
            <View style={styles.note}>
              <Icon name="local_shipping" size={20} color={colors.onSurfaceVariant} />
              <Text style={styles.noteText}>
                Phí giao {formatVND(fee)} cho đơn mua một lần. Gói định kỳ và nhóm gom đơn đủ người được miễn phí giao.
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item, index }) => (
          <AnimIn index={Math.min(index, 6)} style={{ marginBottom: 14 }}>
            <MixCard mix={item} mediaHeight={180} onOpen={(slug) => router.push(`/hop-rau/${slug}`)} />
          </AnimIn>
        )}
      />
    </Screen>
  );
}

const makeStyles = (c: Colors) =>
  StyleSheet.create({
    errorBox: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: c.errorContainer, borderRadius: shape.md, padding: 10, marginBottom: 12 },
    errorText: { ...type.bodyMedium, color: c.onErrorContainer, flex: 1, fontSize: 13 },
    note: { flexDirection: "row", alignItems: "flex-start", gap: 10, backgroundColor: c.surfaceContainerLow, borderRadius: shape.lg, padding: 14, marginTop: 4 },
    noteText: { ...type.bodyMedium, color: c.onSurfaceVariant, fontSize: 13, flex: 1 },
  });
