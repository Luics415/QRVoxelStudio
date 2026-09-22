/**
 * Sintetizador de música ambiental relajante con Web Audio API:
 * Genera una atmósfera armónica (acordes cálidos estilo lo-fi / chimes de estación)
 * y entrega un MediaStreamTrack de audio puro listo para mezclarse con la grabación de video.
 */

export interface AmbientAudioSession {
  track: MediaStreamTrack;
  stop: () => void;
}

export function createAmbientAudioSession(durationMs = 13000): AmbientAudioSession | null {
  if (typeof window === "undefined") return null;
  const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return null;

  try {
    const ctx = new AudioContextClass();
    const destination = ctx.createMediaStreamDestination();

    // Filtro maestro cálido (estilo lo-fi / cinta analógica)
    const masterFilter = ctx.createBiquadFilter();
    masterFilter.type = "lowpass";
    masterFilter.frequency.setValueAtTime(900, ctx.currentTime);

    // Ganancia maestra
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.35, ctx.currentTime);

    masterFilter.connect(masterGain);
    masterGain.connect(destination);

    // Progresión armónica apacible inspirada en las 4 estaciones (Cmaj9 -> Am9 -> Fmaj7 -> Gsus4)
    const chords = [
      [261.63, 329.63, 392.0, 493.88, 587.33], // Primavera: Cmaj9
      [220.0, 261.63, 329.63, 392.0, 493.88],  // Verano: Am9
      [174.61, 220.0, 261.63, 329.63, 440.0],  // Otoño: Fmaj7#11
      [196.0, 261.63, 293.66, 392.0, 523.25],  // Invierno: Gsus4 -> C
    ];

    const chordDuration = Math.max(2.5, (durationMs / 1000) / chords.length);
    const activeOscillators: OscillatorNode[] = [];

    chords.forEach((chord, chordIdx) => {
      const startTime = ctx.currentTime + chordIdx * chordDuration;

      chord.forEach((freq, noteIdx) => {
        const osc = ctx.createOscillator();
        const noteGain = ctx.createGain();

        // Oscilador suave (onda senoidal o triangular suave)
        osc.type = noteIdx === 0 ? "triangle" : "sine";
        osc.frequency.setValueAtTime(freq, startTime);

        // Ligero detune estéreo natural
        osc.detune.setValueAtTime((noteIdx - 2) * 4, startTime);

        // Envolvente ADSR suave
        const noteStart = startTime + noteIdx * 0.04;
        noteGain.gain.setValueAtTime(0.0001, noteStart);
        noteGain.gain.exponentialRampToValueAtTime(0.12 / Math.sqrt(chord.length), noteStart + 1.2);
        noteGain.gain.exponentialRampToValueAtTime(0.08 / Math.sqrt(chord.length), noteStart + chordDuration * 0.7);
        noteGain.gain.exponentialRampToValueAtTime(0.0001, noteStart + chordDuration + 1.2);

        osc.connect(noteGain);
        noteGain.connect(masterFilter);

        osc.start(noteStart);
        osc.stop(noteStart + chordDuration + 1.5);
        activeOscillators.push(osc);
      });

      // Campanita / chime armónico sutil cada cambio de estación
      const chimeOsc = ctx.createOscillator();
      const chimeGain = ctx.createGain();
      const chimeFreq = chord[chord.length - 1] * 1.5;

      chimeOsc.type = "sine";
      chimeOsc.frequency.setValueAtTime(chimeFreq, startTime + 0.15);

      chimeGain.gain.setValueAtTime(0.0001, startTime + 0.15);
      chimeGain.gain.exponentialRampToValueAtTime(0.04, startTime + 0.25);
      chimeGain.gain.exponentialRampToValueAtTime(0.00001, startTime + 2.2);

      chimeOsc.connect(chimeGain);
      chimeGain.connect(masterGain);

      chimeOsc.start(startTime + 0.15);
      chimeOsc.stop(startTime + 2.5);
      activeOscillators.push(chimeOsc);
    });

    const stop = () => {
      try {
        activeOscillators.forEach((osc) => {
          try { osc.stop(); } catch { /* ya detenido */ }
        });
        destination.stream.getTracks().forEach((track) => track.stop());
        if (ctx.state !== "closed") {
          void ctx.close();
        }
      } catch {
        // Ignorar errores al cerrar
      }
    };

    return {
      track: destination.stream.getAudioTracks()[0],
      stop,
    };
  } catch (e) {
    console.warn("No se pudo iniciar el sintetizador de audio ambiental:", e);
    return null;
  }
}
