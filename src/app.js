let $ = require('jquery');
var ipcRenderer = require('electron').ipcRenderer;
const {dialog} = require('electron').remote;
const MIDIFile = require('midifile');


$(function(){

	setMIDIPortOptions(
		ipcRenderer.sendSync('request_midi_port_options','')
	);

	$("#logging .toggle").on("click", toggleLog);

	toggleLog();

	changeState(State.INIT);

});

var State = {
  INIT: 0,
	LOAD: 1,
  READY: 2,
  FLASHING: 3,
	ABORT: 4,
	DONE: 5
};
var StateNames = ["INIT", "LOAD", "READY", "FLASHING", "ABORT", "DONE"];

var reader;

var currentState = 0;

var midifile = 0;








function changeState(state) {
	currentState = state;
	console.log("Change State: ", StateNames[currentState]);
	switch (currentState) {
		case State.INIT:
			midifile = 0;
			break;
		case State.LOAD:
			openMIDIFile();
			break;
		case State.READY:
			break;
		case State.FLASHING:
			playerStart(midifile);
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
			break;
		case State.LOAD:
			setProgress(0);
			break;
		case State.READY:
			flashButton.on("click", doStart);
			flashButton.text("Flash");
			flashButton.removeClass("disabled");
			break;
		case State.FLASHING:
			flashButton.on("click", doStop);
			flashButton.text("Stop");
			break;
		case State.ABORT:
			fileSelector.on("change", doLoad);
			flashButton.text("Flash");
			flashButton.on("click", doStart);
			break;
		case State.DONE:
			fileSelector.on("change", doLoad);
			flashButton.text("Flash");
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
			console.log("loading..");
			reader = new FileReader();
			reader.onerror = function(error) {
				showFileOperationStatus("Could not open File");
				//console.log(err);
				changeState(State.INIT);
			}
			reader.onload = function(result) {
				try {
					midifile = new MIDIFile(reader.result);
					console.log("File read");
					showFileOperationStatus("File loaded", false);
					printStats(midifile.getEvents());
					changeState(State.READY);
				}
				catch(err) {
					showFileOperationStatus("Not a valid MIDI File", true);
					//console.log(err);
					console.log("Invalid file");
					changeState(State.INIT);
				}
			};
			reader.readAsArrayBuffer(thisFile);
		}
}


/************ PLAYBACK ***********/


var currentIndex;
var events;
var timer;
const timeInterval = 10;
var elapsedTime;
var endTime;

function playerStart(midiFile) {
	console.log("Player: Start");
	openMIDIPort();
	events = midiFile.getEvents();
	currentIndex = 0;
	elapsedTime = 0;
	timer = setInterval(playerCheck, timeInterval);
	endTime = events[events.length-1].playTime;
}
function playerStop() {
	console.log("Player: Stop");
	clearTimeout(timer);
	closeMIDIPort();
}
function playerCheck() {
	elapsedTime = elapsedTime + timeInterval;
	setProgress(Math.round(elapsedTime/endTime*1000));
	if (elapsedTime >= events[currentIndex].playTime) {

		playerHandleEvent(events[currentIndex]);

		currentIndex = currentIndex + 1;
		if (currentIndex >= events.length-1) {
			changeState(State.DONE);
		}
	}
}
function playerHandleEvent(event) {
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
	ipcRenderer.send('send_midi_message', message);
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

function printStats(events) {
	var duration = events[events.length-1].playTime;
	var minutes = Math.floor(duration / 1000 / 60);
	var seconds = Math.ceil((duration / 1000) - minutes*60);
	var minText = '';
	if (minutes > 0) {
		minText = minutes + " minute"
		if (minutes != 1) minText = minText+'s';
	}
	var secText = seconds + " second";
	if (seconds != 1) secText = secText+'s';
	printLog("Total duration: " + minText +' '+ secText);
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
			button.text("▼ Show Log")
		});
	} else {
		element.fadeIn(400,'swing', function() {
			button.text("▲ Hide Log")
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
					return "[Thyme] Reboot";
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
