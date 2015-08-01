var linker = require('./handlelinks.js');
var translator = require('./translator.js');

module.exports = {
	parse: function(message,translate,language){
		if (translate === true){
			message = translator.translate(language,message);
		}
		
		return linker.handlelink(message);
	}
}
