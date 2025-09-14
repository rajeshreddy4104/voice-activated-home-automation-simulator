// app.js — glue code

function logMsg(who, msg) {
  const log = document.getElementById("log");
  const div = document.createElement("div");
  div.className = "log-item";
  div.innerHTML = `<div class="who">${who}</div><div class="msg">${msg}</div>`;
  log.prepend(div);
}

function render() {
  simulateTemperatureDrift(state);
  const grid = document.getElementById("devicesGrid");
  grid.innerHTML = "";

  function renderLightCard(room) {
    const l = state.rooms[room].lights;
    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `
      <h3>${room[0].toUpperCase()+room.slice(1)} Lights</h3>
      <div class="control-row">
        <span class="badge">${l.power ? "On" : "Off"}</span>
        <button data-light="${room}" data-on="true">On</button>
        <button data-light="${room}" data-on="false">Off</button>
      </div>
      <input type="range" min="0" max="100" value="${l.brightness}" class="slider" data-bright="${room}"/>
    `;
    grid.appendChild(div);
  }

  renderLightCard("living");
  renderLightCard("bedroom");
  renderLightCard("kitchen");

  const tv = state.rooms.living.tv;
  const tvDiv = document.createElement("div");
  tvDiv.className = "card";
  tvDiv.innerHTML = `
    <h3>TV (Living)</h3>
    <div class="control-row">
      <span class="badge">${tv.power ? "On" : "Off"}</span>
      <button data-tv="on">On</button>
      <button data-tv="off">Off</button>
    </div>
    <label>Volume: <strong>${tv.volume}</strong></label>
    <input type="range" min="0" max="100" value="${tv.volume}" class="slider" data-tvvol="1"/>
  `;
  grid.appendChild(tvDiv);

  const th = state.climate.thermostat;
  const sensor = state.climate.sensor;
  const thDiv = document.createElement("div");
  thDiv.className = "card";
  thDiv.innerHTML = `
    <h3>Thermostat</h3>
    <div class="control-row">
      <span class="badge">Target: ${th.temperature}°F</span>
      <span class="badge">Current: ${sensor.current}°F</span>
    </div>
    <div class="control-row">
      <button data-temp="-1">-</button>
      <button data-temp="+1">+1</button>
      <button data-temp="+5">+5</button>
    </div>
  `;
  grid.appendChild(thDiv);

  const lock = state.rooms.bedroom.smartLock;
  const lockDiv = document.createElement("div");
  lockDiv.className = "card";
  lockDiv.innerHTML = `
    <h3>Bedroom Door</h3>
    <div class="control-row">
      <span class="badge">${lock.locked ? "Locked" : "Unlocked"}</span>
      <button data-lock="lock">Lock</button>
      <button data-lock="unlock">Unlock</button>
    </div>
  `;
  grid.appendChild(lockDiv);

  const cm = state.rooms.kitchen.coffeeMaker;
  const cmDiv = document.createElement("div");
  cmDiv.className = "card";
  cmDiv.innerHTML = `
    <h3>Coffee Maker</h3>
    <div class="control-row">
      <span class="badge">${cm.status}</span>
      <button data-coffee="start">Start</button>
    </div>
  `;
  grid.appendChild(cmDiv);

  const w = state.rooms.kitchen.washer;
  const wDiv = document.createElement("div");
  wDiv.className = "card";
  wDiv.innerHTML = `
    <h3>Washing Machine</h3>
    <div class="control-row">
      <span class="badge">${w.status}${w.finished ? " ✅" : ""}</span>
      <button data-washer="start">Start</button>
      <button data-washer="stop">Stop</button>
    </div>
  `;
  grid.appendChild(wDiv);

  // events
  grid.querySelectorAll("button[data-light]").forEach(btn => {
    const room = btn.getAttribute("data-light");
    const on = btn.getAttribute("data-on") === "true";
    btn.addEventListener("click", () => {
      DeviceAPI.setLight(room, on);
      sayAndLog(`Turning ${on ? "on" : "off"} the ${room} lights.`);
      render();
    });
  });

  grid.querySelectorAll("input[data-bright]").forEach(sl => {
    const room = sl.getAttribute("data-bright");
    sl.addEventListener("input", () => { DeviceAPI.setBrightness(room, parseInt(sl.value,10)); render(); });
    sl.addEventListener("change", () => { sayAndLog(`Set ${room} lights to ${sl.value}%`); });
  });

  const tvOn = grid.querySelector("button[data-tv='on']");
  const tvOff = grid.querySelector("button[data-tv='off']");
  if (tvOn) tvOn.addEventListener("click", () => { DeviceAPI.setTV("living", true); sayAndLog("TV on."); render(); });
  if (tvOff) tvOff.addEventListener("click", () => { DeviceAPI.setTV("living", false); sayAndLog("TV off."); render(); });
  const tvVol = grid.querySelector("input[data-tvvol]");
  if (tvVol) tvVol.addEventListener("input", () => { DeviceAPI.setTVVolume("living", parseInt(tvVol.value,10)); render(); });

  thDiv.querySelectorAll("button[data-temp]").forEach(b => {
    const val = b.getAttribute("data-temp");
    b.addEventListener("click", () => {
      const delta = val === "-1" ? -1 : parseInt(val.replace("+",""),10);
      DeviceAPI.setThermostat(state.climate.thermostat.temperature + delta);
      sayAndLog(`Thermostat set to ${state.climate.thermostat.temperature} degrees.`);
      render();
    });
  });

  lockDiv.querySelector("button[data-lock='lock']").addEventListener("click", () => { DeviceAPI.lockDoor("bedroom", true); sayAndLog("Locked the bedroom door."); render(); });
  lockDiv.querySelector("button[data-lock='unlock']").addEventListener("click", () => { DeviceAPI.lockDoor("bedroom", false); sayAndLog("Unlocked the bedroom door."); render(); });

  cmDiv.querySelector("button[data-coffee='start']").addEventListener("click", () => { DeviceAPI.startCoffee(); sayAndLog("Starting the coffee maker."); render(); });

  wDiv.querySelector("button[data-washer='start']").addEventListener("click", () => { DeviceAPI.startWasher(); sayAndLog("Starting the washing machine."); render(); });
  wDiv.querySelector("button[data-washer='stop']").addEventListener("click", () => { DeviceAPI.stopWasher(); sayAndLog("Stopping the washing machine."); render(); });
}

function executeIntent(result) {
  switch (result.intent) {
    case "lightsPower":
      if (DeviceAPI.setLight(result.room, result.on)) { sayAndLog(`Okay, turning ${result.on ? "on" : "off"} the ${result.room} lights.`); render(); }
      else { sayAndLog(`I couldn't find ${result.room} lights.`); }
      break;
    case "lightsLevel":
      if (DeviceAPI.setBrightness(result.room, result.percent)) { sayAndLog(`Set ${result.room} lights to ${result.percent}%.`); render(); }
      else { sayAndLog(`I couldn't set brightness in ${result.room}.`); }
      break;
    case "setThermostat":
      DeviceAPI.setThermostat(result.temp); sayAndLog(`Thermostat set to ${result.temp} degrees.`); render(); break;
    case "queryTemp":
      sayAndLog(`It's currently ${state.climate.sensor.current}°F, target is ${state.climate.thermostat.temperature}°F.`); break;
    case "coffee":
      DeviceAPI.startCoffee(); sayAndLog("Starting the coffee maker."); render(); break;
    case "washerStart":
      DeviceAPI.startWasher(); sayAndLog("Starting the washing machine."); render(); break;
    case "washerStop":
      DeviceAPI.stopWasher(); sayAndLog("Stopping the washing machine."); render(); break;
    case "washerStatus":
      sayAndLog(`Washer status: ${state.rooms.kitchen.washer.status}${state.rooms.kitchen.washer.finished ? ", it's finished." : "."}`); break;
    case "lockDoor":
      DeviceAPI.lockDoor("bedroom", result.locked); sayAndLog(`${result.locked ? "Locked" : "Unlocked"} the bedroom door.`); render(); break;
    case "tvPower":
      DeviceAPI.setTV("living", result.on); sayAndLog(`Turning ${result.on ? "on" : "off"} the TV.`); render(); break;
    case "tvVolume":
      DeviceAPI.setTVVolume("living", result.volume); sayAndLog(`Setting TV volume to ${result.volume}.`); render(); break;
    case "scheduleWake":
      if (!result.time) { sayAndLog("I couldn't understand the time for your wake-up."); break; }
      addSchedule({ when: result.time.getTime(), action: result.action, profileId: getActiveProfile().id, done: false });
      sayAndLog(`Wake-up scheduled for ${result.time.toLocaleString()}.`); break;
    case "scheduleGeneric":
      if (!result.time || !result.command) { sayAndLog("I couldn't parse the schedule details."); break; }
      addSchedule({ when: result.time.getTime(), command: result.command, profileId: getActiveProfile().id, done: false });
      sayAndLog(`Okay, I'll run that at ${result.time.toLocaleString()}.`); break;
    default:
      sayAndLog("Sorry—I'm not sure how to do that yet.");
  }
}

