'use strict';

var clone = require('clone');

class Interpreter {

    constructor(strategies) {
        this.executionStack = [];
        this.historyBackward = [];
        this.strategies = strategies;
    }

    init(currentStrategy) {
        let currentExecutionContext = new FunctionExecContext(currentStrategy);
        this.executionStack.push(currentExecutionContext);

        return {
            currentStatement: currentExecutionContext.pc,
            currentStrategy: currentExecutionContext.strategy,
            executionStack: this.executionStack,
            activeLines: currentExecutionContext.activeLines,
            //selectionNeeded: currentExecutionContext.pc.type === "if",
            //setNeeded: currentExecutionContext.pc.type === 'set',
            variables: currentExecutionContext.variables,
        }
    }

    reset() {
        this.executionStack = [];
        this.historyBackward = [];
    }

    findStrategy(strategyname) {
        return this.strategies.find(function (strategy) {
            return strategy.name === strategyname;
        })
    }

    addLoopBlocks(id, arr) {
        let tempBlock = [];

        let currentExecutionContext = this.executionStack[this.executionStack.length - 1];
        let forEachStatements = currentExecutionContext.blocks.filter(function (val) {
            return val.id === id
        });
        let loopStatement = null;
        let counter = null;
        if (forEachStatements.length > 0) {
            loopStatement = forEachStatements[forEachStatements.length - 1];
            counter = loopStatement.counter;
        } else {
            loopStatement = this.findStatementById(id);
            counter = 0;
        }
        for (let num = 0, count = arr.length + counter + 1; num < arr.length; num++, count--) {
            for (let i = loopStatement.statements.length - 1; i >= 0; i--) {
                tempBlock.unshift(clone(loopStatement.statements[i]));
            }
            // put the foreach statement length minus 1 times
            if (num <= arr.length - 1) {
                let tempStatement = clone(loopStatement);
                tempStatement.type = "loop";
                tempStatement.counter = count - 1;
                tempBlock.unshift(clone(tempStatement));
            }
        }
        let index = currentExecutionContext.blocks.findIndex(function (val) {
            return val.type === 'loop' && val.counter === counter;
        }) >= 0 ? index : 0; // if findIndex returns nothing, then index is -1, we change it to 0
        index = index + loopStatement.statements.length;
        let endingPart = currentExecutionContext.blocks.splice(index + 1);
        currentExecutionContext.blocks = currentExecutionContext.blocks.concat(tempBlock);
        currentExecutionContext.blocks = currentExecutionContext.blocks.concat(endingPart);
    }

    findStatementById(id) {
        let currentExecutionContext = this.executionStack[this.executionStack.length - 1];
        // locate the statement by parsing the id string and find the index of the statement
        let splitedIndex = id.split('-').splice(1);
        if (splitedIndex.length > 0) {
            let expression = "currentExecutionContext.strategy"; // first generate string for locating the statement by the indexes
            splitedIndex.forEach(function (value, index, array) {
                expression += ".statements[" + value + "]"; // gradually append statements string with its index
            });
            // example => currentExecutionContext.strategy.statements[1].statements[2] and so on
            // evaluate the string to return the object
            return eval(expression); // eval is a javascript command to execute a string
        }
        // if it could not find the statement, return null
        return null;
    }

