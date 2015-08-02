var http = require("http");

var PgConnection = (function () {

// --------------- setup/preparation ----------------

    var pg = require("pg")
    pg.defaults.poolSize = 25;

    var port = (process.env.VCAP_APP_PORT || 5432);
    var host = (process.env.VCAP_APP_HOST || '127.0.0.1');

    var tables = {
        organization : 'id serial NOT NULL PRIMARY KEY, name character varying UNIQUE NOT NULL',
        course       : 'id serial NOT NULL PRIMARY KEY, org_id int NOT NULL REFERENCES organization (id), name character varying NOT NULL, UNIQUE (org_id, name)',
        tutor        : 'id serial NOT NULL PRIMARY KEY, course_id int NOT NULL REFERENCES course (id), name character varying NOT NULL, UNIQUE (course_id, name)',
        chat         : 'id serial NOT NULL PRIMARY KEY, tutor_id int NOT NULL REFERENCES tutor (id), start_time timestamp with time zone NOT NULL, UNIQUE (tutor_id, start_time)',
        logs         : 'id serial NOT NULL PRIMARY KEY, chat_id int NOT NULL REFERENCES chat (id), language CHARACTER(3) NOT NULL, data BYTEA NOT NULL, UNIQUE (chat_id, language, data)'
    };
    if (process.env.VCAP_SERVICES) {
      var env = JSON.parse(process.env.VCAP_SERVICES);
      var credentials = env['postgresql-9.1'][0]['credentials'];
      console.log("PGCONN: using ENV VCAP_SERVICES");
    } else {
      var pg_pass = process.env.PG_PASSWORD // SET ENV VARIABLE: PG_PASSWORD
      var credentials = {"uri":"postgre://postgres:"+pg_pass+"@localhost:5432"};
      console.log("PGCONN: using ENV PG_PASSWORD");
    }
    // TODO: Do not hardcode!
    var credentials = {
        "name": "d907dffef42a841c38ed614b74dfa1222",
        "host": "198.11.228.49",
        "hostname": "198.11.228.49",
        "port": 5433,
        "user": "u58582e3d10e64b77b9fb592716fa5f0b",
        "username": "u58582e3d10e64b77b9fb592716fa5f0b",
        "password": "p6224abe03188461991371520ff4dc304",
        "uri": "postgres://u58582e3d10e64b77b9fb592716fa5f0b:p6224abe03188461991371520ff4dc304@198.11.228.49:5433/d907dffef42a841c38ed614b74dfa1222"
      };

// --------------- methods -------------

    var ctor = function() {


        this.setup = function() {
            for (table in tables) {
                _doQuery('CREATE TABLE IF NOT EXISTS public.'+table+' ('+tables[table]+');');
            }
        }


        this.tables = {
            ORGANIZATION : 0,
            COURSE       : 1,
            TUTOR        : 2,
            CHAT         : 3
        }


        this.find = function(table, obj, callback) {
            var qry;
            switch (table) {
                case 1: // course
                    qry = "SELECT * FROM public.course WHERE LOWER(name) LIKE LOWER('%"+obj.course+"%') AND org_id = \
                    (SELECT id FROM public.organization WHERE name = '"+obj.org+"');"; 
                    break;
                case 2: // tutor
                    qry = "SELECT * FROM public.tutor WHERE LOWER(name) LIKE LOWER('%"+obj.tutor+"%') AND course_id = \
                    (SELECT id FROM public.course WHERE name = '"+obj.course+"' AND org_id = \
                        (SELECT id FROM public.organization WHERE name = '"+obj.org+"')\
                    );"; 
                    break;
                case 3:  // chat -- select stuff from *today*
                    qry = "SELECT EXTRACT(EPOCH FROM start_time AT TIME ZONE 'UTC')*1000::int AS start_time FROM chat where start_time > current_date AND tutor_id = \
                    (SELECT id FROM public.tutor WHERE name = '"+obj.tutor+"' AND course_id = \
                        (SELECT id FROM public.course WHERE name = '"+obj.course+"' AND org_id = \
                            (SELECT id FROM public.organization WHERE name = '"+obj.org+"')\
                        )\
                    );"; 
                    break;
                default: // org
                    qry = "SELECT * FROM public.organization WHERE LOWER(name) LIKE LOWER('%"+obj.org+"%');"; 
            }
            _doQuery(qry, table, obj, callback);
        }


        this.create = function(table, obj, callback) {
            var qry;
            switch (table) {
                case 1:
                    qry = "INSERT INTO public.course (org_id, name) VALUES (\
                        (SELECT id FROM public.organization WHERE name = '"+obj.org+"'), \
                        '"+obj.course+"');"
                    break;
                case 2:
                    qry = "INSERT INTO public.tutor (course_id, name) VALUES (\
                            (SELECT id FROM public.course WHERE name = '"+obj.course+"' AND org_id = \
                                (SELECT id FROM public.organization WHERE name = '"+obj.org+"')\
                            ), \
                        '"+obj.tutor+"');"
                    break;
                case 3:
                    qry = "INSERT INTO public.chat (tutor_id, start_time) VALUES (\
                        (SELECT id FROM public.tutor WHERE name = '"+obj.tutor+"' AND course_id = \
                            (SELECT id FROM public.course WHERE name = '"+obj.course+"' AND org_id = \
                                (SELECT id FROM public.organization WHERE name = '"+obj.org+"')\
                            ), \
                        ), \
                        to_timestamp("+obj.start_time+"/1000.));"
                    break;
                default:
                    qry = "INSERT INTO public.organization (name) VALUES ('"+obj.org+"');"
            }
            _doQuery(qry, table, obj, callback);
        }

        this.saveLog = function(obj, language, logObject) {
            _doQuery("INSERT INTO logs (chat_id, language, data) VALUES ("+language+", "+logObject+")");
        }

        this.getLog = function(obj, language, callback) {
            _doQuery("SELECT * FROM logs WHERE language = '"+language+"' AND chat_id = \
                (SELECT id FROM chat WHERE date_trunc('hour', start_time) = date_trunc('hour', to_timestamp("+obj.start_time+"/1000.)) AND tutor_id = \
                    (SELECT id FROM public.tutor WHERE name = '"+obj.tutor+"' AND course_id = \
                        (SELECT id FROM public.course WHERE name = '"+obj.course+"' AND org_id = \
                            (SELECT id FROM public.organization WHERE name = '"+obj.org+"')\
                        )\
                    )\
                );", "logs", obj, callback);
        }
    }



/*
SELECT * FROM logs WHERE language = '000' AND chat_id = 
                (SELECT id FROM chat WHERE date_trunc('hour', start_time) = date_trunc('hour', to_timestamp(1438427188300/1000.)) AND tutor_id = 
                    (SELECT id FROM public.tutor WHERE name = 'Peter' AND course_id = 
                        (SELECT id FROM public.course WHERE name = 'Hackathon' AND org_id = 
                            (SELECT id FROM public.organization WHERE name = 'Uni Mainz')
                        )
                    )
                );*/

// -------------- helper functions ----------------

    var _doQuery = function _doQuery(qry, table, obj, callback) {
        pg.connect(credentials.uri + '/notare', function(err, client, done) {
            console.log(qry);
            var query = client.query(qry, function(err, result) {
                if (err) { console.log("PGCONN: Error running query: " + err); }
                //console.log(">" + qry + "\n>>");
                //console.log(result);
                _parse(table, result, obj, callback);
                done();
            });
        });
    }

    var _parse = function _parse(table, dbObject, obj, callback) {
        // console.log("$ PARSE CALLED for " + table);
        // console.log(obj)
        // console.log("callback = ")
        // console.log(callback)
        // console.log("dbObj = ")
        // console.log(dbObject)
        var ret  = [];
        var emitTo;
        try {
            switch (table) {
                case 0: // org
                    emitTo = "foundOrganizations";
                    for (var i = 0, l = dbObject.rows.length; i < l; i++) {
                        console.log("pushing: ");
                        console.log(dbObject.rows[i]['name']);
                        ret.push(dbObject.rows[i]['name']); 
                    }
            console.log("RET = ");
            console.log(ret);
                    obj.org = ret;
                    break;
                case 1: // course
                    emitTo = "foundCourses";
                    for (var i = 0, l = dbObject.rows.length; i < l; i++) {
                        ret.push(dbObject.rows[i]['name']); 
                    }
                    obj.course = ret;
                    break;
                case 2: // tutor
                    emitTo = "foundTutors";
                    for (var i = 0, l = dbObject.rows.length; i < l; i++) {
                        ret.push(dbObject.rows[i]['name']); 
                    }
                    obj.tutor = ret;
                    break;
                case 3:  // chat -- select stuff from *today*
                    emitTo = "foundChats";
                    for (var i = 0, l = dbObject.rows.length; i < l; i++) {
                        ret.push(dbObject.rows[i]['start_time']); 
                    }
                    obj.start_time = ret;
                    break;
                default: // logs
                    for (var i = 0, l = dbObject.rows.length; i < l; i++) {
                        ret.push(dbObject.rows[i]['data']); 
                    }
                    break;
            }
            if (typeof ret !== 'undefined' && ret.length > 0) {
                console.log("PGCONN: PARSED")
                console.log(ret);
            }
            //console.log("$ callback != 'undefined' && callback != null (" + (callback != 'undefined' && callback != null) + ") - " + (callback != 'undefined' && callback != null ? "calling with result" : "doing nothing"));
            if (callback != 'undefined' && callback != null) {
                console.log("emit to " + emitTo + " obj: ")//callback(emitTo, obj);
                console.log(obj);
                callback.emit(emitTo, obj);
            }
        } catch (err) { console.log(err); }

        return ret;
    }


    return ctor;

})();

module.exports = PgConnection;

/*



var conn;

var server = http.createServer(function(req, res) {
    var Chat = module.require("./Chat.js")
    var chatRoom = new Chat("Mai", "Hac", "P", ""+new Date().getTime());
    console.log(chatRoom);
    // conn.create(conn.tables.ORGANIZATION, chatRoom);
    // conn.create(conn.tables.COURSE, chatRoom);
    // conn.create(conn.tables.TUTOR, chatRoom);
    // conn.create(conn.tables.CHAT, chatRoom);


    res.end(conn.find(conn.tables.ORGANIZATION, chatRoom));
    chatRoom.setOrg('Uni Mainz');
    res.end(conn.find(conn.tables.COURSE, chatRoom));
    chatRoom.setCourse('Hackathon');
    res.end(conn.find(conn.tables.TUTOR, chatRoom));
    chatRoom.setTutor('Peter');
    res.end(conn.find(conn.tables.CHAT, chatRoom));
    console.log("=====================================");
    conn.getLog(chatRoom, '000')
    res.end(conn.find(conn.tables.ORGANIZATION, new Chat("b")));
});


server.on('listening',function(){
    console.log('ok, server is running');
    conn = new PgConnection();
    conn.setup();
    console.log("done generating tables");
});

server.listen(8080);
*/