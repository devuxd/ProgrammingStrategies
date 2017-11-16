'use strict';

var clone = require('clone');

class Interpreter {

    constructor(strategies) {
        this.executionStack = [];
        this.historyBackward = [];
        this.strategies = strategies;
    }

    init(currentStrategy) {

        let initExecutionContext = new FunctionExecContext(currentStrategy.name, this.strategies);
        //initExecutionContext.activeLines[0] = initExecutionContext.strategy.text;
        this.executionStack.push(initExecutionContext);

        return {
            executionStack: this.executionStack,
            activeLines : initExecutionContext.activeLines,
            currentStrategy:initExecutionContext.strategy
        }
    }
    reset(){
        let wizardDiv = document.getElementById("wizard");
        this.historyBackward.splice(0,this.historyBackward.length);
        this.executionStack.splice(0,this.executionStack.length);
        this.updateWizard(wizardDiv);
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
        if(currentStatementText == undefined )//&& currentExecutionContext.blocks.length != 0
        {

            currentExecutionContext= currentExecutionContext.getNextStatement(currentExecutionContext.pc);
        }
        else{
            currentExecutionContext.activeLines=[];
            currentExecutionContext.currentStatement = this.findStatementByText(currentExecutionContext.strategy,currentStatementText);
            currentExecutionContext.activeLines.push(currentExecutionContext.currentStatement.text);
            currentExecutionContext.pc = currentExecutionContext.currentStatement;
        }
        if(currentExecutionContext.pc.type =="if")
            currentExecutionContext.selectionNeeded = true;
        else
            currentExecutionContext.selectionNeeded = false;

        this.executionStack.push((currentExecutionContext));
        return {
            currentStatement: currentExecutionContext.pc,
            currentStrategy: currentExecutionContext.strategy,
            executionStack: this.executionStack,
            activeLines :currentExecutionContext.activeLines,
            selectionNeeded : currentExecutionContext.selectionNeeded,
            variables:currentExecutionContext.variables,
        };
    }
    refreshStatement(isTrue){
        if(!isTrue){
            let currentExecObj = clone(this.executionStack.pop());
            currentExecObj.selectionNeeded= false;
            this.executionStack.push(currentExecObj);
            currentExecObj = currentExecObj.blocks[0].shift();
            return this.execute(currentExecObj.text);
        }
        else if (isTrue)
        {
            let currentExecObj = clone(this.executionStack.pop());
            currentExecObj.blocks[0].unshift(currentExecObj.pc.statements);
            this.executionStack.push(currentExecObj);
            currentExecObj = currentExecObj.blocks[0].shift();
            return this.execute(currentExecObj.text);
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
        let tempExecObj = this.executionStack[this.executionStack.length - 1];
        let stack = this.historyBackward.pop();

        if(stack === undefined)
            return null;
        this.executionStack = stack;
        console.log(this.executionStack[this.executionStack.length - 1].blocks[0]);
        if(this.executionStack[0].blocks.length===0)
            this.executionStack[this.executionStack.length - 1].blocks.push(tempExecObj.prevTemp);
        else
            this.executionStack[this.executionStack.length - 1].blocks[0].unshift(tempExecObj.prevTemp);
        let currentExecutionContext = this.executionStack[this.executionStack.length - 1];
        // let wizardDiv = document.getElementById("wizard");
        // if(executionContext.strategy.displayName != wizardDiv.lastElementChild.lastChild.data)
        //     this.updateWizard(wizardDiv)
        if(currentExecutionContext.pc.type =="if" )
            currentExecutionContext.selectionNeeded = true;
        else
            currentExecutionContext.selectionNeeded = false;
        return {
            currentStatement:  currentExecutionContext.pc,
            currentStrategy: currentExecutionContext.strategy,
            executionStack: this.executionStack,
            activeLines: currentExecutionContext.activeLines,
            selectionNeeded : currentExecutionContext.selectionNeeded,
            variables:currentExecutionContext.variables,
        };
    }
}


class FunctionExecContext {
    constructor(currentStrategy, strategies) {
        this.strategies = strategies;
        this.strategy = this.findStrategy(currentStrategy);
        this.pc = this.strategy;
        this.activeLines = [];
        this.activeLines.push(this.strategy.text);
        this.blocks = [];
        this.blocks.unshift(clone(this.strategy.statements));
        this.variables=[];
        this.selectionNeeded= false;
        this.prevTemp=this.strategy;
    }
    findStrategy(strategyname) {
        return this.strategies.find(function(strategy) {
            return strategy.name === strategyname;
        })
    }

    getNextStatement(currentStatement) {
        this.prevTemp = currentStatement;
        this.activeLines=[];
        //||currentStatement.type == "foreach" || currentStatement.type == "until"
        if (currentStatement.type == "strategy" ){
            // this.blocks.unshift(clone(currentStatement.statements));
            this.pc = this.blocks[0].shift();
            this.activeLines.push(this.pc.text);
        }
        else if(currentStatement.type == "if"  ) {
            if(currentStatement.statements !== undefined && currentStatement.statements.length>0)
                for(var i=currentStatement.statements.length-1; i>=0; i--){
                    this.blocks[0].unshift(clone(currentStatement.statements[i]));
                }
            this.pc = this.blocks[0].shift();
            this.activeLines.push(this.pc.text);

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
        else if(currentStatement.type =="foreach"){
            if(currentStatement.statements !== undefined && currentStatement.statements.length>0)
                for(var i=currentStatement.statements.length-1; i>=0; i--){
                    this.blocks[0].unshift(clone(currentStatement.statements[i]));
                }

            this.pc = this.blocks[0].shift();
            this.activeLines.push(this.pc.text);
        }
        else{
            if(currentStatement.statements !== undefined)
                this.blocks[0].unshift(clone(currentStatement.statements[0]));
            this.pc = this.blocks[0].shift();
            this.activeLines.push(this.pc.text)
        }
        if(this.pc.identifier !== undefined)
            this.variables.push({"name" :this.pc.identifier , "val":null});

        return this;
    }
}

module.exports = {
    Interpreter: Interpreter
};