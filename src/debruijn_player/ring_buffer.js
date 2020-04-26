export default class RingBuffer {
  /**
   * Create a RingBuffer queue backed by array.
   * @param capacity number of items the queue can hold, >=0
   * @param overwrite whether or not to overwrite the first queue item.
   */
  constructor(capacity, overwrite = false) {
    if (!Number.isSafeInteger(capacity) || capacity < 0) {
      throw new Error(
        `Invalid capacity given when constructing RingBuffer: ${capacity}`
      );
    }
    this._capacity = capacity;
    this._overwrite = overwrite;
    this._array = new Array(capacity + 1);
    this._head = this._tail = 0;
  }

  _mask(index) {
    return index % this._array.length;
  }
  _increment(index) {
    return this._mask(index + 1);
  }

  /**
   * Insert val into the RingBuffer. Throws Error if full.
   * @param val
   */
  push(val) {
    if (this.isFull()) {
      if (!this._overwrite) {
        throw new Error(`RingBuffer is full, failed to insert item: ${val}`);
      }
      this._head = this._increment(this._head);
    }
    this._array[this._tail] = val;
    this._tail = this._increment(this._tail);
  }

  /**
   * Removes and returns the top item on the RingBuffer.
   */
  pop() {
    if (this.isEmpty()) {
      throw new Error(`Can't get items from empty RingBuffer`);
    }
    let item = this._array[this._head];
    this._head = this._increment(this._head);
    return item;
  }

  /**
   * Return array of up to "number" of items. Returns all items if fewer than number.
   * @param number
   */
  peek(number) {
    if (!Number.isSafeInteger(number) || number <= 0 || this.isEmpty()) {
      return [];
    }
    let returnSize = Math.min(number, this.getSize());
    let tmpTail = this._mask(this._head + returnSize);
    if (tmpTail > this._head) {
      return this._array.slice(this._head, tmpTail);
    }
    // Slice needs to wraparound.
    return [
      ...this._array.slice(this._head, this._array.length),
      ...this._array.slice(0, tmpTail),
    ];
  }

  isEmpty() {
    return this._head === this._tail;
  }

  isFull() {
    return this._increment(this._tail) === this._head;
  }

  getSize() {
    if (this.isEmpty()) {
      return 0;
    }
    let diff = this._tail - this._head;
    if (diff < 0) {
      return diff + this._array.length;
    }
    return diff;
  }

  getCapacity() {
    return this._capacity;
  }

  clearBuffer() {
    this._head = this._tail = 0;
  }
}
