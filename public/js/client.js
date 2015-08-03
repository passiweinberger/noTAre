/* HTML5 magic
- GeoLocation
- WebSpeech
*/

//WebSpeech API
var final_transcript = '';
var recognizing = false;
var lastmessages = []; // to be populated later
var db, remoteCouch;
var joining = true;
// Invited?
//var roomName;
var roomName = getUrlParameter("roomID");
if (roomName) {
	joining = false;
}

var MyName;
//IMPORTANT: CONFIGURE remoteCouch with your own details
var cloudant_url = "https://64abe65d-f33f-4b7d-bec3-7f3b3de2eb47-bluemix:913734c81dfef3dc517d303f0ede2aaf995d6e6e8df08aeeb5438b41ffc8912d@64abe65d-f33f-4b7d-bec3-7f3b3de2eb47-bluemix.cloudant.com/";
var syncDom = document.getElementById('sync-wrapper');
// turn to true if you want Wiki artikles suggested based on statistics TODO
var suggest_wiki = false; 


var getUrlParameter = function getUrlParameter(sParam) {
	var sPageURL = decodeURIComponent(window.location.search.substring(1)),
		sURLVariables = sPageURL.split('&'),
		sParameterName,
		i;

	for (i = 0; i < sURLVariables.length; i++) {
		sParameterName = sURLVariables[i].split('=');

		if (sParameterName[0] === sParam) {
			return sParameterName[1] === undefined ? true : sParameterName[1];
		}
	}
};

function makeCouchDB(roomName) {
	db = new PouchDB(roomName);
	remoteCouch = cloudant_url + roomName;
	db.info(function (err, info) {
		///*
		db.changes({
			//since: info.update_seq,
			continuous: true,
			live: true,
			onChange: readMessages
		});
		//.on('change', readMessages);
		//*/
	});
	if (remoteCouch) {
		sync();
	}
}

function sync() {
	syncDom.setAttribute('data-sync-state', 'syncing');
	var opts = {
		continuous: true,
		complete: completeHandlerCBD,
		error: syncError
	};
	db.replicate.to(remoteCouch, opts);
	db.replicate.from(remoteCouch, opts);
}
function completeHandlerCBD() {
	console.log('data-sync succesful!');
	syncDom.setAttribute('data-sync-state', 'success');
}
function syncError() {
	console.log('data-sync error!');
	syncDom.setAttribute('data-sync-state', 'error');
}

