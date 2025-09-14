// nlp.js — expanded rule-based NLP

function normalize(text) {
  return text.toLowerCase()
    .replace(/[.,!?]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseTime(text) {
  const m = text.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (!m) return null;
  let hours = parseInt(m[1], 10);
  const minutes = m[2] ? parseInt(m[2], 10) : 0;
  const ampm = m[3] ? m[3].toLowerCase() : null;
  if (ampm === "pm" && hours < 12) hours += 12;
  if (ampm === "am" && hours === 12) hours = 0;
  if (hours >= 24 || minutes >= 60) return null;
  const now = new Date();
  const t = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0, 0);
  if (t <= now) t.setDate(t.getDate() + 1);
  return t;
}

function extractPercentage(text) {
  const m = text.match(/(\d{1,3})\s*%|(?:to|at)\s*(\d{1,3})\s*percent?/);
  if (!m) return null;
  const val = parseInt(m[1] || m[2], 10);
  if (Number.isNaN(val)) return null;
  return Math.max(0, Math.min(100, val));
}

function extractTemperature(text) {
  const sym = text.match(/(\d{2,3})\s*(°|deg|degrees?)/i);
  if (sym) return parseInt(sym[1], 10);
  const bare = text.match(/set (?:the )?thermostat (?:to )?(\d{2,3})\b/);
  if (bare) return parseInt(bare[1], 10);
  return null;
}

function guessRoom(text) {
  if (/living( room)?/.test(text)) return "living";
  if (/bed(room)?/.test(text)) return "bedroom";
  if (/kitchen/.test(text)) return "kitchen";
  return getActiveProfile().defaults.room || "living";
}

function parseIntent(raw) {
  const text = normalize(raw);

  // Wake / scheduling
  if (/^wake me up at/.test(text)) {
    const timeMatch = text.match(/^wake me up at (.+?)(?: and |$)/);
    const timeStr = timeMatch ? timeMatch[1] : null;
    const time = timeStr ? parseTime(timeStr) : null;

    // optional follow-up lights action
    let action = null;
    const m2 = text.match(/turn (?:on )?(?:the )?(.*?)(?: lights?)? (?:to|at) (\d{1,3})%/);
    if (m2) {
      const room = guessRoom(m2[1]);
      const percent = Math.max(0, Math.min(100, parseInt(m2[2],10)));
      action = { type: "setLights", room, value: percent };
    } else {
      action = { type: "say", text: "Good morning! Time to rise and shine." };
    }
    return { intent: "scheduleWake", time, action };
  }

  if (/^at \d/.test(text)) {
    const timeStr = text.match(/^at (.+?),(?: )?(.*)$/i);
    if (timeStr) {
      const time = parseTime(timeStr[1]);
      return { intent: "scheduleGeneric", time, command: timeStr[2] };
    }
  }

  // TV first (synonyms)
  if (/(turn|power|switch)\s+(on|off)\s+(?:the )?(tv|television|teevee)/.test(text)) {
    const on = /(turn|power|switch)\s+on/.test(text);
    return { intent: "tvPower", on };
  }
  if (/(set|change)\s+(?:the )?t(v|elevision)\s+(?:volume|sound).*(\d{1,3})/.test(text) || /tv .*volume.*(\d{1,3})/.test(text)) {
    const m = text.match(/(\d{1,3})/);
    const vol = m ? parseInt(m[1],10) : 20;
    return { intent: "tvVolume", volume: vol };
  }

  // Locks (accept "bedroom door")
  if (/(lock|unlock)\s+(?:the )?(?:bedroom )?door/.test(text)) {
    const locked = /lock/.test(text) && !/unlock/.test(text);
    return { intent: "lockDoor", locked };
  }

  // Washer (start/stop/status, synonyms)
  if (/(start|turn on|switch on)\s+(?:the )?(washing machine|washer|washing)/.test(text)) {
    return { intent: "washerStart" };
  }
  if (/(stop|turn off|switch off|cancel)\s+(?:the )?(washing machine|washer|washing)/.test(text)) {
    return { intent: "washerStop" };
  }
  if (/(is|status|finished|done).*(washing machine|washer)/.test(text) || /is the washer (finished|done)/.test(text)) {
    return { intent: "washerStatus" };
  }

  // Thermostat (accept °/deg/degrees or bare numbers)
  const t = extractTemperature(text);
  if (/thermostat/.test(text) && t !== null) {
    return { intent: "setThermostat", temp: t };
  }

  // Temperature query
  if (/what('?| i)s the current temperature|temperature now|what('?| i)s it (in|inside)/.test(text)) {
    return { intent: "queryTemp" };
  }

  // Lights power
  let m = text.match(/(turn|switch)\s+(on|off)\s+(?:the )?(.*?)(?: (?:light|lights))?(?: in (?:the )?(living( room)?|bed(room)?|kitchen))?$/);
  if (m) {
    const on = m[2] === "on";
    const roomFromTail = m[5] ? guessRoom(m[5]) : null;
    const room = roomFromTail || guessRoom(m[3] || "");
    return { intent: "lightsPower", room, on };
  }

  // Lights level (accept % optional; support increase/decrease; singular/plural "light(s)")
  m = text.match(/(?:dim|brighten|set|increase|decrease)\s+(?:the )?(.*?)(?: light| lights)?(?: in (?:the )?(living( room)?|bed(room)?|kitchen))?.*?(?:to|at)\s*(\d{1,3})(?:\s*%|\s*percent)?/);
  if (m) {
    const room = m[3] ? guessRoom(m[3]) : guessRoom(m[1]);
    const raw = m[4];
    const num = parseInt(raw, 10);
    if (!Number.isNaN(num)) {
      const percent = Math.max(0, Math.min(100, num));
      return { intent: "lightsLevel", room, percent };
    }
  }

  // Coffee maker
  if (/start (?:the )?coffee( maker)?/.test(text)) return { intent: "coffee" };

  // Fallback
  return { intent: "unknown", raw };
}
