# Why a language?

There's a broad continuum of ways to solve programming problems. On the completely formal end, we have algorithms that can automatically compute answers to programming problems. On the completely informal end, we have human strategies that can be ambiguous, opportunistic, and creative. What we don't have is something in the middle: systematic, deterministic strategies that leverage human insight and creativity. To achieve this, we're going to design a language that is part formal, part informal, and use it to write semi-formal strategies that humans execute to solve programming problems. By doing this, we hope to find a way of amplifying developer productivity by combining their intelligence with the formality of machine intelligence.

# The language design

The language, which we'll call `Roboto`, has several common features from imperative languages, including:

* Statements
* Loops
* Variables
* Conditionals
* Functions

But `Roboto` also has two human operators:

* Actions
* Queries

The concrete syntax of the language is specified by this grammar:

STRATEGY :: strategy IDENTIFIER `(` IDENTIFIER+ `)` STATEMENTS

STATEMENTS :: STATEMENT+

STATEMENT :: `*` (ACTION | CALL | CONDITIONAL | FOREACH | DEFINITION | RETURN )+

ACTION :: (_`word`_ | IDENTIFIER)+ `.`

CALL :: `do` _`identifier`_ `(` IDENTIFIER* `)`

CONDITIONAL :: `if` QUERY STATEMENTS

FOREACH :: `for each` IDENTIFIER _`identifier`_ STATEMENTS

DEFINITION :: `set` IDENTIFIER `to` QUERY

RETURN :: `return` QUERY

QUERY :: (_`word`_ | IDENTIFIER | CALL)+

IDENTIFIER :: `'` _`identifier`_ `'`

With this grammar, one can write strategy human-executable programs like this:

```
strategy verifyAPIHasCommunity (apiName)
* Set 'site' to the website that hosts the project with 'apiName'
* If 'site' is nothing
	* Return nothing; there is no community.
* return assessRepositoryActivity('site')

strategy assessRepositoryActivity(site)
* Set 'C' to the last commit to the project.
* Set 'CC` to the number of contributors who've committed in the last month
* If 'C' is in the last month and `CC` is more than 5
	* Return true; this is an active community.
* Return false; this is not an active community.
```

As you can see, the programs are mostly composed of natural language that prompts the developer to either act in the world or query the world using their creativity and cognition, but brings formality in how and when information is processed, and how and when action is taken. In a sense, these programs make what is normally disordered, intuitive problem solving into something that is more deterministic and regular.

# Executing programs

Because human developers execute these programs, the runtime environment is actually the developers head. To minimize the cognitive burden of executing these programs, we propose to shift some of this work to an execution environment in which the developer and the environment collaborate to execute strategies.

Here are the responsibilites the environment takes on:

* Managing the call stack required by functions. (This is especially important for recursive functions).
* Providing a place the developer to store the values of variables.
* Maintaining the "program counter" of the programs, so they can go forward through the strategy, and even backwards to their previous steps to reconsider a choice.
* Managing loops.

The developer would still be responsible for executing all actions and queries, and for telling the environment about when to call a function, what the value of queries are, etc. The developer drives, but the environment keeps the developer on the "road."
