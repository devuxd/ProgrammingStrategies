// These functions parse this grammar:
//
// https://github.com/devuxd/ProgrammingStrategies/blob/master/roboto.md

function Tokens(code) {

    this.tokens = tokenize(code);

    // Remmeber all of the tokens eaten so we can provide useful error message context.
    this.eaten = [];

    this.eat = function(expected) {
        //console.log(expected);

        if(expected && !this.nextIs(expected)) {
            console.log("expected", expected);
            throw new Error("Line " + this.currentLine() + ": expected '" + expected + "', but found '" + this.tokens.slice(0, 5).join(" ") + "'");
        }

        var eaten = this.tokens.shift();

        this.eaten.push(eaten);

        return eaten;

    }

    this.uneat = function() {

        this.tokens.unshift(this.eaten.pop());

    }

    this.eatN = function(n) {

        for(var i = 0; i < n; i++)
            this.eat();

    }

    this.count = function(text) {

        var index = 0;
        while(index < this.tokens.length && this.tokens[index] === text)
            index++;
        return index;

    }

    this.hasNext = function() { return this.tokens.length > 0; }
    this.nextIs = function(string) { return this.hasNext() && this.peek() === string; }
    this.peek = function() { return this.hasNext() ? this.tokens[0].toLowerCase() : null; }

    this.currentLine = function() {

        var line = 1;
        for(var i = 0; i < this.eaten.length; ++i) {
            if(this.eaten[i] === "\n")
                line++;
        }
        return line;

    }

}

