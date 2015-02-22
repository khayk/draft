(function(exports){

  // some verse samples
  exports.verses = [
  {
    name: 'luk_18_19_arm',
    data: {
      orig:   'Յիսուս նրան ասաց. \\wj «Ինչո՞ւ ինձ բարի ես կոչում. ոչ ոք բարի չէ, \\+add այլ\\+add* միայն՝ Աստուած։\\wj*',
      parsed: 'Յիսուս նրան ասաց. \\wj «Ինչո՞ւ ինձ բարի ես կոչում. ոչ ոք բարի չէ, \\+add այլ\\+add* միայն՝ Աստուած։\\wj*',
      text:   'Յիսուս նրան ասաց. «Ինչո՞ւ ինձ բարի ես կոչում. ոչ ոք բարի չէ, [այլ] միայն՝ Աստուած։'
    }
  },
  {
    name: 'gen_1_2_kjv',
    data: {
      orig: '\\zw \\+zws H0776 \\+zws*\\zw*And the earth\\zx \\zx* \\zw \\+zws H01961 \\+zws*\\+zwm strongMorph:TH8804 \\+zwm*\\zw*was\\zx \\zx*\n' +
        '\\zw \\+zws H08414 \\+zws*\\zw*without form\\zx \\zx*, \\zw \\+zws H0922 \\+zws*\\zw*and\n' +
        'void\\zx \\zx*; \\zw \\+zws H02822 \\+zws*\\zw*and darkness\\zx \\zx* \\add was\\add*\n' +
        '\\zw \\+zws H06440 \\+zws*\\zw*upon the face\\zx \\zx* \\zw \\+zws H08415 \\+zws*\\zw*of the\n' +
        'deep\\zx \\zx*. \\zw \\+zws H07307 \\+zws*\\zw*And the Spirit\\zx \\zx* \\zw \\+zws H0430 \\+zws*\\zw*of\n' +
        'God\\zx \\zx* \\zw \\+zws H07363 \\+zws*\\+zwm strongMorph:TH8764 \\+zwm*\\zw*moved\\zx \\zx*\n' +
        '\\zw \\+zws H05921 \\+zws*\\zw*upon\\zx \\zx* \\zw \\+zws H06440 \\+zws*\\zw*the\n' +
        'face\\zx \\zx* \\zw \\+zws H04325 \\+zws*\\zw*of the waters\\zx \\zx*.',
      parsed: 'And the earth was without form, and void; and darkness ' +
        '\\add was\\add* upon the face of the deep. And the Spirit of ' +
        'God moved upon the face of the waters.',
      text: 'And the earth was without form, and void; and darkness [was]' +
        ' upon the face of the deep. And the Spirit of God moved upon the ' +
        'face of the waters.'
    }
  },
  {
    name: 'rom_9_9_kjv',
    data: {
      orig: '\\zw \\+zws G1063 \\+zws*\\+zwm robinson:CONJ 2 \\+zwm*\\zw*For\\zx \\zx*\n' +
        '\\zw \\+zws G3778 \\+zws*\\+zwm robinson:D-NSM 5 \\+zwm*\\zw*this\\zx \\zx*\n' +
        '\\add is\\add* \\zw \\+zws G3588 G3056 \\+zws*\\+zwm robinson:T-NSM robinson:N-NSM 3 4 \\+zwm*\\zw*the\n' +
        'word\\zx \\zx* \\zw \\+zws G1860 \\+zws*\\+zwm robinson:N-GSF 1 \\+zwm*\\zw*of\n' +
        'promise\\zx \\zx*, \\zw \\+zws G2596 \\+zws*\\+zwm robinson:PREP 6 \\+zwm*\\zw*At\\zx \\zx*\n' +
        '\\zw \\+zws G5126 \\+zws*\\+zwm robinson:D-ASM 9 \\+zwm*\\zw*this\\zx \\zx*\n' +
        '\\zw \\+zws G3588 G2540 \\+zws*\\+zwm robinson:T-ASM robinson:N-ASM 7 8 \\+zwm*\\zw*time\\zx \\zx*\n' +
        '\\zw \\+zws G2064 \\+zws*\\+zwm robinson:V-FDI-1S 10 \\+zwm*\\zw*will I\n' +
        'come\\zx \\zx*, \\zw \\+zws G2532 \\+zws*\\+zwm robinson:CONJ 11 \\+zwm*\\zw*and\\zx \\zx*\n' +
        '\\zw \\+zws G3588 G4564 \\+zws*\\+zwm robinson:T-DSF robinson:N-DSF 13 14 \\+zwm*\\zw*Sara\\zx \\zx*\n' +
        '\\zw \\+zws G2071 \\+zws*\\+zwm robinson:V-FXI-3S 12 \\+zwm*\\zw*shall\n' +
        'have\\zx \\zx* \\zw \\+zws G5207 \\+zws*\\+zwm robinson:N-NSM 15 \\+zwm*\\zw*a\n' +
        'son\\zx \\zx*.',
      parsed: 'For this \\add is\\add* the word of promise, At this time ' +
        'will I come, and Sara shall have a son.',
      text: 'For this [is] the word of promise, At this time will I come,' +
        ' and Sara shall have a son.'
    }
  },
  {
    name: 'luk_18_19_kjv',
    data: {
      orig: 'And Jesus said unto him, \\wj  Why callest thou me good? none\n' +
        '\\+add is\\+add* good, save one, \\+add that is\\+add*, God.\\wj*',
      parsed: 'And Jesus said unto him, \\wj  Why callest thou me good? ' +
        'none \\+add is\\+add* good, save one, \\+add that is\\+add*, God.\\wj*',
      text: 'And Jesus said unto him, Why callest thou me good? none [is] ' +
        'good, save one, [that is], God.'
    }
  },
  {
    name: 'no_tags',
    data: {
      orig: 'text no tags',
      parsed: 'text no tags',
      text: 'text no tags'
    }
  },
  {
    name: 'empty',
    data: {
      orig: '',
      parsed: '',
      text: ''
    }
  },
  {
    name: 'dummy',
    data: {
      orig: '\\add dummy\\add*',
      parsed: '\\add dummy\\add*',
      text: '[dummy]'
    }
  },
  {
    name: 'unsupported',
    data: {
      orig: '\\m 1\\x 2\\y 3\\z 4\\z*5\\y*6\\x*7\\m*',
      parsed: '',
      text: ''
    }
  }
  ];


  // sample book
  exports.bookTemplate = '' +
    '\\id GEN  Genesis\n' +
    '\\h Genesis\n' +
    '\\toc1 The First Book of Moses, called Genesis\n' +
    '\\toc2 Genesis\n' +
    '\\toc3 Gen\n' +
    '\\mt The First Book of Moses, called Genesis\n' +
    '\\c 1\n' +
    '\\p\n' +
    '\\v 1  first\n' +
    '\\c 2\n' +
    '\\p\n' +
    '\\v 1 second\n' +
    '\\c 3  \n' +
    '\\v 1 third\n' +
    '\\p\n' +
    '\\v 2 forth\n';

})(typeof exports === 'undefined' ? this.idsmap = {} : exports);


/*

ViewSettings = function() {
    paragraphMode: false,
    showTitles: true,
    showNumbers: true,
    boldQuotes: true,
    highlightJesusWords: true,
    translatorAddition:
}
*/
