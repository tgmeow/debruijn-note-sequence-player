// Use this for common shared configs and things for the future so that you don't need to add to every config.
// Add to each config even if you are overwriting them all.
const SharedConfigs = {
  BASE_DEFAULTS: { noteDelay: 200, midiOrigin: 60 },
  ALPHABET_SCALE_1OCTV: { alphabetSize: 8, wordLength: 4 },
};

const Configs = {
  DEFAULT: {
    ...SharedConfigs.BASE_DEFAULTS,
    alphabetSize: 3,
    wordLength: 3,
    alphabetOffset: [0, 2, 4],
  },
  MAJOR_C4: {
    ...SharedConfigs.BASE_DEFAULTS,
    ...SharedConfigs.ALPHABET_SCALE_1OCTV,
    alphabetOffset: [0, 2, 3, 5, 7, 8, 10, 12],
  },
  MINOR_C4: {
    ...SharedConfigs.BASE_DEFAULTS,
    ...SharedConfigs.ALPHABET_SCALE_1OCTV,
    alphabetOffset: [0, 2, 4, 5, 7, 9, 11, 12],
  },
  MAJOR_D3_O2: {
    ...SharedConfigs.BASE_DEFAULTS,
    midiOrigin: 50,
    alphabetSize: 15,
    wordLength: 3,
    alphabetOffset: [0, 2, 4, 5, 7, 9, 11, 12, 14, 16, 17, 19, 21, 23, 24],
  },
  FAVORITE_1: {
    ...SharedConfigs.BASE_DEFAULTS,
    noteDelay: 160,
    midiOrigin: 40,
    alphabetSize: 15,
    wordLength: 3,
    alphabetOffset: [11, 5, 12, 17, 19, 4, 18, 16, 19, 21, 0, 7, 2, 9, 14],
  },
};

export const PlayerConfigs = {
  ...Configs,
  FAVORITE_2: {
    ...Configs.MAJOR_D3_O2,
    noteDelay: 20,
  },
};