function exportToCsv(filename, rows) {
	var processRow = function (row) {
		var finalVal = '';
		for (var j = 0; j < row.length; j++) {
			var innerValue = row[j] === null ? '' : row[j].toString();
			if (row[j] instanceof Date) {
				innerValue = row[j].toLocaleString();
			};
			var result = innerValue.replace(/"/g, '""');
			if (result.search(/("|,|\n)/g) >= 0)
				result = '"' + result + '"';
			if (j > 0)
				finalVal += ',';
			finalVal += result;
		}
		return finalVal + '\n';
	};

	var csvFile = '';
	for (var i = 0; i < rows.length; i++) {
		csvFile += processRow(rows[i]);
	}

	var blob = new Blob([csvFile], {
		type: 'text/csv;charset=utf-8;'
	});
	if (navigator.msSaveBlob) { // IE 10+
		navigator.msSaveBlob(blob, filename);
	} else {
		var link = document.createElement("a");
		if (link.download !== undefined) { // feature detection
			// Browsers that support HTML5 download attribute
			var url = URL.createObjectURL(blob);
			link.setAttribute("href", url);
			link.setAttribute("download", filename);
			link.style.visibility = 'hidden';
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
		}
	}
}

function downloadMessages(roomName) {
	db.allDocs({
		include_docs: true,
		descending: false
	}, function (err, doc) {
		if (!err) {
			var filename = '' + roomName + '.csv';
			exportToCsv(filename, doc.rows);
		} else {
			console.log(err);
		}
	});
}

function readMessages() {
	db.allDocs({
		include_docs: true,
		descending: true
	}, function (err, doc) {
		redrawChat(doc.rows);
	});
}


function redrawChat2(messages) {
	$("#msgs").val('');
	messages.forEach(function (message) {
		$("#msgs").append("<li><span class='text-warning'>" + message.doc.message + '\n' + handlelink(message.doc.message) + "</span></li>"); // msg.doc.message
	});
}

function redrawChat(messages) {
	var ul = document.getElementById('msgs');
	ul.innerHTML = '';
	messages.forEach(function (message) {
		var li = document.createElement("li");
		//var pName = document.createElement("p");
		var pMessage = document.createElement("p");

		//pName.textContent = message.doc.name;
		pMessage.textContent = message.doc.name + ': ' + message.doc.message + '\n' + handlelink(message.doc.message); //message.doc.message;
		pName.className = "text-danger";

		//li.appendChild(pName);
		li.appendChild(pMessage);
		li.className = "list-group-item";
		ul.appendChild(li);
		if (suggest_wiki) {
			suggest_Wiki(messages);
		}
	});
}

function translateMsgs(messages, language) {
	var translated_msg;
	var ul = document.getElementById('msgs');
	ul.innerHTML = '';
	messages.forEach(function (message) {
		var li = document.createElement("li");
		//var pName = document.createElement("p");
		var pMessage = document.createElement("p");

		//pName.textContent = message.doc.name;
		translated_msg = translate(language, message.doc.message);
		pMessage.textContent = message.doc.name + ': ' + translated_msg + '\n' + handlelink(translated_msg); //translated_msg
		pName.className = "text-danger";

		//li.appendChild(pName);
		li.appendChild(pMessage);
		li.className = "list-group-item";
		ul.appendChild(li);
		if (suggest_wiki) {
			suggest_Wiki(messages);
		}
	});
}

function translateTo(lang) {
	db.allDocs({
		include_docs: true,
		descending: true
	}, function (err, doc) {
		if (!err) {
			translateMsgs(messages, lang);
		} else {
			console.log(err);
		}
	});
}

//START of WebSpeech
if (!('webkitSpeechRecognition' in window)) {
	console.log("webkitSpeechRecognition is not available");
} else {
	var recognition = new webkitSpeechRecognition();
	recognition.continuous = true;
	recognition.interimResults = true;

	recognition.onstart = function () {
		recognizing = true;
	};

	recognition.onresult = function (event) {
		var interim_transcript = '';
		for (var i = event.resultIndex; i < event.results.length; ++i) {
			if (event.results[i].isFinal) {
				final_transcript += event.results[i][0].transcript;
				$('#msg').addClass("final");
				$('#msg').removeClass("interim");
			} else {
				interim_transcript += event.results[i][0].transcript;
				///* For intermediate results
				//;uses $("#msg").val(interim_transcript);
				//$('#msg').addClass("interim");
				//$('#msg').removeClass("final");
				//*/
			}
		}
		$("#msg").val(final_transcript);
	};
}

function startButton(event) {
		if (recognizing) {
			recognition.stop();
			recognizing = false;
			$("#start_button").prop("value", "Aufnehmen");
			return;
		}
		final_transcript = '';
		// TODO change according to country
		recognition.lang = "en-GB"
		recognition.start();
		$("#start_button").prop("value", "Nimmt auf... Drücke um es zu stoppen!");
		$("#msg").val(final_transcript);
	}

//END of WebSpeech

/*
Functions
*/
function toggleNameForm() {
	//$("#userModal").toggle();
	$('#userModal').modal('hide');
}

function toggleChatWindow() {
	$("#main-chat-screen").toggle();
}

// Pad n to specified size by prepending a zeros
function zeroPad(num, size) {
	var s = num + "";
	while (s.length < size)
		s = "0" + s;
	return s;
}

// Format the time specified in ms from 1970 into local HH:MM:SS
function timeFormat(msTime) {
	var d = new Date(msTime);
	return zeroPad(d.getHours(), 2) + ":" +
		zeroPad(d.getMinutes(), 2) + ":" +
		zeroPad(d.getSeconds(), 2) + " ";
}

// -- Ajax Get Function -- 
function ajaxGet(docUrl, func) {
	$.ajax({ // Start AJAX Call 
		url: docUrl,
		xhrFields: {
			withCredentials: true
		},
		type: "GET",
		error: errorHandler,
		complete: completeHandler
	}).done(func);
}

function errorHandler(jqXHR, textStatus, errorThrown) {
	console.log(errorThrown);
}

function completeHandler(jqXHR, textStatus, errorThrown) {
	console.log(errorThrown)
}

/* Returns true if the roomName doesn't exsist
function check(roomName) {
  var doc;
  ajaxGet(cloudant_url + roomName + '', function(response) {
    doc = JSON.parse(response); 
  });
  try { 
    if (doc.error == "Database not found!") {
      return true;
    } else {
      return false;
    }
  }
  catch(err) {
    return true;
  }
}
*/

$(document).ready(function () {
	// setup "global" variables first
	// TODO PORT??
	var socket = io(); // io.connect("{0}:{1}".format(process.env.VCAP_APP_HOST, process.env.PORT)); // process.env.CF_INSTANCE_ADDR // "75.126.81.66:3000" or for local runs: 127.0.0.1:3000
	roomName = getUrlParameter("roomID");

	// Test if RoomID is set?
	if (roomName != undefined) {
		$("body").children().hide();
		$("#chatPage").show();
		$("#main-chat-screen").show();
		socket.emit("joinRoom", roomName);
		//TODO: Ask for Username TODO
		$('#userModal').modal('show');
		$("#username").focus();
	}



	$("form").submit(function (event) {
		event.preventDefault();
	});

	$("#conversation").bind("DOMSubtreeModified", function () {
		$("#conversation").animate({
			scrollTop: $("#conversation")[0].scrollHeight
		});
	});

	$("#main-chat-screen").hide();
	$("#errors").hide();
	$("#username").focus();
	$("#join").attr('disabled', 'disabled');

	if ($("#username").val() === "") {
		$("#join").attr('disabled', 'disabled');
	}

	// Enter screen
	$("#usernameForm").submit(function () {
		MyName = $("#username").val();
		var device = "desktop";
		if (navigator.userAgent.match(/Android|BlackBerry|iPhone|iPad|iPod|Opera Mini|IEMobile/i)) {
			device = "mobile";
		}
		if (MyName === "" || MyName.length < 2) {
			$("#errors").empty();
			$("#errors").append("Bitte gebe einen Username ein!");
			$("#errors").show();
		} else {
			socket.emit("joinserver", MyName, device);
			toggleNameForm();
			toggleChatWindow();
			$("#msg").focus();
		}
	});

	$("#username").keypress(function (e) {
		MyName = $("#username").val();
		if (MyName.length < 2) {
			$("#join").attr('disabled', 'disabled');
		} else {
			$("#errors").empty();
			$("#errors").hide();
			$("#join").removeAttr('disabled');
		}
	});

	// Main chat screen
	$("#chatForm").submit(function () {

		var msg = $("#msg").val();
		if (msg !== "") {
			var nowTime = new Date().getTime();
			var message = {
				_id: new Date().toISOString(), //required
				name: MyName, //'user', //TODO
				time: nowTime,
				message: msg
			};
			socket.emit("send", nowTime, message);
			db.put(message, function callback(err, result) {
				if (!err) {
					console.log('Successfully uploaded to couchDB!');
				} else {
					console.log(err);
				}
			});
			$("#msg").val("");
		}

	});

	// 'is typing' message
	var typing = false;
	var timeout = undefined;

	function timeoutFunction() {
		typing = false;
		socket.emit("typing", false);
	}

	$("#msg").keypress(function (e) {
		if (e.which !== 13) {
			if (roomName !== null && $("#msg").is(":focus")) {
				typing = true;
				socket.emit("typing", true);
			} else {
				clearTimeout(timeout);
				timeout = setTimeout(timeoutFunction, 5000);
			}
		}
	});

	socket.on("isTyping", function (data) {
		if (data.isTyping) {
			if ($("#" + data.person + "").length === 0) {
				$("#updates").append("<li id='" + data.person + "'><span class='text-muted'><small><i class='fa fa-keyboard-o'></i> " + data.person + " ist am schreiben...</small></li>");
				timeout = setTimeout(timeoutFunction, 5000);
			}
		} else {
			$("#" + data.person + "").remove();
		}
	});

	$("#createRoomButton").on('click', function () {
		var roomExists = false;
		var roomName = $("#createRoomName").val();
		document.getElementById("yourRoomName").innerHTML = roomName;
		socket.emit("check", roomName, function (data) {
			roomExists = data.result;
			if (roomExists) {
				$("#errors").empty();
				$("#errors").show();
				$("#errors").append("Die Vorlesung <i>" + roomName + "</i> läuft bereits! Husch, Husch, Hinein!");
			} else {
				if (roomName.length > 0) { //also check for roomName
					joining = false;
					makeCouchDB(roomName);
					socket.emit("createRoom", roomName);
					$("#errors").empty();
					$("#errors").hide();
					$("body").children().hide();
					$("#chatPage").show();
					$("#main-chat-screen").show();
					$('#userModal').modal('show');
				}
			}
		});
	});

	/*
	$("#createRoomButton").on('click', function () {
		var roomName = "abfddf_test1"; //$("#createRoomName").val(); 

		$("body").children().hide();
		$("#sync-wrapper").show();

		joining = false;
		makeCouchDB(roomName);
		socket.emit("createRoom", roomName);

		$("#chatPage").show();

	});
   */

	/*
	$("#rooms").on('click', '.joinRoomBtn', function () {
		var roomName = $(this).siblings("span").text();
		var roomID = $(this).attr("id");
		socket.emit("joinRoom", roomID);
	});
	*/

	/*
	$("#rooms").on('click', '.removeRoomBtn', function () {
		var roomName = $(this).siblings("span").text();
		var roomID = $(this).attr("id");
		socket.emit("removeRoom", roomID);
		$("#createRoom").show();
	});
	*/

	$("#leave").click(function () {
		socket.emit("leaveRoom", roomName);
		document.getElementById("yourRoomName").innerHTML = 'NOTARE';
		$("#createRoom").show();
	});

	$("#download").click(function () {
		// download from couchDB: TODO
		// socket.emit('download', roomName);
		downloadMessages(roomName);
	});

// TRANSLATIONS:
	$("#translate_en").click(function () {
		translateTo('en');
	});
	$("#translate_it").click(function () {
		translateTo('it');
	});
	$("#translate_ru").click(function () {
		translateTo('ru');
	});
	$("#translate_es").click(function () {
		translateTo('es');
	});
	$("#translate_fr").click(function () {
		translateTo('fr');
	});
	$("#translate_de").click(function () {
		translateTo('de');
	});
// TRANSLATIONS END

	$("#people").on('click', '.whisper', function () {
		var name = $(this).siblings("span").text();
		$("#msg").val("w:" + name + ":");
		$("#msg").focus();
	});
	
	/*
	$("#whisper").change(function() {
	    var peopleOnline = [];
	    if ($("#whisper").prop('checked')) {
	      console.log("checked, going to get the peeps");
	      //peopleOnline = ["Tamas", "Steve", "George"];
	      socket.emit("getOnlinePeople", function(data) {
	        $.each(data.people, function(clientid, obj) {
	          console.log(obj.name);
	          peopleOnline.push(obj.name);
	        });
	        console.log("adding typeahead")
	        $("#msg").typeahead({
	            local: peopleOnline
	          }).each(function() {
	            if ($(this).hasClass('input-lg'))
	              $(this).prev('.tt-hint').addClass('hint-lg');
	        });
	      });
	      
	      console.log(peopleOnline);
	    } else {
	      console.log('remove typeahead');
	      $('#msg').typeahead('destroy');
	    }
	  });
	  // $( "#whisper" ).change(function() {
	  //   var peopleOnline = [];
	  //   console.log($("#whisper").prop('checked'));
	  //   if ($("#whisper").prop('checked')) {
	  //     console.log("checked, going to get the peeps");
	  //     peopleOnline = ["Tamas", "Steve", "George"];
	  //     // socket.emit("getOnlinePeople", function(data) {
	  //     //   $.each(data.people, function(clientid, obj) {
	  //     //     console.log(obj.name);
	  //     //     peopleOnline.push(obj.name);
	  //     //   });
	  //     // });
	  //     //console.log(peopleOnline);
	  //   }
	  //   $("#msg").typeahead({
	  //         local: peopleOnline
	  //       }).each(function() {
	  //         if ($(this).hasClass('input-lg'))
	  //           $(this).prev('.tt-hint').addClass('hint-lg');
	  //       });
	  // });
	*/

	// socket-y stuff
	socket.on("exists", function (data) {
		$("#errors").empty();
		$("#errors").show();
		$("#errors").append(data.msg + " Versuche es mal mit <strong>" + data.proposedName + "</strong>");
		toggleNameForm();
		toggleChatWindow();
	});

	socket.on("joined", function () {
		$("#errors").hide();
		if (navigator.geolocation) { // get Geolocation of user
			navigator.geolocation.getCurrentPosition(positionSuccess, positionError, {
				enableHighAccuracy: true
			});
		} else {
			$("#errors").show();
			$("#errors").append("Your browser is ancient and it doesn't support GeoLocation.");
		}

		function positionError(e) {
			console.log(e);
		}

		function positionSuccess(position) {
			var lat = position.coords.latitude;
			var lon = position.coords.longitude;
			// consult the yahoo service for country
			$.ajax({
				type: "GET",
				url: "http://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20geo.placefinder%20where%20text%3D%22" + lat + "%2C" + lon + "%22%20and%20gflags%3D%22R%22&format=json",
				dataType: "json",
				success: function (data) {
					socket.emit("countryUpdate", {
						country: data.query.results.Result.countrycode
					});
				}
			});
		}
	});

	socket.on("history", function (data) {
		if (data.length !== 0) {
			$("#msgs").append("<li><strong><span class='text-warning'>Letzte Nachrichten: </li>");
			$.each(data, function (data, msg) {
				$("#msgs").append("<li><span class='text-warning'>" + msg.time + ': ' + msg.message + "</span></li>");
			});
		} else {
			$("#msgs").append("<li><strong><span class='text-warning'>Noch keine Nachrichten in dieser Vorlesung!</li>");
		}
	});

	socket.on("update", function (msg) {
		$("#msgs").append("<li>" + msg.time + ': ' + msg.message + "</li>");
	});

	socket.on("update-people", function (data) {
		var peopleOnline = [];
		$("#people").empty();
		$('#people').append("<li class=\"list-group-item active\">Kommolitonen online: <span class=\"badge\">" + data.count + "</span></li>");
		$.each(data.people, function (a, obj) {
			if (!("country" in obj)) {
				html = "";
			} else {
				html = "<img class=\"flag flag-" + obj.country + "\"/>";
			}
			$('#people').append("<li class=\"list-group-item\"><span>" + obj.name + "</span> <i class=\"fa fa-" + obj.device + "\"></i> " + html + " <a href=\"#\" class=\"whisper btn btn-xs\">whisper</a></li>");
			peopleOnline.push(obj.name);
		});

		///*
		var whisper = $("#whisper").prop('checked');
		if (whisper) {
			$("#msg").typeahead({
				local: peopleOnline
			}).each(function () {
				if ($(this).hasClass('input-lg'))
					$(this).prev('.tt-hint').addClass('hint-lg');
			});
		}
		//*/
	});

	socket.on("chat", function (msTime, person, msg) {
		$("#msgs").append("<li><strong><span class='text-success'>" + timeFormat(msTime) + person.name + "</span></strong>: " + msg.message + "</li>");
		// clear typing field
		$("#" + person.name + "").remove();
		clearTimeout(timeout);
		timeout = setTimeout(timeoutFunction, 0);
	});

	socket.on("whisper", function (msTime, person, msg) {
		if (person.name === "You") {
			s = "whisper"
		} else {
			s = "whispers"
		}
		$("#msgs").append("<li><strong><span class='text-muted'>" + timeFormat(msTime) + person.name + "</span></strong> " + s + ": " + msg.message + "</li>");
	});

	socket.on("roomList", function (data) {
		$("#rooms").text("");
		$("#rooms").append("<li class=\"list-group-item active\">Liste von Vorlesungen: <span class=\"badge\">" + data.count + "</span></li>");
		if (!jQuery.isEmptyObject(data.rooms)) {
			$.each(data.rooms, function (id, room) {
				$('#rooms').append("<li id=" + id + " class=\"list-group-item\"><span>" + room.name + "</span> " + html + "</li>");
			});
		} else {
			$("#rooms").append("<li class=\"list-group-item\">Es gibt noch keine Vorlesungen!</li>");
		}
	});

	socket.on("sendRoomID", function (data) {
		roomName = data.id;
		if (joining == false) {
			socket.emit("joinRoom", roomName);
		}
	});

	socket.on("disconnect", function () {
		$("#msgs").append("<li><strong><span class='text-warning'>Verbindung zum Server unterbrochen... </span></strong></li>");
		$("#msg").attr("disabled", "disabled");
		$("#send").attr("disabled", "disabled");
	});

	///////////////////
	//Create Room
	///////////////////

	var elems = [{
		name: "Hochschule Darmstadt",
		id: 1
	}, {
		name: "Universität Mainz",
		id: 2
	}];

	var chatRoom = new Chat("", "", "", "");

	//var chatRoom = new Chat("", "", "", "");

	$(".createHierarchy").click(function () {

		var name = $(this).prev().val();
		//TODO: Get ID of object
		$("#chosenHierarchy ul").append("<li class='list-group-item hierarchyObject'>" + name + "</li>");
		$(this).prev().val("");
		$(this).prev().focus();
	});


	$("#dropDownContainer .list-group-item").on('click', function () {

	});


	$("#dropDownContainer li").on('click', function () {
		var name = $(this).html();
		$("#chosenHierarchy ul").append("<li class='list-group-item hierarchyObject'>" + name + "</li>");
		$(this).prev().val("");
		$(this).prev().focus();
	});

	var delay = (function(){
	  var timer = 0;
	  return function(callback, ms){
	    clearTimeout (timer);
	    timer = setTimeout(callback, ms);
	  };
	})();

	$(".middleInput").on('keyup', function (e) {
		/*delay(function () {
			var str = $(".middleInput").val();

			if(chatRoom.org == ""){
				chatRoom.setOrg(str);
				socket.emit("findOrganization", chatRoom);
			}
			else if(chatRoom.course == ""){
				chatRoom.setCourse(str);
				socket.emit("findCourse", chatRoom);
			}
			
		}, 500)*/

		var str = $(".middleInput").val();

			if(chatRoom.org == ""){
				chatRoom.setOrg(str);
				socket.emit("findOrganization", chatRoom);
			}
			else if(chatRoom.course == ""){
				chatRoom.setCourse(str);
				socket.emit("findCourse", chatRoom);
			}

	});

	socket.on("foundOrganizations", function(data){
		//chatRoom = data;		
		$("#dropDownContainer ul").html("");
		console.log(data);
		for(var i = 0; i < data.org.length; i++){
			$("#dropDownContainer ul").append("<li class='list-group-item'>" + data.org[i] + "</li>");

		}
	});


	socket.on("foundCourse", function(data){
		//chatRoom = data;		
		$("#dropDownContainer ul").html("");
		console.log(data);
		for(var i = 0; i < data.course.length; i++){
			$("#dropDownContainer ul").append("<li class='list-group-item'>" + data.course[i] + "</li>");

		}
	});

	$("#dropDownContainer li").on('click',function(e){

		if (chatRoom.org == "" || chatRoom.org instanceof Array) {
		chatRoom.setOrg($(this).html());

		} else if(chatRoom.course == "" || chatRoom.course instanceof Array) {
					chatRoom.setCourse($(this).html());

		} else if(chatRoom.tutor == "" || chatRoom.tutor instanceof Array) {
					chatRoom.setTutor($(this).html());

		} else { // chat / start_time
			chatRoom.setStartTime($(this).html());
		}
		$(".middleInput").val("");
		$("#chosenHierarchy ul").append("<li class='list-group-item'>" + $(this).html() + "</li>");

		$("#dropDownContainer ul").html("");
	});

	// PICKADATE
	$("#dob").pickadate({
		format: 'mm/dd/yyyy',
		formatSubmit: 'mm/dd/yyyy',
		hiddenName: true
	});

});