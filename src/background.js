'use strict';

var electron = require('electron');
import MIDIOutput from "./midi/MIDIDevice"

var app = electron.app;
var BrowserWindow = electron.BrowserWindow;
var ipcMain = electron.ipcMain;

var mainWindow = null;

const midiPort = new MIDIOutput();



function sendMIDIData(data) {
  try {
    midiPort.open(parseInt(data.port));
    data.data.forEach(function(item, index) {
      midiPort.sendMessage(item);
    });
    midiPort.close();
    return true;
  }
  catch(err) {
    return false;
  }
}

app.on('ready', function() {
    mainWindow = new BrowserWindow({
        height: 580,
        width: 800,
        icon: __dirname + '/icon.png'
    });

    mainWindow.loadURL('file://' + __dirname + '/app.html');
    mainWindow.openDevTools();


    ipcMain.on('send_midi_message', function (event, message) {
        midiPort.sendMessage(message);
    });

    ipcMain.on('open_midi_port', function (event, portID) {
      midiPort.close();
      midiPort.open(portID);
      event.returnValue = true;
    });

    ipcMain.on('close_midi_port', function (event, dummy) {
      midiPort.close();
      event.returnValue = true;
    });

    ipcMain.on('request_midi_port_options', function (event,message) {
        event.returnValue = midiPort.getPortList();
    });

});
