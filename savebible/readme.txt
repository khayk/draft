run tests: mocha
coverage:  istanbul cover _mocha -- -R spec
coverage:  mocha --require blanket -R html-cov > coverage.html