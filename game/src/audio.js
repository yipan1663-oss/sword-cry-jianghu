// WebAudio synthesised sounds. Start only after a user gesture.
export function createAudio() {
  let ctx = null;
  let muted = false;
  let unlocked = false;

  function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    return ctx;
  }

  function unlock() {
    const c = ensure();
    if (!c) return;
    if (c.state === 'suspended') c.resume();
    unlocked = true;
  }

  function now() { return ctx ? ctx.currentTime : 0; }

  function gainEnv(start, dur, peak = 0.2) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(peak, start + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    return g;
  }

  function noiseBurst(dur, freq, peak, type = 'bandpass') {
    if (!ctx || muted || !unlocked) return;
    const t = now();
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = 0.8;
    const g = gainEnv(t, dur, peak);
    src.connect(f).connect(g).connect(ctx.destination);
    src.start(t);
    src.stop(t + dur + 0.05);
  }

  function tone(freq, dur, peak = 0.12, type = 'triangle', slideTo = null) {
    if (!ctx || muted || !unlocked) return;
    const t = now();
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    const g = gainEnv(t, dur, peak);
    o.connect(g).connect(ctx.destination);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  const pentatonic = [196, 220, 262, 294, 330, 392, 440];

  return {
    unlock,
    toggleMute() { muted = !muted; return muted; },
    isMuted() { return muted; },
    swoosh() { noiseBurst(0.16, 1800, 0.18, 'highpass'); tone(900, 0.08, 0.03, 'sawtooth', 500); },
    hit() { noiseBurst(0.12, 220, 0.22, 'lowpass'); tone(120, 0.1, 0.08, 'triangle', 70); },
    hurt() { noiseBurst(0.18, 180, 0.2, 'lowpass'); tone(160, 0.18, 0.07, 'sawtooth', 90); },
    pluck(i = 0) {
      const f = pentatonic[i % pentatonic.length];
      tone(f, 0.5, 0.09, 'triangle');
      tone(f * 2, 0.25, 0.03, 'sine');
    },
    menu() { [0,2,4].forEach((n, i) => setTimeout(() => this.pluck(n), i * 90)); },
    waveClear() { [2,4,5,6].forEach((n, i) => setTimeout(() => this.pluck(n), i * 100)); },
    bossDrum() { if (!ctx || muted || !unlocked) return; tone(70, 0.5, 0.18, 'sine', 45); noiseBurst(0.25, 120, 0.12, 'lowpass'); },
    win() { [4,5,6,5,6].forEach((n,i)=>setTimeout(()=>this.pluck(n), i*120)); },
    lose() { [3,2,1,0].forEach((n,i)=>setTimeout(()=>this.pluck(n), i*160)); },
  };
}
