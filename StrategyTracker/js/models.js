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

    execute(branchTaken) {
        if (this.executionStack.length) {
            this.historyBackward.push(clone(this.executionStack)); // take a snapshot from our current executionStack to our history
        } else {
            return null;
        }
        let currentExecutionContext = this.executionStack.pop();
        let nextType = currentExecutionContext.getNextStatement(currentExecutionContext.pc, branchTaken);
        if(nextType === 'nothing' || nextType === 'return') return this.execute();
        else if (nextType === 'new') {
            this.executionStack.push(currentExecutionContext);
            let myArgs = null;
            if(currentExecutionContext.pc.type === 'do') {
                 myArgs = currentExecutionContext.pc.call.arguments.map(function (val) {
                    return val.replace(/'/g,'');
                });
            } else {
                myArgs = currentExecutionContext.pc.query.arguments.map(function (val) {
                    return val.replace(/'/g,'');
                });
            }
            let args = [];
            myArgs.forEach(function (value, index, array) {
                console.log(value);
                let myvar = currentExecutionContext.variables.find(function (val) {
                    console.log(val);
                    return val.name === value;
                });
                args.push(myvar);
            });
            console.log("ARGS", args);

            let strategy = this.findStrategy(currentExecutionContext.pc.type === 'do' ? currentExecutionContext.pc.call.name : currentExecutionContext.pc.query.name);
            currentExecutionContext = new FunctionExecContext(strategy);
            currentExecutionContext.variables.forEach(function (value, index, array) {
                if(value.type == 'parameter') {
                    value.val = args[index].val;
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
        if(this.strategy.parameters !== undefined){
            this.strategy.parameters.forEach(function (currentVal, index, arr) {
                currentVal = currentVal.replace(/'/g, '');
                this.variables.push({"id": globalCounter.count++, "name": currentVal, "val": null, "type": "parameter"});
            }, this);
        }
        this.extractVariables(this.strategy.statements, globalCounter, this);
        this.callStack = [];
    }

    extractVariables(statements, counter, argThis) {
        statements.forEach(function (currentVal, index, arr) {
            if (currentVal.identifier) {
                let identifier = currentVal.identifier.replace(/'/g, '');
                argThis.variables.push({"id": counter.count++, "name": identifier, "val": null, "type": "identifier"});
            }
            if (currentVal.type === 'do') {
                if (currentVal.call.arguments) {
                    currentVal.call.arguments.forEach(function (val, ind, array) {
                        val = val.replace(/'/g, '');
                        argThis.variables.push({"id": counter.count++, "name": val, "val": null, "type": "argument"});
                    }, argThis);
                }
            }
            if (currentVal.type === 'return') {
                if (currentVal.query.arguments) {
                    currentVal.query.arguments.forEach(function (val, ind, array) {
                        val = val.replace(/'/g, '');
                        argThis.variables.push({"id": counter.count++, "name": val, "val": null, "type": "argument"});
                    }, argThis);
                }
            }
            if (currentVal.type === "foreach") {
                argThis.variables.forEach(function (val) {
                    if (val.name === (currentVal.list.replace(/'/g, ''))) {
                        val.val = [];
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
        if(this.callStack.length) {
            this.pc = this.callStack.pop();
            this.pc = this.blocks.shift();
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
                    this.blocks.unshift(currentStatement)
                    for (let i = currentStatement.statements.length - 1; i >= 0; i--) {
                        this.blocks.unshift(clone(currentStatement.statements[i]));
                    }
                }
            } else if (currentStatement.type === "return") {
                if (currentStatement.query.type === "call") {
                    this.callStack.push(this.pc);
                    return 'new';
                } else if (currentStatement.query.type === 'nothing') {
                    return 'nothing';
                } else {
                    return 'return';
                }
            } else if (currentStatement.type === "do" || currentStatement.type === "action") {
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
                        if(num < loopCountVar.val.length-1) {
                            let tempStatement = clone(currentStatement);
                            tempStatement.type = "loop";
                            tempStatement.counter = count-1;
                            this.blocks.unshift(tempStatement);
                        }
                    }
                }
            } else {
                // if (currentStatement.statements !== undefined && currentStatement.type != "loop")
                //     this.blocks.unshift(clone(currentStatement.statements[0]));
            }
            this.pc = this.blocks.shift();
            this.activeLines.push(this.pc.id);
            return this;
        }
    }
}

module.exports = {
    Interpreter: Interpreter
};
