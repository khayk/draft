run tests: mocha
coverage:  istanbul cover _mocha -- -R spec
coverage:  mocha --require blanket -R html-cov > coverage.html

npm -g install supervisor  (supervisor app.js)


NODE_DEBUG
    usage: NODE_DEBUG="cluster fs http net module timer tls" node app.js