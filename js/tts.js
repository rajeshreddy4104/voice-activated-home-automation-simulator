// tts.js — robust STT with Push-to-Talk

let recognition = null;
let recognizing = false;
let shouldKeepListening = false;
let pushToTalk = false;

function setPushToTalk(enabled) { pushToTalk = !!enabled; updateMicUI(); }

function startListeningOnce() { ensureMicMeter(); if (!recognition) return; try { recognition.start(); recognizing = true; } catch {} updateMicUI(); }
function stopListening() { if (!recognition) return; try { recognition.stop(); } catch {} recognizing = false; updateMicUI(); }


// --- Mic level meter (best effort via getUserMedia) ---
let _audioCtx = null, _analyser = null, _micSrc = null, _meterRAF = 0;
async function ensureMicMeter() {
  try {
    if (_audioCtx) return;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    _analyser = _audioCtx.createAnalyser();
    _analyser.fftSize = 512;
    _micSrc = _audioCtx.createMediaStreamSource(stream);
    _micSrc.connect(_analyser);
    runMeter();
  } catch (e) {
    // ignore
  }
}
function runMeter() {
  const bar = document.querySelector('#micMeter .bar');
  if (!bar || !_analyser) return;
  const data = new Uint8Array(_analyser.frequencyBinCount);
  const loop = () => {
    _analyser.getByteTimeDomainData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      const v = (data[i] - 128) / 128;
      sum += v*v;
    }
    const rms = Math.sqrt(sum / data.length);
    const pct = Math.min(100, Math.max(6, Math.round(rms * 180)));
    bar.style.width = pct + '%';
    _meterRAF = requestAnimationFrame(loop);
  };
  _meterRAF = requestAnimationFrame(loop);
}

function initSTT() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return null;
  const r = new SR();
  r.lang = getActiveProfile().defaults.lang || "en-IN";
  r.interimResults = true;
  r.continuous = true;
  r.maxAlternatives = 3;

  r.onresult = (e) => {
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const res = e.results[i];
      if (res.isFinal) {
        const transcript = res[0].transcript.trim();
        if (transcript) {
          logMsg("user", transcript);
          handleCommand(transcript);
        }
      }
    }
  };
  r.onerror = (e) => { logMsg("system", `Speech error: ${e.error}`); };
  r.onend = () => {
    recognizing = false; updateMicUI();
    if (shouldKeepListening && !pushToTalk) { try { r.start(); recognizing = true; updateMicUI(); } catch {} }
  };
  return r;
}

function speak(text) {
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = getActiveProfile().defaults.lang || "en-IN";
  window.speechSynthesis.speak(utter);
}
function sayAndLog(text) { logMsg("assistant", text); speak(text); }

function updateMicUI() {
  const pill = document.getElementById("micStatus");
  const btn = document.getElementById("micBtn");
  if (!recognition) { pill.textContent = "stt unavailable"; btn.textContent = "🎤 N/A"; btn.disabled = true; return; }
  if (pushToTalk) { pill.textContent = recognizing ? "listening (hold)..." : "push-to-talk"; btn.textContent = "🎤 Hold to speak"; }
  else { pill.textContent = recognizing ? "listening…" : (shouldKeepListening ? "restarting…" : "idle"); btn.textContent = recognizing || shouldKeepListening ? "🛑 Stop" : "🎤 Start"; }
}
function toggleMic() { ensureMicMeter();
  if (!recognition) return;
  if (!shouldKeepListening) { shouldKeepListening = true; try { recognition.start(); recognizing = true; } catch {} }
  else { shouldKeepListening = false; try { recognition.stop(); } catch {} recognizing = false; }
  updateMicUI();
}
