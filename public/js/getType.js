var gettype = function(url){
		var type = 'datei';
        if (url.match(/\.(jpeg|jpg|gif|png)$/) != null){
        	type = 'bild';
		}
        if ((url.match(/\.(html|php)$/) != null) || (url.lastIndexOf('.') < url.length - 5) || (url.split("/")[2] == url) || url.slice(url.lastIndexOf('.')).match(/\.(de|com|to|es|rus|uk|fr|edu|org)$/) != null) {
        	type = 'seite';
		}
//		var type = document.getElementById(url).files[0].type;
		return type;
	}
