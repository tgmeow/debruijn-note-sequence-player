import React from "react";

export const DebruijnPlayerInformation = () => (
  <div>
    <h2>Instructions</h2>
    <p>
      The{" "}
      <a
        href={"https://en.wikipedia.org/wiki/De_Bruijn_sequence"}
        target={"_blank"}
        rel={"noopener noreferrer"}
      >
        DeBruijn Sequence
      </a>{" "}
      contains every possible length "wordLength" string over an alphabet of
      size "alphabetSize" exactly once as a substring (with the last word
      typically cycling back to the beginning of the sequence). For example,
      wordLength = 2 and alphabetSize = 2 creates the sequence{" "}
      <code>0 0 1 1 0</code>. Every permutation of 0 and 1 exists once as a
      substring. <code>00, 01, 10, 11</code>. You can visit{" "}
      <a
        href={"https://damip.net/article-de-bruijn-sequence"}
        target={"_blank"}
        rel={"noopener noreferrer"}
      >
        https://damip.net/article-de-bruijn-sequence
      </a>{" "}
      to view more examples.{" "}
    </p>
    <p>
      When given a large enough alphabet size and a large enough word length,
      this site will generate every possible song composed with the same note
      duration. This project was inspired by the TED talk embedded below.
    </p>
    <div className={"video-container"}>
      <iframe
        title={
          "Copyrighting all the melodies to avoid accidental infringement | Damien Riehl | TEDxMinneapolis"
        }
        width={"853"}
        height={"480"}
        src={"https://www.youtube.com/embed/sJtm0MoOgiU"}
        frameBorder={"0"}
        allow={"accelerometer; encrypted-media; gyroscope; picture-in-picture"}
        allowFullScreen
      />
    </div>

    <p>
      This site will use numbers as the generated output. Each output gets
      mapped to its Alphabet # Offset and is interpreted as a MIDI value.
    </p>
    <p>
      The config state gets saved to the URL so that you can easily share fun
      configs with others!
    </p>
    <p>
      <b>Midi Origin</b> sets the origin for the offset of zero.
      <br />
      <b>Alphabet # Offset</b> sets the note for that alphabet relative to the
      Midi Origin.
    </p>
    <h3>Credits</h3>
    <p>
      Author: Tiger Mou
      <br />
      Sequence generator algorithm from{" "}
      <a
        href={"https://damip.net/article-de-bruijn-sequence"}
        target={"_blank"}
        rel={"noopener noreferrer"}
      >
        https://damip.net/article-de-bruijn-sequence
      </a>
      .
    </p>
  </div>
);
