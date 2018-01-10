let $ = require('jquery');
var ipcRenderer = require('electron').ipcRenderer;
const {dialog} = require('electron').remote;
let win = require('electron').remote.getCurrentWindow();
import MIDIPlayer from "./midi/midi-player"

var State = {
  INIT: 0,
	LOAD: 1,
  READY: 2,
  FLASHING: 3,
	ABORT: 4,
	DONE: 5
};
var StateNames = ["INIT", "LOAD", "READY", "FLASHING", "ABORT", "DONE"];
var currentState = 0;

var reader;
var Player = new MIDIPlayer();


$(function(){

	setMIDIPortOptions(
		ipcRenderer.sendSync('request_midi_port_options','')
	);

	$("#logging .toggle").on("click", toggleLog);

	changeState(State.INIT);
	Player.on("loop", playerCheck);
	Player.on("endOfFile", endOfFile);
	Player.on("midi", sendEvent);

  printLog("Before you start: connect your computer's MIDI output to the device's MIDI input and boot the device into bootloader mode.");
  printLog("");

});


function changeState(state) {
	currentState = state;
	console.log("Change State: ", StateNames[currentState]);
	switch (currentState) {
		case State.INIT:
			break;
		case State.LOAD:
			openMIDIFile();
			break;
		case State.READY:
			break;
		case State.FLASHING:
			playerStart();
			break;
		case State.ABORT:
			playerStop();
			break;
		case State.DONE:
			playerStop();
			break;
	}
	setUIFromState();
}


function setUIFromState() {
	var fileSelector = $("#midifile");
	var flashButton = $("#flash");

	fileSelector.off();
	flashButton.off();

	switch (currentState) {
		case State.INIT:
			fileSelector.on("change", doLoad);
			flashButton.addClass("disabled");
			fileSelector.val("");
      setProgress(0);
			break;
		case State.LOAD:
			setProgress(0);
			break;
		case State.READY:
			flashButton.on("click", doStart);
			fileSelector.on("change", doLoad);
			flashButton.text("Upload");
			flashButton.removeClass("disabled");
			break;
		case State.FLASHING:
			flashButton.on("click", doStop);
			flashButton.text("Stop");
			break;
		case State.ABORT:
			fileSelector.on("change", doLoad);
			flashButton.text("Upload");
			flashButton.on("click", doStart);
			break;
		case State.DONE:
			fileSelector.on("change", doLoad);
			flashButton.text("Upload");
			flashButton.on("click", doStart);
			printLog("Flashing completed!");
			setProgress(1000);
			break;
	}
}

function doStart() {
	changeState(State.FLASHING);
}
function doStop() {
	changeState(State.ABORT);
}
function doLoad() {
	changeState(State.LOAD);
}


function openMIDIFile(event) {
	  var files = $("#midifile").prop("files");
		if (files) {
			var thisFile = files[0];
			if (thisFile) {
				console.log("loading", thisFile);
				reader = new FileReader();
				reader.onerror = function(error) {
					showFileOperationStatus("Could not open File");
					//console.log(err);
					changeState(State.INIT);
				}
				reader.onload = function(result) {
					try {
						Player.loadFileFromBuffer(reader.result);
						console.log("File read");
						showFileOperationStatus("MIDI File loaded", false);
						printDuration(Player.getDuration());
						changeState(State.READY);
					}
					catch(err) {
						showFileOperationStatus("Not a valid MIDI File", true);
						console.log(err);
						console.log("Invalid file");
						changeState(State.INIT);
					}
				};
				reader.readAsArrayBuffer(thisFile);
			} else {
				changeState(State.INIT);
			}
		}
}


/************ PLAYBACK ***********/


function playerStart() {
	console.log("Player: Start");
	openMIDIPort();
	Player.start();
}

function playerStop() {
	console.log("Player: Stop");
	Player.halt();
	closeMIDIPort();
}

function playerCheck() {
	setProgress(Player.getProgress() * 1000);
}

function endOfFile() {
	changeState(State.DONE);
}

function sendEvent(event) {
	if (event.type == 240) {
		printLog(SysExToString(event.data));

		var data = [event.type, ]
		if (event.data) data = data.concat(event.data);
		sendMIDIMessage(data);
	}
}


/********** MIDI *****************/

function openMIDIPort() {
	var result = ipcRenderer.sendSync('open_midi_port', $("#portselect")[0].value);
}

function closeMIDIPort() {
	ipcRenderer.sendSync('close_midi_port', 0);
}

function sendMIDIMessage(message) {
	ipcRenderer.sendSync('send_midi_message', message);
}

/************ UI **************/

function showMessageDebug(event) {
	switch (event.type) {
		case 240:
			printLog(SysExToString(event.data));
			break;
		case 255:
			// meta event
			break;
		default:
		  printLog("Unexpected event type " + event.type);
	}
}

function printDuration(duration) {
	var minutes = Math.floor(duration / 1000 / 60);
	var seconds = Math.ceil((duration / 1000) - minutes*60);
	var minText = '';
	if (minutes > 0) {
		if (minutes != 1) minText = minutes + ' minutes ';
		else minText = '1 minute ';
	}
	var secText = seconds + "second";
	if (seconds != 1) secText = seconds + ' seconds';
	else secText = '1 second';
	printLog("Total duration: " + minText + secText);
}

function showFileOperationStatus(status, error) {
	printLog(status);
}

function setProgress(val) {
	var element = $("progress");
	if (val == false) {
		element.removeAttr("value");
	} else {
		element.attr("value", val);
	}
}

function toggleLog() {
	var button = $("#logging span");
	var element = $("#logging textarea");
	if (element.is(":visible")) {
		element.fadeOut(400, 'swing', function() {
			button.text("▼ Show Log");
      win.setSize(400,460,400);
		});
	} else {
    win.setSize(400,460+180,400);
		element.fadeIn(400,'swing', function() {
			button.text("▲ Hide Log");
		});
	}
}

function printLog(text) {
	var logWindow = $("#logging textarea");
	logWindow.append(text + "&#10;");
	logWindow.scrollTop(logWindow.prop('scrollHeight'));
}

function setMIDIPortOptions(portOptions) {
	var portSelect = $("#portselect");
	portSelect.html("");
	for (var i=0; i<portOptions.length; i++){
		var el = $("<option></<option>");
		el.text(portOptions[i]);
		el.val(i);
		portSelect.append(el);
	}
}



/********* SysEx ****************/

const Code_Flash = 2;
const Code_Start = 4;
const Code_Forward_Flash = 12;
const Code_Forward_Erase = 15;

function SysExToString(data) {
	if (data[0] == 123) {

		var deviceID = data[1];
		var command = data[2];
		var payload = HalfByteToByte(data.slice(3,data.length))

		// Thyme
		if (deviceID == 10)  {
			switch (command) {
				case Code_Flash:
				  var pageID = payload[0]*256 + payload[1];
					return "[Thyme] Flash AVR Page " + pageID;
				case Code_Start:
					return "[Thyme] Light up sound selection LEDs to indicate finished";
				case Code_Forward_Flash:
					var pageID = payload[1] * 512 + payload[2]*2 + payload[3]/128;
					return "[Thyme] Flash ARM Page " + pageID;
				case Code_Forward_Erase:
					return "[Thyme] Erase ARM (This will take some time)";
			}
		}
	}
}

function HalfByteToByte(input) {
	var result = [];
	for (var i=0; i<input.length; i=i+2) {
		result.push(input[i]*16 + input[i+1])
	}
	return result;
}
