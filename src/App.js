import React from "react";
import DebruijnPlayer from "./debruijn_player/DebruijnPlayer";
import "./App.css";
import { DebruijnPlayerInformation } from "./debruijn_player/DebruijnPlayerInformation";

function App() {
  return (
    <div className="App">
      <div className="App-main">
        <DebruijnPlayer />
        <DebruijnPlayerInformation />
      </div>
    </div>
  );
}

export default App;
