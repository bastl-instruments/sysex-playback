let $ = require('jquery');
var ipcRenderer = require('electron').ipcRenderer;
const {dialog} = require('electron').remote;
const MIDIFile = require('midifile');


$(function(){
	ipcRenderer.on('midi_port_options', function (event,message) {
		setMIDIPortOptions(message);
	});
	ipcRenderer.send('request_midi_port_options','');

	$("#midifile").on("change", openMIDIFile);

});

var midifile = 0;

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
					showFileOperationStatus("File Ok", false);
					parseMIDIfile();
				}
				catch(err) {
					showFileOperationStatus("Not a valid MIDI File", true);
					console.log(err);
					event.target.value = "";
					clearStats();
				}
			};
			reader.readAsArrayBuffer(thisFile);
		}
}

function parseMIDIfile() {
		var events = midifile.getEvents();
		$.each(events, function(index, value) {
			//console.log(value);
		});
		showStats(events[events.length-1].playTime);
	}

function clearStats() {
	$("#stats").text("");
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
	$("#stats").text("Total duration: " + minText +' '+ secText);
}

function setMIDIPortOptions(portOptions) {
	var portSelect = $("#portselect select");
	portSelect.html("");
	for (var i=0; i<portOptions.length; i++){
		var el = $("<option></<option>");
		el.text(portOptions[i]);
		el.val(i);
		portSelect.append(el);
	}
}

function sendMIDI() {
	// send port number and midi data to main process
	ipcRenderer.send('send_midi_data', {
			port: $("#portselect select")[0].value,
			data: sysExStream
	});
	// handle success/failure
	ipcRenderer.once('send_midi_data', function(event, message) {
		if (message.result) {
		} else {
		}
	});
}


function showFileOperationStatus(status, error) {
	var element = $("#openFile .result");
	updateResultField(element, status, error);
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
