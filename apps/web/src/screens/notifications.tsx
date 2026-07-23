/** @jsxImportSource octane */
import { useEffect, useState } from "octane";
import { buttonVariants } from "@hydrox/ui";
import { trpc } from "../lib/trpc";
import { t } from "../i18n";

export function NotificationsView() {
  const [items, setItems] = useState<any[]>([]);
  const [pushStatus, setPushStatus] = useState<string | null>(null);

  useEffect(() => {
    void (trpc as any).notify.list.query().then(setItems);
  }, []);

  async function enablePush() {
    setPushStatus(null);
    const { publicKey } = await (trpc as any).notify.vapidPublicKey.query();
    if (!publicKey) {
      setPushStatus("VAPID keys not configured on server");
      return;
    }
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setPushStatus("Push not supported in this browser");
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setPushStatus("Notification permission denied");
      return;
    }
    const reg = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
    const json = sub.toJSON();
    await (trpc as any).notify.subscribePush.mutate({
      endpoint: json.endpoint,
      keys: json.keys,
    });
    setPushStatus("Browser push enabled");
  }

  return (
    <div class="space-y-4" data-testid="notifications-view">
      <div class="flex items-center justify-between gap-3">
        <h1 class="panel-title">{t("nav.notifications")}</h1>
        <button
          class={buttonVariants.secondary}
          type="button"
          data-testid="enable-push"
          onClick={() => void enablePush()}
        >
          {t("notify.enablePush")}
        </button>
      </div>
      {pushStatus ? (
        <p class="text-sm text-muted-foreground" data-testid="push-status">
          {pushStatus}
        </p>
      ) : null}
      <ul class="space-y-2" data-testid="notifications-list">
        {items.map((n) => (
          <li
            key={n.id}
            class="rounded-md border border-border bg-card px-3 py-2"
            data-testid="notification-item"
          >
            <div class="font-medium">{n.title}</div>
            <div class="text-sm text-muted-foreground">{n.body}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}
