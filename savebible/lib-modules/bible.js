//var bible = module.exports

function Verse(chap, number, text, newParagraph) {
   this.parent = chap || null;
   this.text   = text || '';
   this.number = number;
}

Verse.prototype = {
   render: function(options) {
      console.log(this.number + ' ' + this.text);
   }
};

function Chapter() {
   this.parent = null;
   this.number = 2;
   this.chapters = [];
}

Chapter.prototype = {
   render: function(options) {
      options = options || {};
      console.log('CHAPTER: ' + this.number + '\n');
   }
};

module.exports.Verse   = Verse;
module.exports.Chapter = Chapter;
