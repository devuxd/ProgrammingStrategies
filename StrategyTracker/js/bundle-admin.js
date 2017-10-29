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
                    };
                }
            };

            var editor = ace.edit("aceEditor");
            editor.setValue($scope.selectedStrategy ? $scope.selectedStrategy.robotoText : '');
            var ref = firebase.database().ref().child('strategies');
            $scope.publish = function () {

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
                $("#frmStrategyCreation").css("display", "block");
                $("#stratHeader").value = "";
            };
            $scope.createStrategy = function () {
                $("#frmStrategyCreation").css("display", "block");
                var owner = $scope.newStrategyOwner;
                var displayName = $scope.newStrategyDisplayName;
                var name = $scope.newStrategyName;
                var type = $scope.newStrategyType;

                if (name == "" || owner == "" || displayName == "" || type == "") {
                    $("#frmStrategyCreation").css("display", "none");
                    return;
                }
                var tokens = new tokenizer.Tokens(editor.getValue());
                if (tokens[tokens.length - 1] != "\n") tokens.tokens.push("\n");
                var ast = tokenizer.parseApproach(owner, name, displayName, type, tokens, editor.getValue());

                $scope.selectedStrategy = ast;
                firebase.database().ref().child('strategies').push($scope.selectedStrategy);
                $scope.allStrategies.push($scope.selectedStrategy);
                $("#frmStrategyCreation").css("display", "none");
                $scope.strategyChanged();
            };
            $scope.cancelCreatingStrategy = function () {
                $("#frmStrategyCreation").css("display", "none");
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
        statements: statements
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
        words: words
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
        call: call
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
        arguments: args
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
        statements: statements
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
        statements: statements
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
        statements: statements
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
        query: query
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
        query: query
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
                nothing: first
            };
        }
        // Otherwise, parse words
        else {

                var words = parseWords(tokens);
                words.unshift(first);

                return {
                    type: "query",
                    words: words
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
//         var ast = parseApproach(process.argv[2], tokens);
//         console.log(JSON.stringify(ast, null, 2));
//     } catch(ex) {
//         console.log(ex);
//     }
//
// });

},{}]},{},[1])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJhZG1pbi5qcyIsImRhdGFNYW5hZ2VtZW50LmpzIiwiLi4vdG9rZW5pemVyLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7QUNHQSxNQUFNLEtBQUssUUFBUSxxQkFBUixDQUFYO0FBQ0EsTUFBTSxZQUFZLFFBQVEsaUJBQVIsQ0FBbEI7O0FBRUEsSUFBSSxPQUFPLE1BQVAsS0FBa0IsV0FBbEIsSUFBaUMsT0FBTyxPQUE1QyxFQUFxRDtBQUNqRCxRQUFJLFVBQVUsUUFBUSxNQUFSLENBQWUsU0FBZixFQUF5QixDQUFDLFFBQUQsQ0FBekIsQ0FBZDtBQUNBLFlBQVEsT0FBUixDQUFnQixpQkFBaEIsRUFBbUMsVUFBUyxFQUFULEVBQWE7O0FBRTVDLFlBQUksYUFBWSxFQUFoQjtBQUNBLFlBQUksV0FBVyxHQUFHLEtBQUgsRUFBZjtBQUNBLGlCQUFTLFFBQVQsR0FBb0IsR0FBcEIsQ0FBd0IsWUFBeEIsRUFBc0MsSUFBdEMsQ0FBMkMsT0FBM0MsRUFBb0QsSUFBcEQsQ0FBeUQsVUFBUyxRQUFULEVBQW1CO0FBQ3hFLHFCQUFTLE9BQVQsQ0FBaUIsVUFBUyxhQUFULEVBQXdCO0FBQ3JDLDJCQUFXLElBQVgsQ0FBZ0IsY0FBYyxHQUFkLEVBQWhCO0FBQ0gsYUFGRDtBQUdBLHFCQUFTLE9BQVQsQ0FBaUIsVUFBakI7QUFDSCxTQUxELEVBS0csS0FMSCxDQUtTLFVBQVMsR0FBVCxFQUFjO0FBQ25CLHFCQUFTLE1BQVQsQ0FBZ0IsR0FBaEI7QUFDSCxTQVBEO0FBUUEsZUFBTztBQUNILG9CQUFRLFlBQVc7QUFDZix1QkFBTyxTQUFTLE9BQWhCO0FBQ0g7QUFIRSxTQUFQO0FBS0gsS0FqQkQ7O0FBbUJBLFlBQVEsVUFBUixDQUFtQixXQUFuQixFQUFnQyxVQUFVLE1BQVYsRUFBa0IsZUFBbEIsRUFBbUM7QUFDL0Q7O0FBQ0EsZUFBTyxnQkFBUCxHQUEwQixFQUExQjtBQUNB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LEdBQWlCO0FBQ2IsWUFBUSxNQURLO0FBRWIsbUJBQWM7O0FBRkQsQ0FBakI7O0FBTUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiXG5cblxuY29uc3QgZGIgPSByZXF1aXJlKCcuL2RhdGFNYW5hZ2VtZW50LmpzJyk7XG5jb25zdCB0b2tlbml6ZXIgPSByZXF1aXJlKCcuLi90b2tlbml6ZXIuanMnKTtcblxuaWYgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnICYmIHdpbmRvdy5hbmd1bGFyKSB7XG4gICAgbGV0IG15QWRtaW4gPSBhbmd1bGFyLm1vZHVsZSgnbXlBZG1pbicsWyd1aS5hY2UnXSk7XG4gICAgbXlBZG1pbi5mYWN0b3J5KCdTdHJhdGVneVNlcnZpY2UnLCBmdW5jdGlvbigkcSkge1xuXG4gICAgICAgIGxldCBzdHJhdGVnaWVzPSBbXTtcbiAgICAgICAgbGV0IGRlZmVycmVkID0gJHEuZGVmZXIoKTtcbiAgICAgICAgZmlyZWJhc2UuZGF0YWJhc2UoKS5yZWYoJ3N0cmF0ZWdpZXMnKS5vbmNlKCd2YWx1ZScpLnRoZW4oZnVuY3Rpb24oc25hcHNob3QpIHtcbiAgICAgICAgICAgIHNuYXBzaG90LmZvckVhY2goZnVuY3Rpb24oY2hpbGRTdHJhdGVneSkge1xuICAgICAgICAgICAgICAgIHN0cmF0ZWdpZXMucHVzaChjaGlsZFN0cmF0ZWd5LnZhbCgpKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZShzdHJhdGVnaWVzKTtcbiAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24oZXJyKSB7XG4gICAgICAgICAgICBkZWZlcnJlZC5yZWplY3QoZXJyKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBnZXRBbGw6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfTtcbiAgICB9KTtcblxuICAgIG15QWRtaW4uY29udHJvbGxlcignQWRtaW5DdHJsJywgZnVuY3Rpb24gKCRzY29wZSwgU3RyYXRlZ3lTZXJ2aWNlKSB7XG4gICAgICAgIFwidXNlIHN0cmljdFwiO1xuICAgICAgICAkc2NvcGUuY3VycmVudFN0YXRlbWVudCA9IHt9O1xuICAgICAgICAkc2NvcGUuY3VycmVudFN0cmF0ZWd5ID0ge307XG5cbiAgICAgICAgbGV0IG15U3RyYXQgPSBTdHJhdGVneVNlcnZpY2UuZ2V0QWxsKCk7XG4gICAgICAgIG15U3RyYXQudGhlbihmdW5jdGlvbihzdHJhdGVnaWVzKSB7XG4gICAgICAgICAgICAkc2NvcGUuc2VsZWN0ZWRTdHJhdGVneT1zdHJhdGVnaWVzWzBdIHx8IG51bGw7XG4gICAgICAgICAgICAkc2NvcGUuYWxsU3RyYXRlZ2llcyA9IHN0cmF0ZWdpZXM7XG4gICAgICAgICAgICAkc2NvcGUuZWRpdGVkU3RyYXRlZ3kgPXt9O1xuICAgICAgICAgICAgJHNjb3BlLmFjZU9wdGlvbiA9IHtcbiAgICAgICAgICAgICAgICBvbkxvYWQ6IGZ1bmN0aW9uIChfYWNlKSB7XG4gICAgICAgICAgICAgICAgICAgIF9hY2UuZ2V0U2Vzc2lvbigpLnNldE1vZGUoXCJhY2UvbW9kZS9qc29uXCIpO1xuICAgICAgICAgICAgICAgICAgICBfYWNlLnNldFRoZW1lKFwiYWNlL3RoZW1lL3R3aWxpZ2h0XCIpXG4gICAgICAgICAgICAgICAgICAgICRzY29wZS5zdHJhdGVneUNoYW5nZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBfYWNlLnNldFZhbHVlKCRzY29wZS5zZWxlY3RlZFN0cmF0ZWd5LnJvYm90b1RleHQpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgdmFyIGVkaXRvciA9IGFjZS5lZGl0KFwiYWNlRWRpdG9yXCIpO1xuICAgICAgICAgICAgZWRpdG9yLnNldFZhbHVlKCRzY29wZS5zZWxlY3RlZFN0cmF0ZWd5ID8gJHNjb3BlLnNlbGVjdGVkU3RyYXRlZ3kucm9ib3RvVGV4dCA6ICcnKTtcbiAgICAgICAgICAgIHZhciByZWY9IGZpcmViYXNlLmRhdGFiYXNlKCkucmVmKCkuY2hpbGQoJ3N0cmF0ZWdpZXMnKTtcbiAgICAgICAgICAgICRzY29wZS5wdWJsaXNoID0gZnVuY3Rpb24gKCkge1xuXG4gICAgICAgICAgICAgICAgdmFyIG93bmVyID0gJHNjb3BlLnNlbGVjdGVkU3RyYXRlZ3kub3duZXI7XG4gICAgICAgICAgICAgICAgdmFyIGRpc3BsYXlOYW1lID0gJHNjb3BlLnNlbGVjdGVkU3RyYXRlZ3kuZGlzcGxheU5hbWU7XG4gICAgICAgICAgICAgICAgdmFyIG5hbWUgPSAkc2NvcGUuc2VsZWN0ZWRTdHJhdGVneS5uYW1lO1xuICAgICAgICAgICAgICAgIHZhciB0eXBlID0gJHNjb3BlLnNlbGVjdGVkU3RyYXRlZ3kudHlwZTtcblxuXG4gICAgICAgICAgICAgICAgdmFyIHRva2VucyA9IG5ldyB0b2tlbml6ZXIuVG9rZW5zKGVkaXRvci5nZXRWYWx1ZSgpKTtcbiAgICAgICAgICAgICAgICBpZih0b2tlbnNbdG9rZW5zLmxlbmd0aC0xXSAhPSBcIlxcblwiKVxuICAgICAgICAgICAgICAgICAgICB0b2tlbnMudG9rZW5zLnB1c2goXCJcXG5cIik7XG4gICAgICAgICAgICAgICAgdmFyIGFzdCA9IHRva2VuaXplci5wYXJzZUFwcHJvYWNoKG93bmVyLCBuYW1lLCBkaXNwbGF5TmFtZSwgdHlwZSwgdG9rZW5zLGVkaXRvci5nZXRWYWx1ZSgpICk7XG5cbiAgICAgICAgICAgICAgICB2YXIgeD0gcmVmLm9yZGVyQnlDaGlsZChcIm5hbWVcIikuZXF1YWxUbygkc2NvcGUuc2VsZWN0ZWRTdHJhdGVneS5uYW1lKTtcbiAgICAgICAgICAgICAgICAkc2NvcGUuc2VsZWN0ZWRTdHJhdGVneSA9IGFzdDtcbiAgICAgICAgICAgICAgICB4Lm9uKFwiY2hpbGRfYWRkZWRcIiwgZnVuY3Rpb24oc25hcHNob3QpIHtcbiAgICAgICAgICAgICAgICB2YXIga2V5ID0gc25hcHNob3Qua2V5O1xuICAgICAgICAgICAgICAgICAgICAvL2ZpcnN0IGFyZ3VtZW50IGNvbnRhaW5zIGFuIGludmFsaWQga2V5ICgkJGhhc2hLZXkpIGluIHByb3BlcnR5Li4uLiB0aGlzIGlzIGFuIGVycm9yIGhhcHBlbnMgd2hlbiB3ZSB3YW50IHRvIHB1c2ggLCB1cGRhdGUgb3Igc2V0XG4gICAgICAgICAgICAgICAgICAgIC8vIGEgcmVjb3JkIGluIGZpcmViYXNlLiBpbiBvcmRlciB0byByZW1vdmUgdGhlIGhhc2gga2Ugd2Ugc2hvdWxkIGFkZDpcbiAgICAgICAgICAgICAgICAgICAgLy9JJ3ZlIGdvdHRlbiBhcm91bmQgdGhpcyBpc3N1ZSBieSBkb2luZyBzb21ldGhpbmcgbGlrZVxuICAgICAgICAgICAgICAgICAgICAvLyBteVJlZi5wdXNoKGFuZ3VsYXIuZnJvbUpzb24oYW5ndWxhci50b0pzb24obXlBbmd1bGFyT2JqZWN0KSkpLlxuICAgICAgICAgICAgICAgICAgICBmaXJlYmFzZS5kYXRhYmFzZSgpLnJlZigpLmNoaWxkKCdzdHJhdGVnaWVzLycra2V5KS5zZXQoYW5ndWxhci5mcm9tSnNvbihhbmd1bGFyLnRvSnNvbigkc2NvcGUuc2VsZWN0ZWRTdHJhdGVneSkpKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgICRzY29wZS5hZGROZXdTdHJhdGVneSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBlZGl0b3Iuc2V0VmFsdWUoXCJcIik7XG4gICAgICAgICAgICAgICAgJHNjb3BlLm5ld1N0cmF0ZWd5T3duZXIgPSBcIlwiO1xuICAgICAgICAgICAgICAgICRzY29wZS5uZXdTdHJhdGVneU5hbWU9XCJcIjtcbiAgICAgICAgICAgICAgICAkc2NvcGUubmV3U3RyYXRlZ3lEaXNwbGF5TmFtZT1cIlwiO1xuICAgICAgICAgICAgICAgICRzY29wZS5uZXdTdHJhdGVneVR5cGU9XCJhcHByb2FjaFwiO1xuICAgICAgICAgICAgICAgICQoXCIjZnJtU3RyYXRlZ3lDcmVhdGlvblwiKS5jc3MoXCJkaXNwbGF5XCIsIFwiYmxvY2tcIik7XG4gICAgICAgICAgICAgICAgJChcIiNzdHJhdEhlYWRlclwiKS52YWx1ZT1cIlwiO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgJHNjb3BlLmNyZWF0ZVN0cmF0ZWd5ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICQoXCIjZnJtU3RyYXRlZ3lDcmVhdGlvblwiKS5jc3MoXCJkaXNwbGF5XCIsIFwiYmxvY2tcIik7XG4gICAgICAgICAgICAgICAgdmFyIG93bmVyID0gJHNjb3BlLm5ld1N0cmF0ZWd5T3duZXI7XG4gICAgICAgICAgICAgICAgdmFyIGRpc3BsYXlOYW1lID0gJHNjb3BlLm5ld1N0cmF0ZWd5RGlzcGxheU5hbWU7XG4gICAgICAgICAgICAgICAgdmFyIG5hbWUgPSAkc2NvcGUubmV3U3RyYXRlZ3lOYW1lO1xuICAgICAgICAgICAgICAgIHZhciB0eXBlID0gJHNjb3BlLm5ld1N0cmF0ZWd5VHlwZTtcblxuICAgICAgICAgICAgICAgIGlmKG5hbWU9PVwiXCIgfHwgb3duZXI9PVwiXCIgfHwgZGlzcGxheU5hbWUgPT0gXCJcIiB8fCB0eXBlID09IFwiXCIpXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAkKFwiI2ZybVN0cmF0ZWd5Q3JlYXRpb25cIikuY3NzKFwiZGlzcGxheVwiLCBcIm5vbmVcIik7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdmFyIHRva2VucyA9IG5ldyB0b2tlbml6ZXIuVG9rZW5zKGVkaXRvci5nZXRWYWx1ZSgpKTtcbiAgICAgICAgICAgICAgICBpZih0b2tlbnNbdG9rZW5zLmxlbmd0aC0xXSAhPSBcIlxcblwiKVxuICAgICAgICAgICAgICAgICAgICB0b2tlbnMudG9rZW5zLnB1c2goXCJcXG5cIik7XG4gICAgICAgICAgICAgICAgdmFyIGFzdCA9IHRva2VuaXplci5wYXJzZUFwcHJvYWNoKG93bmVyLCBuYW1lLCBkaXNwbGF5TmFtZSwgdHlwZSwgdG9rZW5zLCBlZGl0b3IuZ2V0VmFsdWUoKSk7XG5cbiAgICAgICAgICAgICAgICAkc2NvcGUuc2VsZWN0ZWRTdHJhdGVneSA9IGFzdDtcbiAgICAgICAgICAgICAgICBmaXJlYmFzZS5kYXRhYmFzZSgpLnJlZigpLmNoaWxkKCdzdHJhdGVnaWVzJykucHVzaCgkc2NvcGUuc2VsZWN0ZWRTdHJhdGVneSk7XG4gICAgICAgICAgICAgICAgJHNjb3BlLmFsbFN0cmF0ZWdpZXMucHVzaCgkc2NvcGUuc2VsZWN0ZWRTdHJhdGVneSk7XG4gICAgICAgICAgICAgICAgJChcIiNmcm1TdHJhdGVneUNyZWF0aW9uXCIpLmNzcyhcImRpc3BsYXlcIiwgXCJub25lXCIpO1xuICAgICAgICAgICAgICAgICRzY29wZS5zdHJhdGVneUNoYW5nZWQoKTtcblxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgJHNjb3BlLmNhbmNlbENyZWF0aW5nU3RyYXRlZ3kgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgJChcIiNmcm1TdHJhdGVneUNyZWF0aW9uXCIpLmNzcyhcImRpc3BsYXlcIiwgXCJub25lXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9KTtcbn07XG4iLCJcbnZhciBjb25maWcgPSB7XG4gICAgYXBpS2V5OiBcIkFJemFTeUFYakw2ZjczOUJWcUxEa255bUNOMkgzNi1OQkRTOEx2WVwiLFxuICAgIGF1dGhEb21haW46IFwic3RyYXRlZ3l0cmFja2VyLmZpcmViYXNlYXBwLmNvbVwiLFxuICAgIGRhdGFiYXNlVVJMOiBcImh0dHBzOi8vc3RyYXRlZ3l0cmFja2VyLmZpcmViYXNlaW8uY29tXCIsXG4gICAgcHJvamVjdElkOiBcInN0cmF0ZWd5dHJhY2tlclwiLFxuICAgIHN0b3JhZ2VCdWNrZXQ6IFwic3RyYXRlZ3l0cmFja2VyLmFwcHNwb3QuY29tXCIsXG4gICAgbWVzc2FnaW5nU2VuZGVySWQ6IFwiMjYxMjQ5ODM2NTE4XCJcbn07XG5maXJlYmFzZS5pbml0aWFsaXplQXBwKGNvbmZpZyk7XG5cbiIsIi8vIFRoZXNlIGZ1bmN0aW9ucyBwYXJzZSB0aGlzIGdyYW1tYXI6XG4vL1xuLy8gaHR0cHM6Ly9naXRodWIuY29tL2RldnV4ZC9Qcm9ncmFtbWluZ1N0cmF0ZWdpZXMvYmxvYi9tYXN0ZXIvcm9ib3RvLm1kXG5cbmZ1bmN0aW9uIFRva2Vucyhjb2RlKSB7XG5cbiAgICB0aGlzLnRva2VucyA9IHRva2VuaXplKGNvZGUpO1xuXG4gICAgLy8gUmVtbWViZXIgYWxsIG9mIHRoZSB0b2tlbnMgZWF0ZW4gc28gd2UgY2FuIHByb3ZpZGUgdXNlZnVsIGVycm9yIG1lc3NhZ2UgY29udGV4dC5cbiAgICB0aGlzLmVhdGVuID0gW107XG5cbiAgICB0aGlzLmVhdCA9IGZ1bmN0aW9uKGV4cGVjdGVkKSB7XG4gICAgICAgIC8vY29uc29sZS5sb2coZXhwZWN0ZWQpO1xuXG4gICAgICAgIGlmKGV4cGVjdGVkICYmICF0aGlzLm5leHRJcyhleHBlY3RlZCkpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiZXhwZWN0ZWRcIiwgZXhwZWN0ZWQpO1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTGluZSBcIiArIHRoaXMuY3VycmVudExpbmUoKSArIFwiOiBleHBlY3RlZCAnXCIgKyBleHBlY3RlZCArIFwiJywgYnV0IGZvdW5kICdcIiArIHRoaXMudG9rZW5zLnNsaWNlKDAsIDUpLmpvaW4oXCIgXCIpICsgXCInXCIpO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGVhdGVuID0gdGhpcy50b2tlbnMuc2hpZnQoKTtcblxuICAgICAgICB0aGlzLmVhdGVuLnB1c2goZWF0ZW4pO1xuXG4gICAgICAgIHJldHVybiBlYXRlbjtcblxuICAgIH1cblxuICAgIHRoaXMudW5lYXQgPSBmdW5jdGlvbigpIHtcblxuICAgICAgICB0aGlzLnRva2Vucy51bnNoaWZ0KHRoaXMuZWF0ZW4ucG9wKCkpO1xuXG4gICAgfVxuXG4gICAgdGhpcy5lYXROID0gZnVuY3Rpb24obikge1xuXG4gICAgICAgIGZvcih2YXIgaSA9IDA7IGkgPCBuOyBpKyspXG4gICAgICAgICAgICB0aGlzLmVhdCgpO1xuXG4gICAgfVxuXG4gICAgdGhpcy5jb3VudCA9IGZ1bmN0aW9uKHRleHQpIHtcblxuICAgICAgICB2YXIgaW5kZXggPSAwO1xuICAgICAgICB3aGlsZShpbmRleCA8IHRoaXMudG9rZW5zLmxlbmd0aCAmJiB0aGlzLnRva2Vuc1tpbmRleF0gPT09IHRleHQpXG4gICAgICAgICAgICBpbmRleCsrO1xuICAgICAgICByZXR1cm4gaW5kZXg7XG5cbiAgICB9XG5cbiAgICB0aGlzLmhhc05leHQgPSBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMudG9rZW5zLmxlbmd0aCA+IDA7IH1cbiAgICB0aGlzLm5leHRJcyA9IGZ1bmN0aW9uKHN0cmluZykgeyByZXR1cm4gdGhpcy5oYXNOZXh0KCkgJiYgdGhpcy5wZWVrKCkgPT09IHN0cmluZzsgfVxuICAgIHRoaXMucGVlayA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5oYXNOZXh0KCkgPyB0aGlzLnRva2Vuc1swXS50b0xvd2VyQ2FzZSgpIDogbnVsbDsgfVxuXG4gICAgdGhpcy5jdXJyZW50TGluZSA9IGZ1bmN0aW9uKCkge1xuXG4gICAgICAgIHZhciBsaW5lID0gMTtcbiAgICAgICAgZm9yKHZhciBpID0gMDsgaSA8IHRoaXMuZWF0ZW4ubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgICAgIGlmKHRoaXMuZWF0ZW5baV0gPT09IFwiXFxuXCIpXG4gICAgICAgICAgICAgICAgbGluZSsrO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBsaW5lO1xuXG4gICAgfVxuXG59XG5cbi8vIFRva2VucyBhcmUgc2VnbWVudGVkIGJ5IHdoaXRlc3BhY2UsIConcywgYW5kIHBhcmVudGhlc2VzXG5mdW5jdGlvbiB0b2tlbml6ZShzdHJhdGVneSkge1xuXG4gICAgdmFyIGluZGV4ID0gMDtcbiAgICB2YXIgdG9rZW5zID0gW107XG5cbiAgICB3aGlsZShpbmRleCA8IHN0cmF0ZWd5Lmxlbmd0aCkge1xuXG4gICAgICAgIC8vIEVhdCBhbnkgc3BhY2VzLlxuICAgICAgICB3aGlsZShzdHJhdGVneS5jaGFyQXQoaW5kZXgpLm1hdGNoKC8gLykpXG4gICAgICAgICAgICBpbmRleCsrO1xuXG4gICAgICAgIC8vIElmIHdlJ3ZlIHJlYWNoZWQgdGhlIGVuZCBvZiB0aGUgc3RyaW5nLCB3ZSdyZSBkb25lLlxuICAgICAgICBpZihpbmRleCA9PT0gc3RyYXRlZ3kubGVuZ3RoKVxuICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgaWYoc3RyYXRlZ3kuY2hhckF0KGluZGV4KSA9PT0gXCJcXG5cIikge1xuICAgICAgICAgICAgdG9rZW5zLnB1c2goXCJcXG5cIik7XG4gICAgICAgICAgICBpbmRleCsrO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYoc3RyYXRlZ3kuY2hhckF0KGluZGV4KSA9PT0gXCJcXHRcIikge1xuICAgICAgICAgICAgdG9rZW5zLnB1c2goXCJcXHRcIik7XG4gICAgICAgICAgICBpbmRleCsrO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYoc3RyYXRlZ3kuY2hhckF0KGluZGV4KSA9PT0gXCIoXCIpIHtcbiAgICAgICAgICAgIHRva2Vucy5wdXNoKFwiKFwiKTtcbiAgICAgICAgICAgIGluZGV4Kys7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZihzdHJhdGVneS5jaGFyQXQoaW5kZXgpID09PSBcIilcIikge1xuICAgICAgICAgICAgdG9rZW5zLnB1c2goXCIpXCIpO1xuICAgICAgICAgICAgaW5kZXgrKztcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmKHN0cmF0ZWd5LmNoYXJBdChpbmRleCkgPT09IFwiI1wiKSB7XG4gICAgICAgICAgICB2YXIgY29tbWVudFN0YXJ0ID0gaW5kZXg7XG4gICAgICAgICAgICB3aGlsZShzdHJhdGVneS5jaGFyQXQoaW5kZXgpICE9PSBcIlxcblwiKVxuICAgICAgICAgICAgICAgIGluZGV4Kys7XG4gICAgICAgICAgICB0b2tlbnMucHVzaChzdHJhdGVneS5zdWJzdHJpbmcoY29tbWVudFN0YXJ0LCBpbmRleCkpO1xuICAgICAgICB9XG4gICAgICAgIC8vIFRva2VuaXplIGFuIGlkZW50aWZpZXJcbiAgICAgICAgZWxzZSBpZihzdHJhdGVneS5jaGFyQXQoaW5kZXgpLm1hdGNoKC9bJ1xcd10vKSkge1xuXG4gICAgICAgICAgICB2YXIgaWRlbnRpZmllclN0YXJ0ID0gaW5kZXg7XG4gICAgICAgICAgICB3aGlsZShzdHJhdGVneS5jaGFyQXQoaW5kZXgpLm1hdGNoKC9bJ1xcd10vKSlcbiAgICAgICAgICAgICAgICBpbmRleCsrO1xuICAgICAgICAgICAgdG9rZW5zLnB1c2goc3RyYXRlZ3kuc3Vic3RyaW5nKGlkZW50aWZpZXJTdGFydCwgaW5kZXgpKTtcblxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiSSdtIG5vdCBzbWFydCBlbm91Z2ggdG8gaGFuZGxlIHRoZSBjaGFyYWN0ZXIgJ1wiICsgc3RyYXRlZ3kuY2hhckF0KGluZGV4KSArIFwiJ1wiKTtcbiAgICAgICAgfVxuXG4gICAgfVxuXG4gICAgcmV0dXJuIHRva2VucztcblxufVxuXG4vKlxuKiBCZWxvdyBpcyBhIGJhc2ljIHJlY3Vyc2l2ZS1kZXNjZW50IHBhcnNlciBmb3IgUm9ib3RvLiBUaGVyZSdzIG9uZVxuKiBmdW5jdGlvbiBmb3IgZWFjaCBub24tdGVybWluYWwuXG4qL1xuXG4vLyBFeHBlY3RzIGEgbGlzdCBvZiBzdHJpbmdzLlxuZnVuY3Rpb24gcGFyc2VBcHByb2FjaChvd25lciwgbmFtZSwgZGlzcGxheU5hbWUsIHR5cGUsIHRva2Vucywgcm9ib3RvVGV4dCkge1xuXG4gICAgdmFyIHN0cmF0ZWdpZXMgPSBbXTtcblxuICAgIC8vIFBhcnNlIG9uZSBvciBtb3JlIHN0cmF0ZWdpZXMuXG4gICAgd2hpbGUodG9rZW5zLm5leHRJcyhcInN0cmF0ZWd5XCIpKSB7XG4gICAgICAgIHN0cmF0ZWdpZXMucHVzaChwYXJzZVN0cmF0ZWd5KHRva2VucykpO1xuICAgIH1cblxuICAgIGlmKHRva2Vucy5oYXNOZXh0KCkpXG4gICAgICAgIGNvbnNvbGUuZXJyb3IoXCJJJ20gbm90IHNtYXJ0IGVub3VnaCB0byBoYW5kbGUgYW55dGhpbmcgb3RoZXIgdGhhbiBzdHJhdGVnaWVzLCBzbyBJIGdvdCBzdHVjayBvbiAnXCIgKyB0b2tlbnMudG9rZW5zLnNsaWNlKDAsIDUpLmpvaW4oXCIgXCIpICsgXCInXCIpO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgb3duZXI6b3duZXIsXG4gICAgICAgIG5hbWU6IG5hbWUsXG4gICAgICAgIGRpc3BsYXlOYW1lOiBkaXNwbGF5TmFtZSxcbiAgICAgICAgdHlwZTogdHlwZSxcbiAgICAgICAgcm9ib3RvVGV4dDogcm9ib3RvVGV4dCxcbiAgICAgICAgc3RyYXRlZ2llczogc3RyYXRlZ2llc1xuICAgIH07XG5cbn1cblxuLy8gU1RSQVRFR1kgOjogc3RyYXRlZ3kgSURFTlRJRklFUiAoIElERU5USUZJRVIrICkgU1RBVEVNRU5UUyBcXG5cbmZ1bmN0aW9uIHBhcnNlU3RyYXRlZ3kodG9rZW5zKSB7XG5cbiAgICB0b2tlbnMuZWF0KFwic3RyYXRlZ3lcIik7XG4gICAgdmFyIGlkZW50aWZpZXIgPSB0b2tlbnMuZWF0KCk7XG5cbiAgICB0b2tlbnMuZWF0KFwiKFwiKTtcbiAgICB2YXIgcGFyYW1ldGVycyA9IFtdO1xuICAgIHdoaWxlKCF0b2tlbnMubmV4dElzKFwiKVwiKSkge1xuICAgICAgICBwYXJhbWV0ZXJzLnB1c2godG9rZW5zLmVhdCgpKTsgLy8gQ29uc3VtZSBhcmd1bWVudHNcbiAgICB9XG4gICAgdG9rZW5zLmVhdChcIilcIik7IC8vIENvbnN1bWUgcmlnaHQgcGFyZW50aGVzaXNcblxuICAgIC8vIENvbnN1bWUgc3RhdGVtZW50cy5cbiAgICB2YXIgc3RhdGVtZW50cyA9IHBhcnNlU3RhdGVtZW50cyh0b2tlbnMsIDEpO1xuXG4gICAgLy8gQ29uc3VtZSBhbnkgbnVtYmVyIG9mIG5ld2xpbmVzLlxuICAgIHdoaWxlKHRva2Vucy5uZXh0SXMoXCJcXG5cIikpXG4gICAgICAgIHRva2Vucy5lYXQoXCJcXG5cIik7XG5cbiAgICByZXR1cm4ge1xuICAgICAgICB0eXBlOiBcInN0cmF0ZWd5XCIsXG4gICAgICAgIG5hbWU6IGlkZW50aWZpZXIsXG4gICAgICAgIHBhcmFtZXRlcnM6IHBhcmFtZXRlcnMsXG4gICAgICAgIHN0YXRlbWVudHM6IHN0YXRlbWVudHNcbiAgICB9O1xuXG59XG5cbi8vIFNUQVRFTUVOVFMgOjogU1RBVEVNRU5UK1xuZnVuY3Rpb24gcGFyc2VTdGF0ZW1lbnRzKHRva2VucywgdGFic0V4cGVjdGVkKSB7XG5cbiAgICB2YXIgc3RhdGVtZW50cyA9IFtdO1xuICAgIHZhciBjb21tZW50cyA9IFtdO1xuXG4gICAgLy8gQmxvY2sgc3RhcnRzIHdpdGggYSBuZXdsaW5lLlxuICAgIHRva2Vucy5lYXQoXCJcXG5cIik7XG5cbiAgICAvLyBSZWFkIHN0YXRlbWVudHMgdW50aWwgd2UgZmluZCBmZXdlciB0YWJzIHRoYW4gZXhwZWN0ZWQuXG4gICAgZG8ge1xuXG4gICAgICAgIC8vIEhvdyBtYW55IHRhYnM/XG4gICAgICAgIHZhciB0YWJzQ291bnRlZCA9IHRva2Vucy5jb3VudChcIlxcdFwiKTtcblxuICAgICAgICAvLyBJZiB3ZSBmb3VuZCBhbGwgdGhlIHRhYnMgd2UgZXhwZWN0ZWQgYW5kIG1vcmUsIHRoZXJlIGFyZSBleHRyYSB0YWJzLCBhbmQgd2Ugc2hvdWxkIGZhaWwuXG4gICAgICAgIGlmKHRhYnNDb3VudGVkID4gdGFic0V4cGVjdGVkKVxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiSSBleHBlY3RlZCBcIiArIHRhYnNFeHBlY3RlZCArIFwiIGJ1dCBmb3VuZCBcIiArIHRhYnNDb3VudGVkICsgXCI7IGRpZCBzb21lIGV4dHJhIHRhYnMgZ2V0IGluP1wiKTtcbiAgICAgICAgLy8gSWYgd2UgZm91bmQgdGhlIHJpZ2h0IG51bWJlciwgZWF0IHRoZW0uXG4gICAgICAgIGVsc2UgaWYodGFic0NvdW50ZWQgPT09IHRhYnNFeHBlY3RlZClcbiAgICAgICAgICAgIHRva2Vucy5lYXROKHRhYnNFeHBlY3RlZCk7XG4gICAgICAgIC8vIElmIHdlIGZvdW5kIGZld2VyLCB3ZSdyZSBkb25lIGVhdGluZyBzdGF0ZW1lbnRzLlxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gSWYgaXQncyBhIGNvbW1lbnQsIHJlYWQgYSBjb21tZW50LlxuICAgICAgICBpZih0b2tlbnMucGVlaygpLmNoYXJBdCgwKSA9PT0gXCIjXCIpIHtcbiAgICAgICAgICAgIGNvbW1lbnRzLnB1c2godG9rZW5zLmVhdCgpKTtcbiAgICAgICAgICAgIHRva2Vucy5lYXQoXCJcXG5cIik7XG4gICAgICAgIH1cbiAgICAgICAgLy8gT3RoZXJ3aXNlLCByZWFkIGEgc3RhdGVtZW50IGFuZCBhc3NpZ24gdGhlIGNvbW1lbnRzLlxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHZhciBzdGF0ZW1lbnQgPSBwYXJzZVN0YXRlbWVudCh0b2tlbnMsIHRhYnNFeHBlY3RlZCk7XG4gICAgICAgICAgICBzdGF0ZW1lbnQuY29tbWVudHMgPSBjb21tZW50cztcbiAgICAgICAgICAgIGNvbW1lbnRzID0gW107XG4gICAgICAgICAgICBzdGF0ZW1lbnRzLnB1c2goc3RhdGVtZW50KTtcbiAgICAgICAgfVxuXG4gICAgfSB3aGlsZSh0cnVlKTtcblxuICAgIHJldHVybiBzdGF0ZW1lbnRzO1xuXG59XG5cbi8vIFNUQVRFTUVOVCA6OiAqIChBQ1RJT04gfCBDQUxMIHwgQ09ORElUSU9OQUwgfCBGT1JFQUNIIHwgREVGSU5JVElPTiB8IFJFVFVSTiApKyBbIyB3b3JkK11cbmZ1bmN0aW9uIHBhcnNlU3RhdGVtZW50KHRva2VucywgdGFic0V4cGVjdGVkKSB7XG5cbiAgICB2YXIga2V5d29yZCA9IHRva2Vucy5wZWVrKCk7XG4gICAgdmFyIHN0YXRlbWVudCA9IG51bGw7XG5cbiAgICBpZihrZXl3b3JkID09PSBcImRvXCIpXG4gICAgICAgIHN0YXRlbWVudCA9IHBhcnNlRG8odG9rZW5zKTtcbiAgICBlbHNlIGlmKGtleXdvcmQgPT09IFwidW50aWxcIilcbiAgICAgICAgc3RhdGVtZW50ID0gcGFyc2VVbnRpbCh0b2tlbnMsIHRhYnNFeHBlY3RlZCk7XG4gICAgZWxzZSBpZihrZXl3b3JkID09PSBcImlmXCIpXG4gICAgICAgIHN0YXRlbWVudCA9IHBhcnNlSWYodG9rZW5zLCB0YWJzRXhwZWN0ZWQpO1xuICAgIGVsc2UgaWYoa2V5d29yZCA9PT0gXCJmb3JcIilcbiAgICAgICAgc3RhdGVtZW50ID0gcGFyc2VGb3JFYWNoKHRva2VucywgdGFic0V4cGVjdGVkKTtcbiAgICBlbHNlIGlmKGtleXdvcmQgPT09IFwic2V0XCIpXG4gICAgICAgIHN0YXRlbWVudCA9IHBhcnNlU2V0KHRva2Vucyk7XG4gICAgZWxzZSBpZihrZXl3b3JkID09PSBcInJldHVyblwiKVxuICAgICAgICBzdGF0ZW1lbnQgPSBwYXJzZVJldHVybih0b2tlbnMpO1xuICAgIGVsc2VcbiAgICAgICAgc3RhdGVtZW50ID0gcGFyc2VBY3Rpb24odG9rZW5zKTtcblxuICAgIHJldHVybiBzdGF0ZW1lbnQ7XG5cbn1cblxuLy8gQUNUSU9OIDo6IFdPUkRTIFxcblxuZnVuY3Rpb24gcGFyc2VBY3Rpb24odG9rZW5zKSB7XG5cbiAgICB2YXIgd29yZHMgPSBwYXJzZVdvcmRzKHRva2Vucyk7XG4gICAgdG9rZW5zLmVhdChcIlxcblwiKTtcblxuICAgIHJldHVybiB7XG4gICAgICAgIHR5cGU6IFwiYWN0aW9uXCIsXG4gICAgICAgIHdvcmRzOiB3b3Jkc1xuICAgIH1cblxufVxuXG4vLyBXT1JEUyA6OiAuK1xuZnVuY3Rpb24gcGFyc2VXb3Jkcyh0b2tlbnMpIHtcblxuICAgIHZhciB3b3JkcyA9IFtdO1xuICAgIHdoaWxlKHRva2Vucy5oYXNOZXh0KCkgJiYgIXRva2Vucy5uZXh0SXMoXCJcXG5cIikpXG4gICAgICAgIHdvcmRzLnB1c2godG9rZW5zLmVhdCgpKTtcbiAgICByZXR1cm4gd29yZHM7XG5cbn1cblxuLy8gRE8gOjogZG8gQ0FMTFxuZnVuY3Rpb24gcGFyc2VEbyh0b2tlbnMpIHtcblxuICAgIHRva2Vucy5lYXQoXCJkb1wiKTtcblxuICAgIHZhciBjYWxsID0gcGFyc2VDYWxsKHRva2Vucyk7XG5cbiAgICAvLyBFYXQgdGhlIHRyYWlsaW5nIG5ld2xpbmVcbiAgICB0b2tlbnMuZWF0KFwiXFxuXCIpO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgdHlwZTogXCJkb1wiLFxuICAgICAgICBjYWxsOiBjYWxsXG4gICAgfTtcblxufVxuXG4vLyBDQUxMIDo6IGlkZW50aWZpZXIgKCBJREVOVElGSUVSKiApXG5mdW5jdGlvbiBwYXJzZUNhbGwodG9rZW5zKSB7XG5cbiAgICB2YXIgaWRlbnRpZmllciA9IHRva2Vucy5lYXQoKTsgLy8gQ29uc3VtZSBuYW1lXG4gICAgdG9rZW5zLmVhdChcIihcIik7IC8vIENvbnN1bWUgbGVmdCBwYXJlblxuICAgIC8vIENvbnN1bWUgYXJndW1lbnRzXG4gICAgdmFyIGFyZ3MgPSBbXTtcbiAgICB3aGlsZSghdG9rZW5zLm5leHRJcyhcIilcIikpIHtcbiAgICAgICAgYXJncy5wdXNoKHRva2Vucy5lYXQoKSk7XG4gICAgfVxuICAgIHRva2Vucy5lYXQoXCIpXCIpO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgdHlwZTogXCJjYWxsXCIsXG4gICAgICAgIG5hbWU6IGlkZW50aWZpZXIsXG4gICAgICAgIGFyZ3VtZW50czogYXJnc1xuICAgIH07XG5cbn1cblxuLy8gVU5USUwgOjogdW50aWwgUVVFUlkgU1RBVEVNRU5UU1xuZnVuY3Rpb24gcGFyc2VVbnRpbCh0b2tlbnMsIHRhYnNFeHBlY3RlZCkge1xuXG4gICAgdG9rZW5zLmVhdChcInVudGlsXCIpO1xuICAgIHZhciBxdWVyeSA9IHBhcnNlUXVlcnkodG9rZW5zKTtcblxuICAgIHZhciBzdGF0ZW1lbnRzID0gcGFyc2VTdGF0ZW1lbnRzKHRva2VucywgdGFic0V4cGVjdGVkICsgMSk7XG5cbiAgICByZXR1cm4ge1xuICAgICAgICB0eXBlOiBcInVudGlsXCIsXG4gICAgICAgIHF1ZXJ5OiBxdWVyeSxcbiAgICAgICAgc3RhdGVtZW50czogc3RhdGVtZW50c1xuICAgIH07XG5cbn1cblxuLy8gQ09ORElUSU9OQUwgOjogaWYgUVVFUlkgU1RBVEVNRU5UU1xuZnVuY3Rpb24gcGFyc2VJZih0b2tlbnMsIHRhYnNFeHBlY3RlZCkge1xuXG4gICAgdG9rZW5zLmVhdChcImlmXCIpO1xuICAgIHZhciBxdWVyeSA9IHBhcnNlUXVlcnkodG9rZW5zKTtcblxuICAgIHZhciBzdGF0ZW1lbnRzID0gcGFyc2VTdGF0ZW1lbnRzKHRva2VucywgdGFic0V4cGVjdGVkICsgMSk7XG5cbiAgICByZXR1cm4ge1xuICAgICAgICB0eXBlOiBcImlmXCIsXG4gICAgICAgIHF1ZXJ5OiBxdWVyeSxcbiAgICAgICAgc3RhdGVtZW50czogc3RhdGVtZW50c1xuICAgIH07XG5cbn1cblxuLy8gRk9SRUFDSCA6OiBmb3IgZWFjaCBJREVOVElGSUVSIGluIElERU5USUZJRVIgU1RBVEVNRU5UU1xuZnVuY3Rpb24gcGFyc2VGb3JFYWNoKHRva2VucywgdGFic0V4cGVjdGVkKSB7XG5cbiAgICB0b2tlbnMuZWF0KFwiZm9yXCIpO1xuICAgIHRva2Vucy5lYXQoXCJlYWNoXCIpO1xuICAgIHZhciBpZGVudGlmaWVyID0gdG9rZW5zLmVhdCgpO1xuICAgIHRva2Vucy5lYXQoXCJpblwiKTtcbiAgICB2YXIgbGlzdCA9IHRva2Vucy5lYXQoKTtcblxuICAgIHZhciBzdGF0ZW1lbnRzID0gcGFyc2VTdGF0ZW1lbnRzKHRva2VucywgdGFic0V4cGVjdGVkICsgMSk7XG5cbiAgICByZXR1cm4ge1xuICAgICAgICB0eXBlOiBcImZvcmVhY2hcIixcbiAgICAgICAgbGlzdDogbGlzdCxcbiAgICAgICAgaWRlbnRpZmllcjogaWRlbnRpZmllcixcbiAgICAgICAgc3RhdGVtZW50czogc3RhdGVtZW50c1xuICAgIH07XG5cbn1cblxuLy8gU0VUIDo6IHNldCBJREVOVElGSUVSIHRvIFFVRVJZXG5mdW5jdGlvbiBwYXJzZVNldCh0b2tlbnMpIHtcblxuICAgIHRva2Vucy5lYXQoXCJzZXRcIik7XG4gICAgdmFyIGlkZW50aWZpZXIgPSB0b2tlbnMuZWF0KCk7XG4gICAgdG9rZW5zLmVhdChcInRvXCIpO1xuICAgIHZhciBxdWVyeSA9IHBhcnNlUXVlcnkodG9rZW5zKTtcblxuICAgIC8vIEVhdCB0aGUgdHJhaWxpbmcgbmV3bGluZVxuICAgIHRva2Vucy5lYXQoXCJcXG5cIik7XG5cbiAgICByZXR1cm4ge1xuICAgICAgICB0eXBlOiBcInNldFwiLFxuICAgICAgICBpZGVudGlmaWVyOiBpZGVudGlmaWVyLFxuICAgICAgICBxdWVyeTogcXVlcnlcbiAgICB9O1xuXG59XG5cbi8vIFJFVFVSTiA6OiByZXR1cm4gUVVFUllcbmZ1bmN0aW9uIHBhcnNlUmV0dXJuKHRva2Vucykge1xuXG4gICAgdG9rZW5zLmVhdChcInJldHVyblwiKTtcbiAgICB2YXIgcXVlcnkgPSBwYXJzZVF1ZXJ5KHRva2Vucyk7XG5cbiAgICAvLyBFYXQgdGhlIHRyYWlsaW5nIG5ld2xpbmVcbiAgICB0b2tlbnMuZWF0KFwiXFxuXCIpO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgdHlwZTogXCJyZXR1cm5cIixcbiAgICAgICAgcXVlcnk6IHF1ZXJ5XG4gICAgfTtcblxufVxuXG4vLyBRVUVSWSA6OiBJREVOVElGSUVSIHwgQ0FMTCB8IE5PVEhJTkcgfCBXT1JEU1xuZnVuY3Rpb24gcGFyc2VRdWVyeSh0b2tlbnMpIHtcblxuICAgIHZhciBmaXJzdCA9IHRva2Vucy5lYXQoKTtcblxuICAgIC8vIElmIGl0J3MgYSBzdHJhdGVneSBjYWxsLCBwYXJzZSBhIGNhbGwuXG4gICAgaWYodG9rZW5zLm5leHRJcyhcIihcIikpIHtcblxuICAgICAgICB0b2tlbnMudW5lYXQoKTtcbiAgICAgICAgcmV0dXJuIHBhcnNlQ2FsbCh0b2tlbnMpO1xuXG4gICAgfVxuICAgIC8vIElmIGl0J3MgXCJub3RoaW5nXCIsIHN0b3AgcGFyc2luZ1xuICAgIGVsc2UgaWYoZmlyc3QgPT09IFwibm90aGluZ1wiKSB7XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHR5cGU6IFwibm90aGluZ1wiLFxuICAgICAgICAgICAgbm90aGluZzogZmlyc3RcbiAgICAgICAgfVxuXG4gICAgfVxuICAgIC8vIE90aGVyd2lzZSwgcGFyc2Ugd29yZHNcbiAgICBlbHNlIHtcblxuICAgICAgICB2YXIgd29yZHMgPSBwYXJzZVdvcmRzKHRva2Vucyk7XG4gICAgICAgIHdvcmRzLnVuc2hpZnQoZmlyc3QpO1xuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0eXBlOiBcInF1ZXJ5XCIsXG4gICAgICAgICAgICB3b3Jkczogd29yZHNcbiAgICAgICAgfVxuXG4gICAgfVxuXG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIFRva2VuczogVG9rZW5zLFxuICAgIHBhcnNlQXBwcm9hY2g6cGFyc2VBcHByb2FjaFxuXG59O1xuXG4vLyBmcyA9IHJlcXVpcmUoJ2ZzJylcbi8vIC8vY29uc29sZS5sb2cocHJvY2Vzcy5hcmd2WzJdKTtcbi8vXG4vLyBmcy5yZWFkRmlsZShwcm9jZXNzLmFyZ3ZbMl0sICd1dGY4JywgZnVuY3Rpb24gKGVycixkYXRhKSB7XG4vLyAgICAgaWYgKGVycikge1xuLy8gICAgICAgICByZXR1cm4gY29uc29sZS5sb2coZXJyKTtcbi8vICAgICB9XG4vLyAgICAgLy9jb25zb2xlLmxvZyhcImRhdGEgPSBcIiwgZGF0YSk7XG4vLyAgICAgdmFyIHN0cmF0ZWd5ID0gZGF0YTtcbi8vXG4vLyAgICAgdHJ5IHtcbi8vICAgICAgICAgdmFyIHRva2VucyA9IG5ldyBUb2tlbnMoc3RyYXRlZ3kpO1xuLy8gICAgICAgICB2YXIgYXN0ID0gcGFyc2VBcHByb2FjaChwcm9jZXNzLmFyZ3ZbMl0sIHRva2Vucyk7XG4vLyAgICAgICAgIGNvbnNvbGUubG9nKEpTT04uc3RyaW5naWZ5KGFzdCwgbnVsbCwgMikpO1xuLy8gICAgIH0gY2F0Y2goZXgpIHtcbi8vICAgICAgICAgY29uc29sZS5sb2coZXgpO1xuLy8gICAgIH1cbi8vXG4vLyB9KTtcblxuIl19
