
var http = require("http")

var PgConnection = (function () {
    var pg = require("pg")
    pg.defaults.poolSize = 25;

    var port = (process.env.VCAP_APP_PORT || 5432);
    var host = (process.env.VCAP_APP_HOST || '127.0.0.1');

    var tables = {
        organization : 'id serial NOT NULL PRIMARY KEY, name character varying UNIQUE NOT NULL',
        course       : 'id serial NOT NULL PRIMARY KEY, org_id int NOT NULL REFERENCES organization (id), name character varying NOT NULL, UNIQUE (org_id, name)',
        tutor        : 'id serial NOT NULL PRIMARY KEY, org_id int NOT NULL REFERENCES organization (id), course_id int NOT NULL REFERENCES course (id), name character varying NOT NULL, UNIQUE (org_id, course_id, name)',
        chat         : 'id serial NOT NULL PRIMARY KEY, org_id int NOT NULL REFERENCES organization (id), course_id int NOT NULL REFERENCES course (id), tutor_id int NOT NULL REFERENCES tutor (id), start_time timestamp with time zone NOT NULL, UNIQUE (org_id, course_id, tutor_id, start_time)'
    }
    if (process.env.VCAP_SERVICES) {
      var env = JSON.parse(process.env.VCAP_SERVICES);
      var credentials = env['postgresql-9.1'][0]['credentials'];
      console.log("using ENV VCAP_SERVICES")
    } else {
      var pg_pass = process.env.PG_PASSWORD
      console.log("using ENV PG_PASSWORD")
      var credentials = {"uri":"postgre://postgres:"+pg_pass+"@localhost:5432/chat"}
    }

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
        this.Chat = {

        }
        this.find = function(table, obj) {
            var qry;
            switch (table) {
                case 1: // course
                    qry = "SELECT * FROM public.course WHERE NAME LIKE '%"+obj.course+"%';"; 
                    break;
                case 2: // tutor
                    qry = "SELECT * FROM public.tutor WHERE NAME LIKE '%"+obj.tutor+"%';"; 
                    break;
                case 3:  // chat -- select stuff from *today*
                    qry = "SELECT EXTRACT(EPOCH FROM start_time AT TIME ZONE 'UTC')::int AS start_time FROM chat where start_time > current_date;"; 
                    break;
                default: // org
                    qry = "SELECT * FROM public.organization WHERE NAME LIKE '%"+obj.org+"%';"; 
            }
            _doQuery(qry, function(result) { return result; })
        }
        this.create = function(table, obj) {
            var qry;
            switch (table) {
                case 1:
                    qry = "INSERT INTO public.course (org_id, name) VALUES (\
                        (SELECT id FROM public.organization WHERE NAME LIKE '%"+obj.org+"%'), \
                        '"+obj.course+"');"
                    break;
                case 2:
                    qry = "INSERT INTO public.tutor (org_id, course_id, name) VALUES (\
                        (SELECT id FROM public.organization WHERE NAME LIKE '%"+obj.org+"%'), \
                        (SELECT id FROM public.course WHERE NAME LIKE '%"+obj.course+"%'), \
                        '"+obj.tutor+"');"
                    break;
                case 3:
                    qry = "INSERT INTO public.chat (org_id, course_id, tutor_id, start_time) VALUES (\
                        (SELECT id FROM public.organization WHERE NAME LIKE '%"+obj.org+"%'), \
                        (SELECT id FROM public.course WHERE NAME LIKE '%"+obj.course+"%'), \
                        (SELECT id FROM public.tutor WHERE NAME LIKE '%"+obj.tutor+"%'), \
                        to_timestamp("+obj.start_time+"/1000.));"
                    break;
                default:
                    qry = "INSERT INTO public.organization (name) VALUES ('"+obj.org+"');"
            }
            _doQuery(qry, function(result) { return result; })
        }
    }

    var _doQuery = function _doQuery(qry, callback) {
        pg.connect(credentials.uri, function(err, client, done) {
            console.log(qry);
            var query = client.query(qry, function(err, result) {
                if (err) { console.log("Error running query: " + err); }
                console.log(">" + qry + "\n>>");
                console.log(result);
                if (callback != null)
                    callback(result);
                done();
            });
        });
    }
    return ctor;
})();



var conn;

var server = http.createServer(function(req, res) {
    var Chat = module.require("./Chat.js")
    var chatRoom = new Chat("Mainz", "Hac", "P", ""+new Date().getTime());
    console.log(chatRoom);
    // conn.create(conn.tables.ORGANIZATION, chatRoom);
    // conn.create(conn.tables.COURSE, chatRoom);
    // conn.create(conn.tables.TUTOR, chatRoom);
    // conn.create(conn.tables.CHAT, chatRoom);


    res.end(conn.find(conn.tables.ORGANIZATION, chatRoom));
    res.end(conn.find(conn.tables.COURSE, chatRoom));
    res.end(conn.find(conn.tables.TUTOR, chatRoom));
    res.end(conn.find(conn.tables.CHAT, chatRoom));
});


server.on('listening',function(){
    console.log('ok, server is running');
    conn = new PgConnection();
    conn.setup();
    console.log("done generating tables");
});

server.listen(8080);