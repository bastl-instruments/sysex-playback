let $ = require('jquery');
var ipcRenderer = require('electron').ipcRenderer;
const {dialog} = require('electron').remote;
const MIDIFile = require('midifile');


$(function(){
	ipcRenderer.on('midi_port_options', function (event,message) {
		setMIDIPortOptions(message);
	});
	ipcRenderer.send('request_midi_port_options','');

	setInterval(updateProgressBar, 200);

	$("#midifile").on("change", openMIDIFile);
	$("#flash").on("click", sendStart);
	$("#logging .toggle").on("click", toggleLog);

	toggleLog();

});

var midifile = 0;
var timer = 0;
var currentMessageID = 0;
var startTime = 0;
var endTime = 0;
var duration = 0;

function openMIDIFile(event) {
	  var files = event.target.files
		if (files) {
			var thisFile = files[0];
			var reader = new FileReader();
			reader.onerror = function(error) {
				showFileOperationStatus("Could not open " + thisFile, true);
				console.log(err);
			}
			reader.onload = function(result) {
				try {
					midifile = new MIDIFile(reader.result);
					showFileOperationStatus("File loaded", false);
					parseMIDIfile();
				}
				catch(err) {
					showFileOperationStatus("Not a valid MIDI File", true);
					console.log(err);
					event.target.value = "";
				}
			};
			reader.readAsArrayBuffer(thisFile);
		}
}

function parseMIDIfile() {
	var events = midifile.getEvents();
	duration = events[events.length-1].playTime;
	showStats(duration);
}

function showStats(playTime) {
	var minutes = Math.floor(playTime / 1000 / 60);
	var seconds = Math.ceil((playTime / 1000) - minutes*60);
	var minText = '';
	if (minutes > 0) {
		minText = minutes + " minute"
		if (minutes > 1) minText = minText+'s';
	}
	var secText = seconds + " seconds";
	printLog("Total duration: " + minText +' '+ secText);
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

function sendStart() {
	currentMessageID = 0;
	timer = 0;
	startTime = new Date().getTime();
	endTime = startTime + duration;
	setProgress(0);
	sendProceed();
}
function sendStop() {
	timer = 0;
}

function sendProceed() {
	var events = midifile.getEvents();
	var thisEvent = events[currentMessageID];
	showMessageDebug(thisEvent);
	if (currentMessageID < events.length-1) {
		currentMessageID = currentMessageID + 1;
		var nextEvent = events[currentMessageID];
		var timeToNext = nextEvent.playTime - thisEvent.playTime;
		timer = setTimeout(sendProceed, timeToNext);
	} else {
		sendStop();
	}
}



function sendMIDI(data) {
	console.log("send");
	// send port number and midi data to main process
	ipcRenderer.sendSync('send_midi_data_sync', {
			port: $("#portselect")[0].value,
			data: data
	});

}


function showFileOperationStatus(status, error) {
	printLog(status);
}

function updateResultField(element, message, isError) {
	element.text(message);
	element.fadeIn(100, 'linear');
	if (isError) {
		element.addClass("error");
		element.fadeOut(5000, 'swing');
	} else {
		element.removeClass("error");
		element.fadeOut(3000, 'swing');
	}
}

function updateProgressBar() {
	if (timer) {
		var now = new Date().getTime();
		var progress = Math.round((now - startTime)/(duration) * 1000);
		setProgress(progress);
	}
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

function showMessageDebug(event) {
	switch (event.type) {
		case 240:
			printLog(parseSysEx(event.data));
			break;
		case 255:
			// meta event
			break;
		default:
		  printLog("Unexpected event type " + event.type);
	}
}

function printLog(text) {
	var logWindow = $("#logging textarea");
	logWindow.append(text + "&#10;");
	logWindow.scrollTop(logWindow.prop('scrollHeight'));
}

const Code_Flash = 2;
const Code_Start = 4;
const Code_Forward_Flash = 12;
const Code_Forward_Erase = 15;

function parseSysEx(data) {
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
