/* HTML5 magic
- GeoLocation
- WebSpeech
*/

//WebSpeech API
var final_transcript = '';
var recognizing = false;
var lastmessages = []; // to be populated later
var db, remoteCouch;

//IMPORTANT: CONFIGURE remoteCouch with your own details
var cloudant_url = "https://64abe65d-f33f-4b7d-bec3-7f3b3de2eb47-bluemix:913734c81dfef3dc517d303f0ede2aaf995d6e6e8df08aeeb5438b41ffc8912d@64abe65d-f33f-4b7d-bec3-7f3b3de2eb47-bluemix.cloudant.com/";
// var remoteCouch = cloudant_url + roomID;

var syncDom = document.getElementById('sync-wrapper');
//var newChatName = document.getElementById('chat-name');
//var newChatMessage = document.getElementById('chat-message');
//var addMessageButton = document.getElementById('new-message-button'); 

function makeCouchDB(lectureID) {
  db = new PouchDB(lectureID);
  remoteCouch = cloudant_url + lectureID + '';
  db.info(function(err, info) {
      /*
      db.changes({
          since: info.update_seq,
          continuous: true,
          onChange: readMessages
      });
      */
  });
  if (remoteCouch) {
    sync();
  }
}
function syncError() {
      console.log('data-sync-error');
      syncDom.setAttribute('data-sync-state', 'error');
} 
function sync() {
      syncDom.setAttribute('data-sync-state', 'syncing');
      var opts = {continuous: true, complete: syncError};
      db.replicate.to(remoteCouch, opts);
      db.replicate.from(remoteCouch, opts);
}

function exportToCsv(filename, rows) {
        // var msgObj = 'At' + nowTime + ' by ' + $("#name") + ': ' + msg;
        var processRow = function (row) {
            var finalVal = '';
            for (var j = 0; j < row.length; j++) {
                var innerValue = row[j] === null ? '' : row[j].toString();
                //if (row[j] instanceof Date) {
                //    innerValue = row[j].toLocaleString();
                //};
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

        var blob = new Blob([csvFile], { type: 'text/csv;charset=utf-8;' });
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
  db.allDocs({include_docs: true, descending: true}, function(err, doc) {
    if (!err) {
      // write messages to file: TODO
      var filename = '' + roomName + '.csv';
      // var msgObj = 'At' + nowTime + ' by ' + $("#name") + ': ' + msg;
      exportToCsv(filename, doc.rows);
    } else {
      console.log(err);
    }
  });
}

function readMessages() {
  db.allDocs({include_docs: true, descending: true}, function(err, doc) {
    redrawUI(doc.rows);
  });
}


function redrawChat(messages) {
    var ul = document.getElementById('msgs');
    ul.innerHTML = '';
    messages.forEach(function(message) {
        var li=document.createElement("li");
        var pName = document.createElement("p");
        var pMessage = document.createElement("p");

        pName.textContent = message.doc.name;
        pMessage.textContent = message.doc.content;
        pName.className = "text-danger";

        li.appendChild(pName);
        li.appendChild(pMessage);
        li.className = "list-group-item";
        ul.appendChild(li);
    });
}


if (!('webkitSpeechRecognition' in window)) {
  console.log("webkitSpeechRecognition is not available");
} else {
  var recognition = new webkitSpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;

  recognition.onstart = function() {
    recognizing = true;
  };

  recognition.onresult = function(event) {
    var interim_transcript = '';
    for (var i = event.resultIndex; i < event.results.length; ++i) {
      if (event.results[i].isFinal) {
        final_transcript += event.results[i][0].transcript;
        $('#msg').addClass("final");
        $('#msg').removeClass("interim");
      } else {
        interim_transcript += event.results[i][0].transcript;
        $("#msg").val(interim_transcript);
        $('#msg').addClass("interim");
        $('#msg').removeClass("final");
      }
    }
    $("#msg").val(final_transcript);
    };
  }

  function startButton(event) {
    if (recognizing) {
      recognition.stop();
      recognizing = false;
      $("#start_button").prop("value", "Record");
      return;
    }
    final_transcript = '';
    recognition.lang = "en-GB"
    recognition.start();
    $("#start_button").prop("value", "Recording ... Click to stop.");
    $("#msg").val();
  }
//end of WebSpeech

/*
Functions
*/
function toggleNameForm() {
   $("#login-screen").toggle();
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
      xhrFields: { withCredentials: true }, 
      type: "GET", 
      error: errorHandler, 
      complete: completeHandler 
    }).done(func); 
}
function errorHandler(jqXHR, textStatus, errorThrown) {
  console.log(errorThrown);
  //$.JSONView(jqXHR, $('#output-data'));
}
function completeHandler(jqXHR, textStatus, errorThrown) {
  console.log(errorThrown)
  //$.JSONView(jqXHR, $('#output-data'));
}

