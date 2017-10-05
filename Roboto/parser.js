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

		// Eat any whitespace.
		while(strategy.charAt(index).match(/\s/))
			index++;
			
		if(index === strategy.length)
			break;
			
		if(strategy.charAt(index) === "*") {
			tokens.push("*");
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
		else if(strategy.charAt(index) === ":") {
			tokens.push(":");
			index++;
		}
		else if(strategy.charAt(index) === ".") {
			tokens.push(".");
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

// STRATEGY :: strategy IDENTIFIER ( IDENTIFIER+ ) STATEMENTS
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
	var statements = parseStatements(tokens);
	
	return {
		type: "strategy",
		name: identifier,
		parameters: parameters,
		statements: statements		
	};
	
}

// STATEMENTS :: STATEMENT+
function parseStatements(tokens) {

	var statements = [];

	tokens.eat(":");

	while(!tokens.nextIs(".")) {
		statements.push(parseStatement(tokens));
	}

	tokens.eat(".");

	return statements;
		
}

// STATEMENT :: * (ACTION | CALL | CONDITIONAL | FOREACH | DEFINITION | RETURN )+ [# word+]
function parseStatement(tokens) {
	
	tokens.eat("*");
	
	var keyword = tokens.peek();
	var statement = null;
	
	if(keyword === "do")
		statement = parseDo(tokens);
	else if(keyword === "if")
		statement = parseIf(tokens);
	else if(keyword === "for")
		statement = parseForEach(tokens);
	else if(keyword === "set")
		statement = parseSet(tokens);
	else if(keyword === "return")
		statement = parseReturn(tokens);
	else
		statement = parseAction(tokens);
	
	var comment = null;
	if(tokens.peek().charAt(0) === "#") {
		comment = tokens.eat();
	}
	statement.comment = comment;
	
	return statement;
	
}

// ACTION :: (word | IDENTIFIER)+
function parseAction(tokens) {

	var words = [];
	while(
		tokens.hasNext() && 
		!tokens.nextIs("*") && 
		!tokens.nextIs("strategy") && 
		tokens.peek().charAt(0) !== "#" && 
		!tokens.nextIs(":") && 
		!tokens.nextIs(".")) {
		words.push(tokens.eat());
	}

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
	
	return {
		type: "do",
		name: identifier,
		arguments: arguments
	};
	
}

// CONDITIONAL :: if QUERY STATEMENTS
function parseIf(tokens) {
	
	tokens.eat("if");
	var query = parseQuery(tokens);
	
	var statements = parseStatements(tokens);
	
	return {
		type: "if",
		query: query,
		statements: statements
	};
	
}

// FOREACH :: for each IDENTIFIER IDENTIFIER STATEMENTS
function parseForEach(tokens) {

	tokens.eat("for");
	tokens.eat("each");
	var list = tokens.eat();
	var identifier = tokens.eat();

	var statements = parseStatements(tokens);
	
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