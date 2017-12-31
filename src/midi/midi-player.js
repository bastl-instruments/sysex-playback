const MIDIFile = require('midifile');

export default class MIDIPlayer   {
  constructor() {
    this.file = false;
    this.currentIndex = 0;
    this.intervalTime = 10;
    this.eventListeners = {};
    this.playbackPosition = 0;
    this.elapsedTime = 0;
    this.endTime = 0;
  }

  loadFileFromBuffer(buffer) {
    this.file = new MIDIFile(buffer);
    this.events = this.file.getEvents();
  }

  on(eventName, func) {
    if (!this.eventListeners.hasOwnProperty(eventName)) this.eventListeners[eventName] = [];
    this.eventListeners[eventName].push(func);
    return this;
  }

  triggerEvent(eventName, data) {
    if (this.eventListeners.hasOwnProperty(eventName)) this.eventListeners[eventName].forEach(fn => fn(data || {}));
    return this;
  }

  start() {
    if (this.file) {

      this.triggerEvent('start');

      this.playbackPosition = 0;
      this.elapsedTime = 0;
      this.endTime = this.events[this.events.length-1].playTime;

      this.timer = setInterval(this.loop.bind(this), this.intervalTime);
    }
    return this;
  }

  loop() {

    this.elapsedTime = this.elapsedTime + this.intervalTime;
    this.triggerEvent('loop');


    var thisEvent = this.events[this.playbackPosition];

    if (this.elapsedTime >= thisEvent.playTime) {

      this.triggerEvent('midi', thisEvent);

      this.playbackPosition = this.playbackPosition + 1;
      if (this.playbackPosition >= this.events.length-1) {
        this.triggerEvent('endOfFile');
        this.halt();
      }
    }
    return this;
  }

  getProgress() {
    return this.elapsedTime/this.endTime;
  }

  getDuration() {
    return this.events[this.events.length-1].playTime;
  }

  halt() {
    this.triggerEvent('halt');
    clearTimeout(this.timer);
  }



}
