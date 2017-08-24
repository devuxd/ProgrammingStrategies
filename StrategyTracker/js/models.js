'use strict';

var clone = require('clone');

class Interpreter {
    constructor(strategies) {
        this.executionStack = [];
        this.historyBackward = [];
        this.strategies = strategies;
    }

    init(name) {
        let initExecutionContext = new FunctionExecContext(this.findStrategy(name));
        this.executionStack.push(initExecutionContext);
        return {
            currentStatement: initExecutionContext.pc,
            currentStrategy: initExecutionContext.strategy
        }
    }

    findStrategy(strategyname) {
        return this.strategies.find(function(strategy) {
            return strategy.name === strategyname;
        })
    }

    execute(lineNum) {
        if(this.executionStack.length) {
            this.historyBackward.push(clone(this.executionStack)); // take a snapshot from our current executionStack to our history
        }
        let executionContext = this.executionStack.pop();
        if(executionContext === undefined) return null;
        if(!executionContext.pc.dirty && executionContext.pc.nextStrategy.length) {
            let wizardDiv = document.getElementById("wizard");

            let nextExecutionContext = new FunctionExecContext(this.findStrategy(executionContext.pc.nextStrategy));
            executionContext.pc.dirty = true;
            this.executionStack.push(executionContext);
            this.executionStack.push(nextExecutionContext);
           // this.appendToWizard((executionContext,wizardDiv))
            this.appendToWizard(nextExecutionContext, wizardDiv);
            return {
                currentStatement: nextExecutionContext.pc,
                currentStrategy: nextExecutionContext.strategy,
            };


        } else {
            executionContext.pc.dirty = false;
            let nextStatement = executionContext.getNextStatement(lineNum);
            if(nextStatement.successor !== undefined) {
                this.executionStack.push(executionContext);
            }
            return {
                currentStatement: nextStatement,
                currentStrategy: executionContext.strategy,
            };
        }
    }

    appendToWizard(nextExecutionContext, wizardDiv) {
        var innerDiv = document.createElement('div');
        innerDiv.className = 'wizard-block well';
        innerDiv.append(nextExecutionContext.strategy.displayName);
        wizardDiv.appendChild(innerDiv);
    }

    goBack() {
        let stack = this.historyBackward.pop();
        if(stack === undefined)
            return null;
        this.executionStack = stack;
        let executionContext = this.executionStack[this.executionStack.length - 1];
        return {
            currentStatement:  executionContext.pc,
            currentStrategy: executionContext.strategy,
        };
    }
}


class FunctionExecContext {
    constructor(strategy) {
        this.strategy = strategy;
        this.pc = 0;
    }

    get pc() {
        return this._pc;
    }

    set pc(lineNum) {
        this._pc = this.strategy.statements[lineNum];
    }

    getNextStatement(lineNum) {
        if(lineNum !== undefined) {
            this.pc = lineNum;
        } else {
            this.pc = this.pc.successor;
        }
        return this.pc;
    }
}

module.exports = {
    Interpreter: Interpreter
};