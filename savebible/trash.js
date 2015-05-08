/*  function characterMap(str, map) {
    map = map || {};
    for (var i = 0; i < str.length; i++) {
      var ref = str.charAt(i);
      if (map[ref] === void 0)
        map[ref] = 1;
      else
        map[ref]++;
    }
    return map;
  }

  function dumpStats(index, file, top) {
    var statistics = {};
    var freqIndex = {};
    var totalWords = 0;

    _.each(index, function(value, key) {
      var o = value.c;
      if (_.isUndefined(freqIndex[o]))
        freqIndex[o] = [];
      freqIndex[o].push(key);
      totalWords += o;

      console.log('%s -> %j', key, value);
    });

    // var fk = Object.keys(freqIndex);

    // var wstream = fs.createWriteStream(file);
    // top = top || 10;
    // // print top `top` words
    // for (var i = fk.length - 1; i >= 0 && top > 0; i--, top--) {
    //   var t = fk[i];
    //   wstream.write(util.format('%s : %j',
    //                 common.padWithSymbol(t, 6, ' '),
    //                 freqIndex[t]) + '\r\n');
    // }
    // wstream.end();
  }*/




timer.start();
search.searchAllWords();
timer.stop();
timer.report();
console.log(util.inspect(process.memoryUsage()));


  // idx.add({'verse': '', 'ref': 2});
  // idx.add({'verse': '', 'ref': 3});
  // idx.add({'verse': '', 'ref': 4});
  // idx.add({'verse': '', 'ref': 5});

  //console.log(idx.search('hello'));
  //console.log(idx.search('very'));

  // var d1 = new Dictionary();

  // fillDictionary(d1);
  // measure('dictionary initialization');
  // d1.optimize();
  // measure('dictionary optimization');

  // var nd = new Dictionary();

  // var toc = bible.getToc();
  // console.log(toc.numItems());
  // var ti = toc.firstItem();
  // while (ti !== null) {
  //   var ref = bible.getBook(ti.id).ref();
  //   nd.add(ti.abbr, ref);
  //   ti = toc.nextItem(ti.id);
  // }
  // nd.optimize();

  // var matches = fuzzyMatch(nd.words(), 'm');
  // console.log(matches);
  //console.log(abbrs);

  // d1.stat(true, 100);
  // bibleStat.bibleTags(bible);
  // bibleStat.report();