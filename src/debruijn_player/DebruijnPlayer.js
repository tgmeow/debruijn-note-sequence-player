import React from "react";
import { Mutex } from "async-mutex";
import * as Tone from "tone";
import { DebruijnGenerator } from "./debruijnGenerator";
import { PlayerConfigs } from "./playerConfigs";
import { PlayNote } from "./toneHelper";

const NoteOffset = (props) => (
  <label>
    Alphabet {props.offsetIndex} Offset:{" "}
    <input
      type="number"
      placeholder="size"
      value={props.valueFromState}
      onChange={(input) =>
        props.updateOffset(
          props.offsetIndex - 1,
          parseInt(input.target.value, 10)
        )
      }
    />
  </label>
);

export default class DebruijnPlayer extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      isPlaying: false,
      isPaused: false,
      playerStateText: "",
      ...PlayerConfigs.DEFAULT,
    };

    this.ALPHABET_SIZE_MAX = 500;
    this.WORD_LENGTH_MAX = 500;
    this.NOTE_DELAY_MIN = 20;

    this.pauseMutex = new Mutex();
    this.mutexReleaser = null;

    // Player Functions
    this.startStopPlayer = this.startStopPlayer.bind(this);
    this.pauseContinuePlayer = this.pauseContinuePlayer.bind(this);
    this.unpausePlayer = this.unpausePlayer.bind(this);
    this.updateOffset = this.updateOffset.bind(this);
    this.shuffleNoteOrder = this.shuffleNoteOrder.bind(this);

    // Updater Functions
    this.updateAlphabetSize = this.updateAlphabetSize.bind(this);
    this.updateMidiOrigin = this.updateMidiOrigin.bind(this);
    this.updateNoteDelay = this.updateNoteDelay.bind(this);
    this.updateWordLength = this.updateWordLength.bind(this);
    this.canUpdateAlphabetSize = this.canUpdateAlphabetSize.bind(this);
    this.canUpdateMidiOrigin = this.canUpdateMidiOrigin.bind(this);
    this.canUpdateNoteDelay = this.canUpdateNoteDelay.bind(this);
    this.canUpdateWordLength = this.canUpdateWordLength.bind(this);

    // Url and State Functions
    this.setStateAndURL = this.setStateAndURL.bind(this);
    this.URLParamsProcessorHelper = this.URLParamsProcessorHelper.bind(this);
    this.constructorProcessURLParams = this.constructorProcessURLParams.bind(
      this
    );

    // Read state from URL at the end of construction
    this.constructorProcessURLParams();
  }

  URLParamsProcessorHelper(url, paramString, validatorFunc) {
    if (url.searchParams.has(paramString)) {
      let value = parseInt(url.searchParams.get(paramString), 10);
      if (validatorFunc(value)) {
        this.state[paramString] = value;
        return true;
      }
    }
    return false;
  }

  constructorProcessURLParams() {
    let url = new URL(window.location.href);

    this.URLParamsProcessorHelper(url, "noteDelay", this.canUpdateNoteDelay);
    this.URLParamsProcessorHelper(url, "midiOrigin", this.canUpdateMidiOrigin);
    this.URLParamsProcessorHelper(url, "wordLength", this.canUpdateWordLength);
    let updatedAlphabetSize = this.URLParamsProcessorHelper(
      url,
      "alphabetSize",
      this.canUpdateAlphabetSize
    );
    if (updatedAlphabetSize) {
      let alphabetSize = this.state.alphabetSize;
      this.state.alphabetOffset = [...Array(alphabetSize).keys()]; // Use this array by default.

      // Only try to parse the alphabetOffset Array if we successfully set the alphabetSize.
      if (url.searchParams.has("alphabetOffset")) {
        let alphabetOffset = url.searchParams
          .get("alphabetOffset")
          .split(",")
          .map((item) => parseInt(item, 10));

        // Check that every item is an integer.
        let validArr = alphabetOffset.every((item) => Number.isInteger(item));

        // Set to the parsed array if the lengths match and all values are valid integers.
        if (alphabetOffset.length === alphabetSize && validArr) {
          this.state.alphabetOffset = alphabetOffset;
        }
      }
    }
    // update URL to match whatever was successfully parsed
    setStateToPlayerConfig(this.state);
  }

  setStateAndURL(state) {
    this.setState(state);
    setStateToPlayerConfig(state);
  }

  shuffleNoteOrder() {
    if (this.state.alphabetSize === 2) {
      this.setStateAndURL({
        alphabetOffset: [...this.state.alphabetOffset].reverse(),
      });
    } else {
      this.setStateAndURL({
        alphabetOffset: shuffle([...this.state.alphabetOffset]),
      });
    }
  }

  unpausePlayer() {
    if (this.pauseMutex.isLocked()) {
      // Depend on mutex state rather than this.state just to be extra sure we unlock it.
      this.mutexReleaser();
      this.mutexReleaser = null;
    }
    this.setState({ isPaused: false, playerStateText: "Playing" });
  }

  async startStopPlayer() {
    if (this.state.isPlaying) {
      console.log("Stopping sequence...");
      this.unpausePlayer();
      this.setState({ isPlaying: false, playerStateText: "Stopped" });
    } else {
      console.log("Starting sequence...");
      this.unpausePlayer();
      this.setState({ isPlaying: true });
      await Tone.start();
      let gen = DebruijnGenerator(
        this.state.alphabetSize,
        this.state.wordLength
      );
      let result = gen.next();
      while (!result.done) {
        let noteNum =
          this.state.alphabetOffset[result.value] + this.state.midiOrigin;
        if (Number.isInteger(noteNum)) {
          // Workaround for when the array size decreases during playback.
          PlayNote(noteNum);
        }
        result = gen.next();
        if (!this.state.isPlaying) {
          break;
        }
        if (this.state.isPaused) {
          (await this.pauseMutex.acquire())(); // Release the acquired mutex immediately once acquired.
          console.log("Pause was resolved!");
          if (!this.state.isPlaying) {
            // check for stop state after continue
            break;
          }
        }
        if (!result.done) {
          await sleep(this.state.noteDelay);
        }
      }
      console.log("Done playing sequence!");
      this.unpausePlayer();
      this.setState({ isPlaying: false, playerStateText: "Stopped" });
    }
  }

  async pauseContinuePlayer() {
    if (!this.state.isPlaying) {
      return;
    }

    if (this.state.isPaused) {
      console.log("Continuing sequence...");
      this.unpausePlayer();
    } else {
      console.log("Pausing sequence...");
      this.mutexReleaser = await this.pauseMutex.acquire();
      this.setState({
        isPaused: true,
        playerStateText: "Paused",
      });
      console.log("Sequence paused!");
    }
  }

  updateOffset(index, offset) {
    if (!Number.isInteger(offset)) {
      return;
    }
    let alphabetOffset = [...this.state.alphabetOffset];
    alphabetOffset[index] = offset;
    this.setStateAndURL({ alphabetOffset });
  }

  canUpdateAlphabetSize(alphabetSize) {
    return (
      isValidNonNegInt(alphabetSize) && alphabetSize <= this.ALPHABET_SIZE_MAX
    );
  }

  updateAlphabetSize(alphabetSize) {
    if (this.canUpdateAlphabetSize(alphabetSize)) {
      let oldSize = this.state.alphabetOffset.length;
      let alphabetOffset = [...Array(alphabetSize).keys()].map(
        (item, index) => {
          if (index < oldSize) {
            return this.state.alphabetOffset[index];
          }
          return index;
        }
      );
      this.setStateAndURL({ alphabetSize, alphabetOffset });
    }
  }

  canUpdateWordLength(wordLength) {
    return isValidNonNegInt(wordLength) && wordLength <= this.WORD_LENGTH_MAX;
  }

  updateWordLength(wordLength) {
    if (this.canUpdateWordLength(wordLength)) {
      this.setStateAndURL({ wordLength });
    }
  }

  canUpdateNoteDelay(noteDelay) {
    return isValidNonNegInt(noteDelay) && noteDelay >= this.NOTE_DELAY_MIN;
  }

  updateNoteDelay(noteDelay) {
    if (this.canUpdateNoteDelay(noteDelay)) {
      this.setStateAndURL({ noteDelay });
    }
  }

  canUpdateMidiOrigin(midiOrigin) {
    return isValidNonNegInt(midiOrigin);
  }

  updateMidiOrigin(midiOrigin) {
    if (this.canUpdateMidiOrigin(midiOrigin)) {
      this.setStateAndURL({ midiOrigin });
    }
  }

  render() {
    let NoteOffsetList = [];
    for (let i = 1; i <= this.state.alphabetSize; ++i) {
      let currOffsetVal = this.state.alphabetOffset[i - 1];
      NoteOffsetList.push(
        <div key={i}>
          <NoteOffset
            offsetIndex={i}
            valueFromState={currOffsetVal}
            updateOffset={this.updateOffset}
          />{" "}
          {Tone.Frequency(
            this.state.midiOrigin + currOffsetVal,
            "midi"
          ).toNote()}
          <br />
        </div>
      );
    }
    return (
      <div>
        <h1>De Bruijn Sequence Player</h1>
        <div>
          Try one of these preconfigured settings!
          <br />
          <button onClick={() => this.setStateAndURL(PlayerConfigs.DEFAULT)}>
            Reset
          </button>
          <button onClick={this.shuffleNoteOrder}>Shuffle Notes</button>
          <br />
          <button onClick={() => this.setStateAndURL(PlayerConfigs.MAJOR_C4)}>
            Major Scale
          </button>
          <button onClick={() => this.setStateAndURL(PlayerConfigs.MINOR_C4)}>
            Minor Scale
          </button>
          <button
            onClick={() => this.setStateAndURL(PlayerConfigs.MAJOR_D3_O2)}
          >
            Major Scale Oct 2 Word 3
          </button>
          <br />
          <button onClick={() => this.setStateAndURL(PlayerConfigs.FAVORITE_1)}>
            Almost a Song 1
          </button>
          <button onClick={() => this.setStateAndURL(PlayerConfigs.FAVORITE_2)}>
            Fast Scales
          </button>
        </div>
        <br />
        <label>Note Delay: </label>
        <input
          type={"number"}
          min={this.NOTE_DELAY_MIN}
          placeholder={"time in ms (default 300)"}
          value={this.state.noteDelay}
          onChange={(event) =>
            this.updateNoteDelay(parseInt(event.target.value, 10))
          }
        />
        (ms)
        <br />
        <label>Alphabet Size: </label>
        <input
          type={"number"}
          min={"0"}
          max={this.ALPHABET_SIZE_MAX}
          placeholder={"size (default 3)"}
          value={this.state.alphabetSize}
          onChange={(event) =>
            this.updateAlphabetSize(parseInt(event.target.value, 10))
          }
        />
        <br />
        <label>Word Length: </label>
        <input
          type={"number"}
          min={"0"}
          max={this.WORD_LENGTH_MAX}
          placeholder={"length (default 3)"}
          value={this.state.wordLength}
          onChange={(event) =>
            this.updateWordLength(parseInt(event.target.value, 10))
          }
        />
        <br />
        <label>Midi Origin: </label>
        <input
          type={"number"}
          placeholder={"origin (default 60)"}
          value={this.state.midiOrigin}
          onChange={(event) =>
            this.updateMidiOrigin(parseInt(event.target.value, 10))
          }
        />{" "}
        {Tone.Frequency(this.state.midiOrigin, "midi").toNote()}
        <br />
        {NoteOffsetList}
        <button onClick={this.startStopPlayer}>Start/Stop</button>
        <button onClick={this.pauseContinuePlayer}>Pause/Continue</button>
        <span> {this.state.playerStateText}</span>
        <br />
      </div>
    );
  }
}

/**
 * Source: https://stackoverflow.com/questions/6274339/how-can-i-shuffle-an-array
 * Shuffles array in place. ES6 version
 * @param {Array} a items An array containing the items.
 */
let shuffle = (a) => {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

let isValidNonNegInt = (number) => {
  return Number.isInteger(number) && number >= 0;
};

let sleep = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

// To be called alongside setState when necessary so that the state will also be saved in URL parameters.
let setURLState = (key, value) => {
  if (key === undefined || value === undefined) {
    return;
  }
  let url = new URL(window.location.href);
  url.searchParams.set(key, value);
  window.history.replaceState({}, "", url.toString());
};

// Given an object with parameters
// noteDelay, midiOrigin, alphabetSize, wordLength, alphabetOffset
let setStateToPlayerConfig = (config) => {
  setURLState("noteDelay", config?.noteDelay);
  setURLState("midiOrigin", config?.midiOrigin);
  setURLState("alphabetSize", config?.alphabetSize);
  setURLState("wordLength", config?.wordLength);
  setURLState("alphabetOffset", config?.alphabetOffset);
};
