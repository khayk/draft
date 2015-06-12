;(function(){

  // Book ordering according to https://en.wikipedia.org/wiki/Books_of_the_Bible
  exports.idsmap = [

    // Type have the meaning described below
    //
    // 1 - Canonical of Old Testament
    // 2 - Canonical book of New Testament
    // 3 - Deuterocanonical Books of Old Testament
    // 4 - Apocryphal Books

    // Pentateuch or teh Five Books of Moses
    {"id":"GEN", "index": 1, "type":1},
    {"id":"EXO", "index": 2, "type":1},
    {"id":"LEV", "index": 3, "type":1},
    {"id":"NUM", "index": 4, "type":1},
    {"id":"DEU", "index": 5, "type":1},

    // Historical books
    {"id":"JOS", "index": 6, "type":1},
    {"id":"JDG", "index": 7, "type":1},
    {"id":"RUT", "index": 8, "type":1},
    {"id":"1SA", "index": 9, "type":1},
    {"id":"2SA", "index":10, "type":1},
    {"id":"1KI", "index":11, "type":1},
    {"id":"2KI", "index":12, "type":1},
    {"id":"1CH", "index":13, "type":1},
    {"id":"2CH", "index":14, "type":1},
    {"id":"1ES", "index":15, "type":3},
    {"id":"EZR", "index":16, "type":1},
    {"id":"NEH", "index":17, "type":1},
    {"id":"TOB", "index":18, "type":3},
    {"id":"JDT", "index":19, "type":3},
    {"id":"EST", "index":20, "type":1},
    {"id":"1MA", "index":21, "type":3},
    {"id":"2MA", "index":22, "type":3},
    {"id":"3MA", "index":23, "type":3},
    {"id":"4MA", "index":24, "type":4},

    // Wisdom books
    {"id":"JOB", "index":25, "type":1},
    {"id":"PSA", "index":26, "type":1},
    {"id":"MAN", "index":27, "type":3},
    {"id":"PRO", "index":28, "type":1},
    {"id":"ECC", "index":29, "type":1},
    {"id":"SNG", "index":30, "type":1},
    {"id":"WIS", "index":31, "type":3},
    {"id":"SIR", "index":32, "type":3},

    // Major prophets
    {"id":"ISA", "index":33, "type":1},
    {"id":"JER", "index":34, "type":1},
    {"id":"LAM", "index":35, "type":1},
    {"id":"BAR", "index":36, "type":3},
    {"id":"LJE", "index":37, "type":3},
    {"id":"EZK", "index":38, "type":1},
    {"id":"DAN", "index":39, "type":1},

    // Twelve Minor Prophets
    {"id":"HOS", "index":40, "type":1},
    {"id":"JOL", "index":41, "type":1},
    {"id":"AMO", "index":42, "type":1},
    {"id":"OBA", "index":43, "type":1},
    {"id":"JON", "index":44, "type":1},
    {"id":"MIC", "index":45, "type":1},
    {"id":"NAM", "index":46, "type":1},
    {"id":"HAB", "index":47, "type":1},
    {"id":"ZEP", "index":48, "type":1},
    {"id":"HAG", "index":49, "type":1},
    {"id":"ZEC", "index":50, "type":1},
    {"id":"MAL", "index":51, "type":1},

    // Canonical gospels
    {"id":"MAT", "index":52, "type":2},
    {"id":"MRK", "index":53, "type":2},
    {"id":"LUK", "index":54, "type":2},
    {"id":"JHN", "index":55, "type":2},

    // Apostolic History
    {"id":"ACT", "index":56, "type":2},

    // Pauline epistles
    {"id":"ROM", "index":57, "type":2},
    {"id":"1CO", "index":58, "type":2},
    {"id":"2CO", "index":59, "type":2},
    {"id":"GAL", "index":60, "type":2},
    {"id":"EPH", "index":61, "type":2},
    {"id":"PHP", "index":62, "type":2},
    {"id":"COL", "index":63, "type":2},
    {"id":"1TH", "index":64, "type":2},
    {"id":"2TH", "index":65, "type":2},
    {"id":"1TI", "index":66, "type":2},
    {"id":"2TI", "index":67, "type":2},
    {"id":"TIT", "index":68, "type":2},
    {"id":"PHM", "index":69, "type":2},

    // General epistles
    {"id":"HEB", "index":70, "type":2},
    {"id":"JAS", "index":71, "type":2},
    {"id":"1PE", "index":72, "type":2},
    {"id":"2PE", "index":73, "type":2},
    {"id":"1JN", "index":74, "type":2},
    {"id":"2JN", "index":75, "type":2},
    {"id":"3JN", "index":76, "type":2},
    {"id":"JUD", "index":77, "type":2},

    // Apocalypse
    {"id":"REV", "index":78, "type":2},

    //
    {"id":"ESG", "index":79, "type":4},
    {"id":"S3Y", "index":80, "type":4},
    {"id":"SUS", "index":81, "type":4},
    {"id":"BEL", "index":82, "type":4},
    {"id":"2ES", "index":83, "type":3}
  ];
})();