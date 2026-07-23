/** @jsxImportSource octane */
import { useEffect, useState } from "octane";
import { buttonVariants } from "@hydrox/ui";
import { trpc } from "../lib/trpc";

export function NotificationsView() {
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    void (trpc as any).notify.list.query().then(setItems);
  }, []);

  async function enablePush() {
    const { publicKey } = await (trpc as any).notify.vapidPublicKey.query();
    if (!publicKey || !("Notification" in window)) return;
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return;
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
    const json = sub.toJSON();
    await (trpc as any).notify.subscribePush.mutate({
      endpoint: json.endpoint,
      keys: json.keys,
    });
  }

  return (
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <h1 class="text-xl font-semibold">Notifications</h1>
        <button class={buttonVariants.secondary} type="button" onClick={() => void enablePush()}>
          Enable browser push
        </button>
      </div>
      <ul class="space-y-2">
        {items.map((n) => (
          <li key={n.id} class="rounded-md border border-border bg-card px-3 py-2">
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
