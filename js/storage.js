// storage.js — profiles & persistence

const PROFILE_KEY = "vas_profiles_v1";
let activeProfileId = null;

function defaultProfile(name="Guest") {
  return {
    id: "p_" + Math.random().toString(36).slice(2,10),
    name,
    defaults: { room: "bedroom", lang: "en-IN", temp: 72 },
    state: defaultHome()
  };
}

function loadProfiles() {
  try {
    const arr = JSON.parse(localStorage.getItem(PROFILE_KEY) || "[]");
    if (arr.length) return arr;
  } catch {}
  const fallback = [ defaultProfile("Alex"), defaultProfile("Sam") ];
  localStorage.setItem(PROFILE_KEY, JSON.stringify(fallback));
  return fallback;
}

function saveProfiles(arr) { localStorage.setItem(PROFILE_KEY, JSON.stringify(arr)); }
function getProfiles() { return loadProfiles(); }

function getActiveProfile() {
  const arr = getProfiles();
  const id = activeProfileId || arr[0].id;
  const p = arr.find(x => x.id === id) || arr[0];
  return p;
}

function setActiveProfile(id) {
  activeProfileId = id;
  const p = getActiveProfile();
  state = p.state;
  render();
}

function addProfile(name) {
  const arr = getProfiles();
  const p = defaultProfile(name || `User ${arr.length+1}`);
  arr.push(p);
  saveProfiles(arr);
  populateProfileSelect();
  setActiveProfile(p.id);
}

function deleteProfile(id) {
  let arr = getProfiles();
  if (arr.length <= 1) return;
  arr = arr.filter(p => p.id !== id);
  saveProfiles(arr);
  populateProfileSelect();
  setActiveProfile(arr[0].id);
}

function populateProfileSelect() {
  const select = document.getElementById("profileSelect");
  const arr = getProfiles();
  select.innerHTML = "";
  for (const p of arr) {
    const opt = document.createElement("option");
    opt.value = p.id; opt.textContent = p.name;
    if ((activeProfileId && activeProfileId === p.id) || (!activeProfileId && arr[0].id === p.id)) opt.selected = true;
    select.appendChild(opt);
  }
}
