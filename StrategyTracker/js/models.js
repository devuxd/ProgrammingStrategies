'use strict';

var clone = require('clone');

class Interpreter {


    constructor(strategies) {
        this.executionStack = [];
        this.historyBackward = [];
        this.strategies = strategies;
    }

    init(name) {
        let initExecutionContext = new FunctionExecContext(name, this.strategies);
        //initExecutionContext.activeLines[0] = initExecutionContext.strategy.text;
        this.executionStack.push(initExecutionContext);

        return {
            currentStatement : initExecutionContext.strategy.text,
            currentStrategy: initExecutionContext.strategy,
            executionStack: this.executionStack,
            activeLines : initExecutionContext.activeLines,
        }
    }
    reset(){
        let wizardDiv = document.getElementById("wizard");
        this.historyBackward.splice(0,this.historyBackward.length);
        this.executionStack.splice(0,this.executionStack.length);
        this.updateWizard(wizardDiv);
        this.dirty= false;
    }
    findStatementByText(currentStrat,statementText){
        for(var i=0; i<currentStrat.statements.length; i++){
            if( currentStrat.statements[i].text == statementText)
            {
                return currentStrat.statements[i];
            }
            else if(currentStrat.statements[i].statements !== undefined && currentStrat.statements[i].statements[0].text == statementText)
            {
                return currentStrat.statements[i].statements[0];
            }
        }
    }

    execute(currentStatementText) {
        //let wizardDiv = document.getElementById("wizard");

        if(this.executionStack.length) {
            this.historyBackward.push(clone(this.executionStack)); // take a snapshot from our current executionStack to our history
        }
        let currentExecutionContext = this.executionStack.pop();
        if(currentExecutionContext === undefined)
            return null;
        if(currentStatementText == undefined)
        {
            currentExecutionContext= currentExecutionContext.getNextStatement(currentExecutionContext.pc);
        }
        else{
            currentExecutionContext.activeLines=[];
            currentExecutionContext.currentStatement = this.findStatementByText(currentExecutionContext.strategy,currentStatementText);
            currentExecutionContext.activeLines.push(currentExecutionContext.currentStatement.text);
            currentExecutionContext.pc = currentExecutionContext.currentStatement;
        }
        this.executionStack.push((currentExecutionContext));
        return {
            currentStatement: currentExecutionContext.pc,
            currentStrategy: currentExecutionContext.strategy,
            executionStack: this.executionStack,
            activeLines :currentExecutionContext.activeLines,
        };
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
        // let wizardDiv = document.getElementById("wizard");
        // if(executionContext.strategy.displayName != wizardDiv.lastElementChild.lastChild.data)
        //     this.updateWizard(wizardDiv)

        return {
            currentStatement:  executionContext.pc,
            currentStrategy: executionContext.strategy,
            executionStack: this.executionStack,
            activeLines: executionContext.activeLines,
        };
    }
}
class FunctionExecContext {

    constructor(strategyName, strategies) {

        this.strategies = strategies;
        this.strategy = this.findStrategy(strategyName);
        this.pc = this.strategy;
        this.i = 0;
       // this.conditionalCounter=0;
        this.activeLines = [];
        this.activeLines.push(this.strategy.text);
    }
    findStrategy(strategyname) {
        return this.strategies.find(function(strategy) {
            return strategy.name === strategyname;
        })
    }

    getNextStatement(currentStatement) {
        this.activeLines=[];
        //||currentStatement.type == "foreach" || currentStatement.type == "until"
        if(currentStatement.type == "if"  ) {
            // if(currentStatement.satements.length >0)
            // {
            //     let newFec = new FunctionExecContext();
            // }
            this.pc = currentStatement.statements[0];
            this.activeLines.push(currentStatement.statements[0].text);
            this.activeLines.push(this.strategy.statements[this.i].text);
            this.i++;
        }
        else if (currentStatement.type == "strategy" ){
            this.i =0;
            this.pc = this.strategy.statements[this.i];
            this.activeLines.push(this.pc.text);
            this.i++;
        }

        else if(currentStatement.type =="return"){
             if (currentStatement.query.type== "call") {
                 let newFec = new FunctionExecContext(currentStatement.query.name, this.strategies);
                 return newFec;
             }
        }
        else if (currentStatement.type=="do") {
            if(currentStatement.call !== undefined){
                let newFec = new FunctionExecContext(currentStatement.call.name, this.strategies);
                return newFec;
            }
        }
        else if(currentStatement.type == "foreach" ) {
            this.pc = currentStatement.statements[0];
            this.activeLines.push(currentStatement.statements[0].text);
            this.activeLines.push(this.strategy.statements[this.i].text);

        }
        else{
            this.pc = this.strategy.statements[this.i];
            this.activeLines.push(this.pc.text)
            this.i++;
        }
        return this;
    }

}
// execute() {
//     let wizardDiv = document.getElementById("wizard");
//
//     if(this.executionStack.length) {
//         this.historyBackward.push(clone(this.executionStack)); // take a snapshot from our current executionStack to our history
//     }
//     let executionContext = this.executionStack.pop();
//     if(executionContext === undefined)
//         return null;
//     if(!this.dirty && executionContext.pc.nextStrategy.length) {
//
//         let nextExecutionContext = new FunctionExecContext(this.findStrategy(executionContext.pc.nextStrategy));
//         this.dirty = true;
//         this.executionStack.push(executionContext);
//         this.executionStack.push(nextExecutionContext);
//
//         this.updateWizard(wizardDiv);
//         return {
//             currentStatement: nextExecutionContext.pc,
//             currentStrategy: nextExecutionContext.strategy,
//             executionStack: this.executionStack,
//         };
//     } else {
//         this.dirty = false;
//         let nextStatement = executionContext.getNextStatement(lineNum);
//         if(nextStatement.successor==undefined || nextStatement.successor=="undefined")
//         {
//             this.dirty = true;
//             executionContext = this.executionStack.pop();
//             if(executionContext === undefined)
//                 return null;
//             nextStatement= executionContext.getNextStatement(executionContext.pc.lineNum);
//         }
//         this.executionStack.push(executionContext);
//         this.updateWizard(wizardDiv);
//         return {
//             currentStatement: nextStatement,
//             currentStrategy: executionContext.strategy,
//             executionStack: this.executionStack,
//         };
//     }
// }

module.exports = {
    Interpreter: Interpreter
};