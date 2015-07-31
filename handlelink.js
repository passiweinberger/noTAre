// JavaScript - Methodenerweiterung der String-Klasse
// String s an Stelle idx einfügen und rem Zeichen löschen.
// rem normalerweise immer = 0
String.prototype.splice = function( idx, rem, s ) {
    return (this.slice(0,idx) + s + this.slice(idx + Math.abs(rem)));
};
 
// Ersetzungslogik: <a href="[LINK]" target="_blank">[LINK]</a>
var insertString1 = "<a href=\"";
var insertString2 = "\"  target=\"_blank\">";
var insertString3 = "</a>";
 
// JavaScript-Methode - URLs im Text zu Hyperlinks machen
function parseTextToLinks(text){
    var positionOffset;
    var startPos;
    var endPos;
 
    // Regulärer Ausdruck - Linkerkennung
    var regex = XRegExp.globalize(/\b((?:[a-z][\w-]+:(?:\/{1,3}|[a-z0-9%])|www\d{0,3}[.]|[a-z0-9.\-]+[.][a-z]{2,4}\/)(?:[^\s()<>]+|\(([^\s()<>]+|(\([^\s()<>]+\)))*\))+(?:\(([^\s()<>]+|(\([^\s()<>]+\)))*\)|[^\s`!()\[\]{};:\'\".,<>?]))/);
    regex.global;
 
    // Hilfsvariablen
    var newText = text;
    positionOffset = 0;
 
    while (match = regex.exec(text)) {
        startPos = match.index;
        endPos = startPos + match[0].length;
 
        newText = newText.splice(startPos + positionOffset, 0, insertString1);
        positionOffset += insertString1.length;
 
        newText = newText.splice(endPos + positionOffset, 0, insertString2);
        positionOffset += insertString2.length;
 
        newText = newText.splice(endPos + positionOffset, 0, match[1]);
        positionOffset += match[1].length;
 
        newText = newText.splice(endPos + positionOffset, 0, insertString3);
        positionOffset += insertString3.length;
    }
    return newText;
}


module.exports = {
	handlelink: function(text){
		var parsed = parseTextToLinks(text);
		if (parsed.indexOf('<a href=\"') != -1){
			var link = parsed.slice(parsed.indexOf('<a href=\"') + 10,parsed.indexOf('\"  target=\"_blank\"'));
			var type = gettype(link);
			switch(type) {
 				case 'bild':
     		   		return parsed + "<a href='"+link+"'><img src='"+link+"'></img></a>";
  		        break;
    			case 'datei':
        			return parsed + "<a href='"+link+"'><img src='TODO'></img></a>";
        		break;
        	    case 'seite':
        			return parsed;
        		break;
			}
		}
	}
}
