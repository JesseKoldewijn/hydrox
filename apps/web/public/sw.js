self.addEventListener("push", (event) => {
  let data = { title: "Hydrox", body: "" };
  try {
    data = event.data ? event.data.json() : data;
  } catch {
    // ignore
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "Hydrox", {
      body: data.body || "",
    }),
  );
});
