'use strict';

var clone = require('clone');

class Interpreter {

    constructor() {
        this.executionStack = [];
        this.historyBackward = [];
    }

    init(currentStrategy, strategies) {

        let initExecutionContext = new FunctionExecContext(currentStrategy.name, strategies);
        //initExecutionContext.activeLines[0] = initExecutionContext.strategy.text;
        this.executionStack.push(initExecutionContext);

        return {
            executionStack: this.executionStack,
            activeLines: initExecutionContext.activeLines,
            currentStrategy: initExecutionContext.strategy,
            variables: initExecutionContext.variables,
            currentStatement: initExecutionContext.pc
        }
    }

    reset() {
        this.executionStack = [];
        this.historyBackward = [];
    }

    findStatementByText(currentStrat, statementText) {

        for (var i = 0; i < currentStrat.statements.length; i++) {
            if (currentStrat.statements[i].text == statementText) {
                return currentStrat.statements[i];
            }
            else if (currentStrat.statements[i].statements !== undefined) {
                let innerStatements = currentStrat.statements[i].statements;
                for (var j = 0; j < innerStatements.length; j++) {
                    if (innerStatements[j].text == statementText) {
                        return innerStatements[j];
                    }
                }
            }
        }
    }

    execute() {
        //let wizardDiv = document.getElementById("wizard");

        if (this.executionStack.length) {
            this.historyBackward.push(clone(this.executionStack)); // take a snapshot from our current executionStack to our history
        }
        let currentExecutionContext = this.executionStack.pop();
        if (currentExecutionContext === undefined) return null;
        let nextExec = currentExecutionContext.getNextStatement(currentExecutionContext.pc);
        if(nextExec.strategy.name !== currentExecutionContext.strategy.name) {
            console.log("New strategy", nextExec.strategy.name);
            console.log("old strategy", currentExecutionContext.strategy.name);
        }
        currentExecutionContext = nextExec;

        if (currentExecutionContext.pc.type == "if")
            currentExecutionContext.selectionNeeded = true;
        else
            currentExecutionContext.selectionNeeded = false;

        this.executionStack.push(currentExecutionContext);
        return {
            currentStatement: currentExecutionContext.pc,
            currentStrategy: currentExecutionContext.strategy,
            executionStack: this.executionStack,
            activeLines: currentExecutionContext.activeLines,
            selectionNeeded: currentExecutionContext.selectionNeeded,
            variables: currentExecutionContext.variables,
        };
    }

    refreshStatement(isTrue) {
        if (this.executionStack.length) {
            this.historyBackward.push(clone(this.executionStack)); // take a snapshot from our current executionStack to our history
        }
        let currentExecutionContext = this.executionStack.pop();
        if (!isTrue) {
            currentExecutionContext.selectionNeeded = false;

        } else if (isTrue) {
            for (let i = currentExecutionContext.pc.statements.length - 1; i >= 0; i--) {
                currentExecutionContext.blocks.unshift(currentExecutionContext.pc.statements[i]);
            }
        }
        currentExecutionContext.pc = currentExecutionContext.blocks.shift();
        currentExecutionContext.activeLines = [];
        currentExecutionContext.activeLines.push(currentExecutionContext.pc.text);
        if (currentExecutionContext.pc.type == "if")
            currentExecutionContext.selectionNeeded = true;
        else
            currentExecutionContext.selectionNeeded = false;
        this.executionStack.push(currentExecutionContext);
        return {
            currentStatement: currentExecutionContext.pc,
            currentStrategy: currentExecutionContext.strategy,
            executionStack: this.executionStack,
            activeLines: currentExecutionContext.activeLines,
            selectionNeeded: currentExecutionContext.selectionNeeded,
            variables: currentExecutionContext.variables,
        };
    }

    goBack() {
        let stack = this.historyBackward.pop();
        if (stack === undefined) return null;
        this.executionStack = stack;
        let currentExecutionContext = this.executionStack[this.executionStack.length - 1];
        if (currentExecutionContext.pc.type == "if")
            currentExecutionContext.selectionNeeded = true;
        else
            currentExecutionContext.selectionNeeded = false;
        return {
            currentStatement: currentExecutionContext.pc,
            currentStrategy: currentExecutionContext.strategy,
            executionStack: this.executionStack,
            activeLines: currentExecutionContext.activeLines,
            selectionNeeded: currentExecutionContext.selectionNeeded,
            variables: currentExecutionContext.variables,
        };
    }
}

var globalCounter = {count: 0};