    execute(branchTaken) {
        if (this.executionStack.length) {
            this.historyBackward.push(clone(this.executionStack)); // take a snapshot from our current executionStack to our history
        } else {
            return null;
        }
        let currentExecutionContext = this.executionStack.pop();
        let nextType = currentExecutionContext.getNextStatement(currentExecutionContext.pc, branchTaken);
        if (nextType === 'nothing') {
            this.historyBackward.pop();
            return this.execute(branchTaken);
        }
        else if (nextType === 'return') return this.execute(branchTaken);
        else if (nextType === null) return null;
        else if (nextType === 'new') {
            this.executionStack.push(currentExecutionContext);
            let myArgs = null;
            if (currentExecutionContext.pc.type === 'do') {
                myArgs = currentExecutionContext.pc.call.arguments.map(function (val) {
                    return val.replace(/'/g, '');
                });
            } else {
                myArgs = currentExecutionContext.pc.query.arguments.map(function (val) {
                    return val.replace(/'/g, '');
                });
            }
            let args = [];
            myArgs.forEach(function (value, index, array) {
                //console.log(value);
                let myvar = currentExecutionContext.variables.find(function (val) {
                    //console.log(val);
                    return val.name === value;
                });
                args.push(myvar);
            });
            console.log("ARGS", args);

            let strategy = this.findStrategy(currentExecutionContext.pc.type === 'do' ? currentExecutionContext.pc.call.name : currentExecutionContext.pc.query.name);
            currentExecutionContext = new FunctionExecContext(strategy);
            currentExecutionContext.variables.forEach(function (value, index, array) {
                if (value.type === 'parameter') {
                    value.val = args[index].val;
                    value.visible = true;
                }
            });
        } else {
            currentExecutionContext = nextType;
        }

        this.executionStack.push(currentExecutionContext);
        return {
            currentStatement: currentExecutionContext.pc,
            currentStrategy: currentExecutionContext.strategy,
            executionStack: this.executionStack,
            activeLines: currentExecutionContext.activeLines,
            selectionNeeded: (currentExecutionContext.pc.type === "if" || currentExecutionContext.pc.type === "until"),
            setNeeded: currentExecutionContext.pc.type === 'set',
            variables: currentExecutionContext.variables,
        };

    }

    goBack() {
        let stack = this.historyBackward.pop();
        if (stack === undefined) return null;
        this.executionStack = stack;
        let currentExecutionContext = this.executionStack[this.executionStack.length - 1];
        return {
            currentStatement: currentExecutionContext.pc,
            currentStrategy: currentExecutionContext.strategy,
            executionStack: this.executionStack,
            activeLines: currentExecutionContext.activeLines,
            selectionNeeded: (currentExecutionContext.pc.type === "if" || currentExecutionContext.pc.type === "until"),
            setNeeded: currentExecutionContext.pc.type === 'set',
            variables: currentExecutionContext.variables,
        };
    }
}

var globalCounter = {count: 0};

class FunctionExecContext {
    constructor(currentStrategy) {
        this.strategy = currentStrategy;
        this.pc = this.strategy;
        this.activeLines = [];
        this.activeLines.push(this.strategy.id);
        this.blocks = [];
        this.blocks = clone(this.strategy.statements);
        this.variables = [];
        if (this.strategy.parameters !== undefined) {
            this.strategy.parameters.forEach(function (currentVal, index, arr) {
                currentVal = currentVal.replace(/'/g, '');
                this.variables.push({
                    "id": globalCounter.count++,
                    "name": currentVal,
                    "val": null,
                    "type": "parameter",
                    "visible": false,
                    "isDirty": false
                });
            }, this);
        }
        this.extractVariables(this.strategy.statements, globalCounter, this);
        var uniq = [...new Set(this.variables)];
        uniq.forEach(function (variable) {
            console.log("var:   " + variable.name);
        });
        this.callStack = [];
    }


    extractVariables(statements, counter, argThis) {
        statements.forEach(function (currentVal, index, arr) {
            if (currentVal.identifier) {
                let identifier = currentVal.identifier.replace(/'/g, '');
                var found = argThis.variables.some(function (el) {
                    return el.name === identifier;
                });
                if (!found) {
                    argThis.variables.push({
                        "id": counter.count++,
                        "name": identifier,
                        "val": null,
                        "type": "identifier",
                        "visible": false,
                        "isDirty": false
                    });
                }
            }
            if (currentVal.type === 'do') {
                if (currentVal.call.arguments) {
                    currentVal.call.arguments.forEach(function (val, ind, array) {
                        val = val.replace(/'/g, '');
                        var found = argThis.variables.some(function (el) {
                            return el.name === val;
                        });
                        if (!found) {
                            argThis.variables.push({
                                "id": counter.count++,
                                "name": val,
                                "val": null,
                                "type": "argument",
                                "visible": false,
                                "isDirty": false
                            });
                        }
                    }, argThis);
                }
            }
            if (currentVal.type === 'return') {
                if (currentVal.query.arguments) {
                    currentVal.query.arguments.forEach(function (val, ind, array) {
                        val = val.replace(/'/g, '');
                        var found = argThis.variables.some(function (el) {
                            return el.name === val;
                        });
                        if (!found) {
                            argThis.variables.push({
                                "id": counter.count++,
                                "name": val,
                                "val": null,
                                "type": "argument",
                                "visible": false,
                                "isDirty": false
                            });
                        }
                    }, argThis);
                }
            }
            if (currentVal.type === "foreach") {
                argThis.variables.forEach(function (val) {
                    if (val.name === (currentVal.list.replace(/'/g, ''))) {
                        val.val = [];
                        val.parentId = currentVal.id;
                    }
                });
            }
            if (currentVal.statements) {
                this.extractVariables(currentVal.statements, counter, argThis);
            }
        }, argThis);
    }

    getNextStatement(currentStatement, branchTaken) {
        this.activeLines = [];
        if (this.callStack.length) {
            this.pc = this.callStack.pop();
            if (this.pc.type === 'return') {
                this.pc.query.type = 'nothing';
            } else {
                this.pc = this.blocks.shift();
            }
            this.activeLines.push(this.pc.id);
            return this;
        } else {
            if (currentStatement.type === "if" && branchTaken) {
                if (currentStatement.statements !== undefined && currentStatement.statements.length > 0) {
                    for (let i = currentStatement.statements.length - 1; i >= 0; i--) {
                        this.blocks.unshift(clone(currentStatement.statements[i]));
                    }
                }
            } else if (currentStatement.type === "until" && branchTaken) {
                if (currentStatement.statements !== undefined && currentStatement.statements.length > 0) {
                    this.blocks.unshift(currentStatement);
                    for (let i = currentStatement.statements.length - 1; i >= 0; i--) {
                        this.blocks.unshift(clone(currentStatement.statements[i]));
                    }
                }
            } else if (currentStatement.type === "return") {
                if (currentStatement.query.type === "call") {
                    this.callStack.push(this.pc);
                    this.activeLines.push(this.pc.id);
                    return 'new';
                } else if (currentStatement.query.type === 'nothing') {
                    this.activeLines.push(this.pc.id);
                    return 'nothing';
                } else {
                    this.activeLines.push(this.pc.id);
                    return 'return';
                }
            } else if (currentStatement.type === "do") {
                if (currentStatement.call !== undefined) {
                    this.callStack.push(this.pc);
                    return 'new';
                }
            } else if (currentStatement.type === "foreach") {
                if (currentStatement.statements !== undefined && currentStatement.statements.length > 0) {
                    let loopCountVar = this.variables.filter(function (val) {
                        return val.name === currentStatement.list.replace(/'/g, '');
                    })[0];
                    for (let num = 0, count = loopCountVar.val.length; num < loopCountVar.val.length; num++, count--) {
                        for (let i = currentStatement.statements.length - 1; i >= 0; i--) {
                            this.blocks.unshift(clone(currentStatement.statements[i]));
                        }
                        // put the foreach statement length minus 1 times
                        if (num < loopCountVar.val.length - 1) {
                            let tempStatement = clone(currentStatement);
                            tempStatement.type = "loop";
                            tempStatement.counter = count - 1;
                            this.blocks.unshift(tempStatement);
                        }
                    }
                }
            } else {
                // if (currentStatement.statements !== undefined && currentStatement.type != "loop")
                //     this.blocks.unshift(clone(currentStatement.statements[0]));
            }

            if (this.blocks.length === 0) {
                return 'nothing';
            } else {
                this.pc = this.blocks.shift();
                this.activeLines.push(this.pc.id);
                return this;
            }

        }
    }
}

module.exports = {
    Interpreter: Interpreter
};
