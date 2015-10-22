run tests: mocha
coverage:  istanbul cover _mocha -- -R spec
coverage:  mocha --require blanket -R html-cov > coverage.html
coverate (windows):  istanbul cover %APPDATA%/npm/node_modules/mocha/bin/_mocha -- -R spec
                     istanbul cover ~/AppData/Roaming/npm/node_modules/mocha/bin/_mocha -- -R spec

npm -g install supervisor  (supervisor app.js)


NODE_DEBUG
    usage: NODE_DEBUG="cluster fs http net module timer tls" node app.js


Try this one, it should work.
    istanbul cover %APPDATA%/npm/node_modules/mocha/bin/_mocha -- -R spec