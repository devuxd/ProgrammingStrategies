(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){


const db = require('./dataManagement.js');
const tokenizer = require('./tokenizer.js');

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
                    };
                }
            };
            $scope.newStrategyOwner = $scope.selectedStrategy.owner;
            $scope.newStrategyDisplayName = $scope.selectedStrategy.displayName;
            $scope.newStrategyName = $scope.selectedStrategy.name;

            var editor = ace.edit("aceEditor");
            editor.setValue($scope.selectedStrategy ? $scope.selectedStrategy.robotoText : '');
            var ref = firebase.database().ref().child('strategies');

            $scope.publish = function () {
                if ($scope.selectedStrategy === undefined) {
                    return;
                }
                var owner = $scope.newStrategyOwner;
                var displayName = $scope.newStrategyDisplayName;
                var name = $scope.newStrategyName;

                var tokens = new tokenizer.Tokens(editor.getValue());
                if (tokens[tokens.length - 1] != "\n") tokens.tokens.push("\n");
                var ast = tokenizer.parseApproach(owner, name, displayName, 'approach', tokens, editor.getValue());
                $scope.selectedStrategy = ast;
                var x = ref.orderByChild("name").equalTo($scope.selectedStrategy.name);

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
                var ast = tokenizer.parseApproach(owner, name, displayName, 'approach', tokens, editor.getValue());

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

},{"./dataManagement.js":2,"./tokenizer.js":3}],2:[function(require,module,exports){

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
    var index = 0;

    // If it's a comment, read a comment.
    while (tokens.peek().charAt(0) === "#") {
        descriptions.push(tokens.eat());
        tokens.eat("\n");
    }

    // Parse one or more strategies.
    while (tokens.nextIs("strategy")) {
        strategies.push(parseStrategy(index, tokens));
        index++;
    }
    // Parse one or more strategies.
    while (tokens.nextIs("strategy")) {
        strategies.push(parseStrategy(index, tokens));
        index++;
    }

    if (tokens.hasNext()) console.error("I'm not smart enough to handle anything other than strategies, so I got stuck on '" + tokens.tokens.slice(0, 5).join(" ") + "'");

    return {
        owner: owner,
        name: name,
        description: descriptions,
        displayName: displayName,
        robotoText: robotoText,
        strategies: strategies
    };
}

// STRATEGY :: strategy IDENTIFIER ( IDENTIFIER+ ) STATEMENTS \n
function parseStrategy(index, tokens) {

    tokens.eat("strategy");
    var identifier = tokens.eat();

    tokens.eat("(");
    var parameters = [];
    while (!tokens.nextIs(")")) {
        parameters.push(tokens.eat()); // Consume arguments
    }
    tokens.eat(")"); // Consume right parenthesis
    var strategyId = identifier + index.toString();
    // Consume statements.
    var statements = parseStatements(strategyId, tokens, 1);

    // Consume any number of newlines.
    while (tokens.nextIs("\n")) tokens.eat("\n");

    return {
        type: "strategy",
        name: identifier,
        id: strategyId,
        parameters: parameters,
        statements: statements,
        text: "Strategy " + identifier + "(" + parameters.join(' ') + ")"
    };
}

// STATEMENTS :: STATEMENT+
function parseStatements(strategyId, tokens, tabsExpected) {

    var statements = [];
    var comments = [];
    var index = 0;
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
                var statement = parseStatement(strategyId + "-" + index.toString(), tokens, tabsExpected);

                statement.comments = comments;
                statement.id = strategyId + "-" + index.toString();
                statement.text = statement.toString();
                comments = [];
                statements.push(statement);
                index++;
            }
    } while (true);

    return statements;
}

