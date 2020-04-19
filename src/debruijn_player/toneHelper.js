import * as Tone from "tone";

export const PlayNote = midiNum => {
    const synth = new Tone.Synth().toMaster();
    synth.triggerAttackRelease(Tone.Frequency(midiNum, "midi"), "8n");
}

