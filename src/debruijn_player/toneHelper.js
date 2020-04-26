import * as Tone from "tone";

export class ToneNotePlayer {
  constructor(numParallel) {
    if (!Number.isSafeInteger(numParallel) || numParallel < 0) {
      throw new Error(
        `Can't make a ToneNotePlayer with numParallel of: ${numParallel}`
      );
    }
    this.instruments = new Array(numParallel).fill().map(() => {
      return new Tone.Synth().toMaster();
    });
    this.playingIndex = 0;
  }
  increment(index) {
    return (index + 1) % this.instruments.length;
  }

  playNote(midiNum) {
    this.instruments[this.playingIndex].triggerAttackRelease(
      Tone.Frequency(midiNum, "midi"),
      "8n"
    );
    this.playingIndex = this.increment(this.playingIndex);
  }
}