/*
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

$(document).ready(function() {
  // setup "global" variables first
  var socket =  io(); // io.connect("{0}:{1}".format(process.env.VCAP_APP_HOST, process.env.PORT)); // process.env.CF_INSTANCE_ADDR // "75.126.81.66:3000" or for local runs: 127.0.0.1:3000
  var myRoomID = null;

  $("form").submit(function(event) {
    event.preventDefault();
  });

  $("#conversation").bind("DOMSubtreeModified",function() {
    $("#conversation").animate({
        scrollTop: $("#conversation")[0].scrollHeight
      });
  });

  $("#main-chat-screen").hide();
  $("#errors").hide();
  $("#name").focus();
  $("#join").attr('disabled', 'disabled'); 
  
  if ($("#name").val() === "") {
    $("#join").attr('disabled', 'disabled');
  }

  //enter screen
  $("#nameForm").submit(function() {
    var name = $("#name").val();
    var device = "desktop";
    if (navigator.userAgent.match(/Android|BlackBerry|iPhone|iPad|iPod|Opera Mini|IEMobile/i)) {
      device = "mobile";
    }
    if (name === "" || name.length < 2) {
      $("#errors").empty();
      $("#errors").append("Please enter a name");
      $("#errors").show();
    } else {
      socket.emit("joinserver", name, device);
      toggleNameForm();
      toggleChatWindow();
      $("#msg").focus();
    }
  });

  $("#name").keypress(function(e){
    var name = $("#name").val();
    if(name.length < 2) {
      $("#join").attr('disabled', 'disabled'); 
    } else {
      $("#errors").empty();
      $("#errors").hide();
      $("#join").removeAttr('disabled');
    }
  });

  //main chat screen
  $("#chatForm").submit(function() {
    if (myRoomID !== null) {
      var msg = $("#msg").val();
      if (msg !== "") {
        var nowTime = new Date().getTime();
        socket.emit("send", nowTime, msg);
        // insert to couchDB: TODO
        var msgObj = 'At' + nowTime + ' by ' + $("#name") + ': ' + msg;
            db.put(msgObj, function callback(err, result) {
            if (!err) {
              console.log('Successfully uploaded to couchDB!');
              //$.JSONView(result, $("#output-resp"));
            } else {
              console.log(err);
            }
        });
        $("#msg").val("");
      }
    } else {
      $("#errors").empty();
      $("#errors").show();
      $("#errors").append("You have to be in a session to chat!");
      $("#createRoom").show();
    }
  });

  //'is typing' message
  var typing = false;
  var timeout = undefined;

  function timeoutFunction() {
    typing = false;
    socket.emit("typing", false);
  }

  $("#msg").keypress(function(e){
    if (e.which !== 13) {
      if (myRoomID !== null && $("#msg").is(":focus")) {
        typing = true;
        socket.emit("typing", true);
      } else {
        clearTimeout(timeout);
        timeout = setTimeout(timeoutFunction, 5000);
      }
    }
  });

  socket.on("isTyping", function(data) {
    if (data.isTyping) {
      if ($("#"+data.person+"").length === 0) {
        $("#updates").append("<li id='"+ data.person +"'><span class='text-muted'><small><i class='fa fa-keyboard-o'></i> " + data.person + " is typing.</small></li>");
        timeout = setTimeout(timeoutFunction, 5000);
      }
    } else {
      $("#"+data.person+"").remove();
    }
  });

  $("#showCreateRoom").click(function() {
    $("#createRoomForm").toggle();
  });

  $("#createRoomBtn").click(function() {
    var roomExists = false;
    var roomName = $("#createRoomName").val();
    //if (check(roomName)) {
      socket.emit("check", roomName, function(data) {
        roomExists = data.result;
         if (roomExists) {
            $("#errors").empty();
            $("#errors").show();
            $("#errors").append("Session <i>" + roomName + "</i> already currently runs, please join it!");
          } else {      
          if (roomName.length > 0) { //also check for roomname
            makeCouchDB(roomName);
            socket.emit("createRoom", roomName);
            $("#errors").empty();
            $("#errors").hide();
            }
          }
    });
    //}
  });

  $("#rooms").on('click', '.joinRoomBtn', function() {
    var roomName = $(this).siblings("span").text();
    var roomID = $(this).attr("id");
    socket.emit("joinRoom", roomID);
  });

  $("#rooms").on('click', '.removeRoomBtn', function() {
    var roomName = $(this).siblings("span").text();
    var roomID = $(this).attr("id");
    socket.emit("removeRoom", roomID);
    $("#createRoom").show();
  }); 

  $("#leave").click(function() {
    var roomID = myRoomID;
    socket.emit("leaveRoom", roomID);
    $("#createRoom").show();
  });

  $("#download").click(function() {
    // download from couchDB: TODO
    downloadMessages(myRoomID);
  });

  $("#people").on('click', '.whisper', function() {
    var name = $(this).siblings("span").text();
    $("#msg").val("w:"+name+":");
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

//socket-y stuff
socket.on("exists", function(data) {
  $("#errors").empty();
  $("#errors").show();
  $("#errors").append(data.msg + " Try <strong>" + data.proposedName + "</strong>");
    toggleNameForm();
    toggleChatWindow();
});

socket.on("joined", function() {
  $("#errors").hide();
  if (navigator.geolocation) { //get lat lon of user
    navigator.geolocation.getCurrentPosition(positionSuccess, positionError, { enableHighAccuracy: true });
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
    //consult the yahoo service
    $.ajax({
      type: "GET",
      url: "http://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20geo.placefinder%20where%20text%3D%22"+lat+"%2C"+lon+"%22%20and%20gflags%3D%22R%22&format=json",
      dataType: "json",
       success: function(data) {
        socket.emit("countryUpdate", {country: data.query.results.Result.countrycode});
      }
    });
  }
});

socket.on("history", function(data) {
  if (data.length !== 0) {
    $("#msgs").append("<li><strong><span class='text-warning'>Last messages:</li>");
    $.each(data, function(data, msg) {
      $("#msgs").append("<li><span class='text-warning'>" + msg + "</span></li>");
    });
  } else {
    $("#msgs").append("<li><strong><span class='text-warning'>No past messages in this room.</li>");
  }
});

  socket.on("update", function(msg) {
    $("#msgs").append("<li>" + msg + "</li>");
  });

  socket.on("update-people", function(data){
    //var peopleOnline = [];
    $("#people").empty();
    $('#people').append("<li class=\"list-group-item active\">People online <span class=\"badge\">"+data.count+"</span></li>");
    $.each(data.people, function(a, obj) {
      if (!("country" in obj)) {
        html = "";
      } else {
        html = "<img class=\"flag flag-"+obj.country+"\"/>";
      }
      $('#people').append("<li class=\"list-group-item\"><span>" + obj.name + "</span> <i class=\"fa fa-"+obj.device+"\"></i> " + html + " <a href=\"#\" class=\"whisper btn btn-xs\">whisper</a></li>");
      //peopleOnline.push(obj.name);
    });

    ///*
    var whisper = $("#whisper").prop('checked');
    if (whisper) {
      $("#msg").typeahead({
          local: peopleOnline
      }).each(function() {
         if ($(this).hasClass('input-lg'))
              $(this).prev('.tt-hint').addClass('hint-lg');
      });
    }
    //*/
  });

  socket.on("chat", function(msTime, person, msg) {
    // up to couchDB
    $("#msgs").append("<li><strong><span class='text-success'>" + timeFormat(msTime) + person.name + "</span></strong>: " + msg + "</li>");
    //clear typing field
     $("#"+person.name+"").remove();
     clearTimeout(timeout);
     timeout = setTimeout(timeoutFunction, 0);
  });

  socket.on("whisper", function(msTime, person, msg) {
    if (person.name === "You") {
      s = "whisper"
    } else {
      s = "whispers"
    }
    $("#msgs").append("<li><strong><span class='text-muted'>" + timeFormat(msTime) + person.name + "</span></strong> "+s+": " + msg + "</li>");
  });

  socket.on("roomList", function(data) {
    $("#rooms").text("");
    $("#rooms").append("<li class=\"list-group-item active\">List of rooms <span class=\"badge\">"+data.count+"</span></li>");
     if (!jQuery.isEmptyObject(data.rooms)) { 
      $.each(data.rooms, function(id, room) {
        var html = "<button id="+id+" class='joinRoomBtn btn btn-default btn-xs' >Join</button>" + " " + "<button id="+id+" class='removeRoomBtn btn btn-default btn-xs'>Remove</button>";
        $('#rooms').append("<li id="+id+" class=\"list-group-item\"><span>" + room.name + "</span> " + html + "</li>");
      });
    } else {
      $("#rooms").append("<li class=\"list-group-item\">There are no rooms yet.</li>");
    }
  });

  socket.on("sendRoomID", function(data) {
    myRoomID = data.id;
  });

  socket.on("disconnect", function(){
    $("#msgs").append("<li><strong><span class='text-warning'>The server is not available</span></strong></li>");
    $("#msg").attr("disabled", "disabled");
    $("#send").attr("disabled", "disabled");
  });

});