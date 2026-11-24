let audio: AudioContext | null = null;

/** A short two-note chime and a buzz, so a new chat message is noticed even when the screen is not on the chat. */
export function chatAlert(): void {
  try {
    navigator.vibrate?.([90, 60, 90]);
  } catch {
    /* not supported */
  }
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    audio = audio ?? new Ctor();
    if (audio.state === 'suspended') void audio.resume();
    const t0 = audio.currentTime;
    [880, 1175].forEach((freq, i) => {
      const osc = audio!.createOscillator();
      const gain = audio!.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t0 + i * 0.14);
      gain.gain.exponentialRampToValueAtTime(0.12, t0 + i * 0.14 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + i * 0.14 + 0.13);
      osc.connect(gain).connect(audio!.destination);
      osc.start(t0 + i * 0.14);
      osc.stop(t0 + i * 0.14 + 0.14);
    });
  } catch {
    /* sound is a bonus, never an error */
  }
}