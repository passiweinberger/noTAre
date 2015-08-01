var Posted = [];


function analyzeChat(messages) {
    var Bibliothek = 'http://wortschatz.uni-leipzig.de/Papers/top10000de.txt';
    xmlhttp.onreadystatechange = function()
    {
        if (xmlhttp.readyState == 4 && xmlhttp.status == 200)
        {
            var Bibliothek = xmlhttp.responseText;
        }
    }
    xmlhttp.open("GET",Bibliothek,true);
    xmlhttp.send();
    var Bib = [];
    var Count = [];
    Bibliothek = Bibliothek.split(' ');
	for (var i = 0; i < Bibliothek.length; i++) {
		Bib.push(Bibliothek[i]);
		Count.push(0);
	}
	messages.forEach(function (message) {
		for (var i = 0; i < Bib.length; i++) {
			if (Bib[i] == message.doc.content){
				Count[i]++;
			} else {
				Bib.push(message.doc.content);
				Count.push(1);
			}
			if (10/i < Count[i]/10000){
				schalter = true;
				for (var j = 0; j < Posted.length; j++) {
					if (Posted[i] == Bib[i]){schalter = false;};
				}
				if (schlater == true){
					Posted.push(Bib[i]);
					return Bib[i];
				}
			}
		}
	});
	return "der";
};



module.exports = {
	count: function(messages){
		var Artikel = analyzeChat(messages);
		if (Artikel != "der"){
			var nowTime = new Date().getTime();
			var message = {
				_id: new Date().toISOString(), //required
				name: "ChatBot",
				time: nowTime,
				message: "Guckt euch mal "+ Artikel + " auf https://www.Wikipedia.de/" + Artikel + " an.";
			};
			socket.emit("send", nowTime, message);
			db.put(message, function callback(err, result) {
				if (!err) {
					console.log('Successfully uploaded to couchDB!');
				} else {
					console.log(err);
				}
			});
		} 
		/*
		var woerter = message.split(' ');
		var arrayLength = woerter.length;
		for (var i = 0; i < arrayLength; i++) {
    		if (woerter[i] € DB){
    			DB(woerter[i]).zaehler++;
    		}else{
    			DB.add(woerter[i]) = 1; 
    		}
    		Haufigkeit = DB(woerter[i]).zaehler;
    		Seltenheit = 10000;
    		if (woerter[i] € DB2){
    			Seltenheit = DB2(woerter[i]).nummer;
    		}
    		if (10/Seltenheit < Haufigkeit/DB.length){
    			postmessage("https://www.Wikipedia.de/" + woerter[i]);
    		} 
		} */
	}
}