function handleCommand(text) { const result = parseIntent(text); executeIntent(result); }

function wireUI() {
  // Theme toggle
  const themeBtn = document.getElementById('themeToggle');
  if (themeBtn) {
    const savedTheme = localStorage.getItem('vas_theme') || 'dark';
    if (savedTheme === 'light') document.documentElement.classList.add('light');
    themeBtn.addEventListener('click', () => {
      document.documentElement.classList.toggle('light');
      localStorage.setItem('vas_theme', document.documentElement.classList.contains('light') ? 'light' : 'dark');
    });
  }
  // Accent picker
  const savedAccent = localStorage.getItem('vas_accent') || 'blue';
  document.documentElement.setAttribute('data-accent', savedAccent);
  document.querySelectorAll('.accent-picker .swatch').forEach(btn => {
    btn.addEventListener('click', () => {
      const a = btn.getAttribute('data-accent');
      document.documentElement.setAttribute('data-accent', a);
      localStorage.setItem('vas_accent', a);
    });
  });

  // Profiles
  populateProfileSelect();
  const select = document.getElementById("profileSelect");
  select.addEventListener("change", (e) => setActiveProfile(e.target.value));
  document.getElementById("addProfileBtn").addEventListener("click", () => { const name = prompt("Profile name?"); if (name) addProfile(name); });
  document.getElementById("deleteProfileBtn").addEventListener("click", () => { const id = document.getElementById("profileSelect").value; if (confirm("Delete this profile?")) deleteProfile(id); });

  // Language
  const langSelect = document.getElementById("langSelect");
  if (langSelect) {
    try { langSelect.value = getActiveProfile().defaults.lang || "en-IN"; } catch {}
    langSelect.addEventListener("change", () => {
      const pList = getProfiles(); const p = pList.find(x => x.id === getActiveProfile().id);
      if (p) { p.defaults.lang = langSelect.value; saveProfiles(pList); }
      recognition = initSTT(); sayAndLog(`Language set to ${langSelect.value}.`); updateMicUI();
    });
  }

  // Command input
  const input = document.getElementById("commandInput");
  document.getElementById("sendBtn").addEventListener("click", () => {
    const txt = input.value.trim(); if (!txt) return;
    logMsg("user", txt); handleCommand(txt); input.value = "";
  });
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") document.getElementById("sendBtn").click(); });

  // Quick examples
  document.querySelectorAll(".example").forEach(btn => {
    btn.addEventListener("click", () => { const txt = btn.textContent.trim(); logMsg("user", txt); handleCommand(txt); });
  });

  // STT
  recognition = initSTT(); updateMicUI();
  const ptt = document.getElementById('pttToggle');
  if (ptt) { ptt.addEventListener('change', () => { setPushToTalk(ptt.checked); sayAndLog(ptt.checked ? 'Push-to-Talk enabled. Hold the mic button while speaking.' : 'Push-to-Talk disabled. Click to toggle listening.'); }); }
  const micBtn = document.getElementById('micBtn');
  if (micBtn) {
    micBtn.addEventListener('click', () => { if (pushToTalk) return; toggleMic(); });
    const pttStart = () => { if (!pushToTalk) return; startListeningOnce(); };
    const pttEnd = () => { if (!pushToTalk) return; stopListening(); };
    micBtn.addEventListener('mousedown', pttStart);
    micBtn.addEventListener('mouseup', pttEnd);
    micBtn.addEventListener('mouseleave', pttEnd);
    micBtn.addEventListener('touchstart', pttStart);
    micBtn.addEventListener('touchend', pttEnd);
  }

  render();
  renderSchedule();
}

document.addEventListener("DOMContentLoaded", wireUI);
