import { Redirect } from "expo-router";

// expo-router needs an actual route matching "/". Without this, a cold launch of the app hits
// "Unmatched Route" since the tab navigator lives under /tabs, not the root.
export default function Index() {
  return <Redirect href="/tabs" />;
}