// STATEMENT :: * (ACTION | CALL | CONDITIONAL | FOREACH | DEFINITION | RETURN )+ [# word+]
function parseStatement(strategyId, tokens, tabsExpected) {

    var keyword = tokens.peek();
    var statement = null;

    if (keyword === "do") statement = parseDo(tokens);else if (keyword === "until") statement = parseUntil(strategyId, tokens, tabsExpected);else if (keyword === "if") statement = parseIf(strategyId, tokens, tabsExpected);else if (keyword === "for") statement = parseForEach(strategyId, tokens, tabsExpected);else if (keyword === "set") statement = parseSet(tokens);else if (keyword === "return") statement = parseReturn(tokens);else statement = parseAction(tokens);

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
function parseUntil(strategyId, tokens, tabsExpected) {

    tokens.eat("until");
    var query = parseQuery(tokens);

    var statements = parseStatements(strategyId, tokens, tabsExpected + 1);

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
function parseIf(strategyId, tokens, tabsExpected) {
    miniSteps = [];
    tokens.eat("if");
    var query = parseQuery(tokens);

    var statements = parseStatements(strategyId, tokens, tabsExpected + 1);
    miniSteps.push({ role: "User", text: "Step 1-Find the value of the variable using the variables pane on the right." });
    miniSteps.push({ role: "User", text: "Step 2-Inspect the condition in the statement. If the condition is true, click True. Otherwise, click False." });
    miniSteps.push({ role: "Computer", text: "Step 3-The computer will go to the next statement." });

    return {
        type: "if",
        query: query,
        miniSteps: miniSteps,
        statements: statements,
        toString: function () {
            return "if " + query.toString();
        }
    };
}

// FOREACH :: for each IDENTIFIER in IDENTIFIER STATEMENTS
function parseForEach(strategyId, tokens, tabsExpected) {

    tokens.eat("for");
    tokens.eat("each");
    var identifier = tokens.eat();
    tokens.eat("in");
    var list = tokens.eat();

    var statements = parseStatements(strategyId, tokens, tabsExpected + 1);

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
    miniSteps = [];
    tokens.eat("set");
    var identifier = tokens.eat();
    tokens.eat("to");
    var query = parseQuery(tokens);

    // Eat the trailing newline
    tokens.eat("\n");
    miniSteps.push({ role: "User", text: "set a value for " + identifier + " in the Variable panel." });
    miniSteps.push({ role: "Computer", text: "The computer will go to the next statement by clicking next button." });
    return {
        type: "set",
        miniSteps: miniSteps,
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJhZG1pbi5qcyIsImRhdGFNYW5hZ2VtZW50LmpzIiwidG9rZW5pemVyLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7QUNHQSxNQUFNLEtBQUssUUFBUSxxQkFBUixDQUFYO0FBQ0EsTUFBTSxZQUFZLFFBQVEsZ0JBQVIsQ0FBbEI7O0FBRUEsSUFBSSxPQUFPLE1BQVAsS0FBa0IsV0FBbEIsSUFBaUMsT0FBTyxPQUE1QyxFQUFxRDtBQUNqRCxRQUFJLFVBQVUsUUFBUSxNQUFSLENBQWUsU0FBZixFQUF5QixDQUFDLFFBQUQsQ0FBekIsQ0FBZDtBQUNBLFlBQVEsT0FBUixDQUFnQixpQkFBaEIsRUFBbUMsVUFBUyxFQUFULEVBQWE7O0FBRTVDLFlBQUksYUFBWSxFQUFoQjtBQUNBLFlBQUksV0FBVyxHQUFHLEtBQUgsRUFBZjtBQUNBLGlCQUFTLFFBQVQsR0FBb0IsR0FBcEIsQ0FBd0IsWUFBeEIsRUFBc0MsSUFBdEMsQ0FBMkMsT0FBM0MsRUFBb0QsSUFBcEQsQ0FBeUQsVUFBUyxRQUFULEVBQW1CO0FBQ3hFLHFCQUFTLE9BQVQsQ0FBaUIsVUFBUyxhQUFULEVBQXdCO0FBQ3JDLDJCQUFXLElBQVgsQ0FBZ0IsY0FBYyxHQUFkLEVBQWhCO0FBQ0gsYUFGRDtBQUdBLHFCQUFTLE9BQVQsQ0FBaUIsVUFBakI7QUFDSCxTQUxELEVBS0csS0FMSCxDQUtTLFVBQVMsR0FBVCxFQUFjO0FBQ25CLHFCQUFTLE1BQVQsQ0FBZ0IsR0FBaEI7QUFDSCxTQVBEO0FBUUEsZUFBTztBQUNILG9CQUFRLFlBQVc7QUFDZix1QkFBTyxTQUFTLE9BQWhCO0FBQ0g7QUFIRSxTQUFQO0FBS0gsS0FqQkQ7O0FBbUJBLFlBQVEsVUFBUixDQUFtQixXQUFuQixFQUFnQyxVQUFVLE1BQVYsRUFBa0IsZUFBbEIsRUFBbUM7QUFDL0Q7O0FBQ0EsZUFBTyxnQkFBUCxHQUEwQixFQUExQjtBQUNBLGVB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QVA7QUFRSDtBQUVKOztBQUVELE9BQU8sT0FBUCxHQUFpQjtBQUNiLFlBQVEsTUFESztBQUViLG1CQUFjOztBQUZELENBQWpCOztBQU1BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiXG5cblxuY29uc3QgZGIgPSByZXF1aXJlKCcuL2RhdGFNYW5hZ2VtZW50LmpzJyk7XG5jb25zdCB0b2tlbml6ZXIgPSByZXF1aXJlKCcuL3Rva2VuaXplci5qcycpO1xuXG5pZiAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcgJiYgd2luZG93LmFuZ3VsYXIpIHtcbiAgICBsZXQgbXlBZG1pbiA9IGFuZ3VsYXIubW9kdWxlKCdteUFkbWluJyxbJ3VpLmFjZSddKTtcbiAgICBteUFkbWluLmZhY3RvcnkoJ1N0cmF0ZWd5U2VydmljZScsIGZ1bmN0aW9uKCRxKSB7XG5cbiAgICAgICAgbGV0IHN0cmF0ZWdpZXM9IFtdO1xuICAgICAgICBsZXQgZGVmZXJyZWQgPSAkcS5kZWZlcigpO1xuICAgICAgICBmaXJlYmFzZS5kYXRhYmFzZSgpLnJlZignc3RyYXRlZ2llcycpLm9uY2UoJ3ZhbHVlJykudGhlbihmdW5jdGlvbihzbmFwc2hvdCkge1xuICAgICAgICAgICAgc25hcHNob3QuZm9yRWFjaChmdW5jdGlvbihjaGlsZFN0cmF0ZWd5KSB7XG4gICAgICAgICAgICAgICAgc3RyYXRlZ2llcy5wdXNoKGNoaWxkU3RyYXRlZ3kudmFsKCkpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKHN0cmF0ZWdpZXMpO1xuICAgICAgICB9KS5jYXRjaChmdW5jdGlvbihlcnIpIHtcbiAgICAgICAgICAgIGRlZmVycmVkLnJlamVjdChlcnIpO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGdldEFsbDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9O1xuICAgIH0pO1xuXG4gICAgbXlBZG1pbi5jb250cm9sbGVyKCdBZG1pbkN0cmwnLCBmdW5jdGlvbiAoJHNjb3BlLCBTdHJhdGVneVNlcnZpY2UpIHtcbiAgICAgICAgXCJ1c2Ugc3RyaWN0XCI7XG4gICAgICAgICRzY29wZS5jdXJyZW50U3RhdGVtZW50ID0ge307XG4gICAgICAgICRzY29wZS5jdXJyZW50U3RyYXRlZ3kgPSB7fTtcblxuICAgICAgICBsZXQgbXlTdHJhdCA9IFN0cmF0ZWd5U2VydmljZS5nZXRBbGwoKTtcbiAgICAgICAgbXlTdHJhdC50aGVuKGZ1bmN0aW9uKHN0cmF0ZWdpZXMpIHtcbiAgICAgICAgICAgICRzY29wZS5zZWxlY3RlZFN0cmF0ZWd5PXN0cmF0ZWdpZXNbMF0gfHwgbnVsbDtcbiAgICAgICAgICAgICRzY29wZS5hbGxTdHJhdGVnaWVzID0gc3RyYXRlZ2llcztcbiAgICAgICAgICAgICRzY29wZS5lZGl0ZWRTdHJhdGVneSA9e307XG4gICAgICAgICAgICAkc2NvcGUuYWNlT3B0aW9uID0ge1xuICAgICAgICAgICAgICAgIG9uTG9hZDogZnVuY3Rpb24gKF9hY2UpIHtcbiAgICAgICAgICAgICAgICAgICAgX2FjZS5nZXRTZXNzaW9uKCkuc2V0TW9kZShcImFjZS9tb2RlL2pzb25cIik7XG4gICAgICAgICAgICAgICAgICAgIF9hY2Uuc2V0VGhlbWUoXCJhY2UvdGhlbWUvdHdpbGlnaHRcIilcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLnN0cmF0ZWd5Q2hhbmdlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIF9hY2Uuc2V0VmFsdWUoJHNjb3BlLnNlbGVjdGVkU3RyYXRlZ3kucm9ib3RvVGV4dCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUubmV3U3RyYXRlZ3lPd25lcj0kc2NvcGUuc2VsZWN0ZWRTdHJhdGVneS5vd25lcjtcbiAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5uZXdTdHJhdGVneURpc3BsYXlOYW1lPSRzY29wZS5zZWxlY3RlZFN0cmF0ZWd5LmRpc3BsYXlOYW1lO1xuICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLm5ld1N0cmF0ZWd5TmFtZT0kc2NvcGUuc2VsZWN0ZWRTdHJhdGVneS5uYW1lO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICRzY29wZS5uZXdTdHJhdGVneU93bmVyPSRzY29wZS5zZWxlY3RlZFN0cmF0ZWd5Lm93bmVyO1xuICAgICAgICAgICAgJHNjb3BlLm5ld1N0cmF0ZWd5RGlzcGxheU5hbWU9JHNjb3BlLnNlbGVjdGVkU3RyYXRlZ3kuZGlzcGxheU5hbWU7XG4gICAgICAgICAgICAkc2NvcGUubmV3U3RyYXRlZ3lOYW1lPSRzY29wZS5zZWxlY3RlZFN0cmF0ZWd5Lm5hbWU7XG5cblxuICAgICAgICAgICAgdmFyIGVkaXRvciA9IGFjZS5lZGl0KFwiYWNlRWRpdG9yXCIpO1xuICAgICAgICAgICAgZWRpdG9yLnNldFZhbHVlKCRzY29wZS5zZWxlY3RlZFN0cmF0ZWd5ID8gJHNjb3BlLnNlbGVjdGVkU3RyYXRlZ3kucm9ib3RvVGV4dCA6ICcnKTtcbiAgICAgICAgICAgIHZhciByZWY9IGZpcmViYXNlLmRhdGFiYXNlKCkucmVmKCkuY2hpbGQoJ3N0cmF0ZWdpZXMnKTtcblxuICAgICAgICAgICAgJHNjb3BlLnB1Ymxpc2ggPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgaWYoJHNjb3BlLnNlbGVjdGVkU3RyYXRlZ3kgPT09dW5kZWZpbmVkKVxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHZhciBvd25lciA9ICRzY29wZS5uZXdTdHJhdGVneU93bmVyO1xuICAgICAgICAgICAgICAgIHZhciBkaXNwbGF5TmFtZSA9ICRzY29wZS5uZXdTdHJhdGVneURpc3BsYXlOYW1lO1xuICAgICAgICAgICAgICAgIHZhciBuYW1lID0gJHNjb3BlLm5ld1N0cmF0ZWd5TmFtZTtcblxuXG4gICAgICAgICAgICAgICAgdmFyIHRva2VucyA9IG5ldyB0b2tlbml6ZXIuVG9rZW5zKGVkaXRvci5nZXRWYWx1ZSgpKTtcbiAgICAgICAgICAgICAgICBpZih0b2tlbnNbdG9rZW5zLmxlbmd0aC0xXSAhPSBcIlxcblwiKVxuICAgICAgICAgICAgICAgICAgICB0b2tlbnMudG9rZW5zLnB1c2goXCJcXG5cIik7XG4gICAgICAgICAgICAgICAgdmFyIGFzdCA9IHRva2VuaXplci5wYXJzZUFwcHJvYWNoKG93bmVyLCBuYW1lLCBkaXNwbGF5TmFtZSwgJ2FwcHJvYWNoJywgdG9rZW5zLGVkaXRvci5nZXRWYWx1ZSgpICk7XG4gICAgICAgICAgICAgICAgJHNjb3BlLnNlbGVjdGVkU3RyYXRlZ3kgPSBhc3Q7XG4gICAgICAgICAgICAgICAgdmFyIHg9IHJlZi5vcmRlckJ5Q2hpbGQoXCJuYW1lXCIpLmVxdWFsVG8oJHNjb3BlLnNlbGVjdGVkU3RyYXRlZ3kubmFtZSk7XG5cbiAgICAgICAgICAgICAgICB4Lm9uKFwiY2hpbGRfYWRkZWRcIiwgZnVuY3Rpb24oc25hcHNob3QpIHtcbiAgICAgICAgICAgICAgICB2YXIga2V5ID0gc25hcHNob3Qua2V5O1xuICAgICAgICAgICAgICAgICAgICAvL2ZpcnN0IGFyZ3VtZW50IGNvbnRhaW5zIGFuIGludmFsaWQga2V5ICgkJGhhc2hLZXkpIGluIHByb3BlcnR5Li4uLiB0aGlzIGlzIGFuIGVycm9yIGhhcHBlbnMgd2hlbiB3ZSB3YW50IHRvIHB1c2ggLCB1cGRhdGUgb3Igc2V0XG4gICAgICAgICAgICAgICAgICAgIC8vIGEgcmVjb3JkIGluIGZpcmViYXNlLiBpbiBvcmRlciB0byByZW1vdmUgdGhlIGhhc2gga2Ugd2Ugc2hvdWxkIGFkZDpcbiAgICAgICAgICAgICAgICAgICAgLy9JJ3ZlIGdvdHRlbiBhcm91bmQgdGhpcyBpc3N1ZSBieSBkb2luZyBzb21ldGhpbmcgbGlrZVxuICAgICAgICAgICAgICAgICAgICAvLyBteVJlZi5wdXNoKGFuZ3VsYXIuZnJvbUpzb24oYW5ndWxhci50b0pzb24obXlBbmd1bGFyT2JqZWN0KSkpLlxuICAgICAgICAgICAgICAgICAgICBmaXJlYmFzZS5kYXRhYmFzZSgpLnJlZigpLmNoaWxkKCdzdHJhdGVnaWVzLycra2V5KS5zZXQoYW5ndWxhci5mcm9tSnNvbihhbmd1bGFyLnRvSnNvbigkc2NvcGUuc2VsZWN0ZWRTdHJhdGVneSkpKTtcbiAgICAgICAgICAgICAgICB9KTtcblxuXG5cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgICRzY29wZS5hZGROZXdTdHJhdGVneSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBlZGl0b3Iuc2V0VmFsdWUoXCJcIik7XG4gICAgICAgICAgICAgICAgJHNjb3BlLm5ld1N0cmF0ZWd5T3duZXIgPSBcIlwiO1xuICAgICAgICAgICAgICAgICRzY29wZS5uZXdTdHJhdGVneU5hbWU9XCJcIjtcbiAgICAgICAgICAgICAgICAkc2NvcGUubmV3U3RyYXRlZ3lEaXNwbGF5TmFtZT1cIlwiO1xuICAgICAgICAgICAgICAgICRzY29wZS5zZWxlY3RlZFN0cmF0ZWd5PXVuZGVmaW5lZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgICRzY29wZS5jcmVhdGVTdHJhdGVneSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAvLyQoXCIjZnJtU3RyYXRlZ3lDcmVhdGlvblwiKS5jc3MoXCJkaXNwbGF5XCIsIFwiYmxvY2tcIik7XG4gICAgICAgICAgICAgICAgdmFyIG93bmVyID0gJHNjb3BlLm5ld1N0cmF0ZWd5T3duZXI7XG4gICAgICAgICAgICAgICAgdmFyIGRpc3BsYXlOYW1lID0gJHNjb3BlLm5ld1N0cmF0ZWd5RGlzcGxheU5hbWU7XG4gICAgICAgICAgICAgICAgdmFyIG5hbWUgPSAkc2NvcGUubmV3U3RyYXRlZ3lOYW1lO1xuICAgICAgICAgICAgICAgIHZhciB0eXBlID0gJHNjb3BlLm5ld1N0cmF0ZWd5VHlwZTtcblxuICAgICAgICAgICAgICAgIGlmKG5hbWU9PVwiXCIgfHwgb3duZXI9PVwiXCIgfHwgZGlzcGxheU5hbWUgPT0gXCJcIiB8fCB0eXBlID09IFwiXCIpXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBhbGVydChcInBsZWFzZSBmaWxsIG91dCB0aGUgcmVxdWlyZWQgZmllbGRzXCIpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHZhciB0b2tlbnMgPSBuZXcgdG9rZW5pemVyLlRva2VucyhlZGl0b3IuZ2V0VmFsdWUoKSk7XG4gICAgICAgICAgICAgICAgaWYodG9rZW5zW3Rva2Vucy5sZW5ndGgtMV0gIT0gXCJcXG5cIilcbiAgICAgICAgICAgICAgICAgICAgdG9rZW5zLnRva2Vucy5wdXNoKFwiXFxuXCIpO1xuICAgICAgICAgICAgICAgIHZhciBhc3QgPSB0b2tlbml6ZXIucGFyc2VBcHByb2FjaChvd25lciwgbmFtZSwgZGlzcGxheU5hbWUsICdhcHByb2FjaCcsIHRva2VucywgZWRpdG9yLmdldFZhbHVlKCkpO1xuXG4gICAgICAgICAgICAgICAgJHNjb3BlLnNlbGVjdGVkU3RyYXRlZ3kgPSBhc3Q7XG4gICAgICAgICAgICAgICAgZmlyZWJhc2UuZGF0YWJhc2UoKS5yZWYoKS5jaGlsZCgnc3RyYXRlZ2llcycpLnB1c2goYW5ndWxhci5mcm9tSnNvbihhbmd1bGFyLnRvSnNvbigkc2NvcGUuc2VsZWN0ZWRTdHJhdGVneSkpKTtcbiAgICAgICAgICAgICAgICAkc2NvcGUuYWxsU3RyYXRlZ2llcy5wdXNoKCRzY29wZS5zZWxlY3RlZFN0cmF0ZWd5KTtcbiAgICAgICAgICAgICAgICAvLyQoXCIjZnJtU3RyYXRlZ3lDcmVhdGlvblwiKS5jc3MoXCJkaXNwbGF5XCIsIFwibm9uZVwiKTtcbiAgICAgICAgICAgICAgICAkc2NvcGUuc3RyYXRlZ3lDaGFuZ2VkKCk7XG5cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgICRzY29wZS5jYW5jZWxDcmVhdGluZ1N0cmF0ZWd5ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICRzY29wZS5zZWxlY3RlZFN0cmF0ZWd5ID0gc3RyYXRlZ2llc1swXXx8bnVsbDtcbiAgICAgICAgICAgICAgICAkc2NvcGUuc3RyYXRlZ3lDaGFuZ2VkKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0pO1xufTtcbiIsIlxudmFyIGNvbmZpZyA9IHtcbiAgICBhcGlLZXk6IFwiQUl6YVN5QVhqTDZmNzM5QlZxTERrbnltQ04ySDM2LU5CRFM4THZZXCIsXG4gICAgYXV0aERvbWFpbjogXCJzdHJhdGVneXRyYWNrZXIuZmlyZWJhc2VhcHAuY29tXCIsXG4gICAgZGF0YWJhc2VVUkw6IFwiaHR0cHM6Ly9zdHJhdGVneXRyYWNrZXIuZmlyZWJhc2Vpby5jb21cIixcbiAgICBwcm9qZWN0SWQ6IFwic3RyYXRlZ3l0cmFja2VyXCIsXG4gICAgc3RvcmFnZUJ1Y2tldDogXCJzdHJhdGVneXRyYWNrZXIuYXBwc3BvdC5jb21cIixcbiAgICBtZXNzYWdpbmdTZW5kZXJJZDogXCIyNjEyNDk4MzY1MThcIlxufTtcbmZpcmViYXNlLmluaXRpYWxpemVBcHAoY29uZmlnKTtcblxuIiwiLy8gVGhlc2UgZnVuY3Rpb25zIHBhcnNlIHRoaXMgZ3JhbW1hcjpcbi8vXG4vLyBodHRwczovL2dpdGh1Yi5jb20vZGV2dXhkL1Byb2dyYW1taW5nU3RyYXRlZ2llcy9ibG9iL21hc3Rlci9yb2JvdG8ubWRcblxuZnVuY3Rpb24gVG9rZW5zKGNvZGUpIHtcblxuICAgIHRoaXMudG9rZW5zID0gdG9rZW5pemUoY29kZSk7XG5cbiAgICAvLyBSZW1tZWJlciBhbGwgb2YgdGhlIHRva2VucyBlYXRlbiBzbyB3ZSBjYW4gcHJvdmlkZSB1c2VmdWwgZXJyb3IgbWVzc2FnZSBjb250ZXh0LlxuICAgIHRoaXMuZWF0ZW4gPSBbXTtcblxuICAgIHRoaXMuZWF0ID0gZnVuY3Rpb24oZXhwZWN0ZWQpIHtcbiAgICAgICAgLy9jb25zb2xlLmxvZyhleHBlY3RlZCk7XG5cbiAgICAgICAgaWYoZXhwZWN0ZWQgJiYgIXRoaXMubmV4dElzKGV4cGVjdGVkKSkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJleHBlY3RlZFwiLCBleHBlY3RlZCk7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJMaW5lIFwiICsgdGhpcy5jdXJyZW50TGluZSgpICsgXCI6IGV4cGVjdGVkICdcIiArIGV4cGVjdGVkICsgXCInLCBidXQgZm91bmQgJ1wiICsgdGhpcy50b2tlbnMuc2xpY2UoMCwgNSkuam9pbihcIiBcIikgKyBcIidcIik7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgZWF0ZW4gPSB0aGlzLnRva2Vucy5zaGlmdCgpO1xuXG4gICAgICAgIHRoaXMuZWF0ZW4ucHVzaChlYXRlbik7XG5cbiAgICAgICAgcmV0dXJuIGVhdGVuO1xuXG4gICAgfVxuXG4gICAgdGhpcy51bmVhdCA9IGZ1bmN0aW9uKCkge1xuXG4gICAgICAgIHRoaXMudG9rZW5zLnVuc2hpZnQodGhpcy5lYXRlbi5wb3AoKSk7XG5cbiAgICB9XG5cbiAgICB0aGlzLmVhdE4gPSBmdW5jdGlvbihuKSB7XG5cbiAgICAgICAgZm9yKHZhciBpID0gMDsgaSA8IG47IGkrKylcbiAgICAgICAgICAgIHRoaXMuZWF0KCk7XG5cbiAgICB9XG5cbiAgICB0aGlzLmNvdW50ID0gZnVuY3Rpb24odGV4dCkge1xuXG4gICAgICAgIHZhciBpbmRleCA9IDA7XG4gICAgICAgIHdoaWxlKGluZGV4IDwgdGhpcy50b2tlbnMubGVuZ3RoICYmIHRoaXMudG9rZW5zW2luZGV4XSA9PT0gdGV4dClcbiAgICAgICAgICAgIGluZGV4Kys7XG4gICAgICAgIHJldHVybiBpbmRleDtcblxuICAgIH1cblxuICAgIHRoaXMuaGFzTmV4dCA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy50b2tlbnMubGVuZ3RoID4gMDsgfVxuICAgIHRoaXMubmV4dElzID0gZnVuY3Rpb24oc3RyaW5nKSB7IHJldHVybiB0aGlzLmhhc05leHQoKSAmJiB0aGlzLnBlZWsoKSA9PT0gc3RyaW5nOyB9XG4gICAgdGhpcy5wZWVrID0gZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLmhhc05leHQoKSA/IHRoaXMudG9rZW5zWzBdLnRvTG93ZXJDYXNlKCkgOiBudWxsOyB9XG5cbiAgICB0aGlzLmN1cnJlbnRMaW5lID0gZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgdmFyIGxpbmUgPSAxO1xuICAgICAgICBmb3IodmFyIGkgPSAwOyBpIDwgdGhpcy5lYXRlbi5sZW5ndGg7ICsraSkge1xuICAgICAgICAgICAgaWYodGhpcy5lYXRlbltpXSA9PT0gXCJcXG5cIilcbiAgICAgICAgICAgICAgICBsaW5lKys7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGxpbmU7XG5cbiAgICB9XG5cbn1cblxuLy8gVG9rZW5zIGFyZSBzZWdtZW50ZWQgYnkgd2hpdGVzcGFjZSwgKidzLCBhbmQgcGFyZW50aGVzZXNcbmZ1bmN0aW9uIHRva2VuaXplKHN0cmF0ZWd5KSB7XG5cbiAgICB2YXIgaW5kZXggPSAwO1xuICAgIHZhciB0b2tlbnMgPSBbXTtcblxuICAgIHdoaWxlKGluZGV4IDwgc3RyYXRlZ3kubGVuZ3RoKSB7XG5cbiAgICAgICAgLy8gRWF0IGFueSBzcGFjZXMuXG4gICAgICAgIHdoaWxlKHN0cmF0ZWd5LmNoYXJBdChpbmRleCkubWF0Y2goLyAvKSlcbiAgICAgICAgICAgIGluZGV4Kys7XG5cbiAgICAgICAgLy8gSWYgd2UndmUgcmVhY2hlZCB0aGUgZW5kIG9mIHRoZSBzdHJpbmcsIHdlJ3JlIGRvbmUuXG4gICAgICAgIGlmKGluZGV4ID09PSBzdHJhdGVneS5sZW5ndGgpXG4gICAgICAgICAgICBicmVhaztcblxuICAgICAgICBpZihzdHJhdGVneS5jaGFyQXQoaW5kZXgpID09PSBcIlxcblwiKSB7XG4gICAgICAgICAgICB0b2tlbnMucHVzaChcIlxcblwiKTtcbiAgICAgICAgICAgIGluZGV4Kys7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZihzdHJhdGVneS5jaGFyQXQoaW5kZXgpID09PSBcIlxcdFwiKSB7XG4gICAgICAgICAgICB0b2tlbnMucHVzaChcIlxcdFwiKTtcbiAgICAgICAgICAgIGluZGV4Kys7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZihzdHJhdGVneS5jaGFyQXQoaW5kZXgpID09PSBcIihcIikge1xuICAgICAgICAgICAgdG9rZW5zLnB1c2goXCIoXCIpO1xuICAgICAgICAgICAgaW5kZXgrKztcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmKHN0cmF0ZWd5LmNoYXJBdChpbmRleCkgPT09IFwiKVwiKSB7XG4gICAgICAgICAgICB0b2tlbnMucHVzaChcIilcIik7XG4gICAgICAgICAgICBpbmRleCsrO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYoc3RyYXRlZ3kuY2hhckF0KGluZGV4KSA9PT0gXCIjXCIpIHtcbiAgICAgICAgICAgIHZhciBjb21tZW50U3RhcnQgPSBpbmRleDtcbiAgICAgICAgICAgIHdoaWxlKHN0cmF0ZWd5LmNoYXJBdChpbmRleCkgIT09IFwiXFxuXCIpXG4gICAgICAgICAgICAgICAgaW5kZXgrKztcbiAgICAgICAgICAgIHRva2Vucy5wdXNoKHN0cmF0ZWd5LnN1YnN0cmluZyhjb21tZW50U3RhcnQsIGluZGV4KSk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gVG9rZW5pemUgYW4gaWRlbnRpZmllclxuICAgICAgICBlbHNlIGlmKHN0cmF0ZWd5LmNoYXJBdChpbmRleCkubWF0Y2goL1snXFx3XS8pKSB7XG5cbiAgICAgICAgICAgIHZhciBpZGVudGlmaWVyU3RhcnQgPSBpbmRleDtcbiAgICAgICAgICAgIHdoaWxlKHN0cmF0ZWd5LmNoYXJBdChpbmRleCkubWF0Y2goL1snXFx3XS8pKVxuICAgICAgICAgICAgICAgIGluZGV4Kys7XG4gICAgICAgICAgICB0b2tlbnMucHVzaChzdHJhdGVneS5zdWJzdHJpbmcoaWRlbnRpZmllclN0YXJ0LCBpbmRleCkpO1xuXG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJJJ20gbm90IHNtYXJ0IGVub3VnaCB0byBoYW5kbGUgdGhlIGNoYXJhY3RlciAnXCIgKyBzdHJhdGVneS5jaGFyQXQoaW5kZXgpICsgXCInXCIpO1xuICAgICAgICB9XG5cbiAgICB9XG5cbiAgICByZXR1cm4gdG9rZW5zO1xuXG59XG5cbi8qXG4qIEJlbG93IGlzIGEgYmFzaWMgcmVjdXJzaXZlLWRlc2NlbnQgcGFyc2VyIGZvciBSb2JvdG8uIFRoZXJlJ3Mgb25lXG4qIGZ1bmN0aW9uIGZvciBlYWNoIG5vbi10ZXJtaW5hbC5cbiovXG5cbi8vIEV4cGVjdHMgYSBsaXN0IG9mIHN0cmluZ3MuXG5mdW5jdGlvbiBwYXJzZUFwcHJvYWNoKG93bmVyLCBuYW1lLCBkaXNwbGF5TmFtZSwgdHlwZSwgdG9rZW5zLCByb2JvdG9UZXh0KSB7XG5cbiAgICB2YXIgc3RyYXRlZ2llcyA9IFtdO1xuICAgIHZhciBkZXNjcmlwdGlvbnMgPSBbXTtcbiAgICB2YXIgaW5kZXg9MDtcblxuICAgIC8vIElmIGl0J3MgYSBjb21tZW50LCByZWFkIGEgY29tbWVudC5cbiAgICB3aGlsZSh0b2tlbnMucGVlaygpLmNoYXJBdCgwKSA9PT0gXCIjXCIpIHtcbiAgICAgICAgZGVzY3JpcHRpb25zLnB1c2godG9rZW5zLmVhdCgpKTtcbiAgICAgICAgdG9rZW5zLmVhdChcIlxcblwiKTtcbiAgICB9XG5cbiAgICAvLyBQYXJzZSBvbmUgb3IgbW9yZSBzdHJhdGVnaWVzLlxuICAgIHdoaWxlKHRva2Vucy5uZXh0SXMoXCJzdHJhdGVneVwiKSkge1xuICAgICAgICBzdHJhdGVnaWVzLnB1c2gocGFyc2VTdHJhdGVneShpbmRleCx0b2tlbnMpKTtcbiAgICAgICAgaW5kZXgrKztcbiAgICB9XG4gICAgLy8gUGFyc2Ugb25lIG9yIG1vcmUgc3RyYXRlZ2llcy5cbiAgICB3aGlsZSh0b2tlbnMubmV4dElzKFwic3RyYXRlZ3lcIikpIHtcbiAgICAgICAgc3RyYXRlZ2llcy5wdXNoKHBhcnNlU3RyYXRlZ3koaW5kZXgsdG9rZW5zKSk7XG4gICAgICAgIGluZGV4Kys7XG4gICAgfVxuXG5cbiAgICBpZih0b2tlbnMuaGFzTmV4dCgpKVxuICAgICAgICBjb25zb2xlLmVycm9yKFwiSSdtIG5vdCBzbWFydCBlbm91Z2ggdG8gaGFuZGxlIGFueXRoaW5nIG90aGVyIHRoYW4gc3RyYXRlZ2llcywgc28gSSBnb3Qgc3R1Y2sgb24gJ1wiICsgdG9rZW5zLnRva2Vucy5zbGljZSgwLCA1KS5qb2luKFwiIFwiKSArIFwiJ1wiKTtcblxuICAgIHJldHVybiB7XG4gICAgICAgIG93bmVyOm93bmVyLFxuICAgICAgICBuYW1lOiBuYW1lLFxuICAgICAgICBkZXNjcmlwdGlvbjogZGVzY3JpcHRpb25zLFxuICAgICAgICBkaXNwbGF5TmFtZTogZGlzcGxheU5hbWUsXG4gICAgICAgIHJvYm90b1RleHQ6IHJvYm90b1RleHQsXG4gICAgICAgIHN0cmF0ZWdpZXM6IHN0cmF0ZWdpZXNcbiAgICB9O1xuXG59XG5cbi8vIFNUUkFURUdZIDo6IHN0cmF0ZWd5IElERU5USUZJRVIgKCBJREVOVElGSUVSKyApIFNUQVRFTUVOVFMgXFxuXG5mdW5jdGlvbiBwYXJzZVN0cmF0ZWd5KGluZGV4LCB0b2tlbnMpIHtcblxuICAgIHRva2Vucy5lYXQoXCJzdHJhdGVneVwiKTtcbiAgICB2YXIgaWRlbnRpZmllciA9IHRva2Vucy5lYXQoKTtcblxuICAgIHRva2Vucy5lYXQoXCIoXCIpO1xuICAgIHZhciBwYXJhbWV0ZXJzID0gW107XG4gICAgd2hpbGUoIXRva2Vucy5uZXh0SXMoXCIpXCIpKSB7XG4gICAgICAgIHBhcmFtZXRlcnMucHVzaCh0b2tlbnMuZWF0KCkpOyAvLyBDb25zdW1lIGFyZ3VtZW50c1xuICAgIH1cbiAgICB0b2tlbnMuZWF0KFwiKVwiKTsgLy8gQ29uc3VtZSByaWdodCBwYXJlbnRoZXNpc1xuICAgIHZhciBzdHJhdGVneUlkID0gaWRlbnRpZmllcitpbmRleC50b1N0cmluZygpXG4gICAgLy8gQ29uc3VtZSBzdGF0ZW1lbnRzLlxuICAgIHZhciBzdGF0ZW1lbnRzID0gcGFyc2VTdGF0ZW1lbnRzKHN0cmF0ZWd5SWQsdG9rZW5zLCAxKTtcblxuICAgIC8vIENvbnN1bWUgYW55IG51bWJlciBvZiBuZXdsaW5lcy5cbiAgICB3aGlsZSh0b2tlbnMubmV4dElzKFwiXFxuXCIpKVxuICAgICAgICB0b2tlbnMuZWF0KFwiXFxuXCIpO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgdHlwZTogXCJzdHJhdGVneVwiLFxuICAgICAgICBuYW1lOiBpZGVudGlmaWVyLFxuICAgICAgICBpZDpzdHJhdGVneUlkLFxuICAgICAgICBwYXJhbWV0ZXJzOiBwYXJhbWV0ZXJzLFxuICAgICAgICBzdGF0ZW1lbnRzOiBzdGF0ZW1lbnRzLFxuICAgICAgICB0ZXh0IDogXCJTdHJhdGVneSBcIiArIGlkZW50aWZpZXIgKyBcIihcIiArIHBhcmFtZXRlcnMuam9pbignICcpICtcIilcIlxuICAgIH07XG5cbn1cblxuLy8gU1RBVEVNRU5UUyA6OiBTVEFURU1FTlQrXG5mdW5jdGlvbiBwYXJzZVN0YXRlbWVudHMoc3RyYXRlZ3lJZCwgdG9rZW5zLCB0YWJzRXhwZWN0ZWQpIHtcblxuICAgIHZhciBzdGF0ZW1lbnRzID0gW107XG4gICAgdmFyIGNvbW1lbnRzID0gW107XG4gICAgdmFyIGluZGV4PTA7XG4gICAgLy8gQmxvY2sgc3RhcnRzIHdpdGggYSBuZXdsaW5lLlxuICAgIHRva2Vucy5lYXQoXCJcXG5cIik7XG5cbiAgICAvLyBSZWFkIHN0YXRlbWVudHMgdW50aWwgd2UgZmluZCBmZXdlciB0YWJzIHRoYW4gZXhwZWN0ZWQuXG4gICAgZG8ge1xuXG4gICAgICAgIC8vIEhvdyBtYW55IHRhYnM/XG4gICAgICAgIHZhciB0YWJzQ291bnRlZCA9IHRva2Vucy5jb3VudChcIlxcdFwiKTtcblxuICAgICAgICAvLyBJZiB3ZSBmb3VuZCBhbGwgdGhlIHRhYnMgd2UgZXhwZWN0ZWQgYW5kIG1vcmUsIHRoZXJlIGFyZSBleHRyYSB0YWJzLCBhbmQgd2Ugc2hvdWxkIGZhaWwuXG4gICAgICAgIGlmKHRhYnNDb3VudGVkID4gdGFic0V4cGVjdGVkKVxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiSSBleHBlY3RlZCBcIiArIHRhYnNFeHBlY3RlZCArIFwiIGJ1dCBmb3VuZCBcIiArIHRhYnNDb3VudGVkICsgXCI7IGRpZCBzb21lIGV4dHJhIHRhYnMgZ2V0IGluP1wiKTtcbiAgICAgICAgLy8gSWYgd2UgZm91bmQgdGhlIHJpZ2h0IG51bWJlciwgZWF0IHRoZW0uXG4gICAgICAgIGVsc2UgaWYodGFic0NvdW50ZWQgPT09IHRhYnNFeHBlY3RlZClcbiAgICAgICAgICAgIHRva2Vucy5lYXROKHRhYnNFeHBlY3RlZCk7XG4gICAgICAgIC8vIElmIHdlIGZvdW5kIGZld2VyLCB3ZSdyZSBkb25lIGVhdGluZyBzdGF0ZW1lbnRzLlxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gSWYgaXQncyBhIGNvbW1lbnQsIHJlYWQgYSBjb21tZW50LlxuICAgICAgICBpZih0b2tlbnMucGVlaygpLmNoYXJBdCgwKSA9PT0gXCIjXCIpIHtcbiAgICAgICAgICAgIGNvbW1lbnRzLnB1c2godG9rZW5zLmVhdCgpKTtcbiAgICAgICAgICAgIHRva2Vucy5lYXQoXCJcXG5cIik7XG4gICAgICAgIH1cbiAgICAgICAgLy8gT3RoZXJ3aXNlLCByZWFkIGEgc3RhdGVtZW50IGFuZCBhc3NpZ24gdGhlIGNvbW1lbnRzLlxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHZhciBzdGF0ZW1lbnQgPSBwYXJzZVN0YXRlbWVudChzdHJhdGVneUlkK1wiLVwiK2luZGV4LnRvU3RyaW5nKCksIHRva2VucywgdGFic0V4cGVjdGVkKTtcblxuICAgICAgICAgICAgc3RhdGVtZW50LmNvbW1lbnRzID0gY29tbWVudHM7XG4gICAgICAgICAgICBzdGF0ZW1lbnQuaWQ9c3RyYXRlZ3lJZCtcIi1cIitpbmRleC50b1N0cmluZygpO1xuICAgICAgICAgICAgc3RhdGVtZW50LnRleHQgPSBzdGF0ZW1lbnQudG9TdHJpbmcoKTtcbiAgICAgICAgICAgIGNvbW1lbnRzID0gW107XG4gICAgICAgICAgICBzdGF0ZW1lbnRzLnB1c2goc3RhdGVtZW50KTtcbiAgICAgICAgICAgIGluZGV4Kys7XG4gICAgICAgIH1cblxuICAgIH0gd2hpbGUodHJ1ZSk7XG5cbiAgICByZXR1cm4gc3RhdGVtZW50cztcblxufVxuXG4vLyBTVEFURU1FTlQgOjogKiAoQUNUSU9OIHwgQ0FMTCB8IENPTkRJVElPTkFMIHwgRk9SRUFDSCB8IERFRklOSVRJT04gfCBSRVRVUk4gKSsgWyMgd29yZCtdXG5mdW5jdGlvbiBwYXJzZVN0YXRlbWVudChzdHJhdGVneUlkLCB0b2tlbnMsIHRhYnNFeHBlY3RlZCkge1xuXG4gICAgdmFyIGtleXdvcmQgPSB0b2tlbnMucGVlaygpO1xuICAgIHZhciBzdGF0ZW1lbnQgPSBudWxsO1xuXG5cbiAgICBpZihrZXl3b3JkID09PSBcImRvXCIpXG4gICAgICAgIHN0YXRlbWVudCA9IHBhcnNlRG8odG9rZW5zKTtcbiAgICBlbHNlIGlmKGtleXdvcmQgPT09IFwidW50aWxcIilcbiAgICAgICAgc3RhdGVtZW50ID0gcGFyc2VVbnRpbChzdHJhdGVneUlkLHRva2VucywgdGFic0V4cGVjdGVkKTtcbiAgICBlbHNlIGlmKGtleXdvcmQgPT09IFwiaWZcIilcbiAgICAgICAgc3RhdGVtZW50ID0gcGFyc2VJZihzdHJhdGVneUlkLHRva2VucywgdGFic0V4cGVjdGVkKTtcbiAgICBlbHNlIGlmKGtleXdvcmQgPT09IFwiZm9yXCIpXG4gICAgICAgIHN0YXRlbWVudCA9IHBhcnNlRm9yRWFjaChzdHJhdGVneUlkLCB0b2tlbnMsIHRhYnNFeHBlY3RlZCk7XG4gICAgZWxzZSBpZihrZXl3b3JkID09PSBcInNldFwiKVxuICAgICAgICBzdGF0ZW1lbnQgPSBwYXJzZVNldCh0b2tlbnMpO1xuICAgIGVsc2UgaWYoa2V5d29yZCA9PT0gXCJyZXR1cm5cIilcbiAgICAgICAgc3RhdGVtZW50ID0gcGFyc2VSZXR1cm4odG9rZW5zKTtcbiAgICBlbHNlXG4gICAgICAgIHN0YXRlbWVudCA9IHBhcnNlQWN0aW9uKHRva2Vucyk7XG5cbiAgICByZXR1cm4gc3RhdGVtZW50O1xuXG59XG5cbi8vIEFDVElPTiA6OiBXT1JEUyBcXG5cbmZ1bmN0aW9uIHBhcnNlQWN0aW9uKHRva2Vucykge1xuXG4gICAgdmFyIHdvcmRzID0gcGFyc2VXb3Jkcyh0b2tlbnMpO1xuICAgIHRva2Vucy5lYXQoXCJcXG5cIik7XG5cbiAgICByZXR1cm4ge1xuICAgICAgICB0eXBlOiBcImFjdGlvblwiLFxuICAgICAgICB3b3Jkczogd29yZHMsXG4gICAgICAgIHRvU3RyaW5nOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gd29yZHMuam9pbignICcpO1xuICAgICAgICB9XG4gICAgfVxuXG59XG5cbi8vIFdPUkRTIDo6IC4rXG5mdW5jdGlvbiBwYXJzZVdvcmRzKHRva2Vucykge1xuXG4gICAgdmFyIHdvcmRzID0gW107XG4gICAgd2hpbGUodG9rZW5zLmhhc05leHQoKSAmJiAhdG9rZW5zLm5leHRJcyhcIlxcblwiKSlcbiAgICAgICAgd29yZHMucHVzaCh0b2tlbnMuZWF0KCkpO1xuICAgIHJldHVybiB3b3JkcztcblxufVxuXG4vLyBETyA6OiBkbyBDQUxMXG5mdW5jdGlvbiBwYXJzZURvKHRva2Vucykge1xuXG4gICAgdG9rZW5zLmVhdChcImRvXCIpO1xuXG4gICAgdmFyIGNhbGwgPSBwYXJzZUNhbGwodG9rZW5zKTtcblxuICAgIC8vIEVhdCB0aGUgdHJhaWxpbmcgbmV3bGluZVxuICAgIHRva2Vucy5lYXQoXCJcXG5cIik7XG5cbiAgICByZXR1cm4ge1xuICAgICAgICB0eXBlOiBcImRvXCIsXG4gICAgICAgIGNhbGw6IGNhbGwsXG4gICAgICAgIHRvU3RyaW5nOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gXCJkbyBcIiArIGNhbGwudG9TdHJpbmcoKVxuICAgICAgICB9XG4gICAgfTtcblxufVxuXG4vLyBDQUxMIDo6IGlkZW50aWZpZXIgKCBJREVOVElGSUVSKiApXG5mdW5jdGlvbiBwYXJzZUNhbGwodG9rZW5zKSB7XG5cbiAgICB2YXIgaWRlbnRpZmllciA9IHRva2Vucy5lYXQoKTsgLy8gQ29uc3VtZSBuYW1lXG4gICAgdG9rZW5zLmVhdChcIihcIik7IC8vIENvbnN1bWUgbGVmdCBwYXJlblxuICAgIC8vIENvbnN1bWUgYXJndW1lbnRzXG4gICAgdmFyIGFyZ3MgPSBbXTtcbiAgICB3aGlsZSghdG9rZW5zLm5leHRJcyhcIilcIikpIHtcbiAgICAgICAgYXJncy5wdXNoKHRva2Vucy5lYXQoKSk7XG4gICAgfVxuICAgIHRva2Vucy5lYXQoXCIpXCIpO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgdHlwZTogXCJjYWxsXCIsXG4gICAgICAgIG5hbWU6IGlkZW50aWZpZXIsXG4gICAgICAgIGFyZ3VtZW50czogYXJncyxcbiAgICAgICAgdG9TdHJpbmc6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBpZGVudGlmaWVyICsgXCIoXCIgKyBhcmdzLmpvaW4oJyAnKSArIFwiKVwiO1xuICAgICAgICB9XG4gICAgfTtcblxufVxuXG4vLyBVTlRJTCA6OiB1bnRpbCBRVUVSWSBTVEFURU1FTlRTXG5mdW5jdGlvbiBwYXJzZVVudGlsKHN0cmF0ZWd5SWQsdG9rZW5zLCB0YWJzRXhwZWN0ZWQpIHtcblxuICAgIHRva2Vucy5lYXQoXCJ1bnRpbFwiKTtcbiAgICB2YXIgcXVlcnkgPSBwYXJzZVF1ZXJ5KHRva2Vucyk7XG5cbiAgICB2YXIgc3RhdGVtZW50cyA9IHBhcnNlU3RhdGVtZW50cyhzdHJhdGVneUlkLHRva2VucywgdGFic0V4cGVjdGVkICsgMSk7XG5cbiAgICByZXR1cm4ge1xuICAgICAgICB0eXBlOiBcInVudGlsXCIsXG4gICAgICAgIHF1ZXJ5OiBxdWVyeSxcbiAgICAgICAgc3RhdGVtZW50czogc3RhdGVtZW50cyxcbiAgICAgICAgdG9TdHJpbmc6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBcInVudGlsIFwiICsgcXVlcnkudG9TdHJpbmcoKTtcbiAgICAgICAgfVxuICAgIH07XG5cbn1cblxuLy8gQ09ORElUSU9OQUwgOjogaWYgUVVFUlkgU1RBVEVNRU5UU1xuZnVuY3Rpb24gcGFyc2VJZihzdHJhdGVneUlkLCB0b2tlbnMsIHRhYnNFeHBlY3RlZCkge1xuICAgIG1pbmlTdGVwcz1bXTtcbiAgICB0b2tlbnMuZWF0KFwiaWZcIik7XG4gICAgdmFyIHF1ZXJ5ID0gcGFyc2VRdWVyeSh0b2tlbnMpO1xuXG4gICAgdmFyIHN0YXRlbWVudHMgPSBwYXJzZVN0YXRlbWVudHMoc3RyYXRlZ3lJZCwgdG9rZW5zLCB0YWJzRXhwZWN0ZWQgKyAxKTtcbiAgICBtaW5pU3RlcHMucHVzaCh7cm9sZTogXCJVc2VyXCIsIHRleHQ6IFwiU3RlcCAxLUZpbmQgdGhlIHZhbHVlIG9mIHRoZSB2YXJpYWJsZSB1c2luZyB0aGUgdmFyaWFibGVzIHBhbmUgb24gdGhlIHJpZ2h0LlwifSlcbiAgICBtaW5pU3RlcHMucHVzaCh7cm9sZTogXCJVc2VyXCIsIHRleHQ6IFwiU3RlcCAyLUluc3BlY3QgdGhlIGNvbmRpdGlvbiBpbiB0aGUgc3RhdGVtZW50LiBJZiB0aGUgY29uZGl0aW9uIGlzIHRydWUsIGNsaWNrIFRydWUuIE90aGVyd2lzZSwgY2xpY2sgRmFsc2UuXCJ9KVxuICAgIG1pbmlTdGVwcy5wdXNoKHtyb2xlOiBcIkNvbXB1dGVyXCIsIHRleHQ6IFwiU3RlcCAzLVRoZSBjb21wdXRlciB3aWxsIGdvIHRvIHRoZSBuZXh0IHN0YXRlbWVudC5cIn0pXG5cbiAgICByZXR1cm4ge1xuICAgICAgICB0eXBlOiBcImlmXCIsXG4gICAgICAgIHF1ZXJ5OiBxdWVyeSxcbiAgICAgICAgbWluaVN0ZXBzOiBtaW5pU3RlcHMsXG4gICAgICAgIHN0YXRlbWVudHM6IHN0YXRlbWVudHMsXG4gICAgICAgIHRvU3RyaW5nOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gXCJpZiBcIiArIHF1ZXJ5LnRvU3RyaW5nKCk7XG4gICAgICAgIH1cbiAgICB9O1xuXG59XG5cbi8vIEZPUkVBQ0ggOjogZm9yIGVhY2ggSURFTlRJRklFUiBpbiBJREVOVElGSUVSIFNUQVRFTUVOVFNcbmZ1bmN0aW9uIHBhcnNlRm9yRWFjaChzdHJhdGVneUlkLHRva2VucywgdGFic0V4cGVjdGVkKSB7XG5cbiAgICB0b2tlbnMuZWF0KFwiZm9yXCIpO1xuICAgIHRva2Vucy5lYXQoXCJlYWNoXCIpO1xuICAgIHZhciBpZGVudGlmaWVyID0gdG9rZW5zLmVhdCgpO1xuICAgIHRva2Vucy5lYXQoXCJpblwiKTtcbiAgICB2YXIgbGlzdCA9IHRva2Vucy5lYXQoKTtcblxuICAgIHZhciBzdGF0ZW1lbnRzID0gcGFyc2VTdGF0ZW1lbnRzKHN0cmF0ZWd5SWQsdG9rZW5zLCB0YWJzRXhwZWN0ZWQgKyAxKTtcblxuICAgIHJldHVybiB7XG4gICAgICAgIHR5cGU6IFwiZm9yZWFjaFwiLFxuICAgICAgICBsaXN0OiBsaXN0LFxuICAgICAgICBpZGVudGlmaWVyOiBpZGVudGlmaWVyLFxuICAgICAgICBzdGF0ZW1lbnRzOiBzdGF0ZW1lbnRzLFxuICAgICAgICB0b1N0cmluZzogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIFwiZm9yIGVhY2hcIiArIGlkZW50aWZpZXIgKyBcIiBpbiBcIiArIGxpc3Q7XG4gICAgICAgIH1cbiAgICB9O1xuXG59XG5cbi8vIFNFVCA6OiBzZXQgSURFTlRJRklFUiB0byBRVUVSWVxuZnVuY3Rpb24gcGFyc2VTZXQodG9rZW5zKSB7XG4gICAgbWluaVN0ZXBzPVtdO1xuICAgIHRva2Vucy5lYXQoXCJzZXRcIik7XG4gICAgdmFyIGlkZW50aWZpZXIgPSB0b2tlbnMuZWF0KCk7XG4gICAgdG9rZW5zLmVhdChcInRvXCIpO1xuICAgIHZhciBxdWVyeSA9IHBhcnNlUXVlcnkodG9rZW5zKTtcblxuICAgIC8vIEVhdCB0aGUgdHJhaWxpbmcgbmV3bGluZVxuICAgIHRva2Vucy5lYXQoXCJcXG5cIik7XG4gICAgbWluaVN0ZXBzLnB1c2goe3JvbGU6IFwiVXNlclwiLCB0ZXh0OiBcInNldCBhIHZhbHVlIGZvciBcIitpZGVudGlmaWVyICsgXCIgaW4gdGhlIFZhcmlhYmxlIHBhbmVsLlwifSk7XG4gICAgbWluaVN0ZXBzLnB1c2goe3JvbGU6IFwiQ29tcHV0ZXJcIiwgdGV4dDogXCJUaGUgY29tcHV0ZXIgd2lsbCBnbyB0byB0aGUgbmV4dCBzdGF0ZW1lbnQgYnkgY2xpY2tpbmcgbmV4dCBidXR0b24uXCJ9KVxuICAgIHJldHVybiB7XG4gICAgICAgIHR5cGU6IFwic2V0XCIsXG4gICAgICAgIG1pbmlTdGVwczptaW5pU3RlcHMsXG4gICAgICAgIGlkZW50aWZpZXI6IGlkZW50aWZpZXIsXG4gICAgICAgIHF1ZXJ5OiBxdWVyeSxcbiAgICAgICAgdG9TdHJpbmc6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBcInNldCBcIiArIGlkZW50aWZpZXIgKyBcIiB0byBcIiArICBxdWVyeS50b1N0cmluZygpO1xuICAgICAgICB9XG4gICAgfTtcblxufVxuXG4vLyBSRVRVUk4gOjogcmV0dXJuIFFVRVJZXG5mdW5jdGlvbiBwYXJzZVJldHVybih0b2tlbnMpIHtcblxuICAgIHRva2Vucy5lYXQoXCJyZXR1cm5cIik7XG4gICAgdmFyIHF1ZXJ5ID0gcGFyc2VRdWVyeSh0b2tlbnMpO1xuXG4gICAgLy8gRWF0IHRoZSB0cmFpbGluZyBuZXdsaW5lXG4gICAgdG9rZW5zLmVhdChcIlxcblwiKTtcblxuICAgIHJldHVybiB7XG4gICAgICAgIHR5cGU6IFwicmV0dXJuXCIsXG4gICAgICAgIHF1ZXJ5OiBxdWVyeSxcbiAgICAgICAgdG9TdHJpbmc6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBcInJldHVybiBcIiArIHF1ZXJ5LnRvU3RyaW5nKCk7XG4gICAgICAgIH1cbiAgICB9O1xuXG59XG5cbi8vIFFVRVJZIDo6IElERU5USUZJRVIgfCBDQUxMIHwgTk9USElORyB8IFdPUkRTXG5mdW5jdGlvbiBwYXJzZVF1ZXJ5KHRva2Vucykge1xuXG4gICAgdmFyIGZpcnN0ID0gdG9rZW5zLmVhdCgpO1xuXG4gICAgLy8gSWYgaXQncyBhIHN0cmF0ZWd5IGNhbGwsIHBhcnNlIGEgY2FsbC5cbiAgICBpZih0b2tlbnMubmV4dElzKFwiKFwiKSkge1xuXG4gICAgICAgIHRva2Vucy51bmVhdCgpO1xuICAgICAgICByZXR1cm4gcGFyc2VDYWxsKHRva2Vucyk7XG5cbiAgICB9XG4gICAgLy8gSWYgaXQncyBcIm5vdGhpbmdcIiwgc3RvcCBwYXJzaW5nXG4gICAgZWxzZSBpZihmaXJzdCA9PT0gXCJub3RoaW5nXCIpIHtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogXCJub3RoaW5nXCIsXG4gICAgICAgICAgICBub3RoaW5nOiBmaXJzdCxcbiAgICAgICAgICAgIHRvU3RyaW5nOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFwibm90aGluZ1wiO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICB9XG4gICAgLy8gT3RoZXJ3aXNlLCBwYXJzZSB3b3Jkc1xuICAgIGVsc2Uge1xuXG4gICAgICAgIHZhciB3b3JkcyA9IHBhcnNlV29yZHModG9rZW5zKTtcbiAgICAgICAgd29yZHMudW5zaGlmdChmaXJzdCk7XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHR5cGU6IFwicXVlcnlcIixcbiAgICAgICAgICAgIHdvcmRzOiB3b3JkcyxcbiAgICAgICAgICAgIHRvU3RyaW5nOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICB3b3Jkcy5qb2luKCcgJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgIH1cblxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBUb2tlbnM6IFRva2VucyxcbiAgICBwYXJzZUFwcHJvYWNoOnBhcnNlQXBwcm9hY2hcblxufTtcblxuLy8gZnMgPSByZXF1aXJlKCdmcycpXG4vLyAvL2NvbnNvbGUubG9nKHByb2Nlc3MuYXJndlsyXSk7XG4vL1xuLy8gZnMucmVhZEZpbGUocHJvY2Vzcy5hcmd2WzJdLCAndXRmOCcsIGZ1bmN0aW9uIChlcnIsZGF0YSkge1xuLy8gICAgIGlmIChlcnIpIHtcbi8vICAgICAgICAgcmV0dXJuIGNvbnNvbGUubG9nKGVycik7XG4vLyAgICAgfVxuLy8gICAgIC8vY29uc29sZS5sb2coXCJkYXRhID0gXCIsIGRhdGEpO1xuLy8gICAgIHZhciBzdHJhdGVneSA9IGRhdGE7XG4vL1xuLy8gICAgIHRyeSB7XG4vLyAgICAgICAgIHZhciB0b2tlbnMgPSBuZXcgVG9rZW5zKHN0cmF0ZWd5KTtcbi8vICAgICAgICAgLy9vd25lciwgbmFtZSwgZGlzcGxheU5hbWUsIHR5cGUsIHRva2Vucywgcm9ib3RvVGV4dFxuLy8gICAgICAgICB2YXIgYXN0ID0gcGFyc2VBcHByb2FjaChcIm1leXNhbVwiLCBwcm9jZXNzLmFyZ3ZbMl0sIFwibWV5c2FtXCIsIFwiYXBwcm9hY2hcIiwgIHRva2VucywgXCJcIik7XG4vLyAgICAgICAgIGNvbnNvbGUubG9nKEpTT04uc3RyaW5naWZ5KGFzdCwgbnVsbCwgMikpO1xuLy8gICAgIH0gY2F0Y2goZXgpIHtcbi8vICAgICAgICAgY29uc29sZS5sb2coZXgpO1xuLy8gICAgIH1cbi8vXG4vLyB9KTsiXX0=
