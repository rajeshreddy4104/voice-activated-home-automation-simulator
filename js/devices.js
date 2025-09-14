// devices.js — device simulation and API

const defaultHome = () => ({
  rooms: {
    living: {
      lights: { power: false, brightness: 80 },
      tv: { power: false, volume: 12 },
    },
    bedroom: {
      lights: { power: false, brightness: 30 },
      smartLock: { locked: true },
    },
    kitchen: {
      lights: { power: false, brightness: 60 },
      coffeeMaker: { power: false, status: "idle" },
      washer: { power: false, status: "idle", finished: false }
    },
  },
  climate: {
    thermostat: { temperature: 72, mode: "auto" },
    sensor: { current: 72 }
  }
});

function simulateTemperatureDrift(state) {
  const target = state.climate.thermostat.temperature;
  const current = state.climate.sensor.current;
  const delta = Math.max(-0.2, Math.min(0.2, (target - current) * 0.05));
  state.climate.sensor.current = +(current + delta + (Math.random() - 0.5) * 0.1).toFixed(1);
}

const DeviceAPI = {
  setLight(room, on) {
    if (!state.rooms[room] || !state.rooms[room].lights) return false;
    state.rooms[room].lights.power = on;
    return true;
  },
  setBrightness(room, percent) {
    if (!state.rooms[room] || !state.rooms[room].lights) return false;
    state.rooms[room].lights.brightness = Math.max(0, Math.min(100, percent));
    state.rooms[room].lights.power = percent > 0;
    return true;
  },
  setThermostat(deg) {
    state.climate.thermostat.temperature = Math.floor(deg);
    return true;
  },
  startCoffee() {
    const cm = state.rooms.kitchen.coffeeMaker;
    if (cm.status === "brewing") return true;
    cm.power = true; cm.status = "brewing";
    setTimeout(() => { cm.status = "ready"; cm.power = false; render(); }, 4000);
    return true;
  },
  startWasher() {
    const w = state.rooms.kitchen.washer;
    if (w.power && !w.finished) return true;
    w.power = true; w.status = "washing"; w.finished = false;
    setTimeout(() => { w.status = "spinning"; render(); }, 4000);
    setTimeout(() => { w.status = "done"; w.finished = true; w.power = false; render(); }, 8000);
    return true;
  },
  stopWasher() {
    const w = state.rooms.kitchen.washer;
    w.power = false; w.status = "idle"; w.finished = false;
    return true;
  },
  lockDoor(room="bedroom", locked=true) {
    if (!state.rooms[room] || !state.rooms[room].smartLock) return false;
    state.rooms[room].smartLock.locked = locked; return true;
  },
  setTV(room="living", on) {
    if (!state.rooms[room] || !state.rooms[room].tv) return false;
    state.rooms[room].tv.power = on; return true;
  },
  setTVVolume(room="living", volume) {
    if (!state.rooms[room] || !state.rooms[room].tv) return false;
    state.rooms[room].tv.volume = Math.max(0, Math.min(100, volume)); return true;
  }
};

let state = defaultHome();
