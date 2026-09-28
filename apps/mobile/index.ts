// The router only evaluates the files in app/ when it renders. Android can start this bundle with
// no screen to deliver a notification button, so the background task is defined here, first.
import "./constants/push-actions";
import "expo-router/entry";
