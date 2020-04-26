import React from "react";
import { Mutex } from "async-mutex";
import * as Tone from "tone";
import { BufferedDebruijnGenerator } from "./debruijn_generator";
import { PlayerConfigs } from "./playerConfigs";
import { ToneNotePlayer } from "./toneHelper";
import { sleep, shuffle, isValidNonNegInt } from "./js_utils";
import RingBuffer from "./ring_buffer";

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
      sequenceDisplay: {
        past: [],
        present: [],
        future: [],
      },
      isPlaying: false,
      isPaused: false,
      playerStateText: "Stopped",
      ...PlayerConfigs.DEFAULT,
    };

    this.BUFFER_PEEK_SIZE = 12;
    this.sequencePast = new RingBuffer(this.BUFFER_PEEK_SIZE, true);
    this.sequencePresent = new RingBuffer(1, true);

    this.ALPHABET_SIZE_MAX = 500;
    this.WORD_LENGTH_MAX = 500;
    this.NOTE_DELAY_MIN = 20;
    this.BUFFER_DELAY = 10; // Buffer delay should always be < note delay, otherwise buffer is starved.
    this.BUFFER_SIZE = 100;

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
        // eslint-disable-next-line
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
      // eslint-disable-next-line
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
          // eslint-disable-next-line
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
      this.sequencePast.clearBuffer();
      this.sequencePresent.clearBuffer();
      this.unpausePlayer();
      this.setState({ isPlaying: true });
      await Tone.start();
      let notePlayer = new ToneNotePlayer(15);
      let bufferedDebruijnGenerator = new BufferedDebruijnGenerator(
        this.state.alphabetSize,
        this.state.wordLength,
        this.BUFFER_SIZE,
        this.BUFFER_DELAY
      );
      let generator = bufferedDebruijnGenerator.getGenerator();
      let result = await generator.next();
      while (!result.done) {
        console.log("VAL!");
        let rawNoteNum = result.value;
        let noteNum =
          this.state.alphabetOffset[rawNoteNum] + this.state.midiOrigin;
        if (!this.sequencePresent.isEmpty()) {
          this.sequencePast.push(this.sequencePresent.peek(1)[0]);
        }
        this.sequencePresent.push(rawNoteNum);

        this.setState({
          sequenceDisplay: {
            past: this.sequencePast.peek(this.BUFFER_PEEK_SIZE),
            present: this.sequencePresent.peek(1),
            future: bufferedDebruijnGenerator.peek(this.BUFFER_PEEK_SIZE),
          },
        });

        // Workaround for when the array size decreases during playback.
        if (Number.isInteger(noteNum) && this.state.isPlaying) {
          notePlayer.playNote(noteNum);
        }
        result = await generator.next();
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
          {new Tone.Frequency(
            this.state.midiOrigin + currOffsetVal,
            "midi"
          ).toNote()}
          <br />
        </div>
      );
    }
    return (
      <div className={"App-main"}>
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
        <div>
          <label>
            Note Delay:{" "}
            <input
              type={"number"}
              min={this.NOTE_DELAY_MIN}
              placeholder={"time in ms (default 300)"}
              value={this.state.noteDelay}
              onChange={(event) =>
                this.updateNoteDelay(parseInt(event.target.value, 10))
              }
            />
          </label>
          (ms)
        </div>
        <div>
          <label>
            Alphabet Size:{" "}
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
          </label>
        </div>
        <div>
          <label>
            Word Length:{" "}
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
          </label>
        </div>
        <div>
          <label>
            Midi Origin:{" "}
            <input
              type={"number"}
              placeholder={"origin (default 60)"}
              value={this.state.midiOrigin}
              onChange={(event) =>
                this.updateMidiOrigin(parseInt(event.target.value, 10))
              }
            />
          </label>{" "}
          {new Tone.Frequency(this.state.midiOrigin, "midi").toNote()}
        </div>
        {NoteOffsetList}
        <br />
        <span>Player Status: {this.state.playerStateText}</span>
        <div>
          <button onClick={this.startStopPlayer}>Start/Stop</button>
          <button onClick={this.pauseContinuePlayer}>Pause/Continue</button>
        </div>
        Scrolling sequence snapshot:{" "}
        <div className={"sequenceDisplay"}>
          <span>{this.state.sequenceDisplay.past.join(" ")} </span>
          <span className={"sequenceDisplayPresent"}>
            {this.state.sequenceDisplay.present.join(" ")}
          </span>
          <span> {this.state.sequenceDisplay.future.join(" ")}</span>
        </div>
      </div>
    );
  }
}

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
