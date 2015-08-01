var Zaehler = 0;
var apiKey = 'AIzaSyBGHTap5VyGBCdAqpl7ltMk-Vf8Yl2rC-Y';
var xmlhttp = new XMLHttpRequest();

var translate = function(target, sourceText) {
    if (Zaehler + sourceText.length < 10000000) {
      var source = 'https://www.googleapis.com/language/translate/v2/detect?key=' + apiKey + '&q=' + sourceText;
      xmlhttp.onreadystatechange = function()
      {
        if (xmlhttp.readyState == 4 && xmlhttp.status == 200)
        {
          var source2 = xmlhttp.responseText;
        }
      }
      xmlhttp.open("GET",source,true);
      xmlhttp.send();
      source2 = JSON.parse(source2);
      source2 = source2.data.detections[0][0].language;

      var translated = 'https://www.googleapis.com/language/translate/v2?key=' + apiKey + '&source=' + source2 + '&target=' + target + '&callback=translateText&q=' + sourceText;


      xmlhttp.onreadystatechange = function()
      {
        if (xmlhttp.readyState == 4 && xmlhttp.status == 200)
        {
          var translated2 = xmlhttp.responseText;
        }
      }
      xmlhttp.open("GET",translated,true);
      xmlhttp.send();
      translated2 = translated2.substr(30,- 30 + translated2.length-2 );
      translated2 = JSON.parse(translated2);
      translated2 = translated2.data.translations[0].translatedText;

      Zaehler = Zaehler + sourceText.length;
      return translated2;
    }
    else
    {
      return sourceText;
    }
}