// Tokens are segmented by whitespace, *'s, and parentheses
function tokenize(strategy) {

    var index = 0;
    var tokens = [];

    while(index < strategy.length) {

        // Eat any spaces.
        while(strategy.charAt(index).match(/ /))
            index++;

        // If we've reached the end of the string, we're done.
        if(index === strategy.length)
            break;

        if(strategy.charAt(index) === "\n") {
            tokens.push("\n");
            index++;
        }
        else if(strategy.charAt(index) === "\t") {
            tokens.push("\t");
            index++;
        }
        else if(strategy.charAt(index) === "(") {
            tokens.push("(");
            index++;
        }
        else if(strategy.charAt(index) === ")") {
            tokens.push(")");
            index++;
        }
        else if(strategy.charAt(index) === "#") {
            var commentStart = index;
            while(strategy.charAt(index) !== "\n")
                index++;
            tokens.push(strategy.substring(commentStart, index));
        }
        // Tokenize an identifier
        else if(strategy.charAt(index).match(/['\w]/)) {

            var identifierStart = index;
            while(strategy.charAt(index).match(/['\w]/))
                index++;
            tokens.push(strategy.substring(identifierStart, index));

        }
        else {
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
    var index=0;

    // If it's a comment, read a comment.
    while(tokens.peek().charAt(0) === "#") {
        descriptions.push(tokens.eat());
        tokens.eat("\n");
    }

    // Parse one or more strategies.
    while(tokens.nextIs("strategy")) {
        strategies.push(parseStrategy(index,tokens));
        index++;
    }
    // Parse one or more strategies.
    while(tokens.nextIs("strategy")) {
        strategies.push(parseStrategy(index,tokens));
        index++;
    }


    if(tokens.hasNext())
        console.error("I'm not smart enough to handle anything other than strategies, so I got stuck on '" + tokens.tokens.slice(0, 5).join(" ") + "'");

    return {
        owner:owner,
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
    while(!tokens.nextIs(")")) {
        parameters.push(tokens.eat()); // Consume arguments
    }
    tokens.eat(")"); // Consume right parenthesis
    var strategyId = identifier+index.toString()
    // Consume statements.
    var statements = parseStatements(strategyId,tokens, 1);

    // Consume any number of newlines.
    while(tokens.nextIs("\n"))
        tokens.eat("\n");

    return {
        type: "strategy",
        name: identifier,
        id:strategyId,
        parameters: parameters,
        statements: statements,
        text : "Strategy " + identifier + "(" + parameters.join(' ') +")"
    };

}

// STATEMENTS :: STATEMENT+
function parseStatements(strategyId, tokens, tabsExpected) {

    var statements = [];
    var comments = [];
    var index=0;
    // Block starts with a newline.
    tokens.eat("\n");

    // Read statements until we find fewer tabs than expected.
    do {

        // How many tabs?
        var tabsCounted = tokens.count("\t");

        // If we found all the tabs we expected and more, there are extra tabs, and we should fail.
        if(tabsCounted > tabsExpected)
            throw new Error("I expected " + tabsExpected + " but found " + tabsCounted + "; did some extra tabs get in?");
        // If we found the right number, eat them.
        else if(tabsCounted === tabsExpected)
            tokens.eatN(tabsExpected);
        // If we found fewer, we're done eating statements.
        else {
            break;
        }

        // If it's a comment, read a comment.
        if(tokens.peek().charAt(0) === "#") {
            comments.push(tokens.eat());
            tokens.eat("\n");
        }
        // Otherwise, read a statement and assign the comments.
        else {
            var statement = parseStatement(strategyId+"-"+index.toString(), tokens, tabsExpected);

            statement.comments = comments;
            statement.id=strategyId+"-"+index.toString();
            statement.text = statement.toString();
            comments = [];
            statements.push(statement);
            index++;
        }

    } while(true);

    return statements;

}

// STATEMENT :: * (ACTION | CALL | CONDITIONAL | FOREACH | DEFINITION | RETURN )+ [# word+]
function parseStatement(strategyId, tokens, tabsExpected) {

    var keyword = tokens.peek();
    var statement = null;


    if(keyword === "do")
        statement = parseDo(tokens);
    else if(keyword === "until")
        statement = parseUntil(strategyId,tokens, tabsExpected);
    else if(keyword === "if")
        statement = parseIf(strategyId,tokens, tabsExpected);
    else if(keyword === "for")
        statement = parseForEach(strategyId, tokens, tabsExpected);
    else if(keyword === "set")
        statement = parseSet(tokens);
    else if(keyword === "return")
        statement = parseReturn(tokens);
    else
        statement = parseAction(tokens);

    return statement;

}

// ACTION :: WORDS \n
function parseAction(tokens) {
    var miniSteps = [];
    var words = parseWords(tokens);
    tokens.eat("\n");
    miniSteps.push({role: "User", text: "Perform the action described in the statement, returning to the StrategyTracker when you are done."});
    return {
        type: "action",
        miniSteps: miniSteps,
        words: words,
        toString: function () {
            return words.join(' ');
        }
    }

}

// WORDS :: .+
function parseWords(tokens) {

    var words = [];
    while(tokens.hasNext() && !tokens.nextIs("\n"))
        words.push(tokens.eat());
    return words;

}

// DO :: do CALL
function parseDo(tokens) {
    var miniSteps=[];
    tokens.eat("do");

    var call = parseCall(tokens);
    miniSteps.push({role: "Computer", text: "Step 1. The computer will invoke the specified strategy, passing the specified variable values to the strategy."});
    // Eat the trailing newline
    tokens.eat("\n");

    return {
        type: "do",
        miniSteps:miniSteps,
        call: call,
        toString: function () {
            return "do " + call.toString()
        }
    };

}

// CALL :: identifier ( IDENTIFIER* )
function parseCall(tokens) {

    var identifier = tokens.eat(); // Consume name
    tokens.eat("("); // Consume left paren
    // Consume arguments
    var args = [];
    while(!tokens.nextIs(")")) {
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
function parseUntil(strategyId,tokens, tabsExpected) {
    var miniSteps=[];
    tokens.eat("until");
    var query = parseQuery(tokens);

    var statements = parseStatements(strategyId,tokens, tabsExpected + 1);
    miniSteps.push({role: "User", text: "Step 1. Find the value of the variable using the variables pane on the right."});
    miniSteps.push({role: "User", text: "Step 2. Inspect the condition in the statement. If the condition is true, click True. Otherwise, click False."});
    miniSteps.push({role: "Computer", text: "Step 3-The computer will go to the next statement, returning to the until statement after control has reached the end of the section."});

    return {
        type: "until",
        query: query,
        miniSteps: miniSteps,
        statements: statements,
        toString: function () {
            return "until " + query.toString();
        }
    };

}

// CONDITIONAL :: if QUERY STATEMENTS
function parseIf(strategyId, tokens, tabsExpected) {
    var miniSteps=[];
    tokens.eat("if");
    var query = parseQuery(tokens);

    var statements = parseStatements(strategyId, tokens, tabsExpected + 1);
    miniSteps.push({role: "User", text: "Step 1. Find the value of the variable using the variables pane on the right."});
    miniSteps.push({role: "User", text: "Step 2. Inspect the condition in the statement. If the condition is true, click True. Otherwise, click False."});
    miniSteps.push({role: "Computer", text: "Step 3. The computer will go to the next statement."});

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
function parseForEach(strategyId,tokens, tabsExpected) {
    var miniSteps=[];
    tokens.eat("for");
    tokens.eat("each");
    var identifier = tokens.eat();
    tokens.eat("in");
    var list = tokens.eat();

    var statements = parseStatements(strategyId,tokens, tabsExpected + 1);
    miniSteps.push({role: "Computer", text: "Step 1. The computer will iterate over the elements in the collection and select the next element in the collection."});
    miniSteps.push({role: "Computer", text: "Step 2. The computer will record the value of the current element in the specified variable.\n"});
    miniSteps.push({role: "Computer", text: "Step 3. The computer will go to the next statement, returning to the for each statement after control has reached the end of the section."});
    return {
        type: "foreach",
        list: list,
        miniSteps:miniSteps,
        identifier: identifier,
        statements: statements,
        toString: function () {
            return "for each" + identifier + " in " + list;
        }
    };

}

// SET :: set IDENTIFIER to QUERY
function parseSet(tokens) {
    var miniSteps=[];
    tokens.eat("set");
    var identifier = tokens.eat();
    tokens.eat("to");
    var query = parseQuery(tokens);

    // Eat the trailing newline
    tokens.eat("\n");
    miniSteps.push({role: "User", text: "Step 1. Gather the information described and record the value for the variable in the Variables pane at right."});
    miniSteps.push({role: "Computer", text: "Step 2. The computer will record the value you specify for the variable."});
    return {
        type: "set",
        miniSteps:miniSteps,
        identifier: identifier,
        query: query,
        toString: function () {
            return "set " + identifier + " to " +  query.toString();
        }
    };

}

// RETURN :: return QUERY
function parseReturn(tokens) {
    var miniSteps=[];
    tokens.eat("return");
    var query = parseQuery(tokens);

    // Eat the trailing newline
    tokens.eat("\n");
    miniSteps.push({role: "Computer", text: "Step 1. The computer will return the specified value to the caller of the current strategy."});
    miniSteps.push({role: "Computer", text: "Step 2. The computer will continue executing statements in the strategy's caller."});
    return {
        type: "return",
        miniSteps:miniSteps,
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
    if(tokens.nextIs("(")) {

        tokens.uneat();
        return parseCall(tokens);

    }
    // If it's "nothing", stop parsing
    else if(first === "nothing") {

        return {
            type: "nothing",
            nothing: first,
            toString: function () {
                return "nothing";
            }
        }

    }
    // Otherwise, parse words
    else {

        var words = parseWords(tokens);
        words.unshift(first);

        return {
            type: "query",
            words: words,
            toString: function () {
                return  words.join(' ');
            }
        }

    }

}

module.exports = {
    Tokens: Tokens,
    parseApproach:parseApproach

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