// These functions parse this grammar:
//
// https://github.com/devuxd/ProgrammingStrategies/blob/master/roboto.md

function Tokens(code) {

	this.tokens = tokenize(code);
	
	this.eat = function(expected) {
		
		if(expected && !this.nextIs(expected)) {
			throw new Error("Expected '" + expected + "', but found '" + this.tokens.slice(0, 5).join(" ") + "'");	
		}

		return this.tokens.shift();

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
	this.nextMatches = function(regex) { return this.hasNext() && this.peek().matches(regex); }
	this.peek = function() { return this.hasNext() ? this.tokens[0].toLowerCase() : null; }
	
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
function parseApproach(name, tokens) {

	var strategies = [];
	
	// Parse one or more strategies.
	while(tokens.nextIs("strategy")) {
		strategies.push(parseStrategy(tokens));
	}
	
	if(tokens.hasNext())
		console.error("I'm not smart enough to handle anything other than strategies, so I got stuck on '" + tokens.peek() + "'");
	
	return {
		type: "approach",
		name: name,
		strategies: strategies
	};

}

// STRATEGY :: strategy IDENTIFIER ( IDENTIFIER+ ) STATEMENTS \n
function parseStrategy(tokens) {
	
	tokens.eat("strategy");
	var identifier = tokens.eat();

	tokens.eat("(");
	var parameters = [];
	while(!tokens.nextIs(")")) {
		parameters.push(tokens.eat()); // Consume arguments
	}
	tokens.eat(")"); // Consume right parenthesis

	// Consume statements.
	var statements = parseStatements(tokens, 1);

	// Consume any number of newlines.
	while(tokens.nextIs("\n"))
		tokens.eat("\n");
	
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
		else
			break;

		// Read a statement
		statements.push(parseStatement(tokens, tabsExpected));
		
	} while(true);

	return statements;
		
}

// STATEMENT :: * (ACTION | CALL | CONDITIONAL | FOREACH | DEFINITION | RETURN )+ [# word+]
function parseStatement(tokens, tabsExpected) {
	
	var keyword = tokens.peek();
	var statement = null;
	
	if(keyword === "do")
		statement = parseDo(tokens);
	else if(keyword === "if")
		statement = parseIf(tokens, tabsExpected);
	else if(keyword === "for")
		statement = parseForEach(tokens, tabsExpected);
	else if(keyword === "set")
		statement = parseSet(tokens);
	else if(keyword === "return")
		statement = parseReturn(tokens);
	else
		statement = parseAction(tokens);
	
	return statement;
	
}

// ACTION :: (word | IDENTIFIER)+
function parseAction(tokens) {

	var words = [];
	while(tokens.hasNext() && !tokens.nextIs("\n"))
		words.push(tokens.eat());

	return {
		type: "action",
		words: words
	}
	
}

// DO :: do identifier ( IDENTIFIER* )
function parseDo(tokens) {

	tokens.eat("do");
	var identifier = tokens.eat(); // Consume name
	tokens.eat("("); // Consume left paren
	// Consume arguments
	var arguments = [];
	while(!tokens.nextIs(")")) {
		arguments.push(tokens.eat());
	}
	tokens.eat(")");

	// Eat the trailing newline
	tokens.eat("\n");
	
	return {
		type: "do",
		name: identifier,
		arguments: arguments
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

// FOREACH :: for each IDENTIFIER IDENTIFIER STATEMENTS
function parseForEach(tokens, tabsExpected) {

	tokens.eat("for");
	tokens.eat("each");
	var list = tokens.eat();
	var identifier = tokens.eat();

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

// QUERY :: (word | IDENTIFIER)+
function parseQuery(tokens) {

	// Couldn't think of a way that querying is different from an action.
	return parseAction(tokens);	
	
}

fs = require('fs')

fs.readFile(process.argv[2], 'utf8', function (err,data) {
  if (err) {
    return console.log(err);
  }
  var strategy = data;

	try {
		var tokens = new Tokens(strategy);
		var ast = parseApproach(process.argv[2], tokens);
		console.log(JSON.stringify(ast, null, 2));
	} catch(ex) {
		console.log(ex);
	}

});