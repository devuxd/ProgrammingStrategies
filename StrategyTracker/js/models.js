'use strict';

var clone = require('clone');

Array.prototype.insert = function (index) {
    index = Math.min(index, this.length);
    arguments.length > 1
    && this.splice.apply(this, [index, 0].concat([].pop.call(arguments)))
    && this.insert.apply(this, arguments);
    return this;
};

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
        let currentExecutionContext = this.executionStack[this.executionStack.length - 1];
        if (currentExecutionContext.pc && currentExecutionContext.pc.type === 'foreach') return;// if foreach is still in the blocks, then it should work correctly
        let loopStatement = this.findStatementById(id);
        if (loopStatement !== null) {
            let tempBlock = [];
            let listVariable = loopStatement.list.replace(/'/g, '');
            let counter = 0;
            currentExecutionContext.variables.forEach(function (val, index, arr) {
                if (val.name === listVariable) {
                    counter = val.val.length - 1;
                }
            });
            for (let num = 0; num < arr.length; num++) {
                for (let i = loopStatement.statements.length - 1; i >= 0; i--) {
                    tempBlock.unshift(clone(loopStatement.statements[i]));
                }
                // put the foreach statement length minus 1 times
                if (num <= arr.length - 1) {
                    let tempStatement = clone(loopStatement);
                    tempStatement.type = "loop";
                    tempStatement.counter = counter--;
                    tempBlock.unshift(clone(tempStatement));
                }
            }
            let allLoopStatements = currentExecutionContext.blocks.filter(function (val) {
                return val.id.includes(id);
            });
            let objId = allLoopStatements.length ? allLoopStatements.pop().id : id;
            // reverse to find the last index of statement
            let index = currentExecutionContext.blocks.slice().reverse().findIndex(function (value, index, array) {
                return value.id === objId;
            });
            index = index >= 0 ? currentExecutionContext.blocks.length - index : 0;
            currentExecutionContext.blocks.insert(index, tempBlock);
        }
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
        if (this.executionStack[this.executionStack.length - 1] &&
            this.executionStack[this.executionStack.length - 1].pc.type === 'end') return null;
        if (this.executionStack.length) {
            this.historyBackward.push(clone(this.executionStack)); // take a snapshot from our current executionStack to our history
        } else {
            return null;
        }
        let currentExecutionContext = this.executionStack.pop();
        let nextType = currentExecutionContext.getNextStatement(currentExecutionContext.pc, branchTaken);
        if (nextType === 'nothing' || nextType === 'return') return this.execute(branchTaken);
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
                        val.dirtyArray = [];
                        val.prevVar = [];
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
                this.pc.type = 'end';
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
                    let loopCountVar = this.variables.find(function (val) {
                        return val.name === currentStatement.list.replace(/'/g, '');
                    });
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
