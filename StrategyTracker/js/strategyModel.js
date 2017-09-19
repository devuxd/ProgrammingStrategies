'use strict';

class Strategy {

    constructor(owner, name, displayName) {
        this.name = name;
        this.owner= owner;
        this.displayName= displayName;
        this.statements = [] ;
    }

    insertStatement(text, description, lineNum, successor, variables, nextStrategy, classstyle){
        let newStat = new Statement(text, description, lineNum, successor, variables, nextStrategy, classstyle);
        this.statements.push(newStat);
    }
}

class Statement{
    constructor(text, description, lineNum, successor, variables, nextStrategy, classstyle){
        this.text = text;
        this.description = description;
        this.lineNum = lineNum;
        this.successor = successor;
        this.variables = variables;
        this.nextStrategy = nextStrategy;
        this.classStyle = classstyle;
    }
}


module.exports = {
    Strategy: Strategy,
    Statement: Statement
};