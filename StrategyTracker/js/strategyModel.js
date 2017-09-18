'use strict';

class Strategy {

    constructor(name, statements) {
        this.name = name;
        this.statements = [] ;
    }

    insertStatement(text, description, lineNum, successor, variables, nextStrategy, classstyle){
        this.text = text;
        this.description = description;
        this.lineNum = lineNum;
        this.successor = successor;
        this.variables = variables;
        this.nextStrategy = nextStrategy;
        this.classStyle = classstyle;
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