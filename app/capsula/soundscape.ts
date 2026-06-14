/**
 * Paisajes sonoros generativos para la Cápsula del Tiempo.
 *
 * Audio ambiente SINTETIZADO en el navegador con Web Audio API: sin archivos,
 * sin derechos, sin peso de descarga, y se reproduce igual en el host y en las
 * gafas del invitado (cada lado lo genera local; el host solo propaga qué
 * preset y si está activo). Volumen bajo para no tapar la voz.
 *
 * Presets pensados para los modos: olas (relajación), drone cálido (presencia,
 * reflexión), lluvia (recuerdos), viento (genérico). "none" = silencio.
 */
export type SoundPreset = "none" | "olas" | "lluvia" | "viento" | "drone";

export type Soundscape = { stop: () => void; setVolume: (v: number) => void };

// Buffer de ruido en bucle (2 s). brown = grave/aterciopelado (mar, viento),
// pink = más equilibrado, white = siseo (lluvia).
function noiseSource(ctx: AudioContext, kind: "brown" | "pink" | "white"): AudioBufferSourceNode {
  const len = ctx.sampleRate * 2;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  let last = 0;
  let b0 = 0, b1 = 0, b2 = 0;
  for (let i = 0; i < len; i++) {
    const white = Math.random() * 2 - 1;
    if (kind === "brown") {
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    } else if (kind === "pink") {
      b0 = 0.99765 * b0 + white * 0.0990460;
      b1 = 0.96300 * b1 + white * 0.2965164;
      b2 = 0.57000 * b2 + white * 1.0526913;
      data[i] = (b0 + b1 + b2 + white * 0.1848) * 0.2;
    } else {
      data[i] = white;
    }
  }
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  return src;
}

export function startSoundscape(
  ctx: AudioContext,
  preset: SoundPreset,
  volume = 0.14,
  destination?: AudioNode,
): Soundscape | null {
  if (preset === "none") return null;

  const master = ctx.createGain();
  master.gain.value = 0;
  master.connect(destination || ctx.destination); // bus audible (para grabar también)
  master.gain.linearRampToValueAtTime(volume, ctx.currentTime + 1.8); // fade-in suave

  const sources: AudioScheduledSourceNode[] = [];

  if (preset === "olas") {
    // Ruido marrón filtrado + LFO de amplitud lento = olas rompiendo.
    const src = noiseSource(ctx, "brown");
    const lpf = ctx.createBiquadFilter();
    lpf.type = "lowpass";
    lpf.frequency.value = 520;
    const swell = ctx.createGain();
    swell.gain.value = 0.5;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.09;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.4;
    lfo.connect(lfoGain);
    lfoGain.connect(swell.gain);
    src.connect(lpf);
    lpf.connect(swell);
    swell.connect(master);
    src.start();
    lfo.start();
    sources.push(src, lfo);
  } else if (preset === "lluvia") {
    // Ruido rosa agudo = lluvia constante y lejana.
    const src = noiseSource(ctx, "pink");
    const hpf = ctx.createBiquadFilter();
    hpf.type = "highpass";
    hpf.frequency.value = 900;
    const lpf = ctx.createBiquadFilter();
    lpf.type = "lowpass";
    lpf.frequency.value = 6000;
    src.connect(hpf);
    hpf.connect(lpf);
    lpf.connect(master);
    src.start();
    sources.push(src);
  } else if (preset === "viento") {
    // Ruido rosa con paso-bajo modulado lento = viento.
    const src = noiseSource(ctx, "pink");
    const lpf = ctx.createBiquadFilter();
    lpf.type = "lowpass";
    lpf.frequency.value = 420;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.05;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 220;
    lfo.connect(lfoGain);
    lfoGain.connect(lpf.frequency);
    src.connect(lpf);
    lpf.connect(master);
    src.start();
    lfo.start();
    sources.push(src, lfo);
  } else if (preset === "drone") {
    // Dos senoides en quinta (A2 + E3) con leve "respiración" = presencia cálida.
    [110, 164.81].forEach((f, idx) => {
      const o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.value = f;
      o.detune.value = idx === 0 ? -4 : 4;
      const g = ctx.createGain();
      g.gain.value = 0.2;
      o.connect(g);
      g.connect(master);
      o.start();
      sources.push(o);
    });
    const breath = ctx.createOscillator();
    breath.frequency.value = 0.1;
    const breathGain = ctx.createGain();
    breathGain.gain.value = 0.35;
    breath.connect(breathGain);
    breathGain.connect(master.gain);
    breath.start();
    sources.push(breath);
  }

  return {
    setVolume: (v: number) => {
      master.gain.setTargetAtTime(v, ctx.currentTime, 0.2);
    },
    stop: () => {
      const t = ctx.currentTime;
      try { master.gain.cancelScheduledValues(t); } catch {}
      master.gain.setValueAtTime(master.gain.value, t);
      master.gain.linearRampToValueAtTime(0, t + 0.9); // fade-out
      window.setTimeout(() => {
        sources.forEach((s) => { try { s.stop(); } catch {} });
        try { master.disconnect(); } catch {}
      }, 1000);
    },
  };
}
