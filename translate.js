var Zaehler = 0;
var apiKey = 'AIzaSyBGHTap5VyGBCdAqpl7ltMk-Vf8Yl2rC-Y';
module.exports = {
  translate: function(target, sourceText) {
    if (Zaehler + sourceText.length < 15000000) {
      var source = 'https://www.googleapis.com/language/translate/v2/detect?key=' + apiKey + '&q=' + sourceText;
      var translated = 'https://www.googleapis.com/language/translate/v2?key=' + apiKey + '&source=' + source + '&target=' + target + '&callback=translateText&q=' + sourceText;
      Zaehler = Zaehler + sourceText.length;
      return translated;
    }
    else
    {
      return sourceText;
    }
  }
}
