/*
Handles access to a single MIDI outpiut port
*/
var midi = require('midi');

export default class MIDIOutput   {
  constructor() {
    this.port = new midi.output();
    this.idOpen = false;
  }

  getPortList() {
    var midiPortList = [];
    for (var i= 0; i<this.port.getPortCount(); i++){
      midiPortList.push(this.port.getPortName(i));
    }
    return midiPortList;
  }

  isOpen() {
    return (this.idOpen !== false);
  }

  getOpenPortID() {
    return this.idOpen;
  }

  open(portID) {
    if (this.isOpen()) {
      throw new Error("MIDI Port is already open");
    } else {
      portID = parseInt(portID);
      this.port.openPort(portID);
      this.idOpen = portID;
    }
  }

  close() {
    if (this.isOpen()) {
      this.port.closePort();
      this.idOpen = false;
    }
  }

  sendMessage(data) {
    if (!this.isOpen()) {
      throw new Error("MIDI Port is not open");
    } else {
      this.port.sendMessage(data);
    }
  }
}
