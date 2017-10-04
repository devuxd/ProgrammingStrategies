(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){


var config = {
    apiKey: "AIzaSyAXjL6f739BVqLDknymCN2H36-NBDS8LvY",
    authDomain: "strategytracker.firebaseapp.com",
    databaseURL: "https://strategytracker.firebaseio.com",
    projectId: "strategytracker",
    storageBucket: "strategytracker.appspot.com",
    messagingSenderId: "261249836518"
};
firebase.initializeApp(config);

},{}],2:[function(require,module,exports){
const models = require('./models.js');
const db = require('./dataManagement.js');
var dbstrategies = require('./strategies').strategies;

if (typeof window !== 'undefined' && window.angular) {
    let myapp = angular.module('myapp', []);
    for (var i = 0; i < dbstrategies.length; i++) {
        var key = firebase.database().ref().child('strategies').push(dbstrategies[i]);
    }
    // $q is a default service by angular to handle Asynchronous in order not to block threads
    myapp.factory('StrategyService', function ($q) {
        let strategies = [];
        let deferred = $q.defer();
        firebase.database().ref('strategies').once('value').then(function (snapshot) {
            snapshot.forEach(function (childStrategy) {
                strategies.push(childStrategy.val());
            });
            deferred.resolve(strategies);
        }).catch(function (err) {
            deferred.reject(err);
        });

        return {
            getAll: function () {
                return deferred.promise;
            }
        };
    });

    myapp.controller('MainCtrl', function ($scope, StrategyService) {
        "use strict";

        $scope.accordion = {
            current: null
        };
        let myStrat = StrategyService.getAll();

        //Asynchronous : If the records are ready from deffered.promise, then the following steps is run.
        myStrat.then(function (strategies) {
            $scope.allStrategies = strategies;
            $scope.strategies = strategies[1].subStrategies;
            $scope.selectedStrategy = strategies[1];
            console.log($scope.selectedStrategy.name);

            $scope.allVariables = $scope.selectedStrategy.allVariables;

            // create interpreter object from model
            //console.log(strategies);
            let interpreter = new models.Interpreter($scope.selectedStrategy.subStrategies);
            // initialize the application
            let execObj = interpreter.init($scope.selectedStrategy.subStrategies[0].name);
            $scope.strategy = execObj.currentStrategy;
            $scope.currentStatement = execObj.currentStatement;
            $scope.statements = $scope.strategy.statements;

            $scope.reset = function () {
                execObj = interpreter.reset();
                interpreter = new models.Interpreter(strategies);
                execObj = interpreter.init("localizeFailure");
                $scope.strategy = execObj.currentStrategy;
                $scope.currentStatement = execObj.currentStatement;
                $scope.statements = $scope.strategy.statements;
                angular.forEach($scope.allVariables, function (val, key) {
                    val.val = null;
                });
            };

            $scope.nextStatement = function () {
                execObj = interpreter.execute();
                if (execObj === null) return;
                if ($scope.strategy.name !== execObj.currentStrategy.name) {
                    $('#' + execObj.currentStrategy.name).collapse('show');
                    $('#' + $scope.strategy.name).collapse('hide');
                    $scope.strategy = execObj.currentStrategy;
                    $scope.statements = $scope.strategy.statements;
                    //$('#' +$scope.strategy.name).collapse('show');
                }

                $scope.currentStatement = execObj.currentStatement;
            };

            $scope.prevStatement = function () {
                execObj = interpreter.goBack();
                if (execObj === null) return;
                if ($scope.strategy.name !== execObj.currentStrategy.name) {
                    $('#' + execObj.currentStrategy.name).collapse('show');
                    $('#' + $scope.strategy.name).collapse('hide');
                    $scope.strategy = execObj.currentStrategy;
                    $scope.statements = $scope.strategy.statements;
                }
                $scope.currentStatement = execObj.currentStatement;
            };

            $scope.chooseNextStatement = function ($event) {
                let currentTarget = $event.currentTarget.innerHTML;
                if ($scope.currentStatement.activeLines.length > 1) {
                    // (currentTarget.includes("if") || currentTarget.includes("else") || currentTarget.includes("while") || currentTarget.includes("return"))
                    let lineNum = parseInt($event.currentTarget.id);
                    execObj = interpreter.execute(lineNum + 1);
                    if (execObj === null) return;
                    if ($scope.strategy.name !== execObj.currentStrategy.name) {
                        $scope.strategy = execObj.currentStrategy;
                        $scope.statements = $scope.strategy.statements;
                    }
                    $scope.currentStatement = execObj.currentStatement;
                }
            };
        });
    });
}

},{"./dataManagement.js":1,"./models.js":3,"./strategies":4}],3:[function(require,module,exports){
'use strict';

var clone = require('clone');

class Interpreter {

    constructor(strategies) {
        this.executionStack = [];
        this.historyBackward = [];
        this.strategies = strategies;
        this.dirty = false;
    }

    init(name) {
        let initExecutionContext = new FunctionExecContext(this.findStrategy(name));
        this.executionStack.push(initExecutionContext);
        return {
            currentStatement: initExecutionContext.pc,
            currentStrategy: initExecutionContext.strategy,
            executionStack: this.executionStack
        };
    }
    reset() {
        let wizardDiv = document.getElementById("wizard");
        this.historyBackward.splice(0, this.historyBackward.length);
        this.executionStack.splice(0, this.executionStack.length);
        this.updateWizard(wizardDiv);
        this.dirty = false;
    }

    findStrategy(strategyname) {

        return this.strategies.find(function (strategy) {

            return strategy.name === strategyname;
        });
    }

    execute(lineNum) {
        let wizardDiv = document.getElementById("wizard");

        if (this.executionStack.length) {
            this.historyBackward.push(clone(this.executionStack)); // take a snapshot from our current executionStack to our history
        }
        let executionContext = this.executionStack.pop();
        if (executionContext === undefined) return null;
        if (!this.dirty && executionContext.pc.nextStrategy.length) {

            let nextExecutionContext = new FunctionExecContext(this.findStrategy(executionContext.pc.nextStrategy));
            this.dirty = true;
            this.executionStack.push(executionContext);
            this.executionStack.push(nextExecutionContext);

            this.updateWizard(wizardDiv);
            return {
                currentStatement: nextExecutionContext.pc,
                currentStrategy: nextExecutionContext.strategy,
                executionStack: this.executionStack
            };
        } else {
            this.dirty = false;
            let nextStatement = executionContext.getNextStatement(lineNum);
            if (nextStatement.successor == undefined || nextStatement.successor == "undefined") {
                this.dirty = true;
                executionContext = this.executionStack.pop();
                if (executionContext === undefined) return null;
                nextStatement = executionContext.getNextStatement(executionContext.pc.lineNum);
            }
            this.executionStack.push(executionContext);
            this.updateWizard(wizardDiv);
            return {
                currentStatement: nextStatement,
                currentStrategy: executionContext.strategy,
                executionStack: this.executionStack
            };
        }
    }
    updateWizard(wizardDiv) {
        while (wizardDiv.firstChild) {
            wizardDiv.removeChild(wizardDiv.firstChild);
        }
        for (var i = 0; i < this.executionStack.length; i++) {
            var innerDiv = document.createElement('div');
            innerDiv.className = 'wizard-block well';
            innerDiv.append(this.executionStack[i].strategy.displayName);
            wizardDiv.appendChild(innerDiv);
        }
    }

    goBack() {
        let stack = this.historyBackward.pop();
        if (stack === undefined) return null;
        this.executionStack = stack;
        let executionContext = this.executionStack[this.executionStack.length - 1];
        let wizardDiv = document.getElementById("wizard");
        if (executionContext.strategy.displayName != wizardDiv.lastElementChild.lastChild.data) this.updateWizard(wizardDiv);

        return {
            currentStatement: executionContext.pc,
            currentStrategy: executionContext.strategy,
            executionStack: this.executionStack
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
        if (lineNum !== undefined) {
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

},{"clone":7}],4:[function(require,module,exports){
'use strict';

let strategies = [{
    owner: "Thomas LaToza",
    name: "ModelFaultLocalication",
    displayName: "Model Fault Localization",
    processDescription: "The core idea of model fault localization is to explore permutations of interactions with the system to understand how the interaction needs to happen differently to\n" + "            remove the failure. For example, you might a config file to initialize a\n" + "            library (configuration paramters), a code snippet making three calls (code),\n" + "            and the external library it uses (the system). Model fault localization separately considers two separate causes of failure.",

    strategyDescription: "In the following tool, you can follow the Model Fault Localization strategy steps by clicking the buttons \"next\" and \"previous\".</br>\n" + "            In the description panel, there is more details about each steps.</br>\n" + "            The variables panel shows all the variables in the strategy. You can assign specific values and keep track of them during the execution of the strategy steps.</br>\n" + "            Every time you need to come back to the first step, just reset the strategy.",
    aalVariables: [{ name: 'code', val: null }, { name: 'referenceCode', val: null }, { name: 'failure', val: null }, { name: 'system', val: null }],
    subStrategies: [{
        name: "modelFaultLocalization",
        displayName: "Model Fault Localization",
        statements: [{
            lineNum: 0,
            text: "Strategy modelFaultLocalization(code, failure, system) {",
            successor: 1,
            description: "Model fault localization takes code, a failure that the code generates, and a system with which the code interacts. " + "After finding referenceCode, the strategy tests if failure is still witnessed this different (and assumed correct) code. " + "If it is, then a cause of the failure lies in the configuration. " + "If not, the fault can then be localized by systematically comparing referenceCode to code.",
            class: '',
            variables: ["code", "system", "failure"],
            nextStrategy: "",
            activeLines: [0]
        }, {
            lineNum: 1,
            text: "referenceCode = findReferenceCode(system);",
            successor: 2,
            description: "Find some reference code that interacts with the system that you know must be correct code.This code might be given by the system authors in an official tutorial or might be code found from a third party.",
            class: "margin-1",
            variables: ["system", "referenceCode"],
            nextStrategy: "",
            activeLines: [1]
        }, {
            lineNum: 2,
            text: "execute(referenceCode, system);",
            successor: 3,
            description: "Try to execute the code you have found from Github or Stackoverflow and check if it fixes the failure ",
            class: "margin-1",
            variables: ["referenceCode", "system"],
            nextStrategy: "",
            activeLines: [2]
        }, {
            lineNum: 3,
            text: "if (execution of referenceCode throws failure) {",
            successor: 4,
            description: "If executing the referenceCode causes Failure, click the if statement. Otherwise click the else statement ",
            class: "margin-1",
            variables: ["referenceCode", "system"],
            nextStrategy: "",
            activeLines: [3, 5]
        }, {
            lineNum: 4,
            text: " configurationDebugging(code, failure, system); ",
            successor: 8,
            description: "Continue with strategy configurationDebugging by clicking next button ",
            class: "margin-2",
            variables: ["code", "failure", "system"],
            nextStrategy: "configurationDebugging",
            activeLines: [4]
        }, {
            lineNum: 5,
            text: "} else {",
            successor: 6,
            description: "",
            class: "margin-1",
            nextStrategy: "",
            activeLines: [5, 3]
        }, {
            lineNum: 6,
            text: "deltaDebugging(code, referenceCode, failure); ",
            successor: 7,
            description: "Continue with deltaDebugging strategy by clicking next button",
            class: "margin-2",
            variables: ["code", "referenceCode", "failure"],
            nextStrategy: "deltaDebugging",
            activeLines: [6]
        }, {
            lineNum: 7,
            text: "}",
            successor: 8,
            description: "",
            class: "margin-1",
            nextStrategy: "",
            activeLines: [7]
        }, {
            lineNum: 8,
            text: "}",
            successor: 9,
            description: "",
            class: "",
            nextStrategy: "",
            activeLines: [8]
        }, {
            lineNum: 9,
            text: "",
            successor: "undefined",
            description: "",
            class: "",
            nextStrategy: "",
            activeLines: [9]
        }]
    }, {
        name: "configurationDebugging",
        displayName: "Configuration Debugging",
        statements: [{
            lineNum: 0,
            text: "Strategy configurationDebugging(code, failure, system){",
            successor: 1,
            description: 'Systematically enumerate and individually vary all possible configuration parameters to find a correct configuration.',
            class: "",
            variables: ["code", "failure", "system"],
            nextStrategy: "",
            activeLines: [0]
        }, {
            lineNum: 1,
            text: "configurationParameters = enumerateConfigParameters(code);",
            successor: 2,
            description: 'Use strategy enumerateConfigParameters to collect configurationParameters ',
            class: "margin-1",
            variables: ["code"],
            nextStrategy: "",
            activeLines: [1]
        }, {
            lineNum: 2,
            text: "enumerateConfigParameters(system);",
            successor: 3,
            description: "Continue with strategy enumerateConfigParameters by clicking next button",
            class: "margin-1",
            variables: ["system"],
            nextStrategy: "enumerateConfigParameters",
            activeLines: [2]
        }, {
            lineNum: 3,
            text: "for (param in configurationParameters) {",
            successor: 4,
            description: " for each parameter that you have added to the list of configurationParams",
            class: "margin-1",
            nextStrategy: "",
            activeLines: [3]
        }, {
            lineNum: 4,
            text: "system.changeConfigurationParameter();",
            successor: 5,
            description: " change the config params and execute the code",
            class: "margin-2",
            nextStrategy: "",
            activeLines: [4]
        }, {
            lineNum: 5,
            text: " newExecution = execute(code, system); ",
            successor: 6,
            description: "for the changed parameters, execute the code and see if the failure get fixed or not",
            class: "margin-2",
            variables: ["code", "system"],
            nextStrategy: "",
            activeLines: [5]
        }, {
            lineNum: 6,
            text: " if(newExecution throws failure) {",
            successor: 7,
            description: "if the changed parameters do not have any effect in fixing the failure and you still have the failure,",
            class: "margin-2",
            variables: ["code", "system"],
            nextStrategy: "",
            activeLines: [6, 9]
        }, {
            lineNum: 7,
            text: "system.revertConfigurationParameter();",
            successor: 8,
            description: " revert changes",
            class: "margin-3",
            nextStrategy: "",
            activeLines: [7]
        }, {
            lineNum: 8,
            text: "continue;",
            successor: 11,
            description: "continue with next param",
            class: "margin-3",
            nextStrategy: "",
            activeLines: [8]
        }, {
            lineNum: 9,
            text: "} else {",
            successor: 10,
            description: "If no failure occurred, you succeeded to fix the problem.",
            class: "margin-2",
            nextStrategy: "",
            activeLines: [9, 6]
        }, {
            lineNum: 10,
            text: "return SUCCESS;",
            successor: 11,
            description: " Congrats, you fixed the failure.",
            class: "margin-3",
            nextStrategy: "",
            activeLines: [10]
        }, {
            lineNum: 11,
            text: "}",
            successor: 12,
            description: "",
            class: "margin-2",
            nextStrategy: "",
            activeLines: [11]
        }, {
            lineNum: 12,
            text: "}",
            successor: 13,
            description: "",
            class: "margin-1",
            nextStrategy: "",
            activeLines: [12]
        }, {
            lineNum: 13,
            text: "",
            successor: "undefined",
            description: "",
            class: "margin-1",
            nextStrategy: "",
            activeLines: [13]
        }]
    }, {
        name: "enumerateConfigParameters",
        displayName: "Enumerate Configuration Parameters",
        statements: [{
            lineNum: 0,
            text: "Strategy enumerateConfigParameters(system){",
            successor: 1,
            description: 'Brainstorm a list of all configuration parameters you might be able to vary.' + 'A configuration paramater here refers to some aspect of how the code is being executed that might be changed.' + 'This does NOT refer to changes to the code itself. Rather, it refers to changes to everything else that influences HOW the code is executed.' + 'This might include the development environment that runs the code, the version of the system that is being used, the operating system on which the code is being executed, the runtime engine being used to execute the code, ' + 'the configuration files that are being used to initialize the system.',
            class: "",
            nextStrategy: "",
            activeLines: [0]
        }, {
            lineNum: 1,
            text: "configurationParameters = {};",
            successor: 2,
            description: "Make an empty list of parameters",
            class: "margin-1",
            nextStrategy: "",
            activeLines: [1]
        }, {
            lineNum: 2,
            text: "while (moreIdeas) {",
            successor: 3,
            description: "",
            class: "margin-1",
            nextStrategy: "",
            activeLines: [2, 4]

        }, {
            lineNum: 3,
            text: "configuratinoParameters.add(brainstormConfigParameters());",
            successor: 2,
            description: "Add as much parameters as you can add including:" + "the development environment that runs the code," + "the version of the system that is being used," + "the operating system on which the code is being executed, " + "the runtime engine being used to execute the code, " + "the configuration files that are being used to initialize the system ",
            class: "margin-2",
            nextStrategy: "",
            activeLines: [3],
            loop: true
        }, {
            lineNum: 4,
            text: "if(no more ideas) return configurationParameters;",
            successor: 5,
            description: "go back to the strategy : configurationDebugging with the list of parameters to continue.",
            class: "margin-1",
            nextStrategy: "",
            activeLines: [4, 2]
        }, {
            lineNum: 5,
            text: "}",
            successor: 6,
            description: "",
            class: "",
            nextStrategy: "",
            activeLines: [5]
        }, {
            lineNum: 6,
            text: "",
            successor: "undefined",
            description: "",
            class: "",
            nextStrategy: "",
            activeLines: [6]
        }]
    }, {
        name: "deltaDebugging",
        displayName: "Delta Debugging",
        statements: [{
            lineNum: 0,
            text: "Strategy deltaDebugging(code, referenceCode, failure){",
            successor: 1,
            description: "Find the changes from referenceCode to code that cause failure, minimizing the cause of failure to a minimal code edit.",
            class: "",
            nextStrategy: "",
            activeLines: [0]
        }, {
            lineNum: 1,
            text: "referenceCode.oneEditToLookLike(code);",
            successor: 2,
            description: "",
            class: "margin-1",
            nextStrategy: "",
            activeLines: [1]
        }, {
            lineNum: 2,
            text: "execute(referenceCode, system)",
            successor: 3,
            description: "Execute the changed code to see if it fails or succeeds",
            class: "margin-1",
            nextStrategy: "",
            activeLines: [2]
        }, {
            lineNum: 3,
            text: "if (! (execute(referenceCode, system) throws failure)) {",
            successor: 4,
            description: "If the execution of new code does not throw failure",
            class: "margin-1",
            nextStrategy: "",
            activeLines: [3, 5]
        }, {
            lineNum: 4,
            text: "return SUCCESS; ",
            successor: 10,
            description: "Congrats! you succeed to fix the problem",
            class: "margin-2",
            nextStrategy: "",
            activeLines: [4]
        }, {
            lineNum: 5,
            text: "} else {",
            successor: 6,
            description: "If the execution of new code throws failure ",
            class: "margin-1",
            nextStrategy: "",
            activeLines: [5, 3]
        }, {
            lineNum: 6,
            text: "revert(referenceCode);",
            successor: 7,
            description: "Revert the changes you have applied",
            class: "margin-2",
            nextStrategy: "",
            activeLines: [6]
        }, {
            lineNum: 7,
            text: "referenceCode.oneEditToLookLike(code);",
            successor: 8,
            description: "",
            class: "margin-2",
            nextStrategy: "",
            activeLines: [7]
        }, {
            lineNum: 8,
            text: "}",
            successor: 9,
            description: "",
            class: "margin-1",
            nextStrategy: "",
            activeLines: [8]
        }, {
            lineNum: 9,
            text: "}",
            successor: 10,
            description: "",
            class: "",
            nextStrategy: "",
            activeLines: [9]
        }, {
            lineNum: 10,
            text: "",
            successor: "undefined",
            description: "",
            class: "",
            nextStrategy: "",
            activeLines: [10]
        }]
    }]
}, {
    owner: "Andy Co",
    name: "localizeFailure",
    displayName: "Fault localization",
    processDescription: "When we say “debug”, we are usually referring to many different activities, including reproducing a failure, localizing the root causes of a failure," + " and patching an implementation to prevent those causes. There are many strategies for each of these activities. Below is a strategy for the fault localization part of debugging.",
    strategyDescription: "Below is a algorithm you can follow manually. If you follow it reliably, it should result in successful localization of a defect. Since it’s something a person " + "executes, I’ve written the strategy in a loosely formal pseudocode. While you execute the strategy, keep track of any variables you need to track in a text editor or paper," + " and keep track of which step and function you’re on, just like a computer does when it executes a program.",
    allVariables: [{ name: 'failure', val: null }, { name: 'value', val: null }, { name: 'L', val: null }, { name: 'V', val: null }],
    subStrategies: [{
        name: "localizeFailure",
        displayName: "Fault Localization",
        statements: [{
            lineNum: 0,
            text: "Strategy localizeFailure(failure){",
            successor: 1,
            description: "Reproduce the failure by finding a sequence of inputs that produces the failure reliably.",
            class: '',
            variables: ["failure"],
            nextStrategy: "",
            activeLines: [0]
        }, {
            lineNum: 1,
            text: "Reproduce the failure",
            successor: 2,
            description: "Reproduce the failure by finding a sequence of inputs that produces the failure reliably.",
            class: "margin-1",
            variables: ["failure"],
            nextStrategy: "",
            activeLines: [1]
        }, {
            lineNum: 2,
            text: " Write down the inputs for later reference.",
            successor: 3,
            description: "To the extent that you can, write down the inputs for later reference.",
            class: "margin-1",
            variables: ["failure"],
            nextStrategy: "",
            activeLines: [2]
        }, {
            lineNum: 3,
            text: "Reproduce the failure by finding a sequence of inputs that produces the failure reliably.",
            successor: 4,
            description: "",
            class: "margin-1",
            variables: ["failure"],
            nextStrategy: "",
            activeLines: [3]
        }, {
            lineNum: 4,
            text: "If the failure is output that shouldn’t have occurred{",
            successor: 5,
            description: "",
            class: "margin-1",
            variables: ["failure"],
            nextStrategy: "",
            activeLines: [4, 6]
        }, {
            lineNum: 5,
            text: "localizeWrongOutput(failure)",
            successor: 9,
            description: "",
            class: "margin-2",
            variables: ["failure"],
            nextStrategy: "localizeWrongOutput",
            activeLines: [5]
        }, {
            lineNum: 6,
            text: "} else {",
            successor: 7,
            description: " if the failure is output that should have occurred, but didn’t",
            class: "margin-1",
            variables: ["failure"],
            nextStrategy: "",
            activeLines: [6, 4]
        }, {
            lineNum: 7,
            text: "localizeMissingOutput",
            successor: 9,
            description: "",
            class: "margin-2",
            variables: ["failure"],
            nextStrategy: "localizeMissingOutput",
            activeLines: [7]
        }, {
            lineNum: 8,
            text: "}",
            successor: 9,
            description: "",
            class: "margin-1",
            variables: ["failure"],
            nextStrategy: "localizeMissingOutput",
            activeLines: [8]
        }, {
            lineNum: 9,
            text: "}",
            successor: 10,
            description: "",
            class: "",
            variables: ["failure"],
            nextStrategy: "localizeMissingOutput",
            activeLines: [9]
        }, {
            lineNum: 10,
            text: "",
            successor: "undefined",
            description: "",
            class: "",
            nextStrategy: "",
            activeLines: [10]
        }]
    }, {
        name: "localizeWrongOutput",
        displayName: "Localize Wrong Output",
        statements: [{
            lineNum: 0,
            text: "Strategy localizeWrongOutput(failure){ ",
            successor: 1,
            description: "",
            class: "",
            variables: ["failure"],
            nextStrategy: "",
            activeLines: [0]
        }, {
            lineNum: 1,
            text: "Find the line of code L that produced the incorrect output",
            successor: 2,
            description: " Find the line of code L in the application that most directly produced the incorrect output. For example, if it was console output, it’s a print statement; if it’s user interface output, it’s whatever component was responsible for rendering the output. If you don’t know how to find this line, one strategy is to find a unique feature in the output such as a string constant and do a global search in the code for that string.",
            class: "margin-1",
            variables: ["failure"],
            nextStrategy: "",
            activeLines: [1, 16]
        }, {
            lineNum: 2,
            text: "Execute the program to line L",
            successor: 3,
            description: "Execute the program to line L (using a breakpoint or a time-travel debugger).",
            class: "margin-1",
            variables: ["failure"],
            nextStrategy: "",
            activeLines: [2]
        }, {
            lineNum: 3,
            text: "Reproduce failure. ",
            successor: 4,
            description: "",
            class: "margin-1",
            variables: ["failure"],
            nextStrategy: "",
            activeLines: [3]
        }, {
            lineNum: 4,
            text: " If the program does not execute L{",
            successor: 5,
            description: "",
            class: "margin-1",
            variables: ["failure"],
            nextStrategy: "",
            activeLines: [4, 6]
        }, {
            lineNum: 5,
            text: "return to step 1 and find an alternate L that does produce the failure}",
            successor: 0,
            description: "",
            class: "margin-2",
            variables: ["failure"],
            nextStrategy: "",
            activeLines: [5]
        }, {
            lineNum: 6,
            text: "}else{",
            successor: 7,
            description: "",
            class: "margin-1",
            variables: ["failure"],
            nextStrategy: "",
            activeLines: [6, 4]
        }, {
            lineNum: 7,
            text: "Values= Inspect the state of all values that resulted in L being reached",
            successor: 8,
            description: "With the program halted on L, inspect the state of all values in memory and all values V of local variables in the call stack that resulted in L being reached. " + "This includes all variables that were referenced in conditional statements that resulted in L being executed.",
            class: "margin-2",
            variables: ["failure"],
            nextStrategy: "",
            activeLines: [7]
        }, {
            lineNum: 8,
            text: "For each of these values V{",
            successor: 9,
            description: "",
            class: "margin-2",
            variables: ["failure"],
            nextStrategy: "",
            activeLines: [8]
        }, {
            lineNum: 9,
            text: "If V correct in this context{",
            successor: 10,
            description: "",
            class: "margin-2",
            variables: ["failure"],
            nextStrategy: "",
            activeLines: [9, 11, 14]
        }, {
            lineNum: 10,
            text: "move on to the next V",
            successor: 9,
            description: "",
            class: "margin-3",
            variables: ["failure"],
            nextStrategy: "",
            activeLines: [10]
        }, {
            lineNum: 11,
            text: "} else {",
            successor: 12,
            description: "",
            class: "margin-2",
            variables: ["failure"],
            nextStrategy: "",
            activeLines: [11, 9, 14]
        }, {
            lineNum: 12,
            text: "return localizeWrongValue",
            successor: 20,
            description: "",
            class: "margin-3",
            variables: ["failure"],
            nextStrategy: "localizeWrongValue",
            activeLines: [12]
        }, {
            lineNum: 13,
            text: "}",
            successor: 14,
            description: "",
            class: "margin-2",
            variables: ["failure"],
            nextStrategy: "",
            activeLines: [13]
        }, {
            lineNum: 14,
            text: "If none of V is wrong {",
            successor: 15,
            description: "If none of the values were wrong, then one of the inputs to the program was not handled correctly. Identify which input was unexpected and devise a way to handle it correctly.",
            class: "margin-2",
            variables: ["failure"],
            nextStrategy: "",
            activeLines: [14, 9, 11]
        }, {
            lineNum: 15,
            text: "One of the inputs was not handled correctly",
            successor: 20,
            description: "",
            class: "margin-3",
            variables: ["failure"],
            nextStrategy: "",
            activeLines: [15]
        }, {
            lineNum: 16,
            text: " If there is no such L",
            successor: 17,
            description: "",
            class: "margin-1",
            variables: ["failure"],
            nextStrategy: "",
            activeLines: [16, 1]
        }, {
            lineNum: 17,
            text: "then something else is creating the problem.",
            successor: 18,
            description: "",
            class: "margin-2",
            variables: ["failure"],
            nextStrategy: "",
            activeLines: [17]
        }, {
            lineNum: 18,
            text: "}",
            successor: 19,
            description: "",
            class: "margin-1",
            variables: ["failure"],
            nextStrategy: "",
            activeLines: [18]
        }, {
            lineNum: 19,
            text: "}",
            successor: 20,
            description: "",
            class: "margin-1",
            variables: ["failure"],
            nextStrategy: "",
            activeLines: [19]
        }, {
            lineNum: 20,
            text: "}",
            successor: 21,
            description: "",
            class: "",
            variables: ["failure"],
            nextStrategy: "",
            activeLines: [20]
        }, {
            lineNum: 21,
            text: "",
            successor: "undefined",
            description: "",
            class: "",
            nextStrategy: "",
            activeLines: [21]
        }]
    }, {
        name: "localizeWrongValue",
        displayName: "Localize Wrong Value",
        statements: [{
            lineNum: 0,
            text: "Strategy localizeWrongValue(failure,value){ ",
            successor: 1,
            description: "The goal of this strategy is to find where value was computed.",
            class: "",
            variables: ["failure", "value"],
            nextStrategy: "",
            activeLines: [0]
        }, {
            lineNum: 1,
            text: "Find all lines L in the program that can set value",
            successor: 2,
            description: "",
            class: "margin-1",
            variables: ["failure", "value"],
            nextStrategy: "",
            activeLines: [1]
        }, {
            lineNum: 2,
            text: "LastLineFailure : find last execution of a line L that occurred before failure",
            successor: 3,
            description: "Reproduce failure, finding last execution of a line L that occurred before failure (using breakpoints or a time-travel debugger). If your debugger supports reverse execution, this is a matter of stepping backwards. If not, you may have to reproduce failure more than once to find the last execution.",
            class: "margin-1",
            variables: ["failure", "value"],
            nextStrategy: "",
            activeLines: [2]
        }, {
            lineNum: 3,
            text: "if(LastLineFailure :incorrect){ ",
            successor: 4,
            description: "Reflect on the intended behavior of the line and whether, as implemented, it achieves this behavior. If it’s incorrect",
            class: "margin-1",
            variables: ["failure", "value"],
            nextStrategy: "",
            activeLines: [3, 6]
        }, {
            lineNum: 4,
            text: "you have found the bug!",
            successor: 5,
            description: "",
            class: "margin-1",
            variables: ["failure", "value"],
            nextStrategy: "",
            activeLines: [4]
        }, {
            lineNum: 5,
            text: "return L",
            successor: 0,
            description: "",
            class: "margin-2",
            variables: ["failure", "value"],
            nextStrategy: "",
            activeLines: [5]
        }, {
            lineNum: 6,
            text: "} else If(the Line is correct){",
            successor: 7,
            description: "If the line is correct{",
            class: "margin-1",
            variables: ["failure", "value"],
            nextStrategy: "",
            activeLines: [6, 3]
        }, {
            lineNum: 7,
            text: "if( another value (value2) incorrect){",
            successor: 8,
            description: "If the line is correct, is a value value2 used by the last L to execute incorrect? If so, return localizeWrongValue(failure, value2).",
            class: "margin-2",
            variables: ["failure", "value"],
            nextStrategy: "",
            activeLines: [7]
        }, {
            lineNum: 8,
            text: "return localizeWrongValue(failure, value2)",
            successor: 0,
            description: "",
            class: "margin-3",
            variables: ["failure", "value"],
            nextStrategy: "",
            activeLines: [8]
        }, {
            lineNum: 9,
            text: "}",
            successor: 10,
            description: "",
            class: "margin-2",
            variables: ["failure", "value"],
            nextStrategy: "",
            activeLines: [9]
        }, {
            lineNum: 10,
            text: "}",
            successor: 11,
            description: "",
            class: "margin-1",
            variables: ["failure", "value"],
            nextStrategy: "",
            activeLines: [10]
        }, {
            lineNum: 11,
            text: "Failed to find defect!",
            successor: 12,
            description: "",
            class: "margin-1",
            variables: ["failure", "value"],
            nextStrategy: "",
            activeLines: [11, 13, 16]
        }, {
            lineNum: 12,
            text: "}",
            successor: 11,
            description: "",
            class: "",
            variables: ["failure", "value"],
            nextStrategy: "",
            activeLines: 12
        }, {
            lineNum: 13,
            text: "",
            successor: "undefined",
            description: "",
            class: "",
            nextStrategy: "",
            activeLines: [13]
        }]
    }, {
        name: "localizeMissingOutput",
        displayName: "Localize Missing Output",
        statements: [{
            lineNum: 0,
            text: "Strategy localizeMissingOutput(failure){ ",
            successor: 1,
            description: "",
            class: "",
            variables: ["failure"],
            nextStrategy: "",
            activeLines: [0]
        }, {
            lineNum: 1,
            text: "Find the line of code L that would have produced the output you expected.",
            successor: 2,
            description: "",
            class: "margin-1",
            variables: ["failure"],
            nextStrategy: "",
            activeLines: [1]
        }, {
            lineNum: 2,
            text: " Do diagnoseUnexecutedLine(failure, L)",
            successor: 3,
            description: "To the extent that you can, write down the inputs for later reference.",
            class: "margin-1",
            variables: ["failure"],
            nextStrategy: "diagnoseUnexecutedLine",
            activeLines: [2]
        }, {
            lineNum: 3,
            text: "",
            successor: "undefined",
            description: "",
            class: "",
            nextStrategy: "",
            activeLines: [3]
        }]
    }, {
        name: "diagnoseUnexecutedLine",
        displayName: "Diagnose Unexecuted Line",
        statements: [{
            lineNum: 0,
            text: "Strategy diagnoseUnexecutedLine(failure,L){ ",
            successor: 1,
            description: "",
            class: "",
            variables: ["failure", "L"],
            nextStrategy: "",
            activeLines: [0]
        }, {
            lineNum: 1,
            text: "conditions : Find all conditional statements conditions that would have caused line to execute",
            successor: 2,
            description: "These may be an if-statements, switch-statements, or other conditional statements that would have prevented the line from executing.",
            class: "margin-1",
            variables: ["failure", "L"],
            nextStrategy: "",
            activeLines: [1]
        }, {
            lineNum: 2,
            text: "For each (line L in conditions){",
            successor: 3,
            description: "",
            class: "margin-1",
            variables: ["failure", "L"],
            nextStrategy: "",
            activeLines: [2]
        }, {
            lineNum: 3,
            text: "1.Set a breakpoint on line ",
            successor: 4,
            description: "",
            class: "margin-2",
            variables: ["failure", "L"],
            nextStrategy: "",
            activeLines: [3]
        }, {
            lineNum: 4,
            text: "2.Reproduce the failure to see if L executed",
            successor: 5,
            description: "",
            class: "margin-2",
            variables: ["failure", "L"],
            nextStrategy: "",
            activeLines: [4]
        }, {
            lineNum: 5,
            text: "If (L executed correctly){",
            successor: 0,
            description: "",
            class: "margin-2",
            variables: ["failure", "L"],
            nextStrategy: "",
            activeLines: [5, 7]
        }, {
            lineNum: 6,
            text: "continue;",
            successor: 7,
            description: "move on to the next L in conditions",
            class: "margin-3",
            variables: ["failure", "L"],
            nextStrategy: "",
            activeLines: [3, 6]
        }, {
            lineNum: 7,
            text: "}else{",
            successor: 8,
            description: "",
            class: "margin-2",
            variables: ["failure", "L"],
            nextStrategy: "",
            activeLines: [7, 5]
        }, {
            lineNum: 8,
            text: " V : identify the value V that caused it to execute incorrectly",
            successor: 9,
            description: "",
            class: "margin-3",
            variables: ["failure", "L"],
            nextStrategy: "",
            activeLines: [8]
        }, {
            lineNum: 9,
            text: "Return localizeWrongValue(failure, V)",
            successor: 10,
            description: "",
            class: "margin-3",
            variables: ["failure", "value"],
            nextStrategy: "localizeWrongValue",
            activeLines: [9]
        }, {
            lineNum: 10,
            text: "}",
            successor: 11,
            description: "",
            class: "margin-1",
            variables: ["failure", "value"],
            nextStrategy: "",
            activeLines: [10]
        }, {
            lineNum: 11,
            text: "}",
            successor: 12,
            description: "",
            class: "margin-1",
            variables: ["failure", "value"],
            nextStrategy: "",
            activeLines: [11]
        }, {
            lineNum: 12,
            text: "",
            successor: "undefined",
            description: "",
            class: "",
            nextStrategy: "",
            activeLines: [12]
        }]
    }]

}];

// ,{
//         lineNum:,
//         text:"",
//         successor:,
//         description:"",
//         class:'',
//         variables:["failure"],
//         nextStrategy:"",
//         activeLines:
//     }

module.exports.strategies = strategies;

},{}],5:[function(require,module,exports){
'use strict'

exports.byteLength = byteLength
exports.toByteArray = toByteArray
exports.fromByteArray = fromByteArray

var lookup = []
var revLookup = []
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
for (var i = 0, len = code.length; i < len; ++i) {
  lookup[i] = code[i]
  revLookup[code.charCodeAt(i)] = i
}

revLookup['-'.charCodeAt(0)] = 62
revLookup['_'.charCodeAt(0)] = 63

function placeHoldersCount (b64) {
  var len = b64.length
  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // the number of equal signs (place holders)
  // if there are two placeholders, than the two characters before it
  // represent one byte
  // if there is only one, then the three characters before it represent 2 bytes
  // this is just a cheap hack to not do indexOf twice
  return b64[len - 2] === '=' ? 2 : b64[len - 1] === '=' ? 1 : 0
}

function byteLength (b64) {
  // base64 is 4/3 + up to two characters of the original data
  return (b64.length * 3 / 4) - placeHoldersCount(b64)
}

function toByteArray (b64) {
  var i, l, tmp, placeHolders, arr
  var len = b64.length
  placeHolders = placeHoldersCount(b64)

  arr = new Arr((len * 3 / 4) - placeHolders)

  // if there are placeholders, only get up to the last complete 4 chars
  l = placeHolders > 0 ? len - 4 : len

  var L = 0

  for (i = 0; i < l; i += 4) {
    tmp = (revLookup[b64.charCodeAt(i)] << 18) | (revLookup[b64.charCodeAt(i + 1)] << 12) | (revLookup[b64.charCodeAt(i + 2)] << 6) | revLookup[b64.charCodeAt(i + 3)]
    arr[L++] = (tmp >> 16) & 0xFF
    arr[L++] = (tmp >> 8) & 0xFF
    arr[L++] = tmp & 0xFF
  }

  if (placeHolders === 2) {
    tmp = (revLookup[b64.charCodeAt(i)] << 2) | (revLookup[b64.charCodeAt(i + 1)] >> 4)
    arr[L++] = tmp & 0xFF
  } else if (placeHolders === 1) {
    tmp = (revLookup[b64.charCodeAt(i)] << 10) | (revLookup[b64.charCodeAt(i + 1)] << 4) | (revLookup[b64.charCodeAt(i + 2)] >> 2)
    arr[L++] = (tmp >> 8) & 0xFF
    arr[L++] = tmp & 0xFF
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] + lookup[num >> 12 & 0x3F] + lookup[num >> 6 & 0x3F] + lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp
  var output = []
  for (var i = start; i < end; i += 3) {
    tmp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2])
    output.push(tripletToBase64(tmp))
  }
  return output.join('')
}

function fromByteArray (uint8) {
  var tmp
  var len = uint8.length
  var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
  var output = ''
  var parts = []
  var maxChunkLength = 16383 // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)))
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1]
    output += lookup[tmp >> 2]
    output += lookup[(tmp << 4) & 0x3F]
    output += '=='
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + (uint8[len - 1])
    output += lookup[tmp >> 10]
    output += lookup[(tmp >> 4) & 0x3F]
    output += lookup[(tmp << 2) & 0x3F]
    output += '='
  }

  parts.push(output)

  return parts.join('')
}

},{}],6:[function(require,module,exports){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

'use strict'

var base64 = require('base64-js')
var ieee754 = require('ieee754')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50

var K_MAX_LENGTH = 0x7fffffff
exports.kMaxLength = K_MAX_LENGTH

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Print warning and recommend using `buffer` v4.x which has an Object
 *               implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * We report that the browser does not support typed arrays if the are not subclassable
 * using __proto__. Firefox 4-29 lacks support for adding new properties to `Uint8Array`
 * (See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438). IE 10 lacks support
 * for __proto__ and has a buggy typed array implementation.
 */
Buffer.TYPED_ARRAY_SUPPORT = typedArraySupport()

if (!Buffer.TYPED_ARRAY_SUPPORT && typeof console !== 'undefined' &&
    typeof console.error === 'function') {
  console.error(
    'This browser lacks typed array (Uint8Array) support which is required by ' +
    '`buffer` v5.x. Use `buffer` v4.x if you require old browser support.'
  )
}

function typedArraySupport () {
  // Can typed array instances can be augmented?
  try {
    var arr = new Uint8Array(1)
    arr.__proto__ = {__proto__: Uint8Array.prototype, foo: function () { return 42 }}
    return arr.foo() === 42
  } catch (e) {
    return false
  }
}

function createBuffer (length) {
  if (length > K_MAX_LENGTH) {
    throw new RangeError('Invalid typed array length')
  }
  // Return an augmented `Uint8Array` instance
  var buf = new Uint8Array(length)
  buf.__proto__ = Buffer.prototype
  return buf
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new Error(
        'If encoding is specified then the first argument must be a string'
      )
    }
    return allocUnsafe(arg)
  }
  return from(arg, encodingOrOffset, length)
}

// Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
if (typeof Symbol !== 'undefined' && Symbol.species &&
    Buffer[Symbol.species] === Buffer) {
  Object.defineProperty(Buffer, Symbol.species, {
    value: null,
    configurable: true,
    enumerable: false,
    writable: false
  })
}

Buffer.poolSize = 8192 // not used by this implementation

function from (value, encodingOrOffset, length) {
  if (typeof value === 'number') {
    throw new TypeError('"value" argument must not be a number')
  }

  if (isArrayBuffer(value)) {
    return fromArrayBuffer(value, encodingOrOffset, length)
  }

  if (typeof value === 'string') {
    return fromString(value, encodingOrOffset)
  }

  return fromObject(value)
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(value, encodingOrOffset, length)
}

// Note: Change prototype *after* Buffer.from is defined to workaround Chrome bug:
// https://github.com/feross/buffer/pull/148
Buffer.prototype.__proto__ = Uint8Array.prototype
Buffer.__proto__ = Uint8Array

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be a number')
  } else if (size < 0) {
    throw new RangeError('"size" argument must not be negative')
  }
}

function alloc (size, fill, encoding) {
  assertSize(size)
  if (size <= 0) {
    return createBuffer(size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpretted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(size).fill(fill, encoding)
      : createBuffer(size).fill(fill)
  }
  return createBuffer(size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(size, fill, encoding)
}

function allocUnsafe (size) {
  assertSize(size)
  return createBuffer(size < 0 ? 0 : checked(size) | 0)
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(size)
}
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(size)
}

function fromString (string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8'
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('"encoding" must be a valid string encoding')
  }

  var length = byteLength(string, encoding) | 0
  var buf = createBuffer(length)

  var actual = buf.write(string, encoding)

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    buf = buf.slice(0, actual)
  }

  return buf
}

function fromArrayLike (array) {
  var length = array.length < 0 ? 0 : checked(array.length) | 0
  var buf = createBuffer(length)
  for (var i = 0; i < length; i += 1) {
    buf[i] = array[i] & 255
  }
  return buf
}

function fromArrayBuffer (array, byteOffset, length) {
  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('\'offset\' is out of bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('\'length\' is out of bounds')
  }

  var buf
  if (byteOffset === undefined && length === undefined) {
    buf = new Uint8Array(array)
  } else if (length === undefined) {
    buf = new Uint8Array(array, byteOffset)
  } else {
    buf = new Uint8Array(array, byteOffset, length)
  }

  // Return an augmented `Uint8Array` instance
  buf.__proto__ = Buffer.prototype
  return buf
}

function fromObject (obj) {
  if (Buffer.isBuffer(obj)) {
    var len = checked(obj.length) | 0
    var buf = createBuffer(len)

    if (buf.length === 0) {
      return buf
    }

    obj.copy(buf, 0, 0, len)
    return buf
  }

  if (obj) {
    if (isArrayBufferView(obj) || 'length' in obj) {
      if (typeof obj.length !== 'number' || numberIsNaN(obj.length)) {
        return createBuffer(0)
      }
      return fromArrayLike(obj)
    }

    if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
      return fromArrayLike(obj.data)
    }
  }

  throw new TypeError('First argument must be a string, Buffer, ArrayBuffer, Array, or array-like object.')
}

function checked (length) {
  // Note: cannot use `length < K_MAX_LENGTH` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= K_MAX_LENGTH) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + K_MAX_LENGTH.toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (length) {
  if (+length != length) { // eslint-disable-line eqeqeq
    length = 0
  }
  return Buffer.alloc(+length)
}

Buffer.isBuffer = function isBuffer (b) {
  return b != null && b._isBuffer === true
}

Buffer.compare = function compare (a, b) {
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError('Arguments must be Buffers')
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i]
      y = b[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'latin1':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!Array.isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; ++i) {
      length += list[i].length
    }
  }

  var buffer = Buffer.allocUnsafe(length)
  var pos = 0
  for (i = 0; i < list.length; ++i) {
    var buf = list[i]
    if (!Buffer.isBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    }
    buf.copy(buffer, pos)
    pos += buf.length
  }
  return buffer
}

function byteLength (string, encoding) {
  if (Buffer.isBuffer(string)) {
    return string.length
  }
  if (isArrayBufferView(string) || isArrayBuffer(string)) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    string = '' + string
  }

  var len = string.length
  if (len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len
      case 'utf8':
      case 'utf-8':
      case undefined:
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) return utf8ToBytes(string).length // assume utf8
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  var loweredCase = false

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length
  }

  if (end <= 0) {
    return ''
  }

  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0
  start >>>= 0

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8'

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

// This property is used by `Buffer.isBuffer` (and the `is-buffer` npm package)
// to detect a Buffer instance. It's not possible to use `instanceof Buffer`
// reliably in a browserify context because there could be multiple different
// copies of the 'buffer' package in use. This method works even for Buffer
// instances that were created from another copy of the `buffer` package.
// See: https://github.com/feross/buffer/issues/154
Buffer.prototype._isBuffer = true

function swap (b, n, m) {
  var i = b[n]
  b[n] = b[m]
  b[m] = i
}

Buffer.prototype.swap16 = function swap16 () {
  var len = this.length
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (var i = 0; i < len; i += 2) {
    swap(this, i, i + 1)
  }
  return this
}

Buffer.prototype.swap32 = function swap32 () {
  var len = this.length
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (var i = 0; i < len; i += 4) {
    swap(this, i, i + 3)
    swap(this, i + 1, i + 2)
  }
  return this
}

Buffer.prototype.swap64 = function swap64 () {
  var len = this.length
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits')
  }
  for (var i = 0; i < len; i += 8) {
    swap(this, i, i + 7)
    swap(this, i + 1, i + 6)
    swap(this, i + 2, i + 5)
    swap(this, i + 3, i + 4)
  }
  return this
}

Buffer.prototype.toString = function toString () {
  var length = this.length
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  if (this.length > 0) {
    str = this.toString('hex', 0, max).match(/.{2}/g).join(' ')
    if (this.length > max) str += ' ... '
  }
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (!Buffer.isBuffer(target)) {
    throw new TypeError('Argument must be a Buffer')
  }

  if (start === undefined) {
    start = 0
  }
  if (end === undefined) {
    end = target ? target.length : 0
  }
  if (thisStart === undefined) {
    thisStart = 0
  }
  if (thisEnd === undefined) {
    thisEnd = this.length
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0
  end >>>= 0
  thisStart >>>= 0
  thisEnd >>>= 0

  if (this === target) return 0

  var x = thisEnd - thisStart
  var y = end - start
  var len = Math.min(x, y)

  var thisCopy = this.slice(thisStart, thisEnd)
  var targetCopy = target.slice(start, end)

  for (var i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i]
      y = targetCopy[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset
    byteOffset = 0
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000
  }
  byteOffset = +byteOffset  // Coerce to Number.
  if (numberIsNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : (buffer.length - 1)
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset
  if (byteOffset >= buffer.length) {
    if (dir) return -1
    else byteOffset = buffer.length - 1
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0
    else return -1
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer.from(val, encoding)
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (Buffer.isBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
  } else if (typeof val === 'number') {
    val = val & 0xFF // Search for a byte value [0-255]
    if (typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
      }
    }
    return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir)
  }

  throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
  var indexSize = 1
  var arrLength = arr.length
  var valLength = val.length

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase()
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2
      arrLength /= 2
      valLength /= 2
      byteOffset /= 2
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  var i
  if (dir) {
    var foundIndex = -1
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
      } else {
        if (foundIndex !== -1) i -= i - foundIndex
        foundIndex = -1
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
    for (i = byteOffset; i >= 0; i--) {
      var found = true
      for (var j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false
          break
        }
      }
      if (found) return i
    }
  }

  return -1
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
}

Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  // must be an even number of digits
  var strLen = string.length
  if (strLen % 2 !== 0) throw new TypeError('Invalid hex string')

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; ++i) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (numberIsNaN(parsed)) return i
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function latin1Write (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset >>> 0
    if (isFinite(length)) {
      length = length >>> 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'latin1':
      case 'binary':
        return latin1Write(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
      : (firstByte > 0xBF) ? 2
      : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function latin1Slice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; ++i) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + (bytes[i + 1] * 256))
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf = this.subarray(start, end)
  // Return an augmented `Uint8Array` instance
  newBuf.__proto__ = Buffer.prototype
  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset + 3] = (value >>> 24)
  this[offset + 2] = (value >>> 16)
  this[offset + 1] = (value >>> 8)
  this[offset] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  this[offset + 2] = (value >>> 16)
  this[offset + 3] = (value >>> 24)
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('sourceStart out of bounds')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start
  var i

  if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (i = len - 1; i >= 0; --i) {
      target[i + targetStart] = this[i + start]
    }
  } else if (len < 1000) {
    // ascending copy from start
    for (i = 0; i < len; ++i) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, start + len),
      targetStart
    )
  }

  return len
}

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start
      start = 0
      end = this.length
    } else if (typeof end === 'string') {
      encoding = end
      end = this.length
    }
    if (val.length === 1) {
      var code = val.charCodeAt(0)
      if (code < 256) {
        val = code
      }
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
  } else if (typeof val === 'number') {
    val = val & 255
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0
  end = end === undefined ? this.length : end >>> 0

  if (!val) val = 0

  var i
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val
    }
  } else {
    var bytes = Buffer.isBuffer(val)
      ? val
      : new Buffer(val, encoding)
    var len = bytes.length
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len]
    }
  }

  return this
}

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = str.trim().replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

// ArrayBuffers from another context (i.e. an iframe) do not pass the `instanceof` check
// but they should be treated as valid. See: https://github.com/feross/buffer/issues/166
function isArrayBuffer (obj) {
  return obj instanceof ArrayBuffer ||
    (obj != null && obj.constructor != null && obj.constructor.name === 'ArrayBuffer' &&
      typeof obj.byteLength === 'number')
}

// Node 0.10 supports `ArrayBuffer` but lacks `ArrayBuffer.isView`
function isArrayBufferView (obj) {
  return (typeof ArrayBuffer.isView === 'function') && ArrayBuffer.isView(obj)
}

function numberIsNaN (obj) {
  return obj !== obj // eslint-disable-line no-self-compare
}

},{"base64-js":5,"ieee754":8}],7:[function(require,module,exports){
(function (Buffer){
var clone = (function() {
'use strict';

function _instanceof(obj, type) {
  return type != null && obj instanceof type;
}

var nativeMap;
try {
  nativeMap = Map;
} catch(_) {
  // maybe a reference error because no `Map`. Give it a dummy value that no
  // value will ever be an instanceof.
  nativeMap = function() {};
}

var nativeSet;
try {
  nativeSet = Set;
} catch(_) {
  nativeSet = function() {};
}

var nativePromise;
try {
  nativePromise = Promise;
} catch(_) {
  nativePromise = function() {};
}

/**
 * Clones (copies) an Object using deep copying.
 *
 * This function supports circular references by default, but if you are certain
 * there are no circular references in your object, you can save some CPU time
 * by calling clone(obj, false).
 *
 * Caution: if `circular` is false and `parent` contains circular references,
 * your program may enter an infinite loop and crash.
 *
 * @param `parent` - the object to be cloned
 * @param `circular` - set to true if the object to be cloned may contain
 *    circular references. (optional - true by default)
 * @param `depth` - set to a number if the object is only to be cloned to
 *    a particular depth. (optional - defaults to Infinity)
 * @param `prototype` - sets the prototype to be used when cloning an object.
 *    (optional - defaults to parent prototype).
 * @param `includeNonEnumerable` - set to true if the non-enumerable properties
 *    should be cloned as well. Non-enumerable properties on the prototype
 *    chain will be ignored. (optional - false by default)
*/
function clone(parent, circular, depth, prototype, includeNonEnumerable) {
  if (typeof circular === 'object') {
    depth = circular.depth;
    prototype = circular.prototype;
    includeNonEnumerable = circular.includeNonEnumerable;
    circular = circular.circular;
  }
  // maintain two arrays for circular references, where corresponding parents
  // and children have the same index
  var allParents = [];
  var allChildren = [];

  var useBuffer = typeof Buffer != 'undefined';

  if (typeof circular == 'undefined')
    circular = true;

  if (typeof depth == 'undefined')
    depth = Infinity;

  // recurse this function so we don't reset allParents and allChildren
  function _clone(parent, depth) {
    // cloning null always returns null
    if (parent === null)
      return null;

    if (depth === 0)
      return parent;

    var child;
    var proto;
    if (typeof parent != 'object') {
      return parent;
    }

    if (_instanceof(parent, nativeMap)) {
      child = new nativeMap();
    } else if (_instanceof(parent, nativeSet)) {
      child = new nativeSet();
    } else if (_instanceof(parent, nativePromise)) {
      child = new nativePromise(function (resolve, reject) {
        parent.then(function(value) {
          resolve(_clone(value, depth - 1));
        }, function(err) {
          reject(_clone(err, depth - 1));
        });
      });
    } else if (clone.__isArray(parent)) {
      child = [];
    } else if (clone.__isRegExp(parent)) {
      child = new RegExp(parent.source, __getRegExpFlags(parent));
      if (parent.lastIndex) child.lastIndex = parent.lastIndex;
    } else if (clone.__isDate(parent)) {
      child = new Date(parent.getTime());
    } else if (useBuffer && Buffer.isBuffer(parent)) {
      child = new Buffer(parent.length);
      parent.copy(child);
      return child;
    } else if (_instanceof(parent, Error)) {
      child = Object.create(parent);
    } else {
      if (typeof prototype == 'undefined') {
        proto = Object.getPrototypeOf(parent);
        child = Object.create(proto);
      }
      else {
        child = Object.create(prototype);
        proto = prototype;
      }
    }

    if (circular) {
      var index = allParents.indexOf(parent);

      if (index != -1) {
        return allChildren[index];
      }
      allParents.push(parent);
      allChildren.push(child);
    }

    if (_instanceof(parent, nativeMap)) {
      parent.forEach(function(value, key) {
        var keyChild = _clone(key, depth - 1);
        var valueChild = _clone(value, depth - 1);
        child.set(keyChild, valueChild);
      });
    }
    if (_instanceof(parent, nativeSet)) {
      parent.forEach(function(value) {
        var entryChild = _clone(value, depth - 1);
        child.add(entryChild);
      });
    }

    for (var i in parent) {
      var attrs;
      if (proto) {
        attrs = Object.getOwnPropertyDescriptor(proto, i);
      }

      if (attrs && attrs.set == null) {
        continue;
      }
      child[i] = _clone(parent[i], depth - 1);
    }

    if (Object.getOwnPropertySymbols) {
      var symbols = Object.getOwnPropertySymbols(parent);
      for (var i = 0; i < symbols.length; i++) {
        // Don't need to worry about cloning a symbol because it is a primitive,
        // like a number or string.
        var symbol = symbols[i];
        var descriptor = Object.getOwnPropertyDescriptor(parent, symbol);
        if (descriptor && !descriptor.enumerable && !includeNonEnumerable) {
          continue;
        }
        child[symbol] = _clone(parent[symbol], depth - 1);
        if (!descriptor.enumerable) {
          Object.defineProperty(child, symbol, {
            enumerable: false
          });
        }
      }
    }

    if (includeNonEnumerable) {
      var allPropertyNames = Object.getOwnPropertyNames(parent);
      for (var i = 0; i < allPropertyNames.length; i++) {
        var propertyName = allPropertyNames[i];
        var descriptor = Object.getOwnPropertyDescriptor(parent, propertyName);
        if (descriptor && descriptor.enumerable) {
          continue;
        }
        child[propertyName] = _clone(parent[propertyName], depth - 1);
        Object.defineProperty(child, propertyName, {
          enumerable: false
        });
      }
    }

    return child;
  }

  return _clone(parent, depth);
}

/**
 * Simple flat clone using prototype, accepts only objects, usefull for property
 * override on FLAT configuration object (no nested props).
 *
 * USE WITH CAUTION! This may not behave as you wish if you do not know how this
 * works.
 */
clone.clonePrototype = function clonePrototype(parent) {
  if (parent === null)
    return null;

  var c = function () {};
  c.prototype = parent;
  return new c();
};

// private utility functions

function __objToStr(o) {
  return Object.prototype.toString.call(o);
}
clone.__objToStr = __objToStr;

function __isDate(o) {
  return typeof o === 'object' && __objToStr(o) === '[object Date]';
}
clone.__isDate = __isDate;

function __isArray(o) {
  return typeof o === 'object' && __objToStr(o) === '[object Array]';
}
clone.__isArray = __isArray;

function __isRegExp(o) {
  return typeof o === 'object' && __objToStr(o) === '[object RegExp]';
}
clone.__isRegExp = __isRegExp;

function __getRegExpFlags(re) {
  var flags = '';
  if (re.global) flags += 'g';
  if (re.ignoreCase) flags += 'i';
  if (re.multiline) flags += 'm';
  return flags;
}
clone.__getRegExpFlags = __getRegExpFlags;

return clone;
})();

if (typeof module === 'object' && module.exports) {
  module.exports = clone;
}

}).call(this,require("buffer").Buffer)

},{"buffer":6}],8:[function(require,module,exports){
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = nBytes * 8 - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = nBytes * 8 - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}]},{},[2])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJkYXRhTWFuYWdlbWVudC5qcyIsImluZGV4LmpzIiwibW9kZWxzLmpzIiwic3RyYXRlZ2llcy5qcyIsIi4uL25vZGVfbW9kdWxlcy9iYXNlNjQtanMvaW5kZXguanMiLCIuLi9ub2RlX21vZHVsZXMvYnVmZmVyL2luZGV4LmpzIiwiLi4vbm9kZV9tb2R1bGVzL2Nsb25lL2Nsb25lLmpzIiwiLi4vbm9kZV9tb2R1bGVzL2llZWU3NTQvaW5kZXguanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztBQ0dBLElBQUksU0FBUztBQUNULFlBQVEseUNBREM7QUFFVCxnQkFBWSxpQ0FGSDtBQUdULGlCQUFhLHdDQUhKO0FBSVQsZUFBVyxpQkFKRjtBQUtULG1CQUFlLDZCQUxOO0FBTVQsdUJBQW1CO0FBTlYsQ0FBYjtBQVFBLFNBQVMsYUFBVCxDQUF1QixNQUF2Qjs7O0FDWEEsTUFBTSxTQUFTLFFBQVEsYUFBUixDQUFmO0FBQ0EsTUFBTSxLQUFLLFFBQVEscUJBQVIsQ0FBWDtBQUNBLElBQUksZUFBZSxRQUFRLGNBQVIsRUFBd0IsVUFBM0M7O0FBRUEsSUFBSSxPQUFPLE1BQVAsS0FBa0IsV0FBbEIsSUFBaUMsT0FBTyxPQUE1QyxFQUFxRDtBQUNqRCxRQUFJLFFBQVEsUUFBUSxNQUFSLENBQWUsT0FBZixFQUF3QixFQUF4QixDQUFaO0FBQ0EsU0FBSSxJQUFJLElBQUcsQ0FBWCxFQUFhLElBQUUsYUFBYSxNQUE1QixFQUFvQyxHQUFwQyxFQUF3QztBQUNwQyxZQUFJLE1BQU0sU0FBUyxRQUFULEdBQW9CLEdBQXBCLEdBQTBCLEtBQTFCLENBQWdDLFlBQWhDLEVBQThDLElBQTlDLENBQW1ELGFBQWEsQ0FBYixDQUFuRCxDQUFWO0FBQ0g7QUFDRDtBQUNBLFVBQU0sT0FBTixDQUFjLGlCQUFkLEVBQWlDLFVBQVMsRUFBVCxFQUFhO0FBQzFDLFlBQUksYUFBWSxFQUFoQjtBQUNB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TyxPQUFQLENBQWUsVUFBZixHQUE0QixVQUE1Qjs7O0FDcmtDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDbHJEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUMzUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiXG5cblxudmFyIGNvbmZpZyA9IHtcbiAgICBhcGlLZXk6IFwiQUl6YVN5QVhqTDZmNzM5QlZxTERrbnltQ04ySDM2LU5CRFM4THZZXCIsXG4gICAgYXV0aERvbWFpbjogXCJzdHJhdGVneXRyYWNrZXIuZmlyZWJhc2VhcHAuY29tXCIsXG4gICAgZGF0YWJhc2VVUkw6IFwiaHR0cHM6Ly9zdHJhdGVneXRyYWNrZXIuZmlyZWJhc2Vpby5jb21cIixcbiAgICBwcm9qZWN0SWQ6IFwic3RyYXRlZ3l0cmFja2VyXCIsXG4gICAgc3RvcmFnZUJ1Y2tldDogXCJzdHJhdGVneXRyYWNrZXIuYXBwc3BvdC5jb21cIixcbiAgICBtZXNzYWdpbmdTZW5kZXJJZDogXCIyNjEyNDk4MzY1MThcIlxufTtcbmZpcmViYXNlLmluaXRpYWxpemVBcHAoY29uZmlnKTtcblxuIiwiY29uc3QgbW9kZWxzID0gcmVxdWlyZSgnLi9tb2RlbHMuanMnKTtcclxuY29uc3QgZGIgPSByZXF1aXJlKCcuL2RhdGFNYW5hZ2VtZW50LmpzJyk7XHJcbnZhciBkYnN0cmF0ZWdpZXMgPSByZXF1aXJlKCcuL3N0cmF0ZWdpZXMnKS5zdHJhdGVnaWVzO1xyXG5cclxuaWYgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnICYmIHdpbmRvdy5hbmd1bGFyKSB7XHJcbiAgICBsZXQgbXlhcHAgPSBhbmd1bGFyLm1vZHVsZSgnbXlhcHAnLCBbXSk7XHJcbiAgICBmb3IodmFyIGkgPTA7aTxkYnN0cmF0ZWdpZXMubGVuZ3RoOyBpKyspe1xyXG4gICAgICAgIHZhciBrZXkgPSBmaXJlYmFzZS5kYXRhYmFzZSgpLnJlZigpLmNoaWxkKCdzdHJhdGVnaWVzJykucHVzaChkYnN0cmF0ZWdpZXNbaV0pO1xyXG4gICAgfVxyXG4gICAgLy8gJHEgaXMgYSBkZWZhdWx0IHNlcnZpY2UgYnkgYW5ndWxhciB0byBoYW5kbGUgQXN5bmNocm9ub3VzIGluIG9yZGVyIG5vdCB0byBibG9jayB0aHJlYWRzXHJcbiAgICBteWFwcC5mYWN0b3J5KCdTdHJhdGVneVNlcnZpY2UnLCBmdW5jdGlvbigkcSkge1xyXG4gICAgICAgIGxldCBzdHJhdGVnaWVzPSBbXTtcclxuICAgICAgICBsZXQgZGVmZXJyZWQgPSAkcS5kZWZlcigpO1xyXG4gICAgICAgIGZpcmViYXNlLmRhdGFiYXNlKCkucmVmKCdzdHJhdGVnaWVzJykub25jZSgndmFsdWUnKS50aGVuKGZ1bmN0aW9uKHNuYXBzaG90KSB7XHJcbiAgICAgICAgICAgIHNuYXBzaG90LmZvckVhY2goZnVuY3Rpb24oY2hpbGRTdHJhdGVneSkge1xyXG4gICAgICAgICAgICAgICAgc3RyYXRlZ2llcy5wdXNoKGNoaWxkU3RyYXRlZ3kudmFsKCkpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZShzdHJhdGVnaWVzKTtcclxuICAgICAgICB9KS5jYXRjaChmdW5jdGlvbihlcnIpIHtcclxuICAgICAgICAgICAgZGVmZXJyZWQucmVqZWN0KGVycik7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIGdldEFsbDogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICB9O1xyXG4gICAgfSk7XHJcblxyXG4gICAgbXlhcHAuY29udHJvbGxlcignTWFpbkN0cmwnLCBmdW5jdGlvbiAoJHNjb3BlLCBTdHJhdGVneVNlcnZpY2UpIHtcclxuICAgICAgICBcInVzZSBzdHJpY3RcIjtcclxuXHJcbiAgICAgICAgJHNjb3BlLmFjY29yZGlvbiA9IHtcclxuICAgICAgICAgICAgY3VycmVudDogbnVsbFxyXG4gICAgICAgIH07XHJcbiAgICAgICAgbGV0IG15U3RyYXQgPSBTdHJhdGVneVNlcnZpY2UuZ2V0QWxsKCk7XHJcblxyXG5cclxuICAgICAgICAvL0FzeW5jaHJvbm91cyA6IElmIHRoZSByZWNvcmRzIGFyZSByZWFkeSBmcm9tIGRlZmZlcmVkLnByb21pc2UsIHRoZW4gdGhlIGZvbGxvd2luZyBzdGVwcyBpcyBydW4uXHJcbiAgICAgICAgbXlTdHJhdC50aGVuKGZ1bmN0aW9uKHN0cmF0ZWdpZXMpIHtcclxuICAgICAgICAgICAgJHNjb3BlLmFsbFN0cmF0ZWdpZXMgPXN0cmF0ZWdpZXM7XHJcbiAgICAgICAgICAgICRzY29wZS5zdHJhdGVnaWVzID0gc3RyYXRlZ2llc1sxXS5zdWJTdHJhdGVnaWVzO1xyXG4gICAgICAgICAgICAkc2NvcGUuc2VsZWN0ZWRTdHJhdGVneSA9IHN0cmF0ZWdpZXNbMV07XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCRzY29wZS5zZWxlY3RlZFN0cmF0ZWd5Lm5hbWUpO1xyXG5cclxuICAgICAgICAgICAgJHNjb3BlLmFsbFZhcmlhYmxlcyA9ICRzY29wZS5zZWxlY3RlZFN0cmF0ZWd5LmFsbFZhcmlhYmxlcztcclxuXHJcbiAgICAgICAgICAgIC8vIGNyZWF0ZSBpbnRlcnByZXRlciBvYmplY3QgZnJvbSBtb2RlbFxyXG4gICAgICAgICAgICAvL2NvbnNvbGUubG9nKHN0cmF0ZWdpZXMpO1xyXG4gICAgICAgICAgICBsZXQgaW50ZXJwcmV0ZXIgPSBuZXcgbW9kZWxzLkludGVycHJldGVyKCRzY29wZS5zZWxlY3RlZFN0cmF0ZWd5LnN1YlN0cmF0ZWdpZXMpO1xyXG4gICAgICAgICAgICAvLyBpbml0aWFsaXplIHRoZSBhcHBsaWNhdGlvblxyXG4gICAgICAgICAgICBsZXQgZXhlY09iaiA9IGludGVycHJldGVyLmluaXQoJHNjb3BlLnNlbGVjdGVkU3RyYXRlZ3kuc3ViU3RyYXRlZ2llc1swXS5uYW1lKTtcclxuICAgICAgICAgICAgJHNjb3BlLnN0cmF0ZWd5ID0gZXhlY09iai5jdXJyZW50U3RyYXRlZ3k7XHJcbiAgICAgICAgICAgICRzY29wZS5jdXJyZW50U3RhdGVtZW50ID0gZXhlY09iai5jdXJyZW50U3RhdGVtZW50O1xyXG4gICAgICAgICAgICAkc2NvcGUuc3RhdGVtZW50cyA9ICRzY29wZS5zdHJhdGVneS5zdGF0ZW1lbnRzO1xyXG5cclxuICAgICAgICAgICAgJHNjb3BlLnJlc2V0PSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICBleGVjT2JqID0gaW50ZXJwcmV0ZXIucmVzZXQoKTtcclxuICAgICAgICAgICAgICAgIGludGVycHJldGVyID0gbmV3IG1vZGVscy5JbnRlcnByZXRlcihzdHJhdGVnaWVzKTtcclxuICAgICAgICAgICAgICAgIGV4ZWNPYmogPSBpbnRlcnByZXRlci5pbml0KFwibG9jYWxpemVGYWlsdXJlXCIpO1xyXG4gICAgICAgICAgICAgICAgJHNjb3BlLnN0cmF0ZWd5ID0gZXhlY09iai5jdXJyZW50U3RyYXRlZ3k7XHJcbiAgICAgICAgICAgICAgICAkc2NvcGUuY3VycmVudFN0YXRlbWVudCA9IGV4ZWNPYmouY3VycmVudFN0YXRlbWVudDtcclxuICAgICAgICAgICAgICAgICRzY29wZS5zdGF0ZW1lbnRzID0gJHNjb3BlLnN0cmF0ZWd5LnN0YXRlbWVudHM7XHJcbiAgICAgICAgICAgICAgICBhbmd1bGFyLmZvckVhY2goJHNjb3BlLmFsbFZhcmlhYmxlcywgZnVuY3Rpb24odmFsLCBrZXkpIHtcclxuICAgICAgICAgICAgICAgICAgICB2YWwudmFsID0gbnVsbDtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9O1xyXG5cclxuXHJcbiAgICAgICAgICAgICRzY29wZS5uZXh0U3RhdGVtZW50ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgZXhlY09iaiA9IGludGVycHJldGVyLmV4ZWN1dGUoKTtcclxuICAgICAgICAgICAgICAgIGlmIChleGVjT2JqID09PSBudWxsKSByZXR1cm47XHJcbiAgICAgICAgICAgICAgICBpZiAoJHNjb3BlLnN0cmF0ZWd5Lm5hbWUgIT09IGV4ZWNPYmouY3VycmVudFN0cmF0ZWd5Lm5hbWUpIHtcclxuICAgICAgICAgICAgICAgICAgICAkKCcjJyArIGV4ZWNPYmouY3VycmVudFN0cmF0ZWd5Lm5hbWUpLmNvbGxhcHNlKCdzaG93Jyk7XHJcbiAgICAgICAgICAgICAgICAgICAgJCgnIycgKyAkc2NvcGUuc3RyYXRlZ3kubmFtZSkuY29sbGFwc2UoJ2hpZGUnKTtcclxuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuc3RyYXRlZ3kgPSBleGVjT2JqLmN1cnJlbnRTdHJhdGVneTtcclxuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuc3RhdGVtZW50cyA9ICRzY29wZS5zdHJhdGVneS5zdGF0ZW1lbnRzO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vJCgnIycgKyRzY29wZS5zdHJhdGVneS5uYW1lKS5jb2xsYXBzZSgnc2hvdycpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICRzY29wZS5jdXJyZW50U3RhdGVtZW50ID0gZXhlY09iai5jdXJyZW50U3RhdGVtZW50O1xyXG4gICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgJHNjb3BlLnByZXZTdGF0ZW1lbnQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICBleGVjT2JqID0gaW50ZXJwcmV0ZXIuZ29CYWNrKCk7XHJcbiAgICAgICAgICAgICAgICBpZiAoZXhlY09iaiA9PT0gbnVsbCkgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgaWYgKCRzY29wZS5zdHJhdGVneS5uYW1lICE9PSBleGVjT2JqLmN1cnJlbnRTdHJhdGVneS5uYW1lKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgJCgnIycgKyBleGVjT2JqLmN1cnJlbnRTdHJhdGVneS5uYW1lKS5jb2xsYXBzZSgnc2hvdycpO1xyXG4gICAgICAgICAgICAgICAgICAgICQoJyMnICsgJHNjb3BlLnN0cmF0ZWd5Lm5hbWUpLmNvbGxhcHNlKCdoaWRlJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLnN0cmF0ZWd5ID0gZXhlY09iai5jdXJyZW50U3RyYXRlZ3k7XHJcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLnN0YXRlbWVudHMgPSAkc2NvcGUuc3RyYXRlZ3kuc3RhdGVtZW50cztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICRzY29wZS5jdXJyZW50U3RhdGVtZW50ID0gZXhlY09iai5jdXJyZW50U3RhdGVtZW50O1xyXG4gICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgJHNjb3BlLmNob29zZU5leHRTdGF0ZW1lbnQgPSBmdW5jdGlvbiAoJGV2ZW50KSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgY3VycmVudFRhcmdldCA9ICRldmVudC5jdXJyZW50VGFyZ2V0LmlubmVySFRNTDtcclxuICAgICAgICAgICAgICAgIGlmICgkc2NvcGUuY3VycmVudFN0YXRlbWVudC5hY3RpdmVMaW5lcy5sZW5ndGggPiAxKVxyXG4gICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIChjdXJyZW50VGFyZ2V0LmluY2x1ZGVzKFwiaWZcIikgfHwgY3VycmVudFRhcmdldC5pbmNsdWRlcyhcImVsc2VcIikgfHwgY3VycmVudFRhcmdldC5pbmNsdWRlcyhcIndoaWxlXCIpIHx8IGN1cnJlbnRUYXJnZXQuaW5jbHVkZXMoXCJyZXR1cm5cIikpXHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IGxpbmVOdW0gPSBwYXJzZUludCgkZXZlbnQuY3VycmVudFRhcmdldC5pZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgZXhlY09iaiA9IGludGVycHJldGVyLmV4ZWN1dGUobGluZU51bSsxKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoZXhlY09iaiA9PT0gbnVsbCkgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICgkc2NvcGUuc3RyYXRlZ3kubmFtZSAhPT0gZXhlY09iai5jdXJyZW50U3RyYXRlZ3kubmFtZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuc3RyYXRlZ3kgPSBleGVjT2JqLmN1cnJlbnRTdHJhdGVneTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLnN0YXRlbWVudHMgPSAkc2NvcGUuc3RyYXRlZ3kuc3RhdGVtZW50cztcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmN1cnJlbnRTdGF0ZW1lbnQgPSBleGVjT2JqLmN1cnJlbnRTdGF0ZW1lbnQ7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgfSk7XHJcblxyXG59XHJcbiIsIid1c2Ugc3RyaWN0JztcclxuXHJcbnZhciBjbG9uZSA9IHJlcXVpcmUoJ2Nsb25lJyk7XHJcblxyXG5jbGFzcyBJbnRlcnByZXRlciB7XHJcblxyXG5cclxuICAgIGNvbnN0cnVjdG9yKHN0cmF0ZWdpZXMpIHtcclxuICAgICAgICB0aGlzLmV4ZWN1dGlvblN0YWNrID0gW107XHJcbiAgICAgICAgdGhpcy5oaXN0b3J5QmFja3dhcmQgPSBbXTtcclxuICAgICAgICB0aGlzLnN0cmF0ZWdpZXMgPSBzdHJhdGVnaWVzO1xyXG4gICAgICAgIHRoaXMuZGlydHk9IGZhbHNlO1xyXG4gICAgfVxyXG5cclxuICAgIGluaXQobmFtZSkge1xyXG4gICAgICAgIGxldCBpbml0RXhlY3V0aW9uQ29udGV4dCA9IG5ldyBGdW5jdGlvbkV4ZWNDb250ZXh0KHRoaXMuZmluZFN0cmF0ZWd5KG5hbWUpKTtcclxuICAgICAgICB0aGlzLmV4ZWN1dGlvblN0YWNrLnB1c2goaW5pdEV4ZWN1dGlvbkNvbnRleHQpO1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIGN1cnJlbnRTdGF0ZW1lbnQ6IGluaXRFeGVjdXRpb25Db250ZXh0LnBjLFxyXG4gICAgICAgICAgICBjdXJyZW50U3RyYXRlZ3k6IGluaXRFeGVjdXRpb25Db250ZXh0LnN0cmF0ZWd5LFxyXG4gICAgICAgICAgICBleGVjdXRpb25TdGFjazogdGhpcy5leGVjdXRpb25TdGFjayxcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICByZXNldCgpe1xyXG4gICAgICAgIGxldCB3aXphcmREaXYgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIndpemFyZFwiKTtcclxuICAgICAgICB0aGlzLmhpc3RvcnlCYWNrd2FyZC5zcGxpY2UoMCx0aGlzLmhpc3RvcnlCYWNrd2FyZC5sZW5ndGgpO1xyXG4gICAgICAgIHRoaXMuZXhlY3V0aW9uU3RhY2suc3BsaWNlKDAsdGhpcy5leGVjdXRpb25TdGFjay5sZW5ndGgpO1xyXG4gICAgICAgIHRoaXMudXBkYXRlV2l6YXJkKHdpemFyZERpdik7XHJcbiAgICAgICAgdGhpcy5kaXJ0eT0gZmFsc2U7XHJcblxyXG4gICAgfVxyXG5cclxuXHJcbiAgICBmaW5kU3RyYXRlZ3koc3RyYXRlZ3luYW1lKSB7XHJcblxyXG5cclxuICAgICAgICByZXR1cm4gdGhpcy5zdHJhdGVnaWVzLmZpbmQoZnVuY3Rpb24oc3RyYXRlZ3kpIHtcclxuXHJcbiAgICAgICAgICAgIHJldHVybiBzdHJhdGVneS5uYW1lID09PSBzdHJhdGVneW5hbWU7XHJcbiAgICAgICAgfSlcclxuICAgIH1cclxuXHJcbiAgICBleGVjdXRlKGxpbmVOdW0pIHtcclxuICAgICAgICBsZXQgd2l6YXJkRGl2ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJ3aXphcmRcIik7XHJcblxyXG4gICAgICAgICAgICBpZih0aGlzLmV4ZWN1dGlvblN0YWNrLmxlbmd0aCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5oaXN0b3J5QmFja3dhcmQucHVzaChjbG9uZSh0aGlzLmV4ZWN1dGlvblN0YWNrKSk7IC8vIHRha2UgYSBzbmFwc2hvdCBmcm9tIG91ciBjdXJyZW50IGV4ZWN1dGlvblN0YWNrIHRvIG91ciBoaXN0b3J5XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgbGV0IGV4ZWN1dGlvbkNvbnRleHQgPSB0aGlzLmV4ZWN1dGlvblN0YWNrLnBvcCgpO1xyXG4gICAgICAgICAgICBpZihleGVjdXRpb25Db250ZXh0ID09PSB1bmRlZmluZWQpXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICAgICAgaWYoIXRoaXMuZGlydHkgJiYgZXhlY3V0aW9uQ29udGV4dC5wYy5uZXh0U3RyYXRlZ3kubGVuZ3RoKSB7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IG5leHRFeGVjdXRpb25Db250ZXh0ID0gbmV3IEZ1bmN0aW9uRXhlY0NvbnRleHQodGhpcy5maW5kU3RyYXRlZ3koZXhlY3V0aW9uQ29udGV4dC5wYy5uZXh0U3RyYXRlZ3kpKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuZGlydHkgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5leGVjdXRpb25TdGFjay5wdXNoKGV4ZWN1dGlvbkNvbnRleHQpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5leGVjdXRpb25TdGFjay5wdXNoKG5leHRFeGVjdXRpb25Db250ZXh0KTtcclxuXHJcblxyXG4gICAgICAgICAgICAgICAgdGhpcy51cGRhdGVXaXphcmQod2l6YXJkRGl2KTtcclxuICAgICAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICAgICAgY3VycmVudFN0YXRlbWVudDogbmV4dEV4ZWN1dGlvbkNvbnRleHQucGMsXHJcbiAgICAgICAgICAgICAgICAgICAgY3VycmVudFN0cmF0ZWd5OiBuZXh0RXhlY3V0aW9uQ29udGV4dC5zdHJhdGVneSxcclxuICAgICAgICAgICAgICAgICAgICBleGVjdXRpb25TdGFjazogdGhpcy5leGVjdXRpb25TdGFjayxcclxuICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmRpcnR5ID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICBsZXQgbmV4dFN0YXRlbWVudCA9IGV4ZWN1dGlvbkNvbnRleHQuZ2V0TmV4dFN0YXRlbWVudChsaW5lTnVtKTtcclxuICAgICAgICAgICAgICAgIGlmKG5leHRTdGF0ZW1lbnQuc3VjY2Vzc29yPT11bmRlZmluZWQgfHwgbmV4dFN0YXRlbWVudC5zdWNjZXNzb3I9PVwidW5kZWZpbmVkXCIpXHJcbiAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5kaXJ0eSA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgZXhlY3V0aW9uQ29udGV4dCA9IHRoaXMuZXhlY3V0aW9uU3RhY2sucG9wKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYoZXhlY3V0aW9uQ29udGV4dCA9PT0gdW5kZWZpbmVkKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICAgICAgICAgICAgICBuZXh0U3RhdGVtZW50PSBleGVjdXRpb25Db250ZXh0LmdldE5leHRTdGF0ZW1lbnQoZXhlY3V0aW9uQ29udGV4dC5wYy5saW5lTnVtKTtcclxuXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB0aGlzLmV4ZWN1dGlvblN0YWNrLnB1c2goZXhlY3V0aW9uQ29udGV4dCk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZVdpemFyZCh3aXphcmREaXYpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgICAgICBjdXJyZW50U3RhdGVtZW50OiBuZXh0U3RhdGVtZW50LFxyXG4gICAgICAgICAgICAgICAgICAgIGN1cnJlbnRTdHJhdGVneTogZXhlY3V0aW9uQ29udGV4dC5zdHJhdGVneSxcclxuICAgICAgICAgICAgICAgICAgICBleGVjdXRpb25TdGFjazogdGhpcy5leGVjdXRpb25TdGFjayxcclxuICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIH1cclxuICAgIH1cclxuICAgIHVwZGF0ZVdpemFyZCggd2l6YXJkRGl2KSB7XHJcbiAgICAgICAgd2hpbGUgKHdpemFyZERpdi5maXJzdENoaWxkKSB7XHJcbiAgICAgICAgICAgIHdpemFyZERpdi5yZW1vdmVDaGlsZCh3aXphcmREaXYuZmlyc3RDaGlsZCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGZvcih2YXIgaT0wOyBpPHRoaXMuZXhlY3V0aW9uU3RhY2subGVuZ3RoOyBpKyspe1xyXG4gICAgICAgICAgICB2YXIgaW5uZXJEaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcclxuICAgICAgICAgICAgaW5uZXJEaXYuY2xhc3NOYW1lID0gJ3dpemFyZC1ibG9jayB3ZWxsJztcclxuICAgICAgICAgICAgaW5uZXJEaXYuYXBwZW5kKHRoaXMuZXhlY3V0aW9uU3RhY2tbaV0uc3RyYXRlZ3kuZGlzcGxheU5hbWUpO1xyXG4gICAgICAgICAgICB3aXphcmREaXYuYXBwZW5kQ2hpbGQoaW5uZXJEaXYpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcblxyXG4gICAgZ29CYWNrKCkge1xyXG4gICAgICAgIGxldCBzdGFjayA9IHRoaXMuaGlzdG9yeUJhY2t3YXJkLnBvcCgpO1xyXG4gICAgICAgIGlmKHN0YWNrID09PSB1bmRlZmluZWQpXHJcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgIHRoaXMuZXhlY3V0aW9uU3RhY2sgPSBzdGFjaztcclxuICAgICAgICBsZXQgZXhlY3V0aW9uQ29udGV4dCA9IHRoaXMuZXhlY3V0aW9uU3RhY2tbdGhpcy5leGVjdXRpb25TdGFjay5sZW5ndGggLSAxXTtcclxuICAgICAgICBsZXQgd2l6YXJkRGl2ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJ3aXphcmRcIik7XHJcbiAgICAgICAgaWYoZXhlY3V0aW9uQ29udGV4dC5zdHJhdGVneS5kaXNwbGF5TmFtZSAhPSB3aXphcmREaXYubGFzdEVsZW1lbnRDaGlsZC5sYXN0Q2hpbGQuZGF0YSlcclxuICAgICAgICAgICAgdGhpcy51cGRhdGVXaXphcmQod2l6YXJkRGl2KVxyXG5cclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICBjdXJyZW50U3RhdGVtZW50OiAgZXhlY3V0aW9uQ29udGV4dC5wYyxcclxuICAgICAgICAgICAgY3VycmVudFN0cmF0ZWd5OiBleGVjdXRpb25Db250ZXh0LnN0cmF0ZWd5LFxyXG4gICAgICAgICAgICBleGVjdXRpb25TdGFjazogdGhpcy5leGVjdXRpb25TdGFjayxcclxuICAgICAgICB9O1xyXG4gICAgfVxyXG59XHJcblxyXG5cclxuY2xhc3MgRnVuY3Rpb25FeGVjQ29udGV4dCB7XHJcbiAgICBjb25zdHJ1Y3RvcihzdHJhdGVneSkge1xyXG4gICAgICAgIHRoaXMuc3RyYXRlZ3kgPSBzdHJhdGVneTtcclxuICAgICAgICB0aGlzLnBjID0gMDtcclxuICAgIH1cclxuXHJcbiAgICBnZXQgcGMoKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuX3BjO1xyXG4gICAgfVxyXG5cclxuICAgIHNldCBwYyhsaW5lTnVtKSB7XHJcbiAgICAgICAgdGhpcy5fcGMgPSB0aGlzLnN0cmF0ZWd5LnN0YXRlbWVudHNbbGluZU51bV07XHJcbiAgICB9XHJcblxyXG4gICAgZ2V0TmV4dFN0YXRlbWVudChsaW5lTnVtKSB7XHJcbiAgICAgICAgaWYobGluZU51bSAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgIHRoaXMucGMgPSBsaW5lTnVtO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRoaXMucGMgPSB0aGlzLnBjLnN1Y2Nlc3NvcjtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHRoaXMucGM7XHJcbiAgICB9XHJcblxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IHtcclxuICAgIEludGVycHJldGVyOiBJbnRlcnByZXRlclxyXG59OyIsIid1c2Ugc3RyaWN0JztcclxuXHJcbmxldCBzdHJhdGVnaWVzID0gW1xyXG4gICAge1xyXG4gICAgICAgIG93bmVyOlwiVGhvbWFzIExhVG96YVwiLFxyXG4gICAgICAgIG5hbWU6XCJNb2RlbEZhdWx0TG9jYWxpY2F0aW9uXCIsXHJcbiAgICAgICAgZGlzcGxheU5hbWU6XCJNb2RlbCBGYXVsdCBMb2NhbGl6YXRpb25cIixcclxuICAgICAgICBwcm9jZXNzRGVzY3JpcHRpb24gOiBcIlRoZSBjb3JlIGlkZWEgb2YgbW9kZWwgZmF1bHQgbG9jYWxpemF0aW9uIGlzIHRvIGV4cGxvcmUgcGVybXV0YXRpb25zIG9mIGludGVyYWN0aW9ucyB3aXRoIHRoZSBzeXN0ZW0gdG8gdW5kZXJzdGFuZCBob3cgdGhlIGludGVyYWN0aW9uIG5lZWRzIHRvIGhhcHBlbiBkaWZmZXJlbnRseSB0b1xcblwiICtcclxuICAgICAgICBcIiAgICAgICAgICAgIHJlbW92ZSB0aGUgZmFpbHVyZS4gRm9yIGV4YW1wbGUsIHlvdSBtaWdodCBhIGNvbmZpZyBmaWxlIHRvIGluaXRpYWxpemUgYVxcblwiICtcclxuICAgICAgICBcIiAgICAgICAgICAgIGxpYnJhcnkgKGNvbmZpZ3VyYXRpb24gcGFyYW10ZXJzKSwgYSBjb2RlIHNuaXBwZXQgbWFraW5nIHRocmVlIGNhbGxzIChjb2RlKSxcXG5cIiArXHJcbiAgICAgICAgXCIgICAgICAgICAgICBhbmQgdGhlIGV4dGVybmFsIGxpYnJhcnkgaXQgdXNlcyAodGhlIHN5c3RlbSkuIE1vZGVsIGZhdWx0IGxvY2FsaXphdGlvbiBzZXBhcmF0ZWx5IGNvbnNpZGVycyB0d28gc2VwYXJhdGUgY2F1c2VzIG9mIGZhaWx1cmUuXCIsXHJcblxyXG4gICAgICAgIHN0cmF0ZWd5RGVzY3JpcHRpb246XCJJbiB0aGUgZm9sbG93aW5nIHRvb2wsIHlvdSBjYW4gZm9sbG93IHRoZSBNb2RlbCBGYXVsdCBMb2NhbGl6YXRpb24gc3RyYXRlZ3kgc3RlcHMgYnkgY2xpY2tpbmcgdGhlIGJ1dHRvbnMgXFxcIm5leHRcXFwiIGFuZCBcXFwicHJldmlvdXNcXFwiLjwvYnI+XFxuXCIgK1xyXG4gICAgICAgIFwiICAgICAgICAgICAgSW4gdGhlIGRlc2NyaXB0aW9uIHBhbmVsLCB0aGVyZSBpcyBtb3JlIGRldGFpbHMgYWJvdXQgZWFjaCBzdGVwcy48L2JyPlxcblwiICtcclxuICAgICAgICBcIiAgICAgICAgICAgIFRoZSB2YXJpYWJsZXMgcGFuZWwgc2hvd3MgYWxsIHRoZSB2YXJpYWJsZXMgaW4gdGhlIHN0cmF0ZWd5LiBZb3UgY2FuIGFzc2lnbiBzcGVjaWZpYyB2YWx1ZXMgYW5kIGtlZXAgdHJhY2sgb2YgdGhlbSBkdXJpbmcgdGhlIGV4ZWN1dGlvbiBvZiB0aGUgc3RyYXRlZ3kgc3RlcHMuPC9icj5cXG5cIiArXHJcbiAgICAgICAgXCIgICAgICAgICAgICBFdmVyeSB0aW1lIHlvdSBuZWVkIHRvIGNvbWUgYmFjayB0byB0aGUgZmlyc3Qgc3RlcCwganVzdCByZXNldCB0aGUgc3RyYXRlZ3kuXCIsXHJcbiAgICAgICAgYWFsVmFyaWFibGVzOltcclxuICAgICAgICAgICAge25hbWU6ICdjb2RlJywgdmFsOiBudWxsfSxcclxuICAgICAgICAgICAge25hbWU6ICdyZWZlcmVuY2VDb2RlJywgdmFsOiBudWxsfSxcclxuICAgICAgICAgICAge25hbWU6ICdmYWlsdXJlJywgdmFsOiBudWxsfSxcclxuICAgICAgICAgICAge25hbWU6ICdzeXN0ZW0nLCB2YWw6IG51bGx9XHJcbiAgICAgICAgXSxcclxuICAgICAgICBzdWJTdHJhdGVnaWVzOiBbXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6IFwibW9kZWxGYXVsdExvY2FsaXphdGlvblwiLFxyXG4gICAgICAgICAgICAgICAgZGlzcGxheU5hbWU6IFwiTW9kZWwgRmF1bHQgTG9jYWxpemF0aW9uXCIsXHJcbiAgICAgICAgICAgICAgICBzdGF0ZW1lbnRzOiBbe1xyXG4gICAgICAgICAgICAgICAgICAgIGxpbmVOdW06IDAsXHJcbiAgICAgICAgICAgICAgICAgICAgdGV4dDogXCJTdHJhdGVneSBtb2RlbEZhdWx0TG9jYWxpemF0aW9uKGNvZGUsIGZhaWx1cmUsIHN5c3RlbSkge1wiLFxyXG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3NvcjogMSxcclxuICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJNb2RlbCBmYXVsdCBsb2NhbGl6YXRpb24gdGFrZXMgY29kZSwgYSBmYWlsdXJlIHRoYXQgdGhlIGNvZGUgZ2VuZXJhdGVzLCBhbmQgYSBzeXN0ZW0gd2l0aCB3aGljaCB0aGUgY29kZSBpbnRlcmFjdHMuIFwiICtcclxuICAgICAgICAgICAgICAgICAgICBcIkFmdGVyIGZpbmRpbmcgcmVmZXJlbmNlQ29kZSwgdGhlIHN0cmF0ZWd5IHRlc3RzIGlmIGZhaWx1cmUgaXMgc3RpbGwgd2l0bmVzc2VkIHRoaXMgZGlmZmVyZW50IChhbmQgYXNzdW1lZCBjb3JyZWN0KSBjb2RlLiBcIiArXHJcbiAgICAgICAgICAgICAgICAgICAgXCJJZiBpdCBpcywgdGhlbiBhIGNhdXNlIG9mIHRoZSBmYWlsdXJlIGxpZXMgaW4gdGhlIGNvbmZpZ3VyYXRpb24uIFwiICtcclxuICAgICAgICAgICAgICAgICAgICBcIklmIG5vdCwgdGhlIGZhdWx0IGNhbiB0aGVuIGJlIGxvY2FsaXplZCBieSBzeXN0ZW1hdGljYWxseSBjb21wYXJpbmcgcmVmZXJlbmNlQ29kZSB0byBjb2RlLlwiLFxyXG4gICAgICAgICAgICAgICAgICAgIGNsYXNzOiAnJyxcclxuICAgICAgICAgICAgICAgICAgICB2YXJpYWJsZXM6IFtcImNvZGVcIiwgXCJzeXN0ZW1cIiwgXCJmYWlsdXJlXCJdLFxyXG4gICAgICAgICAgICAgICAgICAgIG5leHRTdHJhdGVneTogXCJcIixcclxuICAgICAgICAgICAgICAgICAgICBhY3RpdmVMaW5lczogWzBdXHJcbiAgICAgICAgICAgICAgICB9LCB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGluZU51bTogMSxcclxuICAgICAgICAgICAgICAgICAgICB0ZXh0OiBcInJlZmVyZW5jZUNvZGUgPSBmaW5kUmVmZXJlbmNlQ29kZShzeXN0ZW0pO1wiLFxyXG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3NvcjogMixcclxuICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJGaW5kIHNvbWUgcmVmZXJlbmNlIGNvZGUgdGhhdCBpbnRlcmFjdHMgd2l0aCB0aGUgc3lzdGVtIHRoYXQgeW91IGtub3cgbXVzdCBiZSBjb3JyZWN0IGNvZGUuVGhpcyBjb2RlIG1pZ2h0IGJlIGdpdmVuIGJ5IHRoZSBzeXN0ZW0gYXV0aG9ycyBpbiBhbiBvZmZpY2lhbCB0dXRvcmlhbCBvciBtaWdodCBiZSBjb2RlIGZvdW5kIGZyb20gYSB0aGlyZCBwYXJ0eS5cIixcclxuICAgICAgICAgICAgICAgICAgICBjbGFzczogXCJtYXJnaW4tMVwiLFxyXG4gICAgICAgICAgICAgICAgICAgIHZhcmlhYmxlczogW1wic3lzdGVtXCIsIFwicmVmZXJlbmNlQ29kZVwiXSxcclxuICAgICAgICAgICAgICAgICAgICBuZXh0U3RyYXRlZ3k6IFwiXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgYWN0aXZlTGluZXM6IFsxXVxyXG4gICAgICAgICAgICAgICAgfSwge1xyXG4gICAgICAgICAgICAgICAgICAgIGxpbmVOdW06IDIsXHJcbiAgICAgICAgICAgICAgICAgICAgdGV4dDogXCJleGVjdXRlKHJlZmVyZW5jZUNvZGUsIHN5c3RlbSk7XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgc3VjY2Vzc29yOiAzLFxyXG4gICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIlRyeSB0byBleGVjdXRlIHRoZSBjb2RlIHlvdSBoYXZlIGZvdW5kIGZyb20gR2l0aHViIG9yIFN0YWNrb3ZlcmZsb3cgYW5kIGNoZWNrIGlmIGl0IGZpeGVzIHRoZSBmYWlsdXJlIFwiLFxyXG4gICAgICAgICAgICAgICAgICAgIGNsYXNzOiBcIm1hcmdpbi0xXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgdmFyaWFibGVzOiBbXCJyZWZlcmVuY2VDb2RlXCIsIFwic3lzdGVtXCJdLFxyXG4gICAgICAgICAgICAgICAgICAgIG5leHRTdHJhdGVneTogXCJcIixcclxuICAgICAgICAgICAgICAgICAgICBhY3RpdmVMaW5lczogWzJdXHJcbiAgICAgICAgICAgICAgICB9LCB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGluZU51bTogMyxcclxuICAgICAgICAgICAgICAgICAgICB0ZXh0OiBcImlmIChleGVjdXRpb24gb2YgcmVmZXJlbmNlQ29kZSB0aHJvd3MgZmFpbHVyZSkge1wiLFxyXG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3NvcjogNCxcclxuICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJJZiBleGVjdXRpbmcgdGhlIHJlZmVyZW5jZUNvZGUgY2F1c2VzIEZhaWx1cmUsIGNsaWNrIHRoZSBpZiBzdGF0ZW1lbnQuIE90aGVyd2lzZSBjbGljayB0aGUgZWxzZSBzdGF0ZW1lbnQgXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgY2xhc3M6IFwibWFyZ2luLTFcIixcclxuICAgICAgICAgICAgICAgICAgICB2YXJpYWJsZXM6IFtcInJlZmVyZW5jZUNvZGVcIiwgXCJzeXN0ZW1cIl0sXHJcbiAgICAgICAgICAgICAgICAgICAgbmV4dFN0cmF0ZWd5OiBcIlwiLFxyXG4gICAgICAgICAgICAgICAgICAgIGFjdGl2ZUxpbmVzOiBbMywgNV1cclxuICAgICAgICAgICAgICAgIH0sIHtcclxuICAgICAgICAgICAgICAgICAgICBsaW5lTnVtOiA0LFxyXG4gICAgICAgICAgICAgICAgICAgIHRleHQ6IFwiIGNvbmZpZ3VyYXRpb25EZWJ1Z2dpbmcoY29kZSwgZmFpbHVyZSwgc3lzdGVtKTsgXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgc3VjY2Vzc29yOiA4LFxyXG4gICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIkNvbnRpbnVlIHdpdGggc3RyYXRlZ3kgY29uZmlndXJhdGlvbkRlYnVnZ2luZyBieSBjbGlja2luZyBuZXh0IGJ1dHRvbiBcIixcclxuICAgICAgICAgICAgICAgICAgICBjbGFzczogXCJtYXJnaW4tMlwiLFxyXG4gICAgICAgICAgICAgICAgICAgIHZhcmlhYmxlczogW1wiY29kZVwiLCBcImZhaWx1cmVcIiwgXCJzeXN0ZW1cIl0sXHJcbiAgICAgICAgICAgICAgICAgICAgbmV4dFN0cmF0ZWd5OiBcImNvbmZpZ3VyYXRpb25EZWJ1Z2dpbmdcIixcclxuICAgICAgICAgICAgICAgICAgICBhY3RpdmVMaW5lczogWzRdXHJcbiAgICAgICAgICAgICAgICB9LCB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGluZU51bTogNSxcclxuICAgICAgICAgICAgICAgICAgICB0ZXh0OiBcIn0gZWxzZSB7XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgc3VjY2Vzc29yOiA2LFxyXG4gICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIlwiLFxyXG4gICAgICAgICAgICAgICAgICAgIGNsYXNzOiBcIm1hcmdpbi0xXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgbmV4dFN0cmF0ZWd5OiBcIlwiLFxyXG4gICAgICAgICAgICAgICAgICAgIGFjdGl2ZUxpbmVzOiBbNSwzXVxyXG4gICAgICAgICAgICAgICAgfSwge1xyXG4gICAgICAgICAgICAgICAgICAgIGxpbmVOdW06IDYsXHJcbiAgICAgICAgICAgICAgICAgICAgdGV4dDogXCJkZWx0YURlYnVnZ2luZyhjb2RlLCByZWZlcmVuY2VDb2RlLCBmYWlsdXJlKTsgXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgc3VjY2Vzc29yOiA3LFxyXG4gICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIkNvbnRpbnVlIHdpdGggZGVsdGFEZWJ1Z2dpbmcgc3RyYXRlZ3kgYnkgY2xpY2tpbmcgbmV4dCBidXR0b25cIixcclxuICAgICAgICAgICAgICAgICAgICBjbGFzczogXCJtYXJnaW4tMlwiLFxyXG4gICAgICAgICAgICAgICAgICAgIHZhcmlhYmxlczogW1wiY29kZVwiLCBcInJlZmVyZW5jZUNvZGVcIiwgXCJmYWlsdXJlXCJdLFxyXG4gICAgICAgICAgICAgICAgICAgIG5leHRTdHJhdGVneTogXCJkZWx0YURlYnVnZ2luZ1wiLFxyXG4gICAgICAgICAgICAgICAgICAgIGFjdGl2ZUxpbmVzOiBbNl1cclxuICAgICAgICAgICAgICAgIH0sIHtcclxuICAgICAgICAgICAgICAgICAgICBsaW5lTnVtOiA3LFxyXG4gICAgICAgICAgICAgICAgICAgIHRleHQ6IFwifVwiLFxyXG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3NvcjogOCxcclxuICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJcIixcclxuICAgICAgICAgICAgICAgICAgICBjbGFzczogXCJtYXJnaW4tMVwiLFxyXG4gICAgICAgICAgICAgICAgICAgIG5leHRTdHJhdGVneTogXCJcIixcclxuICAgICAgICAgICAgICAgICAgICBhY3RpdmVMaW5lczogWzddXHJcbiAgICAgICAgICAgICAgICB9LCB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGluZU51bTogOCxcclxuICAgICAgICAgICAgICAgICAgICB0ZXh0OiBcIn1cIixcclxuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzb3I6IDksXHJcbiAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgY2xhc3M6IFwiXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgbmV4dFN0cmF0ZWd5OiBcIlwiLFxyXG4gICAgICAgICAgICAgICAgICAgIGFjdGl2ZUxpbmVzOiBbOF1cclxuICAgICAgICAgICAgICAgIH0sIHtcclxuICAgICAgICAgICAgICAgICAgICBsaW5lTnVtOiA5LFxyXG4gICAgICAgICAgICAgICAgICAgIHRleHQ6IFwiXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgc3VjY2Vzc29yOiBcInVuZGVmaW5lZFwiLFxyXG4gICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIlwiLFxyXG4gICAgICAgICAgICAgICAgICAgIGNsYXNzOiBcIlwiLFxyXG4gICAgICAgICAgICAgICAgICAgIG5leHRTdHJhdGVneTogXCJcIixcclxuICAgICAgICAgICAgICAgICAgICBhY3RpdmVMaW5lczogWzldXHJcbiAgICAgICAgICAgICAgICB9XVxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiBcImNvbmZpZ3VyYXRpb25EZWJ1Z2dpbmdcIixcclxuICAgICAgICAgICAgICAgIGRpc3BsYXlOYW1lOiBcIkNvbmZpZ3VyYXRpb24gRGVidWdnaW5nXCIsXHJcbiAgICAgICAgICAgICAgICBzdGF0ZW1lbnRzOiBbe1xyXG4gICAgICAgICAgICAgICAgICAgIGxpbmVOdW06IDAsXHJcbiAgICAgICAgICAgICAgICAgICAgdGV4dDogXCJTdHJhdGVneSBjb25maWd1cmF0aW9uRGVidWdnaW5nKGNvZGUsIGZhaWx1cmUsIHN5c3RlbSl7XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgc3VjY2Vzc29yOiAxLFxyXG4gICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnU3lzdGVtYXRpY2FsbHkgZW51bWVyYXRlIGFuZCBpbmRpdmlkdWFsbHkgdmFyeSBhbGwgcG9zc2libGUgY29uZmlndXJhdGlvbiBwYXJhbWV0ZXJzIHRvIGZpbmQgYSBjb3JyZWN0IGNvbmZpZ3VyYXRpb24uJyxcclxuICAgICAgICAgICAgICAgICAgICBjbGFzczogXCJcIixcclxuICAgICAgICAgICAgICAgICAgICB2YXJpYWJsZXM6IFtcImNvZGVcIiwgXCJmYWlsdXJlXCIsIFwic3lzdGVtXCJdLFxyXG4gICAgICAgICAgICAgICAgICAgIG5leHRTdHJhdGVneTogXCJcIixcclxuICAgICAgICAgICAgICAgICAgICBhY3RpdmVMaW5lczogWzBdXHJcbiAgICAgICAgICAgICAgICB9LCB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGluZU51bTogMSxcclxuICAgICAgICAgICAgICAgICAgICB0ZXh0OiBcImNvbmZpZ3VyYXRpb25QYXJhbWV0ZXJzID0gZW51bWVyYXRlQ29uZmlnUGFyYW1ldGVycyhjb2RlKTtcIixcclxuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzb3I6IDIsXHJcbiAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdVc2Ugc3RyYXRlZ3kgZW51bWVyYXRlQ29uZmlnUGFyYW1ldGVycyB0byBjb2xsZWN0IGNvbmZpZ3VyYXRpb25QYXJhbWV0ZXJzICcsXHJcbiAgICAgICAgICAgICAgICAgICAgY2xhc3M6IFwibWFyZ2luLTFcIixcclxuICAgICAgICAgICAgICAgICAgICB2YXJpYWJsZXM6IFtcImNvZGVcIl0sXHJcbiAgICAgICAgICAgICAgICAgICAgbmV4dFN0cmF0ZWd5OiBcIlwiLFxyXG4gICAgICAgICAgICAgICAgICAgIGFjdGl2ZUxpbmVzOiBbMV1cclxuICAgICAgICAgICAgICAgIH0sIHtcclxuICAgICAgICAgICAgICAgICAgICBsaW5lTnVtOiAyLFxyXG4gICAgICAgICAgICAgICAgICAgIHRleHQ6IFwiZW51bWVyYXRlQ29uZmlnUGFyYW1ldGVycyhzeXN0ZW0pO1wiLFxyXG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3NvcjogMyxcclxuICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJDb250aW51ZSB3aXRoIHN0cmF0ZWd5IGVudW1lcmF0ZUNvbmZpZ1BhcmFtZXRlcnMgYnkgY2xpY2tpbmcgbmV4dCBidXR0b25cIixcclxuICAgICAgICAgICAgICAgICAgICBjbGFzczogXCJtYXJnaW4tMVwiLFxyXG4gICAgICAgICAgICAgICAgICAgIHZhcmlhYmxlczogW1wic3lzdGVtXCJdLFxyXG4gICAgICAgICAgICAgICAgICAgIG5leHRTdHJhdGVneTogXCJlbnVtZXJhdGVDb25maWdQYXJhbWV0ZXJzXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgYWN0aXZlTGluZXM6IFsyXVxyXG4gICAgICAgICAgICAgICAgfSwge1xyXG4gICAgICAgICAgICAgICAgICAgIGxpbmVOdW06IDMsXHJcbiAgICAgICAgICAgICAgICAgICAgdGV4dDogXCJmb3IgKHBhcmFtIGluIGNvbmZpZ3VyYXRpb25QYXJhbWV0ZXJzKSB7XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgc3VjY2Vzc29yOiA0LFxyXG4gICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIiBmb3IgZWFjaCBwYXJhbWV0ZXIgdGhhdCB5b3UgaGF2ZSBhZGRlZCB0byB0aGUgbGlzdCBvZiBjb25maWd1cmF0aW9uUGFyYW1zXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgY2xhc3M6IFwibWFyZ2luLTFcIixcclxuICAgICAgICAgICAgICAgICAgICBuZXh0U3RyYXRlZ3k6IFwiXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgYWN0aXZlTGluZXM6IFszXVxyXG4gICAgICAgICAgICAgICAgfSwge1xyXG4gICAgICAgICAgICAgICAgICAgIGxpbmVOdW06IDQsXHJcbiAgICAgICAgICAgICAgICAgICAgdGV4dDogXCJzeXN0ZW0uY2hhbmdlQ29uZmlndXJhdGlvblBhcmFtZXRlcigpO1wiLFxyXG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3NvcjogNSxcclxuICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogXCIgY2hhbmdlIHRoZSBjb25maWcgcGFyYW1zIGFuZCBleGVjdXRlIHRoZSBjb2RlXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgY2xhc3M6IFwibWFyZ2luLTJcIixcclxuICAgICAgICAgICAgICAgICAgICBuZXh0U3RyYXRlZ3k6IFwiXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgYWN0aXZlTGluZXM6IFs0XVxyXG4gICAgICAgICAgICAgICAgfSwge1xyXG4gICAgICAgICAgICAgICAgICAgIGxpbmVOdW06IDUsXHJcbiAgICAgICAgICAgICAgICAgICAgdGV4dDogXCIgbmV3RXhlY3V0aW9uID0gZXhlY3V0ZShjb2RlLCBzeXN0ZW0pOyBcIixcclxuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzb3I6IDYsXHJcbiAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiZm9yIHRoZSBjaGFuZ2VkIHBhcmFtZXRlcnMsIGV4ZWN1dGUgdGhlIGNvZGUgYW5kIHNlZSBpZiB0aGUgZmFpbHVyZSBnZXQgZml4ZWQgb3Igbm90XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgY2xhc3M6IFwibWFyZ2luLTJcIixcclxuICAgICAgICAgICAgICAgICAgICB2YXJpYWJsZXM6IFtcImNvZGVcIiwgXCJzeXN0ZW1cIl0sXHJcbiAgICAgICAgICAgICAgICAgICAgbmV4dFN0cmF0ZWd5OiBcIlwiLFxyXG4gICAgICAgICAgICAgICAgICAgIGFjdGl2ZUxpbmVzOiBbNV1cclxuICAgICAgICAgICAgICAgIH0sIHtcclxuICAgICAgICAgICAgICAgICAgICBsaW5lTnVtOiA2LFxyXG4gICAgICAgICAgICAgICAgICAgIHRleHQ6IFwiIGlmKG5ld0V4ZWN1dGlvbiB0aHJvd3MgZmFpbHVyZSkge1wiLFxyXG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3NvcjogNyxcclxuICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJpZiB0aGUgY2hhbmdlZCBwYXJhbWV0ZXJzIGRvIG5vdCBoYXZlIGFueSBlZmZlY3QgaW4gZml4aW5nIHRoZSBmYWlsdXJlIGFuZCB5b3Ugc3RpbGwgaGF2ZSB0aGUgZmFpbHVyZSxcIixcclxuICAgICAgICAgICAgICAgICAgICBjbGFzczogXCJtYXJnaW4tMlwiLFxyXG4gICAgICAgICAgICAgICAgICAgIHZhcmlhYmxlczogW1wiY29kZVwiLCBcInN5c3RlbVwiXSxcclxuICAgICAgICAgICAgICAgICAgICBuZXh0U3RyYXRlZ3k6IFwiXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgYWN0aXZlTGluZXM6IFs2LCA5XVxyXG4gICAgICAgICAgICAgICAgfSwge1xyXG4gICAgICAgICAgICAgICAgICAgIGxpbmVOdW06IDcsXHJcbiAgICAgICAgICAgICAgICAgICAgdGV4dDogXCJzeXN0ZW0ucmV2ZXJ0Q29uZmlndXJhdGlvblBhcmFtZXRlcigpO1wiLFxyXG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3NvcjogOCxcclxuICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogXCIgcmV2ZXJ0IGNoYW5nZXNcIixcclxuICAgICAgICAgICAgICAgICAgICBjbGFzczogXCJtYXJnaW4tM1wiLFxyXG4gICAgICAgICAgICAgICAgICAgIG5leHRTdHJhdGVneTogXCJcIixcclxuICAgICAgICAgICAgICAgICAgICBhY3RpdmVMaW5lczogWzddXHJcbiAgICAgICAgICAgICAgICB9LCB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGluZU51bTogOCxcclxuICAgICAgICAgICAgICAgICAgICB0ZXh0OiBcImNvbnRpbnVlO1wiLFxyXG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3NvcjogMTEsXHJcbiAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiY29udGludWUgd2l0aCBuZXh0IHBhcmFtXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgY2xhc3M6IFwibWFyZ2luLTNcIixcclxuICAgICAgICAgICAgICAgICAgICBuZXh0U3RyYXRlZ3k6IFwiXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgYWN0aXZlTGluZXM6IFs4XVxyXG4gICAgICAgICAgICAgICAgfSwge1xyXG4gICAgICAgICAgICAgICAgICAgIGxpbmVOdW06IDksXHJcbiAgICAgICAgICAgICAgICAgICAgdGV4dDogXCJ9IGVsc2Uge1wiLFxyXG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3NvcjogMTAsXHJcbiAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiSWYgbm8gZmFpbHVyZSBvY2N1cnJlZCwgeW91IHN1Y2NlZWRlZCB0byBmaXggdGhlIHByb2JsZW0uXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgY2xhc3M6IFwibWFyZ2luLTJcIixcclxuICAgICAgICAgICAgICAgICAgICBuZXh0U3RyYXRlZ3k6IFwiXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgYWN0aXZlTGluZXM6IFs5LDZdXHJcbiAgICAgICAgICAgICAgICB9LCB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGluZU51bTogMTAsXHJcbiAgICAgICAgICAgICAgICAgICAgdGV4dDogXCJyZXR1cm4gU1VDQ0VTUztcIixcclxuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzb3I6IDExLFxyXG4gICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIiBDb25ncmF0cywgeW91IGZpeGVkIHRoZSBmYWlsdXJlLlwiLFxyXG4gICAgICAgICAgICAgICAgICAgIGNsYXNzOiBcIm1hcmdpbi0zXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgbmV4dFN0cmF0ZWd5OiBcIlwiLFxyXG4gICAgICAgICAgICAgICAgICAgIGFjdGl2ZUxpbmVzOiBbMTBdXHJcbiAgICAgICAgICAgICAgICB9LCB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGluZU51bTogMTEsXHJcbiAgICAgICAgICAgICAgICAgICAgdGV4dDogXCJ9XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgc3VjY2Vzc29yOiAxMixcclxuICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJcIixcclxuICAgICAgICAgICAgICAgICAgICBjbGFzczogXCJtYXJnaW4tMlwiLFxyXG4gICAgICAgICAgICAgICAgICAgIG5leHRTdHJhdGVneTogXCJcIixcclxuICAgICAgICAgICAgICAgICAgICBhY3RpdmVMaW5lczogWzExXVxyXG4gICAgICAgICAgICAgICAgfSwge1xyXG4gICAgICAgICAgICAgICAgICAgIGxpbmVOdW06IDEyLFxyXG4gICAgICAgICAgICAgICAgICAgIHRleHQ6IFwifVwiLFxyXG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3NvcjogMTMsXHJcbiAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgY2xhc3M6IFwibWFyZ2luLTFcIixcclxuICAgICAgICAgICAgICAgICAgICBuZXh0U3RyYXRlZ3k6IFwiXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgYWN0aXZlTGluZXM6IFsxMl1cclxuICAgICAgICAgICAgICAgIH0sIHtcclxuICAgICAgICAgICAgICAgICAgICBsaW5lTnVtOiAxMyxcclxuICAgICAgICAgICAgICAgICAgICB0ZXh0OiBcIlwiLFxyXG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3NvcjogXCJ1bmRlZmluZWRcIixcclxuICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJcIixcclxuICAgICAgICAgICAgICAgICAgICBjbGFzczogXCJtYXJnaW4tMVwiLFxyXG4gICAgICAgICAgICAgICAgICAgIG5leHRTdHJhdGVneTogXCJcIixcclxuICAgICAgICAgICAgICAgICAgICBhY3RpdmVMaW5lczogWzEzXVxyXG4gICAgICAgICAgICAgICAgfV1cclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogXCJlbnVtZXJhdGVDb25maWdQYXJhbWV0ZXJzXCIsXHJcbiAgICAgICAgICAgICAgICBkaXNwbGF5TmFtZTogXCJFbnVtZXJhdGUgQ29uZmlndXJhdGlvbiBQYXJhbWV0ZXJzXCIsXHJcbiAgICAgICAgICAgICAgICBzdGF0ZW1lbnRzOiBbe1xyXG4gICAgICAgICAgICAgICAgICAgIGxpbmVOdW06IDAsXHJcbiAgICAgICAgICAgICAgICAgICAgdGV4dDogXCJTdHJhdGVneSBlbnVtZXJhdGVDb25maWdQYXJhbWV0ZXJzKHN5c3RlbSl7XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgc3VjY2Vzc29yOiAxLFxyXG4gICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQnJhaW5zdG9ybSBhIGxpc3Qgb2YgYWxsIGNvbmZpZ3VyYXRpb24gcGFyYW1ldGVycyB5b3UgbWlnaHQgYmUgYWJsZSB0byB2YXJ5LicgK1xyXG4gICAgICAgICAgICAgICAgICAgICdBIGNvbmZpZ3VyYXRpb24gcGFyYW1hdGVyIGhlcmUgcmVmZXJzIHRvIHNvbWUgYXNwZWN0IG9mIGhvdyB0aGUgY29kZSBpcyBiZWluZyBleGVjdXRlZCB0aGF0IG1pZ2h0IGJlIGNoYW5nZWQuJyArXHJcbiAgICAgICAgICAgICAgICAgICAgJ1RoaXMgZG9lcyBOT1QgcmVmZXIgdG8gY2hhbmdlcyB0byB0aGUgY29kZSBpdHNlbGYuIFJhdGhlciwgaXQgcmVmZXJzIHRvIGNoYW5nZXMgdG8gZXZlcnl0aGluZyBlbHNlIHRoYXQgaW5mbHVlbmNlcyBIT1cgdGhlIGNvZGUgaXMgZXhlY3V0ZWQuJyArXHJcbiAgICAgICAgICAgICAgICAgICAgJ1RoaXMgbWlnaHQgaW5jbHVkZSB0aGUgZGV2ZWxvcG1lbnQgZW52aXJvbm1lbnQgdGhhdCBydW5zIHRoZSBjb2RlLCB0aGUgdmVyc2lvbiBvZiB0aGUgc3lzdGVtIHRoYXQgaXMgYmVpbmcgdXNlZCwgdGhlIG9wZXJhdGluZyBzeXN0ZW0gb24gd2hpY2ggdGhlIGNvZGUgaXMgYmVpbmcgZXhlY3V0ZWQsIHRoZSBydW50aW1lIGVuZ2luZSBiZWluZyB1c2VkIHRvIGV4ZWN1dGUgdGhlIGNvZGUsICcgK1xyXG4gICAgICAgICAgICAgICAgICAgICd0aGUgY29uZmlndXJhdGlvbiBmaWxlcyB0aGF0IGFyZSBiZWluZyB1c2VkIHRvIGluaXRpYWxpemUgdGhlIHN5c3RlbS4nLFxyXG4gICAgICAgICAgICAgICAgICAgIGNsYXNzOiBcIlwiLFxyXG4gICAgICAgICAgICAgICAgICAgIG5leHRTdHJhdGVneTogXCJcIixcclxuICAgICAgICAgICAgICAgICAgICBhY3RpdmVMaW5lczogWzBdXHJcbiAgICAgICAgICAgICAgICB9LCB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGluZU51bTogMSxcclxuICAgICAgICAgICAgICAgICAgICB0ZXh0OiBcImNvbmZpZ3VyYXRpb25QYXJhbWV0ZXJzID0ge307XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgc3VjY2Vzc29yOiAyLFxyXG4gICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIk1ha2UgYW4gZW1wdHkgbGlzdCBvZiBwYXJhbWV0ZXJzXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgY2xhc3M6IFwibWFyZ2luLTFcIixcclxuICAgICAgICAgICAgICAgICAgICBuZXh0U3RyYXRlZ3k6IFwiXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgYWN0aXZlTGluZXM6IFsxXVxyXG4gICAgICAgICAgICAgICAgfSwge1xyXG4gICAgICAgICAgICAgICAgICAgIGxpbmVOdW06IDIsXHJcbiAgICAgICAgICAgICAgICAgICAgdGV4dDogXCJ3aGlsZSAobW9yZUlkZWFzKSB7XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgc3VjY2Vzc29yOiAzLFxyXG4gICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIlwiLFxyXG4gICAgICAgICAgICAgICAgICAgIGNsYXNzOiBcIm1hcmdpbi0xXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgbmV4dFN0cmF0ZWd5OiBcIlwiLFxyXG4gICAgICAgICAgICAgICAgICAgIGFjdGl2ZUxpbmVzOiBbMiwgNF1cclxuXHJcbiAgICAgICAgICAgICAgICB9LCB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGluZU51bTogMyxcclxuICAgICAgICAgICAgICAgICAgICB0ZXh0OiBcImNvbmZpZ3VyYXRpbm9QYXJhbWV0ZXJzLmFkZChicmFpbnN0b3JtQ29uZmlnUGFyYW1ldGVycygpKTtcIixcclxuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzb3I6IDIsXHJcbiAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiQWRkIGFzIG11Y2ggcGFyYW1ldGVycyBhcyB5b3UgY2FuIGFkZCBpbmNsdWRpbmc6XCIgK1xyXG4gICAgICAgICAgICAgICAgICAgIFwidGhlIGRldmVsb3BtZW50IGVudmlyb25tZW50IHRoYXQgcnVucyB0aGUgY29kZSxcIiArXHJcbiAgICAgICAgICAgICAgICAgICAgXCJ0aGUgdmVyc2lvbiBvZiB0aGUgc3lzdGVtIHRoYXQgaXMgYmVpbmcgdXNlZCxcIiArXHJcbiAgICAgICAgICAgICAgICAgICAgXCJ0aGUgb3BlcmF0aW5nIHN5c3RlbSBvbiB3aGljaCB0aGUgY29kZSBpcyBiZWluZyBleGVjdXRlZCwgXCIgK1xyXG4gICAgICAgICAgICAgICAgICAgIFwidGhlIHJ1bnRpbWUgZW5naW5lIGJlaW5nIHVzZWQgdG8gZXhlY3V0ZSB0aGUgY29kZSwgXCIgK1xyXG4gICAgICAgICAgICAgICAgICAgIFwidGhlIGNvbmZpZ3VyYXRpb24gZmlsZXMgdGhhdCBhcmUgYmVpbmcgdXNlZCB0byBpbml0aWFsaXplIHRoZSBzeXN0ZW0gXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgY2xhc3M6IFwibWFyZ2luLTJcIixcclxuICAgICAgICAgICAgICAgICAgICBuZXh0U3RyYXRlZ3k6IFwiXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgYWN0aXZlTGluZXM6IFszXSxcclxuICAgICAgICAgICAgICAgICAgICBsb29wOiB0cnVlXHJcbiAgICAgICAgICAgICAgICB9LCB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGluZU51bTogNCxcclxuICAgICAgICAgICAgICAgICAgICB0ZXh0OiBcImlmKG5vIG1vcmUgaWRlYXMpIHJldHVybiBjb25maWd1cmF0aW9uUGFyYW1ldGVycztcIixcclxuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzb3I6IDUsXHJcbiAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiZ28gYmFjayB0byB0aGUgc3RyYXRlZ3kgOiBjb25maWd1cmF0aW9uRGVidWdnaW5nIHdpdGggdGhlIGxpc3Qgb2YgcGFyYW1ldGVycyB0byBjb250aW51ZS5cIixcclxuICAgICAgICAgICAgICAgICAgICBjbGFzczogXCJtYXJnaW4tMVwiLFxyXG4gICAgICAgICAgICAgICAgICAgIG5leHRTdHJhdGVneTogXCJcIixcclxuICAgICAgICAgICAgICAgICAgICBhY3RpdmVMaW5lczogWzQsIDJdXHJcbiAgICAgICAgICAgICAgICB9LCB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGluZU51bTogNSxcclxuICAgICAgICAgICAgICAgICAgICB0ZXh0OiBcIn1cIixcclxuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzb3I6IDYsXHJcbiAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgY2xhc3M6IFwiXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgbmV4dFN0cmF0ZWd5OiBcIlwiLFxyXG4gICAgICAgICAgICAgICAgICAgIGFjdGl2ZUxpbmVzOiBbNV1cclxuICAgICAgICAgICAgICAgIH0sIHtcclxuICAgICAgICAgICAgICAgICAgICBsaW5lTnVtOiA2LFxyXG4gICAgICAgICAgICAgICAgICAgIHRleHQ6IFwiXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgc3VjY2Vzc29yOiBcInVuZGVmaW5lZFwiLFxyXG4gICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIlwiLFxyXG4gICAgICAgICAgICAgICAgICAgIGNsYXNzOiBcIlwiLFxyXG4gICAgICAgICAgICAgICAgICAgIG5leHRTdHJhdGVneTogXCJcIixcclxuICAgICAgICAgICAgICAgICAgICBhY3RpdmVMaW5lczogWzZdXHJcbiAgICAgICAgICAgICAgICB9XVxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiBcImRlbHRhRGVidWdnaW5nXCIsXHJcbiAgICAgICAgICAgICAgICBkaXNwbGF5TmFtZTogXCJEZWx0YSBEZWJ1Z2dpbmdcIixcclxuICAgICAgICAgICAgICAgIHN0YXRlbWVudHM6IFt7XHJcbiAgICAgICAgICAgICAgICAgICAgbGluZU51bTogMCxcclxuICAgICAgICAgICAgICAgICAgICB0ZXh0OiBcIlN0cmF0ZWd5IGRlbHRhRGVidWdnaW5nKGNvZGUsIHJlZmVyZW5jZUNvZGUsIGZhaWx1cmUpe1wiLFxyXG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3NvcjogMSxcclxuICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJGaW5kIHRoZSBjaGFuZ2VzIGZyb20gcmVmZXJlbmNlQ29kZSB0byBjb2RlIHRoYXQgY2F1c2UgZmFpbHVyZSwgbWluaW1pemluZyB0aGUgY2F1c2Ugb2YgZmFpbHVyZSB0byBhIG1pbmltYWwgY29kZSBlZGl0LlwiLFxyXG4gICAgICAgICAgICAgICAgICAgIGNsYXNzOiBcIlwiLFxyXG4gICAgICAgICAgICAgICAgICAgIG5leHRTdHJhdGVneTogXCJcIixcclxuICAgICAgICAgICAgICAgICAgICBhY3RpdmVMaW5lczogWzBdXHJcbiAgICAgICAgICAgICAgICB9LCB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGluZU51bTogMSxcclxuICAgICAgICAgICAgICAgICAgICB0ZXh0OiBcInJlZmVyZW5jZUNvZGUub25lRWRpdFRvTG9va0xpa2UoY29kZSk7XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgc3VjY2Vzc29yOiAyLFxyXG4gICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIlwiLFxyXG4gICAgICAgICAgICAgICAgICAgIGNsYXNzOiBcIm1hcmdpbi0xXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgbmV4dFN0cmF0ZWd5OiBcIlwiLFxyXG4gICAgICAgICAgICAgICAgICAgIGFjdGl2ZUxpbmVzOiBbMV1cclxuICAgICAgICAgICAgICAgIH0sIHtcclxuICAgICAgICAgICAgICAgICAgICBsaW5lTnVtOiAyLFxyXG4gICAgICAgICAgICAgICAgICAgIHRleHQ6IFwiZXhlY3V0ZShyZWZlcmVuY2VDb2RlLCBzeXN0ZW0pXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgc3VjY2Vzc29yOiAzLFxyXG4gICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIkV4ZWN1dGUgdGhlIGNoYW5nZWQgY29kZSB0byBzZWUgaWYgaXQgZmFpbHMgb3Igc3VjY2VlZHNcIixcclxuICAgICAgICAgICAgICAgICAgICBjbGFzczogXCJtYXJnaW4tMVwiLFxyXG4gICAgICAgICAgICAgICAgICAgIG5leHRTdHJhdGVneTogXCJcIixcclxuICAgICAgICAgICAgICAgICAgICBhY3RpdmVMaW5lczogWzJdXHJcbiAgICAgICAgICAgICAgICB9LCB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGluZU51bTogMyxcclxuICAgICAgICAgICAgICAgICAgICB0ZXh0OiBcImlmICghIChleGVjdXRlKHJlZmVyZW5jZUNvZGUsIHN5c3RlbSkgdGhyb3dzIGZhaWx1cmUpKSB7XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgc3VjY2Vzc29yOiA0LFxyXG4gICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIklmIHRoZSBleGVjdXRpb24gb2YgbmV3IGNvZGUgZG9lcyBub3QgdGhyb3cgZmFpbHVyZVwiLFxyXG4gICAgICAgICAgICAgICAgICAgIGNsYXNzOiBcIm1hcmdpbi0xXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgbmV4dFN0cmF0ZWd5OiBcIlwiLFxyXG4gICAgICAgICAgICAgICAgICAgIGFjdGl2ZUxpbmVzOiBbMywgNV1cclxuICAgICAgICAgICAgICAgIH0sIHtcclxuICAgICAgICAgICAgICAgICAgICBsaW5lTnVtOiA0LFxyXG4gICAgICAgICAgICAgICAgICAgIHRleHQ6IFwicmV0dXJuIFNVQ0NFU1M7IFwiLFxyXG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3NvcjogMTAsXHJcbiAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiQ29uZ3JhdHMhIHlvdSBzdWNjZWVkIHRvIGZpeCB0aGUgcHJvYmxlbVwiLFxyXG4gICAgICAgICAgICAgICAgICAgIGNsYXNzOiBcIm1hcmdpbi0yXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgbmV4dFN0cmF0ZWd5OiBcIlwiLFxyXG4gICAgICAgICAgICAgICAgICAgIGFjdGl2ZUxpbmVzOiBbNF1cclxuICAgICAgICAgICAgICAgIH0sIHtcclxuICAgICAgICAgICAgICAgICAgICBsaW5lTnVtOiA1LFxyXG4gICAgICAgICAgICAgICAgICAgIHRleHQ6IFwifSBlbHNlIHtcIixcclxuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzb3I6IDYsXHJcbiAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiSWYgdGhlIGV4ZWN1dGlvbiBvZiBuZXcgY29kZSB0aHJvd3MgZmFpbHVyZSBcIixcclxuICAgICAgICAgICAgICAgICAgICBjbGFzczogXCJtYXJnaW4tMVwiLFxyXG4gICAgICAgICAgICAgICAgICAgIG5leHRTdHJhdGVneTogXCJcIixcclxuICAgICAgICAgICAgICAgICAgICBhY3RpdmVMaW5lczogWyA1LDNdXHJcbiAgICAgICAgICAgICAgICB9LCB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGluZU51bTogNixcclxuICAgICAgICAgICAgICAgICAgICB0ZXh0OiBcInJldmVydChyZWZlcmVuY2VDb2RlKTtcIixcclxuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzb3I6IDcsXHJcbiAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiUmV2ZXJ0IHRoZSBjaGFuZ2VzIHlvdSBoYXZlIGFwcGxpZWRcIixcclxuICAgICAgICAgICAgICAgICAgICBjbGFzczogXCJtYXJnaW4tMlwiLFxyXG4gICAgICAgICAgICAgICAgICAgIG5leHRTdHJhdGVneTogXCJcIixcclxuICAgICAgICAgICAgICAgICAgICBhY3RpdmVMaW5lczogWzZdXHJcbiAgICAgICAgICAgICAgICB9LCB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGluZU51bTogNyxcclxuICAgICAgICAgICAgICAgICAgICB0ZXh0OiBcInJlZmVyZW5jZUNvZGUub25lRWRpdFRvTG9va0xpa2UoY29kZSk7XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgc3VjY2Vzc29yOiA4LFxyXG4gICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIlwiLFxyXG4gICAgICAgICAgICAgICAgICAgIGNsYXNzOiBcIm1hcmdpbi0yXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgbmV4dFN0cmF0ZWd5OiBcIlwiLFxyXG4gICAgICAgICAgICAgICAgICAgIGFjdGl2ZUxpbmVzOiBbN11cclxuICAgICAgICAgICAgICAgIH0sIHtcclxuICAgICAgICAgICAgICAgICAgICBsaW5lTnVtOiA4LFxyXG4gICAgICAgICAgICAgICAgICAgIHRleHQ6IFwifVwiLFxyXG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3NvcjogOSxcclxuICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJcIixcclxuICAgICAgICAgICAgICAgICAgICBjbGFzczogXCJtYXJnaW4tMVwiLFxyXG4gICAgICAgICAgICAgICAgICAgIG5leHRTdHJhdGVneTogXCJcIixcclxuICAgICAgICAgICAgICAgICAgICBhY3RpdmVMaW5lczogWzhdXHJcbiAgICAgICAgICAgICAgICB9LCB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGluZU51bTogOSxcclxuICAgICAgICAgICAgICAgICAgICB0ZXh0OiBcIn1cIixcclxuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzb3I6IDEwLFxyXG4gICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIlwiLFxyXG4gICAgICAgICAgICAgICAgICAgIGNsYXNzOiBcIlwiLFxyXG4gICAgICAgICAgICAgICAgICAgIG5leHRTdHJhdGVneTogXCJcIixcclxuICAgICAgICAgICAgICAgICAgICBhY3RpdmVMaW5lczogWzldXHJcbiAgICAgICAgICAgICAgICB9LCB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGluZU51bTogMTAsXHJcbiAgICAgICAgICAgICAgICAgICAgdGV4dDogXCJcIixcclxuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzb3I6IFwidW5kZWZpbmVkXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgY2xhc3M6IFwiXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgbmV4dFN0cmF0ZWd5OiBcIlwiLFxyXG4gICAgICAgICAgICAgICAgICAgIGFjdGl2ZUxpbmVzOiBbMTBdXHJcbiAgICAgICAgICAgICAgICB9XVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgXVxyXG4gICAgfSxcclxuICAgIHtcclxuICAgICAgICBvd25lcjpcIkFuZHkgQ29cIixcclxuICAgICAgICBuYW1lOlwibG9jYWxpemVGYWlsdXJlXCIsXHJcbiAgICAgICAgZGlzcGxheU5hbWU6XCJGYXVsdCBsb2NhbGl6YXRpb25cIixcclxuICAgICAgICBwcm9jZXNzRGVzY3JpcHRpb24gOlwiV2hlbiB3ZSBzYXkg4oCcZGVidWfigJ0sIHdlIGFyZSB1c3VhbGx5IHJlZmVycmluZyB0byBtYW55IGRpZmZlcmVudCBhY3Rpdml0aWVzLCBpbmNsdWRpbmcgcmVwcm9kdWNpbmcgYSBmYWlsdXJlLCBsb2NhbGl6aW5nIHRoZSByb290IGNhdXNlcyBvZiBhIGZhaWx1cmUsXCIgK1xyXG4gICAgICAgIFwiIGFuZCBwYXRjaGluZyBhbiBpbXBsZW1lbnRhdGlvbiB0byBwcmV2ZW50IHRob3NlIGNhdXNlcy4gVGhlcmUgYXJlIG1hbnkgc3RyYXRlZ2llcyBmb3IgZWFjaCBvZiB0aGVzZSBhY3Rpdml0aWVzLiBCZWxvdyBpcyBhIHN0cmF0ZWd5IGZvciB0aGUgZmF1bHQgbG9jYWxpemF0aW9uIHBhcnQgb2YgZGVidWdnaW5nLlwiLFxyXG4gICAgICAgIHN0cmF0ZWd5RGVzY3JpcHRpb24gOiBcIkJlbG93IGlzIGEgYWxnb3JpdGhtIHlvdSBjYW4gZm9sbG93IG1hbnVhbGx5LiBJZiB5b3UgZm9sbG93IGl0IHJlbGlhYmx5LCBpdCBzaG91bGQgcmVzdWx0IGluIHN1Y2Nlc3NmdWwgbG9jYWxpemF0aW9uIG9mIGEgZGVmZWN0LiBTaW5jZSBpdOKAmXMgc29tZXRoaW5nIGEgcGVyc29uIFwiICtcclxuICAgICAgICBcImV4ZWN1dGVzLCBJ4oCZdmUgd3JpdHRlbiB0aGUgc3RyYXRlZ3kgaW4gYSBsb29zZWx5IGZvcm1hbCBwc2V1ZG9jb2RlLiBXaGlsZSB5b3UgZXhlY3V0ZSB0aGUgc3RyYXRlZ3ksIGtlZXAgdHJhY2sgb2YgYW55IHZhcmlhYmxlcyB5b3UgbmVlZCB0byB0cmFjayBpbiBhIHRleHQgZWRpdG9yIG9yIHBhcGVyLFwiICtcclxuICAgICAgICBcIiBhbmQga2VlcCB0cmFjayBvZiB3aGljaCBzdGVwIGFuZCBmdW5jdGlvbiB5b3XigJlyZSBvbiwganVzdCBsaWtlIGEgY29tcHV0ZXIgZG9lcyB3aGVuIGl0IGV4ZWN1dGVzIGEgcHJvZ3JhbS5cIixcclxuICAgICAgICBhbGxWYXJpYWJsZXMgOltcclxuICAgICAgICAgICAgICAgIHtuYW1lOiAnZmFpbHVyZScsIHZhbDogbnVsbH0sXHJcbiAgICAgICAgICAgICAgICB7bmFtZTogJ3ZhbHVlJywgdmFsOiBudWxsfSxcclxuICAgICAgICAgICAgICAgIHtuYW1lOiAnTCcsIHZhbDogbnVsbH0sXHJcbiAgICAgICAgICAgICAgICB7bmFtZTogJ1YnLCB2YWw6IG51bGx9XSxcclxuICAgICAgICBzdWJTdHJhdGVnaWVzOiBbXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6XCJsb2NhbGl6ZUZhaWx1cmVcIixcclxuICAgICAgICAgICAgICAgIGRpc3BsYXlOYW1lIDpcIkZhdWx0IExvY2FsaXphdGlvblwiLFxyXG4gICAgICAgICAgICAgICAgc3RhdGVtZW50czpbXHJcbiAgICAgICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsaW5lTnVtOiAwLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXh0OiBcIlN0cmF0ZWd5IGxvY2FsaXplRmFpbHVyZShmYWlsdXJlKXtcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2Vzc29yOiAxLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJSZXByb2R1Y2UgdGhlIGZhaWx1cmUgYnkgZmluZGluZyBhIHNlcXVlbmNlIG9mIGlucHV0cyB0aGF0IHByb2R1Y2VzIHRoZSBmYWlsdXJlIHJlbGlhYmx5LlwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjbGFzczogJycsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhcmlhYmxlczogW1wiZmFpbHVyZVwiXSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgbmV4dFN0cmF0ZWd5OiBcIlwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBhY3RpdmVMaW5lczogWzBdXHJcbiAgICAgICAgICAgICAgICAgICAgfSx7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpbmVOdW06IDEsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRleHQ6IFwiUmVwcm9kdWNlIHRoZSBmYWlsdXJlXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3NvcjogMixcclxuICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiUmVwcm9kdWNlIHRoZSBmYWlsdXJlIGJ5IGZpbmRpbmcgYSBzZXF1ZW5jZSBvZiBpbnB1dHMgdGhhdCBwcm9kdWNlcyB0aGUgZmFpbHVyZSByZWxpYWJseS5cIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3M6IFwibWFyZ2luLTFcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyaWFibGVzOiBbXCJmYWlsdXJlXCJdLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBuZXh0U3RyYXRlZ3k6IFwiXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjdGl2ZUxpbmVzOiBbMV1cclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGluZU51bTogMixcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGV4dDogXCIgV3JpdGUgZG93biB0aGUgaW5wdXRzIGZvciBsYXRlciByZWZlcmVuY2UuXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3NvcjogMyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiVG8gdGhlIGV4dGVudCB0aGF0IHlvdSBjYW4sIHdyaXRlIGRvd24gdGhlIGlucHV0cyBmb3IgbGF0ZXIgcmVmZXJlbmNlLlwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjbGFzczogXCJtYXJnaW4tMVwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXJpYWJsZXM6IFtcImZhaWx1cmVcIl0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5leHRTdHJhdGVneTogXCJcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgYWN0aXZlTGluZXM6IFsyXVxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsaW5lTnVtOiAzLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXh0OiBcIlJlcHJvZHVjZSB0aGUgZmFpbHVyZSBieSBmaW5kaW5nIGEgc2VxdWVuY2Ugb2YgaW5wdXRzIHRoYXQgcHJvZHVjZXMgdGhlIGZhaWx1cmUgcmVsaWFibHkuXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3NvcjogNCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzOiBcIm1hcmdpbi0xXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhcmlhYmxlczogW1wiZmFpbHVyZVwiXSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgbmV4dFN0cmF0ZWd5OiBcIlwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBhY3RpdmVMaW5lczogWzNdXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpbmVOdW06NCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGV4dDpcIklmIHRoZSBmYWlsdXJlIGlzIG91dHB1dCB0aGF0IHNob3VsZG7igJl0IGhhdmUgb2NjdXJyZWR7XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3Nvcjo1LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjpcIlwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjbGFzczpcIm1hcmdpbi0xXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhcmlhYmxlczpbXCJmYWlsdXJlXCJdLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBuZXh0U3RyYXRlZ3k6XCJcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgYWN0aXZlTGluZXM6WzQsNl1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgLFxyXG4gICAgICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGluZU51bTo1LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXh0OlwibG9jYWxpemVXcm9uZ091dHB1dChmYWlsdXJlKVwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzb3I6OSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246XCJcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3M6XCJtYXJnaW4tMlwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXJpYWJsZXM6W1wiZmFpbHVyZVwiXSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgbmV4dFN0cmF0ZWd5OlwibG9jYWxpemVXcm9uZ091dHB1dFwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBhY3RpdmVMaW5lczpbNV1cclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGluZU51bTo2LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXh0OlwifSBlbHNlIHtcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2Vzc29yOjcsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOlwiIGlmIHRoZSBmYWlsdXJlIGlzIG91dHB1dCB0aGF0IHNob3VsZCBoYXZlIG9jY3VycmVkLCBidXQgZGlkbuKAmXRcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3M6XCJtYXJnaW4tMVwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXJpYWJsZXM6W1wiZmFpbHVyZVwiXSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgbmV4dFN0cmF0ZWd5OlwiXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjdGl2ZUxpbmVzOls2LDRdXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpbmVOdW06NyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGV4dDpcImxvY2FsaXplTWlzc2luZ091dHB1dFwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzb3I6OSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246XCJcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3M6XCJtYXJnaW4tMlwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXJpYWJsZXM6W1wiZmFpbHVyZVwiXSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgbmV4dFN0cmF0ZWd5OlwibG9jYWxpemVNaXNzaW5nT3V0cHV0XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjdGl2ZUxpbmVzOls3XVxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsaW5lTnVtOjgsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRleHQ6XCJ9XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3Nvcjo5LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjpcIlwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjbGFzczpcIm1hcmdpbi0xXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhcmlhYmxlczpbXCJmYWlsdXJlXCJdLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBuZXh0U3RyYXRlZ3k6XCJsb2NhbGl6ZU1pc3NpbmdPdXRwdXRcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgYWN0aXZlTGluZXM6WzhdXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpbmVOdW06OSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGV4dDpcIn1cIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2Vzc29yOjEwLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjpcIlwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjbGFzczpcIlwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXJpYWJsZXM6W1wiZmFpbHVyZVwiXSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgbmV4dFN0cmF0ZWd5OlwibG9jYWxpemVNaXNzaW5nT3V0cHV0XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjdGl2ZUxpbmVzOls5XVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAsIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGluZU51bTogMTAsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRleHQ6IFwiXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3NvcjogXCJ1bmRlZmluZWRcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzOiBcIlwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBuZXh0U3RyYXRlZ3k6IFwiXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjdGl2ZUxpbmVzOiBbMTBdXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgXVxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOlwibG9jYWxpemVXcm9uZ091dHB1dFwiLFxyXG4gICAgICAgICAgICAgICAgZGlzcGxheU5hbWUgOlwiTG9jYWxpemUgV3JvbmcgT3V0cHV0XCIsXHJcbiAgICAgICAgICAgICAgICBzdGF0ZW1lbnRzOltcclxuICAgICAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpbmVOdW06MCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGV4dDpcIlN0cmF0ZWd5IGxvY2FsaXplV3JvbmdPdXRwdXQoZmFpbHVyZSl7IFwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzb3I6MSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246XCJcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3M6XCJcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyaWFibGVzOltcImZhaWx1cmVcIl0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5leHRTdHJhdGVneTpcIlwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBhY3RpdmVMaW5lczpbMF1cclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGluZU51bToxLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXh0OlwiRmluZCB0aGUgbGluZSBvZiBjb2RlIEwgdGhhdCBwcm9kdWNlZCB0aGUgaW5jb3JyZWN0IG91dHB1dFwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzb3I6MixcclxuICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246XCIgRmluZCB0aGUgbGluZSBvZiBjb2RlIEwgaW4gdGhlIGFwcGxpY2F0aW9uIHRoYXQgbW9zdCBkaXJlY3RseSBwcm9kdWNlZCB0aGUgaW5jb3JyZWN0IG91dHB1dC4gRm9yIGV4YW1wbGUsIGlmIGl0IHdhcyBjb25zb2xlIG91dHB1dCwgaXTigJlzIGEgcHJpbnQgc3RhdGVtZW50OyBpZiBpdOKAmXMgdXNlciBpbnRlcmZhY2Ugb3V0cHV0LCBpdOKAmXMgd2hhdGV2ZXIgY29tcG9uZW50IHdhcyByZXNwb25zaWJsZSBmb3IgcmVuZGVyaW5nIHRoZSBvdXRwdXQuIElmIHlvdSBkb27igJl0IGtub3cgaG93IHRvIGZpbmQgdGhpcyBsaW5lLCBvbmUgc3RyYXRlZ3kgaXMgdG8gZmluZCBhIHVuaXF1ZSBmZWF0dXJlIGluIHRoZSBvdXRwdXQgc3VjaCBhcyBhIHN0cmluZyBjb25zdGFudCBhbmQgZG8gYSBnbG9iYWwgc2VhcmNoIGluIHRoZSBjb2RlIGZvciB0aGF0IHN0cmluZy5cIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3M6XCJtYXJnaW4tMVwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXJpYWJsZXM6W1wiZmFpbHVyZVwiXSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgbmV4dFN0cmF0ZWd5OlwiXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjdGl2ZUxpbmVzOlsxLDE2XVxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsaW5lTnVtOjIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRleHQ6XCJFeGVjdXRlIHRoZSBwcm9ncmFtIHRvIGxpbmUgTFwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzb3I6MyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246XCJFeGVjdXRlIHRoZSBwcm9ncmFtIHRvIGxpbmUgTCAodXNpbmcgYSBicmVha3BvaW50IG9yIGEgdGltZS10cmF2ZWwgZGVidWdnZXIpLlwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjbGFzczpcIm1hcmdpbi0xXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhcmlhYmxlczpbXCJmYWlsdXJlXCJdLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBuZXh0U3RyYXRlZ3k6XCJcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgYWN0aXZlTGluZXM6WzJdXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpbmVOdW06MyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGV4dDpcIlJlcHJvZHVjZSBmYWlsdXJlLiBcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2Vzc29yOjQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOlwiXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzOlwibWFyZ2luLTFcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyaWFibGVzOltcImZhaWx1cmVcIl0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5leHRTdHJhdGVneTpcIlwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBhY3RpdmVMaW5lczpbM11cclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGluZU51bTo0LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXh0OlwiIElmIHRoZSBwcm9ncmFtIGRvZXMgbm90IGV4ZWN1dGUgTHtcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2Vzc29yOjUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOlwiXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzOlwibWFyZ2luLTFcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyaWFibGVzOltcImZhaWx1cmVcIl0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5leHRTdHJhdGVneTpcIlwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBhY3RpdmVMaW5lczpbNCw2XVxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsaW5lTnVtOjUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRleHQ6XCJyZXR1cm4gdG8gc3RlcCAxIGFuZCBmaW5kIGFuIGFsdGVybmF0ZSBMIHRoYXQgZG9lcyBwcm9kdWNlIHRoZSBmYWlsdXJlfVwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzb3I6MCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246XCJcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3M6XCJtYXJnaW4tMlwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXJpYWJsZXM6W1wiZmFpbHVyZVwiXSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgbmV4dFN0cmF0ZWd5OlwiXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjdGl2ZUxpbmVzOls1XVxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsaW5lTnVtOjYsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRleHQ6XCJ9ZWxzZXtcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2Vzc29yOjcsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOlwiXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzOlwibWFyZ2luLTFcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyaWFibGVzOltcImZhaWx1cmVcIl0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5leHRTdHJhdGVneTpcIlwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBhY3RpdmVMaW5lczpbNiw0XVxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsaW5lTnVtOjcsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRleHQ6XCJWYWx1ZXM9IEluc3BlY3QgdGhlIHN0YXRlIG9mIGFsbCB2YWx1ZXMgdGhhdCByZXN1bHRlZCBpbiBMIGJlaW5nIHJlYWNoZWRcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2Vzc29yOjgsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOlwiV2l0aCB0aGUgcHJvZ3JhbSBoYWx0ZWQgb24gTCwgaW5zcGVjdCB0aGUgc3RhdGUgb2YgYWxsIHZhbHVlcyBpbiBtZW1vcnkgYW5kIGFsbCB2YWx1ZXMgViBvZiBsb2NhbCB2YXJpYWJsZXMgaW4gdGhlIGNhbGwgc3RhY2sgdGhhdCByZXN1bHRlZCBpbiBMIGJlaW5nIHJlYWNoZWQuIFwiICtcclxuICAgICAgICAgICAgICAgICAgICAgICAgXCJUaGlzIGluY2x1ZGVzIGFsbCB2YXJpYWJsZXMgdGhhdCB3ZXJlIHJlZmVyZW5jZWQgaW4gY29uZGl0aW9uYWwgc3RhdGVtZW50cyB0aGF0IHJlc3VsdGVkIGluIEwgYmVpbmcgZXhlY3V0ZWQuXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzOlwibWFyZ2luLTJcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyaWFibGVzOltcImZhaWx1cmVcIl0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5leHRTdHJhdGVneTpcIlwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBhY3RpdmVMaW5lczpbN11cclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGluZU51bTo4LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXh0OlwiRm9yIGVhY2ggb2YgdGhlc2UgdmFsdWVzIFZ7XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3Nvcjo5LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjpcIlwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjbGFzczpcIm1hcmdpbi0yXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhcmlhYmxlczpbXCJmYWlsdXJlXCJdLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBuZXh0U3RyYXRlZ3k6XCJcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgYWN0aXZlTGluZXM6WzhdXHJcbiAgICAgICAgICAgICAgICAgICAgfSx7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpbmVOdW06OSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGV4dDpcIklmIFYgY29ycmVjdCBpbiB0aGlzIGNvbnRleHR7XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3NvcjoxMCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246XCJcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3M6XCJtYXJnaW4tMlwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXJpYWJsZXM6W1wiZmFpbHVyZVwiXSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgbmV4dFN0cmF0ZWd5OlwiXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjdGl2ZUxpbmVzOls5LDExLDE0XVxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsaW5lTnVtOjEwLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXh0OlwibW92ZSBvbiB0byB0aGUgbmV4dCBWXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3Nvcjo5LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjpcIlwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjbGFzczpcIm1hcmdpbi0zXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhcmlhYmxlczpbXCJmYWlsdXJlXCJdLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBuZXh0U3RyYXRlZ3k6XCJcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgYWN0aXZlTGluZXM6WzEwXVxyXG4gICAgICAgICAgICAgICAgICAgIH0se1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsaW5lTnVtOjExLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXh0OlwifSBlbHNlIHtcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2Vzc29yOjEyLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjpcIlwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjbGFzczpcIm1hcmdpbi0yXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhcmlhYmxlczpbXCJmYWlsdXJlXCJdLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBuZXh0U3RyYXRlZ3k6XCJcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgYWN0aXZlTGluZXM6WzExLDksMTRdXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpbmVOdW06MTIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRleHQ6XCJyZXR1cm4gbG9jYWxpemVXcm9uZ1ZhbHVlXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3NvcjoyMCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246XCJcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3M6XCJtYXJnaW4tM1wiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXJpYWJsZXM6W1wiZmFpbHVyZVwiXSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgbmV4dFN0cmF0ZWd5OlwibG9jYWxpemVXcm9uZ1ZhbHVlXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjdGl2ZUxpbmVzOlsxMl1cclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGluZU51bToxMyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGV4dDpcIn1cIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2Vzc29yOjE0LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjpcIlwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjbGFzczpcIm1hcmdpbi0yXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhcmlhYmxlczpbXCJmYWlsdXJlXCJdLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBuZXh0U3RyYXRlZ3k6XCJcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgYWN0aXZlTGluZXM6WzEzXVxyXG4gICAgICAgICAgICAgICAgICAgIH0se1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsaW5lTnVtOjE0LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXh0OlwiSWYgbm9uZSBvZiBWIGlzIHdyb25nIHtcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2Vzc29yOjE1LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjpcIklmIG5vbmUgb2YgdGhlIHZhbHVlcyB3ZXJlIHdyb25nLCB0aGVuIG9uZSBvZiB0aGUgaW5wdXRzIHRvIHRoZSBwcm9ncmFtIHdhcyBub3QgaGFuZGxlZCBjb3JyZWN0bHkuIElkZW50aWZ5IHdoaWNoIGlucHV0IHdhcyB1bmV4cGVjdGVkIGFuZCBkZXZpc2UgYSB3YXkgdG8gaGFuZGxlIGl0IGNvcnJlY3RseS5cIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3M6XCJtYXJnaW4tMlwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXJpYWJsZXM6W1wiZmFpbHVyZVwiXSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgbmV4dFN0cmF0ZWd5OlwiXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjdGl2ZUxpbmVzOlsxNCwgOSwxMV1cclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGluZU51bToxNSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGV4dDpcIk9uZSBvZiB0aGUgaW5wdXRzIHdhcyBub3QgaGFuZGxlZCBjb3JyZWN0bHlcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2Vzc29yOjIwLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjpcIlwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjbGFzczpcIm1hcmdpbi0zXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhcmlhYmxlczpbXCJmYWlsdXJlXCJdLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBuZXh0U3RyYXRlZ3k6XCJcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgYWN0aXZlTGluZXM6WzE1XVxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGluZU51bToxNixcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGV4dDpcIiBJZiB0aGVyZSBpcyBubyBzdWNoIExcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2Vzc29yOjE3LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjpcIlwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjbGFzczpcIm1hcmdpbi0xXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhcmlhYmxlczpbXCJmYWlsdXJlXCJdLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBuZXh0U3RyYXRlZ3k6XCJcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgYWN0aXZlTGluZXM6WzE2LDFdXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpbmVOdW06MTcsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRleHQ6XCJ0aGVuIHNvbWV0aGluZyBlbHNlIGlzIGNyZWF0aW5nIHRoZSBwcm9ibGVtLlwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzb3I6MTgsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOlwiXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzOlwibWFyZ2luLTJcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyaWFibGVzOltcImZhaWx1cmVcIl0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5leHRTdHJhdGVneTpcIlwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBhY3RpdmVMaW5lczpbMTddXHJcbiAgICAgICAgICAgICAgICAgICAgfSx7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpbmVOdW06MTgsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRleHQ6XCJ9XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3NvcjoxOSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246XCJcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3M6XCJtYXJnaW4tMVwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXJpYWJsZXM6W1wiZmFpbHVyZVwiXSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgbmV4dFN0cmF0ZWd5OlwiXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjdGl2ZUxpbmVzOlsxOF1cclxuICAgICAgICAgICAgICAgICAgICB9LHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGluZU51bToxOSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGV4dDpcIn1cIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2Vzc29yOjIwLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjpcIlwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjbGFzczpcIm1hcmdpbi0xXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhcmlhYmxlczpbXCJmYWlsdXJlXCJdLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBuZXh0U3RyYXRlZ3k6XCJcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgYWN0aXZlTGluZXM6WzE5XVxyXG4gICAgICAgICAgICAgICAgICAgIH0se1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsaW5lTnVtOjIwLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXh0OlwifVwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzb3I6MjEsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOlwiXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzOlwiXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhcmlhYmxlczpbXCJmYWlsdXJlXCJdLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBuZXh0U3RyYXRlZ3k6XCJcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgYWN0aXZlTGluZXM6WzIwXVxyXG4gICAgICAgICAgICAgICAgICAgIH0sIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGluZU51bTogMjEsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRleHQ6IFwiXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3NvcjogXCJ1bmRlZmluZWRcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzOiBcIlwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBuZXh0U3RyYXRlZ3k6IFwiXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjdGl2ZUxpbmVzOiBbMjFdXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgXVxyXG4gICAgICAgICAgICB9LFxyXG5cclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmFtZTpcImxvY2FsaXplV3JvbmdWYWx1ZVwiLFxyXG4gICAgICAgICAgICAgICAgZGlzcGxheU5hbWUgOlwiTG9jYWxpemUgV3JvbmcgVmFsdWVcIixcclxuICAgICAgICAgICAgICAgIHN0YXRlbWVudHM6W1xyXG4gICAgICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGluZU51bTowLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXh0OlwiU3RyYXRlZ3kgbG9jYWxpemVXcm9uZ1ZhbHVlKGZhaWx1cmUsdmFsdWUpeyBcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2Vzc29yOjEsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOlwiVGhlIGdvYWwgb2YgdGhpcyBzdHJhdGVneSBpcyB0byBmaW5kIHdoZXJlIHZhbHVlIHdhcyBjb21wdXRlZC5cIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3M6XCJcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyaWFibGVzOltcImZhaWx1cmVcIiwgXCJ2YWx1ZVwiXSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgbmV4dFN0cmF0ZWd5OlwiXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjdGl2ZUxpbmVzOlswXVxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsaW5lTnVtOjEsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRleHQ6XCJGaW5kIGFsbCBsaW5lcyBMIGluIHRoZSBwcm9ncmFtIHRoYXQgY2FuIHNldCB2YWx1ZVwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzb3I6MixcclxuICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246XCJcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3M6XCJtYXJnaW4tMVwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXJpYWJsZXM6W1wiZmFpbHVyZVwiLCBcInZhbHVlXCJdLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBuZXh0U3RyYXRlZ3k6XCJcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgYWN0aXZlTGluZXM6WzFdXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpbmVOdW06MixcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGV4dDpcIkxhc3RMaW5lRmFpbHVyZSA6IGZpbmQgbGFzdCBleGVjdXRpb24gb2YgYSBsaW5lIEwgdGhhdCBvY2N1cnJlZCBiZWZvcmUgZmFpbHVyZVwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzb3I6MyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246XCJSZXByb2R1Y2UgZmFpbHVyZSwgZmluZGluZyBsYXN0IGV4ZWN1dGlvbiBvZiBhIGxpbmUgTCB0aGF0IG9jY3VycmVkIGJlZm9yZSBmYWlsdXJlICh1c2luZyBicmVha3BvaW50cyBvciBhIHRpbWUtdHJhdmVsIGRlYnVnZ2VyKS4gSWYgeW91ciBkZWJ1Z2dlciBzdXBwb3J0cyByZXZlcnNlIGV4ZWN1dGlvbiwgdGhpcyBpcyBhIG1hdHRlciBvZiBzdGVwcGluZyBiYWNrd2FyZHMuIElmIG5vdCwgeW91IG1heSBoYXZlIHRvIHJlcHJvZHVjZSBmYWlsdXJlIG1vcmUgdGhhbiBvbmNlIHRvIGZpbmQgdGhlIGxhc3QgZXhlY3V0aW9uLlwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjbGFzczpcIm1hcmdpbi0xXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhcmlhYmxlczpbXCJmYWlsdXJlXCIsIFwidmFsdWVcIl0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5leHRTdHJhdGVneTpcIlwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBhY3RpdmVMaW5lczpbMl1cclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGluZU51bTozLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXh0OlwiaWYoTGFzdExpbmVGYWlsdXJlIDppbmNvcnJlY3QpeyBcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2Vzc29yOjQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOlwiUmVmbGVjdCBvbiB0aGUgaW50ZW5kZWQgYmVoYXZpb3Igb2YgdGhlIGxpbmUgYW5kIHdoZXRoZXIsIGFzIGltcGxlbWVudGVkLCBpdCBhY2hpZXZlcyB0aGlzIGJlaGF2aW9yLiBJZiBpdOKAmXMgaW5jb3JyZWN0XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzOlwibWFyZ2luLTFcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyaWFibGVzOltcImZhaWx1cmVcIiwgXCJ2YWx1ZVwiXSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgbmV4dFN0cmF0ZWd5OlwiXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjdGl2ZUxpbmVzOlszLDZdXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpbmVOdW06NCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGV4dDpcInlvdSBoYXZlIGZvdW5kIHRoZSBidWchXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3Nvcjo1LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjpcIlwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjbGFzczpcIm1hcmdpbi0xXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhcmlhYmxlczpbXCJmYWlsdXJlXCIsIFwidmFsdWVcIl0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5leHRTdHJhdGVneTpcIlwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBhY3RpdmVMaW5lczpbNF1cclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGluZU51bTo1LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXh0OlwicmV0dXJuIExcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2Vzc29yOjAsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOlwiXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzOlwibWFyZ2luLTJcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyaWFibGVzOltcImZhaWx1cmVcIiwgXCJ2YWx1ZVwiXSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgbmV4dFN0cmF0ZWd5OlwiXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjdGl2ZUxpbmVzOls1XVxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsaW5lTnVtOjYsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRleHQ6XCJ9IGVsc2UgSWYodGhlIExpbmUgaXMgY29ycmVjdCl7XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3Nvcjo3LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjpcIklmIHRoZSBsaW5lIGlzIGNvcnJlY3R7XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzOlwibWFyZ2luLTFcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyaWFibGVzOltcImZhaWx1cmVcIiwgXCJ2YWx1ZVwiXSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgbmV4dFN0cmF0ZWd5OlwiXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjdGl2ZUxpbmVzOls2LDNdXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpbmVOdW06NyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGV4dDpcImlmKCBhbm90aGVyIHZhbHVlICh2YWx1ZTIpIGluY29ycmVjdCl7XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3Nvcjo4LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjpcIklmIHRoZSBsaW5lIGlzIGNvcnJlY3QsIGlzIGEgdmFsdWUgdmFsdWUyIHVzZWQgYnkgdGhlIGxhc3QgTCB0byBleGVjdXRlIGluY29ycmVjdD8gSWYgc28sIHJldHVybiBsb2NhbGl6ZVdyb25nVmFsdWUoZmFpbHVyZSwgdmFsdWUyKS5cIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3M6XCJtYXJnaW4tMlwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXJpYWJsZXM6W1wiZmFpbHVyZVwiLCBcInZhbHVlXCJdLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBuZXh0U3RyYXRlZ3k6XCJcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgYWN0aXZlTGluZXM6WzddXHJcbiAgICAgICAgICAgICAgICAgICAgfSx7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpbmVOdW06OCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGV4dDpcInJldHVybiBsb2NhbGl6ZVdyb25nVmFsdWUoZmFpbHVyZSwgdmFsdWUyKVwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzb3I6MCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246XCJcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3M6XCJtYXJnaW4tM1wiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXJpYWJsZXM6W1wiZmFpbHVyZVwiLCBcInZhbHVlXCJdLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBuZXh0U3RyYXRlZ3k6XCJcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgYWN0aXZlTGluZXM6WzhdXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpbmVOdW06OSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGV4dDpcIn1cIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2Vzc29yOjEwLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjpcIlwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjbGFzczpcIm1hcmdpbi0yXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhcmlhYmxlczpbXCJmYWlsdXJlXCIsIFwidmFsdWVcIl0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5leHRTdHJhdGVneTpcIlwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBhY3RpdmVMaW5lczpbOV1cclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGluZU51bToxMCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGV4dDpcIn1cIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2Vzc29yOjExLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjpcIlwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjbGFzczpcIm1hcmdpbi0xXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhcmlhYmxlczpbXCJmYWlsdXJlXCIsIFwidmFsdWVcIl0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5leHRTdHJhdGVneTpcIlwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBhY3RpdmVMaW5lczpbMTBdXHJcbiAgICAgICAgICAgICAgICAgICAgfSx7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpbmVOdW06MTEsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRleHQ6XCJGYWlsZWQgdG8gZmluZCBkZWZlY3QhXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3NvcjoxMixcclxuICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246XCJcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3M6XCJtYXJnaW4tMVwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXJpYWJsZXM6W1wiZmFpbHVyZVwiLCBcInZhbHVlXCJdLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBuZXh0U3RyYXRlZ3k6XCJcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgYWN0aXZlTGluZXM6WzExLDEzLDE2XVxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsaW5lTnVtOjEyLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXh0OlwifVwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzb3I6MTEsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOlwiXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzOlwiXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhcmlhYmxlczpbXCJmYWlsdXJlXCIsIFwidmFsdWVcIl0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5leHRTdHJhdGVneTpcIlwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBhY3RpdmVMaW5lczoxMlxyXG4gICAgICAgICAgICAgICAgICAgIH0se1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsaW5lTnVtOiAxMyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGV4dDogXCJcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2Vzc29yOiBcInVuZGVmaW5lZFwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3M6IFwiXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5leHRTdHJhdGVneTogXCJcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgYWN0aXZlTGluZXM6IFsxM11cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBdXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6XCJsb2NhbGl6ZU1pc3NpbmdPdXRwdXRcIixcclxuICAgICAgICAgICAgICAgIGRpc3BsYXlOYW1lIDpcIkxvY2FsaXplIE1pc3NpbmcgT3V0cHV0XCIsXHJcbiAgICAgICAgICAgICAgICBzdGF0ZW1lbnRzOltcclxuICAgICAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpbmVOdW06MCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGV4dDpcIlN0cmF0ZWd5IGxvY2FsaXplTWlzc2luZ091dHB1dChmYWlsdXJlKXsgXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3NvcjoxLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjpcIlwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjbGFzczpcIlwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXJpYWJsZXM6W1wiZmFpbHVyZVwiXSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgbmV4dFN0cmF0ZWd5OlwiXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjdGl2ZUxpbmVzOlswXVxyXG4gICAgICAgICAgICAgICAgICAgIH0se1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsaW5lTnVtOiAxLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXh0OiBcIkZpbmQgdGhlIGxpbmUgb2YgY29kZSBMIHRoYXQgd291bGQgaGF2ZSBwcm9kdWNlZCB0aGUgb3V0cHV0IHlvdSBleHBlY3RlZC5cIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2Vzc29yOiAyLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3M6IFwibWFyZ2luLTFcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyaWFibGVzOiBbXCJmYWlsdXJlXCJdLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBuZXh0U3RyYXRlZ3k6IFwiXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjdGl2ZUxpbmVzOiBbMV1cclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGluZU51bTogMixcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGV4dDogXCIgRG8gZGlhZ25vc2VVbmV4ZWN1dGVkTGluZShmYWlsdXJlLCBMKVwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzb3I6IDMsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIlRvIHRoZSBleHRlbnQgdGhhdCB5b3UgY2FuLCB3cml0ZSBkb3duIHRoZSBpbnB1dHMgZm9yIGxhdGVyIHJlZmVyZW5jZS5cIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3M6IFwibWFyZ2luLTFcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyaWFibGVzOiBbXCJmYWlsdXJlXCJdLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBuZXh0U3RyYXRlZ3k6IFwiZGlhZ25vc2VVbmV4ZWN1dGVkTGluZVwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBhY3RpdmVMaW5lczogWzJdXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICwge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsaW5lTnVtOiAzLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXh0OiBcIlwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzb3I6IFwidW5kZWZpbmVkXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIlwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjbGFzczogXCJcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgbmV4dFN0cmF0ZWd5OiBcIlwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBhY3RpdmVMaW5lczogWzNdXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgXVxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOlwiZGlhZ25vc2VVbmV4ZWN1dGVkTGluZVwiLFxyXG4gICAgICAgICAgICAgICAgZGlzcGxheU5hbWUgOlwiRGlhZ25vc2UgVW5leGVjdXRlZCBMaW5lXCIsXHJcbiAgICAgICAgICAgICAgICBzdGF0ZW1lbnRzOltcclxuICAgICAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpbmVOdW06MCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGV4dDpcIlN0cmF0ZWd5IGRpYWdub3NlVW5leGVjdXRlZExpbmUoZmFpbHVyZSxMKXsgXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3NvcjoxLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjpcIlwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjbGFzczpcIlwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXJpYWJsZXM6W1wiZmFpbHVyZVwiLCBcIkxcIl0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5leHRTdHJhdGVneTpcIlwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBhY3RpdmVMaW5lczpbMF1cclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGluZU51bToxLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXh0OlwiY29uZGl0aW9ucyA6IEZpbmQgYWxsIGNvbmRpdGlvbmFsIHN0YXRlbWVudHMgY29uZGl0aW9ucyB0aGF0IHdvdWxkIGhhdmUgY2F1c2VkIGxpbmUgdG8gZXhlY3V0ZVwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzb3I6MixcclxuICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246XCJUaGVzZSBtYXkgYmUgYW4gaWYtc3RhdGVtZW50cywgc3dpdGNoLXN0YXRlbWVudHMsIG9yIG90aGVyIGNvbmRpdGlvbmFsIHN0YXRlbWVudHMgdGhhdCB3b3VsZCBoYXZlIHByZXZlbnRlZCB0aGUgbGluZSBmcm9tIGV4ZWN1dGluZy5cIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3M6XCJtYXJnaW4tMVwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXJpYWJsZXM6W1wiZmFpbHVyZVwiLCBcIkxcIl0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5leHRTdHJhdGVneTpcIlwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBhY3RpdmVMaW5lczpbMV1cclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGluZU51bToyLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXh0OlwiRm9yIGVhY2ggKGxpbmUgTCBpbiBjb25kaXRpb25zKXtcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2Vzc29yOjMsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOlwiXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzOlwibWFyZ2luLTFcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyaWFibGVzOltcImZhaWx1cmVcIiwgXCJMXCJdLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBuZXh0U3RyYXRlZ3k6XCJcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgYWN0aXZlTGluZXM6WzJdXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpbmVOdW06MyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGV4dDpcIjEuU2V0IGEgYnJlYWtwb2ludCBvbiBsaW5lIFwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzb3I6NCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246XCJcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3M6XCJtYXJnaW4tMlwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXJpYWJsZXM6W1wiZmFpbHVyZVwiLCBcIkxcIl0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5leHRTdHJhdGVneTpcIlwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBhY3RpdmVMaW5lczpbM11cclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGluZU51bTo0LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXh0OlwiMi5SZXByb2R1Y2UgdGhlIGZhaWx1cmUgdG8gc2VlIGlmIEwgZXhlY3V0ZWRcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2Vzc29yOjUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOlwiXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzOlwibWFyZ2luLTJcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyaWFibGVzOltcImZhaWx1cmVcIiwgXCJMXCJdLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBuZXh0U3RyYXRlZ3k6XCJcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgYWN0aXZlTGluZXM6WzRdXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpbmVOdW06NSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGV4dDpcIklmIChMIGV4ZWN1dGVkIGNvcnJlY3RseSl7XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3NvcjowLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjpcIlwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjbGFzczpcIm1hcmdpbi0yXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhcmlhYmxlczpbXCJmYWlsdXJlXCIsIFwiTFwiXSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgbmV4dFN0cmF0ZWd5OlwiXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjdGl2ZUxpbmVzOls1LDddXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpbmVOdW06NixcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGV4dDpcImNvbnRpbnVlO1wiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzb3I6NyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246XCJtb3ZlIG9uIHRvIHRoZSBuZXh0IEwgaW4gY29uZGl0aW9uc1wiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjbGFzczpcIm1hcmdpbi0zXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhcmlhYmxlczpbXCJmYWlsdXJlXCIsIFwiTFwiXSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgbmV4dFN0cmF0ZWd5OlwiXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjdGl2ZUxpbmVzOlszLDZdXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpbmVOdW06NyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGV4dDpcIn1lbHNle1wiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzb3I6OCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246XCJcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3M6XCJtYXJnaW4tMlwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXJpYWJsZXM6W1wiZmFpbHVyZVwiLCBcIkxcIl0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5leHRTdHJhdGVneTpcIlwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBhY3RpdmVMaW5lczpbNyw1XVxyXG4gICAgICAgICAgICAgICAgICAgIH0se1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsaW5lTnVtOjgsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRleHQ6XCIgViA6IGlkZW50aWZ5IHRoZSB2YWx1ZSBWIHRoYXQgY2F1c2VkIGl0IHRvIGV4ZWN1dGUgaW5jb3JyZWN0bHlcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2Vzc29yOjksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOlwiXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzOlwibWFyZ2luLTNcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyaWFibGVzOltcImZhaWx1cmVcIiwgXCJMXCJdLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBuZXh0U3RyYXRlZ3k6XCJcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgYWN0aXZlTGluZXM6WzhdXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpbmVOdW06OSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGV4dDpcIlJldHVybiBsb2NhbGl6ZVdyb25nVmFsdWUoZmFpbHVyZSwgVilcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2Vzc29yOjEwLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjpcIlwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjbGFzczpcIm1hcmdpbi0zXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhcmlhYmxlczpbXCJmYWlsdXJlXCIsIFwidmFsdWVcIl0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5leHRTdHJhdGVneTpcImxvY2FsaXplV3JvbmdWYWx1ZVwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBhY3RpdmVMaW5lczpbOV1cclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGluZU51bToxMCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGV4dDpcIn1cIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2Vzc29yOjExLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjpcIlwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjbGFzczpcIm1hcmdpbi0xXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhcmlhYmxlczpbXCJmYWlsdXJlXCIsIFwidmFsdWVcIl0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5leHRTdHJhdGVneTpcIlwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBhY3RpdmVMaW5lczpbMTBdXHJcbiAgICAgICAgICAgICAgICAgICAgfSx7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpbmVOdW06MTEsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRleHQ6XCJ9XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3NvcjoxMixcclxuICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246XCJcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3M6XCJtYXJnaW4tMVwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXJpYWJsZXM6W1wiZmFpbHVyZVwiLCBcInZhbHVlXCJdLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBuZXh0U3RyYXRlZ3k6XCJcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgYWN0aXZlTGluZXM6WzExXVxyXG4gICAgICAgICAgICAgICAgICAgIH0se1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsaW5lTnVtOiAxMixcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGV4dDogXCJcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2Vzc29yOiBcInVuZGVmaW5lZFwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3M6IFwiXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5leHRTdHJhdGVneTogXCJcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgYWN0aXZlTGluZXM6IFsxMl1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBdXHJcbiAgICAgICAgICAgIH0sXHJcblxyXG4gICAgICAgIF1cclxuXHJcbiAgICB9XHJcblxyXG5dO1xyXG5cclxuLy8gLHtcclxuLy8gICAgICAgICBsaW5lTnVtOixcclxuLy8gICAgICAgICB0ZXh0OlwiXCIsXHJcbi8vICAgICAgICAgc3VjY2Vzc29yOixcclxuLy8gICAgICAgICBkZXNjcmlwdGlvbjpcIlwiLFxyXG4vLyAgICAgICAgIGNsYXNzOicnLFxyXG4vLyAgICAgICAgIHZhcmlhYmxlczpbXCJmYWlsdXJlXCJdLFxyXG4vLyAgICAgICAgIG5leHRTdHJhdGVneTpcIlwiLFxyXG4vLyAgICAgICAgIGFjdGl2ZUxpbmVzOlxyXG4vLyAgICAgfVxyXG5cclxubW9kdWxlLmV4cG9ydHMuc3RyYXRlZ2llcyA9IHN0cmF0ZWdpZXM7IiwiJ3VzZSBzdHJpY3QnXG5cbmV4cG9ydHMuYnl0ZUxlbmd0aCA9IGJ5dGVMZW5ndGhcbmV4cG9ydHMudG9CeXRlQXJyYXkgPSB0b0J5dGVBcnJheVxuZXhwb3J0cy5mcm9tQnl0ZUFycmF5ID0gZnJvbUJ5dGVBcnJheVxuXG52YXIgbG9va3VwID0gW11cbnZhciByZXZMb29rdXAgPSBbXVxudmFyIEFyciA9IHR5cGVvZiBVaW50OEFycmF5ICE9PSAndW5kZWZpbmVkJyA/IFVpbnQ4QXJyYXkgOiBBcnJheVxuXG52YXIgY29kZSA9ICdBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWmFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6MDEyMzQ1Njc4OSsvJ1xuZm9yICh2YXIgaSA9IDAsIGxlbiA9IGNvZGUubGVuZ3RoOyBpIDwgbGVuOyArK2kpIHtcbiAgbG9va3VwW2ldID0gY29kZVtpXVxuICByZXZMb29rdXBbY29kZS5jaGFyQ29kZUF0KGkpXSA9IGlcbn1cblxucmV2TG9va3VwWyctJy5jaGFyQ29kZUF0KDApXSA9IDYyXG5yZXZMb29rdXBbJ18nLmNoYXJDb2RlQXQoMCldID0gNjNcblxuZnVuY3Rpb24gcGxhY2VIb2xkZXJzQ291bnQgKGI2NCkge1xuICB2YXIgbGVuID0gYjY0Lmxlbmd0aFxuICBpZiAobGVuICUgNCA+IDApIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgc3RyaW5nLiBMZW5ndGggbXVzdCBiZSBhIG11bHRpcGxlIG9mIDQnKVxuICB9XG5cbiAgLy8gdGhlIG51bWJlciBvZiBlcXVhbCBzaWducyAocGxhY2UgaG9sZGVycylcbiAgLy8gaWYgdGhlcmUgYXJlIHR3byBwbGFjZWhvbGRlcnMsIHRoYW4gdGhlIHR3byBjaGFyYWN0ZXJzIGJlZm9yZSBpdFxuICAvLyByZXByZXNlbnQgb25lIGJ5dGVcbiAgLy8gaWYgdGhlcmUgaXMgb25seSBvbmUsIHRoZW4gdGhlIHRocmVlIGNoYXJhY3RlcnMgYmVmb3JlIGl0IHJlcHJlc2VudCAyIGJ5dGVzXG4gIC8vIHRoaXMgaXMganVzdCBhIGNoZWFwIGhhY2sgdG8gbm90IGRvIGluZGV4T2YgdHdpY2VcbiAgcmV0dXJuIGI2NFtsZW4gLSAyXSA9PT0gJz0nID8gMiA6IGI2NFtsZW4gLSAxXSA9PT0gJz0nID8gMSA6IDBcbn1cblxuZnVuY3Rpb24gYnl0ZUxlbmd0aCAoYjY0KSB7XG4gIC8vIGJhc2U2NCBpcyA0LzMgKyB1cCB0byB0d28gY2hhcmFjdGVycyBvZiB0aGUgb3JpZ2luYWwgZGF0YVxuICByZXR1cm4gKGI2NC5sZW5ndGggKiAzIC8gNCkgLSBwbGFjZUhvbGRlcnNDb3VudChiNjQpXG59XG5cbmZ1bmN0aW9uIHRvQnl0ZUFycmF5IChiNjQpIHtcbiAgdmFyIGksIGwsIHRtcCwgcGxhY2VIb2xkZXJzLCBhcnJcbiAgdmFyIGxlbiA9IGI2NC5sZW5ndGhcbiAgcGxhY2VIb2xkZXJzID0gcGxhY2VIb2xkZXJzQ291bnQoYjY0KVxuXG4gIGFyciA9IG5ldyBBcnIoKGxlbiAqIDMgLyA0KSAtIHBsYWNlSG9sZGVycylcblxuICAvLyBpZiB0aGVyZSBhcmUgcGxhY2Vob2xkZXJzLCBvbmx5IGdldCB1cCB0byB0aGUgbGFzdCBjb21wbGV0ZSA0IGNoYXJzXG4gIGwgPSBwbGFjZUhvbGRlcnMgPiAwID8gbGVuIC0gNCA6IGxlblxuXG4gIHZhciBMID0gMFxuXG4gIGZvciAoaSA9IDA7IGkgPCBsOyBpICs9IDQpIHtcbiAgICB0bXAgPSAocmV2TG9va3VwW2I2NC5jaGFyQ29kZUF0KGkpXSA8PCAxOCkgfCAocmV2TG9va3VwW2I2NC5jaGFyQ29kZUF0KGkgKyAxKV0gPDwgMTIpIHwgKHJldkxvb2t1cFtiNjQuY2hhckNvZGVBdChpICsgMildIDw8IDYpIHwgcmV2TG9va3VwW2I2NC5jaGFyQ29kZUF0KGkgKyAzKV1cbiAgICBhcnJbTCsrXSA9ICh0bXAgPj4gMTYpICYgMHhGRlxuICAgIGFycltMKytdID0gKHRtcCA+PiA4KSAmIDB4RkZcbiAgICBhcnJbTCsrXSA9IHRtcCAmIDB4RkZcbiAgfVxuXG4gIGlmIChwbGFjZUhvbGRlcnMgPT09IDIpIHtcbiAgICB0bXAgPSAocmV2TG9va3VwW2I2NC5jaGFyQ29kZUF0KGkpXSA8PCAyKSB8IChyZXZMb29rdXBbYjY0LmNoYXJDb2RlQXQoaSArIDEpXSA+PiA0KVxuICAgIGFycltMKytdID0gdG1wICYgMHhGRlxuICB9IGVsc2UgaWYgKHBsYWNlSG9sZGVycyA9PT0gMSkge1xuICAgIHRtcCA9IChyZXZMb29rdXBbYjY0LmNoYXJDb2RlQXQoaSldIDw8IDEwKSB8IChyZXZMb29rdXBbYjY0LmNoYXJDb2RlQXQoaSArIDEpXSA8PCA0KSB8IChyZXZMb29rdXBbYjY0LmNoYXJDb2RlQXQoaSArIDIpXSA+PiAyKVxuICAgIGFycltMKytdID0gKHRtcCA+PiA4KSAmIDB4RkZcbiAgICBhcnJbTCsrXSA9IHRtcCAmIDB4RkZcbiAgfVxuXG4gIHJldHVybiBhcnJcbn1cblxuZnVuY3Rpb24gdHJpcGxldFRvQmFzZTY0IChudW0pIHtcbiAgcmV0dXJuIGxvb2t1cFtudW0gPj4gMTggJiAweDNGXSArIGxvb2t1cFtudW0gPj4gMTIgJiAweDNGXSArIGxvb2t1cFtudW0gPj4gNiAmIDB4M0ZdICsgbG9va3VwW251bSAmIDB4M0ZdXG59XG5cbmZ1bmN0aW9uIGVuY29kZUNodW5rICh1aW50OCwgc3RhcnQsIGVuZCkge1xuICB2YXIgdG1wXG4gIHZhciBvdXRwdXQgPSBbXVxuICBmb3IgKHZhciBpID0gc3RhcnQ7IGkgPCBlbmQ7IGkgKz0gMykge1xuICAgIHRtcCA9ICh1aW50OFtpXSA8PCAxNikgKyAodWludDhbaSArIDFdIDw8IDgpICsgKHVpbnQ4W2kgKyAyXSlcbiAgICBvdXRwdXQucHVzaCh0cmlwbGV0VG9CYXNlNjQodG1wKSlcbiAgfVxuICByZXR1cm4gb3V0cHV0LmpvaW4oJycpXG59XG5cbmZ1bmN0aW9uIGZyb21CeXRlQXJyYXkgKHVpbnQ4KSB7XG4gIHZhciB0bXBcbiAgdmFyIGxlbiA9IHVpbnQ4Lmxlbmd0aFxuICB2YXIgZXh0cmFCeXRlcyA9IGxlbiAlIDMgLy8gaWYgd2UgaGF2ZSAxIGJ5dGUgbGVmdCwgcGFkIDIgYnl0ZXNcbiAgdmFyIG91dHB1dCA9ICcnXG4gIHZhciBwYXJ0cyA9IFtdXG4gIHZhciBtYXhDaHVua0xlbmd0aCA9IDE2MzgzIC8vIG11c3QgYmUgbXVsdGlwbGUgb2YgM1xuXG4gIC8vIGdvIHRocm91Z2ggdGhlIGFycmF5IGV2ZXJ5IHRocmVlIGJ5dGVzLCB3ZSdsbCBkZWFsIHdpdGggdHJhaWxpbmcgc3R1ZmYgbGF0ZXJcbiAgZm9yICh2YXIgaSA9IDAsIGxlbjIgPSBsZW4gLSBleHRyYUJ5dGVzOyBpIDwgbGVuMjsgaSArPSBtYXhDaHVua0xlbmd0aCkge1xuICAgIHBhcnRzLnB1c2goZW5jb2RlQ2h1bmsodWludDgsIGksIChpICsgbWF4Q2h1bmtMZW5ndGgpID4gbGVuMiA/IGxlbjIgOiAoaSArIG1heENodW5rTGVuZ3RoKSkpXG4gIH1cblxuICAvLyBwYWQgdGhlIGVuZCB3aXRoIHplcm9zLCBidXQgbWFrZSBzdXJlIHRvIG5vdCBmb3JnZXQgdGhlIGV4dHJhIGJ5dGVzXG4gIGlmIChleHRyYUJ5dGVzID09PSAxKSB7XG4gICAgdG1wID0gdWludDhbbGVuIC0gMV1cbiAgICBvdXRwdXQgKz0gbG9va3VwW3RtcCA+PiAyXVxuICAgIG91dHB1dCArPSBsb29rdXBbKHRtcCA8PCA0KSAmIDB4M0ZdXG4gICAgb3V0cHV0ICs9ICc9PSdcbiAgfSBlbHNlIGlmIChleHRyYUJ5dGVzID09PSAyKSB7XG4gICAgdG1wID0gKHVpbnQ4W2xlbiAtIDJdIDw8IDgpICsgKHVpbnQ4W2xlbiAtIDFdKVxuICAgIG91dHB1dCArPSBsb29rdXBbdG1wID4+IDEwXVxuICAgIG91dHB1dCArPSBsb29rdXBbKHRtcCA+PiA0KSAmIDB4M0ZdXG4gICAgb3V0cHV0ICs9IGxvb2t1cFsodG1wIDw8IDIpICYgMHgzRl1cbiAgICBvdXRwdXQgKz0gJz0nXG4gIH1cblxuICBwYXJ0cy5wdXNoKG91dHB1dClcblxuICByZXR1cm4gcGFydHMuam9pbignJylcbn1cbiIsIi8qIVxuICogVGhlIGJ1ZmZlciBtb2R1bGUgZnJvbSBub2RlLmpzLCBmb3IgdGhlIGJyb3dzZXIuXG4gKlxuICogQGF1dGhvciAgIEZlcm9zcyBBYm91a2hhZGlqZWggPGZlcm9zc0BmZXJvc3Mub3JnPiA8aHR0cDovL2Zlcm9zcy5vcmc+XG4gKiBAbGljZW5zZSAgTUlUXG4gKi9cbi8qIGVzbGludC1kaXNhYmxlIG5vLXByb3RvICovXG5cbid1c2Ugc3RyaWN0J1xuXG52YXIgYmFzZTY0ID0gcmVxdWlyZSgnYmFzZTY0LWpzJylcbnZhciBpZWVlNzU0ID0gcmVxdWlyZSgnaWVlZTc1NCcpXG5cbmV4cG9ydHMuQnVmZmVyID0gQnVmZmVyXG5leHBvcnRzLlNsb3dCdWZmZXIgPSBTbG93QnVmZmVyXG5leHBvcnRzLklOU1BFQ1RfTUFYX0JZVEVTID0gNTBcblxudmFyIEtfTUFYX0xFTkdUSCA9IDB4N2ZmZmZmZmZcbmV4cG9ydHMua01heExlbmd0aCA9IEtfTUFYX0xFTkdUSFxuXG4vKipcbiAqIElmIGBCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVGA6XG4gKiAgID09PSB0cnVlICAgIFVzZSBVaW50OEFycmF5IGltcGxlbWVudGF0aW9uIChmYXN0ZXN0KVxuICogICA9PT0gZmFsc2UgICBQcmludCB3YXJuaW5nIGFuZCByZWNvbW1lbmQgdXNpbmcgYGJ1ZmZlcmAgdjQueCB3aGljaCBoYXMgYW4gT2JqZWN0XG4gKiAgICAgICAgICAgICAgIGltcGxlbWVudGF0aW9uIChtb3N0IGNvbXBhdGlibGUsIGV2ZW4gSUU2KVxuICpcbiAqIEJyb3dzZXJzIHRoYXQgc3VwcG9ydCB0eXBlZCBhcnJheXMgYXJlIElFIDEwKywgRmlyZWZveCA0KywgQ2hyb21lIDcrLCBTYWZhcmkgNS4xKyxcbiAqIE9wZXJhIDExLjYrLCBpT1MgNC4yKy5cbiAqXG4gKiBXZSByZXBvcnQgdGhhdCB0aGUgYnJvd3NlciBkb2VzIG5vdCBzdXBwb3J0IHR5cGVkIGFycmF5cyBpZiB0aGUgYXJlIG5vdCBzdWJjbGFzc2FibGVcbiAqIHVzaW5nIF9fcHJvdG9fXy4gRmlyZWZveCA0LTI5IGxhY2tzIHN1cHBvcnQgZm9yIGFkZGluZyBuZXcgcHJvcGVydGllcyB0byBgVWludDhBcnJheWBcbiAqIChTZWU6IGh0dHBzOi8vYnVnemlsbGEubW96aWxsYS5vcmcvc2hvd19idWcuY2dpP2lkPTY5NTQzOCkuIElFIDEwIGxhY2tzIHN1cHBvcnRcbiAqIGZvciBfX3Byb3RvX18gYW5kIGhhcyBhIGJ1Z2d5IHR5cGVkIGFycmF5IGltcGxlbWVudGF0aW9uLlxuICovXG5CdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCA9IHR5cGVkQXJyYXlTdXBwb3J0KClcblxuaWYgKCFCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCAmJiB0eXBlb2YgY29uc29sZSAhPT0gJ3VuZGVmaW5lZCcgJiZcbiAgICB0eXBlb2YgY29uc29sZS5lcnJvciA9PT0gJ2Z1bmN0aW9uJykge1xuICBjb25zb2xlLmVycm9yKFxuICAgICdUaGlzIGJyb3dzZXIgbGFja3MgdHlwZWQgYXJyYXkgKFVpbnQ4QXJyYXkpIHN1cHBvcnQgd2hpY2ggaXMgcmVxdWlyZWQgYnkgJyArXG4gICAgJ2BidWZmZXJgIHY1LnguIFVzZSBgYnVmZmVyYCB2NC54IGlmIHlvdSByZXF1aXJlIG9sZCBicm93c2VyIHN1cHBvcnQuJ1xuICApXG59XG5cbmZ1bmN0aW9uIHR5cGVkQXJyYXlTdXBwb3J0ICgpIHtcbiAgLy8gQ2FuIHR5cGVkIGFycmF5IGluc3RhbmNlcyBjYW4gYmUgYXVnbWVudGVkP1xuICB0cnkge1xuICAgIHZhciBhcnIgPSBuZXcgVWludDhBcnJheSgxKVxuICAgIGFyci5fX3Byb3RvX18gPSB7X19wcm90b19fOiBVaW50OEFycmF5LnByb3RvdHlwZSwgZm9vOiBmdW5jdGlvbiAoKSB7IHJldHVybiA0MiB9fVxuICAgIHJldHVybiBhcnIuZm9vKCkgPT09IDQyXG4gIH0gY2F0Y2ggKGUpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfVxufVxuXG5mdW5jdGlvbiBjcmVhdGVCdWZmZXIgKGxlbmd0aCkge1xuICBpZiAobGVuZ3RoID4gS19NQVhfTEVOR1RIKSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0ludmFsaWQgdHlwZWQgYXJyYXkgbGVuZ3RoJylcbiAgfVxuICAvLyBSZXR1cm4gYW4gYXVnbWVudGVkIGBVaW50OEFycmF5YCBpbnN0YW5jZVxuICB2YXIgYnVmID0gbmV3IFVpbnQ4QXJyYXkobGVuZ3RoKVxuICBidWYuX19wcm90b19fID0gQnVmZmVyLnByb3RvdHlwZVxuICByZXR1cm4gYnVmXG59XG5cbi8qKlxuICogVGhlIEJ1ZmZlciBjb25zdHJ1Y3RvciByZXR1cm5zIGluc3RhbmNlcyBvZiBgVWludDhBcnJheWAgdGhhdCBoYXZlIHRoZWlyXG4gKiBwcm90b3R5cGUgY2hhbmdlZCB0byBgQnVmZmVyLnByb3RvdHlwZWAuIEZ1cnRoZXJtb3JlLCBgQnVmZmVyYCBpcyBhIHN1YmNsYXNzIG9mXG4gKiBgVWludDhBcnJheWAsIHNvIHRoZSByZXR1cm5lZCBpbnN0YW5jZXMgd2lsbCBoYXZlIGFsbCB0aGUgbm9kZSBgQnVmZmVyYCBtZXRob2RzXG4gKiBhbmQgdGhlIGBVaW50OEFycmF5YCBtZXRob2RzLiBTcXVhcmUgYnJhY2tldCBub3RhdGlvbiB3b3JrcyBhcyBleHBlY3RlZCAtLSBpdFxuICogcmV0dXJucyBhIHNpbmdsZSBvY3RldC5cbiAqXG4gKiBUaGUgYFVpbnQ4QXJyYXlgIHByb3RvdHlwZSByZW1haW5zIHVubW9kaWZpZWQuXG4gKi9cblxuZnVuY3Rpb24gQnVmZmVyIChhcmcsIGVuY29kaW5nT3JPZmZzZXQsIGxlbmd0aCkge1xuICAvLyBDb21tb24gY2FzZS5cbiAgaWYgKHR5cGVvZiBhcmcgPT09ICdudW1iZXInKSB7XG4gICAgaWYgKHR5cGVvZiBlbmNvZGluZ09yT2Zmc2V0ID09PSAnc3RyaW5nJykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAnSWYgZW5jb2RpbmcgaXMgc3BlY2lmaWVkIHRoZW4gdGhlIGZpcnN0IGFyZ3VtZW50IG11c3QgYmUgYSBzdHJpbmcnXG4gICAgICApXG4gICAgfVxuICAgIHJldHVybiBhbGxvY1Vuc2FmZShhcmcpXG4gIH1cbiAgcmV0dXJuIGZyb20oYXJnLCBlbmNvZGluZ09yT2Zmc2V0LCBsZW5ndGgpXG59XG5cbi8vIEZpeCBzdWJhcnJheSgpIGluIEVTMjAxNi4gU2VlOiBodHRwczovL2dpdGh1Yi5jb20vZmVyb3NzL2J1ZmZlci9wdWxsLzk3XG5pZiAodHlwZW9mIFN5bWJvbCAhPT0gJ3VuZGVmaW5lZCcgJiYgU3ltYm9sLnNwZWNpZXMgJiZcbiAgICBCdWZmZXJbU3ltYm9sLnNwZWNpZXNdID09PSBCdWZmZXIpIHtcbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5KEJ1ZmZlciwgU3ltYm9sLnNwZWNpZXMsIHtcbiAgICB2YWx1ZTogbnVsbCxcbiAgICBjb25maWd1cmFibGU6IHRydWUsXG4gICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgd3JpdGFibGU6IGZhbHNlXG4gIH0pXG59XG5cbkJ1ZmZlci5wb29sU2l6ZSA9IDgxOTIgLy8gbm90IHVzZWQgYnkgdGhpcyBpbXBsZW1lbnRhdGlvblxuXG5mdW5jdGlvbiBmcm9tICh2YWx1ZSwgZW5jb2RpbmdPck9mZnNldCwgbGVuZ3RoKSB7XG4gIGlmICh0eXBlb2YgdmFsdWUgPT09ICdudW1iZXInKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignXCJ2YWx1ZVwiIGFyZ3VtZW50IG11c3Qgbm90IGJlIGEgbnVtYmVyJylcbiAgfVxuXG4gIGlmIChpc0FycmF5QnVmZmVyKHZhbHVlKSkge1xuICAgIHJldHVybiBmcm9tQXJyYXlCdWZmZXIodmFsdWUsIGVuY29kaW5nT3JPZmZzZXQsIGxlbmd0aClcbiAgfVxuXG4gIGlmICh0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnKSB7XG4gICAgcmV0dXJuIGZyb21TdHJpbmcodmFsdWUsIGVuY29kaW5nT3JPZmZzZXQpXG4gIH1cblxuICByZXR1cm4gZnJvbU9iamVjdCh2YWx1ZSlcbn1cblxuLyoqXG4gKiBGdW5jdGlvbmFsbHkgZXF1aXZhbGVudCB0byBCdWZmZXIoYXJnLCBlbmNvZGluZykgYnV0IHRocm93cyBhIFR5cGVFcnJvclxuICogaWYgdmFsdWUgaXMgYSBudW1iZXIuXG4gKiBCdWZmZXIuZnJvbShzdHJbLCBlbmNvZGluZ10pXG4gKiBCdWZmZXIuZnJvbShhcnJheSlcbiAqIEJ1ZmZlci5mcm9tKGJ1ZmZlcilcbiAqIEJ1ZmZlci5mcm9tKGFycmF5QnVmZmVyWywgYnl0ZU9mZnNldFssIGxlbmd0aF1dKVxuICoqL1xuQnVmZmVyLmZyb20gPSBmdW5jdGlvbiAodmFsdWUsIGVuY29kaW5nT3JPZmZzZXQsIGxlbmd0aCkge1xuICByZXR1cm4gZnJvbSh2YWx1ZSwgZW5jb2RpbmdPck9mZnNldCwgbGVuZ3RoKVxufVxuXG4vLyBOb3RlOiBDaGFuZ2UgcHJvdG90eXBlICphZnRlciogQnVmZmVyLmZyb20gaXMgZGVmaW5lZCB0byB3b3JrYXJvdW5kIENocm9tZSBidWc6XG4vLyBodHRwczovL2dpdGh1Yi5jb20vZmVyb3NzL2J1ZmZlci9wdWxsLzE0OFxuQnVmZmVyLnByb3RvdHlwZS5fX3Byb3RvX18gPSBVaW50OEFycmF5LnByb3RvdHlwZVxuQnVmZmVyLl9fcHJvdG9fXyA9IFVpbnQ4QXJyYXlcblxuZnVuY3Rpb24gYXNzZXJ0U2l6ZSAoc2l6ZSkge1xuICBpZiAodHlwZW9mIHNpemUgIT09ICdudW1iZXInKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignXCJzaXplXCIgYXJndW1lbnQgbXVzdCBiZSBhIG51bWJlcicpXG4gIH0gZWxzZSBpZiAoc2l6ZSA8IDApIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignXCJzaXplXCIgYXJndW1lbnQgbXVzdCBub3QgYmUgbmVnYXRpdmUnKVxuICB9XG59XG5cbmZ1bmN0aW9uIGFsbG9jIChzaXplLCBmaWxsLCBlbmNvZGluZykge1xuICBhc3NlcnRTaXplKHNpemUpXG4gIGlmIChzaXplIDw9IDApIHtcbiAgICByZXR1cm4gY3JlYXRlQnVmZmVyKHNpemUpXG4gIH1cbiAgaWYgKGZpbGwgIT09IHVuZGVmaW5lZCkge1xuICAgIC8vIE9ubHkgcGF5IGF0dGVudGlvbiB0byBlbmNvZGluZyBpZiBpdCdzIGEgc3RyaW5nLiBUaGlzXG4gICAgLy8gcHJldmVudHMgYWNjaWRlbnRhbGx5IHNlbmRpbmcgaW4gYSBudW1iZXIgdGhhdCB3b3VsZFxuICAgIC8vIGJlIGludGVycHJldHRlZCBhcyBhIHN0YXJ0IG9mZnNldC5cbiAgICByZXR1cm4gdHlwZW9mIGVuY29kaW5nID09PSAnc3RyaW5nJ1xuICAgICAgPyBjcmVhdGVCdWZmZXIoc2l6ZSkuZmlsbChmaWxsLCBlbmNvZGluZylcbiAgICAgIDogY3JlYXRlQnVmZmVyKHNpemUpLmZpbGwoZmlsbClcbiAgfVxuICByZXR1cm4gY3JlYXRlQnVmZmVyKHNpemUpXG59XG5cbi8qKlxuICogQ3JlYXRlcyBhIG5ldyBmaWxsZWQgQnVmZmVyIGluc3RhbmNlLlxuICogYWxsb2Moc2l6ZVssIGZpbGxbLCBlbmNvZGluZ11dKVxuICoqL1xuQnVmZmVyLmFsbG9jID0gZnVuY3Rpb24gKHNpemUsIGZpbGwsIGVuY29kaW5nKSB7XG4gIHJldHVybiBhbGxvYyhzaXplLCBmaWxsLCBlbmNvZGluZylcbn1cblxuZnVuY3Rpb24gYWxsb2NVbnNhZmUgKHNpemUpIHtcbiAgYXNzZXJ0U2l6ZShzaXplKVxuICByZXR1cm4gY3JlYXRlQnVmZmVyKHNpemUgPCAwID8gMCA6IGNoZWNrZWQoc2l6ZSkgfCAwKVxufVxuXG4vKipcbiAqIEVxdWl2YWxlbnQgdG8gQnVmZmVyKG51bSksIGJ5IGRlZmF1bHQgY3JlYXRlcyBhIG5vbi16ZXJvLWZpbGxlZCBCdWZmZXIgaW5zdGFuY2UuXG4gKiAqL1xuQnVmZmVyLmFsbG9jVW5zYWZlID0gZnVuY3Rpb24gKHNpemUpIHtcbiAgcmV0dXJuIGFsbG9jVW5zYWZlKHNpemUpXG59XG4vKipcbiAqIEVxdWl2YWxlbnQgdG8gU2xvd0J1ZmZlcihudW0pLCBieSBkZWZhdWx0IGNyZWF0ZXMgYSBub24temVyby1maWxsZWQgQnVmZmVyIGluc3RhbmNlLlxuICovXG5CdWZmZXIuYWxsb2NVbnNhZmVTbG93ID0gZnVuY3Rpb24gKHNpemUpIHtcbiAgcmV0dXJuIGFsbG9jVW5zYWZlKHNpemUpXG59XG5cbmZ1bmN0aW9uIGZyb21TdHJpbmcgKHN0cmluZywgZW5jb2RpbmcpIHtcbiAgaWYgKHR5cGVvZiBlbmNvZGluZyAhPT0gJ3N0cmluZycgfHwgZW5jb2RpbmcgPT09ICcnKSB7XG4gICAgZW5jb2RpbmcgPSAndXRmOCdcbiAgfVxuXG4gIGlmICghQnVmZmVyLmlzRW5jb2RpbmcoZW5jb2RpbmcpKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignXCJlbmNvZGluZ1wiIG11c3QgYmUgYSB2YWxpZCBzdHJpbmcgZW5jb2RpbmcnKVxuICB9XG5cbiAgdmFyIGxlbmd0aCA9IGJ5dGVMZW5ndGgoc3RyaW5nLCBlbmNvZGluZykgfCAwXG4gIHZhciBidWYgPSBjcmVhdGVCdWZmZXIobGVuZ3RoKVxuXG4gIHZhciBhY3R1YWwgPSBidWYud3JpdGUoc3RyaW5nLCBlbmNvZGluZylcblxuICBpZiAoYWN0dWFsICE9PSBsZW5ndGgpIHtcbiAgICAvLyBXcml0aW5nIGEgaGV4IHN0cmluZywgZm9yIGV4YW1wbGUsIHRoYXQgY29udGFpbnMgaW52YWxpZCBjaGFyYWN0ZXJzIHdpbGxcbiAgICAvLyBjYXVzZSBldmVyeXRoaW5nIGFmdGVyIHRoZSBmaXJzdCBpbnZhbGlkIGNoYXJhY3RlciB0byBiZSBpZ25vcmVkLiAoZS5nLlxuICAgIC8vICdhYnh4Y2QnIHdpbGwgYmUgdHJlYXRlZCBhcyAnYWInKVxuICAgIGJ1ZiA9IGJ1Zi5zbGljZSgwLCBhY3R1YWwpXG4gIH1cblxuICByZXR1cm4gYnVmXG59XG5cbmZ1bmN0aW9uIGZyb21BcnJheUxpa2UgKGFycmF5KSB7XG4gIHZhciBsZW5ndGggPSBhcnJheS5sZW5ndGggPCAwID8gMCA6IGNoZWNrZWQoYXJyYXkubGVuZ3RoKSB8IDBcbiAgdmFyIGJ1ZiA9IGNyZWF0ZUJ1ZmZlcihsZW5ndGgpXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpICs9IDEpIHtcbiAgICBidWZbaV0gPSBhcnJheVtpXSAmIDI1NVxuICB9XG4gIHJldHVybiBidWZcbn1cblxuZnVuY3Rpb24gZnJvbUFycmF5QnVmZmVyIChhcnJheSwgYnl0ZU9mZnNldCwgbGVuZ3RoKSB7XG4gIGlmIChieXRlT2Zmc2V0IDwgMCB8fCBhcnJheS5ieXRlTGVuZ3RoIDwgYnl0ZU9mZnNldCkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdcXCdvZmZzZXRcXCcgaXMgb3V0IG9mIGJvdW5kcycpXG4gIH1cblxuICBpZiAoYXJyYXkuYnl0ZUxlbmd0aCA8IGJ5dGVPZmZzZXQgKyAobGVuZ3RoIHx8IDApKSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ1xcJ2xlbmd0aFxcJyBpcyBvdXQgb2YgYm91bmRzJylcbiAgfVxuXG4gIHZhciBidWZcbiAgaWYgKGJ5dGVPZmZzZXQgPT09IHVuZGVmaW5lZCAmJiBsZW5ndGggPT09IHVuZGVmaW5lZCkge1xuICAgIGJ1ZiA9IG5ldyBVaW50OEFycmF5KGFycmF5KVxuICB9IGVsc2UgaWYgKGxlbmd0aCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgYnVmID0gbmV3IFVpbnQ4QXJyYXkoYXJyYXksIGJ5dGVPZmZzZXQpXG4gIH0gZWxzZSB7XG4gICAgYnVmID0gbmV3IFVpbnQ4QXJyYXkoYXJyYXksIGJ5dGVPZmZzZXQsIGxlbmd0aClcbiAgfVxuXG4gIC8vIFJldHVybiBhbiBhdWdtZW50ZWQgYFVpbnQ4QXJyYXlgIGluc3RhbmNlXG4gIGJ1Zi5fX3Byb3RvX18gPSBCdWZmZXIucHJvdG90eXBlXG4gIHJldHVybiBidWZcbn1cblxuZnVuY3Rpb24gZnJvbU9iamVjdCAob2JqKSB7XG4gIGlmIChCdWZmZXIuaXNCdWZmZXIob2JqKSkge1xuICAgIHZhciBsZW4gPSBjaGVja2VkKG9iai5sZW5ndGgpIHwgMFxuICAgIHZhciBidWYgPSBjcmVhdGVCdWZmZXIobGVuKVxuXG4gICAgaWYgKGJ1Zi5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiBidWZcbiAgICB9XG5cbiAgICBvYmouY29weShidWYsIDAsIDAsIGxlbilcbiAgICByZXR1cm4gYnVmXG4gIH1cblxuICBpZiAob2JqKSB7XG4gICAgaWYgKGlzQXJyYXlCdWZmZXJWaWV3KG9iaikgfHwgJ2xlbmd0aCcgaW4gb2JqKSB7XG4gICAgICBpZiAodHlwZW9mIG9iai5sZW5ndGggIT09ICdudW1iZXInIHx8IG51bWJlcklzTmFOKG9iai5sZW5ndGgpKSB7XG4gICAgICAgIHJldHVybiBjcmVhdGVCdWZmZXIoMClcbiAgICAgIH1cbiAgICAgIHJldHVybiBmcm9tQXJyYXlMaWtlKG9iailcbiAgICB9XG5cbiAgICBpZiAob2JqLnR5cGUgPT09ICdCdWZmZXInICYmIEFycmF5LmlzQXJyYXkob2JqLmRhdGEpKSB7XG4gICAgICByZXR1cm4gZnJvbUFycmF5TGlrZShvYmouZGF0YSlcbiAgICB9XG4gIH1cblxuICB0aHJvdyBuZXcgVHlwZUVycm9yKCdGaXJzdCBhcmd1bWVudCBtdXN0IGJlIGEgc3RyaW5nLCBCdWZmZXIsIEFycmF5QnVmZmVyLCBBcnJheSwgb3IgYXJyYXktbGlrZSBvYmplY3QuJylcbn1cblxuZnVuY3Rpb24gY2hlY2tlZCAobGVuZ3RoKSB7XG4gIC8vIE5vdGU6IGNhbm5vdCB1c2UgYGxlbmd0aCA8IEtfTUFYX0xFTkdUSGAgaGVyZSBiZWNhdXNlIHRoYXQgZmFpbHMgd2hlblxuICAvLyBsZW5ndGggaXMgTmFOICh3aGljaCBpcyBvdGhlcndpc2UgY29lcmNlZCB0byB6ZXJvLilcbiAgaWYgKGxlbmd0aCA+PSBLX01BWF9MRU5HVEgpIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignQXR0ZW1wdCB0byBhbGxvY2F0ZSBCdWZmZXIgbGFyZ2VyIHRoYW4gbWF4aW11bSAnICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAnc2l6ZTogMHgnICsgS19NQVhfTEVOR1RILnRvU3RyaW5nKDE2KSArICcgYnl0ZXMnKVxuICB9XG4gIHJldHVybiBsZW5ndGggfCAwXG59XG5cbmZ1bmN0aW9uIFNsb3dCdWZmZXIgKGxlbmd0aCkge1xuICBpZiAoK2xlbmd0aCAhPSBsZW5ndGgpIHsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBlcWVxZXFcbiAgICBsZW5ndGggPSAwXG4gIH1cbiAgcmV0dXJuIEJ1ZmZlci5hbGxvYygrbGVuZ3RoKVxufVxuXG5CdWZmZXIuaXNCdWZmZXIgPSBmdW5jdGlvbiBpc0J1ZmZlciAoYikge1xuICByZXR1cm4gYiAhPSBudWxsICYmIGIuX2lzQnVmZmVyID09PSB0cnVlXG59XG5cbkJ1ZmZlci5jb21wYXJlID0gZnVuY3Rpb24gY29tcGFyZSAoYSwgYikge1xuICBpZiAoIUJ1ZmZlci5pc0J1ZmZlcihhKSB8fCAhQnVmZmVyLmlzQnVmZmVyKGIpKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQXJndW1lbnRzIG11c3QgYmUgQnVmZmVycycpXG4gIH1cblxuICBpZiAoYSA9PT0gYikgcmV0dXJuIDBcblxuICB2YXIgeCA9IGEubGVuZ3RoXG4gIHZhciB5ID0gYi5sZW5ndGhcblxuICBmb3IgKHZhciBpID0gMCwgbGVuID0gTWF0aC5taW4oeCwgeSk7IGkgPCBsZW47ICsraSkge1xuICAgIGlmIChhW2ldICE9PSBiW2ldKSB7XG4gICAgICB4ID0gYVtpXVxuICAgICAgeSA9IGJbaV1cbiAgICAgIGJyZWFrXG4gICAgfVxuICB9XG5cbiAgaWYgKHggPCB5KSByZXR1cm4gLTFcbiAgaWYgKHkgPCB4KSByZXR1cm4gMVxuICByZXR1cm4gMFxufVxuXG5CdWZmZXIuaXNFbmNvZGluZyA9IGZ1bmN0aW9uIGlzRW5jb2RpbmcgKGVuY29kaW5nKSB7XG4gIHN3aXRjaCAoU3RyaW5nKGVuY29kaW5nKS50b0xvd2VyQ2FzZSgpKSB7XG4gICAgY2FzZSAnaGV4JzpcbiAgICBjYXNlICd1dGY4JzpcbiAgICBjYXNlICd1dGYtOCc6XG4gICAgY2FzZSAnYXNjaWknOlxuICAgIGNhc2UgJ2xhdGluMSc6XG4gICAgY2FzZSAnYmluYXJ5JzpcbiAgICBjYXNlICdiYXNlNjQnOlxuICAgIGNhc2UgJ3VjczInOlxuICAgIGNhc2UgJ3Vjcy0yJzpcbiAgICBjYXNlICd1dGYxNmxlJzpcbiAgICBjYXNlICd1dGYtMTZsZSc6XG4gICAgICByZXR1cm4gdHJ1ZVxuICAgIGRlZmF1bHQ6XG4gICAgICByZXR1cm4gZmFsc2VcbiAgfVxufVxuXG5CdWZmZXIuY29uY2F0ID0gZnVuY3Rpb24gY29uY2F0IChsaXN0LCBsZW5ndGgpIHtcbiAgaWYgKCFBcnJheS5pc0FycmF5KGxpc3QpKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignXCJsaXN0XCIgYXJndW1lbnQgbXVzdCBiZSBhbiBBcnJheSBvZiBCdWZmZXJzJylcbiAgfVxuXG4gIGlmIChsaXN0Lmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiBCdWZmZXIuYWxsb2MoMClcbiAgfVxuXG4gIHZhciBpXG4gIGlmIChsZW5ndGggPT09IHVuZGVmaW5lZCkge1xuICAgIGxlbmd0aCA9IDBcbiAgICBmb3IgKGkgPSAwOyBpIDwgbGlzdC5sZW5ndGg7ICsraSkge1xuICAgICAgbGVuZ3RoICs9IGxpc3RbaV0ubGVuZ3RoXG4gICAgfVxuICB9XG5cbiAgdmFyIGJ1ZmZlciA9IEJ1ZmZlci5hbGxvY1Vuc2FmZShsZW5ndGgpXG4gIHZhciBwb3MgPSAwXG4gIGZvciAoaSA9IDA7IGkgPCBsaXN0Lmxlbmd0aDsgKytpKSB7XG4gICAgdmFyIGJ1ZiA9IGxpc3RbaV1cbiAgICBpZiAoIUJ1ZmZlci5pc0J1ZmZlcihidWYpKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdcImxpc3RcIiBhcmd1bWVudCBtdXN0IGJlIGFuIEFycmF5IG9mIEJ1ZmZlcnMnKVxuICAgIH1cbiAgICBidWYuY29weShidWZmZXIsIHBvcylcbiAgICBwb3MgKz0gYnVmLmxlbmd0aFxuICB9XG4gIHJldHVybiBidWZmZXJcbn1cblxuZnVuY3Rpb24gYnl0ZUxlbmd0aCAoc3RyaW5nLCBlbmNvZGluZykge1xuICBpZiAoQnVmZmVyLmlzQnVmZmVyKHN0cmluZykpIHtcbiAgICByZXR1cm4gc3RyaW5nLmxlbmd0aFxuICB9XG4gIGlmIChpc0FycmF5QnVmZmVyVmlldyhzdHJpbmcpIHx8IGlzQXJyYXlCdWZmZXIoc3RyaW5nKSkge1xuICAgIHJldHVybiBzdHJpbmcuYnl0ZUxlbmd0aFxuICB9XG4gIGlmICh0eXBlb2Ygc3RyaW5nICE9PSAnc3RyaW5nJykge1xuICAgIHN0cmluZyA9ICcnICsgc3RyaW5nXG4gIH1cblxuICB2YXIgbGVuID0gc3RyaW5nLmxlbmd0aFxuICBpZiAobGVuID09PSAwKSByZXR1cm4gMFxuXG4gIC8vIFVzZSBhIGZvciBsb29wIHRvIGF2b2lkIHJlY3Vyc2lvblxuICB2YXIgbG93ZXJlZENhc2UgPSBmYWxzZVxuICBmb3IgKDs7KSB7XG4gICAgc3dpdGNoIChlbmNvZGluZykge1xuICAgICAgY2FzZSAnYXNjaWknOlxuICAgICAgY2FzZSAnbGF0aW4xJzpcbiAgICAgIGNhc2UgJ2JpbmFyeSc6XG4gICAgICAgIHJldHVybiBsZW5cbiAgICAgIGNhc2UgJ3V0ZjgnOlxuICAgICAgY2FzZSAndXRmLTgnOlxuICAgICAgY2FzZSB1bmRlZmluZWQ6XG4gICAgICAgIHJldHVybiB1dGY4VG9CeXRlcyhzdHJpbmcpLmxlbmd0aFxuICAgICAgY2FzZSAndWNzMic6XG4gICAgICBjYXNlICd1Y3MtMic6XG4gICAgICBjYXNlICd1dGYxNmxlJzpcbiAgICAgIGNhc2UgJ3V0Zi0xNmxlJzpcbiAgICAgICAgcmV0dXJuIGxlbiAqIDJcbiAgICAgIGNhc2UgJ2hleCc6XG4gICAgICAgIHJldHVybiBsZW4gPj4+IDFcbiAgICAgIGNhc2UgJ2Jhc2U2NCc6XG4gICAgICAgIHJldHVybiBiYXNlNjRUb0J5dGVzKHN0cmluZykubGVuZ3RoXG4gICAgICBkZWZhdWx0OlxuICAgICAgICBpZiAobG93ZXJlZENhc2UpIHJldHVybiB1dGY4VG9CeXRlcyhzdHJpbmcpLmxlbmd0aCAvLyBhc3N1bWUgdXRmOFxuICAgICAgICBlbmNvZGluZyA9ICgnJyArIGVuY29kaW5nKS50b0xvd2VyQ2FzZSgpXG4gICAgICAgIGxvd2VyZWRDYXNlID0gdHJ1ZVxuICAgIH1cbiAgfVxufVxuQnVmZmVyLmJ5dGVMZW5ndGggPSBieXRlTGVuZ3RoXG5cbmZ1bmN0aW9uIHNsb3dUb1N0cmluZyAoZW5jb2RpbmcsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIGxvd2VyZWRDYXNlID0gZmFsc2VcblxuICAvLyBObyBuZWVkIHRvIHZlcmlmeSB0aGF0IFwidGhpcy5sZW5ndGggPD0gTUFYX1VJTlQzMlwiIHNpbmNlIGl0J3MgYSByZWFkLW9ubHlcbiAgLy8gcHJvcGVydHkgb2YgYSB0eXBlZCBhcnJheS5cblxuICAvLyBUaGlzIGJlaGF2ZXMgbmVpdGhlciBsaWtlIFN0cmluZyBub3IgVWludDhBcnJheSBpbiB0aGF0IHdlIHNldCBzdGFydC9lbmRcbiAgLy8gdG8gdGhlaXIgdXBwZXIvbG93ZXIgYm91bmRzIGlmIHRoZSB2YWx1ZSBwYXNzZWQgaXMgb3V0IG9mIHJhbmdlLlxuICAvLyB1bmRlZmluZWQgaXMgaGFuZGxlZCBzcGVjaWFsbHkgYXMgcGVyIEVDTUEtMjYyIDZ0aCBFZGl0aW9uLFxuICAvLyBTZWN0aW9uIDEzLjMuMy43IFJ1bnRpbWUgU2VtYW50aWNzOiBLZXllZEJpbmRpbmdJbml0aWFsaXphdGlvbi5cbiAgaWYgKHN0YXJ0ID09PSB1bmRlZmluZWQgfHwgc3RhcnQgPCAwKSB7XG4gICAgc3RhcnQgPSAwXG4gIH1cbiAgLy8gUmV0dXJuIGVhcmx5IGlmIHN0YXJ0ID4gdGhpcy5sZW5ndGguIERvbmUgaGVyZSB0byBwcmV2ZW50IHBvdGVudGlhbCB1aW50MzJcbiAgLy8gY29lcmNpb24gZmFpbCBiZWxvdy5cbiAgaWYgKHN0YXJ0ID4gdGhpcy5sZW5ndGgpIHtcbiAgICByZXR1cm4gJydcbiAgfVxuXG4gIGlmIChlbmQgPT09IHVuZGVmaW5lZCB8fCBlbmQgPiB0aGlzLmxlbmd0aCkge1xuICAgIGVuZCA9IHRoaXMubGVuZ3RoXG4gIH1cblxuICBpZiAoZW5kIDw9IDApIHtcbiAgICByZXR1cm4gJydcbiAgfVxuXG4gIC8vIEZvcmNlIGNvZXJzaW9uIHRvIHVpbnQzMi4gVGhpcyB3aWxsIGFsc28gY29lcmNlIGZhbHNleS9OYU4gdmFsdWVzIHRvIDAuXG4gIGVuZCA+Pj49IDBcbiAgc3RhcnQgPj4+PSAwXG5cbiAgaWYgKGVuZCA8PSBzdGFydCkge1xuICAgIHJldHVybiAnJ1xuICB9XG5cbiAgaWYgKCFlbmNvZGluZykgZW5jb2RpbmcgPSAndXRmOCdcblxuICB3aGlsZSAodHJ1ZSkge1xuICAgIHN3aXRjaCAoZW5jb2RpbmcpIHtcbiAgICAgIGNhc2UgJ2hleCc6XG4gICAgICAgIHJldHVybiBoZXhTbGljZSh0aGlzLCBzdGFydCwgZW5kKVxuXG4gICAgICBjYXNlICd1dGY4JzpcbiAgICAgIGNhc2UgJ3V0Zi04JzpcbiAgICAgICAgcmV0dXJuIHV0ZjhTbGljZSh0aGlzLCBzdGFydCwgZW5kKVxuXG4gICAgICBjYXNlICdhc2NpaSc6XG4gICAgICAgIHJldHVybiBhc2NpaVNsaWNlKHRoaXMsIHN0YXJ0LCBlbmQpXG5cbiAgICAgIGNhc2UgJ2xhdGluMSc6XG4gICAgICBjYXNlICdiaW5hcnknOlxuICAgICAgICByZXR1cm4gbGF0aW4xU2xpY2UodGhpcywgc3RhcnQsIGVuZClcblxuICAgICAgY2FzZSAnYmFzZTY0JzpcbiAgICAgICAgcmV0dXJuIGJhc2U2NFNsaWNlKHRoaXMsIHN0YXJ0LCBlbmQpXG5cbiAgICAgIGNhc2UgJ3VjczInOlxuICAgICAgY2FzZSAndWNzLTInOlxuICAgICAgY2FzZSAndXRmMTZsZSc6XG4gICAgICBjYXNlICd1dGYtMTZsZSc6XG4gICAgICAgIHJldHVybiB1dGYxNmxlU2xpY2UodGhpcywgc3RhcnQsIGVuZClcblxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgaWYgKGxvd2VyZWRDYXNlKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdVbmtub3duIGVuY29kaW5nOiAnICsgZW5jb2RpbmcpXG4gICAgICAgIGVuY29kaW5nID0gKGVuY29kaW5nICsgJycpLnRvTG93ZXJDYXNlKClcbiAgICAgICAgbG93ZXJlZENhc2UgPSB0cnVlXG4gICAgfVxuICB9XG59XG5cbi8vIFRoaXMgcHJvcGVydHkgaXMgdXNlZCBieSBgQnVmZmVyLmlzQnVmZmVyYCAoYW5kIHRoZSBgaXMtYnVmZmVyYCBucG0gcGFja2FnZSlcbi8vIHRvIGRldGVjdCBhIEJ1ZmZlciBpbnN0YW5jZS4gSXQncyBub3QgcG9zc2libGUgdG8gdXNlIGBpbnN0YW5jZW9mIEJ1ZmZlcmBcbi8vIHJlbGlhYmx5IGluIGEgYnJvd3NlcmlmeSBjb250ZXh0IGJlY2F1c2UgdGhlcmUgY291bGQgYmUgbXVsdGlwbGUgZGlmZmVyZW50XG4vLyBjb3BpZXMgb2YgdGhlICdidWZmZXInIHBhY2thZ2UgaW4gdXNlLiBUaGlzIG1ldGhvZCB3b3JrcyBldmVuIGZvciBCdWZmZXJcbi8vIGluc3RhbmNlcyB0aGF0IHdlcmUgY3JlYXRlZCBmcm9tIGFub3RoZXIgY29weSBvZiB0aGUgYGJ1ZmZlcmAgcGFja2FnZS5cbi8vIFNlZTogaHR0cHM6Ly9naXRodWIuY29tL2Zlcm9zcy9idWZmZXIvaXNzdWVzLzE1NFxuQnVmZmVyLnByb3RvdHlwZS5faXNCdWZmZXIgPSB0cnVlXG5cbmZ1bmN0aW9uIHN3YXAgKGIsIG4sIG0pIHtcbiAgdmFyIGkgPSBiW25dXG4gIGJbbl0gPSBiW21dXG4gIGJbbV0gPSBpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUuc3dhcDE2ID0gZnVuY3Rpb24gc3dhcDE2ICgpIHtcbiAgdmFyIGxlbiA9IHRoaXMubGVuZ3RoXG4gIGlmIChsZW4gJSAyICE9PSAwKSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0J1ZmZlciBzaXplIG11c3QgYmUgYSBtdWx0aXBsZSBvZiAxNi1iaXRzJylcbiAgfVxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgaSArPSAyKSB7XG4gICAgc3dhcCh0aGlzLCBpLCBpICsgMSlcbiAgfVxuICByZXR1cm4gdGhpc1xufVxuXG5CdWZmZXIucHJvdG90eXBlLnN3YXAzMiA9IGZ1bmN0aW9uIHN3YXAzMiAoKSB7XG4gIHZhciBsZW4gPSB0aGlzLmxlbmd0aFxuICBpZiAobGVuICUgNCAhPT0gMCkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdCdWZmZXIgc2l6ZSBtdXN0IGJlIGEgbXVsdGlwbGUgb2YgMzItYml0cycpXG4gIH1cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkgKz0gNCkge1xuICAgIHN3YXAodGhpcywgaSwgaSArIDMpXG4gICAgc3dhcCh0aGlzLCBpICsgMSwgaSArIDIpXG4gIH1cbiAgcmV0dXJuIHRoaXNcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5zd2FwNjQgPSBmdW5jdGlvbiBzd2FwNjQgKCkge1xuICB2YXIgbGVuID0gdGhpcy5sZW5ndGhcbiAgaWYgKGxlbiAlIDggIT09IDApIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignQnVmZmVyIHNpemUgbXVzdCBiZSBhIG11bHRpcGxlIG9mIDY0LWJpdHMnKVxuICB9XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpICs9IDgpIHtcbiAgICBzd2FwKHRoaXMsIGksIGkgKyA3KVxuICAgIHN3YXAodGhpcywgaSArIDEsIGkgKyA2KVxuICAgIHN3YXAodGhpcywgaSArIDIsIGkgKyA1KVxuICAgIHN3YXAodGhpcywgaSArIDMsIGkgKyA0KVxuICB9XG4gIHJldHVybiB0aGlzXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbiB0b1N0cmluZyAoKSB7XG4gIHZhciBsZW5ndGggPSB0aGlzLmxlbmd0aFxuICBpZiAobGVuZ3RoID09PSAwKSByZXR1cm4gJydcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHJldHVybiB1dGY4U2xpY2UodGhpcywgMCwgbGVuZ3RoKVxuICByZXR1cm4gc2xvd1RvU3RyaW5nLmFwcGx5KHRoaXMsIGFyZ3VtZW50cylcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5lcXVhbHMgPSBmdW5jdGlvbiBlcXVhbHMgKGIpIHtcbiAgaWYgKCFCdWZmZXIuaXNCdWZmZXIoYikpIHRocm93IG5ldyBUeXBlRXJyb3IoJ0FyZ3VtZW50IG11c3QgYmUgYSBCdWZmZXInKVxuICBpZiAodGhpcyA9PT0gYikgcmV0dXJuIHRydWVcbiAgcmV0dXJuIEJ1ZmZlci5jb21wYXJlKHRoaXMsIGIpID09PSAwXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUuaW5zcGVjdCA9IGZ1bmN0aW9uIGluc3BlY3QgKCkge1xuICB2YXIgc3RyID0gJydcbiAgdmFyIG1heCA9IGV4cG9ydHMuSU5TUEVDVF9NQVhfQllURVNcbiAgaWYgKHRoaXMubGVuZ3RoID4gMCkge1xuICAgIHN0ciA9IHRoaXMudG9TdHJpbmcoJ2hleCcsIDAsIG1heCkubWF0Y2goLy57Mn0vZykuam9pbignICcpXG4gICAgaWYgKHRoaXMubGVuZ3RoID4gbWF4KSBzdHIgKz0gJyAuLi4gJ1xuICB9XG4gIHJldHVybiAnPEJ1ZmZlciAnICsgc3RyICsgJz4nXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUuY29tcGFyZSA9IGZ1bmN0aW9uIGNvbXBhcmUgKHRhcmdldCwgc3RhcnQsIGVuZCwgdGhpc1N0YXJ0LCB0aGlzRW5kKSB7XG4gIGlmICghQnVmZmVyLmlzQnVmZmVyKHRhcmdldCkpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdBcmd1bWVudCBtdXN0IGJlIGEgQnVmZmVyJylcbiAgfVxuXG4gIGlmIChzdGFydCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgc3RhcnQgPSAwXG4gIH1cbiAgaWYgKGVuZCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgZW5kID0gdGFyZ2V0ID8gdGFyZ2V0Lmxlbmd0aCA6IDBcbiAgfVxuICBpZiAodGhpc1N0YXJ0ID09PSB1bmRlZmluZWQpIHtcbiAgICB0aGlzU3RhcnQgPSAwXG4gIH1cbiAgaWYgKHRoaXNFbmQgPT09IHVuZGVmaW5lZCkge1xuICAgIHRoaXNFbmQgPSB0aGlzLmxlbmd0aFxuICB9XG5cbiAgaWYgKHN0YXJ0IDwgMCB8fCBlbmQgPiB0YXJnZXQubGVuZ3RoIHx8IHRoaXNTdGFydCA8IDAgfHwgdGhpc0VuZCA+IHRoaXMubGVuZ3RoKSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ291dCBvZiByYW5nZSBpbmRleCcpXG4gIH1cblxuICBpZiAodGhpc1N0YXJ0ID49IHRoaXNFbmQgJiYgc3RhcnQgPj0gZW5kKSB7XG4gICAgcmV0dXJuIDBcbiAgfVxuICBpZiAodGhpc1N0YXJ0ID49IHRoaXNFbmQpIHtcbiAgICByZXR1cm4gLTFcbiAgfVxuICBpZiAoc3RhcnQgPj0gZW5kKSB7XG4gICAgcmV0dXJuIDFcbiAgfVxuXG4gIHN0YXJ0ID4+Pj0gMFxuICBlbmQgPj4+PSAwXG4gIHRoaXNTdGFydCA+Pj49IDBcbiAgdGhpc0VuZCA+Pj49IDBcblxuICBpZiAodGhpcyA9PT0gdGFyZ2V0KSByZXR1cm4gMFxuXG4gIHZhciB4ID0gdGhpc0VuZCAtIHRoaXNTdGFydFxuICB2YXIgeSA9IGVuZCAtIHN0YXJ0XG4gIHZhciBsZW4gPSBNYXRoLm1pbih4LCB5KVxuXG4gIHZhciB0aGlzQ29weSA9IHRoaXMuc2xpY2UodGhpc1N0YXJ0LCB0aGlzRW5kKVxuICB2YXIgdGFyZ2V0Q29weSA9IHRhcmdldC5zbGljZShzdGFydCwgZW5kKVxuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyArK2kpIHtcbiAgICBpZiAodGhpc0NvcHlbaV0gIT09IHRhcmdldENvcHlbaV0pIHtcbiAgICAgIHggPSB0aGlzQ29weVtpXVxuICAgICAgeSA9IHRhcmdldENvcHlbaV1cbiAgICAgIGJyZWFrXG4gICAgfVxuICB9XG5cbiAgaWYgKHggPCB5KSByZXR1cm4gLTFcbiAgaWYgKHkgPCB4KSByZXR1cm4gMVxuICByZXR1cm4gMFxufVxuXG4vLyBGaW5kcyBlaXRoZXIgdGhlIGZpcnN0IGluZGV4IG9mIGB2YWxgIGluIGBidWZmZXJgIGF0IG9mZnNldCA+PSBgYnl0ZU9mZnNldGAsXG4vLyBPUiB0aGUgbGFzdCBpbmRleCBvZiBgdmFsYCBpbiBgYnVmZmVyYCBhdCBvZmZzZXQgPD0gYGJ5dGVPZmZzZXRgLlxuLy9cbi8vIEFyZ3VtZW50czpcbi8vIC0gYnVmZmVyIC0gYSBCdWZmZXIgdG8gc2VhcmNoXG4vLyAtIHZhbCAtIGEgc3RyaW5nLCBCdWZmZXIsIG9yIG51bWJlclxuLy8gLSBieXRlT2Zmc2V0IC0gYW4gaW5kZXggaW50byBgYnVmZmVyYDsgd2lsbCBiZSBjbGFtcGVkIHRvIGFuIGludDMyXG4vLyAtIGVuY29kaW5nIC0gYW4gb3B0aW9uYWwgZW5jb2RpbmcsIHJlbGV2YW50IGlzIHZhbCBpcyBhIHN0cmluZ1xuLy8gLSBkaXIgLSB0cnVlIGZvciBpbmRleE9mLCBmYWxzZSBmb3IgbGFzdEluZGV4T2ZcbmZ1bmN0aW9uIGJpZGlyZWN0aW9uYWxJbmRleE9mIChidWZmZXIsIHZhbCwgYnl0ZU9mZnNldCwgZW5jb2RpbmcsIGRpcikge1xuICAvLyBFbXB0eSBidWZmZXIgbWVhbnMgbm8gbWF0Y2hcbiAgaWYgKGJ1ZmZlci5sZW5ndGggPT09IDApIHJldHVybiAtMVxuXG4gIC8vIE5vcm1hbGl6ZSBieXRlT2Zmc2V0XG4gIGlmICh0eXBlb2YgYnl0ZU9mZnNldCA9PT0gJ3N0cmluZycpIHtcbiAgICBlbmNvZGluZyA9IGJ5dGVPZmZzZXRcbiAgICBieXRlT2Zmc2V0ID0gMFxuICB9IGVsc2UgaWYgKGJ5dGVPZmZzZXQgPiAweDdmZmZmZmZmKSB7XG4gICAgYnl0ZU9mZnNldCA9IDB4N2ZmZmZmZmZcbiAgfSBlbHNlIGlmIChieXRlT2Zmc2V0IDwgLTB4ODAwMDAwMDApIHtcbiAgICBieXRlT2Zmc2V0ID0gLTB4ODAwMDAwMDBcbiAgfVxuICBieXRlT2Zmc2V0ID0gK2J5dGVPZmZzZXQgIC8vIENvZXJjZSB0byBOdW1iZXIuXG4gIGlmIChudW1iZXJJc05hTihieXRlT2Zmc2V0KSkge1xuICAgIC8vIGJ5dGVPZmZzZXQ6IGl0IGl0J3MgdW5kZWZpbmVkLCBudWxsLCBOYU4sIFwiZm9vXCIsIGV0Yywgc2VhcmNoIHdob2xlIGJ1ZmZlclxuICAgIGJ5dGVPZmZzZXQgPSBkaXIgPyAwIDogKGJ1ZmZlci5sZW5ndGggLSAxKVxuICB9XG5cbiAgLy8gTm9ybWFsaXplIGJ5dGVPZmZzZXQ6IG5lZ2F0aXZlIG9mZnNldHMgc3RhcnQgZnJvbSB0aGUgZW5kIG9mIHRoZSBidWZmZXJcbiAgaWYgKGJ5dGVPZmZzZXQgPCAwKSBieXRlT2Zmc2V0ID0gYnVmZmVyLmxlbmd0aCArIGJ5dGVPZmZzZXRcbiAgaWYgKGJ5dGVPZmZzZXQgPj0gYnVmZmVyLmxlbmd0aCkge1xuICAgIGlmIChkaXIpIHJldHVybiAtMVxuICAgIGVsc2UgYnl0ZU9mZnNldCA9IGJ1ZmZlci5sZW5ndGggLSAxXG4gIH0gZWxzZSBpZiAoYnl0ZU9mZnNldCA8IDApIHtcbiAgICBpZiAoZGlyKSBieXRlT2Zmc2V0ID0gMFxuICAgIGVsc2UgcmV0dXJuIC0xXG4gIH1cblxuICAvLyBOb3JtYWxpemUgdmFsXG4gIGlmICh0eXBlb2YgdmFsID09PSAnc3RyaW5nJykge1xuICAgIHZhbCA9IEJ1ZmZlci5mcm9tKHZhbCwgZW5jb2RpbmcpXG4gIH1cblxuICAvLyBGaW5hbGx5LCBzZWFyY2ggZWl0aGVyIGluZGV4T2YgKGlmIGRpciBpcyB0cnVlKSBvciBsYXN0SW5kZXhPZlxuICBpZiAoQnVmZmVyLmlzQnVmZmVyKHZhbCkpIHtcbiAgICAvLyBTcGVjaWFsIGNhc2U6IGxvb2tpbmcgZm9yIGVtcHR5IHN0cmluZy9idWZmZXIgYWx3YXlzIGZhaWxzXG4gICAgaWYgKHZhbC5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiAtMVxuICAgIH1cbiAgICByZXR1cm4gYXJyYXlJbmRleE9mKGJ1ZmZlciwgdmFsLCBieXRlT2Zmc2V0LCBlbmNvZGluZywgZGlyKVxuICB9IGVsc2UgaWYgKHR5cGVvZiB2YWwgPT09ICdudW1iZXInKSB7XG4gICAgdmFsID0gdmFsICYgMHhGRiAvLyBTZWFyY2ggZm9yIGEgYnl0ZSB2YWx1ZSBbMC0yNTVdXG4gICAgaWYgKHR5cGVvZiBVaW50OEFycmF5LnByb3RvdHlwZS5pbmRleE9mID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICBpZiAoZGlyKSB7XG4gICAgICAgIHJldHVybiBVaW50OEFycmF5LnByb3RvdHlwZS5pbmRleE9mLmNhbGwoYnVmZmVyLCB2YWwsIGJ5dGVPZmZzZXQpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gVWludDhBcnJheS5wcm90b3R5cGUubGFzdEluZGV4T2YuY2FsbChidWZmZXIsIHZhbCwgYnl0ZU9mZnNldClcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGFycmF5SW5kZXhPZihidWZmZXIsIFsgdmFsIF0sIGJ5dGVPZmZzZXQsIGVuY29kaW5nLCBkaXIpXG4gIH1cblxuICB0aHJvdyBuZXcgVHlwZUVycm9yKCd2YWwgbXVzdCBiZSBzdHJpbmcsIG51bWJlciBvciBCdWZmZXInKVxufVxuXG5mdW5jdGlvbiBhcnJheUluZGV4T2YgKGFyciwgdmFsLCBieXRlT2Zmc2V0LCBlbmNvZGluZywgZGlyKSB7XG4gIHZhciBpbmRleFNpemUgPSAxXG4gIHZhciBhcnJMZW5ndGggPSBhcnIubGVuZ3RoXG4gIHZhciB2YWxMZW5ndGggPSB2YWwubGVuZ3RoXG5cbiAgaWYgKGVuY29kaW5nICE9PSB1bmRlZmluZWQpIHtcbiAgICBlbmNvZGluZyA9IFN0cmluZyhlbmNvZGluZykudG9Mb3dlckNhc2UoKVxuICAgIGlmIChlbmNvZGluZyA9PT0gJ3VjczInIHx8IGVuY29kaW5nID09PSAndWNzLTInIHx8XG4gICAgICAgIGVuY29kaW5nID09PSAndXRmMTZsZScgfHwgZW5jb2RpbmcgPT09ICd1dGYtMTZsZScpIHtcbiAgICAgIGlmIChhcnIubGVuZ3RoIDwgMiB8fCB2YWwubGVuZ3RoIDwgMikge1xuICAgICAgICByZXR1cm4gLTFcbiAgICAgIH1cbiAgICAgIGluZGV4U2l6ZSA9IDJcbiAgICAgIGFyckxlbmd0aCAvPSAyXG4gICAgICB2YWxMZW5ndGggLz0gMlxuICAgICAgYnl0ZU9mZnNldCAvPSAyXG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gcmVhZCAoYnVmLCBpKSB7XG4gICAgaWYgKGluZGV4U2l6ZSA9PT0gMSkge1xuICAgICAgcmV0dXJuIGJ1ZltpXVxuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gYnVmLnJlYWRVSW50MTZCRShpICogaW5kZXhTaXplKVxuICAgIH1cbiAgfVxuXG4gIHZhciBpXG4gIGlmIChkaXIpIHtcbiAgICB2YXIgZm91bmRJbmRleCA9IC0xXG4gICAgZm9yIChpID0gYnl0ZU9mZnNldDsgaSA8IGFyckxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAocmVhZChhcnIsIGkpID09PSByZWFkKHZhbCwgZm91bmRJbmRleCA9PT0gLTEgPyAwIDogaSAtIGZvdW5kSW5kZXgpKSB7XG4gICAgICAgIGlmIChmb3VuZEluZGV4ID09PSAtMSkgZm91bmRJbmRleCA9IGlcbiAgICAgICAgaWYgKGkgLSBmb3VuZEluZGV4ICsgMSA9PT0gdmFsTGVuZ3RoKSByZXR1cm4gZm91bmRJbmRleCAqIGluZGV4U2l6ZVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKGZvdW5kSW5kZXggIT09IC0xKSBpIC09IGkgLSBmb3VuZEluZGV4XG4gICAgICAgIGZvdW5kSW5kZXggPSAtMVxuICAgICAgfVxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBpZiAoYnl0ZU9mZnNldCArIHZhbExlbmd0aCA+IGFyckxlbmd0aCkgYnl0ZU9mZnNldCA9IGFyckxlbmd0aCAtIHZhbExlbmd0aFxuICAgIGZvciAoaSA9IGJ5dGVPZmZzZXQ7IGkgPj0gMDsgaS0tKSB7XG4gICAgICB2YXIgZm91bmQgPSB0cnVlXG4gICAgICBmb3IgKHZhciBqID0gMDsgaiA8IHZhbExlbmd0aDsgaisrKSB7XG4gICAgICAgIGlmIChyZWFkKGFyciwgaSArIGopICE9PSByZWFkKHZhbCwgaikpIHtcbiAgICAgICAgICBmb3VuZCA9IGZhbHNlXG4gICAgICAgICAgYnJlYWtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKGZvdW5kKSByZXR1cm4gaVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiAtMVxufVxuXG5CdWZmZXIucHJvdG90eXBlLmluY2x1ZGVzID0gZnVuY3Rpb24gaW5jbHVkZXMgKHZhbCwgYnl0ZU9mZnNldCwgZW5jb2RpbmcpIHtcbiAgcmV0dXJuIHRoaXMuaW5kZXhPZih2YWwsIGJ5dGVPZmZzZXQsIGVuY29kaW5nKSAhPT0gLTFcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5pbmRleE9mID0gZnVuY3Rpb24gaW5kZXhPZiAodmFsLCBieXRlT2Zmc2V0LCBlbmNvZGluZykge1xuICByZXR1cm4gYmlkaXJlY3Rpb25hbEluZGV4T2YodGhpcywgdmFsLCBieXRlT2Zmc2V0LCBlbmNvZGluZywgdHJ1ZSlcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5sYXN0SW5kZXhPZiA9IGZ1bmN0aW9uIGxhc3RJbmRleE9mICh2YWwsIGJ5dGVPZmZzZXQsIGVuY29kaW5nKSB7XG4gIHJldHVybiBiaWRpcmVjdGlvbmFsSW5kZXhPZih0aGlzLCB2YWwsIGJ5dGVPZmZzZXQsIGVuY29kaW5nLCBmYWxzZSlcbn1cblxuZnVuY3Rpb24gaGV4V3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICBvZmZzZXQgPSBOdW1iZXIob2Zmc2V0KSB8fCAwXG4gIHZhciByZW1haW5pbmcgPSBidWYubGVuZ3RoIC0gb2Zmc2V0XG4gIGlmICghbGVuZ3RoKSB7XG4gICAgbGVuZ3RoID0gcmVtYWluaW5nXG4gIH0gZWxzZSB7XG4gICAgbGVuZ3RoID0gTnVtYmVyKGxlbmd0aClcbiAgICBpZiAobGVuZ3RoID4gcmVtYWluaW5nKSB7XG4gICAgICBsZW5ndGggPSByZW1haW5pbmdcbiAgICB9XG4gIH1cblxuICAvLyBtdXN0IGJlIGFuIGV2ZW4gbnVtYmVyIG9mIGRpZ2l0c1xuICB2YXIgc3RyTGVuID0gc3RyaW5nLmxlbmd0aFxuICBpZiAoc3RyTGVuICUgMiAhPT0gMCkgdGhyb3cgbmV3IFR5cGVFcnJvcignSW52YWxpZCBoZXggc3RyaW5nJylcblxuICBpZiAobGVuZ3RoID4gc3RyTGVuIC8gMikge1xuICAgIGxlbmd0aCA9IHN0ckxlbiAvIDJcbiAgfVxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgKytpKSB7XG4gICAgdmFyIHBhcnNlZCA9IHBhcnNlSW50KHN0cmluZy5zdWJzdHIoaSAqIDIsIDIpLCAxNilcbiAgICBpZiAobnVtYmVySXNOYU4ocGFyc2VkKSkgcmV0dXJuIGlcbiAgICBidWZbb2Zmc2V0ICsgaV0gPSBwYXJzZWRcbiAgfVxuICByZXR1cm4gaVxufVxuXG5mdW5jdGlvbiB1dGY4V3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICByZXR1cm4gYmxpdEJ1ZmZlcih1dGY4VG9CeXRlcyhzdHJpbmcsIGJ1Zi5sZW5ndGggLSBvZmZzZXQpLCBidWYsIG9mZnNldCwgbGVuZ3RoKVxufVxuXG5mdW5jdGlvbiBhc2NpaVdyaXRlIChidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgcmV0dXJuIGJsaXRCdWZmZXIoYXNjaWlUb0J5dGVzKHN0cmluZyksIGJ1Ziwgb2Zmc2V0LCBsZW5ndGgpXG59XG5cbmZ1bmN0aW9uIGxhdGluMVdyaXRlIChidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgcmV0dXJuIGFzY2lpV3JpdGUoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxufVxuXG5mdW5jdGlvbiBiYXNlNjRXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHJldHVybiBibGl0QnVmZmVyKGJhc2U2NFRvQnl0ZXMoc3RyaW5nKSwgYnVmLCBvZmZzZXQsIGxlbmd0aClcbn1cblxuZnVuY3Rpb24gdWNzMldyaXRlIChidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgcmV0dXJuIGJsaXRCdWZmZXIodXRmMTZsZVRvQnl0ZXMoc3RyaW5nLCBidWYubGVuZ3RoIC0gb2Zmc2V0KSwgYnVmLCBvZmZzZXQsIGxlbmd0aClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZSA9IGZ1bmN0aW9uIHdyaXRlIChzdHJpbmcsIG9mZnNldCwgbGVuZ3RoLCBlbmNvZGluZykge1xuICAvLyBCdWZmZXIjd3JpdGUoc3RyaW5nKVxuICBpZiAob2Zmc2V0ID09PSB1bmRlZmluZWQpIHtcbiAgICBlbmNvZGluZyA9ICd1dGY4J1xuICAgIGxlbmd0aCA9IHRoaXMubGVuZ3RoXG4gICAgb2Zmc2V0ID0gMFxuICAvLyBCdWZmZXIjd3JpdGUoc3RyaW5nLCBlbmNvZGluZylcbiAgfSBlbHNlIGlmIChsZW5ndGggPT09IHVuZGVmaW5lZCAmJiB0eXBlb2Ygb2Zmc2V0ID09PSAnc3RyaW5nJykge1xuICAgIGVuY29kaW5nID0gb2Zmc2V0XG4gICAgbGVuZ3RoID0gdGhpcy5sZW5ndGhcbiAgICBvZmZzZXQgPSAwXG4gIC8vIEJ1ZmZlciN3cml0ZShzdHJpbmcsIG9mZnNldFssIGxlbmd0aF1bLCBlbmNvZGluZ10pXG4gIH0gZWxzZSBpZiAoaXNGaW5pdGUob2Zmc2V0KSkge1xuICAgIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICAgIGlmIChpc0Zpbml0ZShsZW5ndGgpKSB7XG4gICAgICBsZW5ndGggPSBsZW5ndGggPj4+IDBcbiAgICAgIGlmIChlbmNvZGluZyA9PT0gdW5kZWZpbmVkKSBlbmNvZGluZyA9ICd1dGY4J1xuICAgIH0gZWxzZSB7XG4gICAgICBlbmNvZGluZyA9IGxlbmd0aFxuICAgICAgbGVuZ3RoID0gdW5kZWZpbmVkXG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICdCdWZmZXIud3JpdGUoc3RyaW5nLCBlbmNvZGluZywgb2Zmc2V0WywgbGVuZ3RoXSkgaXMgbm8gbG9uZ2VyIHN1cHBvcnRlZCdcbiAgICApXG4gIH1cblxuICB2YXIgcmVtYWluaW5nID0gdGhpcy5sZW5ndGggLSBvZmZzZXRcbiAgaWYgKGxlbmd0aCA9PT0gdW5kZWZpbmVkIHx8IGxlbmd0aCA+IHJlbWFpbmluZykgbGVuZ3RoID0gcmVtYWluaW5nXG5cbiAgaWYgKChzdHJpbmcubGVuZ3RoID4gMCAmJiAobGVuZ3RoIDwgMCB8fCBvZmZzZXQgPCAwKSkgfHwgb2Zmc2V0ID4gdGhpcy5sZW5ndGgpIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignQXR0ZW1wdCB0byB3cml0ZSBvdXRzaWRlIGJ1ZmZlciBib3VuZHMnKVxuICB9XG5cbiAgaWYgKCFlbmNvZGluZykgZW5jb2RpbmcgPSAndXRmOCdcblxuICB2YXIgbG93ZXJlZENhc2UgPSBmYWxzZVxuICBmb3IgKDs7KSB7XG4gICAgc3dpdGNoIChlbmNvZGluZykge1xuICAgICAgY2FzZSAnaGV4JzpcbiAgICAgICAgcmV0dXJuIGhleFdyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG5cbiAgICAgIGNhc2UgJ3V0ZjgnOlxuICAgICAgY2FzZSAndXRmLTgnOlxuICAgICAgICByZXR1cm4gdXRmOFdyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG5cbiAgICAgIGNhc2UgJ2FzY2lpJzpcbiAgICAgICAgcmV0dXJuIGFzY2lpV3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcblxuICAgICAgY2FzZSAnbGF0aW4xJzpcbiAgICAgIGNhc2UgJ2JpbmFyeSc6XG4gICAgICAgIHJldHVybiBsYXRpbjFXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuXG4gICAgICBjYXNlICdiYXNlNjQnOlxuICAgICAgICAvLyBXYXJuaW5nOiBtYXhMZW5ndGggbm90IHRha2VuIGludG8gYWNjb3VudCBpbiBiYXNlNjRXcml0ZVxuICAgICAgICByZXR1cm4gYmFzZTY0V3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcblxuICAgICAgY2FzZSAndWNzMic6XG4gICAgICBjYXNlICd1Y3MtMic6XG4gICAgICBjYXNlICd1dGYxNmxlJzpcbiAgICAgIGNhc2UgJ3V0Zi0xNmxlJzpcbiAgICAgICAgcmV0dXJuIHVjczJXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuXG4gICAgICBkZWZhdWx0OlxuICAgICAgICBpZiAobG93ZXJlZENhc2UpIHRocm93IG5ldyBUeXBlRXJyb3IoJ1Vua25vd24gZW5jb2Rpbmc6ICcgKyBlbmNvZGluZylcbiAgICAgICAgZW5jb2RpbmcgPSAoJycgKyBlbmNvZGluZykudG9Mb3dlckNhc2UoKVxuICAgICAgICBsb3dlcmVkQ2FzZSA9IHRydWVcbiAgICB9XG4gIH1cbn1cblxuQnVmZmVyLnByb3RvdHlwZS50b0pTT04gPSBmdW5jdGlvbiB0b0pTT04gKCkge1xuICByZXR1cm4ge1xuICAgIHR5cGU6ICdCdWZmZXInLFxuICAgIGRhdGE6IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKHRoaXMuX2FyciB8fCB0aGlzLCAwKVxuICB9XG59XG5cbmZ1bmN0aW9uIGJhc2U2NFNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgaWYgKHN0YXJ0ID09PSAwICYmIGVuZCA9PT0gYnVmLmxlbmd0aCkge1xuICAgIHJldHVybiBiYXNlNjQuZnJvbUJ5dGVBcnJheShidWYpXG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGJhc2U2NC5mcm9tQnl0ZUFycmF5KGJ1Zi5zbGljZShzdGFydCwgZW5kKSlcbiAgfVxufVxuXG5mdW5jdGlvbiB1dGY4U2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICBlbmQgPSBNYXRoLm1pbihidWYubGVuZ3RoLCBlbmQpXG4gIHZhciByZXMgPSBbXVxuXG4gIHZhciBpID0gc3RhcnRcbiAgd2hpbGUgKGkgPCBlbmQpIHtcbiAgICB2YXIgZmlyc3RCeXRlID0gYnVmW2ldXG4gICAgdmFyIGNvZGVQb2ludCA9IG51bGxcbiAgICB2YXIgYnl0ZXNQZXJTZXF1ZW5jZSA9IChmaXJzdEJ5dGUgPiAweEVGKSA/IDRcbiAgICAgIDogKGZpcnN0Qnl0ZSA+IDB4REYpID8gM1xuICAgICAgOiAoZmlyc3RCeXRlID4gMHhCRikgPyAyXG4gICAgICA6IDFcblxuICAgIGlmIChpICsgYnl0ZXNQZXJTZXF1ZW5jZSA8PSBlbmQpIHtcbiAgICAgIHZhciBzZWNvbmRCeXRlLCB0aGlyZEJ5dGUsIGZvdXJ0aEJ5dGUsIHRlbXBDb2RlUG9pbnRcblxuICAgICAgc3dpdGNoIChieXRlc1BlclNlcXVlbmNlKSB7XG4gICAgICAgIGNhc2UgMTpcbiAgICAgICAgICBpZiAoZmlyc3RCeXRlIDwgMHg4MCkge1xuICAgICAgICAgICAgY29kZVBvaW50ID0gZmlyc3RCeXRlXG4gICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrXG4gICAgICAgIGNhc2UgMjpcbiAgICAgICAgICBzZWNvbmRCeXRlID0gYnVmW2kgKyAxXVxuICAgICAgICAgIGlmICgoc2Vjb25kQnl0ZSAmIDB4QzApID09PSAweDgwKSB7XG4gICAgICAgICAgICB0ZW1wQ29kZVBvaW50ID0gKGZpcnN0Qnl0ZSAmIDB4MUYpIDw8IDB4NiB8IChzZWNvbmRCeXRlICYgMHgzRilcbiAgICAgICAgICAgIGlmICh0ZW1wQ29kZVBvaW50ID4gMHg3Rikge1xuICAgICAgICAgICAgICBjb2RlUG9pbnQgPSB0ZW1wQ29kZVBvaW50XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrXG4gICAgICAgIGNhc2UgMzpcbiAgICAgICAgICBzZWNvbmRCeXRlID0gYnVmW2kgKyAxXVxuICAgICAgICAgIHRoaXJkQnl0ZSA9IGJ1ZltpICsgMl1cbiAgICAgICAgICBpZiAoKHNlY29uZEJ5dGUgJiAweEMwKSA9PT0gMHg4MCAmJiAodGhpcmRCeXRlICYgMHhDMCkgPT09IDB4ODApIHtcbiAgICAgICAgICAgIHRlbXBDb2RlUG9pbnQgPSAoZmlyc3RCeXRlICYgMHhGKSA8PCAweEMgfCAoc2Vjb25kQnl0ZSAmIDB4M0YpIDw8IDB4NiB8ICh0aGlyZEJ5dGUgJiAweDNGKVxuICAgICAgICAgICAgaWYgKHRlbXBDb2RlUG9pbnQgPiAweDdGRiAmJiAodGVtcENvZGVQb2ludCA8IDB4RDgwMCB8fCB0ZW1wQ29kZVBvaW50ID4gMHhERkZGKSkge1xuICAgICAgICAgICAgICBjb2RlUG9pbnQgPSB0ZW1wQ29kZVBvaW50XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrXG4gICAgICAgIGNhc2UgNDpcbiAgICAgICAgICBzZWNvbmRCeXRlID0gYnVmW2kgKyAxXVxuICAgICAgICAgIHRoaXJkQnl0ZSA9IGJ1ZltpICsgMl1cbiAgICAgICAgICBmb3VydGhCeXRlID0gYnVmW2kgKyAzXVxuICAgICAgICAgIGlmICgoc2Vjb25kQnl0ZSAmIDB4QzApID09PSAweDgwICYmICh0aGlyZEJ5dGUgJiAweEMwKSA9PT0gMHg4MCAmJiAoZm91cnRoQnl0ZSAmIDB4QzApID09PSAweDgwKSB7XG4gICAgICAgICAgICB0ZW1wQ29kZVBvaW50ID0gKGZpcnN0Qnl0ZSAmIDB4RikgPDwgMHgxMiB8IChzZWNvbmRCeXRlICYgMHgzRikgPDwgMHhDIHwgKHRoaXJkQnl0ZSAmIDB4M0YpIDw8IDB4NiB8IChmb3VydGhCeXRlICYgMHgzRilcbiAgICAgICAgICAgIGlmICh0ZW1wQ29kZVBvaW50ID4gMHhGRkZGICYmIHRlbXBDb2RlUG9pbnQgPCAweDExMDAwMCkge1xuICAgICAgICAgICAgICBjb2RlUG9pbnQgPSB0ZW1wQ29kZVBvaW50XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChjb2RlUG9pbnQgPT09IG51bGwpIHtcbiAgICAgIC8vIHdlIGRpZCBub3QgZ2VuZXJhdGUgYSB2YWxpZCBjb2RlUG9pbnQgc28gaW5zZXJ0IGFcbiAgICAgIC8vIHJlcGxhY2VtZW50IGNoYXIgKFUrRkZGRCkgYW5kIGFkdmFuY2Ugb25seSAxIGJ5dGVcbiAgICAgIGNvZGVQb2ludCA9IDB4RkZGRFxuICAgICAgYnl0ZXNQZXJTZXF1ZW5jZSA9IDFcbiAgICB9IGVsc2UgaWYgKGNvZGVQb2ludCA+IDB4RkZGRikge1xuICAgICAgLy8gZW5jb2RlIHRvIHV0ZjE2IChzdXJyb2dhdGUgcGFpciBkYW5jZSlcbiAgICAgIGNvZGVQb2ludCAtPSAweDEwMDAwXG4gICAgICByZXMucHVzaChjb2RlUG9pbnQgPj4+IDEwICYgMHgzRkYgfCAweEQ4MDApXG4gICAgICBjb2RlUG9pbnQgPSAweERDMDAgfCBjb2RlUG9pbnQgJiAweDNGRlxuICAgIH1cblxuICAgIHJlcy5wdXNoKGNvZGVQb2ludClcbiAgICBpICs9IGJ5dGVzUGVyU2VxdWVuY2VcbiAgfVxuXG4gIHJldHVybiBkZWNvZGVDb2RlUG9pbnRzQXJyYXkocmVzKVxufVxuXG4vLyBCYXNlZCBvbiBodHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vYS8yMjc0NzI3Mi82ODA3NDIsIHRoZSBicm93c2VyIHdpdGhcbi8vIHRoZSBsb3dlc3QgbGltaXQgaXMgQ2hyb21lLCB3aXRoIDB4MTAwMDAgYXJncy5cbi8vIFdlIGdvIDEgbWFnbml0dWRlIGxlc3MsIGZvciBzYWZldHlcbnZhciBNQVhfQVJHVU1FTlRTX0xFTkdUSCA9IDB4MTAwMFxuXG5mdW5jdGlvbiBkZWNvZGVDb2RlUG9pbnRzQXJyYXkgKGNvZGVQb2ludHMpIHtcbiAgdmFyIGxlbiA9IGNvZGVQb2ludHMubGVuZ3RoXG4gIGlmIChsZW4gPD0gTUFYX0FSR1VNRU5UU19MRU5HVEgpIHtcbiAgICByZXR1cm4gU3RyaW5nLmZyb21DaGFyQ29kZS5hcHBseShTdHJpbmcsIGNvZGVQb2ludHMpIC8vIGF2b2lkIGV4dHJhIHNsaWNlKClcbiAgfVxuXG4gIC8vIERlY29kZSBpbiBjaHVua3MgdG8gYXZvaWQgXCJjYWxsIHN0YWNrIHNpemUgZXhjZWVkZWRcIi5cbiAgdmFyIHJlcyA9ICcnXG4gIHZhciBpID0gMFxuICB3aGlsZSAoaSA8IGxlbikge1xuICAgIHJlcyArPSBTdHJpbmcuZnJvbUNoYXJDb2RlLmFwcGx5KFxuICAgICAgU3RyaW5nLFxuICAgICAgY29kZVBvaW50cy5zbGljZShpLCBpICs9IE1BWF9BUkdVTUVOVFNfTEVOR1RIKVxuICAgIClcbiAgfVxuICByZXR1cm4gcmVzXG59XG5cbmZ1bmN0aW9uIGFzY2lpU2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICB2YXIgcmV0ID0gJydcbiAgZW5kID0gTWF0aC5taW4oYnVmLmxlbmd0aCwgZW5kKVxuXG4gIGZvciAodmFyIGkgPSBzdGFydDsgaSA8IGVuZDsgKytpKSB7XG4gICAgcmV0ICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoYnVmW2ldICYgMHg3RilcbiAgfVxuICByZXR1cm4gcmV0XG59XG5cbmZ1bmN0aW9uIGxhdGluMVNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIHJldCA9ICcnXG4gIGVuZCA9IE1hdGgubWluKGJ1Zi5sZW5ndGgsIGVuZClcblxuICBmb3IgKHZhciBpID0gc3RhcnQ7IGkgPCBlbmQ7ICsraSkge1xuICAgIHJldCArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGJ1ZltpXSlcbiAgfVxuICByZXR1cm4gcmV0XG59XG5cbmZ1bmN0aW9uIGhleFNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIGxlbiA9IGJ1Zi5sZW5ndGhcblxuICBpZiAoIXN0YXJ0IHx8IHN0YXJ0IDwgMCkgc3RhcnQgPSAwXG4gIGlmICghZW5kIHx8IGVuZCA8IDAgfHwgZW5kID4gbGVuKSBlbmQgPSBsZW5cblxuICB2YXIgb3V0ID0gJydcbiAgZm9yICh2YXIgaSA9IHN0YXJ0OyBpIDwgZW5kOyArK2kpIHtcbiAgICBvdXQgKz0gdG9IZXgoYnVmW2ldKVxuICB9XG4gIHJldHVybiBvdXRcbn1cblxuZnVuY3Rpb24gdXRmMTZsZVNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIGJ5dGVzID0gYnVmLnNsaWNlKHN0YXJ0LCBlbmQpXG4gIHZhciByZXMgPSAnJ1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGJ5dGVzLmxlbmd0aDsgaSArPSAyKSB7XG4gICAgcmVzICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoYnl0ZXNbaV0gKyAoYnl0ZXNbaSArIDFdICogMjU2KSlcbiAgfVxuICByZXR1cm4gcmVzXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUuc2xpY2UgPSBmdW5jdGlvbiBzbGljZSAoc3RhcnQsIGVuZCkge1xuICB2YXIgbGVuID0gdGhpcy5sZW5ndGhcbiAgc3RhcnQgPSB+fnN0YXJ0XG4gIGVuZCA9IGVuZCA9PT0gdW5kZWZpbmVkID8gbGVuIDogfn5lbmRcblxuICBpZiAoc3RhcnQgPCAwKSB7XG4gICAgc3RhcnQgKz0gbGVuXG4gICAgaWYgKHN0YXJ0IDwgMCkgc3RhcnQgPSAwXG4gIH0gZWxzZSBpZiAoc3RhcnQgPiBsZW4pIHtcbiAgICBzdGFydCA9IGxlblxuICB9XG5cbiAgaWYgKGVuZCA8IDApIHtcbiAgICBlbmQgKz0gbGVuXG4gICAgaWYgKGVuZCA8IDApIGVuZCA9IDBcbiAgfSBlbHNlIGlmIChlbmQgPiBsZW4pIHtcbiAgICBlbmQgPSBsZW5cbiAgfVxuXG4gIGlmIChlbmQgPCBzdGFydCkgZW5kID0gc3RhcnRcblxuICB2YXIgbmV3QnVmID0gdGhpcy5zdWJhcnJheShzdGFydCwgZW5kKVxuICAvLyBSZXR1cm4gYW4gYXVnbWVudGVkIGBVaW50OEFycmF5YCBpbnN0YW5jZVxuICBuZXdCdWYuX19wcm90b19fID0gQnVmZmVyLnByb3RvdHlwZVxuICByZXR1cm4gbmV3QnVmXG59XG5cbi8qXG4gKiBOZWVkIHRvIG1ha2Ugc3VyZSB0aGF0IGJ1ZmZlciBpc24ndCB0cnlpbmcgdG8gd3JpdGUgb3V0IG9mIGJvdW5kcy5cbiAqL1xuZnVuY3Rpb24gY2hlY2tPZmZzZXQgKG9mZnNldCwgZXh0LCBsZW5ndGgpIHtcbiAgaWYgKChvZmZzZXQgJSAxKSAhPT0gMCB8fCBvZmZzZXQgPCAwKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignb2Zmc2V0IGlzIG5vdCB1aW50JylcbiAgaWYgKG9mZnNldCArIGV4dCA+IGxlbmd0aCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ1RyeWluZyB0byBhY2Nlc3MgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50TEUgPSBmdW5jdGlvbiByZWFkVUludExFIChvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBieXRlTGVuZ3RoID0gYnl0ZUxlbmd0aCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIGJ5dGVMZW5ndGgsIHRoaXMubGVuZ3RoKVxuXG4gIHZhciB2YWwgPSB0aGlzW29mZnNldF1cbiAgdmFyIG11bCA9IDFcbiAgdmFyIGkgPSAwXG4gIHdoaWxlICgrK2kgPCBieXRlTGVuZ3RoICYmIChtdWwgKj0gMHgxMDApKSB7XG4gICAgdmFsICs9IHRoaXNbb2Zmc2V0ICsgaV0gKiBtdWxcbiAgfVxuXG4gIHJldHVybiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludEJFID0gZnVuY3Rpb24gcmVhZFVJbnRCRSAob2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgYnl0ZUxlbmd0aCA9IGJ5dGVMZW5ndGggPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGNoZWNrT2Zmc2V0KG9mZnNldCwgYnl0ZUxlbmd0aCwgdGhpcy5sZW5ndGgpXG4gIH1cblxuICB2YXIgdmFsID0gdGhpc1tvZmZzZXQgKyAtLWJ5dGVMZW5ndGhdXG4gIHZhciBtdWwgPSAxXG4gIHdoaWxlIChieXRlTGVuZ3RoID4gMCAmJiAobXVsICo9IDB4MTAwKSkge1xuICAgIHZhbCArPSB0aGlzW29mZnNldCArIC0tYnl0ZUxlbmd0aF0gKiBtdWxcbiAgfVxuXG4gIHJldHVybiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDggPSBmdW5jdGlvbiByZWFkVUludDggKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgMSwgdGhpcy5sZW5ndGgpXG4gIHJldHVybiB0aGlzW29mZnNldF1cbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDE2TEUgPSBmdW5jdGlvbiByZWFkVUludDE2TEUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgMiwgdGhpcy5sZW5ndGgpXG4gIHJldHVybiB0aGlzW29mZnNldF0gfCAodGhpc1tvZmZzZXQgKyAxXSA8PCA4KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50MTZCRSA9IGZ1bmN0aW9uIHJlYWRVSW50MTZCRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCAyLCB0aGlzLmxlbmd0aClcbiAgcmV0dXJuICh0aGlzW29mZnNldF0gPDwgOCkgfCB0aGlzW29mZnNldCArIDFdXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnQzMkxFID0gZnVuY3Rpb24gcmVhZFVJbnQzMkxFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDQsIHRoaXMubGVuZ3RoKVxuXG4gIHJldHVybiAoKHRoaXNbb2Zmc2V0XSkgfFxuICAgICAgKHRoaXNbb2Zmc2V0ICsgMV0gPDwgOCkgfFxuICAgICAgKHRoaXNbb2Zmc2V0ICsgMl0gPDwgMTYpKSArXG4gICAgICAodGhpc1tvZmZzZXQgKyAzXSAqIDB4MTAwMDAwMClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDMyQkUgPSBmdW5jdGlvbiByZWFkVUludDMyQkUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgNCwgdGhpcy5sZW5ndGgpXG5cbiAgcmV0dXJuICh0aGlzW29mZnNldF0gKiAweDEwMDAwMDApICtcbiAgICAoKHRoaXNbb2Zmc2V0ICsgMV0gPDwgMTYpIHxcbiAgICAodGhpc1tvZmZzZXQgKyAyXSA8PCA4KSB8XG4gICAgdGhpc1tvZmZzZXQgKyAzXSlcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50TEUgPSBmdW5jdGlvbiByZWFkSW50TEUgKG9mZnNldCwgYnl0ZUxlbmd0aCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGJ5dGVMZW5ndGggPSBieXRlTGVuZ3RoID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgYnl0ZUxlbmd0aCwgdGhpcy5sZW5ndGgpXG5cbiAgdmFyIHZhbCA9IHRoaXNbb2Zmc2V0XVxuICB2YXIgbXVsID0gMVxuICB2YXIgaSA9IDBcbiAgd2hpbGUgKCsraSA8IGJ5dGVMZW5ndGggJiYgKG11bCAqPSAweDEwMCkpIHtcbiAgICB2YWwgKz0gdGhpc1tvZmZzZXQgKyBpXSAqIG11bFxuICB9XG4gIG11bCAqPSAweDgwXG5cbiAgaWYgKHZhbCA+PSBtdWwpIHZhbCAtPSBNYXRoLnBvdygyLCA4ICogYnl0ZUxlbmd0aClcblxuICByZXR1cm4gdmFsXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludEJFID0gZnVuY3Rpb24gcmVhZEludEJFIChvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBieXRlTGVuZ3RoID0gYnl0ZUxlbmd0aCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIGJ5dGVMZW5ndGgsIHRoaXMubGVuZ3RoKVxuXG4gIHZhciBpID0gYnl0ZUxlbmd0aFxuICB2YXIgbXVsID0gMVxuICB2YXIgdmFsID0gdGhpc1tvZmZzZXQgKyAtLWldXG4gIHdoaWxlIChpID4gMCAmJiAobXVsICo9IDB4MTAwKSkge1xuICAgIHZhbCArPSB0aGlzW29mZnNldCArIC0taV0gKiBtdWxcbiAgfVxuICBtdWwgKj0gMHg4MFxuXG4gIGlmICh2YWwgPj0gbXVsKSB2YWwgLT0gTWF0aC5wb3coMiwgOCAqIGJ5dGVMZW5ndGgpXG5cbiAgcmV0dXJuIHZhbFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnQ4ID0gZnVuY3Rpb24gcmVhZEludDggKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgMSwgdGhpcy5sZW5ndGgpXG4gIGlmICghKHRoaXNbb2Zmc2V0XSAmIDB4ODApKSByZXR1cm4gKHRoaXNbb2Zmc2V0XSlcbiAgcmV0dXJuICgoMHhmZiAtIHRoaXNbb2Zmc2V0XSArIDEpICogLTEpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDE2TEUgPSBmdW5jdGlvbiByZWFkSW50MTZMRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCAyLCB0aGlzLmxlbmd0aClcbiAgdmFyIHZhbCA9IHRoaXNbb2Zmc2V0XSB8ICh0aGlzW29mZnNldCArIDFdIDw8IDgpXG4gIHJldHVybiAodmFsICYgMHg4MDAwKSA/IHZhbCB8IDB4RkZGRjAwMDAgOiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50MTZCRSA9IGZ1bmN0aW9uIHJlYWRJbnQxNkJFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDIsIHRoaXMubGVuZ3RoKVxuICB2YXIgdmFsID0gdGhpc1tvZmZzZXQgKyAxXSB8ICh0aGlzW29mZnNldF0gPDwgOClcbiAgcmV0dXJuICh2YWwgJiAweDgwMDApID8gdmFsIHwgMHhGRkZGMDAwMCA6IHZhbFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnQzMkxFID0gZnVuY3Rpb24gcmVhZEludDMyTEUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgNCwgdGhpcy5sZW5ndGgpXG5cbiAgcmV0dXJuICh0aGlzW29mZnNldF0pIHxcbiAgICAodGhpc1tvZmZzZXQgKyAxXSA8PCA4KSB8XG4gICAgKHRoaXNbb2Zmc2V0ICsgMl0gPDwgMTYpIHxcbiAgICAodGhpc1tvZmZzZXQgKyAzXSA8PCAyNClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50MzJCRSA9IGZ1bmN0aW9uIHJlYWRJbnQzMkJFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDQsIHRoaXMubGVuZ3RoKVxuXG4gIHJldHVybiAodGhpc1tvZmZzZXRdIDw8IDI0KSB8XG4gICAgKHRoaXNbb2Zmc2V0ICsgMV0gPDwgMTYpIHxcbiAgICAodGhpc1tvZmZzZXQgKyAyXSA8PCA4KSB8XG4gICAgKHRoaXNbb2Zmc2V0ICsgM10pXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEZsb2F0TEUgPSBmdW5jdGlvbiByZWFkRmxvYXRMRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCA0LCB0aGlzLmxlbmd0aClcbiAgcmV0dXJuIGllZWU3NTQucmVhZCh0aGlzLCBvZmZzZXQsIHRydWUsIDIzLCA0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRGbG9hdEJFID0gZnVuY3Rpb24gcmVhZEZsb2F0QkUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgNCwgdGhpcy5sZW5ndGgpXG4gIHJldHVybiBpZWVlNzU0LnJlYWQodGhpcywgb2Zmc2V0LCBmYWxzZSwgMjMsIDQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZERvdWJsZUxFID0gZnVuY3Rpb24gcmVhZERvdWJsZUxFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDgsIHRoaXMubGVuZ3RoKVxuICByZXR1cm4gaWVlZTc1NC5yZWFkKHRoaXMsIG9mZnNldCwgdHJ1ZSwgNTIsIDgpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZERvdWJsZUJFID0gZnVuY3Rpb24gcmVhZERvdWJsZUJFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDgsIHRoaXMubGVuZ3RoKVxuICByZXR1cm4gaWVlZTc1NC5yZWFkKHRoaXMsIG9mZnNldCwgZmFsc2UsIDUyLCA4KVxufVxuXG5mdW5jdGlvbiBjaGVja0ludCAoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBleHQsIG1heCwgbWluKSB7XG4gIGlmICghQnVmZmVyLmlzQnVmZmVyKGJ1ZikpIHRocm93IG5ldyBUeXBlRXJyb3IoJ1wiYnVmZmVyXCIgYXJndW1lbnQgbXVzdCBiZSBhIEJ1ZmZlciBpbnN0YW5jZScpXG4gIGlmICh2YWx1ZSA+IG1heCB8fCB2YWx1ZSA8IG1pbikgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ1widmFsdWVcIiBhcmd1bWVudCBpcyBvdXQgb2YgYm91bmRzJylcbiAgaWYgKG9mZnNldCArIGV4dCA+IGJ1Zi5sZW5ndGgpIHRocm93IG5ldyBSYW5nZUVycm9yKCdJbmRleCBvdXQgb2YgcmFuZ2UnKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludExFID0gZnVuY3Rpb24gd3JpdGVVSW50TEUgKHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBieXRlTGVuZ3RoID0gYnl0ZUxlbmd0aCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgdmFyIG1heEJ5dGVzID0gTWF0aC5wb3coMiwgOCAqIGJ5dGVMZW5ndGgpIC0gMVxuICAgIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIG1heEJ5dGVzLCAwKVxuICB9XG5cbiAgdmFyIG11bCA9IDFcbiAgdmFyIGkgPSAwXG4gIHRoaXNbb2Zmc2V0XSA9IHZhbHVlICYgMHhGRlxuICB3aGlsZSAoKytpIDwgYnl0ZUxlbmd0aCAmJiAobXVsICo9IDB4MTAwKSkge1xuICAgIHRoaXNbb2Zmc2V0ICsgaV0gPSAodmFsdWUgLyBtdWwpICYgMHhGRlxuICB9XG5cbiAgcmV0dXJuIG9mZnNldCArIGJ5dGVMZW5ndGhcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnRCRSA9IGZ1bmN0aW9uIHdyaXRlVUludEJFICh2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgYnl0ZUxlbmd0aCA9IGJ5dGVMZW5ndGggPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIHZhciBtYXhCeXRlcyA9IE1hdGgucG93KDIsIDggKiBieXRlTGVuZ3RoKSAtIDFcbiAgICBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBtYXhCeXRlcywgMClcbiAgfVxuXG4gIHZhciBpID0gYnl0ZUxlbmd0aCAtIDFcbiAgdmFyIG11bCA9IDFcbiAgdGhpc1tvZmZzZXQgKyBpXSA9IHZhbHVlICYgMHhGRlxuICB3aGlsZSAoLS1pID49IDAgJiYgKG11bCAqPSAweDEwMCkpIHtcbiAgICB0aGlzW29mZnNldCArIGldID0gKHZhbHVlIC8gbXVsKSAmIDB4RkZcbiAgfVxuXG4gIHJldHVybiBvZmZzZXQgKyBieXRlTGVuZ3RoXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50OCA9IGZ1bmN0aW9uIHdyaXRlVUludDggKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCAxLCAweGZmLCAwKVxuICB0aGlzW29mZnNldF0gPSAodmFsdWUgJiAweGZmKVxuICByZXR1cm4gb2Zmc2V0ICsgMVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludDE2TEUgPSBmdW5jdGlvbiB3cml0ZVVJbnQxNkxFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgMiwgMHhmZmZmLCAwKVxuICB0aGlzW29mZnNldF0gPSAodmFsdWUgJiAweGZmKVxuICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlID4+PiA4KVxuICByZXR1cm4gb2Zmc2V0ICsgMlxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludDE2QkUgPSBmdW5jdGlvbiB3cml0ZVVJbnQxNkJFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgMiwgMHhmZmZmLCAwKVxuICB0aGlzW29mZnNldF0gPSAodmFsdWUgPj4+IDgpXG4gIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgJiAweGZmKVxuICByZXR1cm4gb2Zmc2V0ICsgMlxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludDMyTEUgPSBmdW5jdGlvbiB3cml0ZVVJbnQzMkxFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgNCwgMHhmZmZmZmZmZiwgMClcbiAgdGhpc1tvZmZzZXQgKyAzXSA9ICh2YWx1ZSA+Pj4gMjQpXG4gIHRoaXNbb2Zmc2V0ICsgMl0gPSAodmFsdWUgPj4+IDE2KVxuICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlID4+PiA4KVxuICB0aGlzW29mZnNldF0gPSAodmFsdWUgJiAweGZmKVxuICByZXR1cm4gb2Zmc2V0ICsgNFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludDMyQkUgPSBmdW5jdGlvbiB3cml0ZVVJbnQzMkJFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgNCwgMHhmZmZmZmZmZiwgMClcbiAgdGhpc1tvZmZzZXRdID0gKHZhbHVlID4+PiAyNClcbiAgdGhpc1tvZmZzZXQgKyAxXSA9ICh2YWx1ZSA+Pj4gMTYpXG4gIHRoaXNbb2Zmc2V0ICsgMl0gPSAodmFsdWUgPj4+IDgpXG4gIHRoaXNbb2Zmc2V0ICsgM10gPSAodmFsdWUgJiAweGZmKVxuICByZXR1cm4gb2Zmc2V0ICsgNFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50TEUgPSBmdW5jdGlvbiB3cml0ZUludExFICh2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIHZhciBsaW1pdCA9IE1hdGgucG93KDIsICg4ICogYnl0ZUxlbmd0aCkgLSAxKVxuXG4gICAgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgYnl0ZUxlbmd0aCwgbGltaXQgLSAxLCAtbGltaXQpXG4gIH1cblxuICB2YXIgaSA9IDBcbiAgdmFyIG11bCA9IDFcbiAgdmFyIHN1YiA9IDBcbiAgdGhpc1tvZmZzZXRdID0gdmFsdWUgJiAweEZGXG4gIHdoaWxlICgrK2kgPCBieXRlTGVuZ3RoICYmIChtdWwgKj0gMHgxMDApKSB7XG4gICAgaWYgKHZhbHVlIDwgMCAmJiBzdWIgPT09IDAgJiYgdGhpc1tvZmZzZXQgKyBpIC0gMV0gIT09IDApIHtcbiAgICAgIHN1YiA9IDFcbiAgICB9XG4gICAgdGhpc1tvZmZzZXQgKyBpXSA9ICgodmFsdWUgLyBtdWwpID4+IDApIC0gc3ViICYgMHhGRlxuICB9XG5cbiAgcmV0dXJuIG9mZnNldCArIGJ5dGVMZW5ndGhcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludEJFID0gZnVuY3Rpb24gd3JpdGVJbnRCRSAodmFsdWUsIG9mZnNldCwgYnl0ZUxlbmd0aCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICB2YXIgbGltaXQgPSBNYXRoLnBvdygyLCAoOCAqIGJ5dGVMZW5ndGgpIC0gMSlcblxuICAgIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIGxpbWl0IC0gMSwgLWxpbWl0KVxuICB9XG5cbiAgdmFyIGkgPSBieXRlTGVuZ3RoIC0gMVxuICB2YXIgbXVsID0gMVxuICB2YXIgc3ViID0gMFxuICB0aGlzW29mZnNldCArIGldID0gdmFsdWUgJiAweEZGXG4gIHdoaWxlICgtLWkgPj0gMCAmJiAobXVsICo9IDB4MTAwKSkge1xuICAgIGlmICh2YWx1ZSA8IDAgJiYgc3ViID09PSAwICYmIHRoaXNbb2Zmc2V0ICsgaSArIDFdICE9PSAwKSB7XG4gICAgICBzdWIgPSAxXG4gICAgfVxuICAgIHRoaXNbb2Zmc2V0ICsgaV0gPSAoKHZhbHVlIC8gbXVsKSA+PiAwKSAtIHN1YiAmIDB4RkZcbiAgfVxuXG4gIHJldHVybiBvZmZzZXQgKyBieXRlTGVuZ3RoXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnQ4ID0gZnVuY3Rpb24gd3JpdGVJbnQ4ICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgMSwgMHg3ZiwgLTB4ODApXG4gIGlmICh2YWx1ZSA8IDApIHZhbHVlID0gMHhmZiArIHZhbHVlICsgMVxuICB0aGlzW29mZnNldF0gPSAodmFsdWUgJiAweGZmKVxuICByZXR1cm4gb2Zmc2V0ICsgMVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50MTZMRSA9IGZ1bmN0aW9uIHdyaXRlSW50MTZMRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDIsIDB4N2ZmZiwgLTB4ODAwMClcbiAgdGhpc1tvZmZzZXRdID0gKHZhbHVlICYgMHhmZilcbiAgdGhpc1tvZmZzZXQgKyAxXSA9ICh2YWx1ZSA+Pj4gOClcbiAgcmV0dXJuIG9mZnNldCArIDJcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDE2QkUgPSBmdW5jdGlvbiB3cml0ZUludDE2QkUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCAyLCAweDdmZmYsIC0weDgwMDApXG4gIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSA+Pj4gOClcbiAgdGhpc1tvZmZzZXQgKyAxXSA9ICh2YWx1ZSAmIDB4ZmYpXG4gIHJldHVybiBvZmZzZXQgKyAyXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnQzMkxFID0gZnVuY3Rpb24gd3JpdGVJbnQzMkxFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgNCwgMHg3ZmZmZmZmZiwgLTB4ODAwMDAwMDApXG4gIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSAmIDB4ZmYpXG4gIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgPj4+IDgpXG4gIHRoaXNbb2Zmc2V0ICsgMl0gPSAodmFsdWUgPj4+IDE2KVxuICB0aGlzW29mZnNldCArIDNdID0gKHZhbHVlID4+PiAyNClcbiAgcmV0dXJuIG9mZnNldCArIDRcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDMyQkUgPSBmdW5jdGlvbiB3cml0ZUludDMyQkUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCA0LCAweDdmZmZmZmZmLCAtMHg4MDAwMDAwMClcbiAgaWYgKHZhbHVlIDwgMCkgdmFsdWUgPSAweGZmZmZmZmZmICsgdmFsdWUgKyAxXG4gIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSA+Pj4gMjQpXG4gIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgPj4+IDE2KVxuICB0aGlzW29mZnNldCArIDJdID0gKHZhbHVlID4+PiA4KVxuICB0aGlzW29mZnNldCArIDNdID0gKHZhbHVlICYgMHhmZilcbiAgcmV0dXJuIG9mZnNldCArIDRcbn1cblxuZnVuY3Rpb24gY2hlY2tJRUVFNzU0IChidWYsIHZhbHVlLCBvZmZzZXQsIGV4dCwgbWF4LCBtaW4pIHtcbiAgaWYgKG9mZnNldCArIGV4dCA+IGJ1Zi5sZW5ndGgpIHRocm93IG5ldyBSYW5nZUVycm9yKCdJbmRleCBvdXQgb2YgcmFuZ2UnKVxuICBpZiAob2Zmc2V0IDwgMCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0luZGV4IG91dCBvZiByYW5nZScpXG59XG5cbmZ1bmN0aW9uIHdyaXRlRmxvYXQgKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGNoZWNrSUVFRTc1NChidWYsIHZhbHVlLCBvZmZzZXQsIDQsIDMuNDAyODIzNDY2Mzg1Mjg4NmUrMzgsIC0zLjQwMjgyMzQ2NjM4NTI4ODZlKzM4KVxuICB9XG4gIGllZWU3NTQud3JpdGUoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIDIzLCA0KVxuICByZXR1cm4gb2Zmc2V0ICsgNFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlRmxvYXRMRSA9IGZ1bmN0aW9uIHdyaXRlRmxvYXRMRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIHdyaXRlRmxvYXQodGhpcywgdmFsdWUsIG9mZnNldCwgdHJ1ZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVGbG9hdEJFID0gZnVuY3Rpb24gd3JpdGVGbG9hdEJFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gd3JpdGVGbG9hdCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBmYWxzZSwgbm9Bc3NlcnQpXG59XG5cbmZ1bmN0aW9uIHdyaXRlRG91YmxlIChidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBjaGVja0lFRUU3NTQoYnVmLCB2YWx1ZSwgb2Zmc2V0LCA4LCAxLjc5NzY5MzEzNDg2MjMxNTdFKzMwOCwgLTEuNzk3NjkzMTM0ODYyMzE1N0UrMzA4KVxuICB9XG4gIGllZWU3NTQud3JpdGUoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIDUyLCA4KVxuICByZXR1cm4gb2Zmc2V0ICsgOFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlRG91YmxlTEUgPSBmdW5jdGlvbiB3cml0ZURvdWJsZUxFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gd3JpdGVEb3VibGUodGhpcywgdmFsdWUsIG9mZnNldCwgdHJ1ZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVEb3VibGVCRSA9IGZ1bmN0aW9uIHdyaXRlRG91YmxlQkUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiB3cml0ZURvdWJsZSh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBmYWxzZSwgbm9Bc3NlcnQpXG59XG5cbi8vIGNvcHkodGFyZ2V0QnVmZmVyLCB0YXJnZXRTdGFydD0wLCBzb3VyY2VTdGFydD0wLCBzb3VyY2VFbmQ9YnVmZmVyLmxlbmd0aClcbkJ1ZmZlci5wcm90b3R5cGUuY29weSA9IGZ1bmN0aW9uIGNvcHkgKHRhcmdldCwgdGFyZ2V0U3RhcnQsIHN0YXJ0LCBlbmQpIHtcbiAgaWYgKCFzdGFydCkgc3RhcnQgPSAwXG4gIGlmICghZW5kICYmIGVuZCAhPT0gMCkgZW5kID0gdGhpcy5sZW5ndGhcbiAgaWYgKHRhcmdldFN0YXJ0ID49IHRhcmdldC5sZW5ndGgpIHRhcmdldFN0YXJ0ID0gdGFyZ2V0Lmxlbmd0aFxuICBpZiAoIXRhcmdldFN0YXJ0KSB0YXJnZXRTdGFydCA9IDBcbiAgaWYgKGVuZCA+IDAgJiYgZW5kIDwgc3RhcnQpIGVuZCA9IHN0YXJ0XG5cbiAgLy8gQ29weSAwIGJ5dGVzOyB3ZSdyZSBkb25lXG4gIGlmIChlbmQgPT09IHN0YXJ0KSByZXR1cm4gMFxuICBpZiAodGFyZ2V0Lmxlbmd0aCA9PT0gMCB8fCB0aGlzLmxlbmd0aCA9PT0gMCkgcmV0dXJuIDBcblxuICAvLyBGYXRhbCBlcnJvciBjb25kaXRpb25zXG4gIGlmICh0YXJnZXRTdGFydCA8IDApIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcigndGFyZ2V0U3RhcnQgb3V0IG9mIGJvdW5kcycpXG4gIH1cbiAgaWYgKHN0YXJ0IDwgMCB8fCBzdGFydCA+PSB0aGlzLmxlbmd0aCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ3NvdXJjZVN0YXJ0IG91dCBvZiBib3VuZHMnKVxuICBpZiAoZW5kIDwgMCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ3NvdXJjZUVuZCBvdXQgb2YgYm91bmRzJylcblxuICAvLyBBcmUgd2Ugb29iP1xuICBpZiAoZW5kID4gdGhpcy5sZW5ndGgpIGVuZCA9IHRoaXMubGVuZ3RoXG4gIGlmICh0YXJnZXQubGVuZ3RoIC0gdGFyZ2V0U3RhcnQgPCBlbmQgLSBzdGFydCkge1xuICAgIGVuZCA9IHRhcmdldC5sZW5ndGggLSB0YXJnZXRTdGFydCArIHN0YXJ0XG4gIH1cblxuICB2YXIgbGVuID0gZW5kIC0gc3RhcnRcbiAgdmFyIGlcblxuICBpZiAodGhpcyA9PT0gdGFyZ2V0ICYmIHN0YXJ0IDwgdGFyZ2V0U3RhcnQgJiYgdGFyZ2V0U3RhcnQgPCBlbmQpIHtcbiAgICAvLyBkZXNjZW5kaW5nIGNvcHkgZnJvbSBlbmRcbiAgICBmb3IgKGkgPSBsZW4gLSAxOyBpID49IDA7IC0taSkge1xuICAgICAgdGFyZ2V0W2kgKyB0YXJnZXRTdGFydF0gPSB0aGlzW2kgKyBzdGFydF1cbiAgICB9XG4gIH0gZWxzZSBpZiAobGVuIDwgMTAwMCkge1xuICAgIC8vIGFzY2VuZGluZyBjb3B5IGZyb20gc3RhcnRcbiAgICBmb3IgKGkgPSAwOyBpIDwgbGVuOyArK2kpIHtcbiAgICAgIHRhcmdldFtpICsgdGFyZ2V0U3RhcnRdID0gdGhpc1tpICsgc3RhcnRdXG4gICAgfVxuICB9IGVsc2Uge1xuICAgIFVpbnQ4QXJyYXkucHJvdG90eXBlLnNldC5jYWxsKFxuICAgICAgdGFyZ2V0LFxuICAgICAgdGhpcy5zdWJhcnJheShzdGFydCwgc3RhcnQgKyBsZW4pLFxuICAgICAgdGFyZ2V0U3RhcnRcbiAgICApXG4gIH1cblxuICByZXR1cm4gbGVuXG59XG5cbi8vIFVzYWdlOlxuLy8gICAgYnVmZmVyLmZpbGwobnVtYmVyWywgb2Zmc2V0WywgZW5kXV0pXG4vLyAgICBidWZmZXIuZmlsbChidWZmZXJbLCBvZmZzZXRbLCBlbmRdXSlcbi8vICAgIGJ1ZmZlci5maWxsKHN0cmluZ1ssIG9mZnNldFssIGVuZF1dWywgZW5jb2RpbmddKVxuQnVmZmVyLnByb3RvdHlwZS5maWxsID0gZnVuY3Rpb24gZmlsbCAodmFsLCBzdGFydCwgZW5kLCBlbmNvZGluZykge1xuICAvLyBIYW5kbGUgc3RyaW5nIGNhc2VzOlxuICBpZiAodHlwZW9mIHZhbCA9PT0gJ3N0cmluZycpIHtcbiAgICBpZiAodHlwZW9mIHN0YXJ0ID09PSAnc3RyaW5nJykge1xuICAgICAgZW5jb2RpbmcgPSBzdGFydFxuICAgICAgc3RhcnQgPSAwXG4gICAgICBlbmQgPSB0aGlzLmxlbmd0aFxuICAgIH0gZWxzZSBpZiAodHlwZW9mIGVuZCA9PT0gJ3N0cmluZycpIHtcbiAgICAgIGVuY29kaW5nID0gZW5kXG4gICAgICBlbmQgPSB0aGlzLmxlbmd0aFxuICAgIH1cbiAgICBpZiAodmFsLmxlbmd0aCA9PT0gMSkge1xuICAgICAgdmFyIGNvZGUgPSB2YWwuY2hhckNvZGVBdCgwKVxuICAgICAgaWYgKGNvZGUgPCAyNTYpIHtcbiAgICAgICAgdmFsID0gY29kZVxuICAgICAgfVxuICAgIH1cbiAgICBpZiAoZW5jb2RpbmcgIT09IHVuZGVmaW5lZCAmJiB0eXBlb2YgZW5jb2RpbmcgIT09ICdzdHJpbmcnKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdlbmNvZGluZyBtdXN0IGJlIGEgc3RyaW5nJylcbiAgICB9XG4gICAgaWYgKHR5cGVvZiBlbmNvZGluZyA9PT0gJ3N0cmluZycgJiYgIUJ1ZmZlci5pc0VuY29kaW5nKGVuY29kaW5nKSkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVW5rbm93biBlbmNvZGluZzogJyArIGVuY29kaW5nKVxuICAgIH1cbiAgfSBlbHNlIGlmICh0eXBlb2YgdmFsID09PSAnbnVtYmVyJykge1xuICAgIHZhbCA9IHZhbCAmIDI1NVxuICB9XG5cbiAgLy8gSW52YWxpZCByYW5nZXMgYXJlIG5vdCBzZXQgdG8gYSBkZWZhdWx0LCBzbyBjYW4gcmFuZ2UgY2hlY2sgZWFybHkuXG4gIGlmIChzdGFydCA8IDAgfHwgdGhpcy5sZW5ndGggPCBzdGFydCB8fCB0aGlzLmxlbmd0aCA8IGVuZCkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdPdXQgb2YgcmFuZ2UgaW5kZXgnKVxuICB9XG5cbiAgaWYgKGVuZCA8PSBzdGFydCkge1xuICAgIHJldHVybiB0aGlzXG4gIH1cblxuICBzdGFydCA9IHN0YXJ0ID4+PiAwXG4gIGVuZCA9IGVuZCA9PT0gdW5kZWZpbmVkID8gdGhpcy5sZW5ndGggOiBlbmQgPj4+IDBcblxuICBpZiAoIXZhbCkgdmFsID0gMFxuXG4gIHZhciBpXG4gIGlmICh0eXBlb2YgdmFsID09PSAnbnVtYmVyJykge1xuICAgIGZvciAoaSA9IHN0YXJ0OyBpIDwgZW5kOyArK2kpIHtcbiAgICAgIHRoaXNbaV0gPSB2YWxcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgdmFyIGJ5dGVzID0gQnVmZmVyLmlzQnVmZmVyKHZhbClcbiAgICAgID8gdmFsXG4gICAgICA6IG5ldyBCdWZmZXIodmFsLCBlbmNvZGluZylcbiAgICB2YXIgbGVuID0gYnl0ZXMubGVuZ3RoXG4gICAgZm9yIChpID0gMDsgaSA8IGVuZCAtIHN0YXJ0OyArK2kpIHtcbiAgICAgIHRoaXNbaSArIHN0YXJ0XSA9IGJ5dGVzW2kgJSBsZW5dXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRoaXNcbn1cblxuLy8gSEVMUEVSIEZVTkNUSU9OU1xuLy8gPT09PT09PT09PT09PT09PVxuXG52YXIgSU5WQUxJRF9CQVNFNjRfUkUgPSAvW14rLzAtOUEtWmEtei1fXS9nXG5cbmZ1bmN0aW9uIGJhc2U2NGNsZWFuIChzdHIpIHtcbiAgLy8gTm9kZSBzdHJpcHMgb3V0IGludmFsaWQgY2hhcmFjdGVycyBsaWtlIFxcbiBhbmQgXFx0IGZyb20gdGhlIHN0cmluZywgYmFzZTY0LWpzIGRvZXMgbm90XG4gIHN0ciA9IHN0ci50cmltKCkucmVwbGFjZShJTlZBTElEX0JBU0U2NF9SRSwgJycpXG4gIC8vIE5vZGUgY29udmVydHMgc3RyaW5ncyB3aXRoIGxlbmd0aCA8IDIgdG8gJydcbiAgaWYgKHN0ci5sZW5ndGggPCAyKSByZXR1cm4gJydcbiAgLy8gTm9kZSBhbGxvd3MgZm9yIG5vbi1wYWRkZWQgYmFzZTY0IHN0cmluZ3MgKG1pc3NpbmcgdHJhaWxpbmcgPT09KSwgYmFzZTY0LWpzIGRvZXMgbm90XG4gIHdoaWxlIChzdHIubGVuZ3RoICUgNCAhPT0gMCkge1xuICAgIHN0ciA9IHN0ciArICc9J1xuICB9XG4gIHJldHVybiBzdHJcbn1cblxuZnVuY3Rpb24gdG9IZXggKG4pIHtcbiAgaWYgKG4gPCAxNikgcmV0dXJuICcwJyArIG4udG9TdHJpbmcoMTYpXG4gIHJldHVybiBuLnRvU3RyaW5nKDE2KVxufVxuXG5mdW5jdGlvbiB1dGY4VG9CeXRlcyAoc3RyaW5nLCB1bml0cykge1xuICB1bml0cyA9IHVuaXRzIHx8IEluZmluaXR5XG4gIHZhciBjb2RlUG9pbnRcbiAgdmFyIGxlbmd0aCA9IHN0cmluZy5sZW5ndGhcbiAgdmFyIGxlYWRTdXJyb2dhdGUgPSBudWxsXG4gIHZhciBieXRlcyA9IFtdXG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7ICsraSkge1xuICAgIGNvZGVQb2ludCA9IHN0cmluZy5jaGFyQ29kZUF0KGkpXG5cbiAgICAvLyBpcyBzdXJyb2dhdGUgY29tcG9uZW50XG4gICAgaWYgKGNvZGVQb2ludCA+IDB4RDdGRiAmJiBjb2RlUG9pbnQgPCAweEUwMDApIHtcbiAgICAgIC8vIGxhc3QgY2hhciB3YXMgYSBsZWFkXG4gICAgICBpZiAoIWxlYWRTdXJyb2dhdGUpIHtcbiAgICAgICAgLy8gbm8gbGVhZCB5ZXRcbiAgICAgICAgaWYgKGNvZGVQb2ludCA+IDB4REJGRikge1xuICAgICAgICAgIC8vIHVuZXhwZWN0ZWQgdHJhaWxcbiAgICAgICAgICBpZiAoKHVuaXRzIC09IDMpID4gLTEpIGJ5dGVzLnB1c2goMHhFRiwgMHhCRiwgMHhCRClcbiAgICAgICAgICBjb250aW51ZVxuICAgICAgICB9IGVsc2UgaWYgKGkgKyAxID09PSBsZW5ndGgpIHtcbiAgICAgICAgICAvLyB1bnBhaXJlZCBsZWFkXG4gICAgICAgICAgaWYgKCh1bml0cyAtPSAzKSA+IC0xKSBieXRlcy5wdXNoKDB4RUYsIDB4QkYsIDB4QkQpXG4gICAgICAgICAgY29udGludWVcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIHZhbGlkIGxlYWRcbiAgICAgICAgbGVhZFN1cnJvZ2F0ZSA9IGNvZGVQb2ludFxuXG4gICAgICAgIGNvbnRpbnVlXG4gICAgICB9XG5cbiAgICAgIC8vIDIgbGVhZHMgaW4gYSByb3dcbiAgICAgIGlmIChjb2RlUG9pbnQgPCAweERDMDApIHtcbiAgICAgICAgaWYgKCh1bml0cyAtPSAzKSA+IC0xKSBieXRlcy5wdXNoKDB4RUYsIDB4QkYsIDB4QkQpXG4gICAgICAgIGxlYWRTdXJyb2dhdGUgPSBjb2RlUG9pbnRcbiAgICAgICAgY29udGludWVcbiAgICAgIH1cblxuICAgICAgLy8gdmFsaWQgc3Vycm9nYXRlIHBhaXJcbiAgICAgIGNvZGVQb2ludCA9IChsZWFkU3Vycm9nYXRlIC0gMHhEODAwIDw8IDEwIHwgY29kZVBvaW50IC0gMHhEQzAwKSArIDB4MTAwMDBcbiAgICB9IGVsc2UgaWYgKGxlYWRTdXJyb2dhdGUpIHtcbiAgICAgIC8vIHZhbGlkIGJtcCBjaGFyLCBidXQgbGFzdCBjaGFyIHdhcyBhIGxlYWRcbiAgICAgIGlmICgodW5pdHMgLT0gMykgPiAtMSkgYnl0ZXMucHVzaCgweEVGLCAweEJGLCAweEJEKVxuICAgIH1cblxuICAgIGxlYWRTdXJyb2dhdGUgPSBudWxsXG5cbiAgICAvLyBlbmNvZGUgdXRmOFxuICAgIGlmIChjb2RlUG9pbnQgPCAweDgwKSB7XG4gICAgICBpZiAoKHVuaXRzIC09IDEpIDwgMCkgYnJlYWtcbiAgICAgIGJ5dGVzLnB1c2goY29kZVBvaW50KVxuICAgIH0gZWxzZSBpZiAoY29kZVBvaW50IDwgMHg4MDApIHtcbiAgICAgIGlmICgodW5pdHMgLT0gMikgPCAwKSBicmVha1xuICAgICAgYnl0ZXMucHVzaChcbiAgICAgICAgY29kZVBvaW50ID4+IDB4NiB8IDB4QzAsXG4gICAgICAgIGNvZGVQb2ludCAmIDB4M0YgfCAweDgwXG4gICAgICApXG4gICAgfSBlbHNlIGlmIChjb2RlUG9pbnQgPCAweDEwMDAwKSB7XG4gICAgICBpZiAoKHVuaXRzIC09IDMpIDwgMCkgYnJlYWtcbiAgICAgIGJ5dGVzLnB1c2goXG4gICAgICAgIGNvZGVQb2ludCA+PiAweEMgfCAweEUwLFxuICAgICAgICBjb2RlUG9pbnQgPj4gMHg2ICYgMHgzRiB8IDB4ODAsXG4gICAgICAgIGNvZGVQb2ludCAmIDB4M0YgfCAweDgwXG4gICAgICApXG4gICAgfSBlbHNlIGlmIChjb2RlUG9pbnQgPCAweDExMDAwMCkge1xuICAgICAgaWYgKCh1bml0cyAtPSA0KSA8IDApIGJyZWFrXG4gICAgICBieXRlcy5wdXNoKFxuICAgICAgICBjb2RlUG9pbnQgPj4gMHgxMiB8IDB4RjAsXG4gICAgICAgIGNvZGVQb2ludCA+PiAweEMgJiAweDNGIHwgMHg4MCxcbiAgICAgICAgY29kZVBvaW50ID4+IDB4NiAmIDB4M0YgfCAweDgwLFxuICAgICAgICBjb2RlUG9pbnQgJiAweDNGIHwgMHg4MFxuICAgICAgKVxuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgY29kZSBwb2ludCcpXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGJ5dGVzXG59XG5cbmZ1bmN0aW9uIGFzY2lpVG9CeXRlcyAoc3RyKSB7XG4gIHZhciBieXRlQXJyYXkgPSBbXVxuICBmb3IgKHZhciBpID0gMDsgaSA8IHN0ci5sZW5ndGg7ICsraSkge1xuICAgIC8vIE5vZGUncyBjb2RlIHNlZW1zIHRvIGJlIGRvaW5nIHRoaXMgYW5kIG5vdCAmIDB4N0YuLlxuICAgIGJ5dGVBcnJheS5wdXNoKHN0ci5jaGFyQ29kZUF0KGkpICYgMHhGRilcbiAgfVxuICByZXR1cm4gYnl0ZUFycmF5XG59XG5cbmZ1bmN0aW9uIHV0ZjE2bGVUb0J5dGVzIChzdHIsIHVuaXRzKSB7XG4gIHZhciBjLCBoaSwgbG9cbiAgdmFyIGJ5dGVBcnJheSA9IFtdXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgc3RyLmxlbmd0aDsgKytpKSB7XG4gICAgaWYgKCh1bml0cyAtPSAyKSA8IDApIGJyZWFrXG5cbiAgICBjID0gc3RyLmNoYXJDb2RlQXQoaSlcbiAgICBoaSA9IGMgPj4gOFxuICAgIGxvID0gYyAlIDI1NlxuICAgIGJ5dGVBcnJheS5wdXNoKGxvKVxuICAgIGJ5dGVBcnJheS5wdXNoKGhpKVxuICB9XG5cbiAgcmV0dXJuIGJ5dGVBcnJheVxufVxuXG5mdW5jdGlvbiBiYXNlNjRUb0J5dGVzIChzdHIpIHtcbiAgcmV0dXJuIGJhc2U2NC50b0J5dGVBcnJheShiYXNlNjRjbGVhbihzdHIpKVxufVxuXG5mdW5jdGlvbiBibGl0QnVmZmVyIChzcmMsIGRzdCwgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7ICsraSkge1xuICAgIGlmICgoaSArIG9mZnNldCA+PSBkc3QubGVuZ3RoKSB8fCAoaSA+PSBzcmMubGVuZ3RoKSkgYnJlYWtcbiAgICBkc3RbaSArIG9mZnNldF0gPSBzcmNbaV1cbiAgfVxuICByZXR1cm4gaVxufVxuXG4vLyBBcnJheUJ1ZmZlcnMgZnJvbSBhbm90aGVyIGNvbnRleHQgKGkuZS4gYW4gaWZyYW1lKSBkbyBub3QgcGFzcyB0aGUgYGluc3RhbmNlb2ZgIGNoZWNrXG4vLyBidXQgdGhleSBzaG91bGQgYmUgdHJlYXRlZCBhcyB2YWxpZC4gU2VlOiBodHRwczovL2dpdGh1Yi5jb20vZmVyb3NzL2J1ZmZlci9pc3N1ZXMvMTY2XG5mdW5jdGlvbiBpc0FycmF5QnVmZmVyIChvYmopIHtcbiAgcmV0dXJuIG9iaiBpbnN0YW5jZW9mIEFycmF5QnVmZmVyIHx8XG4gICAgKG9iaiAhPSBudWxsICYmIG9iai5jb25zdHJ1Y3RvciAhPSBudWxsICYmIG9iai5jb25zdHJ1Y3Rvci5uYW1lID09PSAnQXJyYXlCdWZmZXInICYmXG4gICAgICB0eXBlb2Ygb2JqLmJ5dGVMZW5ndGggPT09ICdudW1iZXInKVxufVxuXG4vLyBOb2RlIDAuMTAgc3VwcG9ydHMgYEFycmF5QnVmZmVyYCBidXQgbGFja3MgYEFycmF5QnVmZmVyLmlzVmlld2BcbmZ1bmN0aW9uIGlzQXJyYXlCdWZmZXJWaWV3IChvYmopIHtcbiAgcmV0dXJuICh0eXBlb2YgQXJyYXlCdWZmZXIuaXNWaWV3ID09PSAnZnVuY3Rpb24nKSAmJiBBcnJheUJ1ZmZlci5pc1ZpZXcob2JqKVxufVxuXG5mdW5jdGlvbiBudW1iZXJJc05hTiAob2JqKSB7XG4gIHJldHVybiBvYmogIT09IG9iaiAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLXNlbGYtY29tcGFyZVxufVxuIiwidmFyIGNsb25lID0gKGZ1bmN0aW9uKCkge1xuJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBfaW5zdGFuY2VvZihvYmosIHR5cGUpIHtcbiAgcmV0dXJuIHR5cGUgIT0gbnVsbCAmJiBvYmogaW5zdGFuY2VvZiB0eXBlO1xufVxuXG52YXIgbmF0aXZlTWFwO1xudHJ5IHtcbiAgbmF0aXZlTWFwID0gTWFwO1xufSBjYXRjaChfKSB7XG4gIC8vIG1heWJlIGEgcmVmZXJlbmNlIGVycm9yIGJlY2F1c2Ugbm8gYE1hcGAuIEdpdmUgaXQgYSBkdW1teSB2YWx1ZSB0aGF0IG5vXG4gIC8vIHZhbHVlIHdpbGwgZXZlciBiZSBhbiBpbnN0YW5jZW9mLlxuICBuYXRpdmVNYXAgPSBmdW5jdGlvbigpIHt9O1xufVxuXG52YXIgbmF0aXZlU2V0O1xudHJ5IHtcbiAgbmF0aXZlU2V0ID0gU2V0O1xufSBjYXRjaChfKSB7XG4gIG5hdGl2ZVNldCA9IGZ1bmN0aW9uKCkge307XG59XG5cbnZhciBuYXRpdmVQcm9taXNlO1xudHJ5IHtcbiAgbmF0aXZlUHJvbWlzZSA9IFByb21pc2U7XG59IGNhdGNoKF8pIHtcbiAgbmF0aXZlUHJvbWlzZSA9IGZ1bmN0aW9uKCkge307XG59XG5cbi8qKlxuICogQ2xvbmVzIChjb3BpZXMpIGFuIE9iamVjdCB1c2luZyBkZWVwIGNvcHlpbmcuXG4gKlxuICogVGhpcyBmdW5jdGlvbiBzdXBwb3J0cyBjaXJjdWxhciByZWZlcmVuY2VzIGJ5IGRlZmF1bHQsIGJ1dCBpZiB5b3UgYXJlIGNlcnRhaW5cbiAqIHRoZXJlIGFyZSBubyBjaXJjdWxhciByZWZlcmVuY2VzIGluIHlvdXIgb2JqZWN0LCB5b3UgY2FuIHNhdmUgc29tZSBDUFUgdGltZVxuICogYnkgY2FsbGluZyBjbG9uZShvYmosIGZhbHNlKS5cbiAqXG4gKiBDYXV0aW9uOiBpZiBgY2lyY3VsYXJgIGlzIGZhbHNlIGFuZCBgcGFyZW50YCBjb250YWlucyBjaXJjdWxhciByZWZlcmVuY2VzLFxuICogeW91ciBwcm9ncmFtIG1heSBlbnRlciBhbiBpbmZpbml0ZSBsb29wIGFuZCBjcmFzaC5cbiAqXG4gKiBAcGFyYW0gYHBhcmVudGAgLSB0aGUgb2JqZWN0IHRvIGJlIGNsb25lZFxuICogQHBhcmFtIGBjaXJjdWxhcmAgLSBzZXQgdG8gdHJ1ZSBpZiB0aGUgb2JqZWN0IHRvIGJlIGNsb25lZCBtYXkgY29udGFpblxuICogICAgY2lyY3VsYXIgcmVmZXJlbmNlcy4gKG9wdGlvbmFsIC0gdHJ1ZSBieSBkZWZhdWx0KVxuICogQHBhcmFtIGBkZXB0aGAgLSBzZXQgdG8gYSBudW1iZXIgaWYgdGhlIG9iamVjdCBpcyBvbmx5IHRvIGJlIGNsb25lZCB0b1xuICogICAgYSBwYXJ0aWN1bGFyIGRlcHRoLiAob3B0aW9uYWwgLSBkZWZhdWx0cyB0byBJbmZpbml0eSlcbiAqIEBwYXJhbSBgcHJvdG90eXBlYCAtIHNldHMgdGhlIHByb3RvdHlwZSB0byBiZSB1c2VkIHdoZW4gY2xvbmluZyBhbiBvYmplY3QuXG4gKiAgICAob3B0aW9uYWwgLSBkZWZhdWx0cyB0byBwYXJlbnQgcHJvdG90eXBlKS5cbiAqIEBwYXJhbSBgaW5jbHVkZU5vbkVudW1lcmFibGVgIC0gc2V0IHRvIHRydWUgaWYgdGhlIG5vbi1lbnVtZXJhYmxlIHByb3BlcnRpZXNcbiAqICAgIHNob3VsZCBiZSBjbG9uZWQgYXMgd2VsbC4gTm9uLWVudW1lcmFibGUgcHJvcGVydGllcyBvbiB0aGUgcHJvdG90eXBlXG4gKiAgICBjaGFpbiB3aWxsIGJlIGlnbm9yZWQuIChvcHRpb25hbCAtIGZhbHNlIGJ5IGRlZmF1bHQpXG4qL1xuZnVuY3Rpb24gY2xvbmUocGFyZW50LCBjaXJjdWxhciwgZGVwdGgsIHByb3RvdHlwZSwgaW5jbHVkZU5vbkVudW1lcmFibGUpIHtcbiAgaWYgKHR5cGVvZiBjaXJjdWxhciA9PT0gJ29iamVjdCcpIHtcbiAgICBkZXB0aCA9IGNpcmN1bGFyLmRlcHRoO1xuICAgIHByb3RvdHlwZSA9IGNpcmN1bGFyLnByb3RvdHlwZTtcbiAgICBpbmNsdWRlTm9uRW51bWVyYWJsZSA9IGNpcmN1bGFyLmluY2x1ZGVOb25FbnVtZXJhYmxlO1xuICAgIGNpcmN1bGFyID0gY2lyY3VsYXIuY2lyY3VsYXI7XG4gIH1cbiAgLy8gbWFpbnRhaW4gdHdvIGFycmF5cyBmb3IgY2lyY3VsYXIgcmVmZXJlbmNlcywgd2hlcmUgY29ycmVzcG9uZGluZyBwYXJlbnRzXG4gIC8vIGFuZCBjaGlsZHJlbiBoYXZlIHRoZSBzYW1lIGluZGV4XG4gIHZhciBhbGxQYXJlbnRzID0gW107XG4gIHZhciBhbGxDaGlsZHJlbiA9IFtdO1xuXG4gIHZhciB1c2VCdWZmZXIgPSB0eXBlb2YgQnVmZmVyICE9ICd1bmRlZmluZWQnO1xuXG4gIGlmICh0eXBlb2YgY2lyY3VsYXIgPT0gJ3VuZGVmaW5lZCcpXG4gICAgY2lyY3VsYXIgPSB0cnVlO1xuXG4gIGlmICh0eXBlb2YgZGVwdGggPT0gJ3VuZGVmaW5lZCcpXG4gICAgZGVwdGggPSBJbmZpbml0eTtcblxuICAvLyByZWN1cnNlIHRoaXMgZnVuY3Rpb24gc28gd2UgZG9uJ3QgcmVzZXQgYWxsUGFyZW50cyBhbmQgYWxsQ2hpbGRyZW5cbiAgZnVuY3Rpb24gX2Nsb25lKHBhcmVudCwgZGVwdGgpIHtcbiAgICAvLyBjbG9uaW5nIG51bGwgYWx3YXlzIHJldHVybnMgbnVsbFxuICAgIGlmIChwYXJlbnQgPT09IG51bGwpXG4gICAgICByZXR1cm4gbnVsbDtcblxuICAgIGlmIChkZXB0aCA9PT0gMClcbiAgICAgIHJldHVybiBwYXJlbnQ7XG5cbiAgICB2YXIgY2hpbGQ7XG4gICAgdmFyIHByb3RvO1xuICAgIGlmICh0eXBlb2YgcGFyZW50ICE9ICdvYmplY3QnKSB7XG4gICAgICByZXR1cm4gcGFyZW50O1xuICAgIH1cblxuICAgIGlmIChfaW5zdGFuY2VvZihwYXJlbnQsIG5hdGl2ZU1hcCkpIHtcbiAgICAgIGNoaWxkID0gbmV3IG5hdGl2ZU1hcCgpO1xuICAgIH0gZWxzZSBpZiAoX2luc3RhbmNlb2YocGFyZW50LCBuYXRpdmVTZXQpKSB7XG4gICAgICBjaGlsZCA9IG5ldyBuYXRpdmVTZXQoKTtcbiAgICB9IGVsc2UgaWYgKF9pbnN0YW5jZW9mKHBhcmVudCwgbmF0aXZlUHJvbWlzZSkpIHtcbiAgICAgIGNoaWxkID0gbmV3IG5hdGl2ZVByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICBwYXJlbnQudGhlbihmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgIHJlc29sdmUoX2Nsb25lKHZhbHVlLCBkZXB0aCAtIDEpKTtcbiAgICAgICAgfSwgZnVuY3Rpb24oZXJyKSB7XG4gICAgICAgICAgcmVqZWN0KF9jbG9uZShlcnIsIGRlcHRoIC0gMSkpO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH0gZWxzZSBpZiAoY2xvbmUuX19pc0FycmF5KHBhcmVudCkpIHtcbiAgICAgIGNoaWxkID0gW107XG4gICAgfSBlbHNlIGlmIChjbG9uZS5fX2lzUmVnRXhwKHBhcmVudCkpIHtcbiAgICAgIGNoaWxkID0gbmV3IFJlZ0V4cChwYXJlbnQuc291cmNlLCBfX2dldFJlZ0V4cEZsYWdzKHBhcmVudCkpO1xuICAgICAgaWYgKHBhcmVudC5sYXN0SW5kZXgpIGNoaWxkLmxhc3RJbmRleCA9IHBhcmVudC5sYXN0SW5kZXg7XG4gICAgfSBlbHNlIGlmIChjbG9uZS5fX2lzRGF0ZShwYXJlbnQpKSB7XG4gICAgICBjaGlsZCA9IG5ldyBEYXRlKHBhcmVudC5nZXRUaW1lKCkpO1xuICAgIH0gZWxzZSBpZiAodXNlQnVmZmVyICYmIEJ1ZmZlci5pc0J1ZmZlcihwYXJlbnQpKSB7XG4gICAgICBjaGlsZCA9IG5ldyBCdWZmZXIocGFyZW50Lmxlbmd0aCk7XG4gICAgICBwYXJlbnQuY29weShjaGlsZCk7XG4gICAgICByZXR1cm4gY2hpbGQ7XG4gICAgfSBlbHNlIGlmIChfaW5zdGFuY2VvZihwYXJlbnQsIEVycm9yKSkge1xuICAgICAgY2hpbGQgPSBPYmplY3QuY3JlYXRlKHBhcmVudCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmICh0eXBlb2YgcHJvdG90eXBlID09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIHByb3RvID0gT2JqZWN0LmdldFByb3RvdHlwZU9mKHBhcmVudCk7XG4gICAgICAgIGNoaWxkID0gT2JqZWN0LmNyZWF0ZShwcm90byk7XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgY2hpbGQgPSBPYmplY3QuY3JlYXRlKHByb3RvdHlwZSk7XG4gICAgICAgIHByb3RvID0gcHJvdG90eXBlO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChjaXJjdWxhcikge1xuICAgICAgdmFyIGluZGV4ID0gYWxsUGFyZW50cy5pbmRleE9mKHBhcmVudCk7XG5cbiAgICAgIGlmIChpbmRleCAhPSAtMSkge1xuICAgICAgICByZXR1cm4gYWxsQ2hpbGRyZW5baW5kZXhdO1xuICAgICAgfVxuICAgICAgYWxsUGFyZW50cy5wdXNoKHBhcmVudCk7XG4gICAgICBhbGxDaGlsZHJlbi5wdXNoKGNoaWxkKTtcbiAgICB9XG5cbiAgICBpZiAoX2luc3RhbmNlb2YocGFyZW50LCBuYXRpdmVNYXApKSB7XG4gICAgICBwYXJlbnQuZm9yRWFjaChmdW5jdGlvbih2YWx1ZSwga2V5KSB7XG4gICAgICAgIHZhciBrZXlDaGlsZCA9IF9jbG9uZShrZXksIGRlcHRoIC0gMSk7XG4gICAgICAgIHZhciB2YWx1ZUNoaWxkID0gX2Nsb25lKHZhbHVlLCBkZXB0aCAtIDEpO1xuICAgICAgICBjaGlsZC5zZXQoa2V5Q2hpbGQsIHZhbHVlQ2hpbGQpO1xuICAgICAgfSk7XG4gICAgfVxuICAgIGlmIChfaW5zdGFuY2VvZihwYXJlbnQsIG5hdGl2ZVNldCkpIHtcbiAgICAgIHBhcmVudC5mb3JFYWNoKGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIHZhciBlbnRyeUNoaWxkID0gX2Nsb25lKHZhbHVlLCBkZXB0aCAtIDEpO1xuICAgICAgICBjaGlsZC5hZGQoZW50cnlDaGlsZCk7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBmb3IgKHZhciBpIGluIHBhcmVudCkge1xuICAgICAgdmFyIGF0dHJzO1xuICAgICAgaWYgKHByb3RvKSB7XG4gICAgICAgIGF0dHJzID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihwcm90bywgaSk7XG4gICAgICB9XG5cbiAgICAgIGlmIChhdHRycyAmJiBhdHRycy5zZXQgPT0gbnVsbCkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGNoaWxkW2ldID0gX2Nsb25lKHBhcmVudFtpXSwgZGVwdGggLSAxKTtcbiAgICB9XG5cbiAgICBpZiAoT2JqZWN0LmdldE93blByb3BlcnR5U3ltYm9scykge1xuICAgICAgdmFyIHN5bWJvbHMgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlTeW1ib2xzKHBhcmVudCk7XG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHN5bWJvbHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgLy8gRG9uJ3QgbmVlZCB0byB3b3JyeSBhYm91dCBjbG9uaW5nIGEgc3ltYm9sIGJlY2F1c2UgaXQgaXMgYSBwcmltaXRpdmUsXG4gICAgICAgIC8vIGxpa2UgYSBudW1iZXIgb3Igc3RyaW5nLlxuICAgICAgICB2YXIgc3ltYm9sID0gc3ltYm9sc1tpXTtcbiAgICAgICAgdmFyIGRlc2NyaXB0b3IgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHBhcmVudCwgc3ltYm9sKTtcbiAgICAgICAgaWYgKGRlc2NyaXB0b3IgJiYgIWRlc2NyaXB0b3IuZW51bWVyYWJsZSAmJiAhaW5jbHVkZU5vbkVudW1lcmFibGUpIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICBjaGlsZFtzeW1ib2xdID0gX2Nsb25lKHBhcmVudFtzeW1ib2xdLCBkZXB0aCAtIDEpO1xuICAgICAgICBpZiAoIWRlc2NyaXB0b3IuZW51bWVyYWJsZSkge1xuICAgICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShjaGlsZCwgc3ltYm9sLCB7XG4gICAgICAgICAgICBlbnVtZXJhYmxlOiBmYWxzZVxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGluY2x1ZGVOb25FbnVtZXJhYmxlKSB7XG4gICAgICB2YXIgYWxsUHJvcGVydHlOYW1lcyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKHBhcmVudCk7XG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFsbFByb3BlcnR5TmFtZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIHByb3BlcnR5TmFtZSA9IGFsbFByb3BlcnR5TmFtZXNbaV07XG4gICAgICAgIHZhciBkZXNjcmlwdG9yID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihwYXJlbnQsIHByb3BlcnR5TmFtZSk7XG4gICAgICAgIGlmIChkZXNjcmlwdG9yICYmIGRlc2NyaXB0b3IuZW51bWVyYWJsZSkge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIGNoaWxkW3Byb3BlcnR5TmFtZV0gPSBfY2xvbmUocGFyZW50W3Byb3BlcnR5TmFtZV0sIGRlcHRoIC0gMSk7XG4gICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShjaGlsZCwgcHJvcGVydHlOYW1lLCB7XG4gICAgICAgICAgZW51bWVyYWJsZTogZmFsc2VcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGNoaWxkO1xuICB9XG5cbiAgcmV0dXJuIF9jbG9uZShwYXJlbnQsIGRlcHRoKTtcbn1cblxuLyoqXG4gKiBTaW1wbGUgZmxhdCBjbG9uZSB1c2luZyBwcm90b3R5cGUsIGFjY2VwdHMgb25seSBvYmplY3RzLCB1c2VmdWxsIGZvciBwcm9wZXJ0eVxuICogb3ZlcnJpZGUgb24gRkxBVCBjb25maWd1cmF0aW9uIG9iamVjdCAobm8gbmVzdGVkIHByb3BzKS5cbiAqXG4gKiBVU0UgV0lUSCBDQVVUSU9OISBUaGlzIG1heSBub3QgYmVoYXZlIGFzIHlvdSB3aXNoIGlmIHlvdSBkbyBub3Qga25vdyBob3cgdGhpc1xuICogd29ya3MuXG4gKi9cbmNsb25lLmNsb25lUHJvdG90eXBlID0gZnVuY3Rpb24gY2xvbmVQcm90b3R5cGUocGFyZW50KSB7XG4gIGlmIChwYXJlbnQgPT09IG51bGwpXG4gICAgcmV0dXJuIG51bGw7XG5cbiAgdmFyIGMgPSBmdW5jdGlvbiAoKSB7fTtcbiAgYy5wcm90b3R5cGUgPSBwYXJlbnQ7XG4gIHJldHVybiBuZXcgYygpO1xufTtcblxuLy8gcHJpdmF0ZSB1dGlsaXR5IGZ1bmN0aW9uc1xuXG5mdW5jdGlvbiBfX29ialRvU3RyKG8pIHtcbiAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvKTtcbn1cbmNsb25lLl9fb2JqVG9TdHIgPSBfX29ialRvU3RyO1xuXG5mdW5jdGlvbiBfX2lzRGF0ZShvKSB7XG4gIHJldHVybiB0eXBlb2YgbyA9PT0gJ29iamVjdCcgJiYgX19vYmpUb1N0cihvKSA9PT0gJ1tvYmplY3QgRGF0ZV0nO1xufVxuY2xvbmUuX19pc0RhdGUgPSBfX2lzRGF0ZTtcblxuZnVuY3Rpb24gX19pc0FycmF5KG8pIHtcbiAgcmV0dXJuIHR5cGVvZiBvID09PSAnb2JqZWN0JyAmJiBfX29ialRvU3RyKG8pID09PSAnW29iamVjdCBBcnJheV0nO1xufVxuY2xvbmUuX19pc0FycmF5ID0gX19pc0FycmF5O1xuXG5mdW5jdGlvbiBfX2lzUmVnRXhwKG8pIHtcbiAgcmV0dXJuIHR5cGVvZiBvID09PSAnb2JqZWN0JyAmJiBfX29ialRvU3RyKG8pID09PSAnW29iamVjdCBSZWdFeHBdJztcbn1cbmNsb25lLl9faXNSZWdFeHAgPSBfX2lzUmVnRXhwO1xuXG5mdW5jdGlvbiBfX2dldFJlZ0V4cEZsYWdzKHJlKSB7XG4gIHZhciBmbGFncyA9ICcnO1xuICBpZiAocmUuZ2xvYmFsKSBmbGFncyArPSAnZyc7XG4gIGlmIChyZS5pZ25vcmVDYXNlKSBmbGFncyArPSAnaSc7XG4gIGlmIChyZS5tdWx0aWxpbmUpIGZsYWdzICs9ICdtJztcbiAgcmV0dXJuIGZsYWdzO1xufVxuY2xvbmUuX19nZXRSZWdFeHBGbGFncyA9IF9fZ2V0UmVnRXhwRmxhZ3M7XG5cbnJldHVybiBjbG9uZTtcbn0pKCk7XG5cbmlmICh0eXBlb2YgbW9kdWxlID09PSAnb2JqZWN0JyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICBtb2R1bGUuZXhwb3J0cyA9IGNsb25lO1xufVxuIiwiZXhwb3J0cy5yZWFkID0gZnVuY3Rpb24gKGJ1ZmZlciwgb2Zmc2V0LCBpc0xFLCBtTGVuLCBuQnl0ZXMpIHtcbiAgdmFyIGUsIG1cbiAgdmFyIGVMZW4gPSBuQnl0ZXMgKiA4IC0gbUxlbiAtIDFcbiAgdmFyIGVNYXggPSAoMSA8PCBlTGVuKSAtIDFcbiAgdmFyIGVCaWFzID0gZU1heCA+PiAxXG4gIHZhciBuQml0cyA9IC03XG4gIHZhciBpID0gaXNMRSA/IChuQnl0ZXMgLSAxKSA6IDBcbiAgdmFyIGQgPSBpc0xFID8gLTEgOiAxXG4gIHZhciBzID0gYnVmZmVyW29mZnNldCArIGldXG5cbiAgaSArPSBkXG5cbiAgZSA9IHMgJiAoKDEgPDwgKC1uQml0cykpIC0gMSlcbiAgcyA+Pj0gKC1uQml0cylcbiAgbkJpdHMgKz0gZUxlblxuICBmb3IgKDsgbkJpdHMgPiAwOyBlID0gZSAqIDI1NiArIGJ1ZmZlcltvZmZzZXQgKyBpXSwgaSArPSBkLCBuQml0cyAtPSA4KSB7fVxuXG4gIG0gPSBlICYgKCgxIDw8ICgtbkJpdHMpKSAtIDEpXG4gIGUgPj49ICgtbkJpdHMpXG4gIG5CaXRzICs9IG1MZW5cbiAgZm9yICg7IG5CaXRzID4gMDsgbSA9IG0gKiAyNTYgKyBidWZmZXJbb2Zmc2V0ICsgaV0sIGkgKz0gZCwgbkJpdHMgLT0gOCkge31cblxuICBpZiAoZSA9PT0gMCkge1xuICAgIGUgPSAxIC0gZUJpYXNcbiAgfSBlbHNlIGlmIChlID09PSBlTWF4KSB7XG4gICAgcmV0dXJuIG0gPyBOYU4gOiAoKHMgPyAtMSA6IDEpICogSW5maW5pdHkpXG4gIH0gZWxzZSB7XG4gICAgbSA9IG0gKyBNYXRoLnBvdygyLCBtTGVuKVxuICAgIGUgPSBlIC0gZUJpYXNcbiAgfVxuICByZXR1cm4gKHMgPyAtMSA6IDEpICogbSAqIE1hdGgucG93KDIsIGUgLSBtTGVuKVxufVxuXG5leHBvcnRzLndyaXRlID0gZnVuY3Rpb24gKGJ1ZmZlciwgdmFsdWUsIG9mZnNldCwgaXNMRSwgbUxlbiwgbkJ5dGVzKSB7XG4gIHZhciBlLCBtLCBjXG4gIHZhciBlTGVuID0gbkJ5dGVzICogOCAtIG1MZW4gLSAxXG4gIHZhciBlTWF4ID0gKDEgPDwgZUxlbikgLSAxXG4gIHZhciBlQmlhcyA9IGVNYXggPj4gMVxuICB2YXIgcnQgPSAobUxlbiA9PT0gMjMgPyBNYXRoLnBvdygyLCAtMjQpIC0gTWF0aC5wb3coMiwgLTc3KSA6IDApXG4gIHZhciBpID0gaXNMRSA/IDAgOiAobkJ5dGVzIC0gMSlcbiAgdmFyIGQgPSBpc0xFID8gMSA6IC0xXG4gIHZhciBzID0gdmFsdWUgPCAwIHx8ICh2YWx1ZSA9PT0gMCAmJiAxIC8gdmFsdWUgPCAwKSA/IDEgOiAwXG5cbiAgdmFsdWUgPSBNYXRoLmFicyh2YWx1ZSlcblxuICBpZiAoaXNOYU4odmFsdWUpIHx8IHZhbHVlID09PSBJbmZpbml0eSkge1xuICAgIG0gPSBpc05hTih2YWx1ZSkgPyAxIDogMFxuICAgIGUgPSBlTWF4XG4gIH0gZWxzZSB7XG4gICAgZSA9IE1hdGguZmxvb3IoTWF0aC5sb2codmFsdWUpIC8gTWF0aC5MTjIpXG4gICAgaWYgKHZhbHVlICogKGMgPSBNYXRoLnBvdygyLCAtZSkpIDwgMSkge1xuICAgICAgZS0tXG4gICAgICBjICo9IDJcbiAgICB9XG4gICAgaWYgKGUgKyBlQmlhcyA+PSAxKSB7XG4gICAgICB2YWx1ZSArPSBydCAvIGNcbiAgICB9IGVsc2Uge1xuICAgICAgdmFsdWUgKz0gcnQgKiBNYXRoLnBvdygyLCAxIC0gZUJpYXMpXG4gICAgfVxuICAgIGlmICh2YWx1ZSAqIGMgPj0gMikge1xuICAgICAgZSsrXG4gICAgICBjIC89IDJcbiAgICB9XG5cbiAgICBpZiAoZSArIGVCaWFzID49IGVNYXgpIHtcbiAgICAgIG0gPSAwXG4gICAgICBlID0gZU1heFxuICAgIH0gZWxzZSBpZiAoZSArIGVCaWFzID49IDEpIHtcbiAgICAgIG0gPSAodmFsdWUgKiBjIC0gMSkgKiBNYXRoLnBvdygyLCBtTGVuKVxuICAgICAgZSA9IGUgKyBlQmlhc1xuICAgIH0gZWxzZSB7XG4gICAgICBtID0gdmFsdWUgKiBNYXRoLnBvdygyLCBlQmlhcyAtIDEpICogTWF0aC5wb3coMiwgbUxlbilcbiAgICAgIGUgPSAwXG4gICAgfVxuICB9XG5cbiAgZm9yICg7IG1MZW4gPj0gODsgYnVmZmVyW29mZnNldCArIGldID0gbSAmIDB4ZmYsIGkgKz0gZCwgbSAvPSAyNTYsIG1MZW4gLT0gOCkge31cblxuICBlID0gKGUgPDwgbUxlbikgfCBtXG4gIGVMZW4gKz0gbUxlblxuICBmb3IgKDsgZUxlbiA+IDA7IGJ1ZmZlcltvZmZzZXQgKyBpXSA9IGUgJiAweGZmLCBpICs9IGQsIGUgLz0gMjU2LCBlTGVuIC09IDgpIHt9XG5cbiAgYnVmZmVyW29mZnNldCArIGkgLSBkXSB8PSBzICogMTI4XG59XG4iXX0=