class FunctionExecContext {
    constructor(currentStrategy, strategies) {
        this.strategies = strategies;
        this.strategy = this.findStrategy(currentStrategy);
        this.pc = this.strategy;
        this.activeLines = [];
        this.activeLines.push(this.strategy.text);
        this.blocks = [];
        this.blocks = clone(this.strategy.statements);
        this.variables = [];
        this.strategy.parameters.forEach(function (currentVal, index, arr) {
            currentVal = currentVal.replace(/'/g, '');
            this.variables.push({"id": globalCounter.count++, "name": currentVal, "val": null, "type": "parameter"});
        }, this);
        this.extractVariables(this.strategy.statements, globalCounter, this);
        this.selectionNeeded = false;
    }

    extractVariables(statements, counter, argThis) {
        statements.forEach(function (currentVal, index, arr) {
            if (currentVal.identifier) {
                let identifier = currentVal.identifier.replace(/'/g, '');
                argThis.variables.push({"id": counter.count++, "name": identifier, "val": null, "type": "identifier"});
            }
            if (currentVal.type == 'do') {
                if (currentVal.call.arguments) {
                    currentVal.call.arguments.forEach(function (val, ind, array) {
                        val = val.replace(/'/g, '');
                        argThis.variables.push({"id": counter.count++, "name": val, "val": null, "type": "argument"});
                    }, argThis);
                }
            }
            if (currentVal.type == 'return') {
                if (currentVal.query.arguments) {
                    currentVal.query.arguments.forEach(function (val, ind, array) {
                        val = val.replace(/'/g, '');
                        argThis.variables.push({"id": counter.count++, "name": val, "val": null, "type": "argument"});
                    }, argThis);
                }
            }
            if (currentVal.type == "foreach") {
                argThis.variables.forEach(function (val) {
                    if (val.name == (currentVal.list.replace(/'/g, ''))) {
                        val.val = [];
                    }
                });
            }
            if (currentVal.statements) {
                this.extractVariables(currentVal.statements, counter, argThis);
            }
        }, argThis);
    }

    findStrategy(strategyname) {
        return this.strategies.find(function (strategy) {
            return strategy.name === strategyname;
        })
    }

    getNextStatement(currentStatement) {
        this.activeLines = [];
        //||currentStatement.type == "foreach" || currentStatement.type == "until"
        if (currentStatement.type == "strategy") {
            // this.blocks.unshift(clone(currentStatement.statements));
            this.pc = this.blocks.shift();
            this.activeLines.push(this.pc.text);
        }
        else if (currentStatement.type == "if") {
            if (currentStatement.statements !== undefined && currentStatement.statements.length > 0)
                for (var i = currentStatement.statements.length - 1; i >= 0; i--) {
                    this.blocks.unshift(clone(currentStatement.statements[i]));
                }
            this.pc = this.blocks.shift();
            this.activeLines.push(this.pc.text);

        }
        else if (currentStatement.type == "return") {
            if (currentStatement.query.type == "call") {
                let newExec = new FunctionExecContext(currentStatement.query.name, this.strategies);
                let myArgs = currentStatement.query.arguments.map(function (val) {
                    return val.replace(/'/g,'');
                });
                let args = this.variables.filter(function (val, index, arr) {
                    return myArgs.indexOf(val.name) >=0 && val.type != 'argument';
                });
                newExec.variables.forEach(function (value, index, array) {
                    if(value.type == 'parameter') {
                        args.forEach(function (myval, ind, arr) {
                            if(myval.name == value.name) {
                                value.val = myval.val;
                            }
                        })
                    }
                });
                return newExec;
            }
        }
        else if (currentStatement.type == "do") {
            if (currentStatement.call !== undefined) {
                let newExec = new FunctionExecContext(currentStatement.call.name, this.strategies);
                let myArgs = currentStatement.query.arguments.map(function (val) {
                    return val.replace(/'/g,'');
                });
                let args = this.variables.filter(function (val, index, arr) {
                    return myArgs.indexOf(val.name) >=0 && val.type != 'argument';
                });
                newExec.variables.forEach(function (value, index, array) {
                    if(value.type == 'parameter') {
                        args.forEach(function (myval, ind, arr) {
                            if(myval.name == value.name) {
                                value.val = myval.val;
                            }
                        })
                    }
                });
                return newExec;
            }
        }
        else if (currentStatement.type == "foreach") {
            if (currentStatement.statements !== undefined && currentStatement.statements.length > 0) {
                let loopCountVar = this.variables.filter(function (val) {
                    return val.name === currentStatement.list.replace(/'/g, '');
                })[0];
                for (let num = 0, count = loopCountVar.val.length; num < loopCountVar.val.length; num++, count--) {
                    for (var i = currentStatement.statements.length - 1; i >= 0; i--) {
                        this.blocks.unshift(clone(currentStatement.statements[i]));
                    }
                    // put the foreach statement length minus 1 times
                    if(num < loopCountVar.val.length-1) {
                        let tempStatement = clone(currentStatement);
                        tempStatement.type = "loop";
                        tempStatement.counter = count-1;
                        this.blocks.unshift(tempStatement);
                    }
                }
            }
            this.pc = this.blocks.shift();
            this.activeLines.push(this.pc.text);
        }
        else {
            if (currentStatement.statements !== undefined && currentStatement.type != "loop")
                this.blocks.unshift(clone(currentStatement.statements[0]));
            this.pc = this.blocks.shift();
            this.activeLines.push(this.pc.text);
        }

        // if(this.pc.identifier !== undefined)
        //     this.variables.push({"name" :this.pc.identifier , "val":null});

        return this;
    }
}

module.exports = {
    Interpreter: Interpreter
};