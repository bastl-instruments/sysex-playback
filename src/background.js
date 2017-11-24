'use strict';

var electron = require('electron');

var app = electron.app;
var BrowserWindow = electron.BrowserWindow;
var midi = require('midi');
var ipcMain = electron.ipcMain;

var mainWindow = null;
var midiOut = new midi.output();


function sendMIDIPortOptions() {
  var midiPortList = [];
  for (var i= 0; i<midiOut.getPortCount(); i++){
    midiPortList.push(midiOut.getPortName(i));
  }
	mainWindow.webContents.send('midi_port_options', midiPortList);
}

function sendMIDIData(data) {
  try {
    midiOut.openPort(parseInt(data.port));
    data.data.forEach(function(item, index) {
      midiOut.sendMessage(item);
    });
    midiOut.closePort();
    return true;
  }
  catch(err) {
    return false;
  }
}

app.on('ready', function() {
    mainWindow = new BrowserWindow({
        height: 600,
        width: 890,
        icon: __dirname + '/icon.png'
    });

    mainWindow.loadURL('file://' + __dirname + '/app.html');
    //mainWindow.openDevTools();

    ipcMain.on('send_midi_data', function (event,message) {
        if (sendMIDIData(message)) {
          event.sender.send('send_midi_data',{result: true});
        } else {
          event.sender.send('send_midi_data',{result: false, message: "Could not send"});
        }
    });
    ipcMain.on('request_midi_port_options', function (event,message) {
        sendMIDIPortOptions();
    });

});
