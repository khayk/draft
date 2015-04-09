var mkdirp  = require('mkdirp');

var dstPath = 'processed';
var tocs = [
  {addr: 'hy/toc/1.html', title:'Синодальный перевод 1876 года', name:'Библия', folder:'synod'},
  {addr: 'hy/toc/2.html', title:'The King James Bible', name:'Bible', folder:'kjv'},
  {addr: 'hy/toc/3.html', title:'Մայր Աթոռ Սուրբ Էջմիածին եւ Հայաստանի աստուածաշնչային ընկերութիւն, 1994', name:'Աստուածաշունչ', folder:'ejmiacin'},
  {addr: 'hy/toc/4.html', title:'Աստուածաշունչ մատեան Հին եւ Նոր Կտակարանաց', name:'Աստուածաշունչ', folder:'grabar'}
];

recognizeText(tocs[1]);

function recognizeText(toc) {
	outDir = dstPath + '/' + toc.folder + '/';
	mkdirp(outDir, function(err) {
	});
}
