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

if (typeof window !== 'undefined' && window.angular) {
    let myapp = angular.module('myapp', ['ngSanitize']);

    myapp.run(function ($rootScope) {
        ['isArray', 'isDate', 'isDefined', 'isFunction', 'isNumber', 'isObject', 'isString', 'isUndefined'].forEach(function (name) {
            $rootScope[name] = angular[name];
        });
    });

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

    myapp.controller('MainCtrl', function ($scope, StrategyService, $window, $timeout) {
        "use strict";

        let vm = this;
        let myStrat = StrategyService.getAll();
        //Asynchronous : If the records are ready from deffered.promise, then the following steps is run.
        myStrat.then(function (allStrategies) {
            vm.allStrategies = allStrategies;
            let interpreter = null;
            // get the strategy from URL
            let keyval = $window.location.search.replace('?', '').split('=');
            if (keyval[0] == 'strategy') {
                vm.selectedStrategy = allStrategies.filter(function (value) {
                    return value.name == keyval[1];
                })[0];
                interpreter = new models.Interpreter(vm.selectedStrategy.strategies);
                vm.execObj = interpreter.init(vm.selectedStrategy.strategies[0]);
                vm.currentStrategy = vm.execObj.currentStrategy;
                vm.parameters = vm.execObj.variables.filter(function (val) {
                    return val.type == 'parameter';
                });
                // open the modal to input strategy parameters
                $("#initialParams").modal({
                    backdrop: "static",
                    keyboard: "false"
                });
                vm.myStrategy = vm.selectedStrategy;
            }
            vm.strategyChanged = function () {
                $window.location = $window.location.origin + $window.location.pathname + '?strategy=' + vm.myStrategy.name;
            };

            vm.proceedToStrategy = function () {
                let flag = true;
                angular.forEach(vm.parameters, function (val, key) {
                    val.visible = true;
                    if (val.val == null || val.val.trim() == '') {

                        flag = false;
                    }
                });

                if (flag == true) $("#initialParams").modal('hide');
            };

            vm.reset = function () {
                if (vm.selectedStrategy) {
                    interpreter.reset();
                    vm.execObj = interpreter.init(vm.selectedStrategy.strategies[0]);
                    vm.currentStrategy = vm.execObj.currentStrategy;
                    $('#' + vm.currentStrategy.name).collapse('show');
                    vm.selectedStrategy.strategies.forEach(function (strat) {
                        if (vm.currentStrategy.name !== strat.name) $('#' + strat.name).collapse('hide');
                    });
                    // open the modal to input strategy parameters
                    vm.parameters = vm.execObj.variables.filter(function (val) {
                        return val.type == 'parameter';
                    });
                    // open the modal to input strategy parameters
                    $("#initialParams").modal({
                        backdrop: "static",
                        keyboard: "false"
                    });
                } else {
                    alert("please choose a strategy first");
                }
            };
            function checkType() {
                if (vm.execObj.currentStatement.type == 'set') {
                    let id = vm.execObj.currentStatement.identifier.replace(/'/g, '');
                    let variable = vm.execObj.variables.find(function (val, index, arr) {
                        return val.name == id;
                    });
                    if (variable.val == null || variable.val.length == 0) {
                        variable.visible = true;
                        vm.execObj.setNeeded = true;
                        $scope.$broadcast("EditMe", id);
                    } else {
                        vm.execObj.setNeeded = false;
                    }
                }
                if (vm.execObj.currentStatement.type == 'foreach' || vm.execObj.currentStatement.type == 'loop') {
                    let list = vm.execObj.variables.find(function (val) {
                        return val.name === vm.execObj.currentStatement.list.replace(/'/g, '');
                    });

                    let identifier = vm.execObj.variables.find(function (val) {
                        return val.name === vm.execObj.currentStatement.identifier.replace(/'/g, '');
                    });
                    identifier.visible = true;
                    identifier.val = list.val[vm.execObj.currentStatement.counter ? vm.execObj.currentStatement.counter : 0];
                    list.dirtyArray.push(list.val[vm.execObj.currentStatement.counter ? vm.execObj.currentStatement.counter : 0]);
                    //$scope.$apply();
                }
            }

            vm.nextStatement = function () {
                vm.execObj = interpreter.execute();
                // vm.execObj.variables.forEach(function (variable) {
                //     console.log("Variables:   " + variable.name);
                // });
                if (vm.execObj == null) {
                    $timeout(function () {
                        alert("You reach end of strategy! If you think you did not finish the task, reset the strategy and start over again. ");
                    }, 100);
                    return;
                }
                checkType();
                if (vm.currentStrategy.name !== vm.execObj.currentStrategy.name) {
                    $('#' + vm.execObj.currentStrategy.name).collapse('show');
                    $('#' + vm.currentStrategy.name).collapse('hide');
                    if (vm.execObj.variables !== null) {
                        vm.parameters = vm.execObj.variables.filter(function (val) {
                            return val.type == 'parameter';
                        });
                    }

                    vm.currentStrategy = vm.execObj.currentStrategy;
                }
            };

            vm.prevStatement = function () {
                vm.execObj = interpreter.goBack();
                if (vm.execObj === null) return;
                if (vm.execObj.currentStatement.type === 'set') {
                    let id = vm.execObj.currentStatement.identifier.replace(/'/g, '');
                    let variable = vm.execObj.variables.find(function (val, index, arr) {
                        return val.name == id;
                    });
                    console.log(variable);
                    if (variable.dirtyArray !== undefined) variable.dirtyArray = [];
                }
                checkType();
                if (vm.currentStrategy.name !== vm.execObj.currentStrategy.name) {
                    $('#' + vm.execObj.currentStrategy.name).collapse('show');
                    $('#' + vm.currentStrategy.name).collapse('hide');
                    vm.currentStrategy = vm.execObj.currentStrategy;
                }
            };

            vm.outerStatement = function () {
                vm.execObj = interpreter.execute(false);

                checkType();
            };
            vm.innerStatement = function () {
                vm.execObj = interpreter.execute(true);
                checkType();
            };

            $scope.$on("setNeededFalse", function (args) {
                if (!args.targetScope.model) {
                    vm.execObj.setNeeded = true;
                } else {
                    vm.execObj.setNeeded = false;
                }
            });

            $scope.$on("blockAdd", function (args, data) {
                interpreter.addLoopBlocks(data.id, data.data);
            });
        });
    });

    myapp.directive('variableValue', function ($parse, $timeout) {
        return {
            template: '<span ng-show="edit">' + '<textarea ng-show="isArray " ng-blur="updateModel()" ng-model="var"></textarea>' + '<input type="text" ng-show="!isArray " ng-blur="updateModel()" ng-model="model">' + '</span>' + '<div class="var-outer-border" ng-show="!edit" ng-attr-id="{{modelId}}">' + '<span class="showvars" ng-show="isArray && allvar.length " ng-class="dirtyArray.indexOf(myvar) >= 0 ? \'dirty\' : \'\'" ng-repeat="myvar in allvar track by $index">{{myvar}}</span>' + '<span class="showvars" ng-show="isArray && !allvar.length " ng-click="changeEdit()">nothing</span>' + '<span class="showvars" ng-show="!isArray && model.length "  ng-click="changeEdit()">{{model}}</span>' + '<span class="showvars" ng-show="!isArray && !model.length " ng-click="changeEdit()">nothing</span>' + '<button style="margin-left:5px;" ng-show="isArray && allvar.length " title=" Add more items" href="#" ng-click="changeEdit()"><i class="glyphicon glyphicon-plus"></i></button>' + '</div>',
            restrict: 'E',
            scope: {
                model: '=',
                isArray: '=',
                modelId: '=',
                parentId: '=',
                dirtyArray: '=',
                prevVar: '='
            },
            link: function (scope, element, attrs, controller) {
                scope.edit = false;
                scope.var = '';
                scope.id = null;
                var listener = null;
                scope.$on('EditMe', function (event, data) {
                    if (scope.modelId == data) {
                        scope.id = data;
                        scope.changeEdit();
                    }
                });
                if (scope.isArray) {
                    scope.allvar = scope.model;
                }

                scope.changeEdit = function () {

                    listener = scope.$watch('model', function (newval, oldval) {
                        scope.$emit("setNeededFalse");
                    });
                    scope.edit = !scope.edit;
                    if (scope.isArray) {
                        scope.var = scope.allvar.join(',');
                        $timeout(function () {
                            element[0].firstChild.firstChild.focus();
                        }, 10);
                    } else {
                        $timeout(function () {
                            element[0].firstChild.lastChild.focus();
                        }, 10);
                    }
                };
                scope.updateModel = function () {
                    listener();
                    scope.edit = !scope.edit;
                    if (scope.isArray) {
                        let arr = new Set(scope.var.split(','));

                        scope.allvar = [];
                        angular.forEach(arr, function (val, key) {
                            val.trim().length ? scope.allvar.push(val.trim()) : null;
                        });

                        if (scope.dirtyArray.length > 0) {
                            for (let i = 0; i < scope.dirtyArray.length; i++) {
                                if (scope.dirtyArray[i] !== scope.allvar[i]) {
                                    scope.allvar = scope.prevVar;
                                    alert(" You are currently executing a loop. Adding elements are just allowed to the end of collection.  ");
                                    return;
                                }
                            }
                        }

                        $parse(attrs.model).assign(scope.$parent, scope.allvar);
                        if (scope.prevVar.length !== 0 && scope.prevVar.length < scope.allvar.length) {
                            scope.$emit("blockAdd", { "data": scope.allvar.slice(scope.prevVar.length, scope.allvar.length), "id": scope.parentId });
                        }
                        //console.log(scope.allvar.length);

                        scope.prevVar = scope.allvar;
                    }
                    if (scope.id) {
                        scope.$emit("setNeededFalse");
                    }
                };
            }
        };
    });
}

},{"./dataManagement.js":1,"./models.js":3}],3:[function(require,module,exports){
'use strict';

var clone = require('clone');

Array.prototype.insert = function (index) {
    index = Math.min(index, this.length);
    arguments.length > 1 && this.splice.apply(this, [index, 0].concat([].pop.call(arguments))) && this.insert.apply(this, arguments);
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
            variables: currentExecutionContext.variables
        };
    }

    reset() {
        this.executionStack = [];
        this.historyBackward = [];
    }

    findStrategy(strategyname) {
        return this.strategies.find(function (strategy) {
            return strategy.name === strategyname;
        });
    }

    addLoopBlocks(id, arr) {
        let currentExecutionContext = this.executionStack[this.executionStack.length - 1];
        if (currentExecutionContext.pc && currentExecutionContext.pc.type === 'foreach') return; // if foreach is still in the blocks, then it should work correctly
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
        if (this.executionStack[this.executionStack.length - 1] && this.executionStack[this.executionStack.length - 1].pc.type === 'end') return null;
        if (this.executionStack.length) {
            this.historyBackward.push(clone(this.executionStack)); // take a snapshot from our current executionStack to our history
        } else {
            return null;
        }
        let currentExecutionContext = this.executionStack.pop();
        let nextType = currentExecutionContext.getNextStatement(currentExecutionContext.pc, branchTaken);
        if (nextType === 'nothing' || nextType === 'return') return this.execute(branchTaken);else if (nextType === null) return null;else if (nextType === 'new') {
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
            selectionNeeded: currentExecutionContext.pc.type === "if" || currentExecutionContext.pc.type === "until",
            setNeeded: currentExecutionContext.pc.type === 'set',
            variables: currentExecutionContext.variables
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
            selectionNeeded: currentExecutionContext.pc.type === "if" || currentExecutionContext.pc.type === "until",
            setNeeded: currentExecutionContext.pc.type === 'set',
            variables: currentExecutionContext.variables
        };
    }
}

var globalCounter = { count: 0 };

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
                    "visible": false
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
                        "visible": false
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
                                "visible": false
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
                                "visible": false
                            });
                        }
                    }, argThis);
                }
            }
            if (currentVal.type === "foreach") {
                argThis.variables.forEach(function (val) {
                    if (val.name === currentVal.list.replace(/'/g, '')) {
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

},{"clone":6}],4:[function(require,module,exports){
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

},{}],5:[function(require,module,exports){
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

},{"base64-js":4,"ieee754":7}],6:[function(require,module,exports){
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

},{"buffer":5}],7:[function(require,module,exports){
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJkYXRhTWFuYWdlbWVudC5qcyIsImluZGV4LmpzIiwibW9kZWxzLmpzIiwiLi4vbm9kZV9tb2R1bGVzL2Jhc2U2NC1qcy9pbmRleC5qcyIsIi4uL25vZGVfbW9kdWxlcy9idWZmZXIvaW5kZXguanMiLCIuLi9ub2RlX21vZHVsZXMvY2xvbmUvY2xvbmUuanMiLCIuLi9ub2RlX21vZHVsZXMvaWVlZTc1NC9pbmRleC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7QUNDQSxJQUFJLFNBQVM7QUFDVCxZQUFRLHlDQURDO0FBRVQsZ0JBQVksaUNBRkg7QUFHVCxpQkFBYSx3Q0FISjtBQUlULGVBQVcsaUJBSkY7QUFLVCxtQkFBZSw2QkFMTjtBQU1ULHVCQUFtQjtBQU5WLENBQWI7QUFRQSxTQUFTLGFBQVQsQ0FBdUIsTUFBdkI7OztBQ1RBLE1BQU0sU0FBUyxRQUFRLGFBQVIsQ0FBZjtBQUNBLE1BQU0sS0FBSyxRQUFRLHFCQUFSLENBQVg7O0FBRUEsSUFBSSxPQUFPLE1BQVAsS0FBa0IsV0FBbEIsSUFBaUMsT0FBTyxPQUE1QyxFQUFxRDtBQUNqRCxRQUFJLFFBQVEsUUFBUSxNQUFSLENBQWUsT0FBZixFQUF3QixDQUFDLFlBQUQsQ0FBeEIsQ0FBWjs7QUFFQSxVQUFNLEdBQU4sQ0FBVSxVQUFVLFVBQVYsRUFBc0I7QUFDNUIsU0FBQyxTQUFELEVBQVksUUFBWixFQUFzQixXQUF0QixFQUFtQyxZQUFuQyxFQUFpRCxVQUFqRCxFQUE2RCxVQUE3RCxFQUF5RSxVQUF6RSxFQUFxRixhQUFyRixFQUFvRyxPQUFwRyxDQUE0RyxVQUFVLElBQVYsRUFBZ0I7QUFDeEgsdUJBQVcsSUFBWCxJQUFtQixRQUFRLElBQVIsQ0FBbkI7QUFDSCxTQUZEO0FBR0gsS0FKRDs7QUFNQSxVQUFNLE9BQU4sQ0FBYyxpQkFBZCxFQUFpQyxVQUFVLEVBQVYsRUFBYztBQUMzQyxZQUFJLGFBQWEs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QTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUNsckRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQzNQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJcbnZhciBjb25maWcgPSB7XG4gICAgYXBpS2V5OiBcIkFJemFTeUFYakw2ZjczOUJWcUxEa255bUNOMkgzNi1OQkRTOEx2WVwiLFxuICAgIGF1dGhEb21haW46IFwic3RyYXRlZ3l0cmFja2VyLmZpcmViYXNlYXBwLmNvbVwiLFxuICAgIGRhdGFiYXNlVVJMOiBcImh0dHBzOi8vc3RyYXRlZ3l0cmFja2VyLmZpcmViYXNlaW8uY29tXCIsXG4gICAgcHJvamVjdElkOiBcInN0cmF0ZWd5dHJhY2tlclwiLFxuICAgIHN0b3JhZ2VCdWNrZXQ6IFwic3RyYXRlZ3l0cmFja2VyLmFwcHNwb3QuY29tXCIsXG4gICAgbWVzc2FnaW5nU2VuZGVySWQ6IFwiMjYxMjQ5ODM2NTE4XCJcbn07XG5maXJlYmFzZS5pbml0aWFsaXplQXBwKGNvbmZpZyk7XG5cbiIsImNvbnN0IG1vZGVscyA9IHJlcXVpcmUoJy4vbW9kZWxzLmpzJyk7XHJcbmNvbnN0IGRiID0gcmVxdWlyZSgnLi9kYXRhTWFuYWdlbWVudC5qcycpO1xyXG5cclxuaWYgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnICYmIHdpbmRvdy5hbmd1bGFyKSB7XHJcbiAgICBsZXQgbXlhcHAgPSBhbmd1bGFyLm1vZHVsZSgnbXlhcHAnLCBbJ25nU2FuaXRpemUnXSk7XHJcblxyXG4gICAgbXlhcHAucnVuKGZ1bmN0aW9uICgkcm9vdFNjb3BlKSB7XHJcbiAgICAgICAgWydpc0FycmF5JywgJ2lzRGF0ZScsICdpc0RlZmluZWQnLCAnaXNGdW5jdGlvbicsICdpc051bWJlcicsICdpc09iamVjdCcsICdpc1N0cmluZycsICdpc1VuZGVmaW5lZCddLmZvckVhY2goZnVuY3Rpb24gKG5hbWUpIHtcclxuICAgICAgICAgICAgJHJvb3RTY29wZVtuYW1lXSA9IGFuZ3VsYXJbbmFtZV07XHJcbiAgICAgICAgfSk7XHJcbiAgICB9KTtcclxuXHJcbiAgICBteWFwcC5mYWN0b3J5KCdTdHJhdGVneVNlcnZpY2UnLCBmdW5jdGlvbiAoJHEpIHtcclxuICAgICAgICBsZXQgc3RyYXRlZ2llcyA9IFtdO1xyXG4gICAgICAgIGxldCBkZWZlcnJlZCA9ICRxLmRlZmVyKCk7XHJcbiAgICAgICAgZmlyZWJhc2UuZGF0YWJhc2UoKS5yZWYoJ3N0cmF0ZWdpZXMnKS5vbmNlKCd2YWx1ZScpLnRoZW4oZnVuY3Rpb24gKHNuYXBzaG90KSB7XHJcbiAgICAgICAgICAgIHNuYXBzaG90LmZvckVhY2goZnVuY3Rpb24gKGNoaWxkU3RyYXRlZ3kpIHtcclxuICAgICAgICAgICAgICAgIHN0cmF0ZWdpZXMucHVzaChjaGlsZFN0cmF0ZWd5LnZhbCgpKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUoc3RyYXRlZ2llcyk7XHJcbiAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycikge1xyXG4gICAgICAgICAgICBkZWZlcnJlZC5yZWplY3QoZXJyKTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgZ2V0QWxsOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICB9O1xyXG4gICAgfSk7XHJcblxyXG4gICAgbXlhcHAuY29udHJvbGxlcignTWFpbkN0cmwnLCBmdW5jdGlvbiAoJHNjb3BlLCBTdHJhdGVneVNlcnZpY2UsICR3aW5kb3csICR0aW1lb3V0KSB7XHJcbiAgICAgICAgXCJ1c2Ugc3RyaWN0XCI7XHJcbiAgICAgICAgbGV0IHZtID0gdGhpcztcclxuICAgICAgICBsZXQgbXlTdHJhdCA9IFN0cmF0ZWd5U2VydmljZS5nZXRBbGwoKTtcclxuICAgICAgICAvL0FzeW5jaHJvbm91cyA6IElmIHRoZSByZWNvcmRzIGFyZSByZWFkeSBmcm9tIGRlZmZlcmVkLnByb21pc2UsIHRoZW4gdGhlIGZvbGxvd2luZyBzdGVwcyBpcyBydW4uXHJcbiAgICAgICAgbXlTdHJhdC50aGVuKGZ1bmN0aW9uIChhbGxTdHJhdGVnaWVzKSB7XHJcbiAgICAgICAgICAgIHZtLmFsbFN0cmF0ZWdpZXMgPSBhbGxTdHJhdGVnaWVzO1xyXG4gICAgICAgICAgICBsZXQgaW50ZXJwcmV0ZXIgPSBudWxsO1xyXG4gICAgICAgICAgICAvLyBnZXQgdGhlIHN0cmF0ZWd5IGZyb20gVVJMXHJcbiAgICAgICAgICAgIGxldCBrZXl2YWwgPSAkd2luZG93LmxvY2F0aW9uLnNlYXJjaC5yZXBsYWNlKCc/JywgJycpLnNwbGl0KCc9Jyk7XHJcbiAgICAgICAgICAgIGlmKGtleXZhbFswXSA9PSAnc3RyYXRlZ3knKSB7XHJcbiAgICAgICAgICAgICAgICB2bS5zZWxlY3RlZFN0cmF0ZWd5ID0gYWxsU3RyYXRlZ2llcy5maWx0ZXIoZnVuY3Rpb24gKHZhbHVlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHZhbHVlLm5hbWUgPT0ga2V5dmFsWzFdO1xyXG4gICAgICAgICAgICAgICAgfSlbMF07XHJcbiAgICAgICAgICAgICAgICBpbnRlcnByZXRlciA9IG5ldyBtb2RlbHMuSW50ZXJwcmV0ZXIodm0uc2VsZWN0ZWRTdHJhdGVneS5zdHJhdGVnaWVzKTtcclxuICAgICAgICAgICAgICAgIHZtLmV4ZWNPYmogPSBpbnRlcnByZXRlci5pbml0KHZtLnNlbGVjdGVkU3RyYXRlZ3kuc3RyYXRlZ2llc1swXSk7XHJcbiAgICAgICAgICAgICAgICB2bS5jdXJyZW50U3RyYXRlZ3kgPSB2bS5leGVjT2JqLmN1cnJlbnRTdHJhdGVneTtcclxuICAgICAgICAgICAgICAgIHZtLnBhcmFtZXRlcnMgPSB2bS5leGVjT2JqLnZhcmlhYmxlcy5maWx0ZXIoZnVuY3Rpb24gKHZhbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB2YWwudHlwZSA9PSAncGFyYW1ldGVyJztcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgLy8gb3BlbiB0aGUgbW9kYWwgdG8gaW5wdXQgc3RyYXRlZ3kgcGFyYW1ldGVyc1xyXG4gICAgICAgICAgICAgICAgJChcIiNpbml0aWFsUGFyYW1zXCIpLm1vZGFsKHtcclxuICAgICAgICAgICAgICAgICAgICBiYWNrZHJvcDogXCJzdGF0aWNcIixcclxuICAgICAgICAgICAgICAgICAgICBrZXlib2FyZDogXCJmYWxzZVwiLFxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB2bS5teVN0cmF0ZWd5ID0gdm0uc2VsZWN0ZWRTdHJhdGVneTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB2bS5zdHJhdGVneUNoYW5nZWQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAkd2luZG93LmxvY2F0aW9uID0gJHdpbmRvdy5sb2NhdGlvbi5vcmlnaW4gKyAkd2luZG93LmxvY2F0aW9uLnBhdGhuYW1lICsgJz9zdHJhdGVneT0nICsgdm0ubXlTdHJhdGVneS5uYW1lO1xyXG4gICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgdm0ucHJvY2VlZFRvU3RyYXRlZ3kgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgZmxhZyA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICBhbmd1bGFyLmZvckVhY2godm0ucGFyYW1ldGVycywgZnVuY3Rpb24gKHZhbCwga2V5KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFsLnZpc2libGU9dHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICBpZih2YWwudmFsID09IG51bGwgfHwgdmFsLnZhbC50cmltKCkgPT0gJycpIHtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZsYWcgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZihmbGFnID09IHRydWUpICQoXCIjaW5pdGlhbFBhcmFtc1wiKS5tb2RhbCgnaGlkZScpO1xyXG4gICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgdm0ucmVzZXQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAodm0uc2VsZWN0ZWRTdHJhdGVneSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGludGVycHJldGVyLnJlc2V0KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgdm0uZXhlY09iaiA9IGludGVycHJldGVyLmluaXQodm0uc2VsZWN0ZWRTdHJhdGVneS5zdHJhdGVnaWVzWzBdKTtcclxuICAgICAgICAgICAgICAgICAgICB2bS5jdXJyZW50U3RyYXRlZ3kgPSB2bS5leGVjT2JqLmN1cnJlbnRTdHJhdGVneTtcclxuICAgICAgICAgICAgICAgICAgICAkKCcjJyArIHZtLmN1cnJlbnRTdHJhdGVneS5uYW1lKS5jb2xsYXBzZSgnc2hvdycpO1xyXG4gICAgICAgICAgICAgICAgICAgIHZtLnNlbGVjdGVkU3RyYXRlZ3kuc3RyYXRlZ2llcy5mb3JFYWNoKGZ1bmN0aW9uIChzdHJhdCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZih2bS5jdXJyZW50U3RyYXRlZ3kubmFtZSAhPT0gc3RyYXQubmFtZSkgJCgnIycgKyBzdHJhdC5uYW1lKS5jb2xsYXBzZSgnaGlkZScpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIG9wZW4gdGhlIG1vZGFsIHRvIGlucHV0IHN0cmF0ZWd5IHBhcmFtZXRlcnNcclxuICAgICAgICAgICAgICAgICAgICB2bS5wYXJhbWV0ZXJzID0gdm0uZXhlY09iai52YXJpYWJsZXMuZmlsdGVyKGZ1bmN0aW9uICh2YWwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHZhbC50eXBlID09ICdwYXJhbWV0ZXInO1xyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIG9wZW4gdGhlIG1vZGFsIHRvIGlucHV0IHN0cmF0ZWd5IHBhcmFtZXRlcnNcclxuICAgICAgICAgICAgICAgICAgICAkKFwiI2luaXRpYWxQYXJhbXNcIikubW9kYWwoe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBiYWNrZHJvcDogXCJzdGF0aWNcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAga2V5Ym9hcmQ6IFwiZmFsc2VcIixcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgYWxlcnQoXCJwbGVhc2UgY2hvb3NlIGEgc3RyYXRlZ3kgZmlyc3RcIik7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICBmdW5jdGlvbiBjaGVja1R5cGUoKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAodm0uZXhlY09iai5jdXJyZW50U3RhdGVtZW50LnR5cGUgPT0gJ3NldCcpIHtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgaWQgPSB2bS5leGVjT2JqLmN1cnJlbnRTdGF0ZW1lbnQuaWRlbnRpZmllci5yZXBsYWNlKC8nL2csICcnKTtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgdmFyaWFibGUgPSB2bS5leGVjT2JqLnZhcmlhYmxlcy5maW5kKGZ1bmN0aW9uICh2YWwsIGluZGV4LCBhcnIpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHZhbC5uYW1lID09IGlkO1xyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICh2YXJpYWJsZS52YWwgPT0gbnVsbCB8fCB2YXJpYWJsZS52YWwubGVuZ3RoID09IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyaWFibGUudmlzaWJsZSA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZtLmV4ZWNPYmouc2V0TmVlZGVkID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLiRicm9hZGNhc3QoXCJFZGl0TWVcIiwgaWQpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZtLmV4ZWNPYmouc2V0TmVlZGVkID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgaWYgKHZtLmV4ZWNPYmouY3VycmVudFN0YXRlbWVudC50eXBlID09ICdmb3JlYWNoJyB8fCB2bS5leGVjT2JqLmN1cnJlbnRTdGF0ZW1lbnQudHlwZSA9PSAnbG9vcCcpIHtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgbGlzdCA9IHZtLmV4ZWNPYmoudmFyaWFibGVzLmZpbmQoZnVuY3Rpb24gKHZhbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdmFsLm5hbWUgPT09IHZtLmV4ZWNPYmouY3VycmVudFN0YXRlbWVudC5saXN0LnJlcGxhY2UoLycvZywgJycpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBsZXQgaWRlbnRpZmllciA9IHZtLmV4ZWNPYmoudmFyaWFibGVzLmZpbmQoZnVuY3Rpb24gKHZhbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdmFsLm5hbWUgPT09IHZtLmV4ZWNPYmouY3VycmVudFN0YXRlbWVudC5pZGVudGlmaWVyLnJlcGxhY2UoLycvZywgJycpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIGlkZW50aWZpZXIudmlzaWJsZSA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgaWRlbnRpZmllci52YWwgPSBsaXN0LnZhbFt2bS5leGVjT2JqLmN1cnJlbnRTdGF0ZW1lbnQuY291bnRlciA/IHZtLmV4ZWNPYmouY3VycmVudFN0YXRlbWVudC5jb3VudGVyIDogMF07XHJcbiAgICAgICAgICAgICAgICAgICAgbGlzdC5kaXJ0eUFycmF5LnB1c2gobGlzdC52YWxbdm0uZXhlY09iai5jdXJyZW50U3RhdGVtZW50LmNvdW50ZXIgPyB2bS5leGVjT2JqLmN1cnJlbnRTdGF0ZW1lbnQuY291bnRlciA6IDBdKTtcclxuICAgICAgICAgICAgICAgICAgICAvLyRzY29wZS4kYXBwbHkoKTtcclxuXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHZtLm5leHRTdGF0ZW1lbnQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICB2bS5leGVjT2JqID0gaW50ZXJwcmV0ZXIuZXhlY3V0ZSgpO1xyXG4gICAgICAgICAgICAgICAgLy8gdm0uZXhlY09iai52YXJpYWJsZXMuZm9yRWFjaChmdW5jdGlvbiAodmFyaWFibGUpIHtcclxuICAgICAgICAgICAgICAgIC8vICAgICBjb25zb2xlLmxvZyhcIlZhcmlhYmxlczogICBcIiArIHZhcmlhYmxlLm5hbWUpO1xyXG4gICAgICAgICAgICAgICAgLy8gfSk7XHJcbiAgICAgICAgICAgICAgICBpZiAodm0uZXhlY09iaiA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgJHRpbWVvdXQoZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGFsZXJ0KFwiWW91IHJlYWNoIGVuZCBvZiBzdHJhdGVneSEgSWYgeW91IHRoaW5rIHlvdSBkaWQgbm90IGZpbmlzaCB0aGUgdGFzaywgcmVzZXQgdGhlIHN0cmF0ZWd5IGFuZCBzdGFydCBvdmVyIGFnYWluLiBcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgfSwgMTAwKTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBjaGVja1R5cGUoKTtcclxuICAgICAgICAgICAgICAgIGlmICh2bS5jdXJyZW50U3RyYXRlZ3kubmFtZSAhPT0gdm0uZXhlY09iai5jdXJyZW50U3RyYXRlZ3kubmFtZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICQoJyMnICsgdm0uZXhlY09iai5jdXJyZW50U3RyYXRlZ3kubmFtZSkuY29sbGFwc2UoJ3Nob3cnKTtcclxuICAgICAgICAgICAgICAgICAgICAkKCcjJyArIHZtLmN1cnJlbnRTdHJhdGVneS5uYW1lKS5jb2xsYXBzZSgnaGlkZScpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICh2bS5leGVjT2JqLnZhcmlhYmxlcyAhPT0gbnVsbCl7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZtLnBhcmFtZXRlcnMgPSB2bS5leGVjT2JqLnZhcmlhYmxlcy5maWx0ZXIoZnVuY3Rpb24gKHZhbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHZhbC50eXBlID09ICdwYXJhbWV0ZXInO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHZtLmN1cnJlbnRTdHJhdGVneSA9IHZtLmV4ZWNPYmouY3VycmVudFN0cmF0ZWd5O1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgdm0ucHJldlN0YXRlbWVudCA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIHZtLmV4ZWNPYmogPSBpbnRlcnByZXRlci5nb0JhY2soKTtcclxuICAgICAgICAgICAgICAgIGlmICh2bS5leGVjT2JqID09PSBudWxsKSByZXR1cm47XHJcbiAgICAgICAgICAgICAgICBpZih2bS5leGVjT2JqLmN1cnJlbnRTdGF0ZW1lbnQudHlwZSA9PT0gJ3NldCcpIHtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgaWQgPSB2bS5leGVjT2JqLmN1cnJlbnRTdGF0ZW1lbnQuaWRlbnRpZmllci5yZXBsYWNlKC8nL2csICcnKTtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgdmFyaWFibGUgPSB2bS5leGVjT2JqLnZhcmlhYmxlcy5maW5kKGZ1bmN0aW9uICh2YWwsIGluZGV4LCBhcnIpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHZhbC5uYW1lID09IGlkO1xyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHZhcmlhYmxlKTtcclxuICAgICAgICAgICAgICAgICAgICBpZih2YXJpYWJsZS5kaXJ0eUFycmF5ICE9PSB1bmRlZmluZWQpIHZhcmlhYmxlLmRpcnR5QXJyYXkgPSBbXTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGNoZWNrVHlwZSgpO1xyXG4gICAgICAgICAgICAgICAgaWYgKHZtLmN1cnJlbnRTdHJhdGVneS5uYW1lICE9PSB2bS5leGVjT2JqLmN1cnJlbnRTdHJhdGVneS5uYW1lKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgJCgnIycgKyB2bS5leGVjT2JqLmN1cnJlbnRTdHJhdGVneS5uYW1lKS5jb2xsYXBzZSgnc2hvdycpO1xyXG4gICAgICAgICAgICAgICAgICAgICQoJyMnICsgdm0uY3VycmVudFN0cmF0ZWd5Lm5hbWUpLmNvbGxhcHNlKCdoaWRlJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgdm0uY3VycmVudFN0cmF0ZWd5ID0gdm0uZXhlY09iai5jdXJyZW50U3RyYXRlZ3k7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICB2bS5vdXRlclN0YXRlbWVudCA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIHZtLmV4ZWNPYmogPSBpbnRlcnByZXRlci5leGVjdXRlKGZhbHNlKTtcclxuXHJcbiAgICAgICAgICAgICAgICBjaGVja1R5cGUoKTtcclxuXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIHZtLmlubmVyU3RhdGVtZW50ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgdm0uZXhlY09iaiA9IGludGVycHJldGVyLmV4ZWN1dGUodHJ1ZSk7XHJcbiAgICAgICAgICAgICAgICBjaGVja1R5cGUoKTtcclxuICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgICRzY29wZS4kb24oXCJzZXROZWVkZWRGYWxzZVwiLCBmdW5jdGlvbiAoYXJncykge1xyXG4gICAgICAgICAgICAgICAgaWYoIWFyZ3MudGFyZ2V0U2NvcGUubW9kZWwpIHtcclxuICAgICAgICAgICAgICAgICAgICB2bS5leGVjT2JqLnNldE5lZWRlZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHZtLmV4ZWNPYmouc2V0TmVlZGVkID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgJHNjb3BlLiRvbihcImJsb2NrQWRkXCIsIGZ1bmN0aW9uIChhcmdzLCBkYXRhKSB7XHJcbiAgICAgICAgICAgICAgICBpbnRlcnByZXRlci5hZGRMb29wQmxvY2tzKGRhdGEuaWQsIGRhdGEuZGF0YSk7XHJcblxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgIH0pO1xyXG4gICAgfSk7XHJcblxyXG4gICAgbXlhcHAuZGlyZWN0aXZlKCd2YXJpYWJsZVZhbHVlJywgZnVuY3Rpb24gKCRwYXJzZSwgJHRpbWVvdXQpIHtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICB0ZW1wbGF0ZTpcclxuICAgICAgICAgICAgJzxzcGFuIG5nLXNob3c9XCJlZGl0XCI+JyArXHJcbiAgICAgICAgICAgICc8dGV4dGFyZWEgbmctc2hvdz1cImlzQXJyYXkgXCIgbmctYmx1cj1cInVwZGF0ZU1vZGVsKClcIiBuZy1tb2RlbD1cInZhclwiPjwvdGV4dGFyZWE+JyArXHJcbiAgICAgICAgICAgICc8aW5wdXQgdHlwZT1cInRleHRcIiBuZy1zaG93PVwiIWlzQXJyYXkgXCIgbmctYmx1cj1cInVwZGF0ZU1vZGVsKClcIiBuZy1tb2RlbD1cIm1vZGVsXCI+JyArXHJcbiAgICAgICAgICAgICc8L3NwYW4+JyArXHJcbiAgICAgICAgICAgICc8ZGl2IGNsYXNzPVwidmFyLW91dGVyLWJvcmRlclwiIG5nLXNob3c9XCIhZWRpdFwiIG5nLWF0dHItaWQ9XCJ7e21vZGVsSWR9fVwiPicgK1xyXG4gICAgICAgICAgICAnPHNwYW4gY2xhc3M9XCJzaG93dmFyc1wiIG5nLXNob3c9XCJpc0FycmF5ICYmIGFsbHZhci5sZW5ndGggXCIgbmctY2xhc3M9XCJkaXJ0eUFycmF5LmluZGV4T2YobXl2YXIpID49IDAgPyBcXCdkaXJ0eVxcJyA6IFxcJ1xcJ1wiIG5nLXJlcGVhdD1cIm15dmFyIGluIGFsbHZhciB0cmFjayBieSAkaW5kZXhcIj57e215dmFyfX08L3NwYW4+JyArXHJcbiAgICAgICAgICAgICc8c3BhbiBjbGFzcz1cInNob3d2YXJzXCIgbmctc2hvdz1cImlzQXJyYXkgJiYgIWFsbHZhci5sZW5ndGggXCIgbmctY2xpY2s9XCJjaGFuZ2VFZGl0KClcIj5ub3RoaW5nPC9zcGFuPicgK1xyXG4gICAgICAgICAgICAnPHNwYW4gY2xhc3M9XCJzaG93dmFyc1wiIG5nLXNob3c9XCIhaXNBcnJheSAmJiBtb2RlbC5sZW5ndGggXCIgIG5nLWNsaWNrPVwiY2hhbmdlRWRpdCgpXCI+e3ttb2RlbH19PC9zcGFuPicgK1xyXG4gICAgICAgICAgICAnPHNwYW4gY2xhc3M9XCJzaG93dmFyc1wiIG5nLXNob3c9XCIhaXNBcnJheSAmJiAhbW9kZWwubGVuZ3RoIFwiIG5nLWNsaWNrPVwiY2hhbmdlRWRpdCgpXCI+bm90aGluZzwvc3Bhbj4nICtcclxuICAgICAgICAgICAgJzxidXR0b24gc3R5bGU9XCJtYXJnaW4tbGVmdDo1cHg7XCIgbmctc2hvdz1cImlzQXJyYXkgJiYgYWxsdmFyLmxlbmd0aCBcIiB0aXRsZT1cIiBBZGQgbW9yZSBpdGVtc1wiIGhyZWY9XCIjXCIgbmctY2xpY2s9XCJjaGFuZ2VFZGl0KClcIj48aSBjbGFzcz1cImdseXBoaWNvbiBnbHlwaGljb24tcGx1c1wiPjwvaT48L2J1dHRvbj4nICtcclxuICAgICAgICAgICAgJzwvZGl2PicsXHJcbiAgICAgICAgICAgIHJlc3RyaWN0OiAnRScsXHJcbiAgICAgICAgICAgIHNjb3BlOiB7XHJcbiAgICAgICAgICAgICAgICBtb2RlbDogJz0nLFxyXG4gICAgICAgICAgICAgICAgaXNBcnJheTogJz0nLFxyXG4gICAgICAgICAgICAgICAgbW9kZWxJZDogJz0nLFxyXG4gICAgICAgICAgICAgICAgcGFyZW50SWQ6ICc9JyxcclxuICAgICAgICAgICAgICAgIGRpcnR5QXJyYXk6ICc9JyxcclxuICAgICAgICAgICAgICAgIHByZXZWYXI6ICc9J1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGUsIGVsZW1lbnQsIGF0dHJzLCBjb250cm9sbGVyKSB7XHJcbiAgICAgICAgICAgICAgICBzY29wZS5lZGl0ID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICBzY29wZS52YXIgPSAnJztcclxuICAgICAgICAgICAgICAgIHNjb3BlLmlkID0gbnVsbDtcclxuICAgICAgICAgICAgICAgIHZhciBsaXN0ZW5lciA9IG51bGw7XHJcbiAgICAgICAgICAgICAgICBzY29wZS4kb24oJ0VkaXRNZScsIGZ1bmN0aW9uIChldmVudCwgZGF0YSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChzY29wZS5tb2RlbElkID09IGRhdGEpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2NvcGUuaWQgPSBkYXRhO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzY29wZS5jaGFuZ2VFZGl0KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICBpZiAoc2NvcGUuaXNBcnJheSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHNjb3BlLmFsbHZhciA9IHNjb3BlLm1vZGVsO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIHNjb3BlLmNoYW5nZUVkaXQgPSBmdW5jdGlvbiAoKSB7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGxpc3RlbmVyID0gc2NvcGUuJHdhdGNoKCdtb2RlbCcsIGZ1bmN0aW9uIChuZXd2YWwsIG9sZHZhbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzY29wZS4kZW1pdChcInNldE5lZWRlZEZhbHNlXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIHNjb3BlLmVkaXQgPSAhc2NvcGUuZWRpdDtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoc2NvcGUuaXNBcnJheSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzY29wZS52YXIgPSBzY29wZS5hbGx2YXIuam9pbignLCcpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAkdGltZW91dChmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50WzBdLmZpcnN0Q2hpbGQuZmlyc3RDaGlsZC5mb2N1cygpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9LCAxMCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAkdGltZW91dChmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50WzBdLmZpcnN0Q2hpbGQubGFzdENoaWxkLmZvY3VzKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sIDEwKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgc2NvcGUudXBkYXRlTW9kZWwgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGlzdGVuZXIoKTtcclxuICAgICAgICAgICAgICAgICAgICBzY29wZS5lZGl0ID0gIXNjb3BlLmVkaXQ7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHNjb3BlLmlzQXJyYXkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGFyciA9IG5ldyBTZXQoc2NvcGUudmFyLnNwbGl0KCcsJykpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2NvcGUuYWxsdmFyID0gW107XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGFuZ3VsYXIuZm9yRWFjaChhcnIsIGZ1bmN0aW9uICh2YWwsIGtleSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsLnRyaW0oKS5sZW5ndGggPyBzY29wZS5hbGx2YXIucHVzaCh2YWwudHJpbSgpKSA6IG51bGw7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYoc2NvcGUuZGlydHlBcnJheS5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3IobGV0IGkgPSAwOyBpPCBzY29wZS5kaXJ0eUFycmF5Lmxlbmd0aDsgaSsrKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKHNjb3BlLmRpcnR5QXJyYXlbaV0gIT09IHNjb3BlLmFsbHZhcltpXSl7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlLmFsbHZhciA9IHNjb3BlLnByZXZWYXI7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFsZXJ0KFwiIFlvdSBhcmUgY3VycmVudGx5IGV4ZWN1dGluZyBhIGxvb3AuIEFkZGluZyBlbGVtZW50cyBhcmUganVzdCBhbGxvd2VkIHRvIHRoZSBlbmQgb2YgY29sbGVjdGlvbi4gIFwiKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgJHBhcnNlKGF0dHJzLm1vZGVsKS5hc3NpZ24oc2NvcGUuJHBhcmVudCwgc2NvcGUuYWxsdmFyKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYoc2NvcGUucHJldlZhci5sZW5ndGggIT09IDAgJiYgc2NvcGUucHJldlZhci5sZW5ndGggPCBzY29wZS5hbGx2YXIubGVuZ3RoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzY29wZS4kZW1pdChcImJsb2NrQWRkXCIsIHtcImRhdGFcIjogc2NvcGUuYWxsdmFyLnNsaWNlKHNjb3BlLnByZXZWYXIubGVuZ3RoLCBzY29wZS5hbGx2YXIubGVuZ3RoKSwgXCJpZFwiOiBzY29wZS5wYXJlbnRJZH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vY29uc29sZS5sb2coc2NvcGUuYWxsdmFyLmxlbmd0aCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzY29wZS5wcmV2VmFyID0gc2NvcGUuYWxsdmFyO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBpZiAoc2NvcGUuaWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2NvcGUuJGVtaXQoXCJzZXROZWVkZWRGYWxzZVwiKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH0pO1xyXG5cclxufSIsIid1c2Ugc3RyaWN0JztcclxuXHJcbnZhciBjbG9uZSA9IHJlcXVpcmUoJ2Nsb25lJyk7XHJcblxyXG5BcnJheS5wcm90b3R5cGUuaW5zZXJ0ID0gZnVuY3Rpb24gKGluZGV4KSB7XHJcbiAgICBpbmRleCA9IE1hdGgubWluKGluZGV4LCB0aGlzLmxlbmd0aCk7XHJcbiAgICBhcmd1bWVudHMubGVuZ3RoID4gMVxyXG4gICAgJiYgdGhpcy5zcGxpY2UuYXBwbHkodGhpcywgW2luZGV4LCAwXS5jb25jYXQoW10ucG9wLmNhbGwoYXJndW1lbnRzKSkpXHJcbiAgICAmJiB0aGlzLmluc2VydC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xyXG4gICAgcmV0dXJuIHRoaXM7XHJcbn07XHJcblxyXG5jbGFzcyBJbnRlcnByZXRlciB7XHJcblxyXG4gICAgY29uc3RydWN0b3Ioc3RyYXRlZ2llcykge1xyXG4gICAgICAgIHRoaXMuZXhlY3V0aW9uU3RhY2sgPSBbXTtcclxuICAgICAgICB0aGlzLmhpc3RvcnlCYWNrd2FyZCA9IFtdO1xyXG4gICAgICAgIHRoaXMuc3RyYXRlZ2llcyA9IHN0cmF0ZWdpZXM7XHJcbiAgICB9XHJcblxyXG4gICAgaW5pdChjdXJyZW50U3RyYXRlZ3kpIHtcclxuICAgICAgICBsZXQgY3VycmVudEV4ZWN1dGlvbkNvbnRleHQgPSBuZXcgRnVuY3Rpb25FeGVjQ29udGV4dChjdXJyZW50U3RyYXRlZ3kpO1xyXG4gICAgICAgIHRoaXMuZXhlY3V0aW9uU3RhY2sucHVzaChjdXJyZW50RXhlY3V0aW9uQ29udGV4dCk7XHJcblxyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIGN1cnJlbnRTdGF0ZW1lbnQ6IGN1cnJlbnRFeGVjdXRpb25Db250ZXh0LnBjLFxyXG4gICAgICAgICAgICBjdXJyZW50U3RyYXRlZ3k6IGN1cnJlbnRFeGVjdXRpb25Db250ZXh0LnN0cmF0ZWd5LFxyXG4gICAgICAgICAgICBleGVjdXRpb25TdGFjazogdGhpcy5leGVjdXRpb25TdGFjayxcclxuICAgICAgICAgICAgYWN0aXZlTGluZXM6IGN1cnJlbnRFeGVjdXRpb25Db250ZXh0LmFjdGl2ZUxpbmVzLFxyXG4gICAgICAgICAgICAvL3NlbGVjdGlvbk5lZWRlZDogY3VycmVudEV4ZWN1dGlvbkNvbnRleHQucGMudHlwZSA9PT0gXCJpZlwiLFxyXG4gICAgICAgICAgICAvL3NldE5lZWRlZDogY3VycmVudEV4ZWN1dGlvbkNvbnRleHQucGMudHlwZSA9PT0gJ3NldCcsXHJcbiAgICAgICAgICAgIHZhcmlhYmxlczogY3VycmVudEV4ZWN1dGlvbkNvbnRleHQudmFyaWFibGVzLFxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXNldCgpIHtcclxuICAgICAgICB0aGlzLmV4ZWN1dGlvblN0YWNrID0gW107XHJcbiAgICAgICAgdGhpcy5oaXN0b3J5QmFja3dhcmQgPSBbXTtcclxuICAgIH1cclxuXHJcbiAgICBmaW5kU3RyYXRlZ3koc3RyYXRlZ3luYW1lKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuc3RyYXRlZ2llcy5maW5kKGZ1bmN0aW9uIChzdHJhdGVneSkge1xyXG4gICAgICAgICAgICByZXR1cm4gc3RyYXRlZ3kubmFtZSA9PT0gc3RyYXRlZ3luYW1lO1xyXG4gICAgICAgIH0pXHJcbiAgICB9XHJcblxyXG4gICAgYWRkTG9vcEJsb2NrcyhpZCwgYXJyKSB7XHJcbiAgICAgICAgbGV0IGN1cnJlbnRFeGVjdXRpb25Db250ZXh0ID0gdGhpcy5leGVjdXRpb25TdGFja1t0aGlzLmV4ZWN1dGlvblN0YWNrLmxlbmd0aCAtIDFdO1xyXG4gICAgICAgIGlmIChjdXJyZW50RXhlY3V0aW9uQ29udGV4dC5wYyAmJiBjdXJyZW50RXhlY3V0aW9uQ29udGV4dC5wYy50eXBlID09PSAnZm9yZWFjaCcpIHJldHVybjsvLyBpZiBmb3JlYWNoIGlzIHN0aWxsIGluIHRoZSBibG9ja3MsIHRoZW4gaXQgc2hvdWxkIHdvcmsgY29ycmVjdGx5XHJcbiAgICAgICAgbGV0IGxvb3BTdGF0ZW1lbnQgPSB0aGlzLmZpbmRTdGF0ZW1lbnRCeUlkKGlkKTtcclxuICAgICAgICBpZiAobG9vcFN0YXRlbWVudCAhPT0gbnVsbCkge1xyXG4gICAgICAgICAgICBsZXQgdGVtcEJsb2NrID0gW107XHJcbiAgICAgICAgICAgIGxldCBsaXN0VmFyaWFibGUgPSBsb29wU3RhdGVtZW50Lmxpc3QucmVwbGFjZSgvJy9nLCAnJyk7XHJcbiAgICAgICAgICAgIGxldCBjb3VudGVyID0gMDtcclxuICAgICAgICAgICAgY3VycmVudEV4ZWN1dGlvbkNvbnRleHQudmFyaWFibGVzLmZvckVhY2goZnVuY3Rpb24gKHZhbCwgaW5kZXgsIGFycikge1xyXG4gICAgICAgICAgICAgICAgaWYgKHZhbC5uYW1lID09PSBsaXN0VmFyaWFibGUpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb3VudGVyID0gdmFsLnZhbC5sZW5ndGggLSAxO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgZm9yIChsZXQgbnVtID0gMDsgbnVtIDwgYXJyLmxlbmd0aDsgbnVtKyspIHtcclxuICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSBsb29wU3RhdGVtZW50LnN0YXRlbWVudHMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcclxuICAgICAgICAgICAgICAgICAgICB0ZW1wQmxvY2sudW5zaGlmdChjbG9uZShsb29wU3RhdGVtZW50LnN0YXRlbWVudHNbaV0pKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIC8vIHB1dCB0aGUgZm9yZWFjaCBzdGF0ZW1lbnQgbGVuZ3RoIG1pbnVzIDEgdGltZXNcclxuICAgICAgICAgICAgICAgIGlmIChudW0gPD0gYXJyLmxlbmd0aCAtIDEpIHtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgdGVtcFN0YXRlbWVudCA9IGNsb25lKGxvb3BTdGF0ZW1lbnQpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRlbXBTdGF0ZW1lbnQudHlwZSA9IFwibG9vcFwiO1xyXG4gICAgICAgICAgICAgICAgICAgIHRlbXBTdGF0ZW1lbnQuY291bnRlciA9IGNvdW50ZXItLTtcclxuICAgICAgICAgICAgICAgICAgICB0ZW1wQmxvY2sudW5zaGlmdChjbG9uZSh0ZW1wU3RhdGVtZW50KSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgbGV0IGFsbExvb3BTdGF0ZW1lbnRzID0gY3VycmVudEV4ZWN1dGlvbkNvbnRleHQuYmxvY2tzLmZpbHRlcihmdW5jdGlvbiAodmFsKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdmFsLmlkLmluY2x1ZGVzKGlkKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIGxldCBvYmpJZCA9IGFsbExvb3BTdGF0ZW1lbnRzLmxlbmd0aCA/IGFsbExvb3BTdGF0ZW1lbnRzLnBvcCgpLmlkIDogaWQ7XHJcbiAgICAgICAgICAgIC8vIHJldmVyc2UgdG8gZmluZCB0aGUgbGFzdCBpbmRleCBvZiBzdGF0ZW1lbnRcclxuICAgICAgICAgICAgbGV0IGluZGV4ID0gY3VycmVudEV4ZWN1dGlvbkNvbnRleHQuYmxvY2tzLnNsaWNlKCkucmV2ZXJzZSgpLmZpbmRJbmRleChmdW5jdGlvbiAodmFsdWUsIGluZGV4LCBhcnJheSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHZhbHVlLmlkID09PSBvYmpJZDtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIGluZGV4ID0gaW5kZXggPj0gMCA/IGN1cnJlbnRFeGVjdXRpb25Db250ZXh0LmJsb2Nrcy5sZW5ndGggLSBpbmRleCA6IDA7XHJcbiAgICAgICAgICAgIGN1cnJlbnRFeGVjdXRpb25Db250ZXh0LmJsb2Nrcy5pbnNlcnQoaW5kZXgsIHRlbXBCbG9jayk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGZpbmRTdGF0ZW1lbnRCeUlkKGlkKSB7XHJcbiAgICAgICAgbGV0IGN1cnJlbnRFeGVjdXRpb25Db250ZXh0ID0gdGhpcy5leGVjdXRpb25TdGFja1t0aGlzLmV4ZWN1dGlvblN0YWNrLmxlbmd0aCAtIDFdO1xyXG4gICAgICAgIC8vIGxvY2F0ZSB0aGUgc3RhdGVtZW50IGJ5IHBhcnNpbmcgdGhlIGlkIHN0cmluZyBhbmQgZmluZCB0aGUgaW5kZXggb2YgdGhlIHN0YXRlbWVudFxyXG4gICAgICAgIGxldCBzcGxpdGVkSW5kZXggPSBpZC5zcGxpdCgnLScpLnNwbGljZSgxKTtcclxuICAgICAgICBpZiAoc3BsaXRlZEluZGV4Lmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgbGV0IGV4cHJlc3Npb24gPSBcImN1cnJlbnRFeGVjdXRpb25Db250ZXh0LnN0cmF0ZWd5XCI7IC8vIGZpcnN0IGdlbmVyYXRlIHN0cmluZyBmb3IgbG9jYXRpbmcgdGhlIHN0YXRlbWVudCBieSB0aGUgaW5kZXhlc1xyXG4gICAgICAgICAgICBzcGxpdGVkSW5kZXguZm9yRWFjaChmdW5jdGlvbiAodmFsdWUsIGluZGV4LCBhcnJheSkge1xyXG4gICAgICAgICAgICAgICAgZXhwcmVzc2lvbiArPSBcIi5zdGF0ZW1lbnRzW1wiICsgdmFsdWUgKyBcIl1cIjsgLy8gZ3JhZHVhbGx5IGFwcGVuZCBzdGF0ZW1lbnRzIHN0cmluZyB3aXRoIGl0cyBpbmRleFxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgLy8gZXhhbXBsZSA9PiBjdXJyZW50RXhlY3V0aW9uQ29udGV4dC5zdHJhdGVneS5zdGF0ZW1lbnRzWzFdLnN0YXRlbWVudHNbMl0gYW5kIHNvIG9uXHJcbiAgICAgICAgICAgIC8vIGV2YWx1YXRlIHRoZSBzdHJpbmcgdG8gcmV0dXJuIHRoZSBvYmplY3RcclxuICAgICAgICAgICAgcmV0dXJuIGV2YWwoZXhwcmVzc2lvbik7IC8vIGV2YWwgaXMgYSBqYXZhc2NyaXB0IGNvbW1hbmQgdG8gZXhlY3V0ZSBhIHN0cmluZ1xyXG4gICAgICAgIH1cclxuICAgICAgICAvLyBpZiBpdCBjb3VsZCBub3QgZmluZCB0aGUgc3RhdGVtZW50LCByZXR1cm4gbnVsbFxyXG4gICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgfVxyXG5cclxuICAgIGV4ZWN1dGUoYnJhbmNoVGFrZW4pIHtcclxuICAgICAgICBpZiAodGhpcy5leGVjdXRpb25TdGFja1t0aGlzLmV4ZWN1dGlvblN0YWNrLmxlbmd0aCAtIDFdICYmXHJcbiAgICAgICAgICAgIHRoaXMuZXhlY3V0aW9uU3RhY2tbdGhpcy5leGVjdXRpb25TdGFjay5sZW5ndGggLSAxXS5wYy50eXBlID09PSAnZW5kJykgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgaWYgKHRoaXMuZXhlY3V0aW9uU3RhY2subGVuZ3RoKSB7XHJcbiAgICAgICAgICAgIHRoaXMuaGlzdG9yeUJhY2t3YXJkLnB1c2goY2xvbmUodGhpcy5leGVjdXRpb25TdGFjaykpOyAvLyB0YWtlIGEgc25hcHNob3QgZnJvbSBvdXIgY3VycmVudCBleGVjdXRpb25TdGFjayB0byBvdXIgaGlzdG9yeVxyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgIH1cclxuICAgICAgICBsZXQgY3VycmVudEV4ZWN1dGlvbkNvbnRleHQgPSB0aGlzLmV4ZWN1dGlvblN0YWNrLnBvcCgpO1xyXG4gICAgICAgIGxldCBuZXh0VHlwZSA9IGN1cnJlbnRFeGVjdXRpb25Db250ZXh0LmdldE5leHRTdGF0ZW1lbnQoY3VycmVudEV4ZWN1dGlvbkNvbnRleHQucGMsIGJyYW5jaFRha2VuKTtcclxuICAgICAgICBpZiAobmV4dFR5cGUgPT09ICdub3RoaW5nJyB8fCBuZXh0VHlwZSA9PT0gJ3JldHVybicpIHJldHVybiB0aGlzLmV4ZWN1dGUoYnJhbmNoVGFrZW4pO1xyXG4gICAgICAgIGVsc2UgaWYgKG5leHRUeXBlID09PSBudWxsKSByZXR1cm4gbnVsbDtcclxuICAgICAgICBlbHNlIGlmIChuZXh0VHlwZSA9PT0gJ25ldycpIHtcclxuICAgICAgICAgICAgdGhpcy5leGVjdXRpb25TdGFjay5wdXNoKGN1cnJlbnRFeGVjdXRpb25Db250ZXh0KTtcclxuICAgICAgICAgICAgbGV0IG15QXJncyA9IG51bGw7XHJcbiAgICAgICAgICAgIGlmIChjdXJyZW50RXhlY3V0aW9uQ29udGV4dC5wYy50eXBlID09PSAnZG8nKSB7XHJcbiAgICAgICAgICAgICAgICBteUFyZ3MgPSBjdXJyZW50RXhlY3V0aW9uQ29udGV4dC5wYy5jYWxsLmFyZ3VtZW50cy5tYXAoZnVuY3Rpb24gKHZhbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB2YWwucmVwbGFjZSgvJy9nLCAnJyk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIG15QXJncyA9IGN1cnJlbnRFeGVjdXRpb25Db250ZXh0LnBjLnF1ZXJ5LmFyZ3VtZW50cy5tYXAoZnVuY3Rpb24gKHZhbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB2YWwucmVwbGFjZSgvJy9nLCAnJyk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBsZXQgYXJncyA9IFtdO1xyXG4gICAgICAgICAgICBteUFyZ3MuZm9yRWFjaChmdW5jdGlvbiAodmFsdWUsIGluZGV4LCBhcnJheSkge1xyXG4gICAgICAgICAgICAgICAgLy9jb25zb2xlLmxvZyh2YWx1ZSk7XHJcbiAgICAgICAgICAgICAgICBsZXQgbXl2YXIgPSBjdXJyZW50RXhlY3V0aW9uQ29udGV4dC52YXJpYWJsZXMuZmluZChmdW5jdGlvbiAodmFsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy9jb25zb2xlLmxvZyh2YWwpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB2YWwubmFtZSA9PT0gdmFsdWU7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIGFyZ3MucHVzaChteXZhcik7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIkFSR1NcIiwgYXJncyk7XHJcblxyXG4gICAgICAgICAgICBsZXQgc3RyYXRlZ3kgPSB0aGlzLmZpbmRTdHJhdGVneShjdXJyZW50RXhlY3V0aW9uQ29udGV4dC5wYy50eXBlID09PSAnZG8nID8gY3VycmVudEV4ZWN1dGlvbkNvbnRleHQucGMuY2FsbC5uYW1lIDogY3VycmVudEV4ZWN1dGlvbkNvbnRleHQucGMucXVlcnkubmFtZSk7XHJcbiAgICAgICAgICAgIGN1cnJlbnRFeGVjdXRpb25Db250ZXh0ID0gbmV3IEZ1bmN0aW9uRXhlY0NvbnRleHQoc3RyYXRlZ3kpO1xyXG4gICAgICAgICAgICBjdXJyZW50RXhlY3V0aW9uQ29udGV4dC52YXJpYWJsZXMuZm9yRWFjaChmdW5jdGlvbiAodmFsdWUsIGluZGV4LCBhcnJheSkge1xyXG4gICAgICAgICAgICAgICAgaWYgKHZhbHVlLnR5cGUgPT09ICdwYXJhbWV0ZXInKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFsdWUudmFsID0gYXJnc1tpbmRleF0udmFsO1xyXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlLnZpc2libGUgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBjdXJyZW50RXhlY3V0aW9uQ29udGV4dCA9IG5leHRUeXBlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5leGVjdXRpb25TdGFjay5wdXNoKGN1cnJlbnRFeGVjdXRpb25Db250ZXh0KTtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICBjdXJyZW50U3RhdGVtZW50OiBjdXJyZW50RXhlY3V0aW9uQ29udGV4dC5wYyxcclxuICAgICAgICAgICAgY3VycmVudFN0cmF0ZWd5OiBjdXJyZW50RXhlY3V0aW9uQ29udGV4dC5zdHJhdGVneSxcclxuICAgICAgICAgICAgZXhlY3V0aW9uU3RhY2s6IHRoaXMuZXhlY3V0aW9uU3RhY2ssXHJcbiAgICAgICAgICAgIGFjdGl2ZUxpbmVzOiBjdXJyZW50RXhlY3V0aW9uQ29udGV4dC5hY3RpdmVMaW5lcyxcclxuICAgICAgICAgICAgc2VsZWN0aW9uTmVlZGVkOiAoY3VycmVudEV4ZWN1dGlvbkNvbnRleHQucGMudHlwZSA9PT0gXCJpZlwiIHx8IGN1cnJlbnRFeGVjdXRpb25Db250ZXh0LnBjLnR5cGUgPT09IFwidW50aWxcIiksXHJcbiAgICAgICAgICAgIHNldE5lZWRlZDogY3VycmVudEV4ZWN1dGlvbkNvbnRleHQucGMudHlwZSA9PT0gJ3NldCcsXHJcbiAgICAgICAgICAgIHZhcmlhYmxlczogY3VycmVudEV4ZWN1dGlvbkNvbnRleHQudmFyaWFibGVzLFxyXG4gICAgICAgIH07XHJcblxyXG4gICAgfVxyXG5cclxuICAgIGdvQmFjaygpIHtcclxuICAgICAgICBsZXQgc3RhY2sgPSB0aGlzLmhpc3RvcnlCYWNrd2FyZC5wb3AoKTtcclxuICAgICAgICBpZiAoc3RhY2sgPT09IHVuZGVmaW5lZCkgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgdGhpcy5leGVjdXRpb25TdGFjayA9IHN0YWNrO1xyXG4gICAgICAgIGxldCBjdXJyZW50RXhlY3V0aW9uQ29udGV4dCA9IHRoaXMuZXhlY3V0aW9uU3RhY2tbdGhpcy5leGVjdXRpb25TdGFjay5sZW5ndGggLSAxXTtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICBjdXJyZW50U3RhdGVtZW50OiBjdXJyZW50RXhlY3V0aW9uQ29udGV4dC5wYyxcclxuICAgICAgICAgICAgY3VycmVudFN0cmF0ZWd5OiBjdXJyZW50RXhlY3V0aW9uQ29udGV4dC5zdHJhdGVneSxcclxuICAgICAgICAgICAgZXhlY3V0aW9uU3RhY2s6IHRoaXMuZXhlY3V0aW9uU3RhY2ssXHJcbiAgICAgICAgICAgIGFjdGl2ZUxpbmVzOiBjdXJyZW50RXhlY3V0aW9uQ29udGV4dC5hY3RpdmVMaW5lcyxcclxuICAgICAgICAgICAgc2VsZWN0aW9uTmVlZGVkOiAoY3VycmVudEV4ZWN1dGlvbkNvbnRleHQucGMudHlwZSA9PT0gXCJpZlwiIHx8IGN1cnJlbnRFeGVjdXRpb25Db250ZXh0LnBjLnR5cGUgPT09IFwidW50aWxcIiksXHJcbiAgICAgICAgICAgIHNldE5lZWRlZDogY3VycmVudEV4ZWN1dGlvbkNvbnRleHQucGMudHlwZSA9PT0gJ3NldCcsXHJcbiAgICAgICAgICAgIHZhcmlhYmxlczogY3VycmVudEV4ZWN1dGlvbkNvbnRleHQudmFyaWFibGVzLFxyXG4gICAgICAgIH07XHJcbiAgICB9XHJcbn1cclxuXHJcbnZhciBnbG9iYWxDb3VudGVyID0ge2NvdW50OiAwfTtcclxuXHJcbmNsYXNzIEZ1bmN0aW9uRXhlY0NvbnRleHQge1xyXG4gICAgY29uc3RydWN0b3IoY3VycmVudFN0cmF0ZWd5KSB7XHJcbiAgICAgICAgdGhpcy5zdHJhdGVneSA9IGN1cnJlbnRTdHJhdGVneTtcclxuICAgICAgICB0aGlzLnBjID0gdGhpcy5zdHJhdGVneTtcclxuICAgICAgICB0aGlzLmFjdGl2ZUxpbmVzID0gW107XHJcbiAgICAgICAgdGhpcy5hY3RpdmVMaW5lcy5wdXNoKHRoaXMuc3RyYXRlZ3kuaWQpO1xyXG4gICAgICAgIHRoaXMuYmxvY2tzID0gW107XHJcbiAgICAgICAgdGhpcy5ibG9ja3MgPSBjbG9uZSh0aGlzLnN0cmF0ZWd5LnN0YXRlbWVudHMpO1xyXG4gICAgICAgIHRoaXMudmFyaWFibGVzID0gW107XHJcbiAgICAgICAgaWYgKHRoaXMuc3RyYXRlZ3kucGFyYW1ldGVycyAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgIHRoaXMuc3RyYXRlZ3kucGFyYW1ldGVycy5mb3JFYWNoKGZ1bmN0aW9uIChjdXJyZW50VmFsLCBpbmRleCwgYXJyKSB7XHJcbiAgICAgICAgICAgICAgICBjdXJyZW50VmFsID0gY3VycmVudFZhbC5yZXBsYWNlKC8nL2csICcnKTtcclxuICAgICAgICAgICAgICAgIHRoaXMudmFyaWFibGVzLnB1c2goe1xyXG4gICAgICAgICAgICAgICAgICAgIFwiaWRcIjogZ2xvYmFsQ291bnRlci5jb3VudCsrLFxyXG4gICAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBjdXJyZW50VmFsLFxyXG4gICAgICAgICAgICAgICAgICAgIFwidmFsXCI6IG51bGwsXHJcbiAgICAgICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwicGFyYW1ldGVyXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgXCJ2aXNpYmxlXCI6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH0sIHRoaXMpO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLmV4dHJhY3RWYXJpYWJsZXModGhpcy5zdHJhdGVneS5zdGF0ZW1lbnRzLCBnbG9iYWxDb3VudGVyLCB0aGlzKTtcclxuICAgICAgICB2YXIgdW5pcSA9IFsuLi5uZXcgU2V0KHRoaXMudmFyaWFibGVzKV07XHJcbiAgICAgICAgdW5pcS5mb3JFYWNoKGZ1bmN0aW9uICh2YXJpYWJsZSkge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcInZhcjogICBcIiArIHZhcmlhYmxlLm5hbWUpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHRoaXMuY2FsbFN0YWNrID0gW107XHJcbiAgICB9XHJcblxyXG5cclxuICAgIGV4dHJhY3RWYXJpYWJsZXMoc3RhdGVtZW50cywgY291bnRlciwgYXJnVGhpcykge1xyXG4gICAgICAgIHN0YXRlbWVudHMuZm9yRWFjaChmdW5jdGlvbiAoY3VycmVudFZhbCwgaW5kZXgsIGFycikge1xyXG4gICAgICAgICAgICBpZiAoY3VycmVudFZhbC5pZGVudGlmaWVyKSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgaWRlbnRpZmllciA9IGN1cnJlbnRWYWwuaWRlbnRpZmllci5yZXBsYWNlKC8nL2csICcnKTtcclxuICAgICAgICAgICAgICAgIHZhciBmb3VuZCA9IGFyZ1RoaXMudmFyaWFibGVzLnNvbWUoZnVuY3Rpb24gKGVsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGVsLm5hbWUgPT09IGlkZW50aWZpZXI7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIGlmICghZm91bmQpIHtcclxuICAgICAgICAgICAgICAgICAgICBhcmdUaGlzLnZhcmlhYmxlcy5wdXNoKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgXCJpZFwiOiBjb3VudGVyLmNvdW50KyssXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBpZGVudGlmaWVyLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBcInZhbFwiOiBudWxsLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJpZGVudGlmaWVyXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIFwidmlzaWJsZVwiOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoY3VycmVudFZhbC50eXBlID09PSAnZG8nKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoY3VycmVudFZhbC5jYWxsLmFyZ3VtZW50cykge1xyXG4gICAgICAgICAgICAgICAgICAgIGN1cnJlbnRWYWwuY2FsbC5hcmd1bWVudHMuZm9yRWFjaChmdW5jdGlvbiAodmFsLCBpbmQsIGFycmF5KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbCA9IHZhbC5yZXBsYWNlKC8nL2csICcnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGZvdW5kID0gYXJnVGhpcy52YXJpYWJsZXMuc29tZShmdW5jdGlvbiAoZWwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBlbC5uYW1lID09PSB2YWw7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWZvdW5kKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhcmdUaGlzLnZhcmlhYmxlcy5wdXNoKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcImlkXCI6IGNvdW50ZXIuY291bnQrKyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIm5hbWVcIjogdmFsLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwidmFsXCI6IG51bGwsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiYXJndW1lbnRcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcInZpc2libGVcIjogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH0sIGFyZ1RoaXMpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChjdXJyZW50VmFsLnR5cGUgPT09ICdyZXR1cm4nKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoY3VycmVudFZhbC5xdWVyeS5hcmd1bWVudHMpIHtcclxuICAgICAgICAgICAgICAgICAgICBjdXJyZW50VmFsLnF1ZXJ5LmFyZ3VtZW50cy5mb3JFYWNoKGZ1bmN0aW9uICh2YWwsIGluZCwgYXJyYXkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsID0gdmFsLnJlcGxhY2UoLycvZywgJycpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgZm91bmQgPSBhcmdUaGlzLnZhcmlhYmxlcy5zb21lKGZ1bmN0aW9uIChlbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGVsLm5hbWUgPT09IHZhbDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghZm91bmQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFyZ1RoaXMudmFyaWFibGVzLnB1c2goe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiaWRcIjogY291bnRlci5jb3VudCsrLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiB2YWwsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJ2YWxcIjogbnVsbCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJhcmd1bWVudFwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwidmlzaWJsZVwiOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfSwgYXJnVGhpcyk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKGN1cnJlbnRWYWwudHlwZSA9PT0gXCJmb3JlYWNoXCIpIHtcclxuICAgICAgICAgICAgICAgIGFyZ1RoaXMudmFyaWFibGVzLmZvckVhY2goZnVuY3Rpb24gKHZhbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICh2YWwubmFtZSA9PT0gKGN1cnJlbnRWYWwubGlzdC5yZXBsYWNlKC8nL2csICcnKSkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsLnZhbCA9IFtdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWwucGFyZW50SWQgPSBjdXJyZW50VmFsLmlkO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWwuZGlydHlBcnJheSA9IFtdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWwucHJldlZhciA9IFtdO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChjdXJyZW50VmFsLnN0YXRlbWVudHMpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuZXh0cmFjdFZhcmlhYmxlcyhjdXJyZW50VmFsLnN0YXRlbWVudHMsIGNvdW50ZXIsIGFyZ1RoaXMpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSwgYXJnVGhpcyk7XHJcbiAgICB9XHJcblxyXG4gICAgZ2V0TmV4dFN0YXRlbWVudChjdXJyZW50U3RhdGVtZW50LCBicmFuY2hUYWtlbikge1xyXG4gICAgICAgIHRoaXMuYWN0aXZlTGluZXMgPSBbXTtcclxuICAgICAgICBpZiAodGhpcy5jYWxsU3RhY2subGVuZ3RoKSB7XHJcbiAgICAgICAgICAgIHRoaXMucGMgPSB0aGlzLmNhbGxTdGFjay5wb3AoKTtcclxuICAgICAgICAgICAgaWYgKHRoaXMucGMudHlwZSA9PT0gJ3JldHVybicpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMucGMudHlwZSA9ICdlbmQnO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5wYyA9IHRoaXMuYmxvY2tzLnNoaWZ0KCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdGhpcy5hY3RpdmVMaW5lcy5wdXNoKHRoaXMucGMuaWQpO1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcztcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBpZiAoY3VycmVudFN0YXRlbWVudC50eXBlID09PSBcImlmXCIgJiYgYnJhbmNoVGFrZW4pIHtcclxuICAgICAgICAgICAgICAgIGlmIChjdXJyZW50U3RhdGVtZW50LnN0YXRlbWVudHMgIT09IHVuZGVmaW5lZCAmJiBjdXJyZW50U3RhdGVtZW50LnN0YXRlbWVudHMubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSBjdXJyZW50U3RhdGVtZW50LnN0YXRlbWVudHMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5ibG9ja3MudW5zaGlmdChjbG9uZShjdXJyZW50U3RhdGVtZW50LnN0YXRlbWVudHNbaV0pKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoY3VycmVudFN0YXRlbWVudC50eXBlID09PSBcInVudGlsXCIgJiYgYnJhbmNoVGFrZW4pIHtcclxuICAgICAgICAgICAgICAgIGlmIChjdXJyZW50U3RhdGVtZW50LnN0YXRlbWVudHMgIT09IHVuZGVmaW5lZCAmJiBjdXJyZW50U3RhdGVtZW50LnN0YXRlbWVudHMubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYmxvY2tzLnVuc2hpZnQoY3VycmVudFN0YXRlbWVudCk7XHJcbiAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IGN1cnJlbnRTdGF0ZW1lbnQuc3RhdGVtZW50cy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmJsb2Nrcy51bnNoaWZ0KGNsb25lKGN1cnJlbnRTdGF0ZW1lbnQuc3RhdGVtZW50c1tpXSkpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSBlbHNlIGlmIChjdXJyZW50U3RhdGVtZW50LnR5cGUgPT09IFwicmV0dXJuXCIpIHtcclxuICAgICAgICAgICAgICAgIGlmIChjdXJyZW50U3RhdGVtZW50LnF1ZXJ5LnR5cGUgPT09IFwiY2FsbFwiKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jYWxsU3RhY2sucHVzaCh0aGlzLnBjKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmFjdGl2ZUxpbmVzLnB1c2godGhpcy5wYy5pZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuICduZXcnO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChjdXJyZW50U3RhdGVtZW50LnF1ZXJ5LnR5cGUgPT09ICdub3RoaW5nJykge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYWN0aXZlTGluZXMucHVzaCh0aGlzLnBjLmlkKTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gJ25vdGhpbmcnO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmFjdGl2ZUxpbmVzLnB1c2godGhpcy5wYy5pZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuICdyZXR1cm4nO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9IGVsc2UgaWYgKGN1cnJlbnRTdGF0ZW1lbnQudHlwZSA9PT0gXCJkb1wiKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoY3VycmVudFN0YXRlbWVudC5jYWxsICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmNhbGxTdGFjay5wdXNoKHRoaXMucGMpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAnbmV3JztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSBlbHNlIGlmIChjdXJyZW50U3RhdGVtZW50LnR5cGUgPT09IFwiZm9yZWFjaFwiKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoY3VycmVudFN0YXRlbWVudC5zdGF0ZW1lbnRzICE9PSB1bmRlZmluZWQgJiYgY3VycmVudFN0YXRlbWVudC5zdGF0ZW1lbnRzLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgbG9vcENvdW50VmFyID0gdGhpcy52YXJpYWJsZXMuZmluZChmdW5jdGlvbiAodmFsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB2YWwubmFtZSA9PT0gY3VycmVudFN0YXRlbWVudC5saXN0LnJlcGxhY2UoLycvZywgJycpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIGZvciAobGV0IG51bSA9IDAsIGNvdW50ID0gbG9vcENvdW50VmFyLnZhbC5sZW5ndGg7IG51bSA8IGxvb3BDb3VudFZhci52YWwubGVuZ3RoOyBudW0rKywgY291bnQtLSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gY3VycmVudFN0YXRlbWVudC5zdGF0ZW1lbnRzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmJsb2Nrcy51bnNoaWZ0KGNsb25lKGN1cnJlbnRTdGF0ZW1lbnQuc3RhdGVtZW50c1tpXSkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHB1dCB0aGUgZm9yZWFjaCBzdGF0ZW1lbnQgbGVuZ3RoIG1pbnVzIDEgdGltZXNcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG51bSA8IGxvb3BDb3VudFZhci52YWwubGVuZ3RoIC0gMSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHRlbXBTdGF0ZW1lbnQgPSBjbG9uZShjdXJyZW50U3RhdGVtZW50KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRlbXBTdGF0ZW1lbnQudHlwZSA9IFwibG9vcFwiO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGVtcFN0YXRlbWVudC5jb3VudGVyID0gY291bnQgLSAxO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5ibG9ja3MudW5zaGlmdCh0ZW1wU3RhdGVtZW50KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIC8vIGlmIChjdXJyZW50U3RhdGVtZW50LnN0YXRlbWVudHMgIT09IHVuZGVmaW5lZCAmJiBjdXJyZW50U3RhdGVtZW50LnR5cGUgIT0gXCJsb29wXCIpXHJcbiAgICAgICAgICAgICAgICAvLyAgICAgdGhpcy5ibG9ja3MudW5zaGlmdChjbG9uZShjdXJyZW50U3RhdGVtZW50LnN0YXRlbWVudHNbMF0pKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKHRoaXMuYmxvY2tzLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuICdub3RoaW5nJztcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHRoaXMucGMgPSB0aGlzLmJsb2Nrcy5zaGlmdCgpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5hY3RpdmVMaW5lcy5wdXNoKHRoaXMucGMuaWQpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IHtcclxuICAgIEludGVycHJldGVyOiBJbnRlcnByZXRlclxyXG59O1xyXG4iLCIndXNlIHN0cmljdCdcblxuZXhwb3J0cy5ieXRlTGVuZ3RoID0gYnl0ZUxlbmd0aFxuZXhwb3J0cy50b0J5dGVBcnJheSA9IHRvQnl0ZUFycmF5XG5leHBvcnRzLmZyb21CeXRlQXJyYXkgPSBmcm9tQnl0ZUFycmF5XG5cbnZhciBsb29rdXAgPSBbXVxudmFyIHJldkxvb2t1cCA9IFtdXG52YXIgQXJyID0gdHlwZW9mIFVpbnQ4QXJyYXkgIT09ICd1bmRlZmluZWQnID8gVWludDhBcnJheSA6IEFycmF5XG5cbnZhciBjb2RlID0gJ0FCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXowMTIzNDU2Nzg5Ky8nXG5mb3IgKHZhciBpID0gMCwgbGVuID0gY29kZS5sZW5ndGg7IGkgPCBsZW47ICsraSkge1xuICBsb29rdXBbaV0gPSBjb2RlW2ldXG4gIHJldkxvb2t1cFtjb2RlLmNoYXJDb2RlQXQoaSldID0gaVxufVxuXG5yZXZMb29rdXBbJy0nLmNoYXJDb2RlQXQoMCldID0gNjJcbnJldkxvb2t1cFsnXycuY2hhckNvZGVBdCgwKV0gPSA2M1xuXG5mdW5jdGlvbiBwbGFjZUhvbGRlcnNDb3VudCAoYjY0KSB7XG4gIHZhciBsZW4gPSBiNjQubGVuZ3RoXG4gIGlmIChsZW4gJSA0ID4gMCkge1xuICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBzdHJpbmcuIExlbmd0aCBtdXN0IGJlIGEgbXVsdGlwbGUgb2YgNCcpXG4gIH1cblxuICAvLyB0aGUgbnVtYmVyIG9mIGVxdWFsIHNpZ25zIChwbGFjZSBob2xkZXJzKVxuICAvLyBpZiB0aGVyZSBhcmUgdHdvIHBsYWNlaG9sZGVycywgdGhhbiB0aGUgdHdvIGNoYXJhY3RlcnMgYmVmb3JlIGl0XG4gIC8vIHJlcHJlc2VudCBvbmUgYnl0ZVxuICAvLyBpZiB0aGVyZSBpcyBvbmx5IG9uZSwgdGhlbiB0aGUgdGhyZWUgY2hhcmFjdGVycyBiZWZvcmUgaXQgcmVwcmVzZW50IDIgYnl0ZXNcbiAgLy8gdGhpcyBpcyBqdXN0IGEgY2hlYXAgaGFjayB0byBub3QgZG8gaW5kZXhPZiB0d2ljZVxuICByZXR1cm4gYjY0W2xlbiAtIDJdID09PSAnPScgPyAyIDogYjY0W2xlbiAtIDFdID09PSAnPScgPyAxIDogMFxufVxuXG5mdW5jdGlvbiBieXRlTGVuZ3RoIChiNjQpIHtcbiAgLy8gYmFzZTY0IGlzIDQvMyArIHVwIHRvIHR3byBjaGFyYWN0ZXJzIG9mIHRoZSBvcmlnaW5hbCBkYXRhXG4gIHJldHVybiAoYjY0Lmxlbmd0aCAqIDMgLyA0KSAtIHBsYWNlSG9sZGVyc0NvdW50KGI2NClcbn1cblxuZnVuY3Rpb24gdG9CeXRlQXJyYXkgKGI2NCkge1xuICB2YXIgaSwgbCwgdG1wLCBwbGFjZUhvbGRlcnMsIGFyclxuICB2YXIgbGVuID0gYjY0Lmxlbmd0aFxuICBwbGFjZUhvbGRlcnMgPSBwbGFjZUhvbGRlcnNDb3VudChiNjQpXG5cbiAgYXJyID0gbmV3IEFycigobGVuICogMyAvIDQpIC0gcGxhY2VIb2xkZXJzKVxuXG4gIC8vIGlmIHRoZXJlIGFyZSBwbGFjZWhvbGRlcnMsIG9ubHkgZ2V0IHVwIHRvIHRoZSBsYXN0IGNvbXBsZXRlIDQgY2hhcnNcbiAgbCA9IHBsYWNlSG9sZGVycyA+IDAgPyBsZW4gLSA0IDogbGVuXG5cbiAgdmFyIEwgPSAwXG5cbiAgZm9yIChpID0gMDsgaSA8IGw7IGkgKz0gNCkge1xuICAgIHRtcCA9IChyZXZMb29rdXBbYjY0LmNoYXJDb2RlQXQoaSldIDw8IDE4KSB8IChyZXZMb29rdXBbYjY0LmNoYXJDb2RlQXQoaSArIDEpXSA8PCAxMikgfCAocmV2TG9va3VwW2I2NC5jaGFyQ29kZUF0KGkgKyAyKV0gPDwgNikgfCByZXZMb29rdXBbYjY0LmNoYXJDb2RlQXQoaSArIDMpXVxuICAgIGFycltMKytdID0gKHRtcCA+PiAxNikgJiAweEZGXG4gICAgYXJyW0wrK10gPSAodG1wID4+IDgpICYgMHhGRlxuICAgIGFycltMKytdID0gdG1wICYgMHhGRlxuICB9XG5cbiAgaWYgKHBsYWNlSG9sZGVycyA9PT0gMikge1xuICAgIHRtcCA9IChyZXZMb29rdXBbYjY0LmNoYXJDb2RlQXQoaSldIDw8IDIpIHwgKHJldkxvb2t1cFtiNjQuY2hhckNvZGVBdChpICsgMSldID4+IDQpXG4gICAgYXJyW0wrK10gPSB0bXAgJiAweEZGXG4gIH0gZWxzZSBpZiAocGxhY2VIb2xkZXJzID09PSAxKSB7XG4gICAgdG1wID0gKHJldkxvb2t1cFtiNjQuY2hhckNvZGVBdChpKV0gPDwgMTApIHwgKHJldkxvb2t1cFtiNjQuY2hhckNvZGVBdChpICsgMSldIDw8IDQpIHwgKHJldkxvb2t1cFtiNjQuY2hhckNvZGVBdChpICsgMildID4+IDIpXG4gICAgYXJyW0wrK10gPSAodG1wID4+IDgpICYgMHhGRlxuICAgIGFycltMKytdID0gdG1wICYgMHhGRlxuICB9XG5cbiAgcmV0dXJuIGFyclxufVxuXG5mdW5jdGlvbiB0cmlwbGV0VG9CYXNlNjQgKG51bSkge1xuICByZXR1cm4gbG9va3VwW251bSA+PiAxOCAmIDB4M0ZdICsgbG9va3VwW251bSA+PiAxMiAmIDB4M0ZdICsgbG9va3VwW251bSA+PiA2ICYgMHgzRl0gKyBsb29rdXBbbnVtICYgMHgzRl1cbn1cblxuZnVuY3Rpb24gZW5jb2RlQ2h1bmsgKHVpbnQ4LCBzdGFydCwgZW5kKSB7XG4gIHZhciB0bXBcbiAgdmFyIG91dHB1dCA9IFtdXG4gIGZvciAodmFyIGkgPSBzdGFydDsgaSA8IGVuZDsgaSArPSAzKSB7XG4gICAgdG1wID0gKHVpbnQ4W2ldIDw8IDE2KSArICh1aW50OFtpICsgMV0gPDwgOCkgKyAodWludDhbaSArIDJdKVxuICAgIG91dHB1dC5wdXNoKHRyaXBsZXRUb0Jhc2U2NCh0bXApKVxuICB9XG4gIHJldHVybiBvdXRwdXQuam9pbignJylcbn1cblxuZnVuY3Rpb24gZnJvbUJ5dGVBcnJheSAodWludDgpIHtcbiAgdmFyIHRtcFxuICB2YXIgbGVuID0gdWludDgubGVuZ3RoXG4gIHZhciBleHRyYUJ5dGVzID0gbGVuICUgMyAvLyBpZiB3ZSBoYXZlIDEgYnl0ZSBsZWZ0LCBwYWQgMiBieXRlc1xuICB2YXIgb3V0cHV0ID0gJydcbiAgdmFyIHBhcnRzID0gW11cbiAgdmFyIG1heENodW5rTGVuZ3RoID0gMTYzODMgLy8gbXVzdCBiZSBtdWx0aXBsZSBvZiAzXG5cbiAgLy8gZ28gdGhyb3VnaCB0aGUgYXJyYXkgZXZlcnkgdGhyZWUgYnl0ZXMsIHdlJ2xsIGRlYWwgd2l0aCB0cmFpbGluZyBzdHVmZiBsYXRlclxuICBmb3IgKHZhciBpID0gMCwgbGVuMiA9IGxlbiAtIGV4dHJhQnl0ZXM7IGkgPCBsZW4yOyBpICs9IG1heENodW5rTGVuZ3RoKSB7XG4gICAgcGFydHMucHVzaChlbmNvZGVDaHVuayh1aW50OCwgaSwgKGkgKyBtYXhDaHVua0xlbmd0aCkgPiBsZW4yID8gbGVuMiA6IChpICsgbWF4Q2h1bmtMZW5ndGgpKSlcbiAgfVxuXG4gIC8vIHBhZCB0aGUgZW5kIHdpdGggemVyb3MsIGJ1dCBtYWtlIHN1cmUgdG8gbm90IGZvcmdldCB0aGUgZXh0cmEgYnl0ZXNcbiAgaWYgKGV4dHJhQnl0ZXMgPT09IDEpIHtcbiAgICB0bXAgPSB1aW50OFtsZW4gLSAxXVxuICAgIG91dHB1dCArPSBsb29rdXBbdG1wID4+IDJdXG4gICAgb3V0cHV0ICs9IGxvb2t1cFsodG1wIDw8IDQpICYgMHgzRl1cbiAgICBvdXRwdXQgKz0gJz09J1xuICB9IGVsc2UgaWYgKGV4dHJhQnl0ZXMgPT09IDIpIHtcbiAgICB0bXAgPSAodWludDhbbGVuIC0gMl0gPDwgOCkgKyAodWludDhbbGVuIC0gMV0pXG4gICAgb3V0cHV0ICs9IGxvb2t1cFt0bXAgPj4gMTBdXG4gICAgb3V0cHV0ICs9IGxvb2t1cFsodG1wID4+IDQpICYgMHgzRl1cbiAgICBvdXRwdXQgKz0gbG9va3VwWyh0bXAgPDwgMikgJiAweDNGXVxuICAgIG91dHB1dCArPSAnPSdcbiAgfVxuXG4gIHBhcnRzLnB1c2gob3V0cHV0KVxuXG4gIHJldHVybiBwYXJ0cy5qb2luKCcnKVxufVxuIiwiLyohXG4gKiBUaGUgYnVmZmVyIG1vZHVsZSBmcm9tIG5vZGUuanMsIGZvciB0aGUgYnJvd3Nlci5cbiAqXG4gKiBAYXV0aG9yICAgRmVyb3NzIEFib3VraGFkaWplaCA8ZmVyb3NzQGZlcm9zcy5vcmc+IDxodHRwOi8vZmVyb3NzLm9yZz5cbiAqIEBsaWNlbnNlICBNSVRcbiAqL1xuLyogZXNsaW50LWRpc2FibGUgbm8tcHJvdG8gKi9cblxuJ3VzZSBzdHJpY3QnXG5cbnZhciBiYXNlNjQgPSByZXF1aXJlKCdiYXNlNjQtanMnKVxudmFyIGllZWU3NTQgPSByZXF1aXJlKCdpZWVlNzU0JylcblxuZXhwb3J0cy5CdWZmZXIgPSBCdWZmZXJcbmV4cG9ydHMuU2xvd0J1ZmZlciA9IFNsb3dCdWZmZXJcbmV4cG9ydHMuSU5TUEVDVF9NQVhfQllURVMgPSA1MFxuXG52YXIgS19NQVhfTEVOR1RIID0gMHg3ZmZmZmZmZlxuZXhwb3J0cy5rTWF4TGVuZ3RoID0gS19NQVhfTEVOR1RIXG5cbi8qKlxuICogSWYgYEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUYDpcbiAqICAgPT09IHRydWUgICAgVXNlIFVpbnQ4QXJyYXkgaW1wbGVtZW50YXRpb24gKGZhc3Rlc3QpXG4gKiAgID09PSBmYWxzZSAgIFByaW50IHdhcm5pbmcgYW5kIHJlY29tbWVuZCB1c2luZyBgYnVmZmVyYCB2NC54IHdoaWNoIGhhcyBhbiBPYmplY3RcbiAqICAgICAgICAgICAgICAgaW1wbGVtZW50YXRpb24gKG1vc3QgY29tcGF0aWJsZSwgZXZlbiBJRTYpXG4gKlxuICogQnJvd3NlcnMgdGhhdCBzdXBwb3J0IHR5cGVkIGFycmF5cyBhcmUgSUUgMTArLCBGaXJlZm94IDQrLCBDaHJvbWUgNyssIFNhZmFyaSA1LjErLFxuICogT3BlcmEgMTEuNissIGlPUyA0LjIrLlxuICpcbiAqIFdlIHJlcG9ydCB0aGF0IHRoZSBicm93c2VyIGRvZXMgbm90IHN1cHBvcnQgdHlwZWQgYXJyYXlzIGlmIHRoZSBhcmUgbm90IHN1YmNsYXNzYWJsZVxuICogdXNpbmcgX19wcm90b19fLiBGaXJlZm94IDQtMjkgbGFja3Mgc3VwcG9ydCBmb3IgYWRkaW5nIG5ldyBwcm9wZXJ0aWVzIHRvIGBVaW50OEFycmF5YFxuICogKFNlZTogaHR0cHM6Ly9idWd6aWxsYS5tb3ppbGxhLm9yZy9zaG93X2J1Zy5jZ2k/aWQ9Njk1NDM4KS4gSUUgMTAgbGFja3Mgc3VwcG9ydFxuICogZm9yIF9fcHJvdG9fXyBhbmQgaGFzIGEgYnVnZ3kgdHlwZWQgYXJyYXkgaW1wbGVtZW50YXRpb24uXG4gKi9cbkJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUID0gdHlwZWRBcnJheVN1cHBvcnQoKVxuXG5pZiAoIUJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUICYmIHR5cGVvZiBjb25zb2xlICE9PSAndW5kZWZpbmVkJyAmJlxuICAgIHR5cGVvZiBjb25zb2xlLmVycm9yID09PSAnZnVuY3Rpb24nKSB7XG4gIGNvbnNvbGUuZXJyb3IoXG4gICAgJ1RoaXMgYnJvd3NlciBsYWNrcyB0eXBlZCBhcnJheSAoVWludDhBcnJheSkgc3VwcG9ydCB3aGljaCBpcyByZXF1aXJlZCBieSAnICtcbiAgICAnYGJ1ZmZlcmAgdjUueC4gVXNlIGBidWZmZXJgIHY0LnggaWYgeW91IHJlcXVpcmUgb2xkIGJyb3dzZXIgc3VwcG9ydC4nXG4gIClcbn1cblxuZnVuY3Rpb24gdHlwZWRBcnJheVN1cHBvcnQgKCkge1xuICAvLyBDYW4gdHlwZWQgYXJyYXkgaW5zdGFuY2VzIGNhbiBiZSBhdWdtZW50ZWQ/XG4gIHRyeSB7XG4gICAgdmFyIGFyciA9IG5ldyBVaW50OEFycmF5KDEpXG4gICAgYXJyLl9fcHJvdG9fXyA9IHtfX3Byb3RvX186IFVpbnQ4QXJyYXkucHJvdG90eXBlLCBmb286IGZ1bmN0aW9uICgpIHsgcmV0dXJuIDQyIH19XG4gICAgcmV0dXJuIGFyci5mb28oKSA9PT0gNDJcbiAgfSBjYXRjaCAoZSkge1xuICAgIHJldHVybiBmYWxzZVxuICB9XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZUJ1ZmZlciAobGVuZ3RoKSB7XG4gIGlmIChsZW5ndGggPiBLX01BWF9MRU5HVEgpIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignSW52YWxpZCB0eXBlZCBhcnJheSBsZW5ndGgnKVxuICB9XG4gIC8vIFJldHVybiBhbiBhdWdtZW50ZWQgYFVpbnQ4QXJyYXlgIGluc3RhbmNlXG4gIHZhciBidWYgPSBuZXcgVWludDhBcnJheShsZW5ndGgpXG4gIGJ1Zi5fX3Byb3RvX18gPSBCdWZmZXIucHJvdG90eXBlXG4gIHJldHVybiBidWZcbn1cblxuLyoqXG4gKiBUaGUgQnVmZmVyIGNvbnN0cnVjdG9yIHJldHVybnMgaW5zdGFuY2VzIG9mIGBVaW50OEFycmF5YCB0aGF0IGhhdmUgdGhlaXJcbiAqIHByb3RvdHlwZSBjaGFuZ2VkIHRvIGBCdWZmZXIucHJvdG90eXBlYC4gRnVydGhlcm1vcmUsIGBCdWZmZXJgIGlzIGEgc3ViY2xhc3Mgb2ZcbiAqIGBVaW50OEFycmF5YCwgc28gdGhlIHJldHVybmVkIGluc3RhbmNlcyB3aWxsIGhhdmUgYWxsIHRoZSBub2RlIGBCdWZmZXJgIG1ldGhvZHNcbiAqIGFuZCB0aGUgYFVpbnQ4QXJyYXlgIG1ldGhvZHMuIFNxdWFyZSBicmFja2V0IG5vdGF0aW9uIHdvcmtzIGFzIGV4cGVjdGVkIC0tIGl0XG4gKiByZXR1cm5zIGEgc2luZ2xlIG9jdGV0LlxuICpcbiAqIFRoZSBgVWludDhBcnJheWAgcHJvdG90eXBlIHJlbWFpbnMgdW5tb2RpZmllZC5cbiAqL1xuXG5mdW5jdGlvbiBCdWZmZXIgKGFyZywgZW5jb2RpbmdPck9mZnNldCwgbGVuZ3RoKSB7XG4gIC8vIENvbW1vbiBjYXNlLlxuICBpZiAodHlwZW9mIGFyZyA9PT0gJ251bWJlcicpIHtcbiAgICBpZiAodHlwZW9mIGVuY29kaW5nT3JPZmZzZXQgPT09ICdzdHJpbmcnKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICdJZiBlbmNvZGluZyBpcyBzcGVjaWZpZWQgdGhlbiB0aGUgZmlyc3QgYXJndW1lbnQgbXVzdCBiZSBhIHN0cmluZydcbiAgICAgIClcbiAgICB9XG4gICAgcmV0dXJuIGFsbG9jVW5zYWZlKGFyZylcbiAgfVxuICByZXR1cm4gZnJvbShhcmcsIGVuY29kaW5nT3JPZmZzZXQsIGxlbmd0aClcbn1cblxuLy8gRml4IHN1YmFycmF5KCkgaW4gRVMyMDE2LiBTZWU6IGh0dHBzOi8vZ2l0aHViLmNvbS9mZXJvc3MvYnVmZmVyL3B1bGwvOTdcbmlmICh0eXBlb2YgU3ltYm9sICE9PSAndW5kZWZpbmVkJyAmJiBTeW1ib2wuc3BlY2llcyAmJlxuICAgIEJ1ZmZlcltTeW1ib2wuc3BlY2llc10gPT09IEJ1ZmZlcikge1xuICBPYmplY3QuZGVmaW5lUHJvcGVydHkoQnVmZmVyLCBTeW1ib2wuc3BlY2llcywge1xuICAgIHZhbHVlOiBudWxsLFxuICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZSxcbiAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICB3cml0YWJsZTogZmFsc2VcbiAgfSlcbn1cblxuQnVmZmVyLnBvb2xTaXplID0gODE5MiAvLyBub3QgdXNlZCBieSB0aGlzIGltcGxlbWVudGF0aW9uXG5cbmZ1bmN0aW9uIGZyb20gKHZhbHVlLCBlbmNvZGluZ09yT2Zmc2V0LCBsZW5ndGgpIHtcbiAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ251bWJlcicpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdcInZhbHVlXCIgYXJndW1lbnQgbXVzdCBub3QgYmUgYSBudW1iZXInKVxuICB9XG5cbiAgaWYgKGlzQXJyYXlCdWZmZXIodmFsdWUpKSB7XG4gICAgcmV0dXJuIGZyb21BcnJheUJ1ZmZlcih2YWx1ZSwgZW5jb2RpbmdPck9mZnNldCwgbGVuZ3RoKVxuICB9XG5cbiAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycpIHtcbiAgICByZXR1cm4gZnJvbVN0cmluZyh2YWx1ZSwgZW5jb2RpbmdPck9mZnNldClcbiAgfVxuXG4gIHJldHVybiBmcm9tT2JqZWN0KHZhbHVlKVxufVxuXG4vKipcbiAqIEZ1bmN0aW9uYWxseSBlcXVpdmFsZW50IHRvIEJ1ZmZlcihhcmcsIGVuY29kaW5nKSBidXQgdGhyb3dzIGEgVHlwZUVycm9yXG4gKiBpZiB2YWx1ZSBpcyBhIG51bWJlci5cbiAqIEJ1ZmZlci5mcm9tKHN0clssIGVuY29kaW5nXSlcbiAqIEJ1ZmZlci5mcm9tKGFycmF5KVxuICogQnVmZmVyLmZyb20oYnVmZmVyKVxuICogQnVmZmVyLmZyb20oYXJyYXlCdWZmZXJbLCBieXRlT2Zmc2V0WywgbGVuZ3RoXV0pXG4gKiovXG5CdWZmZXIuZnJvbSA9IGZ1bmN0aW9uICh2YWx1ZSwgZW5jb2RpbmdPck9mZnNldCwgbGVuZ3RoKSB7XG4gIHJldHVybiBmcm9tKHZhbHVlLCBlbmNvZGluZ09yT2Zmc2V0LCBsZW5ndGgpXG59XG5cbi8vIE5vdGU6IENoYW5nZSBwcm90b3R5cGUgKmFmdGVyKiBCdWZmZXIuZnJvbSBpcyBkZWZpbmVkIHRvIHdvcmthcm91bmQgQ2hyb21lIGJ1Zzpcbi8vIGh0dHBzOi8vZ2l0aHViLmNvbS9mZXJvc3MvYnVmZmVyL3B1bGwvMTQ4XG5CdWZmZXIucHJvdG90eXBlLl9fcHJvdG9fXyA9IFVpbnQ4QXJyYXkucHJvdG90eXBlXG5CdWZmZXIuX19wcm90b19fID0gVWludDhBcnJheVxuXG5mdW5jdGlvbiBhc3NlcnRTaXplIChzaXplKSB7XG4gIGlmICh0eXBlb2Ygc2l6ZSAhPT0gJ251bWJlcicpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdcInNpemVcIiBhcmd1bWVudCBtdXN0IGJlIGEgbnVtYmVyJylcbiAgfSBlbHNlIGlmIChzaXplIDwgMCkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdcInNpemVcIiBhcmd1bWVudCBtdXN0IG5vdCBiZSBuZWdhdGl2ZScpXG4gIH1cbn1cblxuZnVuY3Rpb24gYWxsb2MgKHNpemUsIGZpbGwsIGVuY29kaW5nKSB7XG4gIGFzc2VydFNpemUoc2l6ZSlcbiAgaWYgKHNpemUgPD0gMCkge1xuICAgIHJldHVybiBjcmVhdGVCdWZmZXIoc2l6ZSlcbiAgfVxuICBpZiAoZmlsbCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgLy8gT25seSBwYXkgYXR0ZW50aW9uIHRvIGVuY29kaW5nIGlmIGl0J3MgYSBzdHJpbmcuIFRoaXNcbiAgICAvLyBwcmV2ZW50cyBhY2NpZGVudGFsbHkgc2VuZGluZyBpbiBhIG51bWJlciB0aGF0IHdvdWxkXG4gICAgLy8gYmUgaW50ZXJwcmV0dGVkIGFzIGEgc3RhcnQgb2Zmc2V0LlxuICAgIHJldHVybiB0eXBlb2YgZW5jb2RpbmcgPT09ICdzdHJpbmcnXG4gICAgICA/IGNyZWF0ZUJ1ZmZlcihzaXplKS5maWxsKGZpbGwsIGVuY29kaW5nKVxuICAgICAgOiBjcmVhdGVCdWZmZXIoc2l6ZSkuZmlsbChmaWxsKVxuICB9XG4gIHJldHVybiBjcmVhdGVCdWZmZXIoc2l6ZSlcbn1cblxuLyoqXG4gKiBDcmVhdGVzIGEgbmV3IGZpbGxlZCBCdWZmZXIgaW5zdGFuY2UuXG4gKiBhbGxvYyhzaXplWywgZmlsbFssIGVuY29kaW5nXV0pXG4gKiovXG5CdWZmZXIuYWxsb2MgPSBmdW5jdGlvbiAoc2l6ZSwgZmlsbCwgZW5jb2RpbmcpIHtcbiAgcmV0dXJuIGFsbG9jKHNpemUsIGZpbGwsIGVuY29kaW5nKVxufVxuXG5mdW5jdGlvbiBhbGxvY1Vuc2FmZSAoc2l6ZSkge1xuICBhc3NlcnRTaXplKHNpemUpXG4gIHJldHVybiBjcmVhdGVCdWZmZXIoc2l6ZSA8IDAgPyAwIDogY2hlY2tlZChzaXplKSB8IDApXG59XG5cbi8qKlxuICogRXF1aXZhbGVudCB0byBCdWZmZXIobnVtKSwgYnkgZGVmYXVsdCBjcmVhdGVzIGEgbm9uLXplcm8tZmlsbGVkIEJ1ZmZlciBpbnN0YW5jZS5cbiAqICovXG5CdWZmZXIuYWxsb2NVbnNhZmUgPSBmdW5jdGlvbiAoc2l6ZSkge1xuICByZXR1cm4gYWxsb2NVbnNhZmUoc2l6ZSlcbn1cbi8qKlxuICogRXF1aXZhbGVudCB0byBTbG93QnVmZmVyKG51bSksIGJ5IGRlZmF1bHQgY3JlYXRlcyBhIG5vbi16ZXJvLWZpbGxlZCBCdWZmZXIgaW5zdGFuY2UuXG4gKi9cbkJ1ZmZlci5hbGxvY1Vuc2FmZVNsb3cgPSBmdW5jdGlvbiAoc2l6ZSkge1xuICByZXR1cm4gYWxsb2NVbnNhZmUoc2l6ZSlcbn1cblxuZnVuY3Rpb24gZnJvbVN0cmluZyAoc3RyaW5nLCBlbmNvZGluZykge1xuICBpZiAodHlwZW9mIGVuY29kaW5nICE9PSAnc3RyaW5nJyB8fCBlbmNvZGluZyA9PT0gJycpIHtcbiAgICBlbmNvZGluZyA9ICd1dGY4J1xuICB9XG5cbiAgaWYgKCFCdWZmZXIuaXNFbmNvZGluZyhlbmNvZGluZykpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdcImVuY29kaW5nXCIgbXVzdCBiZSBhIHZhbGlkIHN0cmluZyBlbmNvZGluZycpXG4gIH1cblxuICB2YXIgbGVuZ3RoID0gYnl0ZUxlbmd0aChzdHJpbmcsIGVuY29kaW5nKSB8IDBcbiAgdmFyIGJ1ZiA9IGNyZWF0ZUJ1ZmZlcihsZW5ndGgpXG5cbiAgdmFyIGFjdHVhbCA9IGJ1Zi53cml0ZShzdHJpbmcsIGVuY29kaW5nKVxuXG4gIGlmIChhY3R1YWwgIT09IGxlbmd0aCkge1xuICAgIC8vIFdyaXRpbmcgYSBoZXggc3RyaW5nLCBmb3IgZXhhbXBsZSwgdGhhdCBjb250YWlucyBpbnZhbGlkIGNoYXJhY3RlcnMgd2lsbFxuICAgIC8vIGNhdXNlIGV2ZXJ5dGhpbmcgYWZ0ZXIgdGhlIGZpcnN0IGludmFsaWQgY2hhcmFjdGVyIHRvIGJlIGlnbm9yZWQuIChlLmcuXG4gICAgLy8gJ2FieHhjZCcgd2lsbCBiZSB0cmVhdGVkIGFzICdhYicpXG4gICAgYnVmID0gYnVmLnNsaWNlKDAsIGFjdHVhbClcbiAgfVxuXG4gIHJldHVybiBidWZcbn1cblxuZnVuY3Rpb24gZnJvbUFycmF5TGlrZSAoYXJyYXkpIHtcbiAgdmFyIGxlbmd0aCA9IGFycmF5Lmxlbmd0aCA8IDAgPyAwIDogY2hlY2tlZChhcnJheS5sZW5ndGgpIHwgMFxuICB2YXIgYnVmID0gY3JlYXRlQnVmZmVyKGxlbmd0aClcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkgKz0gMSkge1xuICAgIGJ1ZltpXSA9IGFycmF5W2ldICYgMjU1XG4gIH1cbiAgcmV0dXJuIGJ1ZlxufVxuXG5mdW5jdGlvbiBmcm9tQXJyYXlCdWZmZXIgKGFycmF5LCBieXRlT2Zmc2V0LCBsZW5ndGgpIHtcbiAgaWYgKGJ5dGVPZmZzZXQgPCAwIHx8IGFycmF5LmJ5dGVMZW5ndGggPCBieXRlT2Zmc2V0KSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ1xcJ29mZnNldFxcJyBpcyBvdXQgb2YgYm91bmRzJylcbiAgfVxuXG4gIGlmIChhcnJheS5ieXRlTGVuZ3RoIDwgYnl0ZU9mZnNldCArIChsZW5ndGggfHwgMCkpIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignXFwnbGVuZ3RoXFwnIGlzIG91dCBvZiBib3VuZHMnKVxuICB9XG5cbiAgdmFyIGJ1ZlxuICBpZiAoYnl0ZU9mZnNldCA9PT0gdW5kZWZpbmVkICYmIGxlbmd0aCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgYnVmID0gbmV3IFVpbnQ4QXJyYXkoYXJyYXkpXG4gIH0gZWxzZSBpZiAobGVuZ3RoID09PSB1bmRlZmluZWQpIHtcbiAgICBidWYgPSBuZXcgVWludDhBcnJheShhcnJheSwgYnl0ZU9mZnNldClcbiAgfSBlbHNlIHtcbiAgICBidWYgPSBuZXcgVWludDhBcnJheShhcnJheSwgYnl0ZU9mZnNldCwgbGVuZ3RoKVxuICB9XG5cbiAgLy8gUmV0dXJuIGFuIGF1Z21lbnRlZCBgVWludDhBcnJheWAgaW5zdGFuY2VcbiAgYnVmLl9fcHJvdG9fXyA9IEJ1ZmZlci5wcm90b3R5cGVcbiAgcmV0dXJuIGJ1ZlxufVxuXG5mdW5jdGlvbiBmcm9tT2JqZWN0IChvYmopIHtcbiAgaWYgKEJ1ZmZlci5pc0J1ZmZlcihvYmopKSB7XG4gICAgdmFyIGxlbiA9IGNoZWNrZWQob2JqLmxlbmd0aCkgfCAwXG4gICAgdmFyIGJ1ZiA9IGNyZWF0ZUJ1ZmZlcihsZW4pXG5cbiAgICBpZiAoYnVmLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIGJ1ZlxuICAgIH1cblxuICAgIG9iai5jb3B5KGJ1ZiwgMCwgMCwgbGVuKVxuICAgIHJldHVybiBidWZcbiAgfVxuXG4gIGlmIChvYmopIHtcbiAgICBpZiAoaXNBcnJheUJ1ZmZlclZpZXcob2JqKSB8fCAnbGVuZ3RoJyBpbiBvYmopIHtcbiAgICAgIGlmICh0eXBlb2Ygb2JqLmxlbmd0aCAhPT0gJ251bWJlcicgfHwgbnVtYmVySXNOYU4ob2JqLmxlbmd0aCkpIHtcbiAgICAgICAgcmV0dXJuIGNyZWF0ZUJ1ZmZlcigwKVxuICAgICAgfVxuICAgICAgcmV0dXJuIGZyb21BcnJheUxpa2Uob2JqKVxuICAgIH1cblxuICAgIGlmIChvYmoudHlwZSA9PT0gJ0J1ZmZlcicgJiYgQXJyYXkuaXNBcnJheShvYmouZGF0YSkpIHtcbiAgICAgIHJldHVybiBmcm9tQXJyYXlMaWtlKG9iai5kYXRhKVxuICAgIH1cbiAgfVxuXG4gIHRocm93IG5ldyBUeXBlRXJyb3IoJ0ZpcnN0IGFyZ3VtZW50IG11c3QgYmUgYSBzdHJpbmcsIEJ1ZmZlciwgQXJyYXlCdWZmZXIsIEFycmF5LCBvciBhcnJheS1saWtlIG9iamVjdC4nKVxufVxuXG5mdW5jdGlvbiBjaGVja2VkIChsZW5ndGgpIHtcbiAgLy8gTm90ZTogY2Fubm90IHVzZSBgbGVuZ3RoIDwgS19NQVhfTEVOR1RIYCBoZXJlIGJlY2F1c2UgdGhhdCBmYWlscyB3aGVuXG4gIC8vIGxlbmd0aCBpcyBOYU4gKHdoaWNoIGlzIG90aGVyd2lzZSBjb2VyY2VkIHRvIHplcm8uKVxuICBpZiAobGVuZ3RoID49IEtfTUFYX0xFTkdUSCkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdBdHRlbXB0IHRvIGFsbG9jYXRlIEJ1ZmZlciBsYXJnZXIgdGhhbiBtYXhpbXVtICcgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICdzaXplOiAweCcgKyBLX01BWF9MRU5HVEgudG9TdHJpbmcoMTYpICsgJyBieXRlcycpXG4gIH1cbiAgcmV0dXJuIGxlbmd0aCB8IDBcbn1cblxuZnVuY3Rpb24gU2xvd0J1ZmZlciAobGVuZ3RoKSB7XG4gIGlmICgrbGVuZ3RoICE9IGxlbmd0aCkgeyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIGVxZXFlcVxuICAgIGxlbmd0aCA9IDBcbiAgfVxuICByZXR1cm4gQnVmZmVyLmFsbG9jKCtsZW5ndGgpXG59XG5cbkJ1ZmZlci5pc0J1ZmZlciA9IGZ1bmN0aW9uIGlzQnVmZmVyIChiKSB7XG4gIHJldHVybiBiICE9IG51bGwgJiYgYi5faXNCdWZmZXIgPT09IHRydWVcbn1cblxuQnVmZmVyLmNvbXBhcmUgPSBmdW5jdGlvbiBjb21wYXJlIChhLCBiKSB7XG4gIGlmICghQnVmZmVyLmlzQnVmZmVyKGEpIHx8ICFCdWZmZXIuaXNCdWZmZXIoYikpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdBcmd1bWVudHMgbXVzdCBiZSBCdWZmZXJzJylcbiAgfVxuXG4gIGlmIChhID09PSBiKSByZXR1cm4gMFxuXG4gIHZhciB4ID0gYS5sZW5ndGhcbiAgdmFyIHkgPSBiLmxlbmd0aFxuXG4gIGZvciAodmFyIGkgPSAwLCBsZW4gPSBNYXRoLm1pbih4LCB5KTsgaSA8IGxlbjsgKytpKSB7XG4gICAgaWYgKGFbaV0gIT09IGJbaV0pIHtcbiAgICAgIHggPSBhW2ldXG4gICAgICB5ID0gYltpXVxuICAgICAgYnJlYWtcbiAgICB9XG4gIH1cblxuICBpZiAoeCA8IHkpIHJldHVybiAtMVxuICBpZiAoeSA8IHgpIHJldHVybiAxXG4gIHJldHVybiAwXG59XG5cbkJ1ZmZlci5pc0VuY29kaW5nID0gZnVuY3Rpb24gaXNFbmNvZGluZyAoZW5jb2RpbmcpIHtcbiAgc3dpdGNoIChTdHJpbmcoZW5jb2RpbmcpLnRvTG93ZXJDYXNlKCkpIHtcbiAgICBjYXNlICdoZXgnOlxuICAgIGNhc2UgJ3V0ZjgnOlxuICAgIGNhc2UgJ3V0Zi04JzpcbiAgICBjYXNlICdhc2NpaSc6XG4gICAgY2FzZSAnbGF0aW4xJzpcbiAgICBjYXNlICdiaW5hcnknOlxuICAgIGNhc2UgJ2Jhc2U2NCc6XG4gICAgY2FzZSAndWNzMic6XG4gICAgY2FzZSAndWNzLTInOlxuICAgIGNhc2UgJ3V0ZjE2bGUnOlxuICAgIGNhc2UgJ3V0Zi0xNmxlJzpcbiAgICAgIHJldHVybiB0cnVlXG4gICAgZGVmYXVsdDpcbiAgICAgIHJldHVybiBmYWxzZVxuICB9XG59XG5cbkJ1ZmZlci5jb25jYXQgPSBmdW5jdGlvbiBjb25jYXQgKGxpc3QsIGxlbmd0aCkge1xuICBpZiAoIUFycmF5LmlzQXJyYXkobGlzdCkpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdcImxpc3RcIiBhcmd1bWVudCBtdXN0IGJlIGFuIEFycmF5IG9mIEJ1ZmZlcnMnKVxuICB9XG5cbiAgaWYgKGxpc3QubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIEJ1ZmZlci5hbGxvYygwKVxuICB9XG5cbiAgdmFyIGlcbiAgaWYgKGxlbmd0aCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgbGVuZ3RoID0gMFxuICAgIGZvciAoaSA9IDA7IGkgPCBsaXN0Lmxlbmd0aDsgKytpKSB7XG4gICAgICBsZW5ndGggKz0gbGlzdFtpXS5sZW5ndGhcbiAgICB9XG4gIH1cblxuICB2YXIgYnVmZmVyID0gQnVmZmVyLmFsbG9jVW5zYWZlKGxlbmd0aClcbiAgdmFyIHBvcyA9IDBcbiAgZm9yIChpID0gMDsgaSA8IGxpc3QubGVuZ3RoOyArK2kpIHtcbiAgICB2YXIgYnVmID0gbGlzdFtpXVxuICAgIGlmICghQnVmZmVyLmlzQnVmZmVyKGJ1ZikpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1wibGlzdFwiIGFyZ3VtZW50IG11c3QgYmUgYW4gQXJyYXkgb2YgQnVmZmVycycpXG4gICAgfVxuICAgIGJ1Zi5jb3B5KGJ1ZmZlciwgcG9zKVxuICAgIHBvcyArPSBidWYubGVuZ3RoXG4gIH1cbiAgcmV0dXJuIGJ1ZmZlclxufVxuXG5mdW5jdGlvbiBieXRlTGVuZ3RoIChzdHJpbmcsIGVuY29kaW5nKSB7XG4gIGlmIChCdWZmZXIuaXNCdWZmZXIoc3RyaW5nKSkge1xuICAgIHJldHVybiBzdHJpbmcubGVuZ3RoXG4gIH1cbiAgaWYgKGlzQXJyYXlCdWZmZXJWaWV3KHN0cmluZykgfHwgaXNBcnJheUJ1ZmZlcihzdHJpbmcpKSB7XG4gICAgcmV0dXJuIHN0cmluZy5ieXRlTGVuZ3RoXG4gIH1cbiAgaWYgKHR5cGVvZiBzdHJpbmcgIT09ICdzdHJpbmcnKSB7XG4gICAgc3RyaW5nID0gJycgKyBzdHJpbmdcbiAgfVxuXG4gIHZhciBsZW4gPSBzdHJpbmcubGVuZ3RoXG4gIGlmIChsZW4gPT09IDApIHJldHVybiAwXG5cbiAgLy8gVXNlIGEgZm9yIGxvb3AgdG8gYXZvaWQgcmVjdXJzaW9uXG4gIHZhciBsb3dlcmVkQ2FzZSA9IGZhbHNlXG4gIGZvciAoOzspIHtcbiAgICBzd2l0Y2ggKGVuY29kaW5nKSB7XG4gICAgICBjYXNlICdhc2NpaSc6XG4gICAgICBjYXNlICdsYXRpbjEnOlxuICAgICAgY2FzZSAnYmluYXJ5JzpcbiAgICAgICAgcmV0dXJuIGxlblxuICAgICAgY2FzZSAndXRmOCc6XG4gICAgICBjYXNlICd1dGYtOCc6XG4gICAgICBjYXNlIHVuZGVmaW5lZDpcbiAgICAgICAgcmV0dXJuIHV0ZjhUb0J5dGVzKHN0cmluZykubGVuZ3RoXG4gICAgICBjYXNlICd1Y3MyJzpcbiAgICAgIGNhc2UgJ3Vjcy0yJzpcbiAgICAgIGNhc2UgJ3V0ZjE2bGUnOlxuICAgICAgY2FzZSAndXRmLTE2bGUnOlxuICAgICAgICByZXR1cm4gbGVuICogMlxuICAgICAgY2FzZSAnaGV4JzpcbiAgICAgICAgcmV0dXJuIGxlbiA+Pj4gMVxuICAgICAgY2FzZSAnYmFzZTY0JzpcbiAgICAgICAgcmV0dXJuIGJhc2U2NFRvQnl0ZXMoc3RyaW5nKS5sZW5ndGhcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGlmIChsb3dlcmVkQ2FzZSkgcmV0dXJuIHV0ZjhUb0J5dGVzKHN0cmluZykubGVuZ3RoIC8vIGFzc3VtZSB1dGY4XG4gICAgICAgIGVuY29kaW5nID0gKCcnICsgZW5jb2RpbmcpLnRvTG93ZXJDYXNlKClcbiAgICAgICAgbG93ZXJlZENhc2UgPSB0cnVlXG4gICAgfVxuICB9XG59XG5CdWZmZXIuYnl0ZUxlbmd0aCA9IGJ5dGVMZW5ndGhcblxuZnVuY3Rpb24gc2xvd1RvU3RyaW5nIChlbmNvZGluZywgc3RhcnQsIGVuZCkge1xuICB2YXIgbG93ZXJlZENhc2UgPSBmYWxzZVxuXG4gIC8vIE5vIG5lZWQgdG8gdmVyaWZ5IHRoYXQgXCJ0aGlzLmxlbmd0aCA8PSBNQVhfVUlOVDMyXCIgc2luY2UgaXQncyBhIHJlYWQtb25seVxuICAvLyBwcm9wZXJ0eSBvZiBhIHR5cGVkIGFycmF5LlxuXG4gIC8vIFRoaXMgYmVoYXZlcyBuZWl0aGVyIGxpa2UgU3RyaW5nIG5vciBVaW50OEFycmF5IGluIHRoYXQgd2Ugc2V0IHN0YXJ0L2VuZFxuICAvLyB0byB0aGVpciB1cHBlci9sb3dlciBib3VuZHMgaWYgdGhlIHZhbHVlIHBhc3NlZCBpcyBvdXQgb2YgcmFuZ2UuXG4gIC8vIHVuZGVmaW5lZCBpcyBoYW5kbGVkIHNwZWNpYWxseSBhcyBwZXIgRUNNQS0yNjIgNnRoIEVkaXRpb24sXG4gIC8vIFNlY3Rpb24gMTMuMy4zLjcgUnVudGltZSBTZW1hbnRpY3M6IEtleWVkQmluZGluZ0luaXRpYWxpemF0aW9uLlxuICBpZiAoc3RhcnQgPT09IHVuZGVmaW5lZCB8fCBzdGFydCA8IDApIHtcbiAgICBzdGFydCA9IDBcbiAgfVxuICAvLyBSZXR1cm4gZWFybHkgaWYgc3RhcnQgPiB0aGlzLmxlbmd0aC4gRG9uZSBoZXJlIHRvIHByZXZlbnQgcG90ZW50aWFsIHVpbnQzMlxuICAvLyBjb2VyY2lvbiBmYWlsIGJlbG93LlxuICBpZiAoc3RhcnQgPiB0aGlzLmxlbmd0aCkge1xuICAgIHJldHVybiAnJ1xuICB9XG5cbiAgaWYgKGVuZCA9PT0gdW5kZWZpbmVkIHx8IGVuZCA+IHRoaXMubGVuZ3RoKSB7XG4gICAgZW5kID0gdGhpcy5sZW5ndGhcbiAgfVxuXG4gIGlmIChlbmQgPD0gMCkge1xuICAgIHJldHVybiAnJ1xuICB9XG5cbiAgLy8gRm9yY2UgY29lcnNpb24gdG8gdWludDMyLiBUaGlzIHdpbGwgYWxzbyBjb2VyY2UgZmFsc2V5L05hTiB2YWx1ZXMgdG8gMC5cbiAgZW5kID4+Pj0gMFxuICBzdGFydCA+Pj49IDBcblxuICBpZiAoZW5kIDw9IHN0YXJ0KSB7XG4gICAgcmV0dXJuICcnXG4gIH1cblxuICBpZiAoIWVuY29kaW5nKSBlbmNvZGluZyA9ICd1dGY4J1xuXG4gIHdoaWxlICh0cnVlKSB7XG4gICAgc3dpdGNoIChlbmNvZGluZykge1xuICAgICAgY2FzZSAnaGV4JzpcbiAgICAgICAgcmV0dXJuIGhleFNsaWNlKHRoaXMsIHN0YXJ0LCBlbmQpXG5cbiAgICAgIGNhc2UgJ3V0ZjgnOlxuICAgICAgY2FzZSAndXRmLTgnOlxuICAgICAgICByZXR1cm4gdXRmOFNsaWNlKHRoaXMsIHN0YXJ0LCBlbmQpXG5cbiAgICAgIGNhc2UgJ2FzY2lpJzpcbiAgICAgICAgcmV0dXJuIGFzY2lpU2xpY2UodGhpcywgc3RhcnQsIGVuZClcblxuICAgICAgY2FzZSAnbGF0aW4xJzpcbiAgICAgIGNhc2UgJ2JpbmFyeSc6XG4gICAgICAgIHJldHVybiBsYXRpbjFTbGljZSh0aGlzLCBzdGFydCwgZW5kKVxuXG4gICAgICBjYXNlICdiYXNlNjQnOlxuICAgICAgICByZXR1cm4gYmFzZTY0U2xpY2UodGhpcywgc3RhcnQsIGVuZClcblxuICAgICAgY2FzZSAndWNzMic6XG4gICAgICBjYXNlICd1Y3MtMic6XG4gICAgICBjYXNlICd1dGYxNmxlJzpcbiAgICAgIGNhc2UgJ3V0Zi0xNmxlJzpcbiAgICAgICAgcmV0dXJuIHV0ZjE2bGVTbGljZSh0aGlzLCBzdGFydCwgZW5kKVxuXG4gICAgICBkZWZhdWx0OlxuICAgICAgICBpZiAobG93ZXJlZENhc2UpIHRocm93IG5ldyBUeXBlRXJyb3IoJ1Vua25vd24gZW5jb2Rpbmc6ICcgKyBlbmNvZGluZylcbiAgICAgICAgZW5jb2RpbmcgPSAoZW5jb2RpbmcgKyAnJykudG9Mb3dlckNhc2UoKVxuICAgICAgICBsb3dlcmVkQ2FzZSA9IHRydWVcbiAgICB9XG4gIH1cbn1cblxuLy8gVGhpcyBwcm9wZXJ0eSBpcyB1c2VkIGJ5IGBCdWZmZXIuaXNCdWZmZXJgIChhbmQgdGhlIGBpcy1idWZmZXJgIG5wbSBwYWNrYWdlKVxuLy8gdG8gZGV0ZWN0IGEgQnVmZmVyIGluc3RhbmNlLiBJdCdzIG5vdCBwb3NzaWJsZSB0byB1c2UgYGluc3RhbmNlb2YgQnVmZmVyYFxuLy8gcmVsaWFibHkgaW4gYSBicm93c2VyaWZ5IGNvbnRleHQgYmVjYXVzZSB0aGVyZSBjb3VsZCBiZSBtdWx0aXBsZSBkaWZmZXJlbnRcbi8vIGNvcGllcyBvZiB0aGUgJ2J1ZmZlcicgcGFja2FnZSBpbiB1c2UuIFRoaXMgbWV0aG9kIHdvcmtzIGV2ZW4gZm9yIEJ1ZmZlclxuLy8gaW5zdGFuY2VzIHRoYXQgd2VyZSBjcmVhdGVkIGZyb20gYW5vdGhlciBjb3B5IG9mIHRoZSBgYnVmZmVyYCBwYWNrYWdlLlxuLy8gU2VlOiBodHRwczovL2dpdGh1Yi5jb20vZmVyb3NzL2J1ZmZlci9pc3N1ZXMvMTU0XG5CdWZmZXIucHJvdG90eXBlLl9pc0J1ZmZlciA9IHRydWVcblxuZnVuY3Rpb24gc3dhcCAoYiwgbiwgbSkge1xuICB2YXIgaSA9IGJbbl1cbiAgYltuXSA9IGJbbV1cbiAgYlttXSA9IGlcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5zd2FwMTYgPSBmdW5jdGlvbiBzd2FwMTYgKCkge1xuICB2YXIgbGVuID0gdGhpcy5sZW5ndGhcbiAgaWYgKGxlbiAlIDIgIT09IDApIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignQnVmZmVyIHNpemUgbXVzdCBiZSBhIG11bHRpcGxlIG9mIDE2LWJpdHMnKVxuICB9XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpICs9IDIpIHtcbiAgICBzd2FwKHRoaXMsIGksIGkgKyAxKVxuICB9XG4gIHJldHVybiB0aGlzXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUuc3dhcDMyID0gZnVuY3Rpb24gc3dhcDMyICgpIHtcbiAgdmFyIGxlbiA9IHRoaXMubGVuZ3RoXG4gIGlmIChsZW4gJSA0ICE9PSAwKSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0J1ZmZlciBzaXplIG11c3QgYmUgYSBtdWx0aXBsZSBvZiAzMi1iaXRzJylcbiAgfVxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgaSArPSA0KSB7XG4gICAgc3dhcCh0aGlzLCBpLCBpICsgMylcbiAgICBzd2FwKHRoaXMsIGkgKyAxLCBpICsgMilcbiAgfVxuICByZXR1cm4gdGhpc1xufVxuXG5CdWZmZXIucHJvdG90eXBlLnN3YXA2NCA9IGZ1bmN0aW9uIHN3YXA2NCAoKSB7XG4gIHZhciBsZW4gPSB0aGlzLmxlbmd0aFxuICBpZiAobGVuICUgOCAhPT0gMCkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdCdWZmZXIgc2l6ZSBtdXN0IGJlIGEgbXVsdGlwbGUgb2YgNjQtYml0cycpXG4gIH1cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkgKz0gOCkge1xuICAgIHN3YXAodGhpcywgaSwgaSArIDcpXG4gICAgc3dhcCh0aGlzLCBpICsgMSwgaSArIDYpXG4gICAgc3dhcCh0aGlzLCBpICsgMiwgaSArIDUpXG4gICAgc3dhcCh0aGlzLCBpICsgMywgaSArIDQpXG4gIH1cbiAgcmV0dXJuIHRoaXNcbn1cblxuQnVmZmVyLnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uIHRvU3RyaW5nICgpIHtcbiAgdmFyIGxlbmd0aCA9IHRoaXMubGVuZ3RoXG4gIGlmIChsZW5ndGggPT09IDApIHJldHVybiAnJ1xuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkgcmV0dXJuIHV0ZjhTbGljZSh0aGlzLCAwLCBsZW5ndGgpXG4gIHJldHVybiBzbG93VG9TdHJpbmcuYXBwbHkodGhpcywgYXJndW1lbnRzKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLmVxdWFscyA9IGZ1bmN0aW9uIGVxdWFscyAoYikge1xuICBpZiAoIUJ1ZmZlci5pc0J1ZmZlcihiKSkgdGhyb3cgbmV3IFR5cGVFcnJvcignQXJndW1lbnQgbXVzdCBiZSBhIEJ1ZmZlcicpXG4gIGlmICh0aGlzID09PSBiKSByZXR1cm4gdHJ1ZVxuICByZXR1cm4gQnVmZmVyLmNvbXBhcmUodGhpcywgYikgPT09IDBcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5pbnNwZWN0ID0gZnVuY3Rpb24gaW5zcGVjdCAoKSB7XG4gIHZhciBzdHIgPSAnJ1xuICB2YXIgbWF4ID0gZXhwb3J0cy5JTlNQRUNUX01BWF9CWVRFU1xuICBpZiAodGhpcy5sZW5ndGggPiAwKSB7XG4gICAgc3RyID0gdGhpcy50b1N0cmluZygnaGV4JywgMCwgbWF4KS5tYXRjaCgvLnsyfS9nKS5qb2luKCcgJylcbiAgICBpZiAodGhpcy5sZW5ndGggPiBtYXgpIHN0ciArPSAnIC4uLiAnXG4gIH1cbiAgcmV0dXJuICc8QnVmZmVyICcgKyBzdHIgKyAnPidcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5jb21wYXJlID0gZnVuY3Rpb24gY29tcGFyZSAodGFyZ2V0LCBzdGFydCwgZW5kLCB0aGlzU3RhcnQsIHRoaXNFbmQpIHtcbiAgaWYgKCFCdWZmZXIuaXNCdWZmZXIodGFyZ2V0KSkge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0FyZ3VtZW50IG11c3QgYmUgYSBCdWZmZXInKVxuICB9XG5cbiAgaWYgKHN0YXJ0ID09PSB1bmRlZmluZWQpIHtcbiAgICBzdGFydCA9IDBcbiAgfVxuICBpZiAoZW5kID09PSB1bmRlZmluZWQpIHtcbiAgICBlbmQgPSB0YXJnZXQgPyB0YXJnZXQubGVuZ3RoIDogMFxuICB9XG4gIGlmICh0aGlzU3RhcnQgPT09IHVuZGVmaW5lZCkge1xuICAgIHRoaXNTdGFydCA9IDBcbiAgfVxuICBpZiAodGhpc0VuZCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgdGhpc0VuZCA9IHRoaXMubGVuZ3RoXG4gIH1cblxuICBpZiAoc3RhcnQgPCAwIHx8IGVuZCA+IHRhcmdldC5sZW5ndGggfHwgdGhpc1N0YXJ0IDwgMCB8fCB0aGlzRW5kID4gdGhpcy5sZW5ndGgpIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignb3V0IG9mIHJhbmdlIGluZGV4JylcbiAgfVxuXG4gIGlmICh0aGlzU3RhcnQgPj0gdGhpc0VuZCAmJiBzdGFydCA+PSBlbmQpIHtcbiAgICByZXR1cm4gMFxuICB9XG4gIGlmICh0aGlzU3RhcnQgPj0gdGhpc0VuZCkge1xuICAgIHJldHVybiAtMVxuICB9XG4gIGlmIChzdGFydCA+PSBlbmQpIHtcbiAgICByZXR1cm4gMVxuICB9XG5cbiAgc3RhcnQgPj4+PSAwXG4gIGVuZCA+Pj49IDBcbiAgdGhpc1N0YXJ0ID4+Pj0gMFxuICB0aGlzRW5kID4+Pj0gMFxuXG4gIGlmICh0aGlzID09PSB0YXJnZXQpIHJldHVybiAwXG5cbiAgdmFyIHggPSB0aGlzRW5kIC0gdGhpc1N0YXJ0XG4gIHZhciB5ID0gZW5kIC0gc3RhcnRcbiAgdmFyIGxlbiA9IE1hdGgubWluKHgsIHkpXG5cbiAgdmFyIHRoaXNDb3B5ID0gdGhpcy5zbGljZSh0aGlzU3RhcnQsIHRoaXNFbmQpXG4gIHZhciB0YXJnZXRDb3B5ID0gdGFyZ2V0LnNsaWNlKHN0YXJ0LCBlbmQpXG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47ICsraSkge1xuICAgIGlmICh0aGlzQ29weVtpXSAhPT0gdGFyZ2V0Q29weVtpXSkge1xuICAgICAgeCA9IHRoaXNDb3B5W2ldXG4gICAgICB5ID0gdGFyZ2V0Q29weVtpXVxuICAgICAgYnJlYWtcbiAgICB9XG4gIH1cblxuICBpZiAoeCA8IHkpIHJldHVybiAtMVxuICBpZiAoeSA8IHgpIHJldHVybiAxXG4gIHJldHVybiAwXG59XG5cbi8vIEZpbmRzIGVpdGhlciB0aGUgZmlyc3QgaW5kZXggb2YgYHZhbGAgaW4gYGJ1ZmZlcmAgYXQgb2Zmc2V0ID49IGBieXRlT2Zmc2V0YCxcbi8vIE9SIHRoZSBsYXN0IGluZGV4IG9mIGB2YWxgIGluIGBidWZmZXJgIGF0IG9mZnNldCA8PSBgYnl0ZU9mZnNldGAuXG4vL1xuLy8gQXJndW1lbnRzOlxuLy8gLSBidWZmZXIgLSBhIEJ1ZmZlciB0byBzZWFyY2hcbi8vIC0gdmFsIC0gYSBzdHJpbmcsIEJ1ZmZlciwgb3IgbnVtYmVyXG4vLyAtIGJ5dGVPZmZzZXQgLSBhbiBpbmRleCBpbnRvIGBidWZmZXJgOyB3aWxsIGJlIGNsYW1wZWQgdG8gYW4gaW50MzJcbi8vIC0gZW5jb2RpbmcgLSBhbiBvcHRpb25hbCBlbmNvZGluZywgcmVsZXZhbnQgaXMgdmFsIGlzIGEgc3RyaW5nXG4vLyAtIGRpciAtIHRydWUgZm9yIGluZGV4T2YsIGZhbHNlIGZvciBsYXN0SW5kZXhPZlxuZnVuY3Rpb24gYmlkaXJlY3Rpb25hbEluZGV4T2YgKGJ1ZmZlciwgdmFsLCBieXRlT2Zmc2V0LCBlbmNvZGluZywgZGlyKSB7XG4gIC8vIEVtcHR5IGJ1ZmZlciBtZWFucyBubyBtYXRjaFxuICBpZiAoYnVmZmVyLmxlbmd0aCA9PT0gMCkgcmV0dXJuIC0xXG5cbiAgLy8gTm9ybWFsaXplIGJ5dGVPZmZzZXRcbiAgaWYgKHR5cGVvZiBieXRlT2Zmc2V0ID09PSAnc3RyaW5nJykge1xuICAgIGVuY29kaW5nID0gYnl0ZU9mZnNldFxuICAgIGJ5dGVPZmZzZXQgPSAwXG4gIH0gZWxzZSBpZiAoYnl0ZU9mZnNldCA+IDB4N2ZmZmZmZmYpIHtcbiAgICBieXRlT2Zmc2V0ID0gMHg3ZmZmZmZmZlxuICB9IGVsc2UgaWYgKGJ5dGVPZmZzZXQgPCAtMHg4MDAwMDAwMCkge1xuICAgIGJ5dGVPZmZzZXQgPSAtMHg4MDAwMDAwMFxuICB9XG4gIGJ5dGVPZmZzZXQgPSArYnl0ZU9mZnNldCAgLy8gQ29lcmNlIHRvIE51bWJlci5cbiAgaWYgKG51bWJlcklzTmFOKGJ5dGVPZmZzZXQpKSB7XG4gICAgLy8gYnl0ZU9mZnNldDogaXQgaXQncyB1bmRlZmluZWQsIG51bGwsIE5hTiwgXCJmb29cIiwgZXRjLCBzZWFyY2ggd2hvbGUgYnVmZmVyXG4gICAgYnl0ZU9mZnNldCA9IGRpciA/IDAgOiAoYnVmZmVyLmxlbmd0aCAtIDEpXG4gIH1cblxuICAvLyBOb3JtYWxpemUgYnl0ZU9mZnNldDogbmVnYXRpdmUgb2Zmc2V0cyBzdGFydCBmcm9tIHRoZSBlbmQgb2YgdGhlIGJ1ZmZlclxuICBpZiAoYnl0ZU9mZnNldCA8IDApIGJ5dGVPZmZzZXQgPSBidWZmZXIubGVuZ3RoICsgYnl0ZU9mZnNldFxuICBpZiAoYnl0ZU9mZnNldCA+PSBidWZmZXIubGVuZ3RoKSB7XG4gICAgaWYgKGRpcikgcmV0dXJuIC0xXG4gICAgZWxzZSBieXRlT2Zmc2V0ID0gYnVmZmVyLmxlbmd0aCAtIDFcbiAgfSBlbHNlIGlmIChieXRlT2Zmc2V0IDwgMCkge1xuICAgIGlmIChkaXIpIGJ5dGVPZmZzZXQgPSAwXG4gICAgZWxzZSByZXR1cm4gLTFcbiAgfVxuXG4gIC8vIE5vcm1hbGl6ZSB2YWxcbiAgaWYgKHR5cGVvZiB2YWwgPT09ICdzdHJpbmcnKSB7XG4gICAgdmFsID0gQnVmZmVyLmZyb20odmFsLCBlbmNvZGluZylcbiAgfVxuXG4gIC8vIEZpbmFsbHksIHNlYXJjaCBlaXRoZXIgaW5kZXhPZiAoaWYgZGlyIGlzIHRydWUpIG9yIGxhc3RJbmRleE9mXG4gIGlmIChCdWZmZXIuaXNCdWZmZXIodmFsKSkge1xuICAgIC8vIFNwZWNpYWwgY2FzZTogbG9va2luZyBmb3IgZW1wdHkgc3RyaW5nL2J1ZmZlciBhbHdheXMgZmFpbHNcbiAgICBpZiAodmFsLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIC0xXG4gICAgfVxuICAgIHJldHVybiBhcnJheUluZGV4T2YoYnVmZmVyLCB2YWwsIGJ5dGVPZmZzZXQsIGVuY29kaW5nLCBkaXIpXG4gIH0gZWxzZSBpZiAodHlwZW9mIHZhbCA9PT0gJ251bWJlcicpIHtcbiAgICB2YWwgPSB2YWwgJiAweEZGIC8vIFNlYXJjaCBmb3IgYSBieXRlIHZhbHVlIFswLTI1NV1cbiAgICBpZiAodHlwZW9mIFVpbnQ4QXJyYXkucHJvdG90eXBlLmluZGV4T2YgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIGlmIChkaXIpIHtcbiAgICAgICAgcmV0dXJuIFVpbnQ4QXJyYXkucHJvdG90eXBlLmluZGV4T2YuY2FsbChidWZmZXIsIHZhbCwgYnl0ZU9mZnNldClcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBVaW50OEFycmF5LnByb3RvdHlwZS5sYXN0SW5kZXhPZi5jYWxsKGJ1ZmZlciwgdmFsLCBieXRlT2Zmc2V0KVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gYXJyYXlJbmRleE9mKGJ1ZmZlciwgWyB2YWwgXSwgYnl0ZU9mZnNldCwgZW5jb2RpbmcsIGRpcilcbiAgfVxuXG4gIHRocm93IG5ldyBUeXBlRXJyb3IoJ3ZhbCBtdXN0IGJlIHN0cmluZywgbnVtYmVyIG9yIEJ1ZmZlcicpXG59XG5cbmZ1bmN0aW9uIGFycmF5SW5kZXhPZiAoYXJyLCB2YWwsIGJ5dGVPZmZzZXQsIGVuY29kaW5nLCBkaXIpIHtcbiAgdmFyIGluZGV4U2l6ZSA9IDFcbiAgdmFyIGFyckxlbmd0aCA9IGFyci5sZW5ndGhcbiAgdmFyIHZhbExlbmd0aCA9IHZhbC5sZW5ndGhcblxuICBpZiAoZW5jb2RpbmcgIT09IHVuZGVmaW5lZCkge1xuICAgIGVuY29kaW5nID0gU3RyaW5nKGVuY29kaW5nKS50b0xvd2VyQ2FzZSgpXG4gICAgaWYgKGVuY29kaW5nID09PSAndWNzMicgfHwgZW5jb2RpbmcgPT09ICd1Y3MtMicgfHxcbiAgICAgICAgZW5jb2RpbmcgPT09ICd1dGYxNmxlJyB8fCBlbmNvZGluZyA9PT0gJ3V0Zi0xNmxlJykge1xuICAgICAgaWYgKGFyci5sZW5ndGggPCAyIHx8IHZhbC5sZW5ndGggPCAyKSB7XG4gICAgICAgIHJldHVybiAtMVxuICAgICAgfVxuICAgICAgaW5kZXhTaXplID0gMlxuICAgICAgYXJyTGVuZ3RoIC89IDJcbiAgICAgIHZhbExlbmd0aCAvPSAyXG4gICAgICBieXRlT2Zmc2V0IC89IDJcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiByZWFkIChidWYsIGkpIHtcbiAgICBpZiAoaW5kZXhTaXplID09PSAxKSB7XG4gICAgICByZXR1cm4gYnVmW2ldXG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBidWYucmVhZFVJbnQxNkJFKGkgKiBpbmRleFNpemUpXG4gICAgfVxuICB9XG5cbiAgdmFyIGlcbiAgaWYgKGRpcikge1xuICAgIHZhciBmb3VuZEluZGV4ID0gLTFcbiAgICBmb3IgKGkgPSBieXRlT2Zmc2V0OyBpIDwgYXJyTGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmIChyZWFkKGFyciwgaSkgPT09IHJlYWQodmFsLCBmb3VuZEluZGV4ID09PSAtMSA/IDAgOiBpIC0gZm91bmRJbmRleCkpIHtcbiAgICAgICAgaWYgKGZvdW5kSW5kZXggPT09IC0xKSBmb3VuZEluZGV4ID0gaVxuICAgICAgICBpZiAoaSAtIGZvdW5kSW5kZXggKyAxID09PSB2YWxMZW5ndGgpIHJldHVybiBmb3VuZEluZGV4ICogaW5kZXhTaXplXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAoZm91bmRJbmRleCAhPT0gLTEpIGkgLT0gaSAtIGZvdW5kSW5kZXhcbiAgICAgICAgZm91bmRJbmRleCA9IC0xXG4gICAgICB9XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIGlmIChieXRlT2Zmc2V0ICsgdmFsTGVuZ3RoID4gYXJyTGVuZ3RoKSBieXRlT2Zmc2V0ID0gYXJyTGVuZ3RoIC0gdmFsTGVuZ3RoXG4gICAgZm9yIChpID0gYnl0ZU9mZnNldDsgaSA+PSAwOyBpLS0pIHtcbiAgICAgIHZhciBmb3VuZCA9IHRydWVcbiAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgdmFsTGVuZ3RoOyBqKyspIHtcbiAgICAgICAgaWYgKHJlYWQoYXJyLCBpICsgaikgIT09IHJlYWQodmFsLCBqKSkge1xuICAgICAgICAgIGZvdW5kID0gZmFsc2VcbiAgICAgICAgICBicmVha1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAoZm91bmQpIHJldHVybiBpXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIC0xXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUuaW5jbHVkZXMgPSBmdW5jdGlvbiBpbmNsdWRlcyAodmFsLCBieXRlT2Zmc2V0LCBlbmNvZGluZykge1xuICByZXR1cm4gdGhpcy5pbmRleE9mKHZhbCwgYnl0ZU9mZnNldCwgZW5jb2RpbmcpICE9PSAtMVxufVxuXG5CdWZmZXIucHJvdG90eXBlLmluZGV4T2YgPSBmdW5jdGlvbiBpbmRleE9mICh2YWwsIGJ5dGVPZmZzZXQsIGVuY29kaW5nKSB7XG4gIHJldHVybiBiaWRpcmVjdGlvbmFsSW5kZXhPZih0aGlzLCB2YWwsIGJ5dGVPZmZzZXQsIGVuY29kaW5nLCB0cnVlKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLmxhc3RJbmRleE9mID0gZnVuY3Rpb24gbGFzdEluZGV4T2YgKHZhbCwgYnl0ZU9mZnNldCwgZW5jb2RpbmcpIHtcbiAgcmV0dXJuIGJpZGlyZWN0aW9uYWxJbmRleE9mKHRoaXMsIHZhbCwgYnl0ZU9mZnNldCwgZW5jb2RpbmcsIGZhbHNlKVxufVxuXG5mdW5jdGlvbiBoZXhXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIG9mZnNldCA9IE51bWJlcihvZmZzZXQpIHx8IDBcbiAgdmFyIHJlbWFpbmluZyA9IGJ1Zi5sZW5ndGggLSBvZmZzZXRcbiAgaWYgKCFsZW5ndGgpIHtcbiAgICBsZW5ndGggPSByZW1haW5pbmdcbiAgfSBlbHNlIHtcbiAgICBsZW5ndGggPSBOdW1iZXIobGVuZ3RoKVxuICAgIGlmIChsZW5ndGggPiByZW1haW5pbmcpIHtcbiAgICAgIGxlbmd0aCA9IHJlbWFpbmluZ1xuICAgIH1cbiAgfVxuXG4gIC8vIG11c3QgYmUgYW4gZXZlbiBudW1iZXIgb2YgZGlnaXRzXG4gIHZhciBzdHJMZW4gPSBzdHJpbmcubGVuZ3RoXG4gIGlmIChzdHJMZW4gJSAyICE9PSAwKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdJbnZhbGlkIGhleCBzdHJpbmcnKVxuXG4gIGlmIChsZW5ndGggPiBzdHJMZW4gLyAyKSB7XG4gICAgbGVuZ3RoID0gc3RyTGVuIC8gMlxuICB9XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyArK2kpIHtcbiAgICB2YXIgcGFyc2VkID0gcGFyc2VJbnQoc3RyaW5nLnN1YnN0cihpICogMiwgMiksIDE2KVxuICAgIGlmIChudW1iZXJJc05hTihwYXJzZWQpKSByZXR1cm4gaVxuICAgIGJ1ZltvZmZzZXQgKyBpXSA9IHBhcnNlZFxuICB9XG4gIHJldHVybiBpXG59XG5cbmZ1bmN0aW9uIHV0ZjhXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHJldHVybiBibGl0QnVmZmVyKHV0ZjhUb0J5dGVzKHN0cmluZywgYnVmLmxlbmd0aCAtIG9mZnNldCksIGJ1Ziwgb2Zmc2V0LCBsZW5ndGgpXG59XG5cbmZ1bmN0aW9uIGFzY2lpV3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICByZXR1cm4gYmxpdEJ1ZmZlcihhc2NpaVRvQnl0ZXMoc3RyaW5nKSwgYnVmLCBvZmZzZXQsIGxlbmd0aClcbn1cblxuZnVuY3Rpb24gbGF0aW4xV3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICByZXR1cm4gYXNjaWlXcml0ZShidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG59XG5cbmZ1bmN0aW9uIGJhc2U2NFdyaXRlIChidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgcmV0dXJuIGJsaXRCdWZmZXIoYmFzZTY0VG9CeXRlcyhzdHJpbmcpLCBidWYsIG9mZnNldCwgbGVuZ3RoKVxufVxuXG5mdW5jdGlvbiB1Y3MyV3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICByZXR1cm4gYmxpdEJ1ZmZlcih1dGYxNmxlVG9CeXRlcyhzdHJpbmcsIGJ1Zi5sZW5ndGggLSBvZmZzZXQpLCBidWYsIG9mZnNldCwgbGVuZ3RoKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlID0gZnVuY3Rpb24gd3JpdGUgKHN0cmluZywgb2Zmc2V0LCBsZW5ndGgsIGVuY29kaW5nKSB7XG4gIC8vIEJ1ZmZlciN3cml0ZShzdHJpbmcpXG4gIGlmIChvZmZzZXQgPT09IHVuZGVmaW5lZCkge1xuICAgIGVuY29kaW5nID0gJ3V0ZjgnXG4gICAgbGVuZ3RoID0gdGhpcy5sZW5ndGhcbiAgICBvZmZzZXQgPSAwXG4gIC8vIEJ1ZmZlciN3cml0ZShzdHJpbmcsIGVuY29kaW5nKVxuICB9IGVsc2UgaWYgKGxlbmd0aCA9PT0gdW5kZWZpbmVkICYmIHR5cGVvZiBvZmZzZXQgPT09ICdzdHJpbmcnKSB7XG4gICAgZW5jb2RpbmcgPSBvZmZzZXRcbiAgICBsZW5ndGggPSB0aGlzLmxlbmd0aFxuICAgIG9mZnNldCA9IDBcbiAgLy8gQnVmZmVyI3dyaXRlKHN0cmluZywgb2Zmc2V0WywgbGVuZ3RoXVssIGVuY29kaW5nXSlcbiAgfSBlbHNlIGlmIChpc0Zpbml0ZShvZmZzZXQpKSB7XG4gICAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gICAgaWYgKGlzRmluaXRlKGxlbmd0aCkpIHtcbiAgICAgIGxlbmd0aCA9IGxlbmd0aCA+Pj4gMFxuICAgICAgaWYgKGVuY29kaW5nID09PSB1bmRlZmluZWQpIGVuY29kaW5nID0gJ3V0ZjgnXG4gICAgfSBlbHNlIHtcbiAgICAgIGVuY29kaW5nID0gbGVuZ3RoXG4gICAgICBsZW5ndGggPSB1bmRlZmluZWRcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgJ0J1ZmZlci53cml0ZShzdHJpbmcsIGVuY29kaW5nLCBvZmZzZXRbLCBsZW5ndGhdKSBpcyBubyBsb25nZXIgc3VwcG9ydGVkJ1xuICAgIClcbiAgfVxuXG4gIHZhciByZW1haW5pbmcgPSB0aGlzLmxlbmd0aCAtIG9mZnNldFxuICBpZiAobGVuZ3RoID09PSB1bmRlZmluZWQgfHwgbGVuZ3RoID4gcmVtYWluaW5nKSBsZW5ndGggPSByZW1haW5pbmdcblxuICBpZiAoKHN0cmluZy5sZW5ndGggPiAwICYmIChsZW5ndGggPCAwIHx8IG9mZnNldCA8IDApKSB8fCBvZmZzZXQgPiB0aGlzLmxlbmd0aCkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdBdHRlbXB0IHRvIHdyaXRlIG91dHNpZGUgYnVmZmVyIGJvdW5kcycpXG4gIH1cblxuICBpZiAoIWVuY29kaW5nKSBlbmNvZGluZyA9ICd1dGY4J1xuXG4gIHZhciBsb3dlcmVkQ2FzZSA9IGZhbHNlXG4gIGZvciAoOzspIHtcbiAgICBzd2l0Y2ggKGVuY29kaW5nKSB7XG4gICAgICBjYXNlICdoZXgnOlxuICAgICAgICByZXR1cm4gaGV4V3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcblxuICAgICAgY2FzZSAndXRmOCc6XG4gICAgICBjYXNlICd1dGYtOCc6XG4gICAgICAgIHJldHVybiB1dGY4V3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcblxuICAgICAgY2FzZSAnYXNjaWknOlxuICAgICAgICByZXR1cm4gYXNjaWlXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuXG4gICAgICBjYXNlICdsYXRpbjEnOlxuICAgICAgY2FzZSAnYmluYXJ5JzpcbiAgICAgICAgcmV0dXJuIGxhdGluMVdyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG5cbiAgICAgIGNhc2UgJ2Jhc2U2NCc6XG4gICAgICAgIC8vIFdhcm5pbmc6IG1heExlbmd0aCBub3QgdGFrZW4gaW50byBhY2NvdW50IGluIGJhc2U2NFdyaXRlXG4gICAgICAgIHJldHVybiBiYXNlNjRXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuXG4gICAgICBjYXNlICd1Y3MyJzpcbiAgICAgIGNhc2UgJ3Vjcy0yJzpcbiAgICAgIGNhc2UgJ3V0ZjE2bGUnOlxuICAgICAgY2FzZSAndXRmLTE2bGUnOlxuICAgICAgICByZXR1cm4gdWNzMldyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG5cbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGlmIChsb3dlcmVkQ2FzZSkgdGhyb3cgbmV3IFR5cGVFcnJvcignVW5rbm93biBlbmNvZGluZzogJyArIGVuY29kaW5nKVxuICAgICAgICBlbmNvZGluZyA9ICgnJyArIGVuY29kaW5nKS50b0xvd2VyQ2FzZSgpXG4gICAgICAgIGxvd2VyZWRDYXNlID0gdHJ1ZVxuICAgIH1cbiAgfVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnRvSlNPTiA9IGZ1bmN0aW9uIHRvSlNPTiAoKSB7XG4gIHJldHVybiB7XG4gICAgdHlwZTogJ0J1ZmZlcicsXG4gICAgZGF0YTogQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwodGhpcy5fYXJyIHx8IHRoaXMsIDApXG4gIH1cbn1cblxuZnVuY3Rpb24gYmFzZTY0U2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICBpZiAoc3RhcnQgPT09IDAgJiYgZW5kID09PSBidWYubGVuZ3RoKSB7XG4gICAgcmV0dXJuIGJhc2U2NC5mcm9tQnl0ZUFycmF5KGJ1ZilcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gYmFzZTY0LmZyb21CeXRlQXJyYXkoYnVmLnNsaWNlKHN0YXJ0LCBlbmQpKVxuICB9XG59XG5cbmZ1bmN0aW9uIHV0ZjhTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIGVuZCA9IE1hdGgubWluKGJ1Zi5sZW5ndGgsIGVuZClcbiAgdmFyIHJlcyA9IFtdXG5cbiAgdmFyIGkgPSBzdGFydFxuICB3aGlsZSAoaSA8IGVuZCkge1xuICAgIHZhciBmaXJzdEJ5dGUgPSBidWZbaV1cbiAgICB2YXIgY29kZVBvaW50ID0gbnVsbFxuICAgIHZhciBieXRlc1BlclNlcXVlbmNlID0gKGZpcnN0Qnl0ZSA+IDB4RUYpID8gNFxuICAgICAgOiAoZmlyc3RCeXRlID4gMHhERikgPyAzXG4gICAgICA6IChmaXJzdEJ5dGUgPiAweEJGKSA/IDJcbiAgICAgIDogMVxuXG4gICAgaWYgKGkgKyBieXRlc1BlclNlcXVlbmNlIDw9IGVuZCkge1xuICAgICAgdmFyIHNlY29uZEJ5dGUsIHRoaXJkQnl0ZSwgZm91cnRoQnl0ZSwgdGVtcENvZGVQb2ludFxuXG4gICAgICBzd2l0Y2ggKGJ5dGVzUGVyU2VxdWVuY2UpIHtcbiAgICAgICAgY2FzZSAxOlxuICAgICAgICAgIGlmIChmaXJzdEJ5dGUgPCAweDgwKSB7XG4gICAgICAgICAgICBjb2RlUG9pbnQgPSBmaXJzdEJ5dGVcbiAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWtcbiAgICAgICAgY2FzZSAyOlxuICAgICAgICAgIHNlY29uZEJ5dGUgPSBidWZbaSArIDFdXG4gICAgICAgICAgaWYgKChzZWNvbmRCeXRlICYgMHhDMCkgPT09IDB4ODApIHtcbiAgICAgICAgICAgIHRlbXBDb2RlUG9pbnQgPSAoZmlyc3RCeXRlICYgMHgxRikgPDwgMHg2IHwgKHNlY29uZEJ5dGUgJiAweDNGKVxuICAgICAgICAgICAgaWYgKHRlbXBDb2RlUG9pbnQgPiAweDdGKSB7XG4gICAgICAgICAgICAgIGNvZGVQb2ludCA9IHRlbXBDb2RlUG9pbnRcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWtcbiAgICAgICAgY2FzZSAzOlxuICAgICAgICAgIHNlY29uZEJ5dGUgPSBidWZbaSArIDFdXG4gICAgICAgICAgdGhpcmRCeXRlID0gYnVmW2kgKyAyXVxuICAgICAgICAgIGlmICgoc2Vjb25kQnl0ZSAmIDB4QzApID09PSAweDgwICYmICh0aGlyZEJ5dGUgJiAweEMwKSA9PT0gMHg4MCkge1xuICAgICAgICAgICAgdGVtcENvZGVQb2ludCA9IChmaXJzdEJ5dGUgJiAweEYpIDw8IDB4QyB8IChzZWNvbmRCeXRlICYgMHgzRikgPDwgMHg2IHwgKHRoaXJkQnl0ZSAmIDB4M0YpXG4gICAgICAgICAgICBpZiAodGVtcENvZGVQb2ludCA+IDB4N0ZGICYmICh0ZW1wQ29kZVBvaW50IDwgMHhEODAwIHx8IHRlbXBDb2RlUG9pbnQgPiAweERGRkYpKSB7XG4gICAgICAgICAgICAgIGNvZGVQb2ludCA9IHRlbXBDb2RlUG9pbnRcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWtcbiAgICAgICAgY2FzZSA0OlxuICAgICAgICAgIHNlY29uZEJ5dGUgPSBidWZbaSArIDFdXG4gICAgICAgICAgdGhpcmRCeXRlID0gYnVmW2kgKyAyXVxuICAgICAgICAgIGZvdXJ0aEJ5dGUgPSBidWZbaSArIDNdXG4gICAgICAgICAgaWYgKChzZWNvbmRCeXRlICYgMHhDMCkgPT09IDB4ODAgJiYgKHRoaXJkQnl0ZSAmIDB4QzApID09PSAweDgwICYmIChmb3VydGhCeXRlICYgMHhDMCkgPT09IDB4ODApIHtcbiAgICAgICAgICAgIHRlbXBDb2RlUG9pbnQgPSAoZmlyc3RCeXRlICYgMHhGKSA8PCAweDEyIHwgKHNlY29uZEJ5dGUgJiAweDNGKSA8PCAweEMgfCAodGhpcmRCeXRlICYgMHgzRikgPDwgMHg2IHwgKGZvdXJ0aEJ5dGUgJiAweDNGKVxuICAgICAgICAgICAgaWYgKHRlbXBDb2RlUG9pbnQgPiAweEZGRkYgJiYgdGVtcENvZGVQb2ludCA8IDB4MTEwMDAwKSB7XG4gICAgICAgICAgICAgIGNvZGVQb2ludCA9IHRlbXBDb2RlUG9pbnRcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGNvZGVQb2ludCA9PT0gbnVsbCkge1xuICAgICAgLy8gd2UgZGlkIG5vdCBnZW5lcmF0ZSBhIHZhbGlkIGNvZGVQb2ludCBzbyBpbnNlcnQgYVxuICAgICAgLy8gcmVwbGFjZW1lbnQgY2hhciAoVStGRkZEKSBhbmQgYWR2YW5jZSBvbmx5IDEgYnl0ZVxuICAgICAgY29kZVBvaW50ID0gMHhGRkZEXG4gICAgICBieXRlc1BlclNlcXVlbmNlID0gMVxuICAgIH0gZWxzZSBpZiAoY29kZVBvaW50ID4gMHhGRkZGKSB7XG4gICAgICAvLyBlbmNvZGUgdG8gdXRmMTYgKHN1cnJvZ2F0ZSBwYWlyIGRhbmNlKVxuICAgICAgY29kZVBvaW50IC09IDB4MTAwMDBcbiAgICAgIHJlcy5wdXNoKGNvZGVQb2ludCA+Pj4gMTAgJiAweDNGRiB8IDB4RDgwMClcbiAgICAgIGNvZGVQb2ludCA9IDB4REMwMCB8IGNvZGVQb2ludCAmIDB4M0ZGXG4gICAgfVxuXG4gICAgcmVzLnB1c2goY29kZVBvaW50KVxuICAgIGkgKz0gYnl0ZXNQZXJTZXF1ZW5jZVxuICB9XG5cbiAgcmV0dXJuIGRlY29kZUNvZGVQb2ludHNBcnJheShyZXMpXG59XG5cbi8vIEJhc2VkIG9uIGh0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9hLzIyNzQ3MjcyLzY4MDc0MiwgdGhlIGJyb3dzZXIgd2l0aFxuLy8gdGhlIGxvd2VzdCBsaW1pdCBpcyBDaHJvbWUsIHdpdGggMHgxMDAwMCBhcmdzLlxuLy8gV2UgZ28gMSBtYWduaXR1ZGUgbGVzcywgZm9yIHNhZmV0eVxudmFyIE1BWF9BUkdVTUVOVFNfTEVOR1RIID0gMHgxMDAwXG5cbmZ1bmN0aW9uIGRlY29kZUNvZGVQb2ludHNBcnJheSAoY29kZVBvaW50cykge1xuICB2YXIgbGVuID0gY29kZVBvaW50cy5sZW5ndGhcbiAgaWYgKGxlbiA8PSBNQVhfQVJHVU1FTlRTX0xFTkdUSCkge1xuICAgIHJldHVybiBTdHJpbmcuZnJvbUNoYXJDb2RlLmFwcGx5KFN0cmluZywgY29kZVBvaW50cykgLy8gYXZvaWQgZXh0cmEgc2xpY2UoKVxuICB9XG5cbiAgLy8gRGVjb2RlIGluIGNodW5rcyB0byBhdm9pZCBcImNhbGwgc3RhY2sgc2l6ZSBleGNlZWRlZFwiLlxuICB2YXIgcmVzID0gJydcbiAgdmFyIGkgPSAwXG4gIHdoaWxlIChpIDwgbGVuKSB7XG4gICAgcmVzICs9IFN0cmluZy5mcm9tQ2hhckNvZGUuYXBwbHkoXG4gICAgICBTdHJpbmcsXG4gICAgICBjb2RlUG9pbnRzLnNsaWNlKGksIGkgKz0gTUFYX0FSR1VNRU5UU19MRU5HVEgpXG4gICAgKVxuICB9XG4gIHJldHVybiByZXNcbn1cblxuZnVuY3Rpb24gYXNjaWlTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIHZhciByZXQgPSAnJ1xuICBlbmQgPSBNYXRoLm1pbihidWYubGVuZ3RoLCBlbmQpXG5cbiAgZm9yICh2YXIgaSA9IHN0YXJ0OyBpIDwgZW5kOyArK2kpIHtcbiAgICByZXQgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShidWZbaV0gJiAweDdGKVxuICB9XG4gIHJldHVybiByZXRcbn1cblxuZnVuY3Rpb24gbGF0aW4xU2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICB2YXIgcmV0ID0gJydcbiAgZW5kID0gTWF0aC5taW4oYnVmLmxlbmd0aCwgZW5kKVxuXG4gIGZvciAodmFyIGkgPSBzdGFydDsgaSA8IGVuZDsgKytpKSB7XG4gICAgcmV0ICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoYnVmW2ldKVxuICB9XG4gIHJldHVybiByZXRcbn1cblxuZnVuY3Rpb24gaGV4U2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICB2YXIgbGVuID0gYnVmLmxlbmd0aFxuXG4gIGlmICghc3RhcnQgfHwgc3RhcnQgPCAwKSBzdGFydCA9IDBcbiAgaWYgKCFlbmQgfHwgZW5kIDwgMCB8fCBlbmQgPiBsZW4pIGVuZCA9IGxlblxuXG4gIHZhciBvdXQgPSAnJ1xuICBmb3IgKHZhciBpID0gc3RhcnQ7IGkgPCBlbmQ7ICsraSkge1xuICAgIG91dCArPSB0b0hleChidWZbaV0pXG4gIH1cbiAgcmV0dXJuIG91dFxufVxuXG5mdW5jdGlvbiB1dGYxNmxlU2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICB2YXIgYnl0ZXMgPSBidWYuc2xpY2Uoc3RhcnQsIGVuZClcbiAgdmFyIHJlcyA9ICcnXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgYnl0ZXMubGVuZ3RoOyBpICs9IDIpIHtcbiAgICByZXMgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShieXRlc1tpXSArIChieXRlc1tpICsgMV0gKiAyNTYpKVxuICB9XG4gIHJldHVybiByZXNcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5zbGljZSA9IGZ1bmN0aW9uIHNsaWNlIChzdGFydCwgZW5kKSB7XG4gIHZhciBsZW4gPSB0aGlzLmxlbmd0aFxuICBzdGFydCA9IH5+c3RhcnRcbiAgZW5kID0gZW5kID09PSB1bmRlZmluZWQgPyBsZW4gOiB+fmVuZFxuXG4gIGlmIChzdGFydCA8IDApIHtcbiAgICBzdGFydCArPSBsZW5cbiAgICBpZiAoc3RhcnQgPCAwKSBzdGFydCA9IDBcbiAgfSBlbHNlIGlmIChzdGFydCA+IGxlbikge1xuICAgIHN0YXJ0ID0gbGVuXG4gIH1cblxuICBpZiAoZW5kIDwgMCkge1xuICAgIGVuZCArPSBsZW5cbiAgICBpZiAoZW5kIDwgMCkgZW5kID0gMFxuICB9IGVsc2UgaWYgKGVuZCA+IGxlbikge1xuICAgIGVuZCA9IGxlblxuICB9XG5cbiAgaWYgKGVuZCA8IHN0YXJ0KSBlbmQgPSBzdGFydFxuXG4gIHZhciBuZXdCdWYgPSB0aGlzLnN1YmFycmF5KHN0YXJ0LCBlbmQpXG4gIC8vIFJldHVybiBhbiBhdWdtZW50ZWQgYFVpbnQ4QXJyYXlgIGluc3RhbmNlXG4gIG5ld0J1Zi5fX3Byb3RvX18gPSBCdWZmZXIucHJvdG90eXBlXG4gIHJldHVybiBuZXdCdWZcbn1cblxuLypcbiAqIE5lZWQgdG8gbWFrZSBzdXJlIHRoYXQgYnVmZmVyIGlzbid0IHRyeWluZyB0byB3cml0ZSBvdXQgb2YgYm91bmRzLlxuICovXG5mdW5jdGlvbiBjaGVja09mZnNldCAob2Zmc2V0LCBleHQsIGxlbmd0aCkge1xuICBpZiAoKG9mZnNldCAlIDEpICE9PSAwIHx8IG9mZnNldCA8IDApIHRocm93IG5ldyBSYW5nZUVycm9yKCdvZmZzZXQgaXMgbm90IHVpbnQnKVxuICBpZiAob2Zmc2V0ICsgZXh0ID4gbGVuZ3RoKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignVHJ5aW5nIHRvIGFjY2VzcyBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnRMRSA9IGZ1bmN0aW9uIHJlYWRVSW50TEUgKG9mZnNldCwgYnl0ZUxlbmd0aCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGJ5dGVMZW5ndGggPSBieXRlTGVuZ3RoID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgYnl0ZUxlbmd0aCwgdGhpcy5sZW5ndGgpXG5cbiAgdmFyIHZhbCA9IHRoaXNbb2Zmc2V0XVxuICB2YXIgbXVsID0gMVxuICB2YXIgaSA9IDBcbiAgd2hpbGUgKCsraSA8IGJ5dGVMZW5ndGggJiYgKG11bCAqPSAweDEwMCkpIHtcbiAgICB2YWwgKz0gdGhpc1tvZmZzZXQgKyBpXSAqIG11bFxuICB9XG5cbiAgcmV0dXJuIHZhbFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50QkUgPSBmdW5jdGlvbiByZWFkVUludEJFIChvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBieXRlTGVuZ3RoID0gYnl0ZUxlbmd0aCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgY2hlY2tPZmZzZXQob2Zmc2V0LCBieXRlTGVuZ3RoLCB0aGlzLmxlbmd0aClcbiAgfVxuXG4gIHZhciB2YWwgPSB0aGlzW29mZnNldCArIC0tYnl0ZUxlbmd0aF1cbiAgdmFyIG11bCA9IDFcbiAgd2hpbGUgKGJ5dGVMZW5ndGggPiAwICYmIChtdWwgKj0gMHgxMDApKSB7XG4gICAgdmFsICs9IHRoaXNbb2Zmc2V0ICsgLS1ieXRlTGVuZ3RoXSAqIG11bFxuICB9XG5cbiAgcmV0dXJuIHZhbFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50OCA9IGZ1bmN0aW9uIHJlYWRVSW50OCAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCAxLCB0aGlzLmxlbmd0aClcbiAgcmV0dXJuIHRoaXNbb2Zmc2V0XVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50MTZMRSA9IGZ1bmN0aW9uIHJlYWRVSW50MTZMRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCAyLCB0aGlzLmxlbmd0aClcbiAgcmV0dXJuIHRoaXNbb2Zmc2V0XSB8ICh0aGlzW29mZnNldCArIDFdIDw8IDgpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnQxNkJFID0gZnVuY3Rpb24gcmVhZFVJbnQxNkJFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDIsIHRoaXMubGVuZ3RoKVxuICByZXR1cm4gKHRoaXNbb2Zmc2V0XSA8PCA4KSB8IHRoaXNbb2Zmc2V0ICsgMV1cbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDMyTEUgPSBmdW5jdGlvbiByZWFkVUludDMyTEUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgNCwgdGhpcy5sZW5ndGgpXG5cbiAgcmV0dXJuICgodGhpc1tvZmZzZXRdKSB8XG4gICAgICAodGhpc1tvZmZzZXQgKyAxXSA8PCA4KSB8XG4gICAgICAodGhpc1tvZmZzZXQgKyAyXSA8PCAxNikpICtcbiAgICAgICh0aGlzW29mZnNldCArIDNdICogMHgxMDAwMDAwKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50MzJCRSA9IGZ1bmN0aW9uIHJlYWRVSW50MzJCRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCA0LCB0aGlzLmxlbmd0aClcblxuICByZXR1cm4gKHRoaXNbb2Zmc2V0XSAqIDB4MTAwMDAwMCkgK1xuICAgICgodGhpc1tvZmZzZXQgKyAxXSA8PCAxNikgfFxuICAgICh0aGlzW29mZnNldCArIDJdIDw8IDgpIHxcbiAgICB0aGlzW29mZnNldCArIDNdKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnRMRSA9IGZ1bmN0aW9uIHJlYWRJbnRMRSAob2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgYnl0ZUxlbmd0aCA9IGJ5dGVMZW5ndGggPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCBieXRlTGVuZ3RoLCB0aGlzLmxlbmd0aClcblxuICB2YXIgdmFsID0gdGhpc1tvZmZzZXRdXG4gIHZhciBtdWwgPSAxXG4gIHZhciBpID0gMFxuICB3aGlsZSAoKytpIDwgYnl0ZUxlbmd0aCAmJiAobXVsICo9IDB4MTAwKSkge1xuICAgIHZhbCArPSB0aGlzW29mZnNldCArIGldICogbXVsXG4gIH1cbiAgbXVsICo9IDB4ODBcblxuICBpZiAodmFsID49IG11bCkgdmFsIC09IE1hdGgucG93KDIsIDggKiBieXRlTGVuZ3RoKVxuXG4gIHJldHVybiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50QkUgPSBmdW5jdGlvbiByZWFkSW50QkUgKG9mZnNldCwgYnl0ZUxlbmd0aCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGJ5dGVMZW5ndGggPSBieXRlTGVuZ3RoID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgYnl0ZUxlbmd0aCwgdGhpcy5sZW5ndGgpXG5cbiAgdmFyIGkgPSBieXRlTGVuZ3RoXG4gIHZhciBtdWwgPSAxXG4gIHZhciB2YWwgPSB0aGlzW29mZnNldCArIC0taV1cbiAgd2hpbGUgKGkgPiAwICYmIChtdWwgKj0gMHgxMDApKSB7XG4gICAgdmFsICs9IHRoaXNbb2Zmc2V0ICsgLS1pXSAqIG11bFxuICB9XG4gIG11bCAqPSAweDgwXG5cbiAgaWYgKHZhbCA+PSBtdWwpIHZhbCAtPSBNYXRoLnBvdygyLCA4ICogYnl0ZUxlbmd0aClcblxuICByZXR1cm4gdmFsXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDggPSBmdW5jdGlvbiByZWFkSW50OCAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCAxLCB0aGlzLmxlbmd0aClcbiAgaWYgKCEodGhpc1tvZmZzZXRdICYgMHg4MCkpIHJldHVybiAodGhpc1tvZmZzZXRdKVxuICByZXR1cm4gKCgweGZmIC0gdGhpc1tvZmZzZXRdICsgMSkgKiAtMSlcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50MTZMRSA9IGZ1bmN0aW9uIHJlYWRJbnQxNkxFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDIsIHRoaXMubGVuZ3RoKVxuICB2YXIgdmFsID0gdGhpc1tvZmZzZXRdIHwgKHRoaXNbb2Zmc2V0ICsgMV0gPDwgOClcbiAgcmV0dXJuICh2YWwgJiAweDgwMDApID8gdmFsIHwgMHhGRkZGMDAwMCA6IHZhbFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnQxNkJFID0gZnVuY3Rpb24gcmVhZEludDE2QkUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgMiwgdGhpcy5sZW5ndGgpXG4gIHZhciB2YWwgPSB0aGlzW29mZnNldCArIDFdIHwgKHRoaXNbb2Zmc2V0XSA8PCA4KVxuICByZXR1cm4gKHZhbCAmIDB4ODAwMCkgPyB2YWwgfCAweEZGRkYwMDAwIDogdmFsXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDMyTEUgPSBmdW5jdGlvbiByZWFkSW50MzJMRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCA0LCB0aGlzLmxlbmd0aClcblxuICByZXR1cm4gKHRoaXNbb2Zmc2V0XSkgfFxuICAgICh0aGlzW29mZnNldCArIDFdIDw8IDgpIHxcbiAgICAodGhpc1tvZmZzZXQgKyAyXSA8PCAxNikgfFxuICAgICh0aGlzW29mZnNldCArIDNdIDw8IDI0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnQzMkJFID0gZnVuY3Rpb24gcmVhZEludDMyQkUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgNCwgdGhpcy5sZW5ndGgpXG5cbiAgcmV0dXJuICh0aGlzW29mZnNldF0gPDwgMjQpIHxcbiAgICAodGhpc1tvZmZzZXQgKyAxXSA8PCAxNikgfFxuICAgICh0aGlzW29mZnNldCArIDJdIDw8IDgpIHxcbiAgICAodGhpc1tvZmZzZXQgKyAzXSlcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkRmxvYXRMRSA9IGZ1bmN0aW9uIHJlYWRGbG9hdExFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDQsIHRoaXMubGVuZ3RoKVxuICByZXR1cm4gaWVlZTc1NC5yZWFkKHRoaXMsIG9mZnNldCwgdHJ1ZSwgMjMsIDQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEZsb2F0QkUgPSBmdW5jdGlvbiByZWFkRmxvYXRCRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCA0LCB0aGlzLmxlbmd0aClcbiAgcmV0dXJuIGllZWU3NTQucmVhZCh0aGlzLCBvZmZzZXQsIGZhbHNlLCAyMywgNClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkRG91YmxlTEUgPSBmdW5jdGlvbiByZWFkRG91YmxlTEUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgOCwgdGhpcy5sZW5ndGgpXG4gIHJldHVybiBpZWVlNzU0LnJlYWQodGhpcywgb2Zmc2V0LCB0cnVlLCA1MiwgOClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkRG91YmxlQkUgPSBmdW5jdGlvbiByZWFkRG91YmxlQkUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgOCwgdGhpcy5sZW5ndGgpXG4gIHJldHVybiBpZWVlNzU0LnJlYWQodGhpcywgb2Zmc2V0LCBmYWxzZSwgNTIsIDgpXG59XG5cbmZ1bmN0aW9uIGNoZWNrSW50IChidWYsIHZhbHVlLCBvZmZzZXQsIGV4dCwgbWF4LCBtaW4pIHtcbiAgaWYgKCFCdWZmZXIuaXNCdWZmZXIoYnVmKSkgdGhyb3cgbmV3IFR5cGVFcnJvcignXCJidWZmZXJcIiBhcmd1bWVudCBtdXN0IGJlIGEgQnVmZmVyIGluc3RhbmNlJylcbiAgaWYgKHZhbHVlID4gbWF4IHx8IHZhbHVlIDwgbWluKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignXCJ2YWx1ZVwiIGFyZ3VtZW50IGlzIG91dCBvZiBib3VuZHMnKVxuICBpZiAob2Zmc2V0ICsgZXh0ID4gYnVmLmxlbmd0aCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0luZGV4IG91dCBvZiByYW5nZScpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50TEUgPSBmdW5jdGlvbiB3cml0ZVVJbnRMRSAodmFsdWUsIG9mZnNldCwgYnl0ZUxlbmd0aCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGJ5dGVMZW5ndGggPSBieXRlTGVuZ3RoID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICB2YXIgbWF4Qnl0ZXMgPSBNYXRoLnBvdygyLCA4ICogYnl0ZUxlbmd0aCkgLSAxXG4gICAgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgYnl0ZUxlbmd0aCwgbWF4Qnl0ZXMsIDApXG4gIH1cblxuICB2YXIgbXVsID0gMVxuICB2YXIgaSA9IDBcbiAgdGhpc1tvZmZzZXRdID0gdmFsdWUgJiAweEZGXG4gIHdoaWxlICgrK2kgPCBieXRlTGVuZ3RoICYmIChtdWwgKj0gMHgxMDApKSB7XG4gICAgdGhpc1tvZmZzZXQgKyBpXSA9ICh2YWx1ZSAvIG11bCkgJiAweEZGXG4gIH1cblxuICByZXR1cm4gb2Zmc2V0ICsgYnl0ZUxlbmd0aFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludEJFID0gZnVuY3Rpb24gd3JpdGVVSW50QkUgKHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBieXRlTGVuZ3RoID0gYnl0ZUxlbmd0aCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgdmFyIG1heEJ5dGVzID0gTWF0aC5wb3coMiwgOCAqIGJ5dGVMZW5ndGgpIC0gMVxuICAgIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIG1heEJ5dGVzLCAwKVxuICB9XG5cbiAgdmFyIGkgPSBieXRlTGVuZ3RoIC0gMVxuICB2YXIgbXVsID0gMVxuICB0aGlzW29mZnNldCArIGldID0gdmFsdWUgJiAweEZGXG4gIHdoaWxlICgtLWkgPj0gMCAmJiAobXVsICo9IDB4MTAwKSkge1xuICAgIHRoaXNbb2Zmc2V0ICsgaV0gPSAodmFsdWUgLyBtdWwpICYgMHhGRlxuICB9XG5cbiAgcmV0dXJuIG9mZnNldCArIGJ5dGVMZW5ndGhcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnQ4ID0gZnVuY3Rpb24gd3JpdGVVSW50OCAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDEsIDB4ZmYsIDApXG4gIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSAmIDB4ZmYpXG4gIHJldHVybiBvZmZzZXQgKyAxXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MTZMRSA9IGZ1bmN0aW9uIHdyaXRlVUludDE2TEUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCAyLCAweGZmZmYsIDApXG4gIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSAmIDB4ZmYpXG4gIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgPj4+IDgpXG4gIHJldHVybiBvZmZzZXQgKyAyXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MTZCRSA9IGZ1bmN0aW9uIHdyaXRlVUludDE2QkUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCAyLCAweGZmZmYsIDApXG4gIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSA+Pj4gOClcbiAgdGhpc1tvZmZzZXQgKyAxXSA9ICh2YWx1ZSAmIDB4ZmYpXG4gIHJldHVybiBvZmZzZXQgKyAyXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MzJMRSA9IGZ1bmN0aW9uIHdyaXRlVUludDMyTEUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCA0LCAweGZmZmZmZmZmLCAwKVxuICB0aGlzW29mZnNldCArIDNdID0gKHZhbHVlID4+PiAyNClcbiAgdGhpc1tvZmZzZXQgKyAyXSA9ICh2YWx1ZSA+Pj4gMTYpXG4gIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgPj4+IDgpXG4gIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSAmIDB4ZmYpXG4gIHJldHVybiBvZmZzZXQgKyA0XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MzJCRSA9IGZ1bmN0aW9uIHdyaXRlVUludDMyQkUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCA0LCAweGZmZmZmZmZmLCAwKVxuICB0aGlzW29mZnNldF0gPSAodmFsdWUgPj4+IDI0KVxuICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlID4+PiAxNilcbiAgdGhpc1tvZmZzZXQgKyAyXSA9ICh2YWx1ZSA+Pj4gOClcbiAgdGhpc1tvZmZzZXQgKyAzXSA9ICh2YWx1ZSAmIDB4ZmYpXG4gIHJldHVybiBvZmZzZXQgKyA0XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnRMRSA9IGZ1bmN0aW9uIHdyaXRlSW50TEUgKHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgdmFyIGxpbWl0ID0gTWF0aC5wb3coMiwgKDggKiBieXRlTGVuZ3RoKSAtIDEpXG5cbiAgICBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBsaW1pdCAtIDEsIC1saW1pdClcbiAgfVxuXG4gIHZhciBpID0gMFxuICB2YXIgbXVsID0gMVxuICB2YXIgc3ViID0gMFxuICB0aGlzW29mZnNldF0gPSB2YWx1ZSAmIDB4RkZcbiAgd2hpbGUgKCsraSA8IGJ5dGVMZW5ndGggJiYgKG11bCAqPSAweDEwMCkpIHtcbiAgICBpZiAodmFsdWUgPCAwICYmIHN1YiA9PT0gMCAmJiB0aGlzW29mZnNldCArIGkgLSAxXSAhPT0gMCkge1xuICAgICAgc3ViID0gMVxuICAgIH1cbiAgICB0aGlzW29mZnNldCArIGldID0gKCh2YWx1ZSAvIG11bCkgPj4gMCkgLSBzdWIgJiAweEZGXG4gIH1cblxuICByZXR1cm4gb2Zmc2V0ICsgYnl0ZUxlbmd0aFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50QkUgPSBmdW5jdGlvbiB3cml0ZUludEJFICh2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIHZhciBsaW1pdCA9IE1hdGgucG93KDIsICg4ICogYnl0ZUxlbmd0aCkgLSAxKVxuXG4gICAgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgYnl0ZUxlbmd0aCwgbGltaXQgLSAxLCAtbGltaXQpXG4gIH1cblxuICB2YXIgaSA9IGJ5dGVMZW5ndGggLSAxXG4gIHZhciBtdWwgPSAxXG4gIHZhciBzdWIgPSAwXG4gIHRoaXNbb2Zmc2V0ICsgaV0gPSB2YWx1ZSAmIDB4RkZcbiAgd2hpbGUgKC0taSA+PSAwICYmIChtdWwgKj0gMHgxMDApKSB7XG4gICAgaWYgKHZhbHVlIDwgMCAmJiBzdWIgPT09IDAgJiYgdGhpc1tvZmZzZXQgKyBpICsgMV0gIT09IDApIHtcbiAgICAgIHN1YiA9IDFcbiAgICB9XG4gICAgdGhpc1tvZmZzZXQgKyBpXSA9ICgodmFsdWUgLyBtdWwpID4+IDApIC0gc3ViICYgMHhGRlxuICB9XG5cbiAgcmV0dXJuIG9mZnNldCArIGJ5dGVMZW5ndGhcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDggPSBmdW5jdGlvbiB3cml0ZUludDggKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCAxLCAweDdmLCAtMHg4MClcbiAgaWYgKHZhbHVlIDwgMCkgdmFsdWUgPSAweGZmICsgdmFsdWUgKyAxXG4gIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSAmIDB4ZmYpXG4gIHJldHVybiBvZmZzZXQgKyAxXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnQxNkxFID0gZnVuY3Rpb24gd3JpdGVJbnQxNkxFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgMiwgMHg3ZmZmLCAtMHg4MDAwKVxuICB0aGlzW29mZnNldF0gPSAodmFsdWUgJiAweGZmKVxuICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlID4+PiA4KVxuICByZXR1cm4gb2Zmc2V0ICsgMlxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50MTZCRSA9IGZ1bmN0aW9uIHdyaXRlSW50MTZCRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDIsIDB4N2ZmZiwgLTB4ODAwMClcbiAgdGhpc1tvZmZzZXRdID0gKHZhbHVlID4+PiA4KVxuICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlICYgMHhmZilcbiAgcmV0dXJuIG9mZnNldCArIDJcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDMyTEUgPSBmdW5jdGlvbiB3cml0ZUludDMyTEUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCA0LCAweDdmZmZmZmZmLCAtMHg4MDAwMDAwMClcbiAgdGhpc1tvZmZzZXRdID0gKHZhbHVlICYgMHhmZilcbiAgdGhpc1tvZmZzZXQgKyAxXSA9ICh2YWx1ZSA+Pj4gOClcbiAgdGhpc1tvZmZzZXQgKyAyXSA9ICh2YWx1ZSA+Pj4gMTYpXG4gIHRoaXNbb2Zmc2V0ICsgM10gPSAodmFsdWUgPj4+IDI0KVxuICByZXR1cm4gb2Zmc2V0ICsgNFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50MzJCRSA9IGZ1bmN0aW9uIHdyaXRlSW50MzJCRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDQsIDB4N2ZmZmZmZmYsIC0weDgwMDAwMDAwKVxuICBpZiAodmFsdWUgPCAwKSB2YWx1ZSA9IDB4ZmZmZmZmZmYgKyB2YWx1ZSArIDFcbiAgdGhpc1tvZmZzZXRdID0gKHZhbHVlID4+PiAyNClcbiAgdGhpc1tvZmZzZXQgKyAxXSA9ICh2YWx1ZSA+Pj4gMTYpXG4gIHRoaXNbb2Zmc2V0ICsgMl0gPSAodmFsdWUgPj4+IDgpXG4gIHRoaXNbb2Zmc2V0ICsgM10gPSAodmFsdWUgJiAweGZmKVxuICByZXR1cm4gb2Zmc2V0ICsgNFxufVxuXG5mdW5jdGlvbiBjaGVja0lFRUU3NTQgKGJ1ZiwgdmFsdWUsIG9mZnNldCwgZXh0LCBtYXgsIG1pbikge1xuICBpZiAob2Zmc2V0ICsgZXh0ID4gYnVmLmxlbmd0aCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0luZGV4IG91dCBvZiByYW5nZScpXG4gIGlmIChvZmZzZXQgPCAwKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignSW5kZXggb3V0IG9mIHJhbmdlJylcbn1cblxuZnVuY3Rpb24gd3JpdGVGbG9hdCAoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgY2hlY2tJRUVFNzU0KGJ1ZiwgdmFsdWUsIG9mZnNldCwgNCwgMy40MDI4MjM0NjYzODUyODg2ZSszOCwgLTMuNDAyODIzNDY2Mzg1Mjg4NmUrMzgpXG4gIH1cbiAgaWVlZTc1NC53cml0ZShidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgMjMsIDQpXG4gIHJldHVybiBvZmZzZXQgKyA0XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVGbG9hdExFID0gZnVuY3Rpb24gd3JpdGVGbG9hdExFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gd3JpdGVGbG9hdCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUZsb2F0QkUgPSBmdW5jdGlvbiB3cml0ZUZsb2F0QkUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiB3cml0ZUZsb2F0KHRoaXMsIHZhbHVlLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydClcbn1cblxuZnVuY3Rpb24gd3JpdGVEb3VibGUgKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGNoZWNrSUVFRTc1NChidWYsIHZhbHVlLCBvZmZzZXQsIDgsIDEuNzk3NjkzMTM0ODYyMzE1N0UrMzA4LCAtMS43OTc2OTMxMzQ4NjIzMTU3RSszMDgpXG4gIH1cbiAgaWVlZTc1NC53cml0ZShidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgNTIsIDgpXG4gIHJldHVybiBvZmZzZXQgKyA4XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVEb3VibGVMRSA9IGZ1bmN0aW9uIHdyaXRlRG91YmxlTEUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiB3cml0ZURvdWJsZSh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZURvdWJsZUJFID0gZnVuY3Rpb24gd3JpdGVEb3VibGVCRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIHdyaXRlRG91YmxlKHRoaXMsIHZhbHVlLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydClcbn1cblxuLy8gY29weSh0YXJnZXRCdWZmZXIsIHRhcmdldFN0YXJ0PTAsIHNvdXJjZVN0YXJ0PTAsIHNvdXJjZUVuZD1idWZmZXIubGVuZ3RoKVxuQnVmZmVyLnByb3RvdHlwZS5jb3B5ID0gZnVuY3Rpb24gY29weSAodGFyZ2V0LCB0YXJnZXRTdGFydCwgc3RhcnQsIGVuZCkge1xuICBpZiAoIXN0YXJ0KSBzdGFydCA9IDBcbiAgaWYgKCFlbmQgJiYgZW5kICE9PSAwKSBlbmQgPSB0aGlzLmxlbmd0aFxuICBpZiAodGFyZ2V0U3RhcnQgPj0gdGFyZ2V0Lmxlbmd0aCkgdGFyZ2V0U3RhcnQgPSB0YXJnZXQubGVuZ3RoXG4gIGlmICghdGFyZ2V0U3RhcnQpIHRhcmdldFN0YXJ0ID0gMFxuICBpZiAoZW5kID4gMCAmJiBlbmQgPCBzdGFydCkgZW5kID0gc3RhcnRcblxuICAvLyBDb3B5IDAgYnl0ZXM7IHdlJ3JlIGRvbmVcbiAgaWYgKGVuZCA9PT0gc3RhcnQpIHJldHVybiAwXG4gIGlmICh0YXJnZXQubGVuZ3RoID09PSAwIHx8IHRoaXMubGVuZ3RoID09PSAwKSByZXR1cm4gMFxuXG4gIC8vIEZhdGFsIGVycm9yIGNvbmRpdGlvbnNcbiAgaWYgKHRhcmdldFN0YXJ0IDwgMCkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCd0YXJnZXRTdGFydCBvdXQgb2YgYm91bmRzJylcbiAgfVxuICBpZiAoc3RhcnQgPCAwIHx8IHN0YXJ0ID49IHRoaXMubGVuZ3RoKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignc291cmNlU3RhcnQgb3V0IG9mIGJvdW5kcycpXG4gIGlmIChlbmQgPCAwKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignc291cmNlRW5kIG91dCBvZiBib3VuZHMnKVxuXG4gIC8vIEFyZSB3ZSBvb2I/XG4gIGlmIChlbmQgPiB0aGlzLmxlbmd0aCkgZW5kID0gdGhpcy5sZW5ndGhcbiAgaWYgKHRhcmdldC5sZW5ndGggLSB0YXJnZXRTdGFydCA8IGVuZCAtIHN0YXJ0KSB7XG4gICAgZW5kID0gdGFyZ2V0Lmxlbmd0aCAtIHRhcmdldFN0YXJ0ICsgc3RhcnRcbiAgfVxuXG4gIHZhciBsZW4gPSBlbmQgLSBzdGFydFxuICB2YXIgaVxuXG4gIGlmICh0aGlzID09PSB0YXJnZXQgJiYgc3RhcnQgPCB0YXJnZXRTdGFydCAmJiB0YXJnZXRTdGFydCA8IGVuZCkge1xuICAgIC8vIGRlc2NlbmRpbmcgY29weSBmcm9tIGVuZFxuICAgIGZvciAoaSA9IGxlbiAtIDE7IGkgPj0gMDsgLS1pKSB7XG4gICAgICB0YXJnZXRbaSArIHRhcmdldFN0YXJ0XSA9IHRoaXNbaSArIHN0YXJ0XVxuICAgIH1cbiAgfSBlbHNlIGlmIChsZW4gPCAxMDAwKSB7XG4gICAgLy8gYXNjZW5kaW5nIGNvcHkgZnJvbSBzdGFydFxuICAgIGZvciAoaSA9IDA7IGkgPCBsZW47ICsraSkge1xuICAgICAgdGFyZ2V0W2kgKyB0YXJnZXRTdGFydF0gPSB0aGlzW2kgKyBzdGFydF1cbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgVWludDhBcnJheS5wcm90b3R5cGUuc2V0LmNhbGwoXG4gICAgICB0YXJnZXQsXG4gICAgICB0aGlzLnN1YmFycmF5KHN0YXJ0LCBzdGFydCArIGxlbiksXG4gICAgICB0YXJnZXRTdGFydFxuICAgIClcbiAgfVxuXG4gIHJldHVybiBsZW5cbn1cblxuLy8gVXNhZ2U6XG4vLyAgICBidWZmZXIuZmlsbChudW1iZXJbLCBvZmZzZXRbLCBlbmRdXSlcbi8vICAgIGJ1ZmZlci5maWxsKGJ1ZmZlclssIG9mZnNldFssIGVuZF1dKVxuLy8gICAgYnVmZmVyLmZpbGwoc3RyaW5nWywgb2Zmc2V0WywgZW5kXV1bLCBlbmNvZGluZ10pXG5CdWZmZXIucHJvdG90eXBlLmZpbGwgPSBmdW5jdGlvbiBmaWxsICh2YWwsIHN0YXJ0LCBlbmQsIGVuY29kaW5nKSB7XG4gIC8vIEhhbmRsZSBzdHJpbmcgY2FzZXM6XG4gIGlmICh0eXBlb2YgdmFsID09PSAnc3RyaW5nJykge1xuICAgIGlmICh0eXBlb2Ygc3RhcnQgPT09ICdzdHJpbmcnKSB7XG4gICAgICBlbmNvZGluZyA9IHN0YXJ0XG4gICAgICBzdGFydCA9IDBcbiAgICAgIGVuZCA9IHRoaXMubGVuZ3RoXG4gICAgfSBlbHNlIGlmICh0eXBlb2YgZW5kID09PSAnc3RyaW5nJykge1xuICAgICAgZW5jb2RpbmcgPSBlbmRcbiAgICAgIGVuZCA9IHRoaXMubGVuZ3RoXG4gICAgfVxuICAgIGlmICh2YWwubGVuZ3RoID09PSAxKSB7XG4gICAgICB2YXIgY29kZSA9IHZhbC5jaGFyQ29kZUF0KDApXG4gICAgICBpZiAoY29kZSA8IDI1Nikge1xuICAgICAgICB2YWwgPSBjb2RlXG4gICAgICB9XG4gICAgfVxuICAgIGlmIChlbmNvZGluZyAhPT0gdW5kZWZpbmVkICYmIHR5cGVvZiBlbmNvZGluZyAhPT0gJ3N0cmluZycpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ2VuY29kaW5nIG11c3QgYmUgYSBzdHJpbmcnKVxuICAgIH1cbiAgICBpZiAodHlwZW9mIGVuY29kaW5nID09PSAnc3RyaW5nJyAmJiAhQnVmZmVyLmlzRW5jb2RpbmcoZW5jb2RpbmcpKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdVbmtub3duIGVuY29kaW5nOiAnICsgZW5jb2RpbmcpXG4gICAgfVxuICB9IGVsc2UgaWYgKHR5cGVvZiB2YWwgPT09ICdudW1iZXInKSB7XG4gICAgdmFsID0gdmFsICYgMjU1XG4gIH1cblxuICAvLyBJbnZhbGlkIHJhbmdlcyBhcmUgbm90IHNldCB0byBhIGRlZmF1bHQsIHNvIGNhbiByYW5nZSBjaGVjayBlYXJseS5cbiAgaWYgKHN0YXJ0IDwgMCB8fCB0aGlzLmxlbmd0aCA8IHN0YXJ0IHx8IHRoaXMubGVuZ3RoIDwgZW5kKSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ091dCBvZiByYW5nZSBpbmRleCcpXG4gIH1cblxuICBpZiAoZW5kIDw9IHN0YXJ0KSB7XG4gICAgcmV0dXJuIHRoaXNcbiAgfVxuXG4gIHN0YXJ0ID0gc3RhcnQgPj4+IDBcbiAgZW5kID0gZW5kID09PSB1bmRlZmluZWQgPyB0aGlzLmxlbmd0aCA6IGVuZCA+Pj4gMFxuXG4gIGlmICghdmFsKSB2YWwgPSAwXG5cbiAgdmFyIGlcbiAgaWYgKHR5cGVvZiB2YWwgPT09ICdudW1iZXInKSB7XG4gICAgZm9yIChpID0gc3RhcnQ7IGkgPCBlbmQ7ICsraSkge1xuICAgICAgdGhpc1tpXSA9IHZhbFxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICB2YXIgYnl0ZXMgPSBCdWZmZXIuaXNCdWZmZXIodmFsKVxuICAgICAgPyB2YWxcbiAgICAgIDogbmV3IEJ1ZmZlcih2YWwsIGVuY29kaW5nKVxuICAgIHZhciBsZW4gPSBieXRlcy5sZW5ndGhcbiAgICBmb3IgKGkgPSAwOyBpIDwgZW5kIC0gc3RhcnQ7ICsraSkge1xuICAgICAgdGhpc1tpICsgc3RhcnRdID0gYnl0ZXNbaSAlIGxlbl1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gdGhpc1xufVxuXG4vLyBIRUxQRVIgRlVOQ1RJT05TXG4vLyA9PT09PT09PT09PT09PT09XG5cbnZhciBJTlZBTElEX0JBU0U2NF9SRSA9IC9bXisvMC05QS1aYS16LV9dL2dcblxuZnVuY3Rpb24gYmFzZTY0Y2xlYW4gKHN0cikge1xuICAvLyBOb2RlIHN0cmlwcyBvdXQgaW52YWxpZCBjaGFyYWN0ZXJzIGxpa2UgXFxuIGFuZCBcXHQgZnJvbSB0aGUgc3RyaW5nLCBiYXNlNjQtanMgZG9lcyBub3RcbiAgc3RyID0gc3RyLnRyaW0oKS5yZXBsYWNlKElOVkFMSURfQkFTRTY0X1JFLCAnJylcbiAgLy8gTm9kZSBjb252ZXJ0cyBzdHJpbmdzIHdpdGggbGVuZ3RoIDwgMiB0byAnJ1xuICBpZiAoc3RyLmxlbmd0aCA8IDIpIHJldHVybiAnJ1xuICAvLyBOb2RlIGFsbG93cyBmb3Igbm9uLXBhZGRlZCBiYXNlNjQgc3RyaW5ncyAobWlzc2luZyB0cmFpbGluZyA9PT0pLCBiYXNlNjQtanMgZG9lcyBub3RcbiAgd2hpbGUgKHN0ci5sZW5ndGggJSA0ICE9PSAwKSB7XG4gICAgc3RyID0gc3RyICsgJz0nXG4gIH1cbiAgcmV0dXJuIHN0clxufVxuXG5mdW5jdGlvbiB0b0hleCAobikge1xuICBpZiAobiA8IDE2KSByZXR1cm4gJzAnICsgbi50b1N0cmluZygxNilcbiAgcmV0dXJuIG4udG9TdHJpbmcoMTYpXG59XG5cbmZ1bmN0aW9uIHV0ZjhUb0J5dGVzIChzdHJpbmcsIHVuaXRzKSB7XG4gIHVuaXRzID0gdW5pdHMgfHwgSW5maW5pdHlcbiAgdmFyIGNvZGVQb2ludFxuICB2YXIgbGVuZ3RoID0gc3RyaW5nLmxlbmd0aFxuICB2YXIgbGVhZFN1cnJvZ2F0ZSA9IG51bGxcbiAgdmFyIGJ5dGVzID0gW11cblxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgKytpKSB7XG4gICAgY29kZVBvaW50ID0gc3RyaW5nLmNoYXJDb2RlQXQoaSlcblxuICAgIC8vIGlzIHN1cnJvZ2F0ZSBjb21wb25lbnRcbiAgICBpZiAoY29kZVBvaW50ID4gMHhEN0ZGICYmIGNvZGVQb2ludCA8IDB4RTAwMCkge1xuICAgICAgLy8gbGFzdCBjaGFyIHdhcyBhIGxlYWRcbiAgICAgIGlmICghbGVhZFN1cnJvZ2F0ZSkge1xuICAgICAgICAvLyBubyBsZWFkIHlldFxuICAgICAgICBpZiAoY29kZVBvaW50ID4gMHhEQkZGKSB7XG4gICAgICAgICAgLy8gdW5leHBlY3RlZCB0cmFpbFxuICAgICAgICAgIGlmICgodW5pdHMgLT0gMykgPiAtMSkgYnl0ZXMucHVzaCgweEVGLCAweEJGLCAweEJEKVxuICAgICAgICAgIGNvbnRpbnVlXG4gICAgICAgIH0gZWxzZSBpZiAoaSArIDEgPT09IGxlbmd0aCkge1xuICAgICAgICAgIC8vIHVucGFpcmVkIGxlYWRcbiAgICAgICAgICBpZiAoKHVuaXRzIC09IDMpID4gLTEpIGJ5dGVzLnB1c2goMHhFRiwgMHhCRiwgMHhCRClcbiAgICAgICAgICBjb250aW51ZVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gdmFsaWQgbGVhZFxuICAgICAgICBsZWFkU3Vycm9nYXRlID0gY29kZVBvaW50XG5cbiAgICAgICAgY29udGludWVcbiAgICAgIH1cblxuICAgICAgLy8gMiBsZWFkcyBpbiBhIHJvd1xuICAgICAgaWYgKGNvZGVQb2ludCA8IDB4REMwMCkge1xuICAgICAgICBpZiAoKHVuaXRzIC09IDMpID4gLTEpIGJ5dGVzLnB1c2goMHhFRiwgMHhCRiwgMHhCRClcbiAgICAgICAgbGVhZFN1cnJvZ2F0ZSA9IGNvZGVQb2ludFxuICAgICAgICBjb250aW51ZVxuICAgICAgfVxuXG4gICAgICAvLyB2YWxpZCBzdXJyb2dhdGUgcGFpclxuICAgICAgY29kZVBvaW50ID0gKGxlYWRTdXJyb2dhdGUgLSAweEQ4MDAgPDwgMTAgfCBjb2RlUG9pbnQgLSAweERDMDApICsgMHgxMDAwMFxuICAgIH0gZWxzZSBpZiAobGVhZFN1cnJvZ2F0ZSkge1xuICAgICAgLy8gdmFsaWQgYm1wIGNoYXIsIGJ1dCBsYXN0IGNoYXIgd2FzIGEgbGVhZFxuICAgICAgaWYgKCh1bml0cyAtPSAzKSA+IC0xKSBieXRlcy5wdXNoKDB4RUYsIDB4QkYsIDB4QkQpXG4gICAgfVxuXG4gICAgbGVhZFN1cnJvZ2F0ZSA9IG51bGxcblxuICAgIC8vIGVuY29kZSB1dGY4XG4gICAgaWYgKGNvZGVQb2ludCA8IDB4ODApIHtcbiAgICAgIGlmICgodW5pdHMgLT0gMSkgPCAwKSBicmVha1xuICAgICAgYnl0ZXMucHVzaChjb2RlUG9pbnQpXG4gICAgfSBlbHNlIGlmIChjb2RlUG9pbnQgPCAweDgwMCkge1xuICAgICAgaWYgKCh1bml0cyAtPSAyKSA8IDApIGJyZWFrXG4gICAgICBieXRlcy5wdXNoKFxuICAgICAgICBjb2RlUG9pbnQgPj4gMHg2IHwgMHhDMCxcbiAgICAgICAgY29kZVBvaW50ICYgMHgzRiB8IDB4ODBcbiAgICAgIClcbiAgICB9IGVsc2UgaWYgKGNvZGVQb2ludCA8IDB4MTAwMDApIHtcbiAgICAgIGlmICgodW5pdHMgLT0gMykgPCAwKSBicmVha1xuICAgICAgYnl0ZXMucHVzaChcbiAgICAgICAgY29kZVBvaW50ID4+IDB4QyB8IDB4RTAsXG4gICAgICAgIGNvZGVQb2ludCA+PiAweDYgJiAweDNGIHwgMHg4MCxcbiAgICAgICAgY29kZVBvaW50ICYgMHgzRiB8IDB4ODBcbiAgICAgIClcbiAgICB9IGVsc2UgaWYgKGNvZGVQb2ludCA8IDB4MTEwMDAwKSB7XG4gICAgICBpZiAoKHVuaXRzIC09IDQpIDwgMCkgYnJlYWtcbiAgICAgIGJ5dGVzLnB1c2goXG4gICAgICAgIGNvZGVQb2ludCA+PiAweDEyIHwgMHhGMCxcbiAgICAgICAgY29kZVBvaW50ID4+IDB4QyAmIDB4M0YgfCAweDgwLFxuICAgICAgICBjb2RlUG9pbnQgPj4gMHg2ICYgMHgzRiB8IDB4ODAsXG4gICAgICAgIGNvZGVQb2ludCAmIDB4M0YgfCAweDgwXG4gICAgICApXG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBjb2RlIHBvaW50JylcbiAgICB9XG4gIH1cblxuICByZXR1cm4gYnl0ZXNcbn1cblxuZnVuY3Rpb24gYXNjaWlUb0J5dGVzIChzdHIpIHtcbiAgdmFyIGJ5dGVBcnJheSA9IFtdXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgc3RyLmxlbmd0aDsgKytpKSB7XG4gICAgLy8gTm9kZSdzIGNvZGUgc2VlbXMgdG8gYmUgZG9pbmcgdGhpcyBhbmQgbm90ICYgMHg3Ri4uXG4gICAgYnl0ZUFycmF5LnB1c2goc3RyLmNoYXJDb2RlQXQoaSkgJiAweEZGKVxuICB9XG4gIHJldHVybiBieXRlQXJyYXlcbn1cblxuZnVuY3Rpb24gdXRmMTZsZVRvQnl0ZXMgKHN0ciwgdW5pdHMpIHtcbiAgdmFyIGMsIGhpLCBsb1xuICB2YXIgYnl0ZUFycmF5ID0gW11cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBzdHIubGVuZ3RoOyArK2kpIHtcbiAgICBpZiAoKHVuaXRzIC09IDIpIDwgMCkgYnJlYWtcblxuICAgIGMgPSBzdHIuY2hhckNvZGVBdChpKVxuICAgIGhpID0gYyA+PiA4XG4gICAgbG8gPSBjICUgMjU2XG4gICAgYnl0ZUFycmF5LnB1c2gobG8pXG4gICAgYnl0ZUFycmF5LnB1c2goaGkpXG4gIH1cblxuICByZXR1cm4gYnl0ZUFycmF5XG59XG5cbmZ1bmN0aW9uIGJhc2U2NFRvQnl0ZXMgKHN0cikge1xuICByZXR1cm4gYmFzZTY0LnRvQnl0ZUFycmF5KGJhc2U2NGNsZWFuKHN0cikpXG59XG5cbmZ1bmN0aW9uIGJsaXRCdWZmZXIgKHNyYywgZHN0LCBvZmZzZXQsIGxlbmd0aCkge1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgKytpKSB7XG4gICAgaWYgKChpICsgb2Zmc2V0ID49IGRzdC5sZW5ndGgpIHx8IChpID49IHNyYy5sZW5ndGgpKSBicmVha1xuICAgIGRzdFtpICsgb2Zmc2V0XSA9IHNyY1tpXVxuICB9XG4gIHJldHVybiBpXG59XG5cbi8vIEFycmF5QnVmZmVycyBmcm9tIGFub3RoZXIgY29udGV4dCAoaS5lLiBhbiBpZnJhbWUpIGRvIG5vdCBwYXNzIHRoZSBgaW5zdGFuY2VvZmAgY2hlY2tcbi8vIGJ1dCB0aGV5IHNob3VsZCBiZSB0cmVhdGVkIGFzIHZhbGlkLiBTZWU6IGh0dHBzOi8vZ2l0aHViLmNvbS9mZXJvc3MvYnVmZmVyL2lzc3Vlcy8xNjZcbmZ1bmN0aW9uIGlzQXJyYXlCdWZmZXIgKG9iaikge1xuICByZXR1cm4gb2JqIGluc3RhbmNlb2YgQXJyYXlCdWZmZXIgfHxcbiAgICAob2JqICE9IG51bGwgJiYgb2JqLmNvbnN0cnVjdG9yICE9IG51bGwgJiYgb2JqLmNvbnN0cnVjdG9yLm5hbWUgPT09ICdBcnJheUJ1ZmZlcicgJiZcbiAgICAgIHR5cGVvZiBvYmouYnl0ZUxlbmd0aCA9PT0gJ251bWJlcicpXG59XG5cbi8vIE5vZGUgMC4xMCBzdXBwb3J0cyBgQXJyYXlCdWZmZXJgIGJ1dCBsYWNrcyBgQXJyYXlCdWZmZXIuaXNWaWV3YFxuZnVuY3Rpb24gaXNBcnJheUJ1ZmZlclZpZXcgKG9iaikge1xuICByZXR1cm4gKHR5cGVvZiBBcnJheUJ1ZmZlci5pc1ZpZXcgPT09ICdmdW5jdGlvbicpICYmIEFycmF5QnVmZmVyLmlzVmlldyhvYmopXG59XG5cbmZ1bmN0aW9uIG51bWJlcklzTmFOIChvYmopIHtcbiAgcmV0dXJuIG9iaiAhPT0gb2JqIC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbm8tc2VsZi1jb21wYXJlXG59XG4iLCJ2YXIgY2xvbmUgPSAoZnVuY3Rpb24oKSB7XG4ndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIF9pbnN0YW5jZW9mKG9iaiwgdHlwZSkge1xuICByZXR1cm4gdHlwZSAhPSBudWxsICYmIG9iaiBpbnN0YW5jZW9mIHR5cGU7XG59XG5cbnZhciBuYXRpdmVNYXA7XG50cnkge1xuICBuYXRpdmVNYXAgPSBNYXA7XG59IGNhdGNoKF8pIHtcbiAgLy8gbWF5YmUgYSByZWZlcmVuY2UgZXJyb3IgYmVjYXVzZSBubyBgTWFwYC4gR2l2ZSBpdCBhIGR1bW15IHZhbHVlIHRoYXQgbm9cbiAgLy8gdmFsdWUgd2lsbCBldmVyIGJlIGFuIGluc3RhbmNlb2YuXG4gIG5hdGl2ZU1hcCA9IGZ1bmN0aW9uKCkge307XG59XG5cbnZhciBuYXRpdmVTZXQ7XG50cnkge1xuICBuYXRpdmVTZXQgPSBTZXQ7XG59IGNhdGNoKF8pIHtcbiAgbmF0aXZlU2V0ID0gZnVuY3Rpb24oKSB7fTtcbn1cblxudmFyIG5hdGl2ZVByb21pc2U7XG50cnkge1xuICBuYXRpdmVQcm9taXNlID0gUHJvbWlzZTtcbn0gY2F0Y2goXykge1xuICBuYXRpdmVQcm9taXNlID0gZnVuY3Rpb24oKSB7fTtcbn1cblxuLyoqXG4gKiBDbG9uZXMgKGNvcGllcykgYW4gT2JqZWN0IHVzaW5nIGRlZXAgY29weWluZy5cbiAqXG4gKiBUaGlzIGZ1bmN0aW9uIHN1cHBvcnRzIGNpcmN1bGFyIHJlZmVyZW5jZXMgYnkgZGVmYXVsdCwgYnV0IGlmIHlvdSBhcmUgY2VydGFpblxuICogdGhlcmUgYXJlIG5vIGNpcmN1bGFyIHJlZmVyZW5jZXMgaW4geW91ciBvYmplY3QsIHlvdSBjYW4gc2F2ZSBzb21lIENQVSB0aW1lXG4gKiBieSBjYWxsaW5nIGNsb25lKG9iaiwgZmFsc2UpLlxuICpcbiAqIENhdXRpb246IGlmIGBjaXJjdWxhcmAgaXMgZmFsc2UgYW5kIGBwYXJlbnRgIGNvbnRhaW5zIGNpcmN1bGFyIHJlZmVyZW5jZXMsXG4gKiB5b3VyIHByb2dyYW0gbWF5IGVudGVyIGFuIGluZmluaXRlIGxvb3AgYW5kIGNyYXNoLlxuICpcbiAqIEBwYXJhbSBgcGFyZW50YCAtIHRoZSBvYmplY3QgdG8gYmUgY2xvbmVkXG4gKiBAcGFyYW0gYGNpcmN1bGFyYCAtIHNldCB0byB0cnVlIGlmIHRoZSBvYmplY3QgdG8gYmUgY2xvbmVkIG1heSBjb250YWluXG4gKiAgICBjaXJjdWxhciByZWZlcmVuY2VzLiAob3B0aW9uYWwgLSB0cnVlIGJ5IGRlZmF1bHQpXG4gKiBAcGFyYW0gYGRlcHRoYCAtIHNldCB0byBhIG51bWJlciBpZiB0aGUgb2JqZWN0IGlzIG9ubHkgdG8gYmUgY2xvbmVkIHRvXG4gKiAgICBhIHBhcnRpY3VsYXIgZGVwdGguIChvcHRpb25hbCAtIGRlZmF1bHRzIHRvIEluZmluaXR5KVxuICogQHBhcmFtIGBwcm90b3R5cGVgIC0gc2V0cyB0aGUgcHJvdG90eXBlIHRvIGJlIHVzZWQgd2hlbiBjbG9uaW5nIGFuIG9iamVjdC5cbiAqICAgIChvcHRpb25hbCAtIGRlZmF1bHRzIHRvIHBhcmVudCBwcm90b3R5cGUpLlxuICogQHBhcmFtIGBpbmNsdWRlTm9uRW51bWVyYWJsZWAgLSBzZXQgdG8gdHJ1ZSBpZiB0aGUgbm9uLWVudW1lcmFibGUgcHJvcGVydGllc1xuICogICAgc2hvdWxkIGJlIGNsb25lZCBhcyB3ZWxsLiBOb24tZW51bWVyYWJsZSBwcm9wZXJ0aWVzIG9uIHRoZSBwcm90b3R5cGVcbiAqICAgIGNoYWluIHdpbGwgYmUgaWdub3JlZC4gKG9wdGlvbmFsIC0gZmFsc2UgYnkgZGVmYXVsdClcbiovXG5mdW5jdGlvbiBjbG9uZShwYXJlbnQsIGNpcmN1bGFyLCBkZXB0aCwgcHJvdG90eXBlLCBpbmNsdWRlTm9uRW51bWVyYWJsZSkge1xuICBpZiAodHlwZW9mIGNpcmN1bGFyID09PSAnb2JqZWN0Jykge1xuICAgIGRlcHRoID0gY2lyY3VsYXIuZGVwdGg7XG4gICAgcHJvdG90eXBlID0gY2lyY3VsYXIucHJvdG90eXBlO1xuICAgIGluY2x1ZGVOb25FbnVtZXJhYmxlID0gY2lyY3VsYXIuaW5jbHVkZU5vbkVudW1lcmFibGU7XG4gICAgY2lyY3VsYXIgPSBjaXJjdWxhci5jaXJjdWxhcjtcbiAgfVxuICAvLyBtYWludGFpbiB0d28gYXJyYXlzIGZvciBjaXJjdWxhciByZWZlcmVuY2VzLCB3aGVyZSBjb3JyZXNwb25kaW5nIHBhcmVudHNcbiAgLy8gYW5kIGNoaWxkcmVuIGhhdmUgdGhlIHNhbWUgaW5kZXhcbiAgdmFyIGFsbFBhcmVudHMgPSBbXTtcbiAgdmFyIGFsbENoaWxkcmVuID0gW107XG5cbiAgdmFyIHVzZUJ1ZmZlciA9IHR5cGVvZiBCdWZmZXIgIT0gJ3VuZGVmaW5lZCc7XG5cbiAgaWYgKHR5cGVvZiBjaXJjdWxhciA9PSAndW5kZWZpbmVkJylcbiAgICBjaXJjdWxhciA9IHRydWU7XG5cbiAgaWYgKHR5cGVvZiBkZXB0aCA9PSAndW5kZWZpbmVkJylcbiAgICBkZXB0aCA9IEluZmluaXR5O1xuXG4gIC8vIHJlY3Vyc2UgdGhpcyBmdW5jdGlvbiBzbyB3ZSBkb24ndCByZXNldCBhbGxQYXJlbnRzIGFuZCBhbGxDaGlsZHJlblxuICBmdW5jdGlvbiBfY2xvbmUocGFyZW50LCBkZXB0aCkge1xuICAgIC8vIGNsb25pbmcgbnVsbCBhbHdheXMgcmV0dXJucyBudWxsXG4gICAgaWYgKHBhcmVudCA9PT0gbnVsbClcbiAgICAgIHJldHVybiBudWxsO1xuXG4gICAgaWYgKGRlcHRoID09PSAwKVxuICAgICAgcmV0dXJuIHBhcmVudDtcblxuICAgIHZhciBjaGlsZDtcbiAgICB2YXIgcHJvdG87XG4gICAgaWYgKHR5cGVvZiBwYXJlbnQgIT0gJ29iamVjdCcpIHtcbiAgICAgIHJldHVybiBwYXJlbnQ7XG4gICAgfVxuXG4gICAgaWYgKF9pbnN0YW5jZW9mKHBhcmVudCwgbmF0aXZlTWFwKSkge1xuICAgICAgY2hpbGQgPSBuZXcgbmF0aXZlTWFwKCk7XG4gICAgfSBlbHNlIGlmIChfaW5zdGFuY2VvZihwYXJlbnQsIG5hdGl2ZVNldCkpIHtcbiAgICAgIGNoaWxkID0gbmV3IG5hdGl2ZVNldCgpO1xuICAgIH0gZWxzZSBpZiAoX2luc3RhbmNlb2YocGFyZW50LCBuYXRpdmVQcm9taXNlKSkge1xuICAgICAgY2hpbGQgPSBuZXcgbmF0aXZlUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgIHBhcmVudC50aGVuKGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgcmVzb2x2ZShfY2xvbmUodmFsdWUsIGRlcHRoIC0gMSkpO1xuICAgICAgICB9LCBmdW5jdGlvbihlcnIpIHtcbiAgICAgICAgICByZWplY3QoX2Nsb25lKGVyciwgZGVwdGggLSAxKSk7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfSBlbHNlIGlmIChjbG9uZS5fX2lzQXJyYXkocGFyZW50KSkge1xuICAgICAgY2hpbGQgPSBbXTtcbiAgICB9IGVsc2UgaWYgKGNsb25lLl9faXNSZWdFeHAocGFyZW50KSkge1xuICAgICAgY2hpbGQgPSBuZXcgUmVnRXhwKHBhcmVudC5zb3VyY2UsIF9fZ2V0UmVnRXhwRmxhZ3MocGFyZW50KSk7XG4gICAgICBpZiAocGFyZW50Lmxhc3RJbmRleCkgY2hpbGQubGFzdEluZGV4ID0gcGFyZW50Lmxhc3RJbmRleDtcbiAgICB9IGVsc2UgaWYgKGNsb25lLl9faXNEYXRlKHBhcmVudCkpIHtcbiAgICAgIGNoaWxkID0gbmV3IERhdGUocGFyZW50LmdldFRpbWUoKSk7XG4gICAgfSBlbHNlIGlmICh1c2VCdWZmZXIgJiYgQnVmZmVyLmlzQnVmZmVyKHBhcmVudCkpIHtcbiAgICAgIGNoaWxkID0gbmV3IEJ1ZmZlcihwYXJlbnQubGVuZ3RoKTtcbiAgICAgIHBhcmVudC5jb3B5KGNoaWxkKTtcbiAgICAgIHJldHVybiBjaGlsZDtcbiAgICB9IGVsc2UgaWYgKF9pbnN0YW5jZW9mKHBhcmVudCwgRXJyb3IpKSB7XG4gICAgICBjaGlsZCA9IE9iamVjdC5jcmVhdGUocGFyZW50KTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKHR5cGVvZiBwcm90b3R5cGUgPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgcHJvdG8gPSBPYmplY3QuZ2V0UHJvdG90eXBlT2YocGFyZW50KTtcbiAgICAgICAgY2hpbGQgPSBPYmplY3QuY3JlYXRlKHByb3RvKTtcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICBjaGlsZCA9IE9iamVjdC5jcmVhdGUocHJvdG90eXBlKTtcbiAgICAgICAgcHJvdG8gPSBwcm90b3R5cGU7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGNpcmN1bGFyKSB7XG4gICAgICB2YXIgaW5kZXggPSBhbGxQYXJlbnRzLmluZGV4T2YocGFyZW50KTtcblxuICAgICAgaWYgKGluZGV4ICE9IC0xKSB7XG4gICAgICAgIHJldHVybiBhbGxDaGlsZHJlbltpbmRleF07XG4gICAgICB9XG4gICAgICBhbGxQYXJlbnRzLnB1c2gocGFyZW50KTtcbiAgICAgIGFsbENoaWxkcmVuLnB1c2goY2hpbGQpO1xuICAgIH1cblxuICAgIGlmIChfaW5zdGFuY2VvZihwYXJlbnQsIG5hdGl2ZU1hcCkpIHtcbiAgICAgIHBhcmVudC5mb3JFYWNoKGZ1bmN0aW9uKHZhbHVlLCBrZXkpIHtcbiAgICAgICAgdmFyIGtleUNoaWxkID0gX2Nsb25lKGtleSwgZGVwdGggLSAxKTtcbiAgICAgICAgdmFyIHZhbHVlQ2hpbGQgPSBfY2xvbmUodmFsdWUsIGRlcHRoIC0gMSk7XG4gICAgICAgIGNoaWxkLnNldChrZXlDaGlsZCwgdmFsdWVDaGlsZCk7XG4gICAgICB9KTtcbiAgICB9XG4gICAgaWYgKF9pbnN0YW5jZW9mKHBhcmVudCwgbmF0aXZlU2V0KSkge1xuICAgICAgcGFyZW50LmZvckVhY2goZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgdmFyIGVudHJ5Q2hpbGQgPSBfY2xvbmUodmFsdWUsIGRlcHRoIC0gMSk7XG4gICAgICAgIGNoaWxkLmFkZChlbnRyeUNoaWxkKTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGZvciAodmFyIGkgaW4gcGFyZW50KSB7XG4gICAgICB2YXIgYXR0cnM7XG4gICAgICBpZiAocHJvdG8pIHtcbiAgICAgICAgYXR0cnMgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHByb3RvLCBpKTtcbiAgICAgIH1cblxuICAgICAgaWYgKGF0dHJzICYmIGF0dHJzLnNldCA9PSBudWxsKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgY2hpbGRbaV0gPSBfY2xvbmUocGFyZW50W2ldLCBkZXB0aCAtIDEpO1xuICAgIH1cblxuICAgIGlmIChPYmplY3QuZ2V0T3duUHJvcGVydHlTeW1ib2xzKSB7XG4gICAgICB2YXIgc3ltYm9scyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eVN5bWJvbHMocGFyZW50KTtcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc3ltYm9scy5sZW5ndGg7IGkrKykge1xuICAgICAgICAvLyBEb24ndCBuZWVkIHRvIHdvcnJ5IGFib3V0IGNsb25pbmcgYSBzeW1ib2wgYmVjYXVzZSBpdCBpcyBhIHByaW1pdGl2ZSxcbiAgICAgICAgLy8gbGlrZSBhIG51bWJlciBvciBzdHJpbmcuXG4gICAgICAgIHZhciBzeW1ib2wgPSBzeW1ib2xzW2ldO1xuICAgICAgICB2YXIgZGVzY3JpcHRvciA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IocGFyZW50LCBzeW1ib2wpO1xuICAgICAgICBpZiAoZGVzY3JpcHRvciAmJiAhZGVzY3JpcHRvci5lbnVtZXJhYmxlICYmICFpbmNsdWRlTm9uRW51bWVyYWJsZSkge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIGNoaWxkW3N5bWJvbF0gPSBfY2xvbmUocGFyZW50W3N5bWJvbF0sIGRlcHRoIC0gMSk7XG4gICAgICAgIGlmICghZGVzY3JpcHRvci5lbnVtZXJhYmxlKSB7XG4gICAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KGNoaWxkLCBzeW1ib2wsIHtcbiAgICAgICAgICAgIGVudW1lcmFibGU6IGZhbHNlXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoaW5jbHVkZU5vbkVudW1lcmFibGUpIHtcbiAgICAgIHZhciBhbGxQcm9wZXJ0eU5hbWVzID0gT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMocGFyZW50KTtcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYWxsUHJvcGVydHlOYW1lcy5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgcHJvcGVydHlOYW1lID0gYWxsUHJvcGVydHlOYW1lc1tpXTtcbiAgICAgICAgdmFyIGRlc2NyaXB0b3IgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHBhcmVudCwgcHJvcGVydHlOYW1lKTtcbiAgICAgICAgaWYgKGRlc2NyaXB0b3IgJiYgZGVzY3JpcHRvci5lbnVtZXJhYmxlKSB7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgY2hpbGRbcHJvcGVydHlOYW1lXSA9IF9jbG9uZShwYXJlbnRbcHJvcGVydHlOYW1lXSwgZGVwdGggLSAxKTtcbiAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KGNoaWxkLCBwcm9wZXJ0eU5hbWUsIHtcbiAgICAgICAgICBlbnVtZXJhYmxlOiBmYWxzZVxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gY2hpbGQ7XG4gIH1cblxuICByZXR1cm4gX2Nsb25lKHBhcmVudCwgZGVwdGgpO1xufVxuXG4vKipcbiAqIFNpbXBsZSBmbGF0IGNsb25lIHVzaW5nIHByb3RvdHlwZSwgYWNjZXB0cyBvbmx5IG9iamVjdHMsIHVzZWZ1bGwgZm9yIHByb3BlcnR5XG4gKiBvdmVycmlkZSBvbiBGTEFUIGNvbmZpZ3VyYXRpb24gb2JqZWN0IChubyBuZXN0ZWQgcHJvcHMpLlxuICpcbiAqIFVTRSBXSVRIIENBVVRJT04hIFRoaXMgbWF5IG5vdCBiZWhhdmUgYXMgeW91IHdpc2ggaWYgeW91IGRvIG5vdCBrbm93IGhvdyB0aGlzXG4gKiB3b3Jrcy5cbiAqL1xuY2xvbmUuY2xvbmVQcm90b3R5cGUgPSBmdW5jdGlvbiBjbG9uZVByb3RvdHlwZShwYXJlbnQpIHtcbiAgaWYgKHBhcmVudCA9PT0gbnVsbClcbiAgICByZXR1cm4gbnVsbDtcblxuICB2YXIgYyA9IGZ1bmN0aW9uICgpIHt9O1xuICBjLnByb3RvdHlwZSA9IHBhcmVudDtcbiAgcmV0dXJuIG5ldyBjKCk7XG59O1xuXG4vLyBwcml2YXRlIHV0aWxpdHkgZnVuY3Rpb25zXG5cbmZ1bmN0aW9uIF9fb2JqVG9TdHIobykge1xuICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG8pO1xufVxuY2xvbmUuX19vYmpUb1N0ciA9IF9fb2JqVG9TdHI7XG5cbmZ1bmN0aW9uIF9faXNEYXRlKG8pIHtcbiAgcmV0dXJuIHR5cGVvZiBvID09PSAnb2JqZWN0JyAmJiBfX29ialRvU3RyKG8pID09PSAnW29iamVjdCBEYXRlXSc7XG59XG5jbG9uZS5fX2lzRGF0ZSA9IF9faXNEYXRlO1xuXG5mdW5jdGlvbiBfX2lzQXJyYXkobykge1xuICByZXR1cm4gdHlwZW9mIG8gPT09ICdvYmplY3QnICYmIF9fb2JqVG9TdHIobykgPT09ICdbb2JqZWN0IEFycmF5XSc7XG59XG5jbG9uZS5fX2lzQXJyYXkgPSBfX2lzQXJyYXk7XG5cbmZ1bmN0aW9uIF9faXNSZWdFeHAobykge1xuICByZXR1cm4gdHlwZW9mIG8gPT09ICdvYmplY3QnICYmIF9fb2JqVG9TdHIobykgPT09ICdbb2JqZWN0IFJlZ0V4cF0nO1xufVxuY2xvbmUuX19pc1JlZ0V4cCA9IF9faXNSZWdFeHA7XG5cbmZ1bmN0aW9uIF9fZ2V0UmVnRXhwRmxhZ3MocmUpIHtcbiAgdmFyIGZsYWdzID0gJyc7XG4gIGlmIChyZS5nbG9iYWwpIGZsYWdzICs9ICdnJztcbiAgaWYgKHJlLmlnbm9yZUNhc2UpIGZsYWdzICs9ICdpJztcbiAgaWYgKHJlLm11bHRpbGluZSkgZmxhZ3MgKz0gJ20nO1xuICByZXR1cm4gZmxhZ3M7XG59XG5jbG9uZS5fX2dldFJlZ0V4cEZsYWdzID0gX19nZXRSZWdFeHBGbGFncztcblxucmV0dXJuIGNsb25lO1xufSkoKTtcblxuaWYgKHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnICYmIG1vZHVsZS5leHBvcnRzKSB7XG4gIG1vZHVsZS5leHBvcnRzID0gY2xvbmU7XG59XG4iLCJleHBvcnRzLnJlYWQgPSBmdW5jdGlvbiAoYnVmZmVyLCBvZmZzZXQsIGlzTEUsIG1MZW4sIG5CeXRlcykge1xuICB2YXIgZSwgbVxuICB2YXIgZUxlbiA9IG5CeXRlcyAqIDggLSBtTGVuIC0gMVxuICB2YXIgZU1heCA9ICgxIDw8IGVMZW4pIC0gMVxuICB2YXIgZUJpYXMgPSBlTWF4ID4+IDFcbiAgdmFyIG5CaXRzID0gLTdcbiAgdmFyIGkgPSBpc0xFID8gKG5CeXRlcyAtIDEpIDogMFxuICB2YXIgZCA9IGlzTEUgPyAtMSA6IDFcbiAgdmFyIHMgPSBidWZmZXJbb2Zmc2V0ICsgaV1cblxuICBpICs9IGRcblxuICBlID0gcyAmICgoMSA8PCAoLW5CaXRzKSkgLSAxKVxuICBzID4+PSAoLW5CaXRzKVxuICBuQml0cyArPSBlTGVuXG4gIGZvciAoOyBuQml0cyA+IDA7IGUgPSBlICogMjU2ICsgYnVmZmVyW29mZnNldCArIGldLCBpICs9IGQsIG5CaXRzIC09IDgpIHt9XG5cbiAgbSA9IGUgJiAoKDEgPDwgKC1uQml0cykpIC0gMSlcbiAgZSA+Pj0gKC1uQml0cylcbiAgbkJpdHMgKz0gbUxlblxuICBmb3IgKDsgbkJpdHMgPiAwOyBtID0gbSAqIDI1NiArIGJ1ZmZlcltvZmZzZXQgKyBpXSwgaSArPSBkLCBuQml0cyAtPSA4KSB7fVxuXG4gIGlmIChlID09PSAwKSB7XG4gICAgZSA9IDEgLSBlQmlhc1xuICB9IGVsc2UgaWYgKGUgPT09IGVNYXgpIHtcbiAgICByZXR1cm4gbSA/IE5hTiA6ICgocyA/IC0xIDogMSkgKiBJbmZpbml0eSlcbiAgfSBlbHNlIHtcbiAgICBtID0gbSArIE1hdGgucG93KDIsIG1MZW4pXG4gICAgZSA9IGUgLSBlQmlhc1xuICB9XG4gIHJldHVybiAocyA/IC0xIDogMSkgKiBtICogTWF0aC5wb3coMiwgZSAtIG1MZW4pXG59XG5cbmV4cG9ydHMud3JpdGUgPSBmdW5jdGlvbiAoYnVmZmVyLCB2YWx1ZSwgb2Zmc2V0LCBpc0xFLCBtTGVuLCBuQnl0ZXMpIHtcbiAgdmFyIGUsIG0sIGNcbiAgdmFyIGVMZW4gPSBuQnl0ZXMgKiA4IC0gbUxlbiAtIDFcbiAgdmFyIGVNYXggPSAoMSA8PCBlTGVuKSAtIDFcbiAgdmFyIGVCaWFzID0gZU1heCA+PiAxXG4gIHZhciBydCA9IChtTGVuID09PSAyMyA/IE1hdGgucG93KDIsIC0yNCkgLSBNYXRoLnBvdygyLCAtNzcpIDogMClcbiAgdmFyIGkgPSBpc0xFID8gMCA6IChuQnl0ZXMgLSAxKVxuICB2YXIgZCA9IGlzTEUgPyAxIDogLTFcbiAgdmFyIHMgPSB2YWx1ZSA8IDAgfHwgKHZhbHVlID09PSAwICYmIDEgLyB2YWx1ZSA8IDApID8gMSA6IDBcblxuICB2YWx1ZSA9IE1hdGguYWJzKHZhbHVlKVxuXG4gIGlmIChpc05hTih2YWx1ZSkgfHwgdmFsdWUgPT09IEluZmluaXR5KSB7XG4gICAgbSA9IGlzTmFOKHZhbHVlKSA/IDEgOiAwXG4gICAgZSA9IGVNYXhcbiAgfSBlbHNlIHtcbiAgICBlID0gTWF0aC5mbG9vcihNYXRoLmxvZyh2YWx1ZSkgLyBNYXRoLkxOMilcbiAgICBpZiAodmFsdWUgKiAoYyA9IE1hdGgucG93KDIsIC1lKSkgPCAxKSB7XG4gICAgICBlLS1cbiAgICAgIGMgKj0gMlxuICAgIH1cbiAgICBpZiAoZSArIGVCaWFzID49IDEpIHtcbiAgICAgIHZhbHVlICs9IHJ0IC8gY1xuICAgIH0gZWxzZSB7XG4gICAgICB2YWx1ZSArPSBydCAqIE1hdGgucG93KDIsIDEgLSBlQmlhcylcbiAgICB9XG4gICAgaWYgKHZhbHVlICogYyA+PSAyKSB7XG4gICAgICBlKytcbiAgICAgIGMgLz0gMlxuICAgIH1cblxuICAgIGlmIChlICsgZUJpYXMgPj0gZU1heCkge1xuICAgICAgbSA9IDBcbiAgICAgIGUgPSBlTWF4XG4gICAgfSBlbHNlIGlmIChlICsgZUJpYXMgPj0gMSkge1xuICAgICAgbSA9ICh2YWx1ZSAqIGMgLSAxKSAqIE1hdGgucG93KDIsIG1MZW4pXG4gICAgICBlID0gZSArIGVCaWFzXG4gICAgfSBlbHNlIHtcbiAgICAgIG0gPSB2YWx1ZSAqIE1hdGgucG93KDIsIGVCaWFzIC0gMSkgKiBNYXRoLnBvdygyLCBtTGVuKVxuICAgICAgZSA9IDBcbiAgICB9XG4gIH1cblxuICBmb3IgKDsgbUxlbiA+PSA4OyBidWZmZXJbb2Zmc2V0ICsgaV0gPSBtICYgMHhmZiwgaSArPSBkLCBtIC89IDI1NiwgbUxlbiAtPSA4KSB7fVxuXG4gIGUgPSAoZSA8PCBtTGVuKSB8IG1cbiAgZUxlbiArPSBtTGVuXG4gIGZvciAoOyBlTGVuID4gMDsgYnVmZmVyW29mZnNldCArIGldID0gZSAmIDB4ZmYsIGkgKz0gZCwgZSAvPSAyNTYsIGVMZW4gLT0gOCkge31cblxuICBidWZmZXJbb2Zmc2V0ICsgaSAtIGRdIHw9IHMgKiAxMjhcbn1cbiJdfQ==
