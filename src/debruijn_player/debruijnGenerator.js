/**
 * Generator function for the debruijnGenerator sequence.
 * @param alphabetSize size of alphabet
 * @param wordLength size of a word
 * @returns {void}
 */
export const DebruijnGenerator = function* (alphabetSize, wordLength) {
  /*
Source: https://damip.net/article-de-bruijn-sequence
  De Bruijn sequence generator javascript implementation
  Code written by Damir Vodenicarevic (https://damip.net) in march 2017.
  This work is licensed under a Creative Commons Attribution 4.0 International License.
  http://creativecommons.org/licenses/by/4.0/
  Inspired by Frank Ruskey's Combinatorial Generation
*/
  let k = alphabetSize;
  let n = wordLength;
  if (!Number.isInteger(k) || !Number.isInteger(n) || k <= 0 || n <= 0) {
    return;
  }
  let a = [];
  for (let i = 0; i < k * n; ++i) a[i] = 0;

  let db = function* (t, p) {
    if (t > n) {
      if (n % p === 0) {
        for (let i = 1; i <= p; ++i) yield a[i];
      }
    } else {
      a[t] = a[t - p];
      yield* db(t + 1, p);
      for (let j = a[t - p] + 1; j < k; ++j) {
        a[t] = j;
        yield* db(t + 1, t);
      }
    }
  };
  yield* db(1, 1);

  //// Extra code to avoid having to cycle for the last word
  //Note: remove this part to get an actual de Bruijn sequence
  const loopIt = DebruijnGenerator(alphabetSize, wordLength);
  let result = loopIt.next();
  for (
    let remaining = wordLength - 1;
    !result.done && remaining > 0;
    --remaining
  ) {
    yield result.value;
    result = loopIt.next();
  }
};
