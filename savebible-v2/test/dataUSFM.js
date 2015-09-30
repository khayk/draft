(function(exports){

  // some verse samples
  exports.verses = [
  {
    name: 'luk_18_19_arm',
    data: {
      orig:   '\\v 19 Յիսուս նրան ասաց. \\wj «Ինչո՞ւ ինձ բարի ես կոչում. ոչ ոք բարի չէ, \\+add այլ\\+add* միայն՝ Աստուած։\\wj*',
      parsed: '\\v 19 Յիսուս նրան ասաց. \\wj «Ինչո՞ւ ինձ բարի ես կոչում. ոչ ոք բարի չէ, \\+add այլ\\+add* միայն՝ Աստուած։\\wj*',
      text:   '19 Յիսուս նրան ասաց. «Ինչո՞ւ ինձ բարի ես կոչում. ոչ ոք բարի չէ, [այլ] միայն՝ Աստուած։'
    }
  },
  {
    name: 'gen_1_2_kjv',
    data: {
      orig: '\\v 2 \\zw \\+zws H0776 \\+zws*\\zw*And the earth\\zx \\zx* \\zw \\+zws H01961 \\+zws*\\+zwm strongMorph:TH8804 \\+zwm*\\zw*was\\zx \\zx*\n' +
        '\\zw \\+zws H08414 \\+zws*\\zw*without form\\zx \\zx*, \\zw \\+zws H0922 \\+zws*\\zw*and\n' +
        'void\\zx \\zx*; \\zw \\+zws H02822 \\+zws*\\zw*and darkness\\zx \\zx* \\add was\\add*\n' +
        '\\zw \\+zws H06440 \\+zws*\\zw*upon the face\\zx \\zx* \\zw \\+zws H08415 \\+zws*\\zw*of the\n' +
        'deep\\zx \\zx*. \\zw \\+zws H07307 \\+zws*\\zw*And the Spirit\\zx \\zx* \\zw \\+zws H0430 \\+zws*\\zw*of\n' +
        'God\\zx \\zx* \\zw \\+zws H07363 \\+zws*\\+zwm strongMorph:TH8764 \\+zwm*\\zw*moved\\zx \\zx*\n' +
        '\\zw \\+zws H05921 \\+zws*\\zw*upon\\zx \\zx* \\zw \\+zws H06440 \\+zws*\\zw*the\n' +
        'face\\zx \\zx* \\zw \\+zws H04325 \\+zws*\\zw*of the waters\\zx \\zx*.',
      parsed: '\\v 2 And the earth was without form, and void; and darkness ' +
        '\\add was\\add* upon the face of the deep. And the Spirit of ' +
        'God moved upon the face of the waters.',
      text: '2 And the earth was without form, and void; and darkness [was]' +
        ' upon the face of the deep. And the Spirit of God moved upon the ' +
        'face of the waters.'
    }
  },
  {
    name: 'rom_9_9_kjv',
    data: {
      orig: '\\v 9 \\zw \\+zws G1063 \\+zws*\\+zwm robinson:CONJ 2 \\+zwm*\\zw*For\\zx \\zx*\n' +
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
      parsed: '\\v 9 For this \\add is\\add* the word of promise, At this time ' +
        'will I come, and Sara shall have a son.',
      text: '9 For this [is] the word of promise, At this time will I come,' +
        ' and Sara shall have a son.'
    }
  },
  {
    name: 'luk_18_19_kjv',
    data: {
      orig: '\\v 19 And Jesus said unto him, \\wj Why  callest thou me good? none\n' +
        '\\+add is\\+add* good, save one, \\+add that is\\+add*, God.\\wj*',
      parsed: '\\v 19 And Jesus said unto him, \\wj Why callest thou me good? ' +
        'none \\+add is\\+add* good, save one, \\+add that is\\+add*, God.\\wj*',
      text: '19 And Jesus said unto him, Why callest thou me good? none [is] ' +
        'good, save one, [that is], God.'
    }
  },
  {
    name: 'no_tags',
    data: {
      orig: '\\v 1 text no tags',
      parsed: '\\v 1 text no tags',
      text: '1 text no tags'
    }
  },
  {
    name: 'mat_17_26_kjv',
    data: {
      orig: '\\v 26 \\zw \\+zws G3588 G4074 \\+zws*\\+zwm robinson:T-NSM robinson:N-NSM 3 4 \\+zwm*\\zw*Peter\\zx \\zx*\n' +
        '\\zw \\+zws G3004 \\+zws*\\+zwm robinson:V-PAI-3S 1 \\+zwm*\\zw*saith\\zx \\zx*\n' +
        '\\zw \\+zws G846 \\+zws*\\+zwm robinson:P-DSM 2 \\+zwm*\\zw*unto him\\zx \\zx*,\n' +
        '\\zw \\+zws G575 \\+zws*\\+zwm robinson:PREP 5 \\+zwm*\\zw*Of\\zx \\zx* \\zw \\+zws G245 \\+zws*\\+zwm robinson:A-GPM 7 \\+zwm*\\zw*strangers\n' +
        '\\zx \\zx*. \\zw \\+zws G3588 G2424 \\+zws*\\+zwm robinson:T-NSM robinson:N-NSM 10 11 \\+zwm*\\zw*Jesus\\zx \\zx*\n' +
        '\\zw \\+zws G5346 \\+zws*\\+zwm robinson:V-IXI-3S 8 \\+zwm*\\zw*saith\\zx \\zx*\n' +
        '\\zw \\+zws G846 \\+zws*\\+zwm robinson:P-DSM 9 \\+zwm*\\zw*unto him\\zx \\zx*,\n' +
        '\\wj \\+zw \\+zws G686 \\+zws*\\+zwm robinson:PRT 12 \\+zwm*\\+zw*Then\\+zx \\+zx*\n' +
        '\\+zw \\+zws G1526 \\+zws*\\+zwm robinson:V-PXI-3P 14 \\+zwm*\\+zw*are\\+zx \\+zx*\n' +
        '\\+zw \\+zws G3588 G5207 \\+zws*\\+zwm robinson:T-NPM robinson:N-NPM 15 16 \\+zwm*\\+zw*the\n' +
        ' children\\+zx \\+zx* \\+zw \\+zws G1658 \\+zws*\\+zwm robinson:A-NPM 13 \\+zwm*\\+zw*free\\+zx \\+zx*.\\wj*',
      parsed: '\\v 26 Peter saith unto him, Of strangers . Jesus saith unto him, \\wj Then are the children free.\\wj*',
      text: '26 Peter saith unto him, Of strangers . Jesus saith unto him, Then are the children free.'
    }
  },
  {
    name: 'mat_3_15_kjv',
    data: {
      orig: '\\v 15 \\zw \\+zws G1161 \\+zws*\\+zwm robinson:CONJ 2 \\+zwm*\\zw*And\\zx \\zx*\n' +
        '\\zw \\+zws G3588 G2424 \\+zws*\\+zwm robinson:T-NSM robinson:N-NSM 3 4 \\+zwm*\\zw*Jesus\\zx \\zx*\n' +
        '\\zw \\+zws G611 \\+zws*\\+zwm robinson:V-AOP-NSM 1 \\+zwm*\\zw*answering\\zx \\zx*\n' +
        '\\zw \\+zws G2036 \\+zws*\\+zwm robinson:V-2AAI-3S 5 \\+zwm*\\zw*said\\zx \\zx*\n' +
        '\\zw \\+zws G4314 \\+zws*\\+zwm robinson:PREP 6 \\+zwm*\\zw*unto\\zx \\zx*\n' +
        '\\zw \\+zws G846 \\+zws*\\+zwm robinson:P-ASM 7 \\+zwm*\\zw*him\\zx \\zx*,\n' +
        '\\wj \\+zw \\+zws G863 \\+zws*\\+zwm robinson:V-2AAM-2S 8 \\+zwm*\\+zw*Suffer \\+zx \\+zx*\n' +
        '\\+add \\+zw \\+zws G2076 \\+zws*\\+zwm robinson:V-PXI-3S 13 \\+zwm*\\+zw*it   to be\n' +
        'so\\+zx \\+zx*\\+add* \\+zw \\+zws G737 \\+zws*\\+zwm robinson:ADV 9 \\+zwm*\\+zw*now\\+zx \\+zx*:\n' +
        '\\+zw \\+zws G1063 \\+zws*\\+zwm robinson:CONJ 11 \\+zwm*\\+zw*for\\+zx \\+zx*\n' +
        '\\+zw \\+zws G3779 \\+zws*\\+zwm robinson:ADV 10 \\+zwm*\\+zw*thus\\+zx \\+zx*\n' +
        '\\+zw \\+zws G4241 \\+zws*\\+zwm robinson:V-PQP-NSN 12 \\+zwm*\\+zw*it\n' +
        'becometh\\+zx \\+zx* \\+zw \\+zws G2254 \\+zws*\\+zwm robinson:P-1DP 14 \\+zwm*\\+zw*us\\+zx \\+zx*\n' +
        '\\+zw \\+zws G4137 \\+zws*\\+zwm robinson:V-AAN 15 \\+zwm*\\+zw*to fulfil\\+zx \\+zx*\n' +
        '\\+zw \\+zws G3956 \\+zws*\\+zwm robinson:A-ASF 16 \\+zwm*\\+zw*all\\+zx \\+zx*\n' +
        '\\+zw \\+zws G1343 \\+zws*\\+zwm robinson:N-ASF 17 \\+zwm*\\+zw*righteousness\\+zx \\+zx*.\\wj*\n' +
        '\\zw \\+zws G5119 \\+zws*\\+zwm robinson:ADV 18 \\+zwm*\\zw*Then\\zx \\zx*\n' +
        '\\zw \\+zws G863 \\+zws*\\+zwm robinson:V-PAI-3S 19 \\+zwm*\\zw*he suffered\\zx \\zx*\n' +
        '\\zw \\+zws G846 \\+zws*\\+zwm robinson:P-ASM 20 \\+zwm*\\zw*him\\zx \\zx*.',
      parsed: '\\v 15 And Jesus answering said unto him, \\wj Suffer \\+add ' +
        'it to be so\\+add* now: for thus it becometh us to fulfil all ' +
        'righteousness.\\wj* Then he suffered him.',
      text: '15 And Jesus answering said unto him, Suffer [it to be so] now: ' +
        'for thus it becometh us to fulfil all righteousness. Then he suffered him.'
    }
  },
  {
    name: 'empty',
    data: {
      orig: '\\v 1 ',
      parsed: '\\v 1 ',
      text: '1 '
    }
  },
  {
    name: 'dummy',
    data: {
      orig: '\\v 1 \\add dummy\\add*',
      parsed: '\\v 1 \\add dummy\\add*',
      text: '1 [dummy]'
    }
  }
  ];



  // sample book
  // @todo do not like this, change, refactor
  exports.bookTemplate = '' +
    '\\{{ID}}\n' +
    '\\h Genesis\n' +
    '\\toc1 The First Book of Moses, called Genesis\n' +
    '\\toc2 Genesis\n' +
    '\\toc3 Gen\n' +
    '\\mt The First Book of Moses, called Genesis\n' +
    '\\{{ENCODING}}\n' +
    '\\c 1\n' +
    '\\p\n' +
    '\\q\n' +
    '\\v 1 first\n' +
    '\\c 2\n' +
    '\\p\n' +
    '\\v 1 second\n' +
    '\\c 3\n' +
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
