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

    // Parse one or more strategies.
    while (tokens.nextIs("strategy")) {
        strategies.push(parseStrategy(tokens));
    }

    if (tokens.hasNext()) console.error("I'm not smart enough to handle anything other than strategies, so I got stuck on '" + tokens.tokens.slice(0, 5).join(" ") + "'");

    return {
        owner: owner,
        name: name,
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJhZG1pbi5qcyIsImRhdGFNYW5hZ2VtZW50LmpzIiwiLi4vdG9rZW5pemVyLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7QUNHQSxNQUFNLEtBQUssUUFBUSxxQkFBUixDQUFYO0FBQ0EsTUFBTSxZQUFZLFFBQVEsaUJBQVIsQ0FBbEI7O0FBRUEsSUFBSSxPQUFPLE1BQVAsS0FBa0IsV0FBbEIsSUFBaUMsT0FBTyxPQUE1QyxFQUFxRDtBQUNqRCxRQUFJLFVBQVUsUUFBUSxNQUFSLENBQWUsU0FBZixFQUF5QixDQUFDLFFBQUQsQ0FBekIsQ0FBZDtBQUNBLFlBQVEsT0FBUixDQUFnQixpQkFBaEIsRUFBbUMsVUFBUyxFQUFULEVBQWE7O0FBRTVDLFlBQUksYUFBWSxFQUFoQjtBQUNBLFlBQUksV0FBVyxHQUFHLEtBQUgsRUFBZjtBQUNBLGlCQUFTLFFBQVQsR0FBb0IsR0FBcEIsQ0FBd0IsWUFBeEIsRUFBc0MsSUFBdEMsQ0FBMkMsT0FBM0MsRUFBb0QsSUFBcEQsQ0FBeUQsVUFBUyxRQUFULEVBQW1CO0FBQ3hFLHFCQUFTLE9BQVQsQ0FBaUIsVUFBUyxhQUFULEVBQXdCO0FBQ3JDLDJCQUFXLElBQVgsQ0FBZ0IsY0FBYyxHQUFkLEVBQWhCO0FBQ0gsYUFGRDtBQUdBLHFCQUFTLE9BQVQsQ0FBaUIsVUFBakI7QUFDSCxTQUxELEVBS0csS0FMSCxDQUtTLFVBQVMsR0FBVCxFQUFjO0FBQ25CLHFCQUFTLE1BQVQsQ0FBZ0IsR0FBaEI7QUFDSCxTQVBEO0FBUUEsZUFBTztBQUNILG9CQUFRLFlBQVc7QUFDZix1QkFBTyxTQUFTLE9BQWhCO0FBQ0g7QUFIRSxTQUFQO0FBS0gsS0FqQkQ7O0FBbUJBLFlBQVEsVUFBUixDQUFtQixXQUFuQixFQUFnQyxVQUFVLE1BQVYsRUFBa0IsZUFBbEIsRUFBbUM7QUFDL0Q7O0FBQ0EsZUFBTyxnQkFBUCxHQUEwQixFQUExQjtBQUNB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dUJBQU87QUFDSCwwQkFBTSxPQURIO0FBRUgsMkJBQU8sS0FGSjtBQUdILDhCQUFVLFlBQVk7QUFDbEIsK0JBQVEsTUFBTSxJQUFOLENBQVcsR0FBWCxDQUFSO0FBQ0g7QUFMRSxpQkFBUDtBQVFIO0FBRUo7O0FBRUQsT0FBTyxPQUFQLEdBQWlCO0FBQ2IsWUFBUSxNQURLO0FBRWIsbUJBQWM7O0FBRkQsQ0FBakI7O0FBTUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJcblxuXG5jb25zdCBkYiA9IHJlcXVpcmUoJy4vZGF0YU1hbmFnZW1lbnQuanMnKTtcbmNvbnN0IHRva2VuaXplciA9IHJlcXVpcmUoJy4uL3Rva2VuaXplci5qcycpO1xuXG5pZiAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcgJiYgd2luZG93LmFuZ3VsYXIpIHtcbiAgICBsZXQgbXlBZG1pbiA9IGFuZ3VsYXIubW9kdWxlKCdteUFkbWluJyxbJ3VpLmFjZSddKTtcbiAgICBteUFkbWluLmZhY3RvcnkoJ1N0cmF0ZWd5U2VydmljZScsIGZ1bmN0aW9uKCRxKSB7XG5cbiAgICAgICAgbGV0IHN0cmF0ZWdpZXM9IFtdO1xuICAgICAgICBsZXQgZGVmZXJyZWQgPSAkcS5kZWZlcigpO1xuICAgICAgICBmaXJlYmFzZS5kYXRhYmFzZSgpLnJlZignc3RyYXRlZ2llcycpLm9uY2UoJ3ZhbHVlJykudGhlbihmdW5jdGlvbihzbmFwc2hvdCkge1xuICAgICAgICAgICAgc25hcHNob3QuZm9yRWFjaChmdW5jdGlvbihjaGlsZFN0cmF0ZWd5KSB7XG4gICAgICAgICAgICAgICAgc3RyYXRlZ2llcy5wdXNoKGNoaWxkU3RyYXRlZ3kudmFsKCkpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKHN0cmF0ZWdpZXMpO1xuICAgICAgICB9KS5jYXRjaChmdW5jdGlvbihlcnIpIHtcbiAgICAgICAgICAgIGRlZmVycmVkLnJlamVjdChlcnIpO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGdldEFsbDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9O1xuICAgIH0pO1xuXG4gICAgbXlBZG1pbi5jb250cm9sbGVyKCdBZG1pbkN0cmwnLCBmdW5jdGlvbiAoJHNjb3BlLCBTdHJhdGVneVNlcnZpY2UpIHtcbiAgICAgICAgXCJ1c2Ugc3RyaWN0XCI7XG4gICAgICAgICRzY29wZS5jdXJyZW50U3RhdGVtZW50ID0ge307XG4gICAgICAgICRzY29wZS5jdXJyZW50U3RyYXRlZ3kgPSB7fTtcblxuICAgICAgICBsZXQgbXlTdHJhdCA9IFN0cmF0ZWd5U2VydmljZS5nZXRBbGwoKTtcbiAgICAgICAgbXlTdHJhdC50aGVuKGZ1bmN0aW9uKHN0cmF0ZWdpZXMpIHtcbiAgICAgICAgICAgICRzY29wZS5zZWxlY3RlZFN0cmF0ZWd5PXN0cmF0ZWdpZXNbMF0gfHwgbnVsbDtcbiAgICAgICAgICAgICRzY29wZS5hbGxTdHJhdGVnaWVzID0gc3RyYXRlZ2llcztcbiAgICAgICAgICAgICRzY29wZS5lZGl0ZWRTdHJhdGVneSA9e307XG4gICAgICAgICAgICAkc2NvcGUuYWNlT3B0aW9uID0ge1xuICAgICAgICAgICAgICAgIG9uTG9hZDogZnVuY3Rpb24gKF9hY2UpIHtcbiAgICAgICAgICAgICAgICAgICAgX2FjZS5nZXRTZXNzaW9uKCkuc2V0TW9kZShcImFjZS9tb2RlL2pzb25cIik7XG4gICAgICAgICAgICAgICAgICAgIF9hY2Uuc2V0VGhlbWUoXCJhY2UvdGhlbWUvdHdpbGlnaHRcIilcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLnN0cmF0ZWd5Q2hhbmdlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIF9hY2Uuc2V0VmFsdWUoJHNjb3BlLnNlbGVjdGVkU3RyYXRlZ3kucm9ib3RvVGV4dCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUubmV3U3RyYXRlZ3lPd25lcj0kc2NvcGUuc2VsZWN0ZWRTdHJhdGVneS5vd25lcjtcbiAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5uZXdTdHJhdGVneURpc3BsYXlOYW1lPSRzY29wZS5zZWxlY3RlZFN0cmF0ZWd5LmRpc3BsYXlOYW1lO1xuICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLm5ld1N0cmF0ZWd5TmFtZT0kc2NvcGUuc2VsZWN0ZWRTdHJhdGVneS5uYW1lO1xuICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLm5ld1N0cmF0ZWd5VHlwZT0kc2NvcGUuc2VsZWN0ZWRTdHJhdGVneS50eXBlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICRzY29wZS5uZXdTdHJhdGVneU93bmVyPSRzY29wZS5zZWxlY3RlZFN0cmF0ZWd5Lm93bmVyO1xuICAgICAgICAgICAgJHNjb3BlLm5ld1N0cmF0ZWd5RGlzcGxheU5hbWU9JHNjb3BlLnNlbGVjdGVkU3RyYXRlZ3kuZGlzcGxheU5hbWU7XG4gICAgICAgICAgICAkc2NvcGUubmV3U3RyYXRlZ3lOYW1lPSRzY29wZS5zZWxlY3RlZFN0cmF0ZWd5Lm5hbWU7XG4gICAgICAgICAgICAkc2NvcGUubmV3U3RyYXRlZ3lUeXBlPSRzY29wZS5zZWxlY3RlZFN0cmF0ZWd5LnR5cGU7XG5cbiAgICAgICAgICAgIHZhciBlZGl0b3IgPSBhY2UuZWRpdChcImFjZUVkaXRvclwiKTtcbiAgICAgICAgICAgIGVkaXRvci5zZXRWYWx1ZSgkc2NvcGUuc2VsZWN0ZWRTdHJhdGVneSA/ICRzY29wZS5zZWxlY3RlZFN0cmF0ZWd5LnJvYm90b1RleHQgOiAnJyk7XG4gICAgICAgICAgICB2YXIgcmVmPSBmaXJlYmFzZS5kYXRhYmFzZSgpLnJlZigpLmNoaWxkKCdzdHJhdGVnaWVzJyk7XG5cbiAgICAgICAgICAgICRzY29wZS5wdWJsaXNoID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGlmKCRzY29wZS5zZWxlY3RlZFN0cmF0ZWd5ID09PXVuZGVmaW5lZClcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB2YXIgb3duZXIgPSAkc2NvcGUuc2VsZWN0ZWRTdHJhdGVneS5vd25lcjtcbiAgICAgICAgICAgICAgICB2YXIgZGlzcGxheU5hbWUgPSAkc2NvcGUuc2VsZWN0ZWRTdHJhdGVneS5kaXNwbGF5TmFtZTtcbiAgICAgICAgICAgICAgICB2YXIgbmFtZSA9ICRzY29wZS5zZWxlY3RlZFN0cmF0ZWd5Lm5hbWU7XG4gICAgICAgICAgICAgICAgdmFyIHR5cGUgPSAkc2NvcGUuc2VsZWN0ZWRTdHJhdGVneS50eXBlO1xuXG5cbiAgICAgICAgICAgICAgICB2YXIgdG9rZW5zID0gbmV3IHRva2VuaXplci5Ub2tlbnMoZWRpdG9yLmdldFZhbHVlKCkpO1xuICAgICAgICAgICAgICAgIGlmKHRva2Vuc1t0b2tlbnMubGVuZ3RoLTFdICE9IFwiXFxuXCIpXG4gICAgICAgICAgICAgICAgICAgIHRva2Vucy50b2tlbnMucHVzaChcIlxcblwiKTtcbiAgICAgICAgICAgICAgICB2YXIgYXN0ID0gdG9rZW5pemVyLnBhcnNlQXBwcm9hY2gob3duZXIsIG5hbWUsIGRpc3BsYXlOYW1lLCB0eXBlLCB0b2tlbnMsZWRpdG9yLmdldFZhbHVlKCkgKTtcblxuICAgICAgICAgICAgICAgIHZhciB4PSByZWYub3JkZXJCeUNoaWxkKFwibmFtZVwiKS5lcXVhbFRvKCRzY29wZS5zZWxlY3RlZFN0cmF0ZWd5Lm5hbWUpO1xuICAgICAgICAgICAgICAgICRzY29wZS5zZWxlY3RlZFN0cmF0ZWd5ID0gYXN0O1xuICAgICAgICAgICAgICAgIHgub24oXCJjaGlsZF9hZGRlZFwiLCBmdW5jdGlvbihzbmFwc2hvdCkge1xuICAgICAgICAgICAgICAgIHZhciBrZXkgPSBzbmFwc2hvdC5rZXk7XG4gICAgICAgICAgICAgICAgICAgIC8vZmlyc3QgYXJndW1lbnQgY29udGFpbnMgYW4gaW52YWxpZCBrZXkgKCQkaGFzaEtleSkgaW4gcHJvcGVydHkuLi4uIHRoaXMgaXMgYW4gZXJyb3IgaGFwcGVucyB3aGVuIHdlIHdhbnQgdG8gcHVzaCAsIHVwZGF0ZSBvciBzZXRcbiAgICAgICAgICAgICAgICAgICAgLy8gYSByZWNvcmQgaW4gZmlyZWJhc2UuIGluIG9yZGVyIHRvIHJlbW92ZSB0aGUgaGFzaCBrZSB3ZSBzaG91bGQgYWRkOlxuICAgICAgICAgICAgICAgICAgICAvL0kndmUgZ290dGVuIGFyb3VuZCB0aGlzIGlzc3VlIGJ5IGRvaW5nIHNvbWV0aGluZyBsaWtlXG4gICAgICAgICAgICAgICAgICAgIC8vIG15UmVmLnB1c2goYW5ndWxhci5mcm9tSnNvbihhbmd1bGFyLnRvSnNvbihteUFuZ3VsYXJPYmplY3QpKSkuXG4gICAgICAgICAgICAgICAgICAgIGZpcmViYXNlLmRhdGFiYXNlKCkucmVmKCkuY2hpbGQoJ3N0cmF0ZWdpZXMvJytrZXkpLnNldChhbmd1bGFyLmZyb21Kc29uKGFuZ3VsYXIudG9Kc29uKCRzY29wZS5zZWxlY3RlZFN0cmF0ZWd5KSkpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgJHNjb3BlLmFkZE5ld1N0cmF0ZWd5ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGVkaXRvci5zZXRWYWx1ZShcIlwiKTtcbiAgICAgICAgICAgICAgICAkc2NvcGUubmV3U3RyYXRlZ3lPd25lciA9IFwiXCI7XG4gICAgICAgICAgICAgICAgJHNjb3BlLm5ld1N0cmF0ZWd5TmFtZT1cIlwiO1xuICAgICAgICAgICAgICAgICRzY29wZS5uZXdTdHJhdGVneURpc3BsYXlOYW1lPVwiXCI7XG4gICAgICAgICAgICAgICAgJHNjb3BlLm5ld1N0cmF0ZWd5VHlwZT1cImFwcHJvYWNoXCI7XG4gICAgICAgICAgICAgICAgJHNjb3BlLnNlbGVjdGVkU3RyYXRlZ3k9dW5kZWZpbmVkO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgJHNjb3BlLmNyZWF0ZVN0cmF0ZWd5ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIC8vJChcIiNmcm1TdHJhdGVneUNyZWF0aW9uXCIpLmNzcyhcImRpc3BsYXlcIiwgXCJibG9ja1wiKTtcbiAgICAgICAgICAgICAgICB2YXIgb3duZXIgPSAkc2NvcGUubmV3U3RyYXRlZ3lPd25lcjtcbiAgICAgICAgICAgICAgICB2YXIgZGlzcGxheU5hbWUgPSAkc2NvcGUubmV3U3RyYXRlZ3lEaXNwbGF5TmFtZTtcbiAgICAgICAgICAgICAgICB2YXIgbmFtZSA9ICRzY29wZS5uZXdTdHJhdGVneU5hbWU7XG4gICAgICAgICAgICAgICAgdmFyIHR5cGUgPSAkc2NvcGUubmV3U3RyYXRlZ3lUeXBlO1xuXG4gICAgICAgICAgICAgICAgaWYobmFtZT09XCJcIiB8fCBvd25lcj09XCJcIiB8fCBkaXNwbGF5TmFtZSA9PSBcIlwiIHx8IHR5cGUgPT0gXCJcIilcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIGFsZXJ0KFwicGxlYXNlIGZpbGwgb3V0IHRoZSByZXF1aXJlZCBmaWVsZHNcIik7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdmFyIHRva2VucyA9IG5ldyB0b2tlbml6ZXIuVG9rZW5zKGVkaXRvci5nZXRWYWx1ZSgpKTtcbiAgICAgICAgICAgICAgICBpZih0b2tlbnNbdG9rZW5zLmxlbmd0aC0xXSAhPSBcIlxcblwiKVxuICAgICAgICAgICAgICAgICAgICB0b2tlbnMudG9rZW5zLnB1c2goXCJcXG5cIik7XG4gICAgICAgICAgICAgICAgdmFyIGFzdCA9IHRva2VuaXplci5wYXJzZUFwcHJvYWNoKG93bmVyLCBuYW1lLCBkaXNwbGF5TmFtZSwgdHlwZSwgdG9rZW5zLCBlZGl0b3IuZ2V0VmFsdWUoKSk7XG5cbiAgICAgICAgICAgICAgICAkc2NvcGUuc2VsZWN0ZWRTdHJhdGVneSA9IGFzdDtcbiAgICAgICAgICAgICAgICBmaXJlYmFzZS5kYXRhYmFzZSgpLnJlZigpLmNoaWxkKCdzdHJhdGVnaWVzJykucHVzaChhbmd1bGFyLmZyb21Kc29uKGFuZ3VsYXIudG9Kc29uKCRzY29wZS5zZWxlY3RlZFN0cmF0ZWd5KSkpO1xuICAgICAgICAgICAgICAgICRzY29wZS5hbGxTdHJhdGVnaWVzLnB1c2goJHNjb3BlLnNlbGVjdGVkU3RyYXRlZ3kpO1xuICAgICAgICAgICAgICAgIC8vJChcIiNmcm1TdHJhdGVneUNyZWF0aW9uXCIpLmNzcyhcImRpc3BsYXlcIiwgXCJub25lXCIpO1xuICAgICAgICAgICAgICAgICRzY29wZS5zdHJhdGVneUNoYW5nZWQoKTtcblxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgJHNjb3BlLmNhbmNlbENyZWF0aW5nU3RyYXRlZ3kgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgJHNjb3BlLnNlbGVjdGVkU3RyYXRlZ3kgPSBzdHJhdGVnaWVzWzBdfHxudWxsO1xuICAgICAgICAgICAgICAgICRzY29wZS5zdHJhdGVneUNoYW5nZWQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSk7XG59O1xuIiwiXG52YXIgY29uZmlnID0ge1xuICAgIGFwaUtleTogXCJBSXphU3lBWGpMNmY3MzlCVnFMRGtueW1DTjJIMzYtTkJEUzhMdllcIixcbiAgICBhdXRoRG9tYWluOiBcInN0cmF0ZWd5dHJhY2tlci5maXJlYmFzZWFwcC5jb21cIixcbiAgICBkYXRhYmFzZVVSTDogXCJodHRwczovL3N0cmF0ZWd5dHJhY2tlci5maXJlYmFzZWlvLmNvbVwiLFxuICAgIHByb2plY3RJZDogXCJzdHJhdGVneXRyYWNrZXJcIixcbiAgICBzdG9yYWdlQnVja2V0OiBcInN0cmF0ZWd5dHJhY2tlci5hcHBzcG90LmNvbVwiLFxuICAgIG1lc3NhZ2luZ1NlbmRlcklkOiBcIjI2MTI0OTgzNjUxOFwiXG59O1xuZmlyZWJhc2UuaW5pdGlhbGl6ZUFwcChjb25maWcpO1xuXG4iLCIvLyBUaGVzZSBmdW5jdGlvbnMgcGFyc2UgdGhpcyBncmFtbWFyOlxuLy9cbi8vIGh0dHBzOi8vZ2l0aHViLmNvbS9kZXZ1eGQvUHJvZ3JhbW1pbmdTdHJhdGVnaWVzL2Jsb2IvbWFzdGVyL3JvYm90by5tZFxuXG5mdW5jdGlvbiBUb2tlbnMoY29kZSkge1xuXG4gICAgdGhpcy50b2tlbnMgPSB0b2tlbml6ZShjb2RlKTtcblxuICAgIC8vIFJlbW1lYmVyIGFsbCBvZiB0aGUgdG9rZW5zIGVhdGVuIHNvIHdlIGNhbiBwcm92aWRlIHVzZWZ1bCBlcnJvciBtZXNzYWdlIGNvbnRleHQuXG4gICAgdGhpcy5lYXRlbiA9IFtdO1xuXG4gICAgdGhpcy5lYXQgPSBmdW5jdGlvbihleHBlY3RlZCkge1xuICAgICAgICAvL2NvbnNvbGUubG9nKGV4cGVjdGVkKTtcblxuICAgICAgICBpZihleHBlY3RlZCAmJiAhdGhpcy5uZXh0SXMoZXhwZWN0ZWQpKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcImV4cGVjdGVkXCIsIGV4cGVjdGVkKTtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkxpbmUgXCIgKyB0aGlzLmN1cnJlbnRMaW5lKCkgKyBcIjogZXhwZWN0ZWQgJ1wiICsgZXhwZWN0ZWQgKyBcIicsIGJ1dCBmb3VuZCAnXCIgKyB0aGlzLnRva2Vucy5zbGljZSgwLCA1KS5qb2luKFwiIFwiKSArIFwiJ1wiKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBlYXRlbiA9IHRoaXMudG9rZW5zLnNoaWZ0KCk7XG5cbiAgICAgICAgdGhpcy5lYXRlbi5wdXNoKGVhdGVuKTtcblxuICAgICAgICByZXR1cm4gZWF0ZW47XG5cbiAgICB9XG5cbiAgICB0aGlzLnVuZWF0ID0gZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgdGhpcy50b2tlbnMudW5zaGlmdCh0aGlzLmVhdGVuLnBvcCgpKTtcblxuICAgIH1cblxuICAgIHRoaXMuZWF0TiA9IGZ1bmN0aW9uKG4pIHtcblxuICAgICAgICBmb3IodmFyIGkgPSAwOyBpIDwgbjsgaSsrKVxuICAgICAgICAgICAgdGhpcy5lYXQoKTtcblxuICAgIH1cblxuICAgIHRoaXMuY291bnQgPSBmdW5jdGlvbih0ZXh0KSB7XG5cbiAgICAgICAgdmFyIGluZGV4ID0gMDtcbiAgICAgICAgd2hpbGUoaW5kZXggPCB0aGlzLnRva2Vucy5sZW5ndGggJiYgdGhpcy50b2tlbnNbaW5kZXhdID09PSB0ZXh0KVxuICAgICAgICAgICAgaW5kZXgrKztcbiAgICAgICAgcmV0dXJuIGluZGV4O1xuXG4gICAgfVxuXG4gICAgdGhpcy5oYXNOZXh0ID0gZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLnRva2Vucy5sZW5ndGggPiAwOyB9XG4gICAgdGhpcy5uZXh0SXMgPSBmdW5jdGlvbihzdHJpbmcpIHsgcmV0dXJuIHRoaXMuaGFzTmV4dCgpICYmIHRoaXMucGVlaygpID09PSBzdHJpbmc7IH1cbiAgICB0aGlzLnBlZWsgPSBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMuaGFzTmV4dCgpID8gdGhpcy50b2tlbnNbMF0udG9Mb3dlckNhc2UoKSA6IG51bGw7IH1cblxuICAgIHRoaXMuY3VycmVudExpbmUgPSBmdW5jdGlvbigpIHtcblxuICAgICAgICB2YXIgbGluZSA9IDE7XG4gICAgICAgIGZvcih2YXIgaSA9IDA7IGkgPCB0aGlzLmVhdGVuLmxlbmd0aDsgKytpKSB7XG4gICAgICAgICAgICBpZih0aGlzLmVhdGVuW2ldID09PSBcIlxcblwiKVxuICAgICAgICAgICAgICAgIGxpbmUrKztcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbGluZTtcblxuICAgIH1cblxufVxuXG4vLyBUb2tlbnMgYXJlIHNlZ21lbnRlZCBieSB3aGl0ZXNwYWNlLCAqJ3MsIGFuZCBwYXJlbnRoZXNlc1xuZnVuY3Rpb24gdG9rZW5pemUoc3RyYXRlZ3kpIHtcblxuICAgIHZhciBpbmRleCA9IDA7XG4gICAgdmFyIHRva2VucyA9IFtdO1xuXG4gICAgd2hpbGUoaW5kZXggPCBzdHJhdGVneS5sZW5ndGgpIHtcblxuICAgICAgICAvLyBFYXQgYW55IHNwYWNlcy5cbiAgICAgICAgd2hpbGUoc3RyYXRlZ3kuY2hhckF0KGluZGV4KS5tYXRjaCgvIC8pKVxuICAgICAgICAgICAgaW5kZXgrKztcblxuICAgICAgICAvLyBJZiB3ZSd2ZSByZWFjaGVkIHRoZSBlbmQgb2YgdGhlIHN0cmluZywgd2UncmUgZG9uZS5cbiAgICAgICAgaWYoaW5kZXggPT09IHN0cmF0ZWd5Lmxlbmd0aClcbiAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgIGlmKHN0cmF0ZWd5LmNoYXJBdChpbmRleCkgPT09IFwiXFxuXCIpIHtcbiAgICAgICAgICAgIHRva2Vucy5wdXNoKFwiXFxuXCIpO1xuICAgICAgICAgICAgaW5kZXgrKztcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmKHN0cmF0ZWd5LmNoYXJBdChpbmRleCkgPT09IFwiXFx0XCIpIHtcbiAgICAgICAgICAgIHRva2Vucy5wdXNoKFwiXFx0XCIpO1xuICAgICAgICAgICAgaW5kZXgrKztcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmKHN0cmF0ZWd5LmNoYXJBdChpbmRleCkgPT09IFwiKFwiKSB7XG4gICAgICAgICAgICB0b2tlbnMucHVzaChcIihcIik7XG4gICAgICAgICAgICBpbmRleCsrO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYoc3RyYXRlZ3kuY2hhckF0KGluZGV4KSA9PT0gXCIpXCIpIHtcbiAgICAgICAgICAgIHRva2Vucy5wdXNoKFwiKVwiKTtcbiAgICAgICAgICAgIGluZGV4Kys7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZihzdHJhdGVneS5jaGFyQXQoaW5kZXgpID09PSBcIiNcIikge1xuICAgICAgICAgICAgdmFyIGNvbW1lbnRTdGFydCA9IGluZGV4O1xuICAgICAgICAgICAgd2hpbGUoc3RyYXRlZ3kuY2hhckF0KGluZGV4KSAhPT0gXCJcXG5cIilcbiAgICAgICAgICAgICAgICBpbmRleCsrO1xuICAgICAgICAgICAgdG9rZW5zLnB1c2goc3RyYXRlZ3kuc3Vic3RyaW5nKGNvbW1lbnRTdGFydCwgaW5kZXgpKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBUb2tlbml6ZSBhbiBpZGVudGlmaWVyXG4gICAgICAgIGVsc2UgaWYoc3RyYXRlZ3kuY2hhckF0KGluZGV4KS5tYXRjaCgvWydcXHddLykpIHtcblxuICAgICAgICAgICAgdmFyIGlkZW50aWZpZXJTdGFydCA9IGluZGV4O1xuICAgICAgICAgICAgd2hpbGUoc3RyYXRlZ3kuY2hhckF0KGluZGV4KS5tYXRjaCgvWydcXHddLykpXG4gICAgICAgICAgICAgICAgaW5kZXgrKztcbiAgICAgICAgICAgIHRva2Vucy5wdXNoKHN0cmF0ZWd5LnN1YnN0cmluZyhpZGVudGlmaWVyU3RhcnQsIGluZGV4KSk7XG5cbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkknbSBub3Qgc21hcnQgZW5vdWdoIHRvIGhhbmRsZSB0aGUgY2hhcmFjdGVyICdcIiArIHN0cmF0ZWd5LmNoYXJBdChpbmRleCkgKyBcIidcIik7XG4gICAgICAgIH1cblxuICAgIH1cblxuICAgIHJldHVybiB0b2tlbnM7XG5cbn1cblxuLypcbiogQmVsb3cgaXMgYSBiYXNpYyByZWN1cnNpdmUtZGVzY2VudCBwYXJzZXIgZm9yIFJvYm90by4gVGhlcmUncyBvbmVcbiogZnVuY3Rpb24gZm9yIGVhY2ggbm9uLXRlcm1pbmFsLlxuKi9cblxuLy8gRXhwZWN0cyBhIGxpc3Qgb2Ygc3RyaW5ncy5cbmZ1bmN0aW9uIHBhcnNlQXBwcm9hY2gob3duZXIsIG5hbWUsIGRpc3BsYXlOYW1lLCB0eXBlLCB0b2tlbnMsIHJvYm90b1RleHQpIHtcblxuICAgIHZhciBzdHJhdGVnaWVzID0gW107XG5cbiAgICAvLyBQYXJzZSBvbmUgb3IgbW9yZSBzdHJhdGVnaWVzLlxuICAgIHdoaWxlKHRva2Vucy5uZXh0SXMoXCJzdHJhdGVneVwiKSkge1xuICAgICAgICBzdHJhdGVnaWVzLnB1c2gocGFyc2VTdHJhdGVneSh0b2tlbnMpKTtcbiAgICB9XG5cbiAgICBpZih0b2tlbnMuaGFzTmV4dCgpKVxuICAgICAgICBjb25zb2xlLmVycm9yKFwiSSdtIG5vdCBzbWFydCBlbm91Z2ggdG8gaGFuZGxlIGFueXRoaW5nIG90aGVyIHRoYW4gc3RyYXRlZ2llcywgc28gSSBnb3Qgc3R1Y2sgb24gJ1wiICsgdG9rZW5zLnRva2Vucy5zbGljZSgwLCA1KS5qb2luKFwiIFwiKSArIFwiJ1wiKTtcblxuICAgIHJldHVybiB7XG4gICAgICAgIG93bmVyOm93bmVyLFxuICAgICAgICBuYW1lOiBuYW1lLFxuICAgICAgICBkaXNwbGF5TmFtZTogZGlzcGxheU5hbWUsXG4gICAgICAgIHR5cGU6IHR5cGUsXG4gICAgICAgIHJvYm90b1RleHQ6IHJvYm90b1RleHQsXG4gICAgICAgIHN0cmF0ZWdpZXM6IHN0cmF0ZWdpZXNcbiAgICB9O1xuXG59XG5cbi8vIFNUUkFURUdZIDo6IHN0cmF0ZWd5IElERU5USUZJRVIgKCBJREVOVElGSUVSKyApIFNUQVRFTUVOVFMgXFxuXG5mdW5jdGlvbiBwYXJzZVN0cmF0ZWd5KHRva2Vucykge1xuXG4gICAgdG9rZW5zLmVhdChcInN0cmF0ZWd5XCIpO1xuICAgIHZhciBpZGVudGlmaWVyID0gdG9rZW5zLmVhdCgpO1xuXG4gICAgdG9rZW5zLmVhdChcIihcIik7XG4gICAgdmFyIHBhcmFtZXRlcnMgPSBbXTtcbiAgICB3aGlsZSghdG9rZW5zLm5leHRJcyhcIilcIikpIHtcbiAgICAgICAgcGFyYW1ldGVycy5wdXNoKHRva2Vucy5lYXQoKSk7IC8vIENvbnN1bWUgYXJndW1lbnRzXG4gICAgfVxuICAgIHRva2Vucy5lYXQoXCIpXCIpOyAvLyBDb25zdW1lIHJpZ2h0IHBhcmVudGhlc2lzXG5cbiAgICAvLyBDb25zdW1lIHN0YXRlbWVudHMuXG4gICAgdmFyIHN0YXRlbWVudHMgPSBwYXJzZVN0YXRlbWVudHModG9rZW5zLCAxKTtcblxuICAgIC8vIENvbnN1bWUgYW55IG51bWJlciBvZiBuZXdsaW5lcy5cbiAgICB3aGlsZSh0b2tlbnMubmV4dElzKFwiXFxuXCIpKVxuICAgICAgICB0b2tlbnMuZWF0KFwiXFxuXCIpO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgdHlwZTogXCJzdHJhdGVneVwiLFxuICAgICAgICBuYW1lOiBpZGVudGlmaWVyLFxuICAgICAgICBwYXJhbWV0ZXJzOiBwYXJhbWV0ZXJzLFxuICAgICAgICBzdGF0ZW1lbnRzOiBzdGF0ZW1lbnRzLFxuICAgICAgICB0ZXh0IDogXCJTdHJhdGVneSBcIiArIGlkZW50aWZpZXIgKyBcIihcIiArIHBhcmFtZXRlcnMuam9pbignICcpICtcIilcIlxuICAgIH07XG5cbn1cblxuLy8gU1RBVEVNRU5UUyA6OiBTVEFURU1FTlQrXG5mdW5jdGlvbiBwYXJzZVN0YXRlbWVudHModG9rZW5zLCB0YWJzRXhwZWN0ZWQpIHtcblxuICAgIHZhciBzdGF0ZW1lbnRzID0gW107XG4gICAgdmFyIGNvbW1lbnRzID0gW107XG5cbiAgICAvLyBCbG9jayBzdGFydHMgd2l0aCBhIG5ld2xpbmUuXG4gICAgdG9rZW5zLmVhdChcIlxcblwiKTtcblxuICAgIC8vIFJlYWQgc3RhdGVtZW50cyB1bnRpbCB3ZSBmaW5kIGZld2VyIHRhYnMgdGhhbiBleHBlY3RlZC5cbiAgICBkbyB7XG5cbiAgICAgICAgLy8gSG93IG1hbnkgdGFicz9cbiAgICAgICAgdmFyIHRhYnNDb3VudGVkID0gdG9rZW5zLmNvdW50KFwiXFx0XCIpO1xuXG4gICAgICAgIC8vIElmIHdlIGZvdW5kIGFsbCB0aGUgdGFicyB3ZSBleHBlY3RlZCBhbmQgbW9yZSwgdGhlcmUgYXJlIGV4dHJhIHRhYnMsIGFuZCB3ZSBzaG91bGQgZmFpbC5cbiAgICAgICAgaWYodGFic0NvdW50ZWQgPiB0YWJzRXhwZWN0ZWQpXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJJIGV4cGVjdGVkIFwiICsgdGFic0V4cGVjdGVkICsgXCIgYnV0IGZvdW5kIFwiICsgdGFic0NvdW50ZWQgKyBcIjsgZGlkIHNvbWUgZXh0cmEgdGFicyBnZXQgaW4/XCIpO1xuICAgICAgICAvLyBJZiB3ZSBmb3VuZCB0aGUgcmlnaHQgbnVtYmVyLCBlYXQgdGhlbS5cbiAgICAgICAgZWxzZSBpZih0YWJzQ291bnRlZCA9PT0gdGFic0V4cGVjdGVkKVxuICAgICAgICAgICAgdG9rZW5zLmVhdE4odGFic0V4cGVjdGVkKTtcbiAgICAgICAgLy8gSWYgd2UgZm91bmQgZmV3ZXIsIHdlJ3JlIGRvbmUgZWF0aW5nIHN0YXRlbWVudHMuXG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBJZiBpdCdzIGEgY29tbWVudCwgcmVhZCBhIGNvbW1lbnQuXG4gICAgICAgIGlmKHRva2Vucy5wZWVrKCkuY2hhckF0KDApID09PSBcIiNcIikge1xuICAgICAgICAgICAgY29tbWVudHMucHVzaCh0b2tlbnMuZWF0KCkpO1xuICAgICAgICAgICAgdG9rZW5zLmVhdChcIlxcblwiKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBPdGhlcndpc2UsIHJlYWQgYSBzdGF0ZW1lbnQgYW5kIGFzc2lnbiB0aGUgY29tbWVudHMuXG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdmFyIHN0YXRlbWVudCA9IHBhcnNlU3RhdGVtZW50KHRva2VucywgdGFic0V4cGVjdGVkKTtcbiAgICAgICAgICAgIHN0YXRlbWVudC5jb21tZW50cyA9IGNvbW1lbnRzO1xuICAgICAgICAgICAgc3RhdGVtZW50LnRleHQgPSBzdGF0ZW1lbnQudG9TdHJpbmcoKTtcbiAgICAgICAgICAgIGNvbW1lbnRzID0gW107XG4gICAgICAgICAgICBzdGF0ZW1lbnRzLnB1c2goc3RhdGVtZW50KTtcbiAgICAgICAgfVxuXG4gICAgfSB3aGlsZSh0cnVlKTtcblxuICAgIHJldHVybiBzdGF0ZW1lbnRzO1xuXG59XG5cbi8vIFNUQVRFTUVOVCA6OiAqIChBQ1RJT04gfCBDQUxMIHwgQ09ORElUSU9OQUwgfCBGT1JFQUNIIHwgREVGSU5JVElPTiB8IFJFVFVSTiApKyBbIyB3b3JkK11cbmZ1bmN0aW9uIHBhcnNlU3RhdGVtZW50KHRva2VucywgdGFic0V4cGVjdGVkKSB7XG5cbiAgICB2YXIga2V5d29yZCA9IHRva2Vucy5wZWVrKCk7XG4gICAgdmFyIHN0YXRlbWVudCA9IG51bGw7XG5cbiAgICBpZihrZXl3b3JkID09PSBcImRvXCIpXG4gICAgICAgIHN0YXRlbWVudCA9IHBhcnNlRG8odG9rZW5zKTtcbiAgICBlbHNlIGlmKGtleXdvcmQgPT09IFwidW50aWxcIilcbiAgICAgICAgc3RhdGVtZW50ID0gcGFyc2VVbnRpbCh0b2tlbnMsIHRhYnNFeHBlY3RlZCk7XG4gICAgZWxzZSBpZihrZXl3b3JkID09PSBcImlmXCIpXG4gICAgICAgIHN0YXRlbWVudCA9IHBhcnNlSWYodG9rZW5zLCB0YWJzRXhwZWN0ZWQpO1xuICAgIGVsc2UgaWYoa2V5d29yZCA9PT0gXCJmb3JcIilcbiAgICAgICAgc3RhdGVtZW50ID0gcGFyc2VGb3JFYWNoKHRva2VucywgdGFic0V4cGVjdGVkKTtcbiAgICBlbHNlIGlmKGtleXdvcmQgPT09IFwic2V0XCIpXG4gICAgICAgIHN0YXRlbWVudCA9IHBhcnNlU2V0KHRva2Vucyk7XG4gICAgZWxzZSBpZihrZXl3b3JkID09PSBcInJldHVyblwiKVxuICAgICAgICBzdGF0ZW1lbnQgPSBwYXJzZVJldHVybih0b2tlbnMpO1xuICAgIGVsc2VcbiAgICAgICAgc3RhdGVtZW50ID0gcGFyc2VBY3Rpb24odG9rZW5zKTtcblxuICAgIHJldHVybiBzdGF0ZW1lbnQ7XG5cbn1cblxuLy8gQUNUSU9OIDo6IFdPUkRTIFxcblxuZnVuY3Rpb24gcGFyc2VBY3Rpb24odG9rZW5zKSB7XG5cbiAgICB2YXIgd29yZHMgPSBwYXJzZVdvcmRzKHRva2Vucyk7XG4gICAgdG9rZW5zLmVhdChcIlxcblwiKTtcblxuICAgIHJldHVybiB7XG4gICAgICAgIHR5cGU6IFwiYWN0aW9uXCIsXG4gICAgICAgIHdvcmRzOiB3b3JkcyxcbiAgICAgICAgdG9TdHJpbmc6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB3b3Jkcy5qb2luKCcgJyk7XG4gICAgICAgIH1cbiAgICB9XG5cbn1cblxuLy8gV09SRFMgOjogLitcbmZ1bmN0aW9uIHBhcnNlV29yZHModG9rZW5zKSB7XG5cbiAgICB2YXIgd29yZHMgPSBbXTtcbiAgICB3aGlsZSh0b2tlbnMuaGFzTmV4dCgpICYmICF0b2tlbnMubmV4dElzKFwiXFxuXCIpKVxuICAgICAgICB3b3Jkcy5wdXNoKHRva2Vucy5lYXQoKSk7XG4gICAgcmV0dXJuIHdvcmRzO1xuXG59XG5cbi8vIERPIDo6IGRvIENBTExcbmZ1bmN0aW9uIHBhcnNlRG8odG9rZW5zKSB7XG5cbiAgICB0b2tlbnMuZWF0KFwiZG9cIik7XG5cbiAgICB2YXIgY2FsbCA9IHBhcnNlQ2FsbCh0b2tlbnMpO1xuXG4gICAgLy8gRWF0IHRoZSB0cmFpbGluZyBuZXdsaW5lXG4gICAgdG9rZW5zLmVhdChcIlxcblwiKTtcblxuICAgIHJldHVybiB7XG4gICAgICAgIHR5cGU6IFwiZG9cIixcbiAgICAgICAgY2FsbDogY2FsbCxcbiAgICAgICAgdG9TdHJpbmc6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBcImRvIFwiICsgY2FsbC50b1N0cmluZygpXG4gICAgICAgIH1cbiAgICB9O1xuXG59XG5cbi8vIENBTEwgOjogaWRlbnRpZmllciAoIElERU5USUZJRVIqIClcbmZ1bmN0aW9uIHBhcnNlQ2FsbCh0b2tlbnMpIHtcblxuICAgIHZhciBpZGVudGlmaWVyID0gdG9rZW5zLmVhdCgpOyAvLyBDb25zdW1lIG5hbWVcbiAgICB0b2tlbnMuZWF0KFwiKFwiKTsgLy8gQ29uc3VtZSBsZWZ0IHBhcmVuXG4gICAgLy8gQ29uc3VtZSBhcmd1bWVudHNcbiAgICB2YXIgYXJncyA9IFtdO1xuICAgIHdoaWxlKCF0b2tlbnMubmV4dElzKFwiKVwiKSkge1xuICAgICAgICBhcmdzLnB1c2godG9rZW5zLmVhdCgpKTtcbiAgICB9XG4gICAgdG9rZW5zLmVhdChcIilcIik7XG5cbiAgICByZXR1cm4ge1xuICAgICAgICB0eXBlOiBcImNhbGxcIixcbiAgICAgICAgbmFtZTogaWRlbnRpZmllcixcbiAgICAgICAgYXJndW1lbnRzOiBhcmdzLFxuICAgICAgICB0b1N0cmluZzogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIGlkZW50aWZpZXIgKyBcIihcIiArIGFyZ3Muam9pbignICcpICsgXCIpXCI7XG4gICAgICAgIH1cbiAgICB9O1xuXG59XG5cbi8vIFVOVElMIDo6IHVudGlsIFFVRVJZIFNUQVRFTUVOVFNcbmZ1bmN0aW9uIHBhcnNlVW50aWwodG9rZW5zLCB0YWJzRXhwZWN0ZWQpIHtcblxuICAgIHRva2Vucy5lYXQoXCJ1bnRpbFwiKTtcbiAgICB2YXIgcXVlcnkgPSBwYXJzZVF1ZXJ5KHRva2Vucyk7XG5cbiAgICB2YXIgc3RhdGVtZW50cyA9IHBhcnNlU3RhdGVtZW50cyh0b2tlbnMsIHRhYnNFeHBlY3RlZCArIDEpO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgdHlwZTogXCJ1bnRpbFwiLFxuICAgICAgICBxdWVyeTogcXVlcnksXG4gICAgICAgIHN0YXRlbWVudHM6IHN0YXRlbWVudHMsXG4gICAgICAgIHRvU3RyaW5nOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gXCJ1bnRpbCBcIiArIHF1ZXJ5LnRvU3RyaW5nKCk7XG4gICAgICAgIH1cbiAgICB9O1xuXG59XG5cbi8vIENPTkRJVElPTkFMIDo6IGlmIFFVRVJZIFNUQVRFTUVOVFNcbmZ1bmN0aW9uIHBhcnNlSWYodG9rZW5zLCB0YWJzRXhwZWN0ZWQpIHtcblxuICAgIHRva2Vucy5lYXQoXCJpZlwiKTtcbiAgICB2YXIgcXVlcnkgPSBwYXJzZVF1ZXJ5KHRva2Vucyk7XG5cbiAgICB2YXIgc3RhdGVtZW50cyA9IHBhcnNlU3RhdGVtZW50cyh0b2tlbnMsIHRhYnNFeHBlY3RlZCArIDEpO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgdHlwZTogXCJpZlwiLFxuICAgICAgICBxdWVyeTogcXVlcnksXG4gICAgICAgIHN0YXRlbWVudHM6IHN0YXRlbWVudHMsXG4gICAgICAgIHRvU3RyaW5nOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gXCJpZiBcIiArIHF1ZXJ5LnRvU3RyaW5nKCk7XG4gICAgICAgIH1cbiAgICB9O1xuXG59XG5cbi8vIEZPUkVBQ0ggOjogZm9yIGVhY2ggSURFTlRJRklFUiBpbiBJREVOVElGSUVSIFNUQVRFTUVOVFNcbmZ1bmN0aW9uIHBhcnNlRm9yRWFjaCh0b2tlbnMsIHRhYnNFeHBlY3RlZCkge1xuXG4gICAgdG9rZW5zLmVhdChcImZvclwiKTtcbiAgICB0b2tlbnMuZWF0KFwiZWFjaFwiKTtcbiAgICB2YXIgaWRlbnRpZmllciA9IHRva2Vucy5lYXQoKTtcbiAgICB0b2tlbnMuZWF0KFwiaW5cIik7XG4gICAgdmFyIGxpc3QgPSB0b2tlbnMuZWF0KCk7XG5cbiAgICB2YXIgc3RhdGVtZW50cyA9IHBhcnNlU3RhdGVtZW50cyh0b2tlbnMsIHRhYnNFeHBlY3RlZCArIDEpO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgdHlwZTogXCJmb3JlYWNoXCIsXG4gICAgICAgIGxpc3Q6IGxpc3QsXG4gICAgICAgIGlkZW50aWZpZXI6IGlkZW50aWZpZXIsXG4gICAgICAgIHN0YXRlbWVudHM6IHN0YXRlbWVudHMsXG4gICAgICAgIHRvU3RyaW5nOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gXCJmb3IgZWFjaFwiICsgaWRlbnRpZmllciArIFwiIGluIFwiICsgbGlzdDtcbiAgICAgICAgfVxuICAgIH07XG5cbn1cblxuLy8gU0VUIDo6IHNldCBJREVOVElGSUVSIHRvIFFVRVJZXG5mdW5jdGlvbiBwYXJzZVNldCh0b2tlbnMpIHtcblxuICAgIHRva2Vucy5lYXQoXCJzZXRcIik7XG4gICAgdmFyIGlkZW50aWZpZXIgPSB0b2tlbnMuZWF0KCk7XG4gICAgdG9rZW5zLmVhdChcInRvXCIpO1xuICAgIHZhciBxdWVyeSA9IHBhcnNlUXVlcnkodG9rZW5zKTtcblxuICAgIC8vIEVhdCB0aGUgdHJhaWxpbmcgbmV3bGluZVxuICAgIHRva2Vucy5lYXQoXCJcXG5cIik7XG5cbiAgICByZXR1cm4ge1xuICAgICAgICB0eXBlOiBcInNldFwiLFxuICAgICAgICBpZGVudGlmaWVyOiBpZGVudGlmaWVyLFxuICAgICAgICBxdWVyeTogcXVlcnksXG4gICAgICAgIHRvU3RyaW5nOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gXCJzZXQgXCIgKyBpZGVudGlmaWVyICsgXCIgdG8gXCIgKyAgcXVlcnkudG9TdHJpbmcoKTtcbiAgICAgICAgfVxuICAgIH07XG5cbn1cblxuLy8gUkVUVVJOIDo6IHJldHVybiBRVUVSWVxuZnVuY3Rpb24gcGFyc2VSZXR1cm4odG9rZW5zKSB7XG5cbiAgICB0b2tlbnMuZWF0KFwicmV0dXJuXCIpO1xuICAgIHZhciBxdWVyeSA9IHBhcnNlUXVlcnkodG9rZW5zKTtcblxuICAgIC8vIEVhdCB0aGUgdHJhaWxpbmcgbmV3bGluZVxuICAgIHRva2Vucy5lYXQoXCJcXG5cIik7XG5cbiAgICByZXR1cm4ge1xuICAgICAgICB0eXBlOiBcInJldHVyblwiLFxuICAgICAgICBxdWVyeTogcXVlcnksXG4gICAgICAgIHRvU3RyaW5nOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gXCJyZXR1cm4gXCIgKyBxdWVyeS50b1N0cmluZygpO1xuICAgICAgICB9XG4gICAgfTtcblxufVxuXG4vLyBRVUVSWSA6OiBJREVOVElGSUVSIHwgQ0FMTCB8IE5PVEhJTkcgfCBXT1JEU1xuZnVuY3Rpb24gcGFyc2VRdWVyeSh0b2tlbnMpIHtcblxuICAgIHZhciBmaXJzdCA9IHRva2Vucy5lYXQoKTtcblxuICAgIC8vIElmIGl0J3MgYSBzdHJhdGVneSBjYWxsLCBwYXJzZSBhIGNhbGwuXG4gICAgaWYodG9rZW5zLm5leHRJcyhcIihcIikpIHtcblxuICAgICAgICB0b2tlbnMudW5lYXQoKTtcbiAgICAgICAgcmV0dXJuIHBhcnNlQ2FsbCh0b2tlbnMpO1xuXG4gICAgfVxuICAgIC8vIElmIGl0J3MgXCJub3RoaW5nXCIsIHN0b3AgcGFyc2luZ1xuICAgIGVsc2UgaWYoZmlyc3QgPT09IFwibm90aGluZ1wiKSB7XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHR5cGU6IFwibm90aGluZ1wiLFxuICAgICAgICAgICAgbm90aGluZzogZmlyc3QsXG4gICAgICAgICAgICB0b1N0cmluZzogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBcIm5vdGhpbmdcIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgfVxuICAgIC8vIE90aGVyd2lzZSwgcGFyc2Ugd29yZHNcbiAgICBlbHNlIHtcblxuICAgICAgICB2YXIgd29yZHMgPSBwYXJzZVdvcmRzKHRva2Vucyk7XG4gICAgICAgIHdvcmRzLnVuc2hpZnQoZmlyc3QpO1xuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0eXBlOiBcInF1ZXJ5XCIsXG4gICAgICAgICAgICB3b3Jkczogd29yZHMsXG4gICAgICAgICAgICB0b1N0cmluZzogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiAgd29yZHMuam9pbignICcpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICB9XG5cbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgVG9rZW5zOiBUb2tlbnMsXG4gICAgcGFyc2VBcHByb2FjaDpwYXJzZUFwcHJvYWNoXG5cbn07XG5cbi8vIGZzID0gcmVxdWlyZSgnZnMnKVxuLy8gLy9jb25zb2xlLmxvZyhwcm9jZXNzLmFyZ3ZbMl0pO1xuLy9cbi8vIGZzLnJlYWRGaWxlKHByb2Nlc3MuYXJndlsyXSwgJ3V0ZjgnLCBmdW5jdGlvbiAoZXJyLGRhdGEpIHtcbi8vICAgICBpZiAoZXJyKSB7XG4vLyAgICAgICAgIHJldHVybiBjb25zb2xlLmxvZyhlcnIpO1xuLy8gICAgIH1cbi8vICAgICAvL2NvbnNvbGUubG9nKFwiZGF0YSA9IFwiLCBkYXRhKTtcbi8vICAgICB2YXIgc3RyYXRlZ3kgPSBkYXRhO1xuLy9cbi8vICAgICB0cnkge1xuLy8gICAgICAgICB2YXIgdG9rZW5zID0gbmV3IFRva2VucyhzdHJhdGVneSk7XG4vLyAgICAgICAgIC8vb3duZXIsIG5hbWUsIGRpc3BsYXlOYW1lLCB0eXBlLCB0b2tlbnMsIHJvYm90b1RleHRcbi8vICAgICAgICAgdmFyIGFzdCA9IHBhcnNlQXBwcm9hY2goXCJtZXlzYW1cIiwgcHJvY2Vzcy5hcmd2WzJdLCBcIm1leXNhbVwiLCBcImFwcHJvYWNoXCIsICB0b2tlbnMsIFwiXCIpO1xuLy8gICAgICAgICBjb25zb2xlLmxvZyhKU09OLnN0cmluZ2lmeShhc3QsIG51bGwsIDIpKTtcbi8vICAgICB9IGNhdGNoKGV4KSB7XG4vLyAgICAgICAgIGNvbnNvbGUubG9nKGV4KTtcbi8vICAgICB9XG4vL1xuLy8gfSk7XG5cbiJdfQ==
