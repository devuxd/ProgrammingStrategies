(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){


const db = require('./dataManagement.js');
const tokenizer = require('../tokenizer.js');

if (typeof window !== 'undefined' && window.angular) {
    let myAdmin = angular.module('myAdmin', ['ui.ace']);
    myAdmin.factory('StrategyService', function ($q) {

        let strategies = [];
        let deferred = $q.defer();
        firebase.database().ref('strategies').once('value').then(function (snapshot) {
            snapshot.forEach(function (childStrategy) {
                strategies.push(childStrategy.val());
            });
            deferred.resolve(strategies);
        }).catch(function (err) {
            deferred.reject(err);
        });
        return {
            getAll: function () {
                return deferred.promise;
            }
        };
    });

    myAdmin.controller('AdminCtrl', function ($scope, StrategyService) {
        "use strict";

        $scope.currentStatement = {};
        $scope.currentStrategy = {};

        let myStrat = StrategyService.getAll();
        myStrat.then(function (strategies) {
            $scope.selectedStrategy = strategies[0] || null;
            $scope.allStrategies = strategies;
            $scope.editedStrategy = {};
            $scope.aceOption = {
                onLoad: function (_ace) {
                    _ace.getSession().setMode("ace/mode/json");
                    _ace.setTheme("ace/theme/twilight");
                    $scope.strategyChanged = function () {
                        _ace.setValue($scope.selectedStrategy.robotoText);
                        $scope.newStrategyOwner = $scope.selectedStrategy.owner;
                        $scope.newStrategyDisplayName = $scope.selectedStrategy.displayName;
                        $scope.newStrategyName = $scope.selectedStrategy.name;
                        $scope.newStrategyType = $scope.selectedStrategy.type;
                    };
                }
            };
            $scope.newStrategyOwner = $scope.selectedStrategy.owner;
            $scope.newStrategyDisplayName = $scope.selectedStrategy.displayName;
            $scope.newStrategyName = $scope.selectedStrategy.name;
            $scope.newStrategyType = $scope.selectedStrategy.type;

            var editor = ace.edit("aceEditor");
            editor.setValue($scope.selectedStrategy ? $scope.selectedStrategy.robotoText : '');
            var ref = firebase.database().ref().child('strategies');

            $scope.publish = function () {
                if ($scope.selectedStrategy === undefined) {
                    return;
                }
                var owner = $scope.selectedStrategy.owner;
                var displayName = $scope.selectedStrategy.displayName;
                var name = $scope.selectedStrategy.name;
                var type = $scope.selectedStrategy.type;

                var tokens = new tokenizer.Tokens(editor.getValue());
                if (tokens[tokens.length - 1] != "\n") tokens.tokens.push("\n");
                var ast = tokenizer.parseApproach(owner, name, displayName, type, tokens, editor.getValue());

                var x = ref.orderByChild("name").equalTo($scope.selectedStrategy.name);
                $scope.selectedStrategy = ast;
                x.on("child_added", function (snapshot) {
                    var key = snapshot.key;
                    //first argument contains an invalid key ($$hashKey) in property.... this is an error happens when we want to push , update or set
                    // a record in firebase. in order to remove the hash ke we should add:
                    //I've gotten around this issue by doing something like
                    // myRef.push(angular.fromJson(angular.toJson(myAngularObject))).
                    firebase.database().ref().child('strategies/' + key).set(angular.fromJson(angular.toJson($scope.selectedStrategy)));
                });
            };
            $scope.addNewStrategy = function () {
                editor.setValue("");
                $scope.newStrategyOwner = "";
                $scope.newStrategyName = "";
                $scope.newStrategyDisplayName = "";
                $scope.newStrategyType = "approach";
                $scope.selectedStrategy = undefined;
            };
            $scope.createStrategy = function () {
                //$("#frmStrategyCreation").css("display", "block");
                var owner = $scope.newStrategyOwner;
                var displayName = $scope.newStrategyDisplayName;
                var name = $scope.newStrategyName;
                var type = $scope.newStrategyType;

                if (name == "" || owner == "" || displayName == "" || type == "") {
                    alert("please fill out the required fields");
                    return;
                }
                var tokens = new tokenizer.Tokens(editor.getValue());
                if (tokens[tokens.length - 1] != "\n") tokens.tokens.push("\n");
                var ast = tokenizer.parseApproach(owner, name, displayName, type, tokens, editor.getValue());

                $scope.selectedStrategy = ast;
                firebase.database().ref().child('strategies').push(angular.fromJson(angular.toJson($scope.selectedStrategy)));
                $scope.allStrategies.push($scope.selectedStrategy);
                //$("#frmStrategyCreation").css("display", "none");
                $scope.strategyChanged();
            };
            $scope.cancelCreatingStrategy = function () {
                $scope.selectedStrategy = strategies[0] || null;
                $scope.strategyChanged();
            };
        });
    });
};

},{"../tokenizer.js":3,"./dataManagement.js":2}],2:[function(require,module,exports){

var config = {
    apiKey: "AIzaSyAXjL6f739BVqLDknymCN2H36-NBDS8LvY",
    authDomain: "strategytracker.firebaseapp.com",
    databaseURL: "https://strategytracker.firebaseio.com",
    projectId: "strategytracker",
    storageBucket: "strategytracker.appspot.com",
    messagingSenderId: "261249836518"
};
firebase.initializeApp(config);

},{}],3:[function(require,module,exports){
// These functions parse this grammar:
//
// https://github.com/devuxd/ProgrammingStrategies/blob/master/roboto.md

function Tokens(code) {

    this.tokens = tokenize(code);

    // Remmeber all of the tokens eaten so we can provide useful error message context.
    this.eaten = [];

    this.eat = function (expected) {
        //console.log(expected);

        if (expected && !this.nextIs(expected)) {
            console.log("expected", expected);
            throw new Error("Line " + this.currentLine() + ": expected '" + expected + "', but found '" + this.tokens.slice(0, 5).join(" ") + "'");
        }

        var eaten = this.tokens.shift();

        this.eaten.push(eaten);

        return eaten;
    };

    this.uneat = function () {

        this.tokens.unshift(this.eaten.pop());
    };

    this.eatN = function (n) {

        for (var i = 0; i < n; i++) this.eat();
    };

    this.count = function (text) {

        var index = 0;
        while (index < this.tokens.length && this.tokens[index] === text) index++;
        return index;
    };

    this.hasNext = function () {
        return this.tokens.length > 0;
    };
    this.nextIs = function (string) {
        return this.hasNext() && this.peek() === string;
    };
    this.peek = function () {
        return this.hasNext() ? this.tokens[0].toLowerCase() : null;
    };

    this.currentLine = function () {

        var line = 1;
        for (var i = 0; i < this.eaten.length; ++i) {
            if (this.eaten[i] === "\n") line++;
        }
        return line;
    };
}

// Tokens are segmented by whitespace, *'s, and parentheses
function tokenize(strategy) {

    var index = 0;
    var tokens = [];

    while (index < strategy.length) {

        // Eat any spaces.
        while (strategy.charAt(index).match(/ /)) index++;

        // If we've reached the end of the string, we're done.
        if (index === strategy.length) break;

        if (strategy.charAt(index) === "\n") {
            tokens.push("\n");
            index++;
        } else if (strategy.charAt(index) === "\t") {
            tokens.push("\t");
            index++;
        } else if (strategy.charAt(index) === "(") {
            tokens.push("(");
            index++;
        } else if (strategy.charAt(index) === ")") {
            tokens.push(")");
            index++;
        } else if (strategy.charAt(index) === "#") {
            var commentStart = index;
            while (strategy.charAt(index) !== "\n") index++;
            tokens.push(strategy.substring(commentStart, index));
        }
        // Tokenize an identifier
        else if (strategy.charAt(index).match(/['\w]/)) {

                var identifierStart = index;
                while (strategy.charAt(index).match(/['\w]/)) index++;
                tokens.push(strategy.substring(identifierStart, index));
            } else {
                throw new Error("I'm not smart enough to handle the character '" + strategy.charAt(index) + "'");
            }
    }

    return tokens;
}

/*
* Below is a basic recursive-descent parser for Roboto. There's one
* function for each non-terminal.
*/

// Expects a list of strings.
function parseApproach(owner, name, displayName, type, tokens, robotoText) {

    var strategies = [];
    var descriptions = [];

    // If it's a comment, read a comment.
    while (tokens.peek().charAt(0) === "#") {
        descriptions.push(tokens.eat());
        tokens.eat("\n");
    }
    // Parse one or more strategies.
    while (tokens.nextIs("strategy")) {
        strategies.push(parseStrategy(tokens));
    }

    // Parse one or more strategies.
    while (tokens.nextIs("strategy")) {
        strategies.push(parseStrategy(tokens));
    }

    if (tokens.hasNext()) console.error("I'm not smart enough to handle anything other than strategies, so I got stuck on '" + tokens.tokens.slice(0, 5).join(" ") + "'");

    return {
        owner: owner,
        name: name,
        description: descriptions,
        displayName: displayName,
        type: type,
        robotoText: robotoText,
        strategies: strategies
    };
}

// STRATEGY :: strategy IDENTIFIER ( IDENTIFIER+ ) STATEMENTS \n
function parseStrategy(tokens) {

    tokens.eat("strategy");
    var identifier = tokens.eat();

    tokens.eat("(");
    var parameters = [];
    while (!tokens.nextIs(")")) {
        parameters.push(tokens.eat()); // Consume arguments
    }
    tokens.eat(")"); // Consume right parenthesis

    // Consume statements.
    var statements = parseStatements(tokens, 1);

    // Consume any number of newlines.
    while (tokens.nextIs("\n")) tokens.eat("\n");

    return {
        type: "strategy",
        name: identifier,
        parameters: parameters,
        statements: statements,
        text: "Strategy " + identifier + "(" + parameters.join(' ') + ")"
    };
}

// STATEMENTS :: STATEMENT+
function parseStatements(tokens, tabsExpected) {

    var statements = [];
    var comments = [];

    // Block starts with a newline.
    tokens.eat("\n");

    // Read statements until we find fewer tabs than expected.
    do {

        // How many tabs?
        var tabsCounted = tokens.count("\t");

        // If we found all the tabs we expected and more, there are extra tabs, and we should fail.
        if (tabsCounted > tabsExpected) throw new Error("I expected " + tabsExpected + " but found " + tabsCounted + "; did some extra tabs get in?");
        // If we found the right number, eat them.
        else if (tabsCounted === tabsExpected) tokens.eatN(tabsExpected);
            // If we found fewer, we're done eating statements.
            else {
                    break;
                }

        // If it's a comment, read a comment.
        if (tokens.peek().charAt(0) === "#") {
            comments.push(tokens.eat());
            tokens.eat("\n");
        }
        // Otherwise, read a statement and assign the comments.
        else {
                var statement = parseStatement(tokens, tabsExpected);
                statement.comments = comments;
                statement.text = statement.toString();
                comments = [];
                statements.push(statement);
            }
    } while (true);

    return statements;
}

// STATEMENT :: * (ACTION | CALL | CONDITIONAL | FOREACH | DEFINITION | RETURN )+ [# word+]
function parseStatement(tokens, tabsExpected) {

    var keyword = tokens.peek();
    var statement = null;

    if (keyword === "do") statement = parseDo(tokens);else if (keyword === "until") statement = parseUntil(tokens, tabsExpected);else if (keyword === "if") statement = parseIf(tokens, tabsExpected);else if (keyword === "for") statement = parseForEach(tokens, tabsExpected);else if (keyword === "set") statement = parseSet(tokens);else if (keyword === "return") statement = parseReturn(tokens);else statement = parseAction(tokens);

    return statement;
}

// ACTION :: WORDS \n
function parseAction(tokens) {

    var words = parseWords(tokens);
    tokens.eat("\n");

    return {
        type: "action",
        words: words,
        toString: function () {
            return words.join(' ');
        }
    };
}

// WORDS :: .+
function parseWords(tokens) {

    var words = [];
    while (tokens.hasNext() && !tokens.nextIs("\n")) words.push(tokens.eat());
    return words;
}

// DO :: do CALL
function parseDo(tokens) {

    tokens.eat("do");

    var call = parseCall(tokens);

    // Eat the trailing newline
    tokens.eat("\n");

    return {
        type: "do",
        call: call,
        toString: function () {
            return "do " + call.toString();
        }
    };
}

// CALL :: identifier ( IDENTIFIER* )
function parseCall(tokens) {

    var identifier = tokens.eat(); // Consume name
    tokens.eat("("); // Consume left paren
    // Consume arguments
    var args = [];
    while (!tokens.nextIs(")")) {
        args.push(tokens.eat());
    }
    tokens.eat(")");

    return {
        type: "call",
        name: identifier,
        arguments: args,
        toString: function () {
            return identifier + "(" + args.join(' ') + ")";
        }
    };
}

// UNTIL :: until QUERY STATEMENTS
function parseUntil(tokens, tabsExpected) {

    tokens.eat("until");
    var query = parseQuery(tokens);

    var statements = parseStatements(tokens, tabsExpected + 1);

    return {
        type: "until",
        query: query,
        statements: statements,
        toString: function () {
            return "until " + query.toString();
        }
    };
}

// CONDITIONAL :: if QUERY STATEMENTS
function parseIf(tokens, tabsExpected) {

    tokens.eat("if");
    var query = parseQuery(tokens);

    var statements = parseStatements(tokens, tabsExpected + 1);

    return {
        type: "if",
        query: query,
        statements: statements,
        toString: function () {
            return "if " + query.toString();
        }
    };
}

// FOREACH :: for each IDENTIFIER in IDENTIFIER STATEMENTS
function parseForEach(tokens, tabsExpected) {

    tokens.eat("for");
    tokens.eat("each");
    var identifier = tokens.eat();
    tokens.eat("in");
    var list = tokens.eat();

    var statements = parseStatements(tokens, tabsExpected + 1);

    return {
        type: "foreach",
        list: list,
        identifier: identifier,
        statements: statements,
        toString: function () {
            return "for each" + identifier + " in " + list;
        }
    };
}

// SET :: set IDENTIFIER to QUERY
function parseSet(tokens) {

    tokens.eat("set");
    var identifier = tokens.eat();
    tokens.eat("to");
    var query = parseQuery(tokens);

    // Eat the trailing newline
    tokens.eat("\n");

    return {
        type: "set",
        identifier: identifier,
        query: query,
        toString: function () {
            return "set " + identifier + " to " + query.toString();
        }
    };
}

// RETURN :: return QUERY
function parseReturn(tokens) {

    tokens.eat("return");
    var query = parseQuery(tokens);

    // Eat the trailing newline
    tokens.eat("\n");

    return {
        type: "return",
        query: query,
        toString: function () {
            return "return " + query.toString();
        }
    };
}

// QUERY :: IDENTIFIER | CALL | NOTHING | WORDS
function parseQuery(tokens) {

    var first = tokens.eat();

    // If it's a strategy call, parse a call.
    if (tokens.nextIs("(")) {

        tokens.uneat();
        return parseCall(tokens);
    }
    // If it's "nothing", stop parsing
    else if (first === "nothing") {

            return {
                type: "nothing",
                nothing: first,
                toString: function () {
                    return "nothing";
                }
            };
        }
        // Otherwise, parse words
        else {

                var words = parseWords(tokens);
                words.unshift(first);

                return {
                    type: "query",
                    words: words,
                    toString: function () {
                        return words.join(' ');
                    }
                };
            }
}

module.exports = {
    Tokens: Tokens,
    parseApproach: parseApproach

};

// fs = require('fs')
// //console.log(process.argv[2]);
//
// fs.readFile(process.argv[2], 'utf8', function (err,data) {
//     if (err) {
//         return console.log(err);
//     }
//     //console.log("data = ", data);
//     var strategy = data;
//
//     try {
//         var tokens = new Tokens(strategy);
//         //owner, name, displayName, type, tokens, robotoText
//         var ast = parseApproach("meysam", process.argv[2], "meysam", "approach",  tokens, "");
//         console.log(JSON.stringify(ast, null, 2));
//     } catch(ex) {
//         console.log(ex);
//     }
//
// });

},{}]},{},[1])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJhZG1pbi5qcyIsImRhdGFNYW5hZ2VtZW50LmpzIiwiLi4vdG9rZW5pemVyLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7QUNHQSxNQUFNLEtBQUssUUFBUSxxQkFBUixDQUFYO0FBQ0EsTUFBTSxZQUFZLFFBQVEsaUJBQVIsQ0FBbEI7O0FBRUEsSUFBSSxPQUFPLE1BQVAsS0FBa0IsV0FBbEIsSUFBaUMsT0FBTyxPQUE1QyxFQUFxRDtBQUNqRCxRQUFJLFVBQVUsUUFBUSxNQUFSLENBQWUsU0FBZixFQUF5QixDQUFDLFFBQUQsQ0FBekIsQ0FBZDtBQUNBLFlBQVEsT0FBUixDQUFnQixpQkFBaEIsRUFBbUMsVUFBUyxFQUFULEVBQWE7O0FBRTVDLFlBQUksYUFBWSxFQUFoQjtBQUNBLFlBQUksV0FBVyxHQUFHLEtBQUgsRUFBZjtBQUNBLGlCQUFTLFFBQVQsR0FBb0IsR0FBcEIsQ0FBd0IsWUFBeEIsRUFBc0MsSUFBdEMsQ0FBMkMsT0FBM0MsRUFBb0QsSUFBcEQsQ0FBeUQsVUFBUyxRQUFULEVBQW1CO0FBQ3hFLHFCQUFTLE9BQVQsQ0FBaUIsVUFBUyxhQUFULEVBQXdCO0FBQ3JDLDJCQUFXLElBQVgsQ0FBZ0IsY0FBYyxHQUFkLEVBQWhCO0FBQ0gsYUFGRDtBQUdBLHFCQUFTLE9BQVQsQ0FBaUIsVUFBakI7QUFDSCxTQUxELEVBS0csS0FMSCxDQUtTLFVBQVMsR0FBVCxFQUFjO0FBQ25CLHFCQUFTLE1BQVQsQ0FBZ0IsR0FBaEI7QUFDSCxTQVBEO0FBUUEsZUFBTztBQUNILG9CQUFRLFlBQVc7QUFDZix1QkFBTyxTQUFTLE9BQWhCO0FBQ0g7QUFIRSxTQUFQO0FBS0gsS0FqQkQ7O0FBbUJBLFlBQVEsVUFBUixDQUFtQixXQUFuQixFQUFnQyxVQUFVLE1BQVYsRUFBa0IsZUFBbEIsRUFBbUM7QUFDL0Q7O0FBQ0EsZUFBTyxnQkFBUCxHQUEwQixFQUExQjtBQUNB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Qjs7QUFFbkIsZUFBTyxLQUFQO0FBQ0EsZUFBTyxVQUFVLE1BQVYsQ0FBUDtBQUVIO0FBQ0Q7QUFOQSxTQU9LLElBQUcsVUFBVSxTQUFiLEVBQXdCOztBQUV6QixtQkFBTztBQUNILHNCQUFNLFNBREg7QUFFSCx5QkFBUyxLQUZOO0FBR0gsMEJBQVUsWUFBWTtBQUNsQiwyQkFBTyxTQUFQO0FBQ0g7QUFMRSxhQUFQO0FBUUg7QUFDRDtBQVhLLGFBWUE7O0FBRUQsb0JBQUksUUFBUSxXQUFXLE1BQVgsQ0FBWjtBQUNBLHNCQUFNLE9BQU4sQ0FBYyxLQUFkOztBQUVBLHVCQUFPO0FBQ0gsMEJBQU0sT0FESDtBQUVILDJCQUFPLEtBRko7QUFHSCw4QkFBVSxZQUFZO0FBQ2xCLCtCQUFRLE1BQU0sSUFBTixDQUFXLEdBQVgsQ0FBUjtBQUNIO0FBTEUsaUJBQVA7QUFRSDtBQUVKOztBQUVELE9BQU8sT0FBUCxHQUFpQjtBQUNiLFlBQVEsTUFESztBQUViLG1CQUFjOztBQUZELENBQWpCOztBQU1BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiXG5cblxuY29uc3QgZGIgPSByZXF1aXJlKCcuL2RhdGFNYW5hZ2VtZW50LmpzJyk7XG5jb25zdCB0b2tlbml6ZXIgPSByZXF1aXJlKCcuLi90b2tlbml6ZXIuanMnKTtcblxuaWYgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnICYmIHdpbmRvdy5hbmd1bGFyKSB7XG4gICAgbGV0IG15QWRtaW4gPSBhbmd1bGFyLm1vZHVsZSgnbXlBZG1pbicsWyd1aS5hY2UnXSk7XG4gICAgbXlBZG1pbi5mYWN0b3J5KCdTdHJhdGVneVNlcnZpY2UnLCBmdW5jdGlvbigkcSkge1xuXG4gICAgICAgIGxldCBzdHJhdGVnaWVzPSBbXTtcbiAgICAgICAgbGV0IGRlZmVycmVkID0gJHEuZGVmZXIoKTtcbiAgICAgICAgZmlyZWJhc2UuZGF0YWJhc2UoKS5yZWYoJ3N0cmF0ZWdpZXMnKS5vbmNlKCd2YWx1ZScpLnRoZW4oZnVuY3Rpb24oc25hcHNob3QpIHtcbiAgICAgICAgICAgIHNuYXBzaG90LmZvckVhY2goZnVuY3Rpb24oY2hpbGRTdHJhdGVneSkge1xuICAgICAgICAgICAgICAgIHN0cmF0ZWdpZXMucHVzaChjaGlsZFN0cmF0ZWd5LnZhbCgpKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZShzdHJhdGVnaWVzKTtcbiAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24oZXJyKSB7XG4gICAgICAgICAgICBkZWZlcnJlZC5yZWplY3QoZXJyKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBnZXRBbGw6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfTtcbiAgICB9KTtcblxuICAgIG15QWRtaW4uY29udHJvbGxlcignQWRtaW5DdHJsJywgZnVuY3Rpb24gKCRzY29wZSwgU3RyYXRlZ3lTZXJ2aWNlKSB7XG4gICAgICAgIFwidXNlIHN0cmljdFwiO1xuICAgICAgICAkc2NvcGUuY3VycmVudFN0YXRlbWVudCA9IHt9O1xuICAgICAgICAkc2NvcGUuY3VycmVudFN0cmF0ZWd5ID0ge307XG5cbiAgICAgICAgbGV0IG15U3RyYXQgPSBTdHJhdGVneVNlcnZpY2UuZ2V0QWxsKCk7XG4gICAgICAgIG15U3RyYXQudGhlbihmdW5jdGlvbihzdHJhdGVnaWVzKSB7XG4gICAgICAgICAgICAkc2NvcGUuc2VsZWN0ZWRTdHJhdGVneT1zdHJhdGVnaWVzWzBdIHx8IG51bGw7XG4gICAgICAgICAgICAkc2NvcGUuYWxsU3RyYXRlZ2llcyA9IHN0cmF0ZWdpZXM7XG4gICAgICAgICAgICAkc2NvcGUuZWRpdGVkU3RyYXRlZ3kgPXt9O1xuICAgICAgICAgICAgJHNjb3BlLmFjZU9wdGlvbiA9IHtcbiAgICAgICAgICAgICAgICBvbkxvYWQ6IGZ1bmN0aW9uIChfYWNlKSB7XG4gICAgICAgICAgICAgICAgICAgIF9hY2UuZ2V0U2Vzc2lvbigpLnNldE1vZGUoXCJhY2UvbW9kZS9qc29uXCIpO1xuICAgICAgICAgICAgICAgICAgICBfYWNlLnNldFRoZW1lKFwiYWNlL3RoZW1lL3R3aWxpZ2h0XCIpXG4gICAgICAgICAgICAgICAgICAgICRzY29wZS5zdHJhdGVneUNoYW5nZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBfYWNlLnNldFZhbHVlKCRzY29wZS5zZWxlY3RlZFN0cmF0ZWd5LnJvYm90b1RleHQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLm5ld1N0cmF0ZWd5T3duZXI9JHNjb3BlLnNlbGVjdGVkU3RyYXRlZ3kub3duZXI7XG4gICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUubmV3U3RyYXRlZ3lEaXNwbGF5TmFtZT0kc2NvcGUuc2VsZWN0ZWRTdHJhdGVneS5kaXNwbGF5TmFtZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5uZXdTdHJhdGVneU5hbWU9JHNjb3BlLnNlbGVjdGVkU3RyYXRlZ3kubmFtZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5uZXdTdHJhdGVneVR5cGU9JHNjb3BlLnNlbGVjdGVkU3RyYXRlZ3kudHlwZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICAkc2NvcGUubmV3U3RyYXRlZ3lPd25lcj0kc2NvcGUuc2VsZWN0ZWRTdHJhdGVneS5vd25lcjtcbiAgICAgICAgICAgICRzY29wZS5uZXdTdHJhdGVneURpc3BsYXlOYW1lPSRzY29wZS5zZWxlY3RlZFN0cmF0ZWd5LmRpc3BsYXlOYW1lO1xuICAgICAgICAgICAgJHNjb3BlLm5ld1N0cmF0ZWd5TmFtZT0kc2NvcGUuc2VsZWN0ZWRTdHJhdGVneS5uYW1lO1xuICAgICAgICAgICAgJHNjb3BlLm5ld1N0cmF0ZWd5VHlwZT0kc2NvcGUuc2VsZWN0ZWRTdHJhdGVneS50eXBlO1xuXG4gICAgICAgICAgICB2YXIgZWRpdG9yID0gYWNlLmVkaXQoXCJhY2VFZGl0b3JcIik7XG4gICAgICAgICAgICBlZGl0b3Iuc2V0VmFsdWUoJHNjb3BlLnNlbGVjdGVkU3RyYXRlZ3kgPyAkc2NvcGUuc2VsZWN0ZWRTdHJhdGVneS5yb2JvdG9UZXh0IDogJycpO1xuICAgICAgICAgICAgdmFyIHJlZj0gZmlyZWJhc2UuZGF0YWJhc2UoKS5yZWYoKS5jaGlsZCgnc3RyYXRlZ2llcycpO1xuXG4gICAgICAgICAgICAkc2NvcGUucHVibGlzaCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBpZigkc2NvcGUuc2VsZWN0ZWRTdHJhdGVneSA9PT11bmRlZmluZWQpXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdmFyIG93bmVyID0gJHNjb3BlLnNlbGVjdGVkU3RyYXRlZ3kub3duZXI7XG4gICAgICAgICAgICAgICAgdmFyIGRpc3BsYXlOYW1lID0gJHNjb3BlLnNlbGVjdGVkU3RyYXRlZ3kuZGlzcGxheU5hbWU7XG4gICAgICAgICAgICAgICAgdmFyIG5hbWUgPSAkc2NvcGUuc2VsZWN0ZWRTdHJhdGVneS5uYW1lO1xuICAgICAgICAgICAgICAgIHZhciB0eXBlID0gJHNjb3BlLnNlbGVjdGVkU3RyYXRlZ3kudHlwZTtcblxuXG4gICAgICAgICAgICAgICAgdmFyIHRva2VucyA9IG5ldyB0b2tlbml6ZXIuVG9rZW5zKGVkaXRvci5nZXRWYWx1ZSgpKTtcbiAgICAgICAgICAgICAgICBpZih0b2tlbnNbdG9rZW5zLmxlbmd0aC0xXSAhPSBcIlxcblwiKVxuICAgICAgICAgICAgICAgICAgICB0b2tlbnMudG9rZW5zLnB1c2goXCJcXG5cIik7XG4gICAgICAgICAgICAgICAgdmFyIGFzdCA9IHRva2VuaXplci5wYXJzZUFwcHJvYWNoKG93bmVyLCBuYW1lLCBkaXNwbGF5TmFtZSwgdHlwZSwgdG9rZW5zLGVkaXRvci5nZXRWYWx1ZSgpICk7XG5cbiAgICAgICAgICAgICAgICB2YXIgeD0gcmVmLm9yZGVyQnlDaGlsZChcIm5hbWVcIikuZXF1YWxUbygkc2NvcGUuc2VsZWN0ZWRTdHJhdGVneS5uYW1lKTtcbiAgICAgICAgICAgICAgICAkc2NvcGUuc2VsZWN0ZWRTdHJhdGVneSA9IGFzdDtcbiAgICAgICAgICAgICAgICB4Lm9uKFwiY2hpbGRfYWRkZWRcIiwgZnVuY3Rpb24oc25hcHNob3QpIHtcbiAgICAgICAgICAgICAgICB2YXIga2V5ID0gc25hcHNob3Qua2V5O1xuICAgICAgICAgICAgICAgICAgICAvL2ZpcnN0IGFyZ3VtZW50IGNvbnRhaW5zIGFuIGludmFsaWQga2V5ICgkJGhhc2hLZXkpIGluIHByb3BlcnR5Li4uLiB0aGlzIGlzIGFuIGVycm9yIGhhcHBlbnMgd2hlbiB3ZSB3YW50IHRvIHB1c2ggLCB1cGRhdGUgb3Igc2V0XG4gICAgICAgICAgICAgICAgICAgIC8vIGEgcmVjb3JkIGluIGZpcmViYXNlLiBpbiBvcmRlciB0byByZW1vdmUgdGhlIGhhc2gga2Ugd2Ugc2hvdWxkIGFkZDpcbiAgICAgICAgICAgICAgICAgICAgLy9JJ3ZlIGdvdHRlbiBhcm91bmQgdGhpcyBpc3N1ZSBieSBkb2luZyBzb21ldGhpbmcgbGlrZVxuICAgICAgICAgICAgICAgICAgICAvLyBteVJlZi5wdXNoKGFuZ3VsYXIuZnJvbUpzb24oYW5ndWxhci50b0pzb24obXlBbmd1bGFyT2JqZWN0KSkpLlxuICAgICAgICAgICAgICAgICAgICBmaXJlYmFzZS5kYXRhYmFzZSgpLnJlZigpLmNoaWxkKCdzdHJhdGVnaWVzLycra2V5KS5zZXQoYW5ndWxhci5mcm9tSnNvbihhbmd1bGFyLnRvSnNvbigkc2NvcGUuc2VsZWN0ZWRTdHJhdGVneSkpKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgICRzY29wZS5hZGROZXdTdHJhdGVneSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBlZGl0b3Iuc2V0VmFsdWUoXCJcIik7XG4gICAgICAgICAgICAgICAgJHNjb3BlLm5ld1N0cmF0ZWd5T3duZXIgPSBcIlwiO1xuICAgICAgICAgICAgICAgICRzY29wZS5uZXdTdHJhdGVneU5hbWU9XCJcIjtcbiAgICAgICAgICAgICAgICAkc2NvcGUubmV3U3RyYXRlZ3lEaXNwbGF5TmFtZT1cIlwiO1xuICAgICAgICAgICAgICAgICRzY29wZS5uZXdTdHJhdGVneVR5cGU9XCJhcHByb2FjaFwiO1xuICAgICAgICAgICAgICAgICRzY29wZS5zZWxlY3RlZFN0cmF0ZWd5PXVuZGVmaW5lZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgICRzY29wZS5jcmVhdGVTdHJhdGVneSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAvLyQoXCIjZnJtU3RyYXRlZ3lDcmVhdGlvblwiKS5jc3MoXCJkaXNwbGF5XCIsIFwiYmxvY2tcIik7XG4gICAgICAgICAgICAgICAgdmFyIG93bmVyID0gJHNjb3BlLm5ld1N0cmF0ZWd5T3duZXI7XG4gICAgICAgICAgICAgICAgdmFyIGRpc3BsYXlOYW1lID0gJHNjb3BlLm5ld1N0cmF0ZWd5RGlzcGxheU5hbWU7XG4gICAgICAgICAgICAgICAgdmFyIG5hbWUgPSAkc2NvcGUubmV3U3RyYXRlZ3lOYW1lO1xuICAgICAgICAgICAgICAgIHZhciB0eXBlID0gJHNjb3BlLm5ld1N0cmF0ZWd5VHlwZTtcblxuICAgICAgICAgICAgICAgIGlmKG5hbWU9PVwiXCIgfHwgb3duZXI9PVwiXCIgfHwgZGlzcGxheU5hbWUgPT0gXCJcIiB8fCB0eXBlID09IFwiXCIpXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBhbGVydChcInBsZWFzZSBmaWxsIG91dCB0aGUgcmVxdWlyZWQgZmllbGRzXCIpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHZhciB0b2tlbnMgPSBuZXcgdG9rZW5pemVyLlRva2VucyhlZGl0b3IuZ2V0VmFsdWUoKSk7XG4gICAgICAgICAgICAgICAgaWYodG9rZW5zW3Rva2Vucy5sZW5ndGgtMV0gIT0gXCJcXG5cIilcbiAgICAgICAgICAgICAgICAgICAgdG9rZW5zLnRva2Vucy5wdXNoKFwiXFxuXCIpO1xuICAgICAgICAgICAgICAgIHZhciBhc3QgPSB0b2tlbml6ZXIucGFyc2VBcHByb2FjaChvd25lciwgbmFtZSwgZGlzcGxheU5hbWUsIHR5cGUsIHRva2VucywgZWRpdG9yLmdldFZhbHVlKCkpO1xuXG4gICAgICAgICAgICAgICAgJHNjb3BlLnNlbGVjdGVkU3RyYXRlZ3kgPSBhc3Q7XG4gICAgICAgICAgICAgICAgZmlyZWJhc2UuZGF0YWJhc2UoKS5yZWYoKS5jaGlsZCgnc3RyYXRlZ2llcycpLnB1c2goYW5ndWxhci5mcm9tSnNvbihhbmd1bGFyLnRvSnNvbigkc2NvcGUuc2VsZWN0ZWRTdHJhdGVneSkpKTtcbiAgICAgICAgICAgICAgICAkc2NvcGUuYWxsU3RyYXRlZ2llcy5wdXNoKCRzY29wZS5zZWxlY3RlZFN0cmF0ZWd5KTtcbiAgICAgICAgICAgICAgICAvLyQoXCIjZnJtU3RyYXRlZ3lDcmVhdGlvblwiKS5jc3MoXCJkaXNwbGF5XCIsIFwibm9uZVwiKTtcbiAgICAgICAgICAgICAgICAkc2NvcGUuc3RyYXRlZ3lDaGFuZ2VkKCk7XG5cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgICRzY29wZS5jYW5jZWxDcmVhdGluZ1N0cmF0ZWd5ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICRzY29wZS5zZWxlY3RlZFN0cmF0ZWd5ID0gc3RyYXRlZ2llc1swXXx8bnVsbDtcbiAgICAgICAgICAgICAgICAkc2NvcGUuc3RyYXRlZ3lDaGFuZ2VkKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0pO1xufTtcbiIsIlxudmFyIGNvbmZpZyA9IHtcbiAgICBhcGlLZXk6IFwiQUl6YVN5QVhqTDZmNzM5QlZxTERrbnltQ04ySDM2LU5CRFM4THZZXCIsXG4gICAgYXV0aERvbWFpbjogXCJzdHJhdGVneXRyYWNrZXIuZmlyZWJhc2VhcHAuY29tXCIsXG4gICAgZGF0YWJhc2VVUkw6IFwiaHR0cHM6Ly9zdHJhdGVneXRyYWNrZXIuZmlyZWJhc2Vpby5jb21cIixcbiAgICBwcm9qZWN0SWQ6IFwic3RyYXRlZ3l0cmFja2VyXCIsXG4gICAgc3RvcmFnZUJ1Y2tldDogXCJzdHJhdGVneXRyYWNrZXIuYXBwc3BvdC5jb21cIixcbiAgICBtZXNzYWdpbmdTZW5kZXJJZDogXCIyNjEyNDk4MzY1MThcIlxufTtcbmZpcmViYXNlLmluaXRpYWxpemVBcHAoY29uZmlnKTtcblxuIiwiLy8gVGhlc2UgZnVuY3Rpb25zIHBhcnNlIHRoaXMgZ3JhbW1hcjpcbi8vXG4vLyBodHRwczovL2dpdGh1Yi5jb20vZGV2dXhkL1Byb2dyYW1taW5nU3RyYXRlZ2llcy9ibG9iL21hc3Rlci9yb2JvdG8ubWRcblxuZnVuY3Rpb24gVG9rZW5zKGNvZGUpIHtcblxuICAgIHRoaXMudG9rZW5zID0gdG9rZW5pemUoY29kZSk7XG5cbiAgICAvLyBSZW1tZWJlciBhbGwgb2YgdGhlIHRva2VucyBlYXRlbiBzbyB3ZSBjYW4gcHJvdmlkZSB1c2VmdWwgZXJyb3IgbWVzc2FnZSBjb250ZXh0LlxuICAgIHRoaXMuZWF0ZW4gPSBbXTtcblxuICAgIHRoaXMuZWF0ID0gZnVuY3Rpb24oZXhwZWN0ZWQpIHtcbiAgICAgICAgLy9jb25zb2xlLmxvZyhleHBlY3RlZCk7XG5cbiAgICAgICAgaWYoZXhwZWN0ZWQgJiYgIXRoaXMubmV4dElzKGV4cGVjdGVkKSkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJleHBlY3RlZFwiLCBleHBlY3RlZCk7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJMaW5lIFwiICsgdGhpcy5jdXJyZW50TGluZSgpICsgXCI6IGV4cGVjdGVkICdcIiArIGV4cGVjdGVkICsgXCInLCBidXQgZm91bmQgJ1wiICsgdGhpcy50b2tlbnMuc2xpY2UoMCwgNSkuam9pbihcIiBcIikgKyBcIidcIik7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgZWF0ZW4gPSB0aGlzLnRva2Vucy5zaGlmdCgpO1xuXG4gICAgICAgIHRoaXMuZWF0ZW4ucHVzaChlYXRlbik7XG5cbiAgICAgICAgcmV0dXJuIGVhdGVuO1xuXG4gICAgfVxuXG4gICAgdGhpcy51bmVhdCA9IGZ1bmN0aW9uKCkge1xuXG4gICAgICAgIHRoaXMudG9rZW5zLnVuc2hpZnQodGhpcy5lYXRlbi5wb3AoKSk7XG5cbiAgICB9XG5cbiAgICB0aGlzLmVhdE4gPSBmdW5jdGlvbihuKSB7XG5cbiAgICAgICAgZm9yKHZhciBpID0gMDsgaSA8IG47IGkrKylcbiAgICAgICAgICAgIHRoaXMuZWF0KCk7XG5cbiAgICB9XG5cbiAgICB0aGlzLmNvdW50ID0gZnVuY3Rpb24odGV4dCkge1xuXG4gICAgICAgIHZhciBpbmRleCA9IDA7XG4gICAgICAgIHdoaWxlKGluZGV4IDwgdGhpcy50b2tlbnMubGVuZ3RoICYmIHRoaXMudG9rZW5zW2luZGV4XSA9PT0gdGV4dClcbiAgICAgICAgICAgIGluZGV4Kys7XG4gICAgICAgIHJldHVybiBpbmRleDtcblxuICAgIH1cblxuICAgIHRoaXMuaGFzTmV4dCA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy50b2tlbnMubGVuZ3RoID4gMDsgfVxuICAgIHRoaXMubmV4dElzID0gZnVuY3Rpb24oc3RyaW5nKSB7IHJldHVybiB0aGlzLmhhc05leHQoKSAmJiB0aGlzLnBlZWsoKSA9PT0gc3RyaW5nOyB9XG4gICAgdGhpcy5wZWVrID0gZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLmhhc05leHQoKSA/IHRoaXMudG9rZW5zWzBdLnRvTG93ZXJDYXNlKCkgOiBudWxsOyB9XG5cbiAgICB0aGlzLmN1cnJlbnRMaW5lID0gZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgdmFyIGxpbmUgPSAxO1xuICAgICAgICBmb3IodmFyIGkgPSAwOyBpIDwgdGhpcy5lYXRlbi5sZW5ndGg7ICsraSkge1xuICAgICAgICAgICAgaWYodGhpcy5lYXRlbltpXSA9PT0gXCJcXG5cIilcbiAgICAgICAgICAgICAgICBsaW5lKys7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGxpbmU7XG5cbiAgICB9XG5cbn1cblxuLy8gVG9rZW5zIGFyZSBzZWdtZW50ZWQgYnkgd2hpdGVzcGFjZSwgKidzLCBhbmQgcGFyZW50aGVzZXNcbmZ1bmN0aW9uIHRva2VuaXplKHN0cmF0ZWd5KSB7XG5cbiAgICB2YXIgaW5kZXggPSAwO1xuICAgIHZhciB0b2tlbnMgPSBbXTtcblxuICAgIHdoaWxlKGluZGV4IDwgc3RyYXRlZ3kubGVuZ3RoKSB7XG5cbiAgICAgICAgLy8gRWF0IGFueSBzcGFjZXMuXG4gICAgICAgIHdoaWxlKHN0cmF0ZWd5LmNoYXJBdChpbmRleCkubWF0Y2goLyAvKSlcbiAgICAgICAgICAgIGluZGV4Kys7XG5cbiAgICAgICAgLy8gSWYgd2UndmUgcmVhY2hlZCB0aGUgZW5kIG9mIHRoZSBzdHJpbmcsIHdlJ3JlIGRvbmUuXG4gICAgICAgIGlmKGluZGV4ID09PSBzdHJhdGVneS5sZW5ndGgpXG4gICAgICAgICAgICBicmVhaztcblxuICAgICAgICBpZihzdHJhdGVneS5jaGFyQXQoaW5kZXgpID09PSBcIlxcblwiKSB7XG4gICAgICAgICAgICB0b2tlbnMucHVzaChcIlxcblwiKTtcbiAgICAgICAgICAgIGluZGV4Kys7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZihzdHJhdGVneS5jaGFyQXQoaW5kZXgpID09PSBcIlxcdFwiKSB7XG4gICAgICAgICAgICB0b2tlbnMucHVzaChcIlxcdFwiKTtcbiAgICAgICAgICAgIGluZGV4Kys7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZihzdHJhdGVneS5jaGFyQXQoaW5kZXgpID09PSBcIihcIikge1xuICAgICAgICAgICAgdG9rZW5zLnB1c2goXCIoXCIpO1xuICAgICAgICAgICAgaW5kZXgrKztcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmKHN0cmF0ZWd5LmNoYXJBdChpbmRleCkgPT09IFwiKVwiKSB7XG4gICAgICAgICAgICB0b2tlbnMucHVzaChcIilcIik7XG4gICAgICAgICAgICBpbmRleCsrO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYoc3RyYXRlZ3kuY2hhckF0KGluZGV4KSA9PT0gXCIjXCIpIHtcbiAgICAgICAgICAgIHZhciBjb21tZW50U3RhcnQgPSBpbmRleDtcbiAgICAgICAgICAgIHdoaWxlKHN0cmF0ZWd5LmNoYXJBdChpbmRleCkgIT09IFwiXFxuXCIpXG4gICAgICAgICAgICAgICAgaW5kZXgrKztcbiAgICAgICAgICAgIHRva2Vucy5wdXNoKHN0cmF0ZWd5LnN1YnN0cmluZyhjb21tZW50U3RhcnQsIGluZGV4KSk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gVG9rZW5pemUgYW4gaWRlbnRpZmllclxuICAgICAgICBlbHNlIGlmKHN0cmF0ZWd5LmNoYXJBdChpbmRleCkubWF0Y2goL1snXFx3XS8pKSB7XG5cbiAgICAgICAgICAgIHZhciBpZGVudGlmaWVyU3RhcnQgPSBpbmRleDtcbiAgICAgICAgICAgIHdoaWxlKHN0cmF0ZWd5LmNoYXJBdChpbmRleCkubWF0Y2goL1snXFx3XS8pKVxuICAgICAgICAgICAgICAgIGluZGV4Kys7XG4gICAgICAgICAgICB0b2tlbnMucHVzaChzdHJhdGVneS5zdWJzdHJpbmcoaWRlbnRpZmllclN0YXJ0LCBpbmRleCkpO1xuXG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJJJ20gbm90IHNtYXJ0IGVub3VnaCB0byBoYW5kbGUgdGhlIGNoYXJhY3RlciAnXCIgKyBzdHJhdGVneS5jaGFyQXQoaW5kZXgpICsgXCInXCIpO1xuICAgICAgICB9XG5cbiAgICB9XG5cbiAgICByZXR1cm4gdG9rZW5zO1xuXG59XG5cbi8qXG4qIEJlbG93IGlzIGEgYmFzaWMgcmVjdXJzaXZlLWRlc2NlbnQgcGFyc2VyIGZvciBSb2JvdG8uIFRoZXJlJ3Mgb25lXG4qIGZ1bmN0aW9uIGZvciBlYWNoIG5vbi10ZXJtaW5hbC5cbiovXG5cbi8vIEV4cGVjdHMgYSBsaXN0IG9mIHN0cmluZ3MuXG5mdW5jdGlvbiBwYXJzZUFwcHJvYWNoKG93bmVyLCBuYW1lLCBkaXNwbGF5TmFtZSwgdHlwZSwgdG9rZW5zLCByb2JvdG9UZXh0KSB7XG5cbiAgICB2YXIgc3RyYXRlZ2llcyA9IFtdO1xuICAgIHZhciBkZXNjcmlwdGlvbnMgPSBbXTtcblxuICAgIC8vIElmIGl0J3MgYSBjb21tZW50LCByZWFkIGEgY29tbWVudC5cbiAgICB3aGlsZSh0b2tlbnMucGVlaygpLmNoYXJBdCgwKSA9PT0gXCIjXCIpIHtcbiAgICAgICAgZGVzY3JpcHRpb25zLnB1c2godG9rZW5zLmVhdCgpKTtcbiAgICAgICAgdG9rZW5zLmVhdChcIlxcblwiKTtcbiAgICB9XG4gICAgLy8gUGFyc2Ugb25lIG9yIG1vcmUgc3RyYXRlZ2llcy5cbiAgICB3aGlsZSh0b2tlbnMubmV4dElzKFwic3RyYXRlZ3lcIikpIHtcbiAgICAgICAgc3RyYXRlZ2llcy5wdXNoKHBhcnNlU3RyYXRlZ3kodG9rZW5zKSk7XG4gICAgfVxuXG4gICAgLy8gUGFyc2Ugb25lIG9yIG1vcmUgc3RyYXRlZ2llcy5cbiAgICB3aGlsZSh0b2tlbnMubmV4dElzKFwic3RyYXRlZ3lcIikpIHtcbiAgICAgICAgc3RyYXRlZ2llcy5wdXNoKHBhcnNlU3RyYXRlZ3kodG9rZW5zKSk7XG4gICAgfVxuXG4gICAgaWYodG9rZW5zLmhhc05leHQoKSlcbiAgICAgICAgY29uc29sZS5lcnJvcihcIkknbSBub3Qgc21hcnQgZW5vdWdoIHRvIGhhbmRsZSBhbnl0aGluZyBvdGhlciB0aGFuIHN0cmF0ZWdpZXMsIHNvIEkgZ290IHN0dWNrIG9uICdcIiArIHRva2Vucy50b2tlbnMuc2xpY2UoMCwgNSkuam9pbihcIiBcIikgKyBcIidcIik7XG5cbiAgICByZXR1cm4ge1xuICAgICAgICBvd25lcjpvd25lcixcbiAgICAgICAgbmFtZTogbmFtZSxcbiAgICAgICAgZGVzY3JpcHRpb246IGRlc2NyaXB0aW9ucyxcbiAgICAgICAgZGlzcGxheU5hbWU6IGRpc3BsYXlOYW1lLFxuICAgICAgICB0eXBlOiB0eXBlLFxuICAgICAgICByb2JvdG9UZXh0OiByb2JvdG9UZXh0LFxuICAgICAgICBzdHJhdGVnaWVzOiBzdHJhdGVnaWVzXG4gICAgfTtcblxufVxuXG4vLyBTVFJBVEVHWSA6OiBzdHJhdGVneSBJREVOVElGSUVSICggSURFTlRJRklFUisgKSBTVEFURU1FTlRTIFxcblxuZnVuY3Rpb24gcGFyc2VTdHJhdGVneSh0b2tlbnMpIHtcblxuICAgIHRva2Vucy5lYXQoXCJzdHJhdGVneVwiKTtcbiAgICB2YXIgaWRlbnRpZmllciA9IHRva2Vucy5lYXQoKTtcblxuICAgIHRva2Vucy5lYXQoXCIoXCIpO1xuICAgIHZhciBwYXJhbWV0ZXJzID0gW107XG4gICAgd2hpbGUoIXRva2Vucy5uZXh0SXMoXCIpXCIpKSB7XG4gICAgICAgIHBhcmFtZXRlcnMucHVzaCh0b2tlbnMuZWF0KCkpOyAvLyBDb25zdW1lIGFyZ3VtZW50c1xuICAgIH1cbiAgICB0b2tlbnMuZWF0KFwiKVwiKTsgLy8gQ29uc3VtZSByaWdodCBwYXJlbnRoZXNpc1xuXG4gICAgLy8gQ29uc3VtZSBzdGF0ZW1lbnRzLlxuICAgIHZhciBzdGF0ZW1lbnRzID0gcGFyc2VTdGF0ZW1lbnRzKHRva2VucywgMSk7XG5cbiAgICAvLyBDb25zdW1lIGFueSBudW1iZXIgb2YgbmV3bGluZXMuXG4gICAgd2hpbGUodG9rZW5zLm5leHRJcyhcIlxcblwiKSlcbiAgICAgICAgdG9rZW5zLmVhdChcIlxcblwiKTtcblxuICAgIHJldHVybiB7XG4gICAgICAgIHR5cGU6IFwic3RyYXRlZ3lcIixcbiAgICAgICAgbmFtZTogaWRlbnRpZmllcixcbiAgICAgICAgcGFyYW1ldGVyczogcGFyYW1ldGVycyxcbiAgICAgICAgc3RhdGVtZW50czogc3RhdGVtZW50cyxcbiAgICAgICAgdGV4dCA6IFwiU3RyYXRlZ3kgXCIgKyBpZGVudGlmaWVyICsgXCIoXCIgKyBwYXJhbWV0ZXJzLmpvaW4oJyAnKSArXCIpXCJcbiAgICB9O1xuXG59XG5cbi8vIFNUQVRFTUVOVFMgOjogU1RBVEVNRU5UK1xuZnVuY3Rpb24gcGFyc2VTdGF0ZW1lbnRzKHRva2VucywgdGFic0V4cGVjdGVkKSB7XG5cbiAgICB2YXIgc3RhdGVtZW50cyA9IFtdO1xuICAgIHZhciBjb21tZW50cyA9IFtdO1xuXG4gICAgLy8gQmxvY2sgc3RhcnRzIHdpdGggYSBuZXdsaW5lLlxuICAgIHRva2Vucy5lYXQoXCJcXG5cIik7XG5cbiAgICAvLyBSZWFkIHN0YXRlbWVudHMgdW50aWwgd2UgZmluZCBmZXdlciB0YWJzIHRoYW4gZXhwZWN0ZWQuXG4gICAgZG8ge1xuXG4gICAgICAgIC8vIEhvdyBtYW55IHRhYnM/XG4gICAgICAgIHZhciB0YWJzQ291bnRlZCA9IHRva2Vucy5jb3VudChcIlxcdFwiKTtcblxuICAgICAgICAvLyBJZiB3ZSBmb3VuZCBhbGwgdGhlIHRhYnMgd2UgZXhwZWN0ZWQgYW5kIG1vcmUsIHRoZXJlIGFyZSBleHRyYSB0YWJzLCBhbmQgd2Ugc2hvdWxkIGZhaWwuXG4gICAgICAgIGlmKHRhYnNDb3VudGVkID4gdGFic0V4cGVjdGVkKVxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiSSBleHBlY3RlZCBcIiArIHRhYnNFeHBlY3RlZCArIFwiIGJ1dCBmb3VuZCBcIiArIHRhYnNDb3VudGVkICsgXCI7IGRpZCBzb21lIGV4dHJhIHRhYnMgZ2V0IGluP1wiKTtcbiAgICAgICAgLy8gSWYgd2UgZm91bmQgdGhlIHJpZ2h0IG51bWJlciwgZWF0IHRoZW0uXG4gICAgICAgIGVsc2UgaWYodGFic0NvdW50ZWQgPT09IHRhYnNFeHBlY3RlZClcbiAgICAgICAgICAgIHRva2Vucy5lYXROKHRhYnNFeHBlY3RlZCk7XG4gICAgICAgIC8vIElmIHdlIGZvdW5kIGZld2VyLCB3ZSdyZSBkb25lIGVhdGluZyBzdGF0ZW1lbnRzLlxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gSWYgaXQncyBhIGNvbW1lbnQsIHJlYWQgYSBjb21tZW50LlxuICAgICAgICBpZih0b2tlbnMucGVlaygpLmNoYXJBdCgwKSA9PT0gXCIjXCIpIHtcbiAgICAgICAgICAgIGNvbW1lbnRzLnB1c2godG9rZW5zLmVhdCgpKTtcbiAgICAgICAgICAgIHRva2Vucy5lYXQoXCJcXG5cIik7XG4gICAgICAgIH1cbiAgICAgICAgLy8gT3RoZXJ3aXNlLCByZWFkIGEgc3RhdGVtZW50IGFuZCBhc3NpZ24gdGhlIGNvbW1lbnRzLlxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHZhciBzdGF0ZW1lbnQgPSBwYXJzZVN0YXRlbWVudCh0b2tlbnMsIHRhYnNFeHBlY3RlZCk7XG4gICAgICAgICAgICBzdGF0ZW1lbnQuY29tbWVudHMgPSBjb21tZW50cztcbiAgICAgICAgICAgIHN0YXRlbWVudC50ZXh0ID0gc3RhdGVtZW50LnRvU3RyaW5nKCk7XG4gICAgICAgICAgICBjb21tZW50cyA9IFtdO1xuICAgICAgICAgICAgc3RhdGVtZW50cy5wdXNoKHN0YXRlbWVudCk7XG4gICAgICAgIH1cblxuICAgIH0gd2hpbGUodHJ1ZSk7XG5cbiAgICByZXR1cm4gc3RhdGVtZW50cztcblxufVxuXG4vLyBTVEFURU1FTlQgOjogKiAoQUNUSU9OIHwgQ0FMTCB8IENPTkRJVElPTkFMIHwgRk9SRUFDSCB8IERFRklOSVRJT04gfCBSRVRVUk4gKSsgWyMgd29yZCtdXG5mdW5jdGlvbiBwYXJzZVN0YXRlbWVudCh0b2tlbnMsIHRhYnNFeHBlY3RlZCkge1xuXG4gICAgdmFyIGtleXdvcmQgPSB0b2tlbnMucGVlaygpO1xuICAgIHZhciBzdGF0ZW1lbnQgPSBudWxsO1xuXG4gICAgaWYoa2V5d29yZCA9PT0gXCJkb1wiKVxuICAgICAgICBzdGF0ZW1lbnQgPSBwYXJzZURvKHRva2Vucyk7XG4gICAgZWxzZSBpZihrZXl3b3JkID09PSBcInVudGlsXCIpXG4gICAgICAgIHN0YXRlbWVudCA9IHBhcnNlVW50aWwodG9rZW5zLCB0YWJzRXhwZWN0ZWQpO1xuICAgIGVsc2UgaWYoa2V5d29yZCA9PT0gXCJpZlwiKVxuICAgICAgICBzdGF0ZW1lbnQgPSBwYXJzZUlmKHRva2VucywgdGFic0V4cGVjdGVkKTtcbiAgICBlbHNlIGlmKGtleXdvcmQgPT09IFwiZm9yXCIpXG4gICAgICAgIHN0YXRlbWVudCA9IHBhcnNlRm9yRWFjaCh0b2tlbnMsIHRhYnNFeHBlY3RlZCk7XG4gICAgZWxzZSBpZihrZXl3b3JkID09PSBcInNldFwiKVxuICAgICAgICBzdGF0ZW1lbnQgPSBwYXJzZVNldCh0b2tlbnMpO1xuICAgIGVsc2UgaWYoa2V5d29yZCA9PT0gXCJyZXR1cm5cIilcbiAgICAgICAgc3RhdGVtZW50ID0gcGFyc2VSZXR1cm4odG9rZW5zKTtcbiAgICBlbHNlXG4gICAgICAgIHN0YXRlbWVudCA9IHBhcnNlQWN0aW9uKHRva2Vucyk7XG5cbiAgICByZXR1cm4gc3RhdGVtZW50O1xuXG59XG5cbi8vIEFDVElPTiA6OiBXT1JEUyBcXG5cbmZ1bmN0aW9uIHBhcnNlQWN0aW9uKHRva2Vucykge1xuXG4gICAgdmFyIHdvcmRzID0gcGFyc2VXb3Jkcyh0b2tlbnMpO1xuICAgIHRva2Vucy5lYXQoXCJcXG5cIik7XG5cbiAgICByZXR1cm4ge1xuICAgICAgICB0eXBlOiBcImFjdGlvblwiLFxuICAgICAgICB3b3Jkczogd29yZHMsXG4gICAgICAgIHRvU3RyaW5nOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gd29yZHMuam9pbignICcpO1xuICAgICAgICB9XG4gICAgfVxuXG59XG5cbi8vIFdPUkRTIDo6IC4rXG5mdW5jdGlvbiBwYXJzZVdvcmRzKHRva2Vucykge1xuXG4gICAgdmFyIHdvcmRzID0gW107XG4gICAgd2hpbGUodG9rZW5zLmhhc05leHQoKSAmJiAhdG9rZW5zLm5leHRJcyhcIlxcblwiKSlcbiAgICAgICAgd29yZHMucHVzaCh0b2tlbnMuZWF0KCkpO1xuICAgIHJldHVybiB3b3JkcztcblxufVxuXG4vLyBETyA6OiBkbyBDQUxMXG5mdW5jdGlvbiBwYXJzZURvKHRva2Vucykge1xuXG4gICAgdG9rZW5zLmVhdChcImRvXCIpO1xuXG4gICAgdmFyIGNhbGwgPSBwYXJzZUNhbGwodG9rZW5zKTtcblxuICAgIC8vIEVhdCB0aGUgdHJhaWxpbmcgbmV3bGluZVxuICAgIHRva2Vucy5lYXQoXCJcXG5cIik7XG5cbiAgICByZXR1cm4ge1xuICAgICAgICB0eXBlOiBcImRvXCIsXG4gICAgICAgIGNhbGw6IGNhbGwsXG4gICAgICAgIHRvU3RyaW5nOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gXCJkbyBcIiArIGNhbGwudG9TdHJpbmcoKVxuICAgICAgICB9XG4gICAgfTtcblxufVxuXG4vLyBDQUxMIDo6IGlkZW50aWZpZXIgKCBJREVOVElGSUVSKiApXG5mdW5jdGlvbiBwYXJzZUNhbGwodG9rZW5zKSB7XG5cbiAgICB2YXIgaWRlbnRpZmllciA9IHRva2Vucy5lYXQoKTsgLy8gQ29uc3VtZSBuYW1lXG4gICAgdG9rZW5zLmVhdChcIihcIik7IC8vIENvbnN1bWUgbGVmdCBwYXJlblxuICAgIC8vIENvbnN1bWUgYXJndW1lbnRzXG4gICAgdmFyIGFyZ3MgPSBbXTtcbiAgICB3aGlsZSghdG9rZW5zLm5leHRJcyhcIilcIikpIHtcbiAgICAgICAgYXJncy5wdXNoKHRva2Vucy5lYXQoKSk7XG4gICAgfVxuICAgIHRva2Vucy5lYXQoXCIpXCIpO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgdHlwZTogXCJjYWxsXCIsXG4gICAgICAgIG5hbWU6IGlkZW50aWZpZXIsXG4gICAgICAgIGFyZ3VtZW50czogYXJncyxcbiAgICAgICAgdG9TdHJpbmc6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBpZGVudGlmaWVyICsgXCIoXCIgKyBhcmdzLmpvaW4oJyAnKSArIFwiKVwiO1xuICAgICAgICB9XG4gICAgfTtcblxufVxuXG4vLyBVTlRJTCA6OiB1bnRpbCBRVUVSWSBTVEFURU1FTlRTXG5mdW5jdGlvbiBwYXJzZVVudGlsKHRva2VucywgdGFic0V4cGVjdGVkKSB7XG5cbiAgICB0b2tlbnMuZWF0KFwidW50aWxcIik7XG4gICAgdmFyIHF1ZXJ5ID0gcGFyc2VRdWVyeSh0b2tlbnMpO1xuXG4gICAgdmFyIHN0YXRlbWVudHMgPSBwYXJzZVN0YXRlbWVudHModG9rZW5zLCB0YWJzRXhwZWN0ZWQgKyAxKTtcblxuICAgIHJldHVybiB7XG4gICAgICAgIHR5cGU6IFwidW50aWxcIixcbiAgICAgICAgcXVlcnk6IHF1ZXJ5LFxuICAgICAgICBzdGF0ZW1lbnRzOiBzdGF0ZW1lbnRzLFxuICAgICAgICB0b1N0cmluZzogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIFwidW50aWwgXCIgKyBxdWVyeS50b1N0cmluZygpO1xuICAgICAgICB9XG4gICAgfTtcblxufVxuXG4vLyBDT05ESVRJT05BTCA6OiBpZiBRVUVSWSBTVEFURU1FTlRTXG5mdW5jdGlvbiBwYXJzZUlmKHRva2VucywgdGFic0V4cGVjdGVkKSB7XG5cbiAgICB0b2tlbnMuZWF0KFwiaWZcIik7XG4gICAgdmFyIHF1ZXJ5ID0gcGFyc2VRdWVyeSh0b2tlbnMpO1xuXG4gICAgdmFyIHN0YXRlbWVudHMgPSBwYXJzZVN0YXRlbWVudHModG9rZW5zLCB0YWJzRXhwZWN0ZWQgKyAxKTtcblxuICAgIHJldHVybiB7XG4gICAgICAgIHR5cGU6IFwiaWZcIixcbiAgICAgICAgcXVlcnk6IHF1ZXJ5LFxuICAgICAgICBzdGF0ZW1lbnRzOiBzdGF0ZW1lbnRzLFxuICAgICAgICB0b1N0cmluZzogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIFwiaWYgXCIgKyBxdWVyeS50b1N0cmluZygpO1xuICAgICAgICB9XG4gICAgfTtcblxufVxuXG4vLyBGT1JFQUNIIDo6IGZvciBlYWNoIElERU5USUZJRVIgaW4gSURFTlRJRklFUiBTVEFURU1FTlRTXG5mdW5jdGlvbiBwYXJzZUZvckVhY2godG9rZW5zLCB0YWJzRXhwZWN0ZWQpIHtcblxuICAgIHRva2Vucy5lYXQoXCJmb3JcIik7XG4gICAgdG9rZW5zLmVhdChcImVhY2hcIik7XG4gICAgdmFyIGlkZW50aWZpZXIgPSB0b2tlbnMuZWF0KCk7XG4gICAgdG9rZW5zLmVhdChcImluXCIpO1xuICAgIHZhciBsaXN0ID0gdG9rZW5zLmVhdCgpO1xuXG4gICAgdmFyIHN0YXRlbWVudHMgPSBwYXJzZVN0YXRlbWVudHModG9rZW5zLCB0YWJzRXhwZWN0ZWQgKyAxKTtcblxuICAgIHJldHVybiB7XG4gICAgICAgIHR5cGU6IFwiZm9yZWFjaFwiLFxuICAgICAgICBsaXN0OiBsaXN0LFxuICAgICAgICBpZGVudGlmaWVyOiBpZGVudGlmaWVyLFxuICAgICAgICBzdGF0ZW1lbnRzOiBzdGF0ZW1lbnRzLFxuICAgICAgICB0b1N0cmluZzogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIFwiZm9yIGVhY2hcIiArIGlkZW50aWZpZXIgKyBcIiBpbiBcIiArIGxpc3Q7XG4gICAgICAgIH1cbiAgICB9O1xuXG59XG5cbi8vIFNFVCA6OiBzZXQgSURFTlRJRklFUiB0byBRVUVSWVxuZnVuY3Rpb24gcGFyc2VTZXQodG9rZW5zKSB7XG5cbiAgICB0b2tlbnMuZWF0KFwic2V0XCIpO1xuICAgIHZhciBpZGVudGlmaWVyID0gdG9rZW5zLmVhdCgpO1xuICAgIHRva2Vucy5lYXQoXCJ0b1wiKTtcbiAgICB2YXIgcXVlcnkgPSBwYXJzZVF1ZXJ5KHRva2Vucyk7XG5cbiAgICAvLyBFYXQgdGhlIHRyYWlsaW5nIG5ld2xpbmVcbiAgICB0b2tlbnMuZWF0KFwiXFxuXCIpO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgdHlwZTogXCJzZXRcIixcbiAgICAgICAgaWRlbnRpZmllcjogaWRlbnRpZmllcixcbiAgICAgICAgcXVlcnk6IHF1ZXJ5LFxuICAgICAgICB0b1N0cmluZzogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIFwic2V0IFwiICsgaWRlbnRpZmllciArIFwiIHRvIFwiICsgIHF1ZXJ5LnRvU3RyaW5nKCk7XG4gICAgICAgIH1cbiAgICB9O1xuXG59XG5cbi8vIFJFVFVSTiA6OiByZXR1cm4gUVVFUllcbmZ1bmN0aW9uIHBhcnNlUmV0dXJuKHRva2Vucykge1xuXG4gICAgdG9rZW5zLmVhdChcInJldHVyblwiKTtcbiAgICB2YXIgcXVlcnkgPSBwYXJzZVF1ZXJ5KHRva2Vucyk7XG5cbiAgICAvLyBFYXQgdGhlIHRyYWlsaW5nIG5ld2xpbmVcbiAgICB0b2tlbnMuZWF0KFwiXFxuXCIpO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgdHlwZTogXCJyZXR1cm5cIixcbiAgICAgICAgcXVlcnk6IHF1ZXJ5LFxuICAgICAgICB0b1N0cmluZzogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIFwicmV0dXJuIFwiICsgcXVlcnkudG9TdHJpbmcoKTtcbiAgICAgICAgfVxuICAgIH07XG5cbn1cblxuLy8gUVVFUlkgOjogSURFTlRJRklFUiB8IENBTEwgfCBOT1RISU5HIHwgV09SRFNcbmZ1bmN0aW9uIHBhcnNlUXVlcnkodG9rZW5zKSB7XG5cbiAgICB2YXIgZmlyc3QgPSB0b2tlbnMuZWF0KCk7XG5cbiAgICAvLyBJZiBpdCdzIGEgc3RyYXRlZ3kgY2FsbCwgcGFyc2UgYSBjYWxsLlxuICAgIGlmKHRva2Vucy5uZXh0SXMoXCIoXCIpKSB7XG5cbiAgICAgICAgdG9rZW5zLnVuZWF0KCk7XG4gICAgICAgIHJldHVybiBwYXJzZUNhbGwodG9rZW5zKTtcblxuICAgIH1cbiAgICAvLyBJZiBpdCdzIFwibm90aGluZ1wiLCBzdG9wIHBhcnNpbmdcbiAgICBlbHNlIGlmKGZpcnN0ID09PSBcIm5vdGhpbmdcIikge1xuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0eXBlOiBcIm5vdGhpbmdcIixcbiAgICAgICAgICAgIG5vdGhpbmc6IGZpcnN0LFxuICAgICAgICAgICAgdG9TdHJpbmc6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gXCJub3RoaW5nXCI7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgIH1cbiAgICAvLyBPdGhlcndpc2UsIHBhcnNlIHdvcmRzXG4gICAgZWxzZSB7XG5cbiAgICAgICAgdmFyIHdvcmRzID0gcGFyc2VXb3Jkcyh0b2tlbnMpO1xuICAgICAgICB3b3Jkcy51bnNoaWZ0KGZpcnN0KTtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogXCJxdWVyeVwiLFxuICAgICAgICAgICAgd29yZHM6IHdvcmRzLFxuICAgICAgICAgICAgdG9TdHJpbmc6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gIHdvcmRzLmpvaW4oJyAnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgfVxuXG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIFRva2VuczogVG9rZW5zLFxuICAgIHBhcnNlQXBwcm9hY2g6cGFyc2VBcHByb2FjaFxuXG59O1xuXG4vLyBmcyA9IHJlcXVpcmUoJ2ZzJylcbi8vIC8vY29uc29sZS5sb2cocHJvY2Vzcy5hcmd2WzJdKTtcbi8vXG4vLyBmcy5yZWFkRmlsZShwcm9jZXNzLmFyZ3ZbMl0sICd1dGY4JywgZnVuY3Rpb24gKGVycixkYXRhKSB7XG4vLyAgICAgaWYgKGVycikge1xuLy8gICAgICAgICByZXR1cm4gY29uc29sZS5sb2coZXJyKTtcbi8vICAgICB9XG4vLyAgICAgLy9jb25zb2xlLmxvZyhcImRhdGEgPSBcIiwgZGF0YSk7XG4vLyAgICAgdmFyIHN0cmF0ZWd5ID0gZGF0YTtcbi8vXG4vLyAgICAgdHJ5IHtcbi8vICAgICAgICAgdmFyIHRva2VucyA9IG5ldyBUb2tlbnMoc3RyYXRlZ3kpO1xuLy8gICAgICAgICAvL293bmVyLCBuYW1lLCBkaXNwbGF5TmFtZSwgdHlwZSwgdG9rZW5zLCByb2JvdG9UZXh0XG4vLyAgICAgICAgIHZhciBhc3QgPSBwYXJzZUFwcHJvYWNoKFwibWV5c2FtXCIsIHByb2Nlc3MuYXJndlsyXSwgXCJtZXlzYW1cIiwgXCJhcHByb2FjaFwiLCAgdG9rZW5zLCBcIlwiKTtcbi8vICAgICAgICAgY29uc29sZS5sb2coSlNPTi5zdHJpbmdpZnkoYXN0LCBudWxsLCAyKSk7XG4vLyAgICAgfSBjYXRjaChleCkge1xuLy8gICAgICAgICBjb25zb2xlLmxvZyhleCk7XG4vLyAgICAgfVxuLy9cbi8vIH0pO1xuXG4iXX0=
