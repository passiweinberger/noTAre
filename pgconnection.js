var pg = require("pg")
var http = require("http")

if (process.env.VCAP_SERVICES) {
  var env = JSON.parse(process.env.VCAP_SERVICES);
  var credentials = env['postgresql-9.1'][0]['credentials'];
} else {
  var pg_password = process.env.PG_PASSWORD
  var credentials = {"uri":"postgre://postgres:"+pg_password+"@localhost:5433/chat"}
}

var port = (process.env.VCAP_APP_PORT || 5432);
var host = (process.env.VCAP_APP_HOST || '127.0.0.1');

var tables = {
	organization : 'id serial PRIMARY KEY, name character varying UNIQUE',
	course		 : 'id serial PRIMARY KEY, org_id serial REFERENCES organization (id), name character varying, UNIQUE (org_id, name)',
	tutor 		 : 'id serial PRIMARY KEY, org_id serial REFERENCES organization (id), course_id REFERENCES course (id), name character varying, UNIQUE (org_id, course_id, name)',
	chat	     : 'id serial PRIMARY KEY, org_id serial REFERENCES organization (id), course_id REFERENCES course (id), tutor_id REFERENCES tutor (id), start_time timestamp with timezone, UNIQUE (org_id, course_id, tutor_id, name)'
}

var server = http.createServer(function(req, res) {
  var client = new pg.Client(credentials.uri);
  for (table in tables) {

  console.log("connecting to "+credentials.uri+", adding " + table)

	  client.connect(function(err) {
	    if (err) {
	      res.end("Could not connect to postgre: " + err);
	    }
	    client.query(
	    	'CREATE TABLE IF NOT EXISTS '+table+' ('+tables[table]+')', 
	    	function(err, result) {
	      if (err) {
	        res.end("Error running query: " + err);
	      }
	      res.end("PG Time: " + result.rows[0].pgTime);
	      client.end();
	    });
	  });
  }
}).listen(port, host);


server.on('listening',function(){
    console.log('ok, server is running');
});

server.listen(8080);