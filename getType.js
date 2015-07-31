module.exports = {
	gettype: function(url){
		var type = 'datei';
        if (url.match(/\.(jpeg|jpg|gif|png)$/) != null){
        	type = 'bild';
		}
        if ((url.match(/\.(html|php)$/) != null) or (url.indexOf('.') == -1)) {
        	type = 'seite';
		}
		return type;
	}
}
