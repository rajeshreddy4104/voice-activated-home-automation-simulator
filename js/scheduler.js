// scheduler.js — client-side scheduler

const SCHEDULE_KEY = "vas_schedules_v1";

function loadSchedules() {
  try { return JSON.parse(localStorage.getItem(SCHEDULE_KEY) || "[]"); }
  catch { return []; }
}
function saveSchedules(list) { localStorage.setItem(SCHEDULE_KEY, JSON.stringify(list)); }
function addSchedule(item) { const list = loadSchedules(); list.push(item); saveSchedules(list); renderSchedule(); }
function removeSchedule(idx) { const list = loadSchedules(); list.splice(idx,1); saveSchedules(list); renderSchedule(); }

function tickScheduler() {
  const now = Date.now();
  const list = loadSchedules();
  let changed = false;
  for (const s of list) {
    if (s.when <= now && !s.done) {
      if (s.action?.type === "setLights") {
        DeviceAPI.setBrightness(s.action.room, s.action.value);
        sayAndLog(`Okay, set ${s.action.room} lights to ${s.action.value}% as scheduled.`);
      } else if (s.action?.type === "say") {
        sayAndLog(s.action.text || "It's time.");
      } else if (s.command) {
        const parsed = parseIntent(s.command);
        executeIntent(parsed);
      } else {
        sayAndLog("Scheduled item triggered.");
      }
      s.done = true; changed = true;
    }
  }
  if (changed) saveSchedules(list);
}
setInterval(tickScheduler, 1000);

function renderSchedule() {
  const list = loadSchedules();
  const el = document.getElementById("scheduleList");
  el.innerHTML = "";
  if (!list.length) { el.innerHTML = `<p class="small">No routines scheduled.</p>`; return; }
  list.forEach((s, idx) => {
    const whenStr = new Date(s.when).toLocaleString();
    const desc = s.action?.type === "setLights"
      ? `Set ${s.action.room} lights to ${s.action.value}%`
      : s.command ? `Run: "${s.command}"`
      : s.action?.type === "say" ? `Say: "${s.action.text}"` : "Custom action";
    const status = s.done ? "✅ done" : "⏰ pending";
    const div = document.createElement("div");
    div.className = "schedule-item";
    div.innerHTML = `
      <div class="meta">
        <strong>${desc}</strong>
        <span class="small">${whenStr}</span>
        <span class="small">${status}</span>
      </div>
      <div><button data-remove="${idx}">Remove</button></div>
    `;
    div.querySelector("button[data-remove]").addEventListener("click", () => removeSchedule(idx));
    el.appendChild(div);
  });
}
