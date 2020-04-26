import React from "react";
import DebruijnPlayer from "./debruijn_player/DebruijnPlayer";
import "./App.css";
import { DebruijnPlayerInformation } from "./debruijn_player/DebruijnPlayerInformation";

function App() {
  return (
    <div className="App">
      <div>
        <DebruijnPlayer />
        <DebruijnPlayerInformation />
      </div>
    </div>
  );
}

export default App;
