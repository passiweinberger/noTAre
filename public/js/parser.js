//var linker = require('./handlelinks.js');
//var translator = require('./translator.js');

module.exports = {
	parse: function(message,translated,language){
		if (translated == true){
			message = translator.translate(language,message);
		}
		
		return linker.handlelink(message);
	}
}
