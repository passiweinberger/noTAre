var express = require('express'),
	app = express(),
	http = require('http').Server(app), // .createServer(app)
	io = require('socket.io')(http), // .listen(http)
	npid = require("npid"),
	uuid = require('node-uuid'),
	Room = require('serverJS/room.js'),
	Chat = require('serverJS/Chat.js'),
	PgConnection = require('serverJS/pgconnection.js'),
	pgConn = new PgConnection(),
	//, cfEnv = require("cf-env")
	_ = require('underscore')._;

app.configure(function () {
	app.set('port', process.env.PORT || 3000); // process.env.CF_INSTANCE_PORT
	app.set('ipaddr', process.env.VCAP_APP_HOST || "127.0.0.1"); // process.env.CF_INSTANCE_IP
	pgConn.setup();
	app.use(express.bodyParser());
	app.use(express.methodOverride());
	app.use(express.static(__dirname + '/public'));
	app.use('/components', express.static(__dirname + '/components'));
	app.use('/js', express.static(__dirname + '/js'));
	app.use('/icons', express.static(__dirname + '/icons'));
	app.set('views', __dirname + '/views');
	app.engine('html', require('ejs').renderFile);
});

app.get('/', function (req, res) {
	res.render('index.html');
});



/*var pgConn = new PgConnection();

var chatRoom = new Chat("Mainz", "Hac", "P", "" + new Date().getTime());

console.log(pgConn.find(pgConn.tables.ORGANIZATION, chatRoom));

app.get('/organization/:obj', function (req, res) {
	res.json(pgConn.find(pgConn.tables.ORGANIZATION, req.params.obj));
});
*/

http.listen(app.get('port'), function () { // app.get('ipaddr'), // server.listen(...)
	console.log('Express server listening on  IP: ' + ' and port ' + app.get('port')); // app.get('ipaddr') +
});

io.set("log level", 1);
var people = {};
var rooms = {};
var sockets = [];
var chatHistory = {};

function purge(s, action) {
	if (people[s.id].inroom) { //user is in a room
		var room = rooms[people[s.id].inroom]; //check which room user is in.
		if (action === "disconnect") { // leaves the entire platform
			io.sockets.emit("update", people[s.id].name + " hat die Vorlesung verlassen!");
			if (_.contains((room.people), s.id)) {
				var personIndex = room.people.indexOf(s.id);
				room.people.splice(personIndex, 1);
				s.leave(room.name);
			}
			delete people[s.id];
			sizePeople = _.size(people);
			io.sockets.emit("update-people", {
				people: people,
				count: sizePeople
			});
			var o = _.findWhere(sockets, {
				'id': s.id
			});
			sockets = _.without(sockets, o);
		} else if (action === "leaveRoom") { // leaves only the current lecture
			if (_.contains((room.people), s.id)) {
				var personIndex = room.people.indexOf(s.id);
				room.people.splice(personIndex, 1);
				people[s.id].inroom = null;
				io.sockets.emit("update", people[s.id].name + " hat die Vorlesung verlassen!");
				s.leave(room.name);
			}
		}
		if (room.people.length === 1) { // cleanup when last one goes:
			room.people = _.without(room.people, s.id); // remove people from the room:people{}collection
			delete chatHistory[room.name]; // delete the chat history cache
			delete room; // delete room
			sizePeople = _.size(people);
			sizeRooms = _.size(rooms);
			io.sockets.emit("update-people", {
				people: people,
				count: sizePeople
			});
			io.sockets.emit("roomList", {
				rooms: rooms,
				count: sizeRooms
			});
		}
	} else {
		//The user isn't in a room, but maybe he just disconnected, handle the scenario:
		if (action === "disconnect") {
			io.sockets.emit("update", people[s.id].name + " hat jetzt Feierabend :)");
			delete people[s.id];
			sizePeople = _.size(people);
			io.sockets.emit("update-people", {
				people: people,
				count: sizePeople
			});
			var o = _.findWhere(sockets, {
				'id': s.id
			});
			sockets = _.without(sockets, o);
		}
	}
}


