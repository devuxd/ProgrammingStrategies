'use strict';

var clone = require('clone');

class Interpreter {


    constructor(strategies) {
        this.executionStack = [];
        this.historyBackward = [];
        this.strategies = strategies;
        this.dirty= false;
    }

    init(name) {
        let initExecutionContext = new FunctionExecContext(this.findStrategy(name));
        this.executionStack.push(initExecutionContext);
        return {
            currentStatement: initExecutionContext.pc,
            currentStrategy: initExecutionContext.strategy,
            executionStack: this.executionStack,
        }
    }
    reset(){
        let wizardDiv = document.getElementById("wizard");
        this.historyBackward.splice(0,this.historyBackward.length);
        this.executionStack.splice(0,this.executionStack.length);
        this.updateWizard(wizardDiv);
        this.dirty= false;
    }


    findStrategy(strategyname) {
        return this.strategies.find(function(strategy) {
            return strategy.name === strategyname;
        })
    }

    execute(lineNum) {
        let wizardDiv = document.getElementById("wizard");

            if(this.executionStack.length) {
                this.historyBackward.push(clone(this.executionStack)); // take a snapshot from our current executionStack to our history
            }
            let executionContext = this.executionStack.pop();
            if(executionContext === undefined)
                return null;
            if(!this.dirty && executionContext.pc.nextStrategy.length) {

                let nextExecutionContext = new FunctionExecContext(this.findStrategy(executionContext.pc.nextStrategy));
                this.dirty = true;
                this.executionStack.push(executionContext);
                this.executionStack.push(nextExecutionContext);


                this.updateWizard(wizardDiv);
                return {
                    currentStatement: nextExecutionContext.pc,
                    currentStrategy: nextExecutionContext.strategy,
                    executionStack: this.executionStack,
                };
            } else {
                this.dirty = false;
                let nextStatement = executionContext.getNextStatement(lineNum);
                if(nextStatement.successor==undefined)
                {
                    this.dirty = true;
                    executionContext = this.executionStack.pop();
                    if(executionContext === undefined)
                        return null;
                    nextStatement= executionContext.getNextStatement(executionContext.pc.lineNum);

                }
                this.executionStack.push(executionContext);
                this.updateWizard(wizardDiv);
                return {
                    currentStatement: nextStatement,
                    currentStrategy: executionContext.strategy,
                    executionStack: this.executionStack,
                };
            }
    }
    updateWizard( wizardDiv) {
        while (wizardDiv.firstChild) {
            wizardDiv.removeChild(wizardDiv.firstChild);
        }
        for(var i=0; i<this.executionStack.length; i++){
            var innerDiv = document.createElement('div');
            innerDiv.className = 'wizard-block well';
            innerDiv.append(this.executionStack[i].strategy.displayName);
            wizardDiv.appendChild(innerDiv);
        }

    }

    goBack() {
        let stack = this.historyBackward.pop();
        if(stack === undefined)
            return null;
        this.executionStack = stack;
        let executionContext = this.executionStack[this.executionStack.length - 1];
        let wizardDiv = document.getElementById("wizard");
        if(executionContext.strategy.displayName != wizardDiv.lastElementChild.lastChild.data)
            this.updateWizard(wizardDiv)

        return {
            currentStatement:  executionContext.pc,
            currentStrategy: executionContext.strategy,
            executionStack: this.executionStack,
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