import "./styles.css";
import demo from "./data/demo.json";
import { installControls } from "./ui/controls";
import { installCharts } from "./ui/charts";

async function boot() {
  const fixture = document.createElement("script");
  fixture.type = "application/json";
  fixture.id = "demo-fixture";
  fixture.textContent = JSON.stringify(demo);
  document.body.append(fixture);
  installControls();
  installCharts();
  const controller = await import("./legacy/controller.js");
  await controller.ready;
}
void boot().catch((error) => {
  const panel = document.createElement("section");
  panel.className = "recovery-panel";
  panel.setAttribute("role", "alert");
  panel.textContent =
    "برنامه آماده نشد. داده‌های ذخیره‌شده تغییر نکرده‌اند. خطا: " +
    (error instanceof Error ? error.message : String(error));
  document.body.prepend(panel);
});
