import React from 'react';
import {PlayNote} from "./toneHelper";
import {DebruijnGenerator} from "./debruijnGenerator";
import * as Tone from "tone";
import {PlayerConfigs} from "./playerConfigs";

const NoteOffset = (props) =>
    <label>Alphabet {props.offsetIndex} Offset:
        <input type="number" placeholder="size" value={props.valueFromState}
               onChange={input => props.updateOffset(props.offsetIndex - 1, parseInt(input.target.value))}/>
    </label>;

export default class DebruijnPlayer extends React.Component {
    constructor(props) {
        super(props);

        this.state = PlayerConfigs.DEFAULT;

        this.startPlayer = this.startPlayer.bind(this);
        this.updateOffset = this.updateOffset.bind(this);
        this.updateAlphabetSize = this.updateAlphabetSize.bind(this);
        this.setToConfig = this.setToConfig.bind(this);
    }

    setToConfig(config_id) {
        switch (config_id) {
            case "reset":
                this.setState(PlayerConfigs.DEFAULT);
                break;
            case "minor scale":
                this.setState(PlayerConfigs.MAJOR_C4);
                break;
            case "major scale":
            default:
                this.setState(PlayerConfigs.MINOR_C4);
                break;
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async startPlayer() {
        console.log("Starting sequence...");
        await Tone.start();
        let gen = DebruijnGenerator(this.state.alphabetSize, this.state.wordLength);
        let result = gen.next();
        while (!result.done) {
            let noteNum = this.state.alphabetOffset[result.value] + this.state.midiOrigin;
            if (Number.isInteger(noteNum)) {
                PlayNote(noteNum);
            }
            result = gen.next();
            if (!result.done) {
                await this.sleep(this.state.noteDelay);
            }
        }
        console.log("Done playing sequence!");
    }

    updateOffset(index, offset) {
        this.setState(state => {
            let alphabetOffset = [...state.alphabetOffset];
            alphabetOffset[index] = offset;
            return {alphabetOffset};
        });
    }

    updateAlphabetSize(alphabetSize) {
        console.log("UpdateAlphabetSize Called!");
        this.setState(state => {
            let oldSize = state.alphabetOffset.length;
            let alphabetOffset = [...Array(alphabetSize).keys()].map((item, index) => {
                if (index < oldSize) {
                    return state.alphabetOffset[index];
                }
                return index + 1;
            });
            return {alphabetSize, alphabetOffset};
        });
    }

    render() {
        let NoteOffsetList = [];
        for (let i = 1; i <= this.state.alphabetSize; ++i) {
            let currOffsetVal = this.state.alphabetOffset[i - 1];
            NoteOffsetList.push(<div key={i}><NoteOffset offsetIndex={i}
                                                         valueFromState={currOffsetVal}
                                                         updateOffset={this.updateOffset}/>{Tone.Frequency(this.state.midiOrigin + currOffsetVal, "midi").toNote()}<br/>
            </div>);
        }
        return <div>
            <label>Try one of these preconfigured configs!<br/>
                <button onClick={() => this.setToConfig("reset")}>Reset</button>
                <button onClick={() => this.setToConfig("major scale")}>Major Scale</button>
                <button onClick={() => this.setToConfig("minor scale")}>Minor Scale</button>
            </label><br/>
            <label>Note Delay (ms):
                <input type="number" placeholder="time in ms (default 300)" value={this.state.noteDelay}
                       onChange={event => this.setState({noteDelay: parseInt(event.target.value)})}/>
            </label><br/>
            <label>Alphabet Size:
                <input type="number" placeholder="size (default 3)" value={this.state.alphabetSize}
                       onChange={event => this.updateAlphabetSize(parseInt(event.target.value))}/>
            </label><br/>
            <label>Word Length:
                <input type="number" placeholder="length (default 3)" value={this.state.wordLength}
                       onChange={event => this.setState({wordLength: parseInt(event.target.value)})}/>
            </label><br/>
            <label>Midi Origin:
                <input type="number" placeholder="origin (default 60)" value={this.state.midiOrigin}
                       onChange={event => this.setState({midiOrigin: parseInt(event.target.value)})}/>
                {Tone.Frequency(this.state.midiOrigin, "midi").toNote()}
            </label>
            {NoteOffsetList}
            <button onClick={this.startPlayer}>Start Sequence</button>
        </div>;
    }
}