io.sockets.on("connection", function (socket) {

	socket.on("joinserver", function (name, device) {
		var exists = false;

		_.find(people, function (key, value) {
			if (key.name.toLowerCase() === name.toLowerCase()) {
				return exists = true;
			}
		});
		if (exists) { //provide unique username:
			var randomNumber = Math.floor(Math.random() * 1001)
			do {
				if (randomNumber % 2 === 0) {
					proposedName = name + 'BOSS';
				} else {
					proposedName = name + randomNumber;
				}
				_.find(people, function (key, value) {
					if (key.name.toLowerCase() === proposedName.toLowerCase())
						return exists = true;
				});
			} while (!exists);
			socket.emit("exists", {
				msg: "The username already exists, please pick another one.",
				proposedName: proposedName
			});
		} else {
			people[socket.id] = {
				"name": name,
				"inroom": inRoomID,
				"device": device
			};
			socket.emit("update", "You have connected to the server.");
			io.sockets.emit("update", people[socket.id].name + " is online.")
			sizePeople = _.size(people);
			sizeRooms = _.size(rooms);
			io.sockets.emit("update-people", {
				people: people,
				count: sizePeople
			});
			socket.emit("roomList", {
				rooms: rooms,
				count: sizeRooms
			});
			socket.emit("joined"); //extra emit for GeoLocation
			sockets.push(socket);
		}
	});

	socket.on("getOnlinePeople", function (fn) {
		fn({
			people: people
		});
	});

// --- postgres backend

	// organization
	socket.on("findOrganization", function (obj) {
		console.log(obj);
		console.log("socket emit = ");
		console.log(socket.emit);
		pgConn.find(
			pgConn.tables.ORGANIZATION, 
			obj,
			socket
		);
	});
	socket.on("selectOrganization", function (obj) {
		// SET LOCAL OBJECT FOR USER
	});
	socket.on("createOrganization", function (obj) {
		pgConn.create(
			pgConn.tables.ORGANIZATION, 
			obj,
			socket
		);
	});

	// course
	socket.on("findCourse", function (obj) {
		pgConn.find(
			pgConn.tables.COURSE, 
			obj,
			socket	
		);
	});
	socket.on("selectCourse", function (obj) {

	});
	socket.on("createCourse", function (obj) {
		pgConn.create(
			pgConn.tables.COURSE, 
			obj,
			socket
		);
	});

	// tutor
	socket.on("findTutor", function (obj) {
		pgConn.find(
			pgConn.tables.TUTOR, 
			obj,
			socket
		);
	});
	socket.on("selectTutor", function (obj) {

	});
	socket.on("createTutor", function (obj) {
		pgConn.create(
			pgConn.tables.TUTOR, 
			obj,
			socket
		);
	});

	// chat
	socket.on("findChat", function (obj) {
		pgConn.find(
			pgConn.tables.CHAT, 
			obj,
			socket
		);
	});
	socket.on("selectChat", function (obj) {

	});
	socket.on("createChat", function (obj) {
		pgConn.create(
			pgConn.tables.CHAT, 
			obj,
			socket
		);
	});
// --- EOF postgres backend

	socket.on("countryUpdate", function (data) { // we know which country the user is from
		country = data.country.toLowerCase();
		people[socket.id].country = country;
		io.sockets.emit("update-people", {
			people: people,
			count: sizePeople
		});
	});

	socket.on("typing", function (data) {
		if (typeof people[socket.id] !== "undefined")
			io.sockets.in(socket.room).emit("isTyping", {
				isTyping: data,
				person: people[socket.id].name
			});
	});

	socket.on("send", function (msTime, msg) {
		//process.exit(1);
		var re = /^[w]:.*:/;
		var whisper = re.test(msg.message);
		var whisperStr = msg.message.split(":");
		var found = false;
		if (whisper) {
			var whisperTo = whisperStr[1];
			var keys = Object.keys(people);
			if (keys.length != 0) {
				for (var i = 0; i < keys.length; i++) {
					if (people[keys[i]].name === whisperTo) {
						var whisperId = keys[i];
						found = true;
						if (socket.id === whisperId) { //can't whisper to ourselves
							socket.emit("update", "You can't whisper to yourself.");
						}
						break;
					}
				}
			}
			if (found && socket.id !== whisperId) {
				var whisperTo = whisperStr[1];
				var whisperMsg = whisperStr[2];
				socket.emit("whisper", {
					name: "You"
				}, whisperMsg);
				io.sockets.socket(whisperId).emit("whisper", msTime, people[socket.id], whisperMsg);
			} else {
				socket.emit("update", "Can't find " + whisperTo);
			}
		} else {
			if (io.sockets.manager.roomClients[socket.id]['/' + socket.room] !== undefined) {
				io.sockets.in(socket.room).emit("chat", msTime, people[socket.id], msg);
				socket.emit("isTyping", false);
				chatHistory[socket.room].push(people[socket.id].name + ": " + msg.message);
			} else {
				socket.emit("update", "Please connect to a room.");
			}
		}
	});

	socket.on("disconnect", function () {
		if (typeof people[socket.id] !== "undefined") { //this handles the refresh of the name screen
			purge(socket, "disconnect");
		}
	});

	//Room functions
	socket.on("createRoom", function (name) {

		if (people[socket.id].inroom) {
			socket.emit("update", "Du bist noch in einer Vorlesung! Bitte Verlasse diese zuerst:" + _.contains((room.people), socket.id));
		}
		var id = uuid.v4();
		var room = new Room(name, id);
		rooms[id] = room;
		sizeRooms = _.size(rooms);
		io.sockets.emit("roomList", {
			rooms: rooms,
			count: sizeRooms
		});
		//add room to socket, and auto join the creator of the room
		socket.room = name;
		socket.join(socket.room);
		people[socket.id].inroom = id;
		room.addPerson(socket.id);
		socket.emit("update", "Willkommen in der Vorlesung " + room.name + "!");
		socket.emit("sendRoomID", {
			id: id
		});
		chatHistory[socket.room] = [];
	});

	socket.on("check", function (name, fn) {
		var match = false;
		_.find(rooms, function (key, value) {
			if (key.name === name)
				return match = true;
		});
		fn({
			result: match
		});
	});

	// download files: TODO
	//socket.on('download', function(roomID) {
	//});

	socket.on("joinRoom", function (id) {
		if (typeof people[socket.id] !== "undefined") {
			var room = rooms[id];
				if (_.contains((room.people), socket.id)) {
					socket.emit("update", "You have already joined this room.");
				} else {
					if (people[socket.id].inroom !== null) {
						socket.emit("update", "You are already in a room (" + rooms[people[socket.id].inroom].name + "), please leave it first to join another room.");
					} else {
						room.addPerson(socket.id);
						people[socket.id].inroom = id;
						socket.room = room.name;
						socket.join(socket.room);
						user = people[socket.id];
						io.sockets.in(socket.room).emit("update", user.name + " hat die Vorlesung " + room.name + " betreten!");
						socket.emit("update", "Willkommen in " + room.name + "!");
						socket.emit("sendRoomID", {
							id: id
						});
						var keys = _.keys(chatHistory);
						if (_.contains(keys, socket.room)) {
							socket.emit("history", chatHistory[socket.room]);
						}
					}
				}
		} else {
			socket.emit("update", "Bitte gebe zunächst einen gültigen username ein!");
		}
	});

	socket.on("leaveRoom", function (id) {
		var room = rooms[id];
		if (room) {
			purge(socket, "leaveRoom");
		}
	});
	/*
	socket.on("whichRoom", function (id) {
		var room = rooms[id];
		if (room) {
			socket.emit("yourRoom", room);
		} else {
			socket.emit("yourRoom", false);
		}
	});
	*/
});