import RingBuffer from "./ring_buffer";
import { Mutex } from "async-mutex";
import { sleep } from "./js_utils";

/**
 * Generator function for the debruijnGenerator sequence.
 * @param alphabetSize size of alphabet
 * @param wordLength size of a word
 * @returns {void}
 */
export const debruijnGenerator = function* (alphabetSize, wordLength) {
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

  // Extra code to avoid having to cycle for the last word.
  // Note: remove this part to get an actual de Bruijn sequence.
  const loopIt = debruijnGenerator(alphabetSize, wordLength);
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

/**
 *
 * @param alphabetSize
 * @param wordLength
 * @param bufferSize To be safe should be >10.
 * @param bufferDelay Delay between fetching next buffer item, to smooth out cpu spikes.
 * @returns {AsyncGenerator<*, void, *>}
 */
export class BufferedDebruijnGenerator {
  constructor(alphabetSize, wordLength, bufferSize, bufferDelay) {
    this._alphabetSize = alphabetSize;
    this._wordLength = wordLength;
    this._buffer = new RingBuffer(bufferSize, false);
    this._bufferDelay = bufferDelay;
  }

  peek(number) {
    return this._buffer.peek(number);
  }

  async *getGenerator() {
    let generator = debruijnGenerator(this._alphabetSize, this._wordLength);
    let stillGenerating = true;
    let fullMutex = new Mutex();
    let fullMutexUnlocker = undefined;
    let emptyMutex = new Mutex();
    let emptyMutexUnlocker = await emptyMutex.acquire();

    let asyncBufferFiller = async function () {
      let result = await generator.next();
      while (!result.done) {
        if (this._buffer.isFull() || fullMutex.isLocked()) {
          // When full, wait for the "unlock" to continue
          (await fullMutex.acquire())();
        } else {
          this._buffer.push(result.value);
          if (emptyMutexUnlocker !== undefined) {
            emptyMutexUnlocker = emptyMutexUnlocker();
          }
          if (this._buffer.isFull()) {
            fullMutexUnlocker = await fullMutex.acquire();
          }
        }
        result = await generator.next();
        await sleep(this._bufferDelay);
      }
      stillGenerating = false;
      if (emptyMutexUnlocker !== undefined) {
        emptyMutexUnlocker = emptyMutexUnlocker();
      }
    };
    asyncBufferFiller = asyncBufferFiller.bind(this);

    // Begin populating buffer.
    asyncBufferFiller();

    while (stillGenerating || !this._buffer.isEmpty()) {
      if (this._buffer.isEmpty()) {
        // Possible small chance of resource lock occuring here.
        // Let the buffer know that there is/was demand but buffer is empty.
        emptyMutexUnlocker = await emptyMutex.acquire();
        (await emptyMutex.acquire())(); // Buffer has signaled that item was enqueued.
        // Awaited populate but still empty means we are at end.
        if (this._buffer.isEmpty()) {
          break;
        } else {
          // console.log("Can't keep up, buffer is starved!");
        }
      }

      yield this._buffer.pop();

      // If we ever reached max capacity, let the buffer continue in bursts of 40% or so.
      if (this._buffer.getSize() / this._buffer.getCapacity() < 0.6) {
        if (fullMutex.isLocked()) {
          fullMutexUnlocker = fullMutexUnlocker();
        }
      }
    }
  }
}
