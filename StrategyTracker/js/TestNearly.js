const nearley = require("nearley");
const grammar = require("./grammar1.js");

// Create a Parser object from our grammar.
const parser = new nearley.Parser(nearley.Grammar.fromCompiled(grammar));
// grammar.indented(lexer, `STRATEGY verifyAPIHasCommunity('apiName')
//                                     SET site's TO the website
//                                     Because its two lines long
//                                     IF site is nothing
//                                         RETURN nothing
//                                     This tests the dountil loop
//                                     UNTIL you have all the diamonds
//                                         Look over your shoulder for cops
//                                     RETURN assessRepositoryActivity(site)`)
//
// console.log(JSON.stringify(parser.results));
// parser.feed('\\lx Red\n' +
//     '\\ps Adjective\n' +
//     '\n' +
//     '\\lx Record\n' +
//     '\\ps Noun\n' +
//     '\\ps Verb\n' +
//     '\n' +
//     '\\lx All\n' +
//     '\\ps Adjective\n' +
//     '\\ps Adverb\n' +
//     '\\ps Noun');


parser.feed("strategy test('A') hello");

// parser.feed("Strategy test('A') " +
//     "DO something('dd')" +
//     "DO elsewhere('Nadidi')" +
//     "IF the guy talk bad ");
// parser.feed("Statement");

// parser.feed("set 'c' to the last commit to the project");
//
// parser.feed("IF site is nothing")
// parser.feed("RETURN nothing ");



