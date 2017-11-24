let $ = require('jquery');
var ipcRenderer = require('electron').ipcRenderer;
const {dialog} = require('electron').remote;

const jetpack = require('fs-jetpack');

$(function(){
	ipcRenderer.on('midi_port_options', function (event,message) {
		setMIDIPortOptions(message);
	});
	ipcRenderer.send('request_midi_port_options','');
});


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
	ipcRenderer.once('send_midi_data', function(event, message) {
		if (message.result) {
		} else {

		}
	});
}
