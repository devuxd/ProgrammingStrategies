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

function writeUserData(userId, name, email, imageUrl) {
    firebase.database().ref('users/' + userId).set({
        username: name,
        email: email,
        profile_picture: imageUrl
    });
}

},{}],2:[function(require,module,exports){
const models = require('./models.js');
const db = require('./dataManagement.js');
var strategies = require('./strategies').strategies;

// Initialize Firebase/


if (typeof window !== 'undefined' && window.angular) {
    let myapp = angular.module('myapp', []);
    myapp.factory('StrategyService', function () {

        firebase.database().ref('strategies').once('value').then(function (snapshot) {
            snapshot.forEach(function (childStrategy) {
                //console.log(childStrategy.key + ": " + childStrategy.val().displayName);
                //strategies.push(childStrategy.val());
            });
        });
        return {
            getAll: function () {
                return strategies;
            }
        };
    });

    myapp.controller('MainCtrl', function ($scope, StrategyService) {
        "use strict";

        $scope.accordion = {
            current: null
        };

        //let strategies = StrategyService.getAll();

        $scope.strategies = strategies;

        // for(var i =0;i<strategies.length; i++){
        //     var key = firebase.database().ref().child('strategies').push(strategies[i]);
        // }
        $scope.allVariables = [{ name: 'code', val: null }, { name: 'referenceCode', val: null }, { name: 'failure', val: null }, { name: 'system', val: null }];

        //console.log($scope.strategies);

        // create interpreter object from model
        //console.log(strategies);
        let interpreter = new models.Interpreter(strategies);
        // initialize the application
        let execObj = interpreter.init("modelFaultLocalization");
        console.log("execObj", execObj);
        $scope.strategy = execObj.currentStrategy;
        $scope.currentStatement = execObj.currentStatement;
        $scope.statements = $scope.strategy.statements;

        $scope.reset = function () {
            execObj = interpreter.reset();
            interpreter = new models.Interpreter(strategies);
            execObj = interpreter.init("modelFaultLocalization");
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
                $scope.strategy = execObj.currentStrategy;
                $scope.statements = $scope.strategy.statements;
            }
            $scope.currentStatement = execObj.currentStatement;
        };

        $scope.prevStatement = function () {
            execObj = interpreter.goBack();
            if (execObj === null) return;
            if ($scope.strategy.name !== execObj.currentStrategy.name) {
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
        console.log(this.strategies);

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
        activeLines: [3, 5]
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
        activeLines: [6, 9]
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
        activeLines: [2, 4]
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
        activeLines: [3, 5]
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
        activeLines: [9]
    }]
}];

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJkYXRhTWFuYWdlbWVudC5qcyIsImluZGV4LmpzIiwibW9kZWxzLmpzIiwic3RyYXRlZ2llcy5qcyIsIi4uL25vZGVfbW9kdWxlcy9iYXNlNjQtanMvaW5kZXguanMiLCIuLi9ub2RlX21vZHVsZXMvYnVmZmVyL2luZGV4LmpzIiwiLi4vbm9kZV9tb2R1bGVzL2Nsb25lL2Nsb25lLmpzIiwiLi4vbm9kZV9tb2R1bGVzL2llZWU3NTQvaW5kZXguanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztBQ0dBLElBQUksU0FBUztBQUNULFlBQVEseUNBREM7QUFFVCxnQkFBWSxpQ0FGSDtBQUdULGlCQUFhLHdDQUhKO0FBSVQsZUFBVyxpQkFKRjtBQUtULG1CQUFlLDZCQUxOO0FBTVQsdUJBQW1CO0FBTlYsQ0FBYjtBQVFBLFNBQVMsYUFBVCxDQUF1QixNQUF2Qjs7QUFFQSxTQUFTLGFBQVQsQ0FBdUIsTUFBdkIsRUFBK0IsSUFBL0IsRUFBcUMsS0FBckMsRUFBNEMsUUFBNUMsRUFBc0Q7QUFDbEQsYUFBUyxRQUFULEdBQW9CLEdBQXBCLENBQXdCLFdBQVcsTUFBbkMsRUFBMkMsR0FBM0MsQ0FBK0M7QUFDM0Msa0JBQVUsSUFEaUM7QUFFM0MsZUFBTyxLQUZvQztBQUczQyx5QkFBa0I7QUFIeUIsS0FBL0M7QUFLSDs7O0FDbkJELE1BQU0sU0FBUyxRQUFRLGFBQVIsQ0FBZjtBQUNBLE1BQU0sS0FBSyxRQUFRLHFCQUFSLENBQVg7QUFDQSxJQUFJLGFBQWEsUUFBUSxjQUFSLEVBQXdCLFVBQXpDOztBQUdBOzs7QUFHQSxJQUFJLE9BQU8sTUFBUCxLQUFrQixXQUFsQixJQUFpQyxPQUFPLE9BQTVDLEVBQXFEO0FBQ2pELFFBQUksUUFBUSxRQUFRLE1BQVIsQ0FBZSxPQUFmLEVBQXdCLEVBQXhCLENBQVo7QUFDQSxVQUFNLE9BQU4sQ0FBYyxpQkFBZCxFQUFpQyxZQUFXOztBQUV4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Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDbHJEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUMzUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiXG5cblxudmFyIGNvbmZpZyA9IHtcbiAgICBhcGlLZXk6IFwiQUl6YVN5QVhqTDZmNzM5QlZxTERrbnltQ04ySDM2LU5CRFM4THZZXCIsXG4gICAgYXV0aERvbWFpbjogXCJzdHJhdGVneXRyYWNrZXIuZmlyZWJhc2VhcHAuY29tXCIsXG4gICAgZGF0YWJhc2VVUkw6IFwiaHR0cHM6Ly9zdHJhdGVneXRyYWNrZXIuZmlyZWJhc2Vpby5jb21cIixcbiAgICBwcm9qZWN0SWQ6IFwic3RyYXRlZ3l0cmFja2VyXCIsXG4gICAgc3RvcmFnZUJ1Y2tldDogXCJzdHJhdGVneXRyYWNrZXIuYXBwc3BvdC5jb21cIixcbiAgICBtZXNzYWdpbmdTZW5kZXJJZDogXCIyNjEyNDk4MzY1MThcIlxufTtcbmZpcmViYXNlLmluaXRpYWxpemVBcHAoY29uZmlnKTtcblxuZnVuY3Rpb24gd3JpdGVVc2VyRGF0YSh1c2VySWQsIG5hbWUsIGVtYWlsLCBpbWFnZVVybCkge1xuICAgIGZpcmViYXNlLmRhdGFiYXNlKCkucmVmKCd1c2Vycy8nICsgdXNlcklkKS5zZXQoe1xuICAgICAgICB1c2VybmFtZTogbmFtZSxcbiAgICAgICAgZW1haWw6IGVtYWlsLFxuICAgICAgICBwcm9maWxlX3BpY3R1cmUgOiBpbWFnZVVybFxuICAgIH0pO1xufSIsImNvbnN0IG1vZGVscyA9IHJlcXVpcmUoJy4vbW9kZWxzLmpzJyk7XHJcbmNvbnN0IGRiID0gcmVxdWlyZSgnLi9kYXRhTWFuYWdlbWVudC5qcycpO1xyXG52YXIgc3RyYXRlZ2llcyA9IHJlcXVpcmUoJy4vc3RyYXRlZ2llcycpLnN0cmF0ZWdpZXM7XHJcblxyXG5cclxuLy8gSW5pdGlhbGl6ZSBGaXJlYmFzZS9cclxuXHJcblxyXG5pZiAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcgJiYgd2luZG93LmFuZ3VsYXIpIHtcclxuICAgIGxldCBteWFwcCA9IGFuZ3VsYXIubW9kdWxlKCdteWFwcCcsIFtdKTtcclxuICAgIG15YXBwLmZhY3RvcnkoJ1N0cmF0ZWd5U2VydmljZScsIGZ1bmN0aW9uKCkge1xyXG5cclxuICAgICAgICBmaXJlYmFzZS5kYXRhYmFzZSgpLnJlZignc3RyYXRlZ2llcycpLm9uY2UoJ3ZhbHVlJykudGhlbihmdW5jdGlvbihzbmFwc2hvdCkge1xyXG4gICAgICAgICAgICBzbmFwc2hvdC5mb3JFYWNoKGZ1bmN0aW9uKGNoaWxkU3RyYXRlZ3kpIHtcclxuICAgICAgICAgICAgICAgIC8vY29uc29sZS5sb2coY2hpbGRTdHJhdGVneS5rZXkgKyBcIjogXCIgKyBjaGlsZFN0cmF0ZWd5LnZhbCgpLmRpc3BsYXlOYW1lKTtcclxuICAgICAgICAgICAgICAgIC8vc3RyYXRlZ2llcy5wdXNoKGNoaWxkU3RyYXRlZ3kudmFsKCkpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9KTtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICBnZXRBbGw6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHN0cmF0ZWdpZXM7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgfTtcclxuICAgIH0pO1xyXG5cclxuICAgIG15YXBwLmNvbnRyb2xsZXIoJ01haW5DdHJsJywgZnVuY3Rpb24gKCRzY29wZSwgU3RyYXRlZ3lTZXJ2aWNlKSB7XHJcbiAgICAgICAgXCJ1c2Ugc3RyaWN0XCI7XHJcbiAgICAgICAgLy8gdmFyIGFjYyA9IGRvY3VtZW50LmdldEVsZW1lbnRzQnlDbGFzc05hbWUoXCJhY2NvcmRpb25cIik7XHJcbiAgICAgICAgLy8gdmFyIGk7XHJcbiAgICAgICAgLy9cclxuICAgICAgICAvLyBmb3IgKGkgPSAwOyBpIDwgYWNjLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgLy8gICAgIGFjY1tpXS5vbmNsaWNrID0gZnVuY3Rpb24oKXtcclxuICAgICAgICAvLyAgICAgICAgIC8qIFRvZ2dsZSBiZXR3ZWVuIGFkZGluZyBhbmQgcmVtb3ZpbmcgdGhlIFwiYWN0aXZlXCIgY2xhc3MsXHJcbiAgICAgICAgLy8gICAgICAgICB0byBoaWdobGlnaHQgdGhlIGJ1dHRvbiB0aGF0IGNvbnRyb2xzIHRoZSBwYW5lbCAqL1xyXG4gICAgICAgIC8vICAgICAgICAgdGhpcy5jbGFzc0xpc3QudG9nZ2xlKFwiYWN0aXZlXCIpO1xyXG4gICAgICAgIC8vXHJcbiAgICAgICAgLy8gICAgICAgICAvKiBUb2dnbGUgYmV0d2VlbiBoaWRpbmcgYW5kIHNob3dpbmcgdGhlIGFjdGl2ZSBwYW5lbCAqL1xyXG4gICAgICAgIC8vICAgICAgICAgdmFyIHBhbmVsID0gdGhpcy5uZXh0RWxlbWVudFNpYmxpbmc7XHJcbiAgICAgICAgLy8gICAgICAgICBpZiAocGFuZWwuc3R5bGUuZGlzcGxheSA9PT0gXCJibG9ja1wiKSB7XHJcbiAgICAgICAgLy8gICAgICAgICAgICAgcGFuZWwuc3R5bGUuZGlzcGxheSA9IFwibm9uZVwiO1xyXG4gICAgICAgIC8vICAgICAgICAgfVxyXG4gICAgICAgIC8vICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgLy8gICAgICAgICAgICAgcGFuZWwuc3R5bGUuZGlzcGxheSA9IFwiYmxvY2tcIjtcclxuICAgICAgICAvLyAgICAgICAgIH1cclxuICAgICAgICAvLyAgICAgfVxyXG4gICAgICAgIC8vIH1cclxuXHJcbiAgICAgICAgJHNjb3BlLmFjY29yZGlvbiA9IHtcclxuICAgICAgICAgICAgY3VycmVudDogbnVsbFxyXG4gICAgICAgIH07XHJcblxyXG5cclxuICAgICAgICAvL2xldCBzdHJhdGVnaWVzID0gU3RyYXRlZ3lTZXJ2aWNlLmdldEFsbCgpO1xyXG5cclxuICAgICAgICAkc2NvcGUuc3RyYXRlZ2llcyA9IHN0cmF0ZWdpZXM7XHJcblxyXG4gICAgICAgIC8vIGZvcih2YXIgaSA9MDtpPHN0cmF0ZWdpZXMubGVuZ3RoOyBpKyspe1xyXG4gICAgICAgIC8vICAgICB2YXIga2V5ID0gZmlyZWJhc2UuZGF0YWJhc2UoKS5yZWYoKS5jaGlsZCgnc3RyYXRlZ2llcycpLnB1c2goc3RyYXRlZ2llc1tpXSk7XHJcbiAgICAgICAgLy8gfVxyXG4gICAgICAgICRzY29wZS5hbGxWYXJpYWJsZXM9W1xyXG4gICAgICAgICAgICB7bmFtZTogJ2NvZGUnLCB2YWw6IG51bGx9LFxyXG4gICAgICAgICAgICB7bmFtZTogJ3JlZmVyZW5jZUNvZGUnLCB2YWw6IG51bGx9LFxyXG4gICAgICAgICAgICB7bmFtZTogJ2ZhaWx1cmUnLCB2YWw6IG51bGx9LFxyXG4gICAgICAgICAgICB7bmFtZTogJ3N5c3RlbScsIHZhbDogbnVsbH0sXHJcbiAgICAgICAgXTtcclxuXHJcbiAgICAgICAgICAgIC8vY29uc29sZS5sb2coJHNjb3BlLnN0cmF0ZWdpZXMpO1xyXG5cclxuICAgICAgICAvLyBjcmVhdGUgaW50ZXJwcmV0ZXIgb2JqZWN0IGZyb20gbW9kZWxcclxuICAgICAgICAvL2NvbnNvbGUubG9nKHN0cmF0ZWdpZXMpO1xyXG4gICAgICAgIGxldCBpbnRlcnByZXRlciA9IG5ldyBtb2RlbHMuSW50ZXJwcmV0ZXIoc3RyYXRlZ2llcyk7XHJcbiAgICAgICAgLy8gaW5pdGlhbGl6ZSB0aGUgYXBwbGljYXRpb25cclxuICAgICAgICBsZXQgZXhlY09iaiA9IGludGVycHJldGVyLmluaXQoXCJtb2RlbEZhdWx0TG9jYWxpemF0aW9uXCIpO1xyXG4gICAgICAgIGNvbnNvbGUubG9nKFwiZXhlY09ialwiLCBleGVjT2JqKTtcclxuICAgICAgICAkc2NvcGUuc3RyYXRlZ3kgPSBleGVjT2JqLmN1cnJlbnRTdHJhdGVneTtcclxuICAgICAgICAkc2NvcGUuY3VycmVudFN0YXRlbWVudCA9IGV4ZWNPYmouY3VycmVudFN0YXRlbWVudDtcclxuICAgICAgICAkc2NvcGUuc3RhdGVtZW50cyA9ICRzY29wZS5zdHJhdGVneS5zdGF0ZW1lbnRzO1xyXG5cclxuICAgICAgICAkc2NvcGUucmVzZXQ9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgZXhlY09iaiA9IGludGVycHJldGVyLnJlc2V0KCk7XHJcbiAgICAgICAgICAgIGludGVycHJldGVyID0gbmV3IG1vZGVscy5JbnRlcnByZXRlcihzdHJhdGVnaWVzKTtcclxuICAgICAgICAgICAgZXhlY09iaiA9IGludGVycHJldGVyLmluaXQoXCJtb2RlbEZhdWx0TG9jYWxpemF0aW9uXCIpO1xyXG4gICAgICAgICAgICAkc2NvcGUuc3RyYXRlZ3kgPSBleGVjT2JqLmN1cnJlbnRTdHJhdGVneTtcclxuICAgICAgICAgICAgJHNjb3BlLmN1cnJlbnRTdGF0ZW1lbnQgPSBleGVjT2JqLmN1cnJlbnRTdGF0ZW1lbnQ7XHJcbiAgICAgICAgICAgICRzY29wZS5zdGF0ZW1lbnRzID0gJHNjb3BlLnN0cmF0ZWd5LnN0YXRlbWVudHM7XHJcbiAgICAgICAgICAgIGFuZ3VsYXIuZm9yRWFjaCgkc2NvcGUuYWxsVmFyaWFibGVzLCBmdW5jdGlvbih2YWwsIGtleSkge1xyXG4gICAgICAgICAgICAgICAgdmFsLnZhbCA9IG51bGw7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgICRzY29wZS5uZXh0U3RhdGVtZW50ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICBleGVjT2JqID0gaW50ZXJwcmV0ZXIuZXhlY3V0ZSgpO1xyXG4gICAgICAgICAgICBpZiAoZXhlY09iaiA9PT0gbnVsbCkgcmV0dXJuO1xyXG4gICAgICAgICAgICBpZiAoJHNjb3BlLnN0cmF0ZWd5Lm5hbWUgIT09IGV4ZWNPYmouY3VycmVudFN0cmF0ZWd5Lm5hbWUpIHtcclxuICAgICAgICAgICAgICAgICRzY29wZS5zdHJhdGVneSA9IGV4ZWNPYmouY3VycmVudFN0cmF0ZWd5O1xyXG4gICAgICAgICAgICAgICAgJHNjb3BlLnN0YXRlbWVudHMgPSAkc2NvcGUuc3RyYXRlZ3kuc3RhdGVtZW50cztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAkc2NvcGUuY3VycmVudFN0YXRlbWVudCA9IGV4ZWNPYmouY3VycmVudFN0YXRlbWVudDtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICAkc2NvcGUucHJldlN0YXRlbWVudCA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgZXhlY09iaiA9IGludGVycHJldGVyLmdvQmFjaygpO1xyXG4gICAgICAgICAgICBpZiAoZXhlY09iaiA9PT0gbnVsbCkgcmV0dXJuO1xyXG4gICAgICAgICAgICBpZiAoJHNjb3BlLnN0cmF0ZWd5Lm5hbWUgIT09IGV4ZWNPYmouY3VycmVudFN0cmF0ZWd5Lm5hbWUpIHtcclxuICAgICAgICAgICAgICAgICRzY29wZS5zdHJhdGVneSA9IGV4ZWNPYmouY3VycmVudFN0cmF0ZWd5O1xyXG4gICAgICAgICAgICAgICAgJHNjb3BlLnN0YXRlbWVudHMgPSAkc2NvcGUuc3RyYXRlZ3kuc3RhdGVtZW50cztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAkc2NvcGUuY3VycmVudFN0YXRlbWVudCA9IGV4ZWNPYmouY3VycmVudFN0YXRlbWVudDtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICAkc2NvcGUuY2hvb3NlTmV4dFN0YXRlbWVudCA9IGZ1bmN0aW9uICgkZXZlbnQpIHtcclxuICAgICAgICAgICAgbGV0IGN1cnJlbnRUYXJnZXQgPSAkZXZlbnQuY3VycmVudFRhcmdldC5pbm5lckhUTUw7XHJcbiAgICAgICAgICAgIGlmICgkc2NvcGUuY3VycmVudFN0YXRlbWVudC5hY3RpdmVMaW5lcy5sZW5ndGggPiAxKVxyXG4gICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIC8vIChjdXJyZW50VGFyZ2V0LmluY2x1ZGVzKFwiaWZcIikgfHwgY3VycmVudFRhcmdldC5pbmNsdWRlcyhcImVsc2VcIikgfHwgY3VycmVudFRhcmdldC5pbmNsdWRlcyhcIndoaWxlXCIpIHx8IGN1cnJlbnRUYXJnZXQuaW5jbHVkZXMoXCJyZXR1cm5cIikpXHJcbiAgICAgICAgICAgICAgICBsZXQgbGluZU51bSA9IHBhcnNlSW50KCRldmVudC5jdXJyZW50VGFyZ2V0LmlkKTtcclxuICAgICAgICAgICAgICAgIGV4ZWNPYmogPSBpbnRlcnByZXRlci5leGVjdXRlKGxpbmVOdW0rMSk7XHJcbiAgICAgICAgICAgICAgICBpZiAoZXhlY09iaiA9PT0gbnVsbCkgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgaWYgKCRzY29wZS5zdHJhdGVneS5uYW1lICE9PSBleGVjT2JqLmN1cnJlbnRTdHJhdGVneS5uYW1lKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLnN0cmF0ZWd5ID0gZXhlY09iai5jdXJyZW50U3RyYXRlZ3k7XHJcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLnN0YXRlbWVudHMgPSAkc2NvcGUuc3RyYXRlZ3kuc3RhdGVtZW50cztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICRzY29wZS5jdXJyZW50U3RhdGVtZW50ID0gZXhlY09iai5jdXJyZW50U3RhdGVtZW50O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuICAgIH0pO1xyXG5cclxufVxyXG4iLCIndXNlIHN0cmljdCc7XHJcblxyXG52YXIgY2xvbmUgPSByZXF1aXJlKCdjbG9uZScpO1xyXG5cclxuY2xhc3MgSW50ZXJwcmV0ZXIge1xyXG5cclxuXHJcbiAgICBjb25zdHJ1Y3RvcihzdHJhdGVnaWVzKSB7XHJcbiAgICAgICAgdGhpcy5leGVjdXRpb25TdGFjayA9IFtdO1xyXG4gICAgICAgIHRoaXMuaGlzdG9yeUJhY2t3YXJkID0gW107XHJcbiAgICAgICAgdGhpcy5zdHJhdGVnaWVzID0gc3RyYXRlZ2llcztcclxuICAgICAgICB0aGlzLmRpcnR5PSBmYWxzZTtcclxuICAgIH1cclxuXHJcbiAgICBpbml0KG5hbWUpIHtcclxuICAgICAgICBsZXQgaW5pdEV4ZWN1dGlvbkNvbnRleHQgPSBuZXcgRnVuY3Rpb25FeGVjQ29udGV4dCh0aGlzLmZpbmRTdHJhdGVneShuYW1lKSk7XHJcbiAgICAgICAgdGhpcy5leGVjdXRpb25TdGFjay5wdXNoKGluaXRFeGVjdXRpb25Db250ZXh0KTtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICBjdXJyZW50U3RhdGVtZW50OiBpbml0RXhlY3V0aW9uQ29udGV4dC5wYyxcclxuICAgICAgICAgICAgY3VycmVudFN0cmF0ZWd5OiBpbml0RXhlY3V0aW9uQ29udGV4dC5zdHJhdGVneSxcclxuICAgICAgICAgICAgZXhlY3V0aW9uU3RhY2s6IHRoaXMuZXhlY3V0aW9uU3RhY2ssXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgcmVzZXQoKXtcclxuICAgICAgICBsZXQgd2l6YXJkRGl2ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJ3aXphcmRcIik7XHJcbiAgICAgICAgdGhpcy5oaXN0b3J5QmFja3dhcmQuc3BsaWNlKDAsdGhpcy5oaXN0b3J5QmFja3dhcmQubGVuZ3RoKTtcclxuICAgICAgICB0aGlzLmV4ZWN1dGlvblN0YWNrLnNwbGljZSgwLHRoaXMuZXhlY3V0aW9uU3RhY2subGVuZ3RoKTtcclxuICAgICAgICB0aGlzLnVwZGF0ZVdpemFyZCh3aXphcmREaXYpO1xyXG4gICAgICAgIHRoaXMuZGlydHk9IGZhbHNlO1xyXG5cclxuICAgIH1cclxuXHJcblxyXG4gICAgZmluZFN0cmF0ZWd5KHN0cmF0ZWd5bmFtZSkge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKHRoaXMuc3RyYXRlZ2llcyk7XHJcblxyXG4gICAgICAgIHJldHVybiB0aGlzLnN0cmF0ZWdpZXMuZmluZChmdW5jdGlvbihzdHJhdGVneSkge1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuIHN0cmF0ZWd5Lm5hbWUgPT09IHN0cmF0ZWd5bmFtZTtcclxuICAgICAgICB9KVxyXG4gICAgfVxyXG5cclxuICAgIGV4ZWN1dGUobGluZU51bSkge1xyXG4gICAgICAgIGxldCB3aXphcmREaXYgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIndpemFyZFwiKTtcclxuXHJcbiAgICAgICAgICAgIGlmKHRoaXMuZXhlY3V0aW9uU3RhY2subGVuZ3RoKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmhpc3RvcnlCYWNrd2FyZC5wdXNoKGNsb25lKHRoaXMuZXhlY3V0aW9uU3RhY2spKTsgLy8gdGFrZSBhIHNuYXBzaG90IGZyb20gb3VyIGN1cnJlbnQgZXhlY3V0aW9uU3RhY2sgdG8gb3VyIGhpc3RvcnlcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBsZXQgZXhlY3V0aW9uQ29udGV4dCA9IHRoaXMuZXhlY3V0aW9uU3RhY2sucG9wKCk7XHJcbiAgICAgICAgICAgIGlmKGV4ZWN1dGlvbkNvbnRleHQgPT09IHVuZGVmaW5lZClcclxuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgICAgICBpZighdGhpcy5kaXJ0eSAmJiBleGVjdXRpb25Db250ZXh0LnBjLm5leHRTdHJhdGVneS5sZW5ndGgpIHtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgbmV4dEV4ZWN1dGlvbkNvbnRleHQgPSBuZXcgRnVuY3Rpb25FeGVjQ29udGV4dCh0aGlzLmZpbmRTdHJhdGVneShleGVjdXRpb25Db250ZXh0LnBjLm5leHRTdHJhdGVneSkpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5kaXJ0eSA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmV4ZWN1dGlvblN0YWNrLnB1c2goZXhlY3V0aW9uQ29udGV4dCk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmV4ZWN1dGlvblN0YWNrLnB1c2gobmV4dEV4ZWN1dGlvbkNvbnRleHQpO1xyXG5cclxuXHJcbiAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZVdpemFyZCh3aXphcmREaXYpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgICAgICBjdXJyZW50U3RhdGVtZW50OiBuZXh0RXhlY3V0aW9uQ29udGV4dC5wYyxcclxuICAgICAgICAgICAgICAgICAgICBjdXJyZW50U3RyYXRlZ3k6IG5leHRFeGVjdXRpb25Db250ZXh0LnN0cmF0ZWd5LFxyXG4gICAgICAgICAgICAgICAgICAgIGV4ZWN1dGlvblN0YWNrOiB0aGlzLmV4ZWN1dGlvblN0YWNrLFxyXG4gICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuZGlydHkgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgIGxldCBuZXh0U3RhdGVtZW50ID0gZXhlY3V0aW9uQ29udGV4dC5nZXROZXh0U3RhdGVtZW50KGxpbmVOdW0pO1xyXG4gICAgICAgICAgICAgICAgaWYobmV4dFN0YXRlbWVudC5zdWNjZXNzb3I9PXVuZGVmaW5lZCB8fCBuZXh0U3RhdGVtZW50LnN1Y2Nlc3Nvcj09XCJ1bmRlZmluZWRcIilcclxuICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmRpcnR5ID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICBleGVjdXRpb25Db250ZXh0ID0gdGhpcy5leGVjdXRpb25TdGFjay5wb3AoKTtcclxuICAgICAgICAgICAgICAgICAgICBpZihleGVjdXRpb25Db250ZXh0ID09PSB1bmRlZmluZWQpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgICAgICAgICAgICAgIG5leHRTdGF0ZW1lbnQ9IGV4ZWN1dGlvbkNvbnRleHQuZ2V0TmV4dFN0YXRlbWVudChleGVjdXRpb25Db250ZXh0LnBjLmxpbmVOdW0pO1xyXG5cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHRoaXMuZXhlY3V0aW9uU3RhY2sucHVzaChleGVjdXRpb25Db250ZXh0KTtcclxuICAgICAgICAgICAgICAgIHRoaXMudXBkYXRlV2l6YXJkKHdpemFyZERpdik7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGN1cnJlbnRTdGF0ZW1lbnQ6IG5leHRTdGF0ZW1lbnQsXHJcbiAgICAgICAgICAgICAgICAgICAgY3VycmVudFN0cmF0ZWd5OiBleGVjdXRpb25Db250ZXh0LnN0cmF0ZWd5LFxyXG4gICAgICAgICAgICAgICAgICAgIGV4ZWN1dGlvblN0YWNrOiB0aGlzLmV4ZWN1dGlvblN0YWNrLFxyXG4gICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgdXBkYXRlV2l6YXJkKCB3aXphcmREaXYpIHtcclxuICAgICAgICB3aGlsZSAod2l6YXJkRGl2LmZpcnN0Q2hpbGQpIHtcclxuICAgICAgICAgICAgd2l6YXJkRGl2LnJlbW92ZUNoaWxkKHdpemFyZERpdi5maXJzdENoaWxkKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZm9yKHZhciBpPTA7IGk8dGhpcy5leGVjdXRpb25TdGFjay5sZW5ndGg7IGkrKyl7XHJcbiAgICAgICAgICAgIHZhciBpbm5lckRpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xyXG4gICAgICAgICAgICBpbm5lckRpdi5jbGFzc05hbWUgPSAnd2l6YXJkLWJsb2NrIHdlbGwnO1xyXG4gICAgICAgICAgICBpbm5lckRpdi5hcHBlbmQodGhpcy5leGVjdXRpb25TdGFja1tpXS5zdHJhdGVneS5kaXNwbGF5TmFtZSk7XHJcbiAgICAgICAgICAgIHdpemFyZERpdi5hcHBlbmRDaGlsZChpbm5lckRpdik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgIH1cclxuXHJcbiAgICBnb0JhY2soKSB7XHJcbiAgICAgICAgbGV0IHN0YWNrID0gdGhpcy5oaXN0b3J5QmFja3dhcmQucG9wKCk7XHJcbiAgICAgICAgaWYoc3RhY2sgPT09IHVuZGVmaW5lZClcclxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgdGhpcy5leGVjdXRpb25TdGFjayA9IHN0YWNrO1xyXG4gICAgICAgIGxldCBleGVjdXRpb25Db250ZXh0ID0gdGhpcy5leGVjdXRpb25TdGFja1t0aGlzLmV4ZWN1dGlvblN0YWNrLmxlbmd0aCAtIDFdO1xyXG4gICAgICAgIGxldCB3aXphcmREaXYgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIndpemFyZFwiKTtcclxuICAgICAgICBpZihleGVjdXRpb25Db250ZXh0LnN0cmF0ZWd5LmRpc3BsYXlOYW1lICE9IHdpemFyZERpdi5sYXN0RWxlbWVudENoaWxkLmxhc3RDaGlsZC5kYXRhKVxyXG4gICAgICAgICAgICB0aGlzLnVwZGF0ZVdpemFyZCh3aXphcmREaXYpXHJcblxyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIGN1cnJlbnRTdGF0ZW1lbnQ6ICBleGVjdXRpb25Db250ZXh0LnBjLFxyXG4gICAgICAgICAgICBjdXJyZW50U3RyYXRlZ3k6IGV4ZWN1dGlvbkNvbnRleHQuc3RyYXRlZ3ksXHJcbiAgICAgICAgICAgIGV4ZWN1dGlvblN0YWNrOiB0aGlzLmV4ZWN1dGlvblN0YWNrLFxyXG4gICAgICAgIH07XHJcbiAgICB9XHJcbn1cclxuXHJcblxyXG5jbGFzcyBGdW5jdGlvbkV4ZWNDb250ZXh0IHtcclxuICAgIGNvbnN0cnVjdG9yKHN0cmF0ZWd5KSB7XHJcbiAgICAgICAgdGhpcy5zdHJhdGVneSA9IHN0cmF0ZWd5O1xyXG4gICAgICAgIHRoaXMucGMgPSAwO1xyXG4gICAgfVxyXG5cclxuICAgIGdldCBwYygpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5fcGM7XHJcbiAgICB9XHJcblxyXG4gICAgc2V0IHBjKGxpbmVOdW0pIHtcclxuICAgICAgICB0aGlzLl9wYyA9IHRoaXMuc3RyYXRlZ3kuc3RhdGVtZW50c1tsaW5lTnVtXTtcclxuICAgIH1cclxuXHJcbiAgICBnZXROZXh0U3RhdGVtZW50KGxpbmVOdW0pIHtcclxuICAgICAgICBpZihsaW5lTnVtICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgdGhpcy5wYyA9IGxpbmVOdW07XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGhpcy5wYyA9IHRoaXMucGMuc3VjY2Vzc29yO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gdGhpcy5wYztcclxuICAgIH1cclxuXHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0ge1xyXG4gICAgSW50ZXJwcmV0ZXI6IEludGVycHJldGVyXHJcbn07IiwiJ3VzZSBzdHJpY3QnO1xyXG5cclxubGV0IHN0cmF0ZWdpZXMgPSBbXHJcbiAgICB7XHJcbiAgICAgICAgbmFtZTogXCJtb2RlbEZhdWx0TG9jYWxpemF0aW9uXCIsXHJcbiAgICAgICAgZGlzcGxheU5hbWU6IFwiTW9kZWwgRmF1bHQgTG9jYWxpemF0aW9uXCIsXHJcbiAgICAgICAgc3RhdGVtZW50czogW3tcclxuICAgICAgICAgICAgbGluZU51bTogMCxcclxuICAgICAgICAgICAgdGV4dDogXCJTdHJhdGVneSBtb2RlbEZhdWx0TG9jYWxpemF0aW9uKGNvZGUsIGZhaWx1cmUsIHN5c3RlbSkge1wiLFxyXG4gICAgICAgICAgICBzdWNjZXNzb3I6IDEsXHJcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIk1vZGVsIGZhdWx0IGxvY2FsaXphdGlvbiB0YWtlcyBjb2RlLCBhIGZhaWx1cmUgdGhhdCB0aGUgY29kZSBnZW5lcmF0ZXMsIGFuZCBhIHN5c3RlbSB3aXRoIHdoaWNoIHRoZSBjb2RlIGludGVyYWN0cy4gXCIgK1xyXG4gICAgICAgICAgICBcIkFmdGVyIGZpbmRpbmcgcmVmZXJlbmNlQ29kZSwgdGhlIHN0cmF0ZWd5IHRlc3RzIGlmIGZhaWx1cmUgaXMgc3RpbGwgd2l0bmVzc2VkIHRoaXMgZGlmZmVyZW50IChhbmQgYXNzdW1lZCBjb3JyZWN0KSBjb2RlLiBcIiArXHJcbiAgICAgICAgICAgIFwiSWYgaXQgaXMsIHRoZW4gYSBjYXVzZSBvZiB0aGUgZmFpbHVyZSBsaWVzIGluIHRoZSBjb25maWd1cmF0aW9uLiBcIiArXHJcbiAgICAgICAgICAgIFwiSWYgbm90LCB0aGUgZmF1bHQgY2FuIHRoZW4gYmUgbG9jYWxpemVkIGJ5IHN5c3RlbWF0aWNhbGx5IGNvbXBhcmluZyByZWZlcmVuY2VDb2RlIHRvIGNvZGUuXCIsXHJcbiAgICAgICAgICAgIGNsYXNzOiAnJyxcclxuICAgICAgICAgICAgdmFyaWFibGVzOiBbXCJjb2RlXCIsIFwic3lzdGVtXCIsIFwiZmFpbHVyZVwiXSxcclxuICAgICAgICAgICAgbmV4dFN0cmF0ZWd5OiBcIlwiLFxyXG4gICAgICAgICAgICBhY3RpdmVMaW5lczogWzBdXHJcbiAgICAgICAgfSwge1xyXG4gICAgICAgICAgICBsaW5lTnVtOiAxLFxyXG4gICAgICAgICAgICB0ZXh0OiBcInJlZmVyZW5jZUNvZGUgPSBmaW5kUmVmZXJlbmNlQ29kZShzeXN0ZW0pO1wiLFxyXG4gICAgICAgICAgICBzdWNjZXNzb3I6IDIsXHJcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIkZpbmQgc29tZSByZWZlcmVuY2UgY29kZSB0aGF0IGludGVyYWN0cyB3aXRoIHRoZSBzeXN0ZW0gdGhhdCB5b3Uga25vdyBtdXN0IGJlIGNvcnJlY3QgY29kZS5UaGlzIGNvZGUgbWlnaHQgYmUgZ2l2ZW4gYnkgdGhlIHN5c3RlbSBhdXRob3JzIGluIGFuIG9mZmljaWFsIHR1dG9yaWFsIG9yIG1pZ2h0IGJlIGNvZGUgZm91bmQgZnJvbSBhIHRoaXJkIHBhcnR5LlwiLFxyXG4gICAgICAgICAgICBjbGFzczogXCJtYXJnaW4tMVwiLFxyXG4gICAgICAgICAgICB2YXJpYWJsZXM6IFtcInN5c3RlbVwiLFwicmVmZXJlbmNlQ29kZVwiXSxcclxuICAgICAgICAgICAgbmV4dFN0cmF0ZWd5OiBcIlwiLFxyXG4gICAgICAgICAgICBhY3RpdmVMaW5lczogWzFdXHJcbiAgICAgICAgfSwge1xyXG4gICAgICAgICAgICBsaW5lTnVtOiAyLFxyXG4gICAgICAgICAgICB0ZXh0OiBcImV4ZWN1dGUocmVmZXJlbmNlQ29kZSwgc3lzdGVtKTtcIixcclxuICAgICAgICAgICAgc3VjY2Vzc29yOiAzLFxyXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJUcnkgdG8gZXhlY3V0ZSB0aGUgY29kZSB5b3UgaGF2ZSBmb3VuZCBmcm9tIEdpdGh1YiBvciBTdGFja292ZXJmbG93IGFuZCBjaGVjayBpZiBpdCBmaXhlcyB0aGUgZmFpbHVyZSBcIixcclxuICAgICAgICAgICAgY2xhc3M6IFwibWFyZ2luLTFcIixcclxuICAgICAgICAgICAgdmFyaWFibGVzOiBbXCJyZWZlcmVuY2VDb2RlXCIsIFwic3lzdGVtXCJdLFxyXG4gICAgICAgICAgICBuZXh0U3RyYXRlZ3k6IFwiXCIsXHJcbiAgICAgICAgICAgIGFjdGl2ZUxpbmVzOiBbMl1cclxuICAgICAgICB9LCB7XHJcbiAgICAgICAgICAgIGxpbmVOdW06IDMsXHJcbiAgICAgICAgICAgIHRleHQ6IFwiaWYgKGV4ZWN1dGlvbiBvZiByZWZlcmVuY2VDb2RlIHRocm93cyBmYWlsdXJlKSB7XCIsXHJcbiAgICAgICAgICAgIHN1Y2Nlc3NvcjogNCxcclxuICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiSWYgZXhlY3V0aW5nIHRoZSByZWZlcmVuY2VDb2RlIGNhdXNlcyBGYWlsdXJlLCBjbGljayB0aGUgaWYgc3RhdGVtZW50LiBPdGhlcndpc2UgY2xpY2sgdGhlIGVsc2Ugc3RhdGVtZW50IFwiLFxyXG4gICAgICAgICAgICBjbGFzczogXCJtYXJnaW4tMVwiLFxyXG4gICAgICAgICAgICB2YXJpYWJsZXM6IFtcInJlZmVyZW5jZUNvZGVcIiwgXCJzeXN0ZW1cIl0sXHJcbiAgICAgICAgICAgIG5leHRTdHJhdGVneTogXCJcIixcclxuICAgICAgICAgICAgYWN0aXZlTGluZXM6IFszLCA1XVxyXG4gICAgICAgIH0sIHtcclxuICAgICAgICAgICAgbGluZU51bTogNCxcclxuICAgICAgICAgICAgdGV4dDogXCIgY29uZmlndXJhdGlvbkRlYnVnZ2luZyhjb2RlLCBmYWlsdXJlLCBzeXN0ZW0pOyBcIixcclxuICAgICAgICAgICAgc3VjY2Vzc29yOiA4LFxyXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJDb250aW51ZSB3aXRoIHN0cmF0ZWd5IGNvbmZpZ3VyYXRpb25EZWJ1Z2dpbmcgYnkgY2xpY2tpbmcgbmV4dCBidXR0b24gXCIsXHJcbiAgICAgICAgICAgIGNsYXNzOiBcIm1hcmdpbi0yXCIsXHJcbiAgICAgICAgICAgIHZhcmlhYmxlczogWyBcImNvZGVcIiwgXCJmYWlsdXJlXCIsIFwic3lzdGVtXCJdLFxyXG4gICAgICAgICAgICBuZXh0U3RyYXRlZ3k6IFwiY29uZmlndXJhdGlvbkRlYnVnZ2luZ1wiLFxyXG4gICAgICAgICAgICBhY3RpdmVMaW5lczogWzRdXHJcbiAgICAgICAgfSwge1xyXG4gICAgICAgICAgICBsaW5lTnVtOiA1LFxyXG4gICAgICAgICAgICB0ZXh0OiBcIn0gZWxzZSB7XCIsXHJcbiAgICAgICAgICAgIHN1Y2Nlc3NvcjogNixcclxuICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiXCIsXHJcbiAgICAgICAgICAgIGNsYXNzOiBcIm1hcmdpbi0xXCIsXHJcbiAgICAgICAgICAgIG5leHRTdHJhdGVneTogXCJcIixcclxuICAgICAgICAgICAgYWN0aXZlTGluZXM6IFszLCA1XVxyXG4gICAgICAgIH0sIHtcclxuICAgICAgICAgICAgbGluZU51bTogNixcclxuICAgICAgICAgICAgdGV4dDogXCJkZWx0YURlYnVnZ2luZyhjb2RlLCByZWZlcmVuY2VDb2RlLCBmYWlsdXJlKTsgXCIsXHJcbiAgICAgICAgICAgIHN1Y2Nlc3NvcjogNyxcclxuICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiQ29udGludWUgd2l0aCBkZWx0YURlYnVnZ2luZyBzdHJhdGVneSBieSBjbGlja2luZyBuZXh0IGJ1dHRvblwiLFxyXG4gICAgICAgICAgICBjbGFzczogXCJtYXJnaW4tMlwiLFxyXG4gICAgICAgICAgICB2YXJpYWJsZXM6IFsgXCJjb2RlXCIsIFwicmVmZXJlbmNlQ29kZVwiLCBcImZhaWx1cmVcIl0sXHJcbiAgICAgICAgICAgIG5leHRTdHJhdGVneTogXCJkZWx0YURlYnVnZ2luZ1wiLFxyXG4gICAgICAgICAgICBhY3RpdmVMaW5lczogWzZdXHJcbiAgICAgICAgfSwge1xyXG4gICAgICAgICAgICBsaW5lTnVtOiA3LFxyXG4gICAgICAgICAgICB0ZXh0OiBcIn1cIixcclxuICAgICAgICAgICAgc3VjY2Vzc29yOiA4LFxyXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJcIixcclxuICAgICAgICAgICAgY2xhc3M6IFwibWFyZ2luLTFcIixcclxuICAgICAgICAgICAgbmV4dFN0cmF0ZWd5OiBcIlwiLFxyXG4gICAgICAgICAgICBhY3RpdmVMaW5lczogWzddXHJcbiAgICAgICAgfSwge1xyXG4gICAgICAgICAgICBsaW5lTnVtOiA4LFxyXG4gICAgICAgICAgICB0ZXh0OiBcIn1cIixcclxuICAgICAgICAgICAgc3VjY2Vzc29yOiA5LFxyXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJcIixcclxuICAgICAgICAgICAgY2xhc3M6IFwiXCIsXHJcbiAgICAgICAgICAgIG5leHRTdHJhdGVneTogXCJcIixcclxuICAgICAgICAgICAgYWN0aXZlTGluZXM6IFs4XVxyXG4gICAgICAgIH0sIHtcclxuICAgICAgICAgICAgbGluZU51bTogOSxcclxuICAgICAgICAgICAgdGV4dDogXCJcIixcclxuICAgICAgICAgICAgc3VjY2Vzc29yOiBcInVuZGVmaW5lZFwiLFxyXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJcIixcclxuICAgICAgICAgICAgY2xhc3M6IFwiXCIsXHJcbiAgICAgICAgICAgIG5leHRTdHJhdGVneTogXCJcIixcclxuICAgICAgICAgICAgYWN0aXZlTGluZXM6IFs5XVxyXG4gICAgICAgIH1dXHJcbiAgICB9LFxyXG4gICAge1xyXG4gICAgICAgIG5hbWU6IFwiY29uZmlndXJhdGlvbkRlYnVnZ2luZ1wiLFxyXG4gICAgICAgIGRpc3BsYXlOYW1lOiBcIkNvbmZpZ3VyYXRpb24gRGVidWdnaW5nXCIsXHJcbiAgICAgICAgc3RhdGVtZW50czogW3tcclxuICAgICAgICAgICAgbGluZU51bTogMCxcclxuICAgICAgICAgICAgdGV4dDogXCJTdHJhdGVneSBjb25maWd1cmF0aW9uRGVidWdnaW5nKGNvZGUsIGZhaWx1cmUsIHN5c3RlbSl7XCIsXHJcbiAgICAgICAgICAgIHN1Y2Nlc3NvcjogMSxcclxuICAgICAgICAgICAgZGVzY3JpcHRpb246ICdTeXN0ZW1hdGljYWxseSBlbnVtZXJhdGUgYW5kIGluZGl2aWR1YWxseSB2YXJ5IGFsbCBwb3NzaWJsZSBjb25maWd1cmF0aW9uIHBhcmFtZXRlcnMgdG8gZmluZCBhIGNvcnJlY3QgY29uZmlndXJhdGlvbi4nLFxyXG4gICAgICAgICAgICBjbGFzczogXCJcIixcclxuICAgICAgICAgICAgdmFyaWFibGVzOiBbIFwiY29kZVwiLCBcImZhaWx1cmVcIixcInN5c3RlbVwiXSxcclxuICAgICAgICAgICAgbmV4dFN0cmF0ZWd5OiBcIlwiLFxyXG4gICAgICAgICAgICBhY3RpdmVMaW5lczogWzBdXHJcbiAgICAgICAgfSwge1xyXG4gICAgICAgICAgICBsaW5lTnVtOiAxLFxyXG4gICAgICAgICAgICB0ZXh0OiBcImNvbmZpZ3VyYXRpb25QYXJhbWV0ZXJzID0gZW51bWVyYXRlQ29uZmlnUGFyYW1ldGVycyhjb2RlKTtcIixcclxuICAgICAgICAgICAgc3VjY2Vzc29yOiAyLFxyXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1VzZSBzdHJhdGVneSBlbnVtZXJhdGVDb25maWdQYXJhbWV0ZXJzIHRvIGNvbGxlY3QgY29uZmlndXJhdGlvblBhcmFtZXRlcnMgJyxcclxuICAgICAgICAgICAgY2xhc3M6IFwibWFyZ2luLTFcIixcclxuICAgICAgICAgICAgdmFyaWFibGVzOiBbXCJjb2RlXCJdLFxyXG4gICAgICAgICAgICBuZXh0U3RyYXRlZ3k6IFwiXCIsXHJcbiAgICAgICAgICAgIGFjdGl2ZUxpbmVzOiBbMV1cclxuICAgICAgICB9LCB7XHJcbiAgICAgICAgICAgIGxpbmVOdW06IDIsXHJcbiAgICAgICAgICAgIHRleHQ6IFwiZW51bWVyYXRlQ29uZmlnUGFyYW1ldGVycyhzeXN0ZW0pO1wiLFxyXG4gICAgICAgICAgICBzdWNjZXNzb3I6IDMsXHJcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIkNvbnRpbnVlIHdpdGggc3RyYXRlZ3kgZW51bWVyYXRlQ29uZmlnUGFyYW1ldGVycyBieSBjbGlja2luZyBuZXh0IGJ1dHRvblwiLFxyXG4gICAgICAgICAgICBjbGFzczogXCJtYXJnaW4tMVwiLFxyXG4gICAgICAgICAgICB2YXJpYWJsZXM6IFtcInN5c3RlbVwiXSxcclxuICAgICAgICAgICAgbmV4dFN0cmF0ZWd5OiBcImVudW1lcmF0ZUNvbmZpZ1BhcmFtZXRlcnNcIixcclxuICAgICAgICAgICAgYWN0aXZlTGluZXM6IFsyXVxyXG4gICAgICAgIH0sIHtcclxuICAgICAgICAgICAgbGluZU51bTogMyxcclxuICAgICAgICAgICAgdGV4dDogXCJmb3IgKHBhcmFtIGluIGNvbmZpZ3VyYXRpb25QYXJhbWV0ZXJzKSB7XCIsXHJcbiAgICAgICAgICAgIHN1Y2Nlc3NvcjogNCxcclxuICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiIGZvciBlYWNoIHBhcmFtZXRlciB0aGF0IHlvdSBoYXZlIGFkZGVkIHRvIHRoZSBsaXN0IG9mIGNvbmZpZ3VyYXRpb25QYXJhbXNcIixcclxuICAgICAgICAgICAgY2xhc3M6IFwibWFyZ2luLTFcIixcclxuICAgICAgICAgICAgbmV4dFN0cmF0ZWd5OiBcIlwiLFxyXG4gICAgICAgICAgICBhY3RpdmVMaW5lczogWzNdXHJcbiAgICAgICAgfSwge1xyXG4gICAgICAgICAgICBsaW5lTnVtOiA0LFxyXG4gICAgICAgICAgICB0ZXh0OiBcInN5c3RlbS5jaGFuZ2VDb25maWd1cmF0aW9uUGFyYW1ldGVyKCk7XCIsXHJcbiAgICAgICAgICAgIHN1Y2Nlc3NvcjogNSxcclxuICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiIGNoYW5nZSB0aGUgY29uZmlnIHBhcmFtcyBhbmQgZXhlY3V0ZSB0aGUgY29kZVwiLFxyXG4gICAgICAgICAgICBjbGFzczogXCJtYXJnaW4tMlwiLFxyXG4gICAgICAgICAgICBuZXh0U3RyYXRlZ3k6IFwiXCIsXHJcbiAgICAgICAgICAgIGFjdGl2ZUxpbmVzOiBbNF1cclxuICAgICAgICB9LCB7XHJcbiAgICAgICAgICAgIGxpbmVOdW06IDUsXHJcbiAgICAgICAgICAgIHRleHQ6IFwiIG5ld0V4ZWN1dGlvbiA9IGV4ZWN1dGUoY29kZSwgc3lzdGVtKTsgXCIsXHJcbiAgICAgICAgICAgIHN1Y2Nlc3NvcjogNixcclxuICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiZm9yIHRoZSBjaGFuZ2VkIHBhcmFtZXRlcnMsIGV4ZWN1dGUgdGhlIGNvZGUgYW5kIHNlZSBpZiB0aGUgZmFpbHVyZSBnZXQgZml4ZWQgb3Igbm90XCIsXHJcbiAgICAgICAgICAgIGNsYXNzOiBcIm1hcmdpbi0yXCIsXHJcbiAgICAgICAgICAgIHZhcmlhYmxlczogW1wiY29kZVwiLCBcInN5c3RlbVwiXSxcclxuICAgICAgICAgICAgbmV4dFN0cmF0ZWd5OiBcIlwiLFxyXG4gICAgICAgICAgICBhY3RpdmVMaW5lczogWzVdXHJcbiAgICAgICAgfSwge1xyXG4gICAgICAgICAgICBsaW5lTnVtOiA2LFxyXG4gICAgICAgICAgICB0ZXh0OiBcIiBpZihuZXdFeGVjdXRpb24gdGhyb3dzIGZhaWx1cmUpIHtcIixcclxuICAgICAgICAgICAgc3VjY2Vzc29yOiA3LFxyXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJpZiB0aGUgY2hhbmdlZCBwYXJhbWV0ZXJzIGRvIG5vdCBoYXZlIGFueSBlZmZlY3QgaW4gZml4aW5nIHRoZSBmYWlsdXJlIGFuZCB5b3Ugc3RpbGwgaGF2ZSB0aGUgZmFpbHVyZSxcIixcclxuICAgICAgICAgICAgY2xhc3M6IFwibWFyZ2luLTJcIixcclxuICAgICAgICAgICAgdmFyaWFibGVzOiBbXCJjb2RlXCIsXCJzeXN0ZW1cIl0sXHJcbiAgICAgICAgICAgIG5leHRTdHJhdGVneTogXCJcIixcclxuICAgICAgICAgICAgYWN0aXZlTGluZXM6IFs2LCA5XVxyXG4gICAgICAgIH0sIHtcclxuICAgICAgICAgICAgbGluZU51bTogNyxcclxuICAgICAgICAgICAgdGV4dDogXCJzeXN0ZW0ucmV2ZXJ0Q29uZmlndXJhdGlvblBhcmFtZXRlcigpO1wiLFxyXG4gICAgICAgICAgICBzdWNjZXNzb3I6IDgsXHJcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIiByZXZlcnQgY2hhbmdlc1wiLFxyXG4gICAgICAgICAgICBjbGFzczogXCJtYXJnaW4tM1wiLFxyXG4gICAgICAgICAgICBuZXh0U3RyYXRlZ3k6IFwiXCIsXHJcbiAgICAgICAgICAgIGFjdGl2ZUxpbmVzOiBbN11cclxuICAgICAgICB9LCB7XHJcbiAgICAgICAgICAgIGxpbmVOdW06IDgsXHJcbiAgICAgICAgICAgIHRleHQ6IFwiY29udGludWU7XCIsXHJcbiAgICAgICAgICAgIHN1Y2Nlc3NvcjogMTEsXHJcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcImNvbnRpbnVlIHdpdGggbmV4dCBwYXJhbVwiLFxyXG4gICAgICAgICAgICBjbGFzczogXCJtYXJnaW4tM1wiLFxyXG4gICAgICAgICAgICBuZXh0U3RyYXRlZ3k6IFwiXCIsXHJcbiAgICAgICAgICAgIGFjdGl2ZUxpbmVzOiBbOF1cclxuICAgICAgICB9LCB7XHJcbiAgICAgICAgICAgIGxpbmVOdW06IDksXHJcbiAgICAgICAgICAgIHRleHQ6IFwifSBlbHNlIHtcIixcclxuICAgICAgICAgICAgc3VjY2Vzc29yOiAxMCxcclxuICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiSWYgbm8gZmFpbHVyZSBvY2N1cnJlZCwgeW91IHN1Y2NlZWRlZCB0byBmaXggdGhlIHByb2JsZW0uXCIsXHJcbiAgICAgICAgICAgIGNsYXNzOiBcIm1hcmdpbi0yXCIsXHJcbiAgICAgICAgICAgIG5leHRTdHJhdGVneTogXCJcIixcclxuICAgICAgICAgICAgYWN0aXZlTGluZXM6IFs2LDldXHJcbiAgICAgICAgfSwge1xyXG4gICAgICAgICAgICBsaW5lTnVtOiAxMCxcclxuICAgICAgICAgICAgdGV4dDogXCJyZXR1cm4gU1VDQ0VTUztcIixcclxuICAgICAgICAgICAgc3VjY2Vzc29yOiAxMSxcclxuICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiIENvbmdyYXRzLCB5b3UgZml4ZWQgdGhlIGZhaWx1cmUuXCIsXHJcbiAgICAgICAgICAgIGNsYXNzOiBcIm1hcmdpbi0zXCIsXHJcbiAgICAgICAgICAgIG5leHRTdHJhdGVneTogXCJcIixcclxuICAgICAgICAgICAgYWN0aXZlTGluZXM6IFsxMF1cclxuICAgICAgICB9LCB7XHJcbiAgICAgICAgICAgIGxpbmVOdW06IDExLFxyXG4gICAgICAgICAgICB0ZXh0OiBcIn1cIixcclxuICAgICAgICAgICAgc3VjY2Vzc29yOiAxMixcclxuICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiXCIsXHJcbiAgICAgICAgICAgIGNsYXNzOiBcIm1hcmdpbi0yXCIsXHJcbiAgICAgICAgICAgIG5leHRTdHJhdGVneTogXCJcIixcclxuICAgICAgICAgICAgYWN0aXZlTGluZXM6IFsxMV1cclxuICAgICAgICB9LCB7XHJcbiAgICAgICAgICAgIGxpbmVOdW06IDEyLFxyXG4gICAgICAgICAgICB0ZXh0OiBcIn1cIixcclxuICAgICAgICAgICAgc3VjY2Vzc29yOiAxMyxcclxuICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiXCIsXHJcbiAgICAgICAgICAgIGNsYXNzOiBcIm1hcmdpbi0xXCIsXHJcbiAgICAgICAgICAgIG5leHRTdHJhdGVneTogXCJcIixcclxuICAgICAgICAgICAgYWN0aXZlTGluZXM6IFsxMl1cclxuICAgICAgICB9LCB7XHJcbiAgICAgICAgICAgIGxpbmVOdW06IDEzLFxyXG4gICAgICAgICAgICB0ZXh0OiBcIlwiLFxyXG4gICAgICAgICAgICBzdWNjZXNzb3I6IFwidW5kZWZpbmVkXCIsXHJcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIlwiLFxyXG4gICAgICAgICAgICBjbGFzczogXCJtYXJnaW4tMVwiLFxyXG4gICAgICAgICAgICBuZXh0U3RyYXRlZ3k6IFwiXCIsXHJcbiAgICAgICAgICAgIGFjdGl2ZUxpbmVzOiBbMTNdXHJcbiAgICAgICAgfV1cclxuICAgIH0sXHJcbiAgICB7XHJcbiAgICAgICAgbmFtZTogXCJlbnVtZXJhdGVDb25maWdQYXJhbWV0ZXJzXCIsXHJcbiAgICAgICAgZGlzcGxheU5hbWU6IFwiRW51bWVyYXRlIENvbmZpZ3VyYXRpb24gUGFyYW1ldGVyc1wiLFxyXG4gICAgICAgIHN0YXRlbWVudHM6IFt7XHJcbiAgICAgICAgICAgIGxpbmVOdW06IDAsXHJcbiAgICAgICAgICAgIHRleHQ6IFwiU3RyYXRlZ3kgZW51bWVyYXRlQ29uZmlnUGFyYW1ldGVycyhzeXN0ZW0pe1wiLFxyXG4gICAgICAgICAgICBzdWNjZXNzb3I6IDEsXHJcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQnJhaW5zdG9ybSBhIGxpc3Qgb2YgYWxsIGNvbmZpZ3VyYXRpb24gcGFyYW1ldGVycyB5b3UgbWlnaHQgYmUgYWJsZSB0byB2YXJ5LicgK1xyXG4gICAgICAgICAgICAnQSBjb25maWd1cmF0aW9uIHBhcmFtYXRlciBoZXJlIHJlZmVycyB0byBzb21lIGFzcGVjdCBvZiBob3cgdGhlIGNvZGUgaXMgYmVpbmcgZXhlY3V0ZWQgdGhhdCBtaWdodCBiZSBjaGFuZ2VkLicgK1xyXG4gICAgICAgICAgICAnVGhpcyBkb2VzIE5PVCByZWZlciB0byBjaGFuZ2VzIHRvIHRoZSBjb2RlIGl0c2VsZi4gUmF0aGVyLCBpdCByZWZlcnMgdG8gY2hhbmdlcyB0byBldmVyeXRoaW5nIGVsc2UgdGhhdCBpbmZsdWVuY2VzIEhPVyB0aGUgY29kZSBpcyBleGVjdXRlZC4nICtcclxuICAgICAgICAgICAgJ1RoaXMgbWlnaHQgaW5jbHVkZSB0aGUgZGV2ZWxvcG1lbnQgZW52aXJvbm1lbnQgdGhhdCBydW5zIHRoZSBjb2RlLCB0aGUgdmVyc2lvbiBvZiB0aGUgc3lzdGVtIHRoYXQgaXMgYmVpbmcgdXNlZCwgdGhlIG9wZXJhdGluZyBzeXN0ZW0gb24gd2hpY2ggdGhlIGNvZGUgaXMgYmVpbmcgZXhlY3V0ZWQsIHRoZSBydW50aW1lIGVuZ2luZSBiZWluZyB1c2VkIHRvIGV4ZWN1dGUgdGhlIGNvZGUsICcgK1xyXG4gICAgICAgICAgICAndGhlIGNvbmZpZ3VyYXRpb24gZmlsZXMgdGhhdCBhcmUgYmVpbmcgdXNlZCB0byBpbml0aWFsaXplIHRoZSBzeXN0ZW0uJyxcclxuICAgICAgICAgICAgY2xhc3M6IFwiXCIsXHJcbiAgICAgICAgICAgIG5leHRTdHJhdGVneTogXCJcIixcclxuICAgICAgICAgICAgYWN0aXZlTGluZXM6IFswXVxyXG4gICAgICAgIH0sIHtcclxuICAgICAgICAgICAgbGluZU51bTogMSxcclxuICAgICAgICAgICAgdGV4dDogXCJjb25maWd1cmF0aW9uUGFyYW1ldGVycyA9IHt9O1wiLFxyXG4gICAgICAgICAgICBzdWNjZXNzb3I6IDIsXHJcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIk1ha2UgYW4gZW1wdHkgbGlzdCBvZiBwYXJhbWV0ZXJzXCIsXHJcbiAgICAgICAgICAgIGNsYXNzOiBcIm1hcmdpbi0xXCIsXHJcbiAgICAgICAgICAgIG5leHRTdHJhdGVneTogXCJcIixcclxuICAgICAgICAgICAgYWN0aXZlTGluZXM6IFsxXVxyXG4gICAgICAgIH0sIHtcclxuICAgICAgICAgICAgbGluZU51bTogMixcclxuICAgICAgICAgICAgdGV4dDogXCJ3aGlsZSAobW9yZUlkZWFzKSB7XCIsXHJcbiAgICAgICAgICAgIHN1Y2Nlc3NvcjogMyxcclxuICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiXCIsXHJcbiAgICAgICAgICAgIGNsYXNzOiBcIm1hcmdpbi0xXCIsXHJcbiAgICAgICAgICAgIG5leHRTdHJhdGVneTogXCJcIixcclxuICAgICAgICAgICAgYWN0aXZlTGluZXM6IFsyLDRdXHJcblxyXG4gICAgICAgIH0sIHtcclxuICAgICAgICAgICAgbGluZU51bTogMyxcclxuICAgICAgICAgICAgdGV4dDogXCJjb25maWd1cmF0aW5vUGFyYW1ldGVycy5hZGQoYnJhaW5zdG9ybUNvbmZpZ1BhcmFtZXRlcnMoKSk7XCIsXHJcbiAgICAgICAgICAgIHN1Y2Nlc3NvcjogMixcclxuICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiQWRkIGFzIG11Y2ggcGFyYW1ldGVycyBhcyB5b3UgY2FuIGFkZCBpbmNsdWRpbmc6XCIgK1xyXG4gICAgICAgICAgICBcInRoZSBkZXZlbG9wbWVudCBlbnZpcm9ubWVudCB0aGF0IHJ1bnMgdGhlIGNvZGUsXCIgK1xyXG4gICAgICAgICAgICBcInRoZSB2ZXJzaW9uIG9mIHRoZSBzeXN0ZW0gdGhhdCBpcyBiZWluZyB1c2VkLFwiICtcclxuICAgICAgICAgICAgXCJ0aGUgb3BlcmF0aW5nIHN5c3RlbSBvbiB3aGljaCB0aGUgY29kZSBpcyBiZWluZyBleGVjdXRlZCwgXCIgK1xyXG4gICAgICAgICAgICBcInRoZSBydW50aW1lIGVuZ2luZSBiZWluZyB1c2VkIHRvIGV4ZWN1dGUgdGhlIGNvZGUsIFwiICtcclxuICAgICAgICAgICAgXCJ0aGUgY29uZmlndXJhdGlvbiBmaWxlcyB0aGF0IGFyZSBiZWluZyB1c2VkIHRvIGluaXRpYWxpemUgdGhlIHN5c3RlbSBcIixcclxuICAgICAgICAgICAgY2xhc3M6IFwibWFyZ2luLTJcIixcclxuICAgICAgICAgICAgbmV4dFN0cmF0ZWd5OiBcIlwiLFxyXG4gICAgICAgICAgICBhY3RpdmVMaW5lczogWzNdLFxyXG4gICAgICAgICAgICBsb29wOiB0cnVlXHJcbiAgICAgICAgfSwge1xyXG4gICAgICAgICAgICBsaW5lTnVtOiA0LFxyXG4gICAgICAgICAgICB0ZXh0OiBcImlmKG5vIG1vcmUgaWRlYXMpIHJldHVybiBjb25maWd1cmF0aW9uUGFyYW1ldGVycztcIixcclxuICAgICAgICAgICAgc3VjY2Vzc29yOiA1LFxyXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJnbyBiYWNrIHRvIHRoZSBzdHJhdGVneSA6IGNvbmZpZ3VyYXRpb25EZWJ1Z2dpbmcgd2l0aCB0aGUgbGlzdCBvZiBwYXJhbWV0ZXJzIHRvIGNvbnRpbnVlLlwiLFxyXG4gICAgICAgICAgICBjbGFzczogXCJtYXJnaW4tMVwiLFxyXG4gICAgICAgICAgICBuZXh0U3RyYXRlZ3k6IFwiXCIsXHJcbiAgICAgICAgICAgIGFjdGl2ZUxpbmVzOiBbMiw0XVxyXG4gICAgICAgIH0sIHtcclxuICAgICAgICAgICAgbGluZU51bTogNSxcclxuICAgICAgICAgICAgdGV4dDogXCJ9XCIsXHJcbiAgICAgICAgICAgIHN1Y2Nlc3NvcjogNixcclxuICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiXCIsXHJcbiAgICAgICAgICAgIGNsYXNzOiBcIlwiLFxyXG4gICAgICAgICAgICBuZXh0U3RyYXRlZ3k6IFwiXCIsXHJcbiAgICAgICAgICAgIGFjdGl2ZUxpbmVzOiBbNV1cclxuICAgICAgICB9LCB7XHJcbiAgICAgICAgICAgIGxpbmVOdW06IDYsXHJcbiAgICAgICAgICAgIHRleHQ6IFwiXCIsXHJcbiAgICAgICAgICAgIHN1Y2Nlc3NvcjogXCJ1bmRlZmluZWRcIixcclxuICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiXCIsXHJcbiAgICAgICAgICAgIGNsYXNzOiBcIlwiLFxyXG4gICAgICAgICAgICBuZXh0U3RyYXRlZ3k6IFwiXCIsXHJcbiAgICAgICAgICAgIGFjdGl2ZUxpbmVzOiBbNl1cclxuICAgICAgICB9XVxyXG4gICAgfSxcclxuICAgIHtcclxuICAgICAgICBuYW1lOiBcImRlbHRhRGVidWdnaW5nXCIsXHJcbiAgICAgICAgZGlzcGxheU5hbWU6IFwiRGVsdGEgRGVidWdnaW5nXCIsXHJcbiAgICAgICAgc3RhdGVtZW50czogW3tcclxuICAgICAgICAgICAgbGluZU51bTogMCxcclxuICAgICAgICAgICAgdGV4dDogXCJTdHJhdGVneSBkZWx0YURlYnVnZ2luZyhjb2RlLCByZWZlcmVuY2VDb2RlLCBmYWlsdXJlKXtcIixcclxuICAgICAgICAgICAgc3VjY2Vzc29yOiAxLFxyXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJGaW5kIHRoZSBjaGFuZ2VzIGZyb20gcmVmZXJlbmNlQ29kZSB0byBjb2RlIHRoYXQgY2F1c2UgZmFpbHVyZSwgbWluaW1pemluZyB0aGUgY2F1c2Ugb2YgZmFpbHVyZSB0byBhIG1pbmltYWwgY29kZSBlZGl0LlwiLFxyXG4gICAgICAgICAgICBjbGFzczogXCJcIixcclxuICAgICAgICAgICAgbmV4dFN0cmF0ZWd5OiBcIlwiLFxyXG4gICAgICAgICAgICBhY3RpdmVMaW5lczogWzBdXHJcbiAgICAgICAgfSwge1xyXG4gICAgICAgICAgICBsaW5lTnVtOiAxLFxyXG4gICAgICAgICAgICB0ZXh0OiBcInJlZmVyZW5jZUNvZGUub25lRWRpdFRvTG9va0xpa2UoY29kZSk7XCIsXHJcbiAgICAgICAgICAgIHN1Y2Nlc3NvcjogMixcclxuICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiXCIsXHJcbiAgICAgICAgICAgIGNsYXNzOiBcIm1hcmdpbi0xXCIsXHJcbiAgICAgICAgICAgIG5leHRTdHJhdGVneTogXCJcIixcclxuICAgICAgICAgICAgYWN0aXZlTGluZXM6IFsxXVxyXG4gICAgICAgIH0sIHtcclxuICAgICAgICAgICAgbGluZU51bTogMixcclxuICAgICAgICAgICAgdGV4dDogXCJleGVjdXRlKHJlZmVyZW5jZUNvZGUsIHN5c3RlbSlcIixcclxuICAgICAgICAgICAgc3VjY2Vzc29yOiAzLFxyXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJFeGVjdXRlIHRoZSBjaGFuZ2VkIGNvZGUgdG8gc2VlIGlmIGl0IGZhaWxzIG9yIHN1Y2NlZWRzXCIsXHJcbiAgICAgICAgICAgIGNsYXNzOiBcIm1hcmdpbi0xXCIsXHJcbiAgICAgICAgICAgIG5leHRTdHJhdGVneTogXCJcIixcclxuICAgICAgICAgICAgYWN0aXZlTGluZXM6IFsyXVxyXG4gICAgICAgIH0sIHtcclxuICAgICAgICAgICAgbGluZU51bTogMyxcclxuICAgICAgICAgICAgdGV4dDogXCJpZiAoISAoZXhlY3V0ZShyZWZlcmVuY2VDb2RlLCBzeXN0ZW0pIHRocm93cyBmYWlsdXJlKSkge1wiLFxyXG4gICAgICAgICAgICBzdWNjZXNzb3I6IDQsXHJcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIklmIHRoZSBleGVjdXRpb24gb2YgbmV3IGNvZGUgZG9lcyBub3QgdGhyb3cgZmFpbHVyZVwiLFxyXG4gICAgICAgICAgICBjbGFzczogXCJtYXJnaW4tMVwiLFxyXG4gICAgICAgICAgICBuZXh0U3RyYXRlZ3k6IFwiXCIsXHJcbiAgICAgICAgICAgIGFjdGl2ZUxpbmVzOiBbMywgNV1cclxuICAgICAgICB9LCB7XHJcbiAgICAgICAgICAgIGxpbmVOdW06IDQsXHJcbiAgICAgICAgICAgIHRleHQ6IFwicmV0dXJuIFNVQ0NFU1M7IFwiLFxyXG4gICAgICAgICAgICBzdWNjZXNzb3I6IDEwLFxyXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJDb25ncmF0cyEgeW91IHN1Y2NlZWQgdG8gZml4IHRoZSBwcm9ibGVtXCIsXHJcbiAgICAgICAgICAgIGNsYXNzOiBcIm1hcmdpbi0yXCIsXHJcbiAgICAgICAgICAgIG5leHRTdHJhdGVneTogXCJcIixcclxuICAgICAgICAgICAgYWN0aXZlTGluZXM6IFs0XVxyXG4gICAgICAgIH0sIHtcclxuICAgICAgICAgICAgbGluZU51bTogNSxcclxuICAgICAgICAgICAgdGV4dDogXCJ9IGVsc2Uge1wiLFxyXG4gICAgICAgICAgICBzdWNjZXNzb3I6IDYsXHJcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIklmIHRoZSBleGVjdXRpb24gb2YgbmV3IGNvZGUgdGhyb3dzIGZhaWx1cmUgXCIsXHJcbiAgICAgICAgICAgIGNsYXNzOiBcIm1hcmdpbi0xXCIsXHJcbiAgICAgICAgICAgIG5leHRTdHJhdGVneTogXCJcIixcclxuICAgICAgICAgICAgYWN0aXZlTGluZXM6IFszLCA1XVxyXG4gICAgICAgIH0sIHtcclxuICAgICAgICAgICAgbGluZU51bTogNixcclxuICAgICAgICAgICAgdGV4dDogXCJyZXZlcnQocmVmZXJlbmNlQ29kZSk7XCIsXHJcbiAgICAgICAgICAgIHN1Y2Nlc3NvcjogNyxcclxuICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiUmV2ZXJ0IHRoZSBjaGFuZ2VzIHlvdSBoYXZlIGFwcGxpZWRcIixcclxuICAgICAgICAgICAgY2xhc3M6IFwibWFyZ2luLTJcIixcclxuICAgICAgICAgICAgbmV4dFN0cmF0ZWd5OiBcIlwiLFxyXG4gICAgICAgICAgICBhY3RpdmVMaW5lczogWzZdXHJcbiAgICAgICAgfSwge1xyXG4gICAgICAgICAgICBsaW5lTnVtOiA3LFxyXG4gICAgICAgICAgICB0ZXh0OiBcInJlZmVyZW5jZUNvZGUub25lRWRpdFRvTG9va0xpa2UoY29kZSk7XCIsXHJcbiAgICAgICAgICAgIHN1Y2Nlc3NvcjogOCxcclxuICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiXCIsXHJcbiAgICAgICAgICAgIGNsYXNzOiBcIm1hcmdpbi0yXCIsXHJcbiAgICAgICAgICAgIG5leHRTdHJhdGVneTogXCJcIixcclxuICAgICAgICAgICAgYWN0aXZlTGluZXM6IFs3XVxyXG4gICAgICAgIH0sIHtcclxuICAgICAgICAgICAgbGluZU51bTogOCxcclxuICAgICAgICAgICAgdGV4dDogXCJ9XCIsXHJcbiAgICAgICAgICAgIHN1Y2Nlc3NvcjogOSxcclxuICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiXCIsXHJcbiAgICAgICAgICAgIGNsYXNzOiBcIm1hcmdpbi0xXCIsXHJcbiAgICAgICAgICAgIG5leHRTdHJhdGVneTogXCJcIixcclxuICAgICAgICAgICAgYWN0aXZlTGluZXM6IFs4XVxyXG4gICAgICAgIH0sIHtcclxuICAgICAgICAgICAgbGluZU51bTogOSxcclxuICAgICAgICAgICAgdGV4dDogXCJ9XCIsXHJcbiAgICAgICAgICAgIHN1Y2Nlc3NvcjogMTAsXHJcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIlwiLFxyXG4gICAgICAgICAgICBjbGFzczogXCJcIixcclxuICAgICAgICAgICAgbmV4dFN0cmF0ZWd5OiBcIlwiLFxyXG4gICAgICAgICAgICBhY3RpdmVMaW5lczogWzldXHJcbiAgICAgICAgfSwge1xyXG4gICAgICAgICAgICBsaW5lTnVtOiAxMCxcclxuICAgICAgICAgICAgdGV4dDogXCJcIixcclxuICAgICAgICAgICAgc3VjY2Vzc29yOiBcInVuZGVmaW5lZFwiLFxyXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJcIixcclxuICAgICAgICAgICAgY2xhc3M6IFwiXCIsXHJcbiAgICAgICAgICAgIG5leHRTdHJhdGVneTogXCJcIixcclxuICAgICAgICAgICAgYWN0aXZlTGluZXM6IFs5XVxyXG4gICAgICAgIH1dXHJcbiAgICB9XHJcbl07XHJcblxyXG5tb2R1bGUuZXhwb3J0cy5zdHJhdGVnaWVzID0gc3RyYXRlZ2llczsiLCIndXNlIHN0cmljdCdcblxuZXhwb3J0cy5ieXRlTGVuZ3RoID0gYnl0ZUxlbmd0aFxuZXhwb3J0cy50b0J5dGVBcnJheSA9IHRvQnl0ZUFycmF5XG5leHBvcnRzLmZyb21CeXRlQXJyYXkgPSBmcm9tQnl0ZUFycmF5XG5cbnZhciBsb29rdXAgPSBbXVxudmFyIHJldkxvb2t1cCA9IFtdXG52YXIgQXJyID0gdHlwZW9mIFVpbnQ4QXJyYXkgIT09ICd1bmRlZmluZWQnID8gVWludDhBcnJheSA6IEFycmF5XG5cbnZhciBjb2RlID0gJ0FCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXowMTIzNDU2Nzg5Ky8nXG5mb3IgKHZhciBpID0gMCwgbGVuID0gY29kZS5sZW5ndGg7IGkgPCBsZW47ICsraSkge1xuICBsb29rdXBbaV0gPSBjb2RlW2ldXG4gIHJldkxvb2t1cFtjb2RlLmNoYXJDb2RlQXQoaSldID0gaVxufVxuXG5yZXZMb29rdXBbJy0nLmNoYXJDb2RlQXQoMCldID0gNjJcbnJldkxvb2t1cFsnXycuY2hhckNvZGVBdCgwKV0gPSA2M1xuXG5mdW5jdGlvbiBwbGFjZUhvbGRlcnNDb3VudCAoYjY0KSB7XG4gIHZhciBsZW4gPSBiNjQubGVuZ3RoXG4gIGlmIChsZW4gJSA0ID4gMCkge1xuICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBzdHJpbmcuIExlbmd0aCBtdXN0IGJlIGEgbXVsdGlwbGUgb2YgNCcpXG4gIH1cblxuICAvLyB0aGUgbnVtYmVyIG9mIGVxdWFsIHNpZ25zIChwbGFjZSBob2xkZXJzKVxuICAvLyBpZiB0aGVyZSBhcmUgdHdvIHBsYWNlaG9sZGVycywgdGhhbiB0aGUgdHdvIGNoYXJhY3RlcnMgYmVmb3JlIGl0XG4gIC8vIHJlcHJlc2VudCBvbmUgYnl0ZVxuICAvLyBpZiB0aGVyZSBpcyBvbmx5IG9uZSwgdGhlbiB0aGUgdGhyZWUgY2hhcmFjdGVycyBiZWZvcmUgaXQgcmVwcmVzZW50IDIgYnl0ZXNcbiAgLy8gdGhpcyBpcyBqdXN0IGEgY2hlYXAgaGFjayB0byBub3QgZG8gaW5kZXhPZiB0d2ljZVxuICByZXR1cm4gYjY0W2xlbiAtIDJdID09PSAnPScgPyAyIDogYjY0W2xlbiAtIDFdID09PSAnPScgPyAxIDogMFxufVxuXG5mdW5jdGlvbiBieXRlTGVuZ3RoIChiNjQpIHtcbiAgLy8gYmFzZTY0IGlzIDQvMyArIHVwIHRvIHR3byBjaGFyYWN0ZXJzIG9mIHRoZSBvcmlnaW5hbCBkYXRhXG4gIHJldHVybiAoYjY0Lmxlbmd0aCAqIDMgLyA0KSAtIHBsYWNlSG9sZGVyc0NvdW50KGI2NClcbn1cblxuZnVuY3Rpb24gdG9CeXRlQXJyYXkgKGI2NCkge1xuICB2YXIgaSwgbCwgdG1wLCBwbGFjZUhvbGRlcnMsIGFyclxuICB2YXIgbGVuID0gYjY0Lmxlbmd0aFxuICBwbGFjZUhvbGRlcnMgPSBwbGFjZUhvbGRlcnNDb3VudChiNjQpXG5cbiAgYXJyID0gbmV3IEFycigobGVuICogMyAvIDQpIC0gcGxhY2VIb2xkZXJzKVxuXG4gIC8vIGlmIHRoZXJlIGFyZSBwbGFjZWhvbGRlcnMsIG9ubHkgZ2V0IHVwIHRvIHRoZSBsYXN0IGNvbXBsZXRlIDQgY2hhcnNcbiAgbCA9IHBsYWNlSG9sZGVycyA+IDAgPyBsZW4gLSA0IDogbGVuXG5cbiAgdmFyIEwgPSAwXG5cbiAgZm9yIChpID0gMDsgaSA8IGw7IGkgKz0gNCkge1xuICAgIHRtcCA9IChyZXZMb29rdXBbYjY0LmNoYXJDb2RlQXQoaSldIDw8IDE4KSB8IChyZXZMb29rdXBbYjY0LmNoYXJDb2RlQXQoaSArIDEpXSA8PCAxMikgfCAocmV2TG9va3VwW2I2NC5jaGFyQ29kZUF0KGkgKyAyKV0gPDwgNikgfCByZXZMb29rdXBbYjY0LmNoYXJDb2RlQXQoaSArIDMpXVxuICAgIGFycltMKytdID0gKHRtcCA+PiAxNikgJiAweEZGXG4gICAgYXJyW0wrK10gPSAodG1wID4+IDgpICYgMHhGRlxuICAgIGFycltMKytdID0gdG1wICYgMHhGRlxuICB9XG5cbiAgaWYgKHBsYWNlSG9sZGVycyA9PT0gMikge1xuICAgIHRtcCA9IChyZXZMb29rdXBbYjY0LmNoYXJDb2RlQXQoaSldIDw8IDIpIHwgKHJldkxvb2t1cFtiNjQuY2hhckNvZGVBdChpICsgMSldID4+IDQpXG4gICAgYXJyW0wrK10gPSB0bXAgJiAweEZGXG4gIH0gZWxzZSBpZiAocGxhY2VIb2xkZXJzID09PSAxKSB7XG4gICAgdG1wID0gKHJldkxvb2t1cFtiNjQuY2hhckNvZGVBdChpKV0gPDwgMTApIHwgKHJldkxvb2t1cFtiNjQuY2hhckNvZGVBdChpICsgMSldIDw8IDQpIHwgKHJldkxvb2t1cFtiNjQuY2hhckNvZGVBdChpICsgMildID4+IDIpXG4gICAgYXJyW0wrK10gPSAodG1wID4+IDgpICYgMHhGRlxuICAgIGFycltMKytdID0gdG1wICYgMHhGRlxuICB9XG5cbiAgcmV0dXJuIGFyclxufVxuXG5mdW5jdGlvbiB0cmlwbGV0VG9CYXNlNjQgKG51bSkge1xuICByZXR1cm4gbG9va3VwW251bSA+PiAxOCAmIDB4M0ZdICsgbG9va3VwW251bSA+PiAxMiAmIDB4M0ZdICsgbG9va3VwW251bSA+PiA2ICYgMHgzRl0gKyBsb29rdXBbbnVtICYgMHgzRl1cbn1cblxuZnVuY3Rpb24gZW5jb2RlQ2h1bmsgKHVpbnQ4LCBzdGFydCwgZW5kKSB7XG4gIHZhciB0bXBcbiAgdmFyIG91dHB1dCA9IFtdXG4gIGZvciAodmFyIGkgPSBzdGFydDsgaSA8IGVuZDsgaSArPSAzKSB7XG4gICAgdG1wID0gKHVpbnQ4W2ldIDw8IDE2KSArICh1aW50OFtpICsgMV0gPDwgOCkgKyAodWludDhbaSArIDJdKVxuICAgIG91dHB1dC5wdXNoKHRyaXBsZXRUb0Jhc2U2NCh0bXApKVxuICB9XG4gIHJldHVybiBvdXRwdXQuam9pbignJylcbn1cblxuZnVuY3Rpb24gZnJvbUJ5dGVBcnJheSAodWludDgpIHtcbiAgdmFyIHRtcFxuICB2YXIgbGVuID0gdWludDgubGVuZ3RoXG4gIHZhciBleHRyYUJ5dGVzID0gbGVuICUgMyAvLyBpZiB3ZSBoYXZlIDEgYnl0ZSBsZWZ0LCBwYWQgMiBieXRlc1xuICB2YXIgb3V0cHV0ID0gJydcbiAgdmFyIHBhcnRzID0gW11cbiAgdmFyIG1heENodW5rTGVuZ3RoID0gMTYzODMgLy8gbXVzdCBiZSBtdWx0aXBsZSBvZiAzXG5cbiAgLy8gZ28gdGhyb3VnaCB0aGUgYXJyYXkgZXZlcnkgdGhyZWUgYnl0ZXMsIHdlJ2xsIGRlYWwgd2l0aCB0cmFpbGluZyBzdHVmZiBsYXRlclxuICBmb3IgKHZhciBpID0gMCwgbGVuMiA9IGxlbiAtIGV4dHJhQnl0ZXM7IGkgPCBsZW4yOyBpICs9IG1heENodW5rTGVuZ3RoKSB7XG4gICAgcGFydHMucHVzaChlbmNvZGVDaHVuayh1aW50OCwgaSwgKGkgKyBtYXhDaHVua0xlbmd0aCkgPiBsZW4yID8gbGVuMiA6IChpICsgbWF4Q2h1bmtMZW5ndGgpKSlcbiAgfVxuXG4gIC8vIHBhZCB0aGUgZW5kIHdpdGggemVyb3MsIGJ1dCBtYWtlIHN1cmUgdG8gbm90IGZvcmdldCB0aGUgZXh0cmEgYnl0ZXNcbiAgaWYgKGV4dHJhQnl0ZXMgPT09IDEpIHtcbiAgICB0bXAgPSB1aW50OFtsZW4gLSAxXVxuICAgIG91dHB1dCArPSBsb29rdXBbdG1wID4+IDJdXG4gICAgb3V0cHV0ICs9IGxvb2t1cFsodG1wIDw8IDQpICYgMHgzRl1cbiAgICBvdXRwdXQgKz0gJz09J1xuICB9IGVsc2UgaWYgKGV4dHJhQnl0ZXMgPT09IDIpIHtcbiAgICB0bXAgPSAodWludDhbbGVuIC0gMl0gPDwgOCkgKyAodWludDhbbGVuIC0gMV0pXG4gICAgb3V0cHV0ICs9IGxvb2t1cFt0bXAgPj4gMTBdXG4gICAgb3V0cHV0ICs9IGxvb2t1cFsodG1wID4+IDQpICYgMHgzRl1cbiAgICBvdXRwdXQgKz0gbG9va3VwWyh0bXAgPDwgMikgJiAweDNGXVxuICAgIG91dHB1dCArPSAnPSdcbiAgfVxuXG4gIHBhcnRzLnB1c2gob3V0cHV0KVxuXG4gIHJldHVybiBwYXJ0cy5qb2luKCcnKVxufVxuIiwiLyohXG4gKiBUaGUgYnVmZmVyIG1vZHVsZSBmcm9tIG5vZGUuanMsIGZvciB0aGUgYnJvd3Nlci5cbiAqXG4gKiBAYXV0aG9yICAgRmVyb3NzIEFib3VraGFkaWplaCA8ZmVyb3NzQGZlcm9zcy5vcmc+IDxodHRwOi8vZmVyb3NzLm9yZz5cbiAqIEBsaWNlbnNlICBNSVRcbiAqL1xuLyogZXNsaW50LWRpc2FibGUgbm8tcHJvdG8gKi9cblxuJ3VzZSBzdHJpY3QnXG5cbnZhciBiYXNlNjQgPSByZXF1aXJlKCdiYXNlNjQtanMnKVxudmFyIGllZWU3NTQgPSByZXF1aXJlKCdpZWVlNzU0JylcblxuZXhwb3J0cy5CdWZmZXIgPSBCdWZmZXJcbmV4cG9ydHMuU2xvd0J1ZmZlciA9IFNsb3dCdWZmZXJcbmV4cG9ydHMuSU5TUEVDVF9NQVhfQllURVMgPSA1MFxuXG52YXIgS19NQVhfTEVOR1RIID0gMHg3ZmZmZmZmZlxuZXhwb3J0cy5rTWF4TGVuZ3RoID0gS19NQVhfTEVOR1RIXG5cbi8qKlxuICogSWYgYEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUYDpcbiAqICAgPT09IHRydWUgICAgVXNlIFVpbnQ4QXJyYXkgaW1wbGVtZW50YXRpb24gKGZhc3Rlc3QpXG4gKiAgID09PSBmYWxzZSAgIFByaW50IHdhcm5pbmcgYW5kIHJlY29tbWVuZCB1c2luZyBgYnVmZmVyYCB2NC54IHdoaWNoIGhhcyBhbiBPYmplY3RcbiAqICAgICAgICAgICAgICAgaW1wbGVtZW50YXRpb24gKG1vc3QgY29tcGF0aWJsZSwgZXZlbiBJRTYpXG4gKlxuICogQnJvd3NlcnMgdGhhdCBzdXBwb3J0IHR5cGVkIGFycmF5cyBhcmUgSUUgMTArLCBGaXJlZm94IDQrLCBDaHJvbWUgNyssIFNhZmFyaSA1LjErLFxuICogT3BlcmEgMTEuNissIGlPUyA0LjIrLlxuICpcbiAqIFdlIHJlcG9ydCB0aGF0IHRoZSBicm93c2VyIGRvZXMgbm90IHN1cHBvcnQgdHlwZWQgYXJyYXlzIGlmIHRoZSBhcmUgbm90IHN1YmNsYXNzYWJsZVxuICogdXNpbmcgX19wcm90b19fLiBGaXJlZm94IDQtMjkgbGFja3Mgc3VwcG9ydCBmb3IgYWRkaW5nIG5ldyBwcm9wZXJ0aWVzIHRvIGBVaW50OEFycmF5YFxuICogKFNlZTogaHR0cHM6Ly9idWd6aWxsYS5tb3ppbGxhLm9yZy9zaG93X2J1Zy5jZ2k/aWQ9Njk1NDM4KS4gSUUgMTAgbGFja3Mgc3VwcG9ydFxuICogZm9yIF9fcHJvdG9fXyBhbmQgaGFzIGEgYnVnZ3kgdHlwZWQgYXJyYXkgaW1wbGVtZW50YXRpb24uXG4gKi9cbkJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUID0gdHlwZWRBcnJheVN1cHBvcnQoKVxuXG5pZiAoIUJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUICYmIHR5cGVvZiBjb25zb2xlICE9PSAndW5kZWZpbmVkJyAmJlxuICAgIHR5cGVvZiBjb25zb2xlLmVycm9yID09PSAnZnVuY3Rpb24nKSB7XG4gIGNvbnNvbGUuZXJyb3IoXG4gICAgJ1RoaXMgYnJvd3NlciBsYWNrcyB0eXBlZCBhcnJheSAoVWludDhBcnJheSkgc3VwcG9ydCB3aGljaCBpcyByZXF1aXJlZCBieSAnICtcbiAgICAnYGJ1ZmZlcmAgdjUueC4gVXNlIGBidWZmZXJgIHY0LnggaWYgeW91IHJlcXVpcmUgb2xkIGJyb3dzZXIgc3VwcG9ydC4nXG4gIClcbn1cblxuZnVuY3Rpb24gdHlwZWRBcnJheVN1cHBvcnQgKCkge1xuICAvLyBDYW4gdHlwZWQgYXJyYXkgaW5zdGFuY2VzIGNhbiBiZSBhdWdtZW50ZWQ/XG4gIHRyeSB7XG4gICAgdmFyIGFyciA9IG5ldyBVaW50OEFycmF5KDEpXG4gICAgYXJyLl9fcHJvdG9fXyA9IHtfX3Byb3RvX186IFVpbnQ4QXJyYXkucHJvdG90eXBlLCBmb286IGZ1bmN0aW9uICgpIHsgcmV0dXJuIDQyIH19XG4gICAgcmV0dXJuIGFyci5mb28oKSA9PT0gNDJcbiAgfSBjYXRjaCAoZSkge1xuICAgIHJldHVybiBmYWxzZVxuICB9XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZUJ1ZmZlciAobGVuZ3RoKSB7XG4gIGlmIChsZW5ndGggPiBLX01BWF9MRU5HVEgpIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignSW52YWxpZCB0eXBlZCBhcnJheSBsZW5ndGgnKVxuICB9XG4gIC8vIFJldHVybiBhbiBhdWdtZW50ZWQgYFVpbnQ4QXJyYXlgIGluc3RhbmNlXG4gIHZhciBidWYgPSBuZXcgVWludDhBcnJheShsZW5ndGgpXG4gIGJ1Zi5fX3Byb3RvX18gPSBCdWZmZXIucHJvdG90eXBlXG4gIHJldHVybiBidWZcbn1cblxuLyoqXG4gKiBUaGUgQnVmZmVyIGNvbnN0cnVjdG9yIHJldHVybnMgaW5zdGFuY2VzIG9mIGBVaW50OEFycmF5YCB0aGF0IGhhdmUgdGhlaXJcbiAqIHByb3RvdHlwZSBjaGFuZ2VkIHRvIGBCdWZmZXIucHJvdG90eXBlYC4gRnVydGhlcm1vcmUsIGBCdWZmZXJgIGlzIGEgc3ViY2xhc3Mgb2ZcbiAqIGBVaW50OEFycmF5YCwgc28gdGhlIHJldHVybmVkIGluc3RhbmNlcyB3aWxsIGhhdmUgYWxsIHRoZSBub2RlIGBCdWZmZXJgIG1ldGhvZHNcbiAqIGFuZCB0aGUgYFVpbnQ4QXJyYXlgIG1ldGhvZHMuIFNxdWFyZSBicmFja2V0IG5vdGF0aW9uIHdvcmtzIGFzIGV4cGVjdGVkIC0tIGl0XG4gKiByZXR1cm5zIGEgc2luZ2xlIG9jdGV0LlxuICpcbiAqIFRoZSBgVWludDhBcnJheWAgcHJvdG90eXBlIHJlbWFpbnMgdW5tb2RpZmllZC5cbiAqL1xuXG5mdW5jdGlvbiBCdWZmZXIgKGFyZywgZW5jb2RpbmdPck9mZnNldCwgbGVuZ3RoKSB7XG4gIC8vIENvbW1vbiBjYXNlLlxuICBpZiAodHlwZW9mIGFyZyA9PT0gJ251bWJlcicpIHtcbiAgICBpZiAodHlwZW9mIGVuY29kaW5nT3JPZmZzZXQgPT09ICdzdHJpbmcnKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICdJZiBlbmNvZGluZyBpcyBzcGVjaWZpZWQgdGhlbiB0aGUgZmlyc3QgYXJndW1lbnQgbXVzdCBiZSBhIHN0cmluZydcbiAgICAgIClcbiAgICB9XG4gICAgcmV0dXJuIGFsbG9jVW5zYWZlKGFyZylcbiAgfVxuICByZXR1cm4gZnJvbShhcmcsIGVuY29kaW5nT3JPZmZzZXQsIGxlbmd0aClcbn1cblxuLy8gRml4IHN1YmFycmF5KCkgaW4gRVMyMDE2LiBTZWU6IGh0dHBzOi8vZ2l0aHViLmNvbS9mZXJvc3MvYnVmZmVyL3B1bGwvOTdcbmlmICh0eXBlb2YgU3ltYm9sICE9PSAndW5kZWZpbmVkJyAmJiBTeW1ib2wuc3BlY2llcyAmJlxuICAgIEJ1ZmZlcltTeW1ib2wuc3BlY2llc10gPT09IEJ1ZmZlcikge1xuICBPYmplY3QuZGVmaW5lUHJvcGVydHkoQnVmZmVyLCBTeW1ib2wuc3BlY2llcywge1xuICAgIHZhbHVlOiBudWxsLFxuICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZSxcbiAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICB3cml0YWJsZTogZmFsc2VcbiAgfSlcbn1cblxuQnVmZmVyLnBvb2xTaXplID0gODE5MiAvLyBub3QgdXNlZCBieSB0aGlzIGltcGxlbWVudGF0aW9uXG5cbmZ1bmN0aW9uIGZyb20gKHZhbHVlLCBlbmNvZGluZ09yT2Zmc2V0LCBsZW5ndGgpIHtcbiAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ251bWJlcicpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdcInZhbHVlXCIgYXJndW1lbnQgbXVzdCBub3QgYmUgYSBudW1iZXInKVxuICB9XG5cbiAgaWYgKGlzQXJyYXlCdWZmZXIodmFsdWUpKSB7XG4gICAgcmV0dXJuIGZyb21BcnJheUJ1ZmZlcih2YWx1ZSwgZW5jb2RpbmdPck9mZnNldCwgbGVuZ3RoKVxuICB9XG5cbiAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycpIHtcbiAgICByZXR1cm4gZnJvbVN0cmluZyh2YWx1ZSwgZW5jb2RpbmdPck9mZnNldClcbiAgfVxuXG4gIHJldHVybiBmcm9tT2JqZWN0KHZhbHVlKVxufVxuXG4vKipcbiAqIEZ1bmN0aW9uYWxseSBlcXVpdmFsZW50IHRvIEJ1ZmZlcihhcmcsIGVuY29kaW5nKSBidXQgdGhyb3dzIGEgVHlwZUVycm9yXG4gKiBpZiB2YWx1ZSBpcyBhIG51bWJlci5cbiAqIEJ1ZmZlci5mcm9tKHN0clssIGVuY29kaW5nXSlcbiAqIEJ1ZmZlci5mcm9tKGFycmF5KVxuICogQnVmZmVyLmZyb20oYnVmZmVyKVxuICogQnVmZmVyLmZyb20oYXJyYXlCdWZmZXJbLCBieXRlT2Zmc2V0WywgbGVuZ3RoXV0pXG4gKiovXG5CdWZmZXIuZnJvbSA9IGZ1bmN0aW9uICh2YWx1ZSwgZW5jb2RpbmdPck9mZnNldCwgbGVuZ3RoKSB7XG4gIHJldHVybiBmcm9tKHZhbHVlLCBlbmNvZGluZ09yT2Zmc2V0LCBsZW5ndGgpXG59XG5cbi8vIE5vdGU6IENoYW5nZSBwcm90b3R5cGUgKmFmdGVyKiBCdWZmZXIuZnJvbSBpcyBkZWZpbmVkIHRvIHdvcmthcm91bmQgQ2hyb21lIGJ1Zzpcbi8vIGh0dHBzOi8vZ2l0aHViLmNvbS9mZXJvc3MvYnVmZmVyL3B1bGwvMTQ4XG5CdWZmZXIucHJvdG90eXBlLl9fcHJvdG9fXyA9IFVpbnQ4QXJyYXkucHJvdG90eXBlXG5CdWZmZXIuX19wcm90b19fID0gVWludDhBcnJheVxuXG5mdW5jdGlvbiBhc3NlcnRTaXplIChzaXplKSB7XG4gIGlmICh0eXBlb2Ygc2l6ZSAhPT0gJ251bWJlcicpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdcInNpemVcIiBhcmd1bWVudCBtdXN0IGJlIGEgbnVtYmVyJylcbiAgfSBlbHNlIGlmIChzaXplIDwgMCkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdcInNpemVcIiBhcmd1bWVudCBtdXN0IG5vdCBiZSBuZWdhdGl2ZScpXG4gIH1cbn1cblxuZnVuY3Rpb24gYWxsb2MgKHNpemUsIGZpbGwsIGVuY29kaW5nKSB7XG4gIGFzc2VydFNpemUoc2l6ZSlcbiAgaWYgKHNpemUgPD0gMCkge1xuICAgIHJldHVybiBjcmVhdGVCdWZmZXIoc2l6ZSlcbiAgfVxuICBpZiAoZmlsbCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgLy8gT25seSBwYXkgYXR0ZW50aW9uIHRvIGVuY29kaW5nIGlmIGl0J3MgYSBzdHJpbmcuIFRoaXNcbiAgICAvLyBwcmV2ZW50cyBhY2NpZGVudGFsbHkgc2VuZGluZyBpbiBhIG51bWJlciB0aGF0IHdvdWxkXG4gICAgLy8gYmUgaW50ZXJwcmV0dGVkIGFzIGEgc3RhcnQgb2Zmc2V0LlxuICAgIHJldHVybiB0eXBlb2YgZW5jb2RpbmcgPT09ICdzdHJpbmcnXG4gICAgICA/IGNyZWF0ZUJ1ZmZlcihzaXplKS5maWxsKGZpbGwsIGVuY29kaW5nKVxuICAgICAgOiBjcmVhdGVCdWZmZXIoc2l6ZSkuZmlsbChmaWxsKVxuICB9XG4gIHJldHVybiBjcmVhdGVCdWZmZXIoc2l6ZSlcbn1cblxuLyoqXG4gKiBDcmVhdGVzIGEgbmV3IGZpbGxlZCBCdWZmZXIgaW5zdGFuY2UuXG4gKiBhbGxvYyhzaXplWywgZmlsbFssIGVuY29kaW5nXV0pXG4gKiovXG5CdWZmZXIuYWxsb2MgPSBmdW5jdGlvbiAoc2l6ZSwgZmlsbCwgZW5jb2RpbmcpIHtcbiAgcmV0dXJuIGFsbG9jKHNpemUsIGZpbGwsIGVuY29kaW5nKVxufVxuXG5mdW5jdGlvbiBhbGxvY1Vuc2FmZSAoc2l6ZSkge1xuICBhc3NlcnRTaXplKHNpemUpXG4gIHJldHVybiBjcmVhdGVCdWZmZXIoc2l6ZSA8IDAgPyAwIDogY2hlY2tlZChzaXplKSB8IDApXG59XG5cbi8qKlxuICogRXF1aXZhbGVudCB0byBCdWZmZXIobnVtKSwgYnkgZGVmYXVsdCBjcmVhdGVzIGEgbm9uLXplcm8tZmlsbGVkIEJ1ZmZlciBpbnN0YW5jZS5cbiAqICovXG5CdWZmZXIuYWxsb2NVbnNhZmUgPSBmdW5jdGlvbiAoc2l6ZSkge1xuICByZXR1cm4gYWxsb2NVbnNhZmUoc2l6ZSlcbn1cbi8qKlxuICogRXF1aXZhbGVudCB0byBTbG93QnVmZmVyKG51bSksIGJ5IGRlZmF1bHQgY3JlYXRlcyBhIG5vbi16ZXJvLWZpbGxlZCBCdWZmZXIgaW5zdGFuY2UuXG4gKi9cbkJ1ZmZlci5hbGxvY1Vuc2FmZVNsb3cgPSBmdW5jdGlvbiAoc2l6ZSkge1xuICByZXR1cm4gYWxsb2NVbnNhZmUoc2l6ZSlcbn1cblxuZnVuY3Rpb24gZnJvbVN0cmluZyAoc3RyaW5nLCBlbmNvZGluZykge1xuICBpZiAodHlwZW9mIGVuY29kaW5nICE9PSAnc3RyaW5nJyB8fCBlbmNvZGluZyA9PT0gJycpIHtcbiAgICBlbmNvZGluZyA9ICd1dGY4J1xuICB9XG5cbiAgaWYgKCFCdWZmZXIuaXNFbmNvZGluZyhlbmNvZGluZykpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdcImVuY29kaW5nXCIgbXVzdCBiZSBhIHZhbGlkIHN0cmluZyBlbmNvZGluZycpXG4gIH1cblxuICB2YXIgbGVuZ3RoID0gYnl0ZUxlbmd0aChzdHJpbmcsIGVuY29kaW5nKSB8IDBcbiAgdmFyIGJ1ZiA9IGNyZWF0ZUJ1ZmZlcihsZW5ndGgpXG5cbiAgdmFyIGFjdHVhbCA9IGJ1Zi53cml0ZShzdHJpbmcsIGVuY29kaW5nKVxuXG4gIGlmIChhY3R1YWwgIT09IGxlbmd0aCkge1xuICAgIC8vIFdyaXRpbmcgYSBoZXggc3RyaW5nLCBmb3IgZXhhbXBsZSwgdGhhdCBjb250YWlucyBpbnZhbGlkIGNoYXJhY3RlcnMgd2lsbFxuICAgIC8vIGNhdXNlIGV2ZXJ5dGhpbmcgYWZ0ZXIgdGhlIGZpcnN0IGludmFsaWQgY2hhcmFjdGVyIHRvIGJlIGlnbm9yZWQuIChlLmcuXG4gICAgLy8gJ2FieHhjZCcgd2lsbCBiZSB0cmVhdGVkIGFzICdhYicpXG4gICAgYnVmID0gYnVmLnNsaWNlKDAsIGFjdHVhbClcbiAgfVxuXG4gIHJldHVybiBidWZcbn1cblxuZnVuY3Rpb24gZnJvbUFycmF5TGlrZSAoYXJyYXkpIHtcbiAgdmFyIGxlbmd0aCA9IGFycmF5Lmxlbmd0aCA8IDAgPyAwIDogY2hlY2tlZChhcnJheS5sZW5ndGgpIHwgMFxuICB2YXIgYnVmID0gY3JlYXRlQnVmZmVyKGxlbmd0aClcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkgKz0gMSkge1xuICAgIGJ1ZltpXSA9IGFycmF5W2ldICYgMjU1XG4gIH1cbiAgcmV0dXJuIGJ1ZlxufVxuXG5mdW5jdGlvbiBmcm9tQXJyYXlCdWZmZXIgKGFycmF5LCBieXRlT2Zmc2V0LCBsZW5ndGgpIHtcbiAgaWYgKGJ5dGVPZmZzZXQgPCAwIHx8IGFycmF5LmJ5dGVMZW5ndGggPCBieXRlT2Zmc2V0KSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ1xcJ29mZnNldFxcJyBpcyBvdXQgb2YgYm91bmRzJylcbiAgfVxuXG4gIGlmIChhcnJheS5ieXRlTGVuZ3RoIDwgYnl0ZU9mZnNldCArIChsZW5ndGggfHwgMCkpIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignXFwnbGVuZ3RoXFwnIGlzIG91dCBvZiBib3VuZHMnKVxuICB9XG5cbiAgdmFyIGJ1ZlxuICBpZiAoYnl0ZU9mZnNldCA9PT0gdW5kZWZpbmVkICYmIGxlbmd0aCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgYnVmID0gbmV3IFVpbnQ4QXJyYXkoYXJyYXkpXG4gIH0gZWxzZSBpZiAobGVuZ3RoID09PSB1bmRlZmluZWQpIHtcbiAgICBidWYgPSBuZXcgVWludDhBcnJheShhcnJheSwgYnl0ZU9mZnNldClcbiAgfSBlbHNlIHtcbiAgICBidWYgPSBuZXcgVWludDhBcnJheShhcnJheSwgYnl0ZU9mZnNldCwgbGVuZ3RoKVxuICB9XG5cbiAgLy8gUmV0dXJuIGFuIGF1Z21lbnRlZCBgVWludDhBcnJheWAgaW5zdGFuY2VcbiAgYnVmLl9fcHJvdG9fXyA9IEJ1ZmZlci5wcm90b3R5cGVcbiAgcmV0dXJuIGJ1ZlxufVxuXG5mdW5jdGlvbiBmcm9tT2JqZWN0IChvYmopIHtcbiAgaWYgKEJ1ZmZlci5pc0J1ZmZlcihvYmopKSB7XG4gICAgdmFyIGxlbiA9IGNoZWNrZWQob2JqLmxlbmd0aCkgfCAwXG4gICAgdmFyIGJ1ZiA9IGNyZWF0ZUJ1ZmZlcihsZW4pXG5cbiAgICBpZiAoYnVmLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIGJ1ZlxuICAgIH1cblxuICAgIG9iai5jb3B5KGJ1ZiwgMCwgMCwgbGVuKVxuICAgIHJldHVybiBidWZcbiAgfVxuXG4gIGlmIChvYmopIHtcbiAgICBpZiAoaXNBcnJheUJ1ZmZlclZpZXcob2JqKSB8fCAnbGVuZ3RoJyBpbiBvYmopIHtcbiAgICAgIGlmICh0eXBlb2Ygb2JqLmxlbmd0aCAhPT0gJ251bWJlcicgfHwgbnVtYmVySXNOYU4ob2JqLmxlbmd0aCkpIHtcbiAgICAgICAgcmV0dXJuIGNyZWF0ZUJ1ZmZlcigwKVxuICAgICAgfVxuICAgICAgcmV0dXJuIGZyb21BcnJheUxpa2Uob2JqKVxuICAgIH1cblxuICAgIGlmIChvYmoudHlwZSA9PT0gJ0J1ZmZlcicgJiYgQXJyYXkuaXNBcnJheShvYmouZGF0YSkpIHtcbiAgICAgIHJldHVybiBmcm9tQXJyYXlMaWtlKG9iai5kYXRhKVxuICAgIH1cbiAgfVxuXG4gIHRocm93IG5ldyBUeXBlRXJyb3IoJ0ZpcnN0IGFyZ3VtZW50IG11c3QgYmUgYSBzdHJpbmcsIEJ1ZmZlciwgQXJyYXlCdWZmZXIsIEFycmF5LCBvciBhcnJheS1saWtlIG9iamVjdC4nKVxufVxuXG5mdW5jdGlvbiBjaGVja2VkIChsZW5ndGgpIHtcbiAgLy8gTm90ZTogY2Fubm90IHVzZSBgbGVuZ3RoIDwgS19NQVhfTEVOR1RIYCBoZXJlIGJlY2F1c2UgdGhhdCBmYWlscyB3aGVuXG4gIC8vIGxlbmd0aCBpcyBOYU4gKHdoaWNoIGlzIG90aGVyd2lzZSBjb2VyY2VkIHRvIHplcm8uKVxuICBpZiAobGVuZ3RoID49IEtfTUFYX0xFTkdUSCkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdBdHRlbXB0IHRvIGFsbG9jYXRlIEJ1ZmZlciBsYXJnZXIgdGhhbiBtYXhpbXVtICcgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICdzaXplOiAweCcgKyBLX01BWF9MRU5HVEgudG9TdHJpbmcoMTYpICsgJyBieXRlcycpXG4gIH1cbiAgcmV0dXJuIGxlbmd0aCB8IDBcbn1cblxuZnVuY3Rpb24gU2xvd0J1ZmZlciAobGVuZ3RoKSB7XG4gIGlmICgrbGVuZ3RoICE9IGxlbmd0aCkgeyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIGVxZXFlcVxuICAgIGxlbmd0aCA9IDBcbiAgfVxuICByZXR1cm4gQnVmZmVyLmFsbG9jKCtsZW5ndGgpXG59XG5cbkJ1ZmZlci5pc0J1ZmZlciA9IGZ1bmN0aW9uIGlzQnVmZmVyIChiKSB7XG4gIHJldHVybiBiICE9IG51bGwgJiYgYi5faXNCdWZmZXIgPT09IHRydWVcbn1cblxuQnVmZmVyLmNvbXBhcmUgPSBmdW5jdGlvbiBjb21wYXJlIChhLCBiKSB7XG4gIGlmICghQnVmZmVyLmlzQnVmZmVyKGEpIHx8ICFCdWZmZXIuaXNCdWZmZXIoYikpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdBcmd1bWVudHMgbXVzdCBiZSBCdWZmZXJzJylcbiAgfVxuXG4gIGlmIChhID09PSBiKSByZXR1cm4gMFxuXG4gIHZhciB4ID0gYS5sZW5ndGhcbiAgdmFyIHkgPSBiLmxlbmd0aFxuXG4gIGZvciAodmFyIGkgPSAwLCBsZW4gPSBNYXRoLm1pbih4LCB5KTsgaSA8IGxlbjsgKytpKSB7XG4gICAgaWYgKGFbaV0gIT09IGJbaV0pIHtcbiAgICAgIHggPSBhW2ldXG4gICAgICB5ID0gYltpXVxuICAgICAgYnJlYWtcbiAgICB9XG4gIH1cblxuICBpZiAoeCA8IHkpIHJldHVybiAtMVxuICBpZiAoeSA8IHgpIHJldHVybiAxXG4gIHJldHVybiAwXG59XG5cbkJ1ZmZlci5pc0VuY29kaW5nID0gZnVuY3Rpb24gaXNFbmNvZGluZyAoZW5jb2RpbmcpIHtcbiAgc3dpdGNoIChTdHJpbmcoZW5jb2RpbmcpLnRvTG93ZXJDYXNlKCkpIHtcbiAgICBjYXNlICdoZXgnOlxuICAgIGNhc2UgJ3V0ZjgnOlxuICAgIGNhc2UgJ3V0Zi04JzpcbiAgICBjYXNlICdhc2NpaSc6XG4gICAgY2FzZSAnbGF0aW4xJzpcbiAgICBjYXNlICdiaW5hcnknOlxuICAgIGNhc2UgJ2Jhc2U2NCc6XG4gICAgY2FzZSAndWNzMic6XG4gICAgY2FzZSAndWNzLTInOlxuICAgIGNhc2UgJ3V0ZjE2bGUnOlxuICAgIGNhc2UgJ3V0Zi0xNmxlJzpcbiAgICAgIHJldHVybiB0cnVlXG4gICAgZGVmYXVsdDpcbiAgICAgIHJldHVybiBmYWxzZVxuICB9XG59XG5cbkJ1ZmZlci5jb25jYXQgPSBmdW5jdGlvbiBjb25jYXQgKGxpc3QsIGxlbmd0aCkge1xuICBpZiAoIUFycmF5LmlzQXJyYXkobGlzdCkpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdcImxpc3RcIiBhcmd1bWVudCBtdXN0IGJlIGFuIEFycmF5IG9mIEJ1ZmZlcnMnKVxuICB9XG5cbiAgaWYgKGxpc3QubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIEJ1ZmZlci5hbGxvYygwKVxuICB9XG5cbiAgdmFyIGlcbiAgaWYgKGxlbmd0aCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgbGVuZ3RoID0gMFxuICAgIGZvciAoaSA9IDA7IGkgPCBsaXN0Lmxlbmd0aDsgKytpKSB7XG4gICAgICBsZW5ndGggKz0gbGlzdFtpXS5sZW5ndGhcbiAgICB9XG4gIH1cblxuICB2YXIgYnVmZmVyID0gQnVmZmVyLmFsbG9jVW5zYWZlKGxlbmd0aClcbiAgdmFyIHBvcyA9IDBcbiAgZm9yIChpID0gMDsgaSA8IGxpc3QubGVuZ3RoOyArK2kpIHtcbiAgICB2YXIgYnVmID0gbGlzdFtpXVxuICAgIGlmICghQnVmZmVyLmlzQnVmZmVyKGJ1ZikpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1wibGlzdFwiIGFyZ3VtZW50IG11c3QgYmUgYW4gQXJyYXkgb2YgQnVmZmVycycpXG4gICAgfVxuICAgIGJ1Zi5jb3B5KGJ1ZmZlciwgcG9zKVxuICAgIHBvcyArPSBidWYubGVuZ3RoXG4gIH1cbiAgcmV0dXJuIGJ1ZmZlclxufVxuXG5mdW5jdGlvbiBieXRlTGVuZ3RoIChzdHJpbmcsIGVuY29kaW5nKSB7XG4gIGlmIChCdWZmZXIuaXNCdWZmZXIoc3RyaW5nKSkge1xuICAgIHJldHVybiBzdHJpbmcubGVuZ3RoXG4gIH1cbiAgaWYgKGlzQXJyYXlCdWZmZXJWaWV3KHN0cmluZykgfHwgaXNBcnJheUJ1ZmZlcihzdHJpbmcpKSB7XG4gICAgcmV0dXJuIHN0cmluZy5ieXRlTGVuZ3RoXG4gIH1cbiAgaWYgKHR5cGVvZiBzdHJpbmcgIT09ICdzdHJpbmcnKSB7XG4gICAgc3RyaW5nID0gJycgKyBzdHJpbmdcbiAgfVxuXG4gIHZhciBsZW4gPSBzdHJpbmcubGVuZ3RoXG4gIGlmIChsZW4gPT09IDApIHJldHVybiAwXG5cbiAgLy8gVXNlIGEgZm9yIGxvb3AgdG8gYXZvaWQgcmVjdXJzaW9uXG4gIHZhciBsb3dlcmVkQ2FzZSA9IGZhbHNlXG4gIGZvciAoOzspIHtcbiAgICBzd2l0Y2ggKGVuY29kaW5nKSB7XG4gICAgICBjYXNlICdhc2NpaSc6XG4gICAgICBjYXNlICdsYXRpbjEnOlxuICAgICAgY2FzZSAnYmluYXJ5JzpcbiAgICAgICAgcmV0dXJuIGxlblxuICAgICAgY2FzZSAndXRmOCc6XG4gICAgICBjYXNlICd1dGYtOCc6XG4gICAgICBjYXNlIHVuZGVmaW5lZDpcbiAgICAgICAgcmV0dXJuIHV0ZjhUb0J5dGVzKHN0cmluZykubGVuZ3RoXG4gICAgICBjYXNlICd1Y3MyJzpcbiAgICAgIGNhc2UgJ3Vjcy0yJzpcbiAgICAgIGNhc2UgJ3V0ZjE2bGUnOlxuICAgICAgY2FzZSAndXRmLTE2bGUnOlxuICAgICAgICByZXR1cm4gbGVuICogMlxuICAgICAgY2FzZSAnaGV4JzpcbiAgICAgICAgcmV0dXJuIGxlbiA+Pj4gMVxuICAgICAgY2FzZSAnYmFzZTY0JzpcbiAgICAgICAgcmV0dXJuIGJhc2U2NFRvQnl0ZXMoc3RyaW5nKS5sZW5ndGhcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGlmIChsb3dlcmVkQ2FzZSkgcmV0dXJuIHV0ZjhUb0J5dGVzKHN0cmluZykubGVuZ3RoIC8vIGFzc3VtZSB1dGY4XG4gICAgICAgIGVuY29kaW5nID0gKCcnICsgZW5jb2RpbmcpLnRvTG93ZXJDYXNlKClcbiAgICAgICAgbG93ZXJlZENhc2UgPSB0cnVlXG4gICAgfVxuICB9XG59XG5CdWZmZXIuYnl0ZUxlbmd0aCA9IGJ5dGVMZW5ndGhcblxuZnVuY3Rpb24gc2xvd1RvU3RyaW5nIChlbmNvZGluZywgc3RhcnQsIGVuZCkge1xuICB2YXIgbG93ZXJlZENhc2UgPSBmYWxzZVxuXG4gIC8vIE5vIG5lZWQgdG8gdmVyaWZ5IHRoYXQgXCJ0aGlzLmxlbmd0aCA8PSBNQVhfVUlOVDMyXCIgc2luY2UgaXQncyBhIHJlYWQtb25seVxuICAvLyBwcm9wZXJ0eSBvZiBhIHR5cGVkIGFycmF5LlxuXG4gIC8vIFRoaXMgYmVoYXZlcyBuZWl0aGVyIGxpa2UgU3RyaW5nIG5vciBVaW50OEFycmF5IGluIHRoYXQgd2Ugc2V0IHN0YXJ0L2VuZFxuICAvLyB0byB0aGVpciB1cHBlci9sb3dlciBib3VuZHMgaWYgdGhlIHZhbHVlIHBhc3NlZCBpcyBvdXQgb2YgcmFuZ2UuXG4gIC8vIHVuZGVmaW5lZCBpcyBoYW5kbGVkIHNwZWNpYWxseSBhcyBwZXIgRUNNQS0yNjIgNnRoIEVkaXRpb24sXG4gIC8vIFNlY3Rpb24gMTMuMy4zLjcgUnVudGltZSBTZW1hbnRpY3M6IEtleWVkQmluZGluZ0luaXRpYWxpemF0aW9uLlxuICBpZiAoc3RhcnQgPT09IHVuZGVmaW5lZCB8fCBzdGFydCA8IDApIHtcbiAgICBzdGFydCA9IDBcbiAgfVxuICAvLyBSZXR1cm4gZWFybHkgaWYgc3RhcnQgPiB0aGlzLmxlbmd0aC4gRG9uZSBoZXJlIHRvIHByZXZlbnQgcG90ZW50aWFsIHVpbnQzMlxuICAvLyBjb2VyY2lvbiBmYWlsIGJlbG93LlxuICBpZiAoc3RhcnQgPiB0aGlzLmxlbmd0aCkge1xuICAgIHJldHVybiAnJ1xuICB9XG5cbiAgaWYgKGVuZCA9PT0gdW5kZWZpbmVkIHx8IGVuZCA+IHRoaXMubGVuZ3RoKSB7XG4gICAgZW5kID0gdGhpcy5sZW5ndGhcbiAgfVxuXG4gIGlmIChlbmQgPD0gMCkge1xuICAgIHJldHVybiAnJ1xuICB9XG5cbiAgLy8gRm9yY2UgY29lcnNpb24gdG8gdWludDMyLiBUaGlzIHdpbGwgYWxzbyBjb2VyY2UgZmFsc2V5L05hTiB2YWx1ZXMgdG8gMC5cbiAgZW5kID4+Pj0gMFxuICBzdGFydCA+Pj49IDBcblxuICBpZiAoZW5kIDw9IHN0YXJ0KSB7XG4gICAgcmV0dXJuICcnXG4gIH1cblxuICBpZiAoIWVuY29kaW5nKSBlbmNvZGluZyA9ICd1dGY4J1xuXG4gIHdoaWxlICh0cnVlKSB7XG4gICAgc3dpdGNoIChlbmNvZGluZykge1xuICAgICAgY2FzZSAnaGV4JzpcbiAgICAgICAgcmV0dXJuIGhleFNsaWNlKHRoaXMsIHN0YXJ0LCBlbmQpXG5cbiAgICAgIGNhc2UgJ3V0ZjgnOlxuICAgICAgY2FzZSAndXRmLTgnOlxuICAgICAgICByZXR1cm4gdXRmOFNsaWNlKHRoaXMsIHN0YXJ0LCBlbmQpXG5cbiAgICAgIGNhc2UgJ2FzY2lpJzpcbiAgICAgICAgcmV0dXJuIGFzY2lpU2xpY2UodGhpcywgc3RhcnQsIGVuZClcblxuICAgICAgY2FzZSAnbGF0aW4xJzpcbiAgICAgIGNhc2UgJ2JpbmFyeSc6XG4gICAgICAgIHJldHVybiBsYXRpbjFTbGljZSh0aGlzLCBzdGFydCwgZW5kKVxuXG4gICAgICBjYXNlICdiYXNlNjQnOlxuICAgICAgICByZXR1cm4gYmFzZTY0U2xpY2UodGhpcywgc3RhcnQsIGVuZClcblxuICAgICAgY2FzZSAndWNzMic6XG4gICAgICBjYXNlICd1Y3MtMic6XG4gICAgICBjYXNlICd1dGYxNmxlJzpcbiAgICAgIGNhc2UgJ3V0Zi0xNmxlJzpcbiAgICAgICAgcmV0dXJuIHV0ZjE2bGVTbGljZSh0aGlzLCBzdGFydCwgZW5kKVxuXG4gICAgICBkZWZhdWx0OlxuICAgICAgICBpZiAobG93ZXJlZENhc2UpIHRocm93IG5ldyBUeXBlRXJyb3IoJ1Vua25vd24gZW5jb2Rpbmc6ICcgKyBlbmNvZGluZylcbiAgICAgICAgZW5jb2RpbmcgPSAoZW5jb2RpbmcgKyAnJykudG9Mb3dlckNhc2UoKVxuICAgICAgICBsb3dlcmVkQ2FzZSA9IHRydWVcbiAgICB9XG4gIH1cbn1cblxuLy8gVGhpcyBwcm9wZXJ0eSBpcyB1c2VkIGJ5IGBCdWZmZXIuaXNCdWZmZXJgIChhbmQgdGhlIGBpcy1idWZmZXJgIG5wbSBwYWNrYWdlKVxuLy8gdG8gZGV0ZWN0IGEgQnVmZmVyIGluc3RhbmNlLiBJdCdzIG5vdCBwb3NzaWJsZSB0byB1c2UgYGluc3RhbmNlb2YgQnVmZmVyYFxuLy8gcmVsaWFibHkgaW4gYSBicm93c2VyaWZ5IGNvbnRleHQgYmVjYXVzZSB0aGVyZSBjb3VsZCBiZSBtdWx0aXBsZSBkaWZmZXJlbnRcbi8vIGNvcGllcyBvZiB0aGUgJ2J1ZmZlcicgcGFja2FnZSBpbiB1c2UuIFRoaXMgbWV0aG9kIHdvcmtzIGV2ZW4gZm9yIEJ1ZmZlclxuLy8gaW5zdGFuY2VzIHRoYXQgd2VyZSBjcmVhdGVkIGZyb20gYW5vdGhlciBjb3B5IG9mIHRoZSBgYnVmZmVyYCBwYWNrYWdlLlxuLy8gU2VlOiBodHRwczovL2dpdGh1Yi5jb20vZmVyb3NzL2J1ZmZlci9pc3N1ZXMvMTU0XG5CdWZmZXIucHJvdG90eXBlLl9pc0J1ZmZlciA9IHRydWVcblxuZnVuY3Rpb24gc3dhcCAoYiwgbiwgbSkge1xuICB2YXIgaSA9IGJbbl1cbiAgYltuXSA9IGJbbV1cbiAgYlttXSA9IGlcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5zd2FwMTYgPSBmdW5jdGlvbiBzd2FwMTYgKCkge1xuICB2YXIgbGVuID0gdGhpcy5sZW5ndGhcbiAgaWYgKGxlbiAlIDIgIT09IDApIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignQnVmZmVyIHNpemUgbXVzdCBiZSBhIG11bHRpcGxlIG9mIDE2LWJpdHMnKVxuICB9XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpICs9IDIpIHtcbiAgICBzd2FwKHRoaXMsIGksIGkgKyAxKVxuICB9XG4gIHJldHVybiB0aGlzXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUuc3dhcDMyID0gZnVuY3Rpb24gc3dhcDMyICgpIHtcbiAgdmFyIGxlbiA9IHRoaXMubGVuZ3RoXG4gIGlmIChsZW4gJSA0ICE9PSAwKSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0J1ZmZlciBzaXplIG11c3QgYmUgYSBtdWx0aXBsZSBvZiAzMi1iaXRzJylcbiAgfVxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgaSArPSA0KSB7XG4gICAgc3dhcCh0aGlzLCBpLCBpICsgMylcbiAgICBzd2FwKHRoaXMsIGkgKyAxLCBpICsgMilcbiAgfVxuICByZXR1cm4gdGhpc1xufVxuXG5CdWZmZXIucHJvdG90eXBlLnN3YXA2NCA9IGZ1bmN0aW9uIHN3YXA2NCAoKSB7XG4gIHZhciBsZW4gPSB0aGlzLmxlbmd0aFxuICBpZiAobGVuICUgOCAhPT0gMCkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdCdWZmZXIgc2l6ZSBtdXN0IGJlIGEgbXVsdGlwbGUgb2YgNjQtYml0cycpXG4gIH1cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkgKz0gOCkge1xuICAgIHN3YXAodGhpcywgaSwgaSArIDcpXG4gICAgc3dhcCh0aGlzLCBpICsgMSwgaSArIDYpXG4gICAgc3dhcCh0aGlzLCBpICsgMiwgaSArIDUpXG4gICAgc3dhcCh0aGlzLCBpICsgMywgaSArIDQpXG4gIH1cbiAgcmV0dXJuIHRoaXNcbn1cblxuQnVmZmVyLnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uIHRvU3RyaW5nICgpIHtcbiAgdmFyIGxlbmd0aCA9IHRoaXMubGVuZ3RoXG4gIGlmIChsZW5ndGggPT09IDApIHJldHVybiAnJ1xuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkgcmV0dXJuIHV0ZjhTbGljZSh0aGlzLCAwLCBsZW5ndGgpXG4gIHJldHVybiBzbG93VG9TdHJpbmcuYXBwbHkodGhpcywgYXJndW1lbnRzKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLmVxdWFscyA9IGZ1bmN0aW9uIGVxdWFscyAoYikge1xuICBpZiAoIUJ1ZmZlci5pc0J1ZmZlcihiKSkgdGhyb3cgbmV3IFR5cGVFcnJvcignQXJndW1lbnQgbXVzdCBiZSBhIEJ1ZmZlcicpXG4gIGlmICh0aGlzID09PSBiKSByZXR1cm4gdHJ1ZVxuICByZXR1cm4gQnVmZmVyLmNvbXBhcmUodGhpcywgYikgPT09IDBcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5pbnNwZWN0ID0gZnVuY3Rpb24gaW5zcGVjdCAoKSB7XG4gIHZhciBzdHIgPSAnJ1xuICB2YXIgbWF4ID0gZXhwb3J0cy5JTlNQRUNUX01BWF9CWVRFU1xuICBpZiAodGhpcy5sZW5ndGggPiAwKSB7XG4gICAgc3RyID0gdGhpcy50b1N0cmluZygnaGV4JywgMCwgbWF4KS5tYXRjaCgvLnsyfS9nKS5qb2luKCcgJylcbiAgICBpZiAodGhpcy5sZW5ndGggPiBtYXgpIHN0ciArPSAnIC4uLiAnXG4gIH1cbiAgcmV0dXJuICc8QnVmZmVyICcgKyBzdHIgKyAnPidcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5jb21wYXJlID0gZnVuY3Rpb24gY29tcGFyZSAodGFyZ2V0LCBzdGFydCwgZW5kLCB0aGlzU3RhcnQsIHRoaXNFbmQpIHtcbiAgaWYgKCFCdWZmZXIuaXNCdWZmZXIodGFyZ2V0KSkge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0FyZ3VtZW50IG11c3QgYmUgYSBCdWZmZXInKVxuICB9XG5cbiAgaWYgKHN0YXJ0ID09PSB1bmRlZmluZWQpIHtcbiAgICBzdGFydCA9IDBcbiAgfVxuICBpZiAoZW5kID09PSB1bmRlZmluZWQpIHtcbiAgICBlbmQgPSB0YXJnZXQgPyB0YXJnZXQubGVuZ3RoIDogMFxuICB9XG4gIGlmICh0aGlzU3RhcnQgPT09IHVuZGVmaW5lZCkge1xuICAgIHRoaXNTdGFydCA9IDBcbiAgfVxuICBpZiAodGhpc0VuZCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgdGhpc0VuZCA9IHRoaXMubGVuZ3RoXG4gIH1cblxuICBpZiAoc3RhcnQgPCAwIHx8IGVuZCA+IHRhcmdldC5sZW5ndGggfHwgdGhpc1N0YXJ0IDwgMCB8fCB0aGlzRW5kID4gdGhpcy5sZW5ndGgpIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignb3V0IG9mIHJhbmdlIGluZGV4JylcbiAgfVxuXG4gIGlmICh0aGlzU3RhcnQgPj0gdGhpc0VuZCAmJiBzdGFydCA+PSBlbmQpIHtcbiAgICByZXR1cm4gMFxuICB9XG4gIGlmICh0aGlzU3RhcnQgPj0gdGhpc0VuZCkge1xuICAgIHJldHVybiAtMVxuICB9XG4gIGlmIChzdGFydCA+PSBlbmQpIHtcbiAgICByZXR1cm4gMVxuICB9XG5cbiAgc3RhcnQgPj4+PSAwXG4gIGVuZCA+Pj49IDBcbiAgdGhpc1N0YXJ0ID4+Pj0gMFxuICB0aGlzRW5kID4+Pj0gMFxuXG4gIGlmICh0aGlzID09PSB0YXJnZXQpIHJldHVybiAwXG5cbiAgdmFyIHggPSB0aGlzRW5kIC0gdGhpc1N0YXJ0XG4gIHZhciB5ID0gZW5kIC0gc3RhcnRcbiAgdmFyIGxlbiA9IE1hdGgubWluKHgsIHkpXG5cbiAgdmFyIHRoaXNDb3B5ID0gdGhpcy5zbGljZSh0aGlzU3RhcnQsIHRoaXNFbmQpXG4gIHZhciB0YXJnZXRDb3B5ID0gdGFyZ2V0LnNsaWNlKHN0YXJ0LCBlbmQpXG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47ICsraSkge1xuICAgIGlmICh0aGlzQ29weVtpXSAhPT0gdGFyZ2V0Q29weVtpXSkge1xuICAgICAgeCA9IHRoaXNDb3B5W2ldXG4gICAgICB5ID0gdGFyZ2V0Q29weVtpXVxuICAgICAgYnJlYWtcbiAgICB9XG4gIH1cblxuICBpZiAoeCA8IHkpIHJldHVybiAtMVxuICBpZiAoeSA8IHgpIHJldHVybiAxXG4gIHJldHVybiAwXG59XG5cbi8vIEZpbmRzIGVpdGhlciB0aGUgZmlyc3QgaW5kZXggb2YgYHZhbGAgaW4gYGJ1ZmZlcmAgYXQgb2Zmc2V0ID49IGBieXRlT2Zmc2V0YCxcbi8vIE9SIHRoZSBsYXN0IGluZGV4IG9mIGB2YWxgIGluIGBidWZmZXJgIGF0IG9mZnNldCA8PSBgYnl0ZU9mZnNldGAuXG4vL1xuLy8gQXJndW1lbnRzOlxuLy8gLSBidWZmZXIgLSBhIEJ1ZmZlciB0byBzZWFyY2hcbi8vIC0gdmFsIC0gYSBzdHJpbmcsIEJ1ZmZlciwgb3IgbnVtYmVyXG4vLyAtIGJ5dGVPZmZzZXQgLSBhbiBpbmRleCBpbnRvIGBidWZmZXJgOyB3aWxsIGJlIGNsYW1wZWQgdG8gYW4gaW50MzJcbi8vIC0gZW5jb2RpbmcgLSBhbiBvcHRpb25hbCBlbmNvZGluZywgcmVsZXZhbnQgaXMgdmFsIGlzIGEgc3RyaW5nXG4vLyAtIGRpciAtIHRydWUgZm9yIGluZGV4T2YsIGZhbHNlIGZvciBsYXN0SW5kZXhPZlxuZnVuY3Rpb24gYmlkaXJlY3Rpb25hbEluZGV4T2YgKGJ1ZmZlciwgdmFsLCBieXRlT2Zmc2V0LCBlbmNvZGluZywgZGlyKSB7XG4gIC8vIEVtcHR5IGJ1ZmZlciBtZWFucyBubyBtYXRjaFxuICBpZiAoYnVmZmVyLmxlbmd0aCA9PT0gMCkgcmV0dXJuIC0xXG5cbiAgLy8gTm9ybWFsaXplIGJ5dGVPZmZzZXRcbiAgaWYgKHR5cGVvZiBieXRlT2Zmc2V0ID09PSAnc3RyaW5nJykge1xuICAgIGVuY29kaW5nID0gYnl0ZU9mZnNldFxuICAgIGJ5dGVPZmZzZXQgPSAwXG4gIH0gZWxzZSBpZiAoYnl0ZU9mZnNldCA+IDB4N2ZmZmZmZmYpIHtcbiAgICBieXRlT2Zmc2V0ID0gMHg3ZmZmZmZmZlxuICB9IGVsc2UgaWYgKGJ5dGVPZmZzZXQgPCAtMHg4MDAwMDAwMCkge1xuICAgIGJ5dGVPZmZzZXQgPSAtMHg4MDAwMDAwMFxuICB9XG4gIGJ5dGVPZmZzZXQgPSArYnl0ZU9mZnNldCAgLy8gQ29lcmNlIHRvIE51bWJlci5cbiAgaWYgKG51bWJlcklzTmFOKGJ5dGVPZmZzZXQpKSB7XG4gICAgLy8gYnl0ZU9mZnNldDogaXQgaXQncyB1bmRlZmluZWQsIG51bGwsIE5hTiwgXCJmb29cIiwgZXRjLCBzZWFyY2ggd2hvbGUgYnVmZmVyXG4gICAgYnl0ZU9mZnNldCA9IGRpciA/IDAgOiAoYnVmZmVyLmxlbmd0aCAtIDEpXG4gIH1cblxuICAvLyBOb3JtYWxpemUgYnl0ZU9mZnNldDogbmVnYXRpdmUgb2Zmc2V0cyBzdGFydCBmcm9tIHRoZSBlbmQgb2YgdGhlIGJ1ZmZlclxuICBpZiAoYnl0ZU9mZnNldCA8IDApIGJ5dGVPZmZzZXQgPSBidWZmZXIubGVuZ3RoICsgYnl0ZU9mZnNldFxuICBpZiAoYnl0ZU9mZnNldCA+PSBidWZmZXIubGVuZ3RoKSB7XG4gICAgaWYgKGRpcikgcmV0dXJuIC0xXG4gICAgZWxzZSBieXRlT2Zmc2V0ID0gYnVmZmVyLmxlbmd0aCAtIDFcbiAgfSBlbHNlIGlmIChieXRlT2Zmc2V0IDwgMCkge1xuICAgIGlmIChkaXIpIGJ5dGVPZmZzZXQgPSAwXG4gICAgZWxzZSByZXR1cm4gLTFcbiAgfVxuXG4gIC8vIE5vcm1hbGl6ZSB2YWxcbiAgaWYgKHR5cGVvZiB2YWwgPT09ICdzdHJpbmcnKSB7XG4gICAgdmFsID0gQnVmZmVyLmZyb20odmFsLCBlbmNvZGluZylcbiAgfVxuXG4gIC8vIEZpbmFsbHksIHNlYXJjaCBlaXRoZXIgaW5kZXhPZiAoaWYgZGlyIGlzIHRydWUpIG9yIGxhc3RJbmRleE9mXG4gIGlmIChCdWZmZXIuaXNCdWZmZXIodmFsKSkge1xuICAgIC8vIFNwZWNpYWwgY2FzZTogbG9va2luZyBmb3IgZW1wdHkgc3RyaW5nL2J1ZmZlciBhbHdheXMgZmFpbHNcbiAgICBpZiAodmFsLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIC0xXG4gICAgfVxuICAgIHJldHVybiBhcnJheUluZGV4T2YoYnVmZmVyLCB2YWwsIGJ5dGVPZmZzZXQsIGVuY29kaW5nLCBkaXIpXG4gIH0gZWxzZSBpZiAodHlwZW9mIHZhbCA9PT0gJ251bWJlcicpIHtcbiAgICB2YWwgPSB2YWwgJiAweEZGIC8vIFNlYXJjaCBmb3IgYSBieXRlIHZhbHVlIFswLTI1NV1cbiAgICBpZiAodHlwZW9mIFVpbnQ4QXJyYXkucHJvdG90eXBlLmluZGV4T2YgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIGlmIChkaXIpIHtcbiAgICAgICAgcmV0dXJuIFVpbnQ4QXJyYXkucHJvdG90eXBlLmluZGV4T2YuY2FsbChidWZmZXIsIHZhbCwgYnl0ZU9mZnNldClcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBVaW50OEFycmF5LnByb3RvdHlwZS5sYXN0SW5kZXhPZi5jYWxsKGJ1ZmZlciwgdmFsLCBieXRlT2Zmc2V0KVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gYXJyYXlJbmRleE9mKGJ1ZmZlciwgWyB2YWwgXSwgYnl0ZU9mZnNldCwgZW5jb2RpbmcsIGRpcilcbiAgfVxuXG4gIHRocm93IG5ldyBUeXBlRXJyb3IoJ3ZhbCBtdXN0IGJlIHN0cmluZywgbnVtYmVyIG9yIEJ1ZmZlcicpXG59XG5cbmZ1bmN0aW9uIGFycmF5SW5kZXhPZiAoYXJyLCB2YWwsIGJ5dGVPZmZzZXQsIGVuY29kaW5nLCBkaXIpIHtcbiAgdmFyIGluZGV4U2l6ZSA9IDFcbiAgdmFyIGFyckxlbmd0aCA9IGFyci5sZW5ndGhcbiAgdmFyIHZhbExlbmd0aCA9IHZhbC5sZW5ndGhcblxuICBpZiAoZW5jb2RpbmcgIT09IHVuZGVmaW5lZCkge1xuICAgIGVuY29kaW5nID0gU3RyaW5nKGVuY29kaW5nKS50b0xvd2VyQ2FzZSgpXG4gICAgaWYgKGVuY29kaW5nID09PSAndWNzMicgfHwgZW5jb2RpbmcgPT09ICd1Y3MtMicgfHxcbiAgICAgICAgZW5jb2RpbmcgPT09ICd1dGYxNmxlJyB8fCBlbmNvZGluZyA9PT0gJ3V0Zi0xNmxlJykge1xuICAgICAgaWYgKGFyci5sZW5ndGggPCAyIHx8IHZhbC5sZW5ndGggPCAyKSB7XG4gICAgICAgIHJldHVybiAtMVxuICAgICAgfVxuICAgICAgaW5kZXhTaXplID0gMlxuICAgICAgYXJyTGVuZ3RoIC89IDJcbiAgICAgIHZhbExlbmd0aCAvPSAyXG4gICAgICBieXRlT2Zmc2V0IC89IDJcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiByZWFkIChidWYsIGkpIHtcbiAgICBpZiAoaW5kZXhTaXplID09PSAxKSB7XG4gICAgICByZXR1cm4gYnVmW2ldXG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBidWYucmVhZFVJbnQxNkJFKGkgKiBpbmRleFNpemUpXG4gICAgfVxuICB9XG5cbiAgdmFyIGlcbiAgaWYgKGRpcikge1xuICAgIHZhciBmb3VuZEluZGV4ID0gLTFcbiAgICBmb3IgKGkgPSBieXRlT2Zmc2V0OyBpIDwgYXJyTGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmIChyZWFkKGFyciwgaSkgPT09IHJlYWQodmFsLCBmb3VuZEluZGV4ID09PSAtMSA/IDAgOiBpIC0gZm91bmRJbmRleCkpIHtcbiAgICAgICAgaWYgKGZvdW5kSW5kZXggPT09IC0xKSBmb3VuZEluZGV4ID0gaVxuICAgICAgICBpZiAoaSAtIGZvdW5kSW5kZXggKyAxID09PSB2YWxMZW5ndGgpIHJldHVybiBmb3VuZEluZGV4ICogaW5kZXhTaXplXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAoZm91bmRJbmRleCAhPT0gLTEpIGkgLT0gaSAtIGZvdW5kSW5kZXhcbiAgICAgICAgZm91bmRJbmRleCA9IC0xXG4gICAgICB9XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIGlmIChieXRlT2Zmc2V0ICsgdmFsTGVuZ3RoID4gYXJyTGVuZ3RoKSBieXRlT2Zmc2V0ID0gYXJyTGVuZ3RoIC0gdmFsTGVuZ3RoXG4gICAgZm9yIChpID0gYnl0ZU9mZnNldDsgaSA+PSAwOyBpLS0pIHtcbiAgICAgIHZhciBmb3VuZCA9IHRydWVcbiAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgdmFsTGVuZ3RoOyBqKyspIHtcbiAgICAgICAgaWYgKHJlYWQoYXJyLCBpICsgaikgIT09IHJlYWQodmFsLCBqKSkge1xuICAgICAgICAgIGZvdW5kID0gZmFsc2VcbiAgICAgICAgICBicmVha1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAoZm91bmQpIHJldHVybiBpXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIC0xXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUuaW5jbHVkZXMgPSBmdW5jdGlvbiBpbmNsdWRlcyAodmFsLCBieXRlT2Zmc2V0LCBlbmNvZGluZykge1xuICByZXR1cm4gdGhpcy5pbmRleE9mKHZhbCwgYnl0ZU9mZnNldCwgZW5jb2RpbmcpICE9PSAtMVxufVxuXG5CdWZmZXIucHJvdG90eXBlLmluZGV4T2YgPSBmdW5jdGlvbiBpbmRleE9mICh2YWwsIGJ5dGVPZmZzZXQsIGVuY29kaW5nKSB7XG4gIHJldHVybiBiaWRpcmVjdGlvbmFsSW5kZXhPZih0aGlzLCB2YWwsIGJ5dGVPZmZzZXQsIGVuY29kaW5nLCB0cnVlKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLmxhc3RJbmRleE9mID0gZnVuY3Rpb24gbGFzdEluZGV4T2YgKHZhbCwgYnl0ZU9mZnNldCwgZW5jb2RpbmcpIHtcbiAgcmV0dXJuIGJpZGlyZWN0aW9uYWxJbmRleE9mKHRoaXMsIHZhbCwgYnl0ZU9mZnNldCwgZW5jb2RpbmcsIGZhbHNlKVxufVxuXG5mdW5jdGlvbiBoZXhXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIG9mZnNldCA9IE51bWJlcihvZmZzZXQpIHx8IDBcbiAgdmFyIHJlbWFpbmluZyA9IGJ1Zi5sZW5ndGggLSBvZmZzZXRcbiAgaWYgKCFsZW5ndGgpIHtcbiAgICBsZW5ndGggPSByZW1haW5pbmdcbiAgfSBlbHNlIHtcbiAgICBsZW5ndGggPSBOdW1iZXIobGVuZ3RoKVxuICAgIGlmIChsZW5ndGggPiByZW1haW5pbmcpIHtcbiAgICAgIGxlbmd0aCA9IHJlbWFpbmluZ1xuICAgIH1cbiAgfVxuXG4gIC8vIG11c3QgYmUgYW4gZXZlbiBudW1iZXIgb2YgZGlnaXRzXG4gIHZhciBzdHJMZW4gPSBzdHJpbmcubGVuZ3RoXG4gIGlmIChzdHJMZW4gJSAyICE9PSAwKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdJbnZhbGlkIGhleCBzdHJpbmcnKVxuXG4gIGlmIChsZW5ndGggPiBzdHJMZW4gLyAyKSB7XG4gICAgbGVuZ3RoID0gc3RyTGVuIC8gMlxuICB9XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyArK2kpIHtcbiAgICB2YXIgcGFyc2VkID0gcGFyc2VJbnQoc3RyaW5nLnN1YnN0cihpICogMiwgMiksIDE2KVxuICAgIGlmIChudW1iZXJJc05hTihwYXJzZWQpKSByZXR1cm4gaVxuICAgIGJ1ZltvZmZzZXQgKyBpXSA9IHBhcnNlZFxuICB9XG4gIHJldHVybiBpXG59XG5cbmZ1bmN0aW9uIHV0ZjhXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHJldHVybiBibGl0QnVmZmVyKHV0ZjhUb0J5dGVzKHN0cmluZywgYnVmLmxlbmd0aCAtIG9mZnNldCksIGJ1Ziwgb2Zmc2V0LCBsZW5ndGgpXG59XG5cbmZ1bmN0aW9uIGFzY2lpV3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICByZXR1cm4gYmxpdEJ1ZmZlcihhc2NpaVRvQnl0ZXMoc3RyaW5nKSwgYnVmLCBvZmZzZXQsIGxlbmd0aClcbn1cblxuZnVuY3Rpb24gbGF0aW4xV3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICByZXR1cm4gYXNjaWlXcml0ZShidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG59XG5cbmZ1bmN0aW9uIGJhc2U2NFdyaXRlIChidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgcmV0dXJuIGJsaXRCdWZmZXIoYmFzZTY0VG9CeXRlcyhzdHJpbmcpLCBidWYsIG9mZnNldCwgbGVuZ3RoKVxufVxuXG5mdW5jdGlvbiB1Y3MyV3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICByZXR1cm4gYmxpdEJ1ZmZlcih1dGYxNmxlVG9CeXRlcyhzdHJpbmcsIGJ1Zi5sZW5ndGggLSBvZmZzZXQpLCBidWYsIG9mZnNldCwgbGVuZ3RoKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlID0gZnVuY3Rpb24gd3JpdGUgKHN0cmluZywgb2Zmc2V0LCBsZW5ndGgsIGVuY29kaW5nKSB7XG4gIC8vIEJ1ZmZlciN3cml0ZShzdHJpbmcpXG4gIGlmIChvZmZzZXQgPT09IHVuZGVmaW5lZCkge1xuICAgIGVuY29kaW5nID0gJ3V0ZjgnXG4gICAgbGVuZ3RoID0gdGhpcy5sZW5ndGhcbiAgICBvZmZzZXQgPSAwXG4gIC8vIEJ1ZmZlciN3cml0ZShzdHJpbmcsIGVuY29kaW5nKVxuICB9IGVsc2UgaWYgKGxlbmd0aCA9PT0gdW5kZWZpbmVkICYmIHR5cGVvZiBvZmZzZXQgPT09ICdzdHJpbmcnKSB7XG4gICAgZW5jb2RpbmcgPSBvZmZzZXRcbiAgICBsZW5ndGggPSB0aGlzLmxlbmd0aFxuICAgIG9mZnNldCA9IDBcbiAgLy8gQnVmZmVyI3dyaXRlKHN0cmluZywgb2Zmc2V0WywgbGVuZ3RoXVssIGVuY29kaW5nXSlcbiAgfSBlbHNlIGlmIChpc0Zpbml0ZShvZmZzZXQpKSB7XG4gICAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gICAgaWYgKGlzRmluaXRlKGxlbmd0aCkpIHtcbiAgICAgIGxlbmd0aCA9IGxlbmd0aCA+Pj4gMFxuICAgICAgaWYgKGVuY29kaW5nID09PSB1bmRlZmluZWQpIGVuY29kaW5nID0gJ3V0ZjgnXG4gICAgfSBlbHNlIHtcbiAgICAgIGVuY29kaW5nID0gbGVuZ3RoXG4gICAgICBsZW5ndGggPSB1bmRlZmluZWRcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgJ0J1ZmZlci53cml0ZShzdHJpbmcsIGVuY29kaW5nLCBvZmZzZXRbLCBsZW5ndGhdKSBpcyBubyBsb25nZXIgc3VwcG9ydGVkJ1xuICAgIClcbiAgfVxuXG4gIHZhciByZW1haW5pbmcgPSB0aGlzLmxlbmd0aCAtIG9mZnNldFxuICBpZiAobGVuZ3RoID09PSB1bmRlZmluZWQgfHwgbGVuZ3RoID4gcmVtYWluaW5nKSBsZW5ndGggPSByZW1haW5pbmdcblxuICBpZiAoKHN0cmluZy5sZW5ndGggPiAwICYmIChsZW5ndGggPCAwIHx8IG9mZnNldCA8IDApKSB8fCBvZmZzZXQgPiB0aGlzLmxlbmd0aCkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdBdHRlbXB0IHRvIHdyaXRlIG91dHNpZGUgYnVmZmVyIGJvdW5kcycpXG4gIH1cblxuICBpZiAoIWVuY29kaW5nKSBlbmNvZGluZyA9ICd1dGY4J1xuXG4gIHZhciBsb3dlcmVkQ2FzZSA9IGZhbHNlXG4gIGZvciAoOzspIHtcbiAgICBzd2l0Y2ggKGVuY29kaW5nKSB7XG4gICAgICBjYXNlICdoZXgnOlxuICAgICAgICByZXR1cm4gaGV4V3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcblxuICAgICAgY2FzZSAndXRmOCc6XG4gICAgICBjYXNlICd1dGYtOCc6XG4gICAgICAgIHJldHVybiB1dGY4V3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcblxuICAgICAgY2FzZSAnYXNjaWknOlxuICAgICAgICByZXR1cm4gYXNjaWlXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuXG4gICAgICBjYXNlICdsYXRpbjEnOlxuICAgICAgY2FzZSAnYmluYXJ5JzpcbiAgICAgICAgcmV0dXJuIGxhdGluMVdyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG5cbiAgICAgIGNhc2UgJ2Jhc2U2NCc6XG4gICAgICAgIC8vIFdhcm5pbmc6IG1heExlbmd0aCBub3QgdGFrZW4gaW50byBhY2NvdW50IGluIGJhc2U2NFdyaXRlXG4gICAgICAgIHJldHVybiBiYXNlNjRXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuXG4gICAgICBjYXNlICd1Y3MyJzpcbiAgICAgIGNhc2UgJ3Vjcy0yJzpcbiAgICAgIGNhc2UgJ3V0ZjE2bGUnOlxuICAgICAgY2FzZSAndXRmLTE2bGUnOlxuICAgICAgICByZXR1cm4gdWNzMldyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG5cbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGlmIChsb3dlcmVkQ2FzZSkgdGhyb3cgbmV3IFR5cGVFcnJvcignVW5rbm93biBlbmNvZGluZzogJyArIGVuY29kaW5nKVxuICAgICAgICBlbmNvZGluZyA9ICgnJyArIGVuY29kaW5nKS50b0xvd2VyQ2FzZSgpXG4gICAgICAgIGxvd2VyZWRDYXNlID0gdHJ1ZVxuICAgIH1cbiAgfVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnRvSlNPTiA9IGZ1bmN0aW9uIHRvSlNPTiAoKSB7XG4gIHJldHVybiB7XG4gICAgdHlwZTogJ0J1ZmZlcicsXG4gICAgZGF0YTogQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwodGhpcy5fYXJyIHx8IHRoaXMsIDApXG4gIH1cbn1cblxuZnVuY3Rpb24gYmFzZTY0U2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICBpZiAoc3RhcnQgPT09IDAgJiYgZW5kID09PSBidWYubGVuZ3RoKSB7XG4gICAgcmV0dXJuIGJhc2U2NC5mcm9tQnl0ZUFycmF5KGJ1ZilcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gYmFzZTY0LmZyb21CeXRlQXJyYXkoYnVmLnNsaWNlKHN0YXJ0LCBlbmQpKVxuICB9XG59XG5cbmZ1bmN0aW9uIHV0ZjhTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIGVuZCA9IE1hdGgubWluKGJ1Zi5sZW5ndGgsIGVuZClcbiAgdmFyIHJlcyA9IFtdXG5cbiAgdmFyIGkgPSBzdGFydFxuICB3aGlsZSAoaSA8IGVuZCkge1xuICAgIHZhciBmaXJzdEJ5dGUgPSBidWZbaV1cbiAgICB2YXIgY29kZVBvaW50ID0gbnVsbFxuICAgIHZhciBieXRlc1BlclNlcXVlbmNlID0gKGZpcnN0Qnl0ZSA+IDB4RUYpID8gNFxuICAgICAgOiAoZmlyc3RCeXRlID4gMHhERikgPyAzXG4gICAgICA6IChmaXJzdEJ5dGUgPiAweEJGKSA/IDJcbiAgICAgIDogMVxuXG4gICAgaWYgKGkgKyBieXRlc1BlclNlcXVlbmNlIDw9IGVuZCkge1xuICAgICAgdmFyIHNlY29uZEJ5dGUsIHRoaXJkQnl0ZSwgZm91cnRoQnl0ZSwgdGVtcENvZGVQb2ludFxuXG4gICAgICBzd2l0Y2ggKGJ5dGVzUGVyU2VxdWVuY2UpIHtcbiAgICAgICAgY2FzZSAxOlxuICAgICAgICAgIGlmIChmaXJzdEJ5dGUgPCAweDgwKSB7XG4gICAgICAgICAgICBjb2RlUG9pbnQgPSBmaXJzdEJ5dGVcbiAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWtcbiAgICAgICAgY2FzZSAyOlxuICAgICAgICAgIHNlY29uZEJ5dGUgPSBidWZbaSArIDFdXG4gICAgICAgICAgaWYgKChzZWNvbmRCeXRlICYgMHhDMCkgPT09IDB4ODApIHtcbiAgICAgICAgICAgIHRlbXBDb2RlUG9pbnQgPSAoZmlyc3RCeXRlICYgMHgxRikgPDwgMHg2IHwgKHNlY29uZEJ5dGUgJiAweDNGKVxuICAgICAgICAgICAgaWYgKHRlbXBDb2RlUG9pbnQgPiAweDdGKSB7XG4gICAgICAgICAgICAgIGNvZGVQb2ludCA9IHRlbXBDb2RlUG9pbnRcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWtcbiAgICAgICAgY2FzZSAzOlxuICAgICAgICAgIHNlY29uZEJ5dGUgPSBidWZbaSArIDFdXG4gICAgICAgICAgdGhpcmRCeXRlID0gYnVmW2kgKyAyXVxuICAgICAgICAgIGlmICgoc2Vjb25kQnl0ZSAmIDB4QzApID09PSAweDgwICYmICh0aGlyZEJ5dGUgJiAweEMwKSA9PT0gMHg4MCkge1xuICAgICAgICAgICAgdGVtcENvZGVQb2ludCA9IChmaXJzdEJ5dGUgJiAweEYpIDw8IDB4QyB8IChzZWNvbmRCeXRlICYgMHgzRikgPDwgMHg2IHwgKHRoaXJkQnl0ZSAmIDB4M0YpXG4gICAgICAgICAgICBpZiAodGVtcENvZGVQb2ludCA+IDB4N0ZGICYmICh0ZW1wQ29kZVBvaW50IDwgMHhEODAwIHx8IHRlbXBDb2RlUG9pbnQgPiAweERGRkYpKSB7XG4gICAgICAgICAgICAgIGNvZGVQb2ludCA9IHRlbXBDb2RlUG9pbnRcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWtcbiAgICAgICAgY2FzZSA0OlxuICAgICAgICAgIHNlY29uZEJ5dGUgPSBidWZbaSArIDFdXG4gICAgICAgICAgdGhpcmRCeXRlID0gYnVmW2kgKyAyXVxuICAgICAgICAgIGZvdXJ0aEJ5dGUgPSBidWZbaSArIDNdXG4gICAgICAgICAgaWYgKChzZWNvbmRCeXRlICYgMHhDMCkgPT09IDB4ODAgJiYgKHRoaXJkQnl0ZSAmIDB4QzApID09PSAweDgwICYmIChmb3VydGhCeXRlICYgMHhDMCkgPT09IDB4ODApIHtcbiAgICAgICAgICAgIHRlbXBDb2RlUG9pbnQgPSAoZmlyc3RCeXRlICYgMHhGKSA8PCAweDEyIHwgKHNlY29uZEJ5dGUgJiAweDNGKSA8PCAweEMgfCAodGhpcmRCeXRlICYgMHgzRikgPDwgMHg2IHwgKGZvdXJ0aEJ5dGUgJiAweDNGKVxuICAgICAgICAgICAgaWYgKHRlbXBDb2RlUG9pbnQgPiAweEZGRkYgJiYgdGVtcENvZGVQb2ludCA8IDB4MTEwMDAwKSB7XG4gICAgICAgICAgICAgIGNvZGVQb2ludCA9IHRlbXBDb2RlUG9pbnRcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGNvZGVQb2ludCA9PT0gbnVsbCkge1xuICAgICAgLy8gd2UgZGlkIG5vdCBnZW5lcmF0ZSBhIHZhbGlkIGNvZGVQb2ludCBzbyBpbnNlcnQgYVxuICAgICAgLy8gcmVwbGFjZW1lbnQgY2hhciAoVStGRkZEKSBhbmQgYWR2YW5jZSBvbmx5IDEgYnl0ZVxuICAgICAgY29kZVBvaW50ID0gMHhGRkZEXG4gICAgICBieXRlc1BlclNlcXVlbmNlID0gMVxuICAgIH0gZWxzZSBpZiAoY29kZVBvaW50ID4gMHhGRkZGKSB7XG4gICAgICAvLyBlbmNvZGUgdG8gdXRmMTYgKHN1cnJvZ2F0ZSBwYWlyIGRhbmNlKVxuICAgICAgY29kZVBvaW50IC09IDB4MTAwMDBcbiAgICAgIHJlcy5wdXNoKGNvZGVQb2ludCA+Pj4gMTAgJiAweDNGRiB8IDB4RDgwMClcbiAgICAgIGNvZGVQb2ludCA9IDB4REMwMCB8IGNvZGVQb2ludCAmIDB4M0ZGXG4gICAgfVxuXG4gICAgcmVzLnB1c2goY29kZVBvaW50KVxuICAgIGkgKz0gYnl0ZXNQZXJTZXF1ZW5jZVxuICB9XG5cbiAgcmV0dXJuIGRlY29kZUNvZGVQb2ludHNBcnJheShyZXMpXG59XG5cbi8vIEJhc2VkIG9uIGh0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9hLzIyNzQ3MjcyLzY4MDc0MiwgdGhlIGJyb3dzZXIgd2l0aFxuLy8gdGhlIGxvd2VzdCBsaW1pdCBpcyBDaHJvbWUsIHdpdGggMHgxMDAwMCBhcmdzLlxuLy8gV2UgZ28gMSBtYWduaXR1ZGUgbGVzcywgZm9yIHNhZmV0eVxudmFyIE1BWF9BUkdVTUVOVFNfTEVOR1RIID0gMHgxMDAwXG5cbmZ1bmN0aW9uIGRlY29kZUNvZGVQb2ludHNBcnJheSAoY29kZVBvaW50cykge1xuICB2YXIgbGVuID0gY29kZVBvaW50cy5sZW5ndGhcbiAgaWYgKGxlbiA8PSBNQVhfQVJHVU1FTlRTX0xFTkdUSCkge1xuICAgIHJldHVybiBTdHJpbmcuZnJvbUNoYXJDb2RlLmFwcGx5KFN0cmluZywgY29kZVBvaW50cykgLy8gYXZvaWQgZXh0cmEgc2xpY2UoKVxuICB9XG5cbiAgLy8gRGVjb2RlIGluIGNodW5rcyB0byBhdm9pZCBcImNhbGwgc3RhY2sgc2l6ZSBleGNlZWRlZFwiLlxuICB2YXIgcmVzID0gJydcbiAgdmFyIGkgPSAwXG4gIHdoaWxlIChpIDwgbGVuKSB7XG4gICAgcmVzICs9IFN0cmluZy5mcm9tQ2hhckNvZGUuYXBwbHkoXG4gICAgICBTdHJpbmcsXG4gICAgICBjb2RlUG9pbnRzLnNsaWNlKGksIGkgKz0gTUFYX0FSR1VNRU5UU19MRU5HVEgpXG4gICAgKVxuICB9XG4gIHJldHVybiByZXNcbn1cblxuZnVuY3Rpb24gYXNjaWlTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIHZhciByZXQgPSAnJ1xuICBlbmQgPSBNYXRoLm1pbihidWYubGVuZ3RoLCBlbmQpXG5cbiAgZm9yICh2YXIgaSA9IHN0YXJ0OyBpIDwgZW5kOyArK2kpIHtcbiAgICByZXQgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShidWZbaV0gJiAweDdGKVxuICB9XG4gIHJldHVybiByZXRcbn1cblxuZnVuY3Rpb24gbGF0aW4xU2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICB2YXIgcmV0ID0gJydcbiAgZW5kID0gTWF0aC5taW4oYnVmLmxlbmd0aCwgZW5kKVxuXG4gIGZvciAodmFyIGkgPSBzdGFydDsgaSA8IGVuZDsgKytpKSB7XG4gICAgcmV0ICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoYnVmW2ldKVxuICB9XG4gIHJldHVybiByZXRcbn1cblxuZnVuY3Rpb24gaGV4U2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICB2YXIgbGVuID0gYnVmLmxlbmd0aFxuXG4gIGlmICghc3RhcnQgfHwgc3RhcnQgPCAwKSBzdGFydCA9IDBcbiAgaWYgKCFlbmQgfHwgZW5kIDwgMCB8fCBlbmQgPiBsZW4pIGVuZCA9IGxlblxuXG4gIHZhciBvdXQgPSAnJ1xuICBmb3IgKHZhciBpID0gc3RhcnQ7IGkgPCBlbmQ7ICsraSkge1xuICAgIG91dCArPSB0b0hleChidWZbaV0pXG4gIH1cbiAgcmV0dXJuIG91dFxufVxuXG5mdW5jdGlvbiB1dGYxNmxlU2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICB2YXIgYnl0ZXMgPSBidWYuc2xpY2Uoc3RhcnQsIGVuZClcbiAgdmFyIHJlcyA9ICcnXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgYnl0ZXMubGVuZ3RoOyBpICs9IDIpIHtcbiAgICByZXMgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShieXRlc1tpXSArIChieXRlc1tpICsgMV0gKiAyNTYpKVxuICB9XG4gIHJldHVybiByZXNcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5zbGljZSA9IGZ1bmN0aW9uIHNsaWNlIChzdGFydCwgZW5kKSB7XG4gIHZhciBsZW4gPSB0aGlzLmxlbmd0aFxuICBzdGFydCA9IH5+c3RhcnRcbiAgZW5kID0gZW5kID09PSB1bmRlZmluZWQgPyBsZW4gOiB+fmVuZFxuXG4gIGlmIChzdGFydCA8IDApIHtcbiAgICBzdGFydCArPSBsZW5cbiAgICBpZiAoc3RhcnQgPCAwKSBzdGFydCA9IDBcbiAgfSBlbHNlIGlmIChzdGFydCA+IGxlbikge1xuICAgIHN0YXJ0ID0gbGVuXG4gIH1cblxuICBpZiAoZW5kIDwgMCkge1xuICAgIGVuZCArPSBsZW5cbiAgICBpZiAoZW5kIDwgMCkgZW5kID0gMFxuICB9IGVsc2UgaWYgKGVuZCA+IGxlbikge1xuICAgIGVuZCA9IGxlblxuICB9XG5cbiAgaWYgKGVuZCA8IHN0YXJ0KSBlbmQgPSBzdGFydFxuXG4gIHZhciBuZXdCdWYgPSB0aGlzLnN1YmFycmF5KHN0YXJ0LCBlbmQpXG4gIC8vIFJldHVybiBhbiBhdWdtZW50ZWQgYFVpbnQ4QXJyYXlgIGluc3RhbmNlXG4gIG5ld0J1Zi5fX3Byb3RvX18gPSBCdWZmZXIucHJvdG90eXBlXG4gIHJldHVybiBuZXdCdWZcbn1cblxuLypcbiAqIE5lZWQgdG8gbWFrZSBzdXJlIHRoYXQgYnVmZmVyIGlzbid0IHRyeWluZyB0byB3cml0ZSBvdXQgb2YgYm91bmRzLlxuICovXG5mdW5jdGlvbiBjaGVja09mZnNldCAob2Zmc2V0LCBleHQsIGxlbmd0aCkge1xuICBpZiAoKG9mZnNldCAlIDEpICE9PSAwIHx8IG9mZnNldCA8IDApIHRocm93IG5ldyBSYW5nZUVycm9yKCdvZmZzZXQgaXMgbm90IHVpbnQnKVxuICBpZiAob2Zmc2V0ICsgZXh0ID4gbGVuZ3RoKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignVHJ5aW5nIHRvIGFjY2VzcyBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnRMRSA9IGZ1bmN0aW9uIHJlYWRVSW50TEUgKG9mZnNldCwgYnl0ZUxlbmd0aCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGJ5dGVMZW5ndGggPSBieXRlTGVuZ3RoID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgYnl0ZUxlbmd0aCwgdGhpcy5sZW5ndGgpXG5cbiAgdmFyIHZhbCA9IHRoaXNbb2Zmc2V0XVxuICB2YXIgbXVsID0gMVxuICB2YXIgaSA9IDBcbiAgd2hpbGUgKCsraSA8IGJ5dGVMZW5ndGggJiYgKG11bCAqPSAweDEwMCkpIHtcbiAgICB2YWwgKz0gdGhpc1tvZmZzZXQgKyBpXSAqIG11bFxuICB9XG5cbiAgcmV0dXJuIHZhbFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50QkUgPSBmdW5jdGlvbiByZWFkVUludEJFIChvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBieXRlTGVuZ3RoID0gYnl0ZUxlbmd0aCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgY2hlY2tPZmZzZXQob2Zmc2V0LCBieXRlTGVuZ3RoLCB0aGlzLmxlbmd0aClcbiAgfVxuXG4gIHZhciB2YWwgPSB0aGlzW29mZnNldCArIC0tYnl0ZUxlbmd0aF1cbiAgdmFyIG11bCA9IDFcbiAgd2hpbGUgKGJ5dGVMZW5ndGggPiAwICYmIChtdWwgKj0gMHgxMDApKSB7XG4gICAgdmFsICs9IHRoaXNbb2Zmc2V0ICsgLS1ieXRlTGVuZ3RoXSAqIG11bFxuICB9XG5cbiAgcmV0dXJuIHZhbFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50OCA9IGZ1bmN0aW9uIHJlYWRVSW50OCAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCAxLCB0aGlzLmxlbmd0aClcbiAgcmV0dXJuIHRoaXNbb2Zmc2V0XVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50MTZMRSA9IGZ1bmN0aW9uIHJlYWRVSW50MTZMRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCAyLCB0aGlzLmxlbmd0aClcbiAgcmV0dXJuIHRoaXNbb2Zmc2V0XSB8ICh0aGlzW29mZnNldCArIDFdIDw8IDgpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnQxNkJFID0gZnVuY3Rpb24gcmVhZFVJbnQxNkJFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDIsIHRoaXMubGVuZ3RoKVxuICByZXR1cm4gKHRoaXNbb2Zmc2V0XSA8PCA4KSB8IHRoaXNbb2Zmc2V0ICsgMV1cbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDMyTEUgPSBmdW5jdGlvbiByZWFkVUludDMyTEUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgNCwgdGhpcy5sZW5ndGgpXG5cbiAgcmV0dXJuICgodGhpc1tvZmZzZXRdKSB8XG4gICAgICAodGhpc1tvZmZzZXQgKyAxXSA8PCA4KSB8XG4gICAgICAodGhpc1tvZmZzZXQgKyAyXSA8PCAxNikpICtcbiAgICAgICh0aGlzW29mZnNldCArIDNdICogMHgxMDAwMDAwKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50MzJCRSA9IGZ1bmN0aW9uIHJlYWRVSW50MzJCRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCA0LCB0aGlzLmxlbmd0aClcblxuICByZXR1cm4gKHRoaXNbb2Zmc2V0XSAqIDB4MTAwMDAwMCkgK1xuICAgICgodGhpc1tvZmZzZXQgKyAxXSA8PCAxNikgfFxuICAgICh0aGlzW29mZnNldCArIDJdIDw8IDgpIHxcbiAgICB0aGlzW29mZnNldCArIDNdKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnRMRSA9IGZ1bmN0aW9uIHJlYWRJbnRMRSAob2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgYnl0ZUxlbmd0aCA9IGJ5dGVMZW5ndGggPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCBieXRlTGVuZ3RoLCB0aGlzLmxlbmd0aClcblxuICB2YXIgdmFsID0gdGhpc1tvZmZzZXRdXG4gIHZhciBtdWwgPSAxXG4gIHZhciBpID0gMFxuICB3aGlsZSAoKytpIDwgYnl0ZUxlbmd0aCAmJiAobXVsICo9IDB4MTAwKSkge1xuICAgIHZhbCArPSB0aGlzW29mZnNldCArIGldICogbXVsXG4gIH1cbiAgbXVsICo9IDB4ODBcblxuICBpZiAodmFsID49IG11bCkgdmFsIC09IE1hdGgucG93KDIsIDggKiBieXRlTGVuZ3RoKVxuXG4gIHJldHVybiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50QkUgPSBmdW5jdGlvbiByZWFkSW50QkUgKG9mZnNldCwgYnl0ZUxlbmd0aCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGJ5dGVMZW5ndGggPSBieXRlTGVuZ3RoID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgYnl0ZUxlbmd0aCwgdGhpcy5sZW5ndGgpXG5cbiAgdmFyIGkgPSBieXRlTGVuZ3RoXG4gIHZhciBtdWwgPSAxXG4gIHZhciB2YWwgPSB0aGlzW29mZnNldCArIC0taV1cbiAgd2hpbGUgKGkgPiAwICYmIChtdWwgKj0gMHgxMDApKSB7XG4gICAgdmFsICs9IHRoaXNbb2Zmc2V0ICsgLS1pXSAqIG11bFxuICB9XG4gIG11bCAqPSAweDgwXG5cbiAgaWYgKHZhbCA+PSBtdWwpIHZhbCAtPSBNYXRoLnBvdygyLCA4ICogYnl0ZUxlbmd0aClcblxuICByZXR1cm4gdmFsXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDggPSBmdW5jdGlvbiByZWFkSW50OCAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCAxLCB0aGlzLmxlbmd0aClcbiAgaWYgKCEodGhpc1tvZmZzZXRdICYgMHg4MCkpIHJldHVybiAodGhpc1tvZmZzZXRdKVxuICByZXR1cm4gKCgweGZmIC0gdGhpc1tvZmZzZXRdICsgMSkgKiAtMSlcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50MTZMRSA9IGZ1bmN0aW9uIHJlYWRJbnQxNkxFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDIsIHRoaXMubGVuZ3RoKVxuICB2YXIgdmFsID0gdGhpc1tvZmZzZXRdIHwgKHRoaXNbb2Zmc2V0ICsgMV0gPDwgOClcbiAgcmV0dXJuICh2YWwgJiAweDgwMDApID8gdmFsIHwgMHhGRkZGMDAwMCA6IHZhbFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnQxNkJFID0gZnVuY3Rpb24gcmVhZEludDE2QkUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgMiwgdGhpcy5sZW5ndGgpXG4gIHZhciB2YWwgPSB0aGlzW29mZnNldCArIDFdIHwgKHRoaXNbb2Zmc2V0XSA8PCA4KVxuICByZXR1cm4gKHZhbCAmIDB4ODAwMCkgPyB2YWwgfCAweEZGRkYwMDAwIDogdmFsXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDMyTEUgPSBmdW5jdGlvbiByZWFkSW50MzJMRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCA0LCB0aGlzLmxlbmd0aClcblxuICByZXR1cm4gKHRoaXNbb2Zmc2V0XSkgfFxuICAgICh0aGlzW29mZnNldCArIDFdIDw8IDgpIHxcbiAgICAodGhpc1tvZmZzZXQgKyAyXSA8PCAxNikgfFxuICAgICh0aGlzW29mZnNldCArIDNdIDw8IDI0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnQzMkJFID0gZnVuY3Rpb24gcmVhZEludDMyQkUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgNCwgdGhpcy5sZW5ndGgpXG5cbiAgcmV0dXJuICh0aGlzW29mZnNldF0gPDwgMjQpIHxcbiAgICAodGhpc1tvZmZzZXQgKyAxXSA8PCAxNikgfFxuICAgICh0aGlzW29mZnNldCArIDJdIDw8IDgpIHxcbiAgICAodGhpc1tvZmZzZXQgKyAzXSlcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkRmxvYXRMRSA9IGZ1bmN0aW9uIHJlYWRGbG9hdExFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDQsIHRoaXMubGVuZ3RoKVxuICByZXR1cm4gaWVlZTc1NC5yZWFkKHRoaXMsIG9mZnNldCwgdHJ1ZSwgMjMsIDQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEZsb2F0QkUgPSBmdW5jdGlvbiByZWFkRmxvYXRCRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCA0LCB0aGlzLmxlbmd0aClcbiAgcmV0dXJuIGllZWU3NTQucmVhZCh0aGlzLCBvZmZzZXQsIGZhbHNlLCAyMywgNClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkRG91YmxlTEUgPSBmdW5jdGlvbiByZWFkRG91YmxlTEUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgOCwgdGhpcy5sZW5ndGgpXG4gIHJldHVybiBpZWVlNzU0LnJlYWQodGhpcywgb2Zmc2V0LCB0cnVlLCA1MiwgOClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkRG91YmxlQkUgPSBmdW5jdGlvbiByZWFkRG91YmxlQkUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgOCwgdGhpcy5sZW5ndGgpXG4gIHJldHVybiBpZWVlNzU0LnJlYWQodGhpcywgb2Zmc2V0LCBmYWxzZSwgNTIsIDgpXG59XG5cbmZ1bmN0aW9uIGNoZWNrSW50IChidWYsIHZhbHVlLCBvZmZzZXQsIGV4dCwgbWF4LCBtaW4pIHtcbiAgaWYgKCFCdWZmZXIuaXNCdWZmZXIoYnVmKSkgdGhyb3cgbmV3IFR5cGVFcnJvcignXCJidWZmZXJcIiBhcmd1bWVudCBtdXN0IGJlIGEgQnVmZmVyIGluc3RhbmNlJylcbiAgaWYgKHZhbHVlID4gbWF4IHx8IHZhbHVlIDwgbWluKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignXCJ2YWx1ZVwiIGFyZ3VtZW50IGlzIG91dCBvZiBib3VuZHMnKVxuICBpZiAob2Zmc2V0ICsgZXh0ID4gYnVmLmxlbmd0aCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0luZGV4IG91dCBvZiByYW5nZScpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50TEUgPSBmdW5jdGlvbiB3cml0ZVVJbnRMRSAodmFsdWUsIG9mZnNldCwgYnl0ZUxlbmd0aCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGJ5dGVMZW5ndGggPSBieXRlTGVuZ3RoID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICB2YXIgbWF4Qnl0ZXMgPSBNYXRoLnBvdygyLCA4ICogYnl0ZUxlbmd0aCkgLSAxXG4gICAgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgYnl0ZUxlbmd0aCwgbWF4Qnl0ZXMsIDApXG4gIH1cblxuICB2YXIgbXVsID0gMVxuICB2YXIgaSA9IDBcbiAgdGhpc1tvZmZzZXRdID0gdmFsdWUgJiAweEZGXG4gIHdoaWxlICgrK2kgPCBieXRlTGVuZ3RoICYmIChtdWwgKj0gMHgxMDApKSB7XG4gICAgdGhpc1tvZmZzZXQgKyBpXSA9ICh2YWx1ZSAvIG11bCkgJiAweEZGXG4gIH1cblxuICByZXR1cm4gb2Zmc2V0ICsgYnl0ZUxlbmd0aFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludEJFID0gZnVuY3Rpb24gd3JpdGVVSW50QkUgKHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBieXRlTGVuZ3RoID0gYnl0ZUxlbmd0aCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgdmFyIG1heEJ5dGVzID0gTWF0aC5wb3coMiwgOCAqIGJ5dGVMZW5ndGgpIC0gMVxuICAgIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIG1heEJ5dGVzLCAwKVxuICB9XG5cbiAgdmFyIGkgPSBieXRlTGVuZ3RoIC0gMVxuICB2YXIgbXVsID0gMVxuICB0aGlzW29mZnNldCArIGldID0gdmFsdWUgJiAweEZGXG4gIHdoaWxlICgtLWkgPj0gMCAmJiAobXVsICo9IDB4MTAwKSkge1xuICAgIHRoaXNbb2Zmc2V0ICsgaV0gPSAodmFsdWUgLyBtdWwpICYgMHhGRlxuICB9XG5cbiAgcmV0dXJuIG9mZnNldCArIGJ5dGVMZW5ndGhcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnQ4ID0gZnVuY3Rpb24gd3JpdGVVSW50OCAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDEsIDB4ZmYsIDApXG4gIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSAmIDB4ZmYpXG4gIHJldHVybiBvZmZzZXQgKyAxXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MTZMRSA9IGZ1bmN0aW9uIHdyaXRlVUludDE2TEUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCAyLCAweGZmZmYsIDApXG4gIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSAmIDB4ZmYpXG4gIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgPj4+IDgpXG4gIHJldHVybiBvZmZzZXQgKyAyXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MTZCRSA9IGZ1bmN0aW9uIHdyaXRlVUludDE2QkUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCAyLCAweGZmZmYsIDApXG4gIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSA+Pj4gOClcbiAgdGhpc1tvZmZzZXQgKyAxXSA9ICh2YWx1ZSAmIDB4ZmYpXG4gIHJldHVybiBvZmZzZXQgKyAyXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MzJMRSA9IGZ1bmN0aW9uIHdyaXRlVUludDMyTEUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCA0LCAweGZmZmZmZmZmLCAwKVxuICB0aGlzW29mZnNldCArIDNdID0gKHZhbHVlID4+PiAyNClcbiAgdGhpc1tvZmZzZXQgKyAyXSA9ICh2YWx1ZSA+Pj4gMTYpXG4gIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgPj4+IDgpXG4gIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSAmIDB4ZmYpXG4gIHJldHVybiBvZmZzZXQgKyA0XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MzJCRSA9IGZ1bmN0aW9uIHdyaXRlVUludDMyQkUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCA0LCAweGZmZmZmZmZmLCAwKVxuICB0aGlzW29mZnNldF0gPSAodmFsdWUgPj4+IDI0KVxuICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlID4+PiAxNilcbiAgdGhpc1tvZmZzZXQgKyAyXSA9ICh2YWx1ZSA+Pj4gOClcbiAgdGhpc1tvZmZzZXQgKyAzXSA9ICh2YWx1ZSAmIDB4ZmYpXG4gIHJldHVybiBvZmZzZXQgKyA0XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnRMRSA9IGZ1bmN0aW9uIHdyaXRlSW50TEUgKHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgdmFyIGxpbWl0ID0gTWF0aC5wb3coMiwgKDggKiBieXRlTGVuZ3RoKSAtIDEpXG5cbiAgICBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBsaW1pdCAtIDEsIC1saW1pdClcbiAgfVxuXG4gIHZhciBpID0gMFxuICB2YXIgbXVsID0gMVxuICB2YXIgc3ViID0gMFxuICB0aGlzW29mZnNldF0gPSB2YWx1ZSAmIDB4RkZcbiAgd2hpbGUgKCsraSA8IGJ5dGVMZW5ndGggJiYgKG11bCAqPSAweDEwMCkpIHtcbiAgICBpZiAodmFsdWUgPCAwICYmIHN1YiA9PT0gMCAmJiB0aGlzW29mZnNldCArIGkgLSAxXSAhPT0gMCkge1xuICAgICAgc3ViID0gMVxuICAgIH1cbiAgICB0aGlzW29mZnNldCArIGldID0gKCh2YWx1ZSAvIG11bCkgPj4gMCkgLSBzdWIgJiAweEZGXG4gIH1cblxuICByZXR1cm4gb2Zmc2V0ICsgYnl0ZUxlbmd0aFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50QkUgPSBmdW5jdGlvbiB3cml0ZUludEJFICh2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIHZhciBsaW1pdCA9IE1hdGgucG93KDIsICg4ICogYnl0ZUxlbmd0aCkgLSAxKVxuXG4gICAgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgYnl0ZUxlbmd0aCwgbGltaXQgLSAxLCAtbGltaXQpXG4gIH1cblxuICB2YXIgaSA9IGJ5dGVMZW5ndGggLSAxXG4gIHZhciBtdWwgPSAxXG4gIHZhciBzdWIgPSAwXG4gIHRoaXNbb2Zmc2V0ICsgaV0gPSB2YWx1ZSAmIDB4RkZcbiAgd2hpbGUgKC0taSA+PSAwICYmIChtdWwgKj0gMHgxMDApKSB7XG4gICAgaWYgKHZhbHVlIDwgMCAmJiBzdWIgPT09IDAgJiYgdGhpc1tvZmZzZXQgKyBpICsgMV0gIT09IDApIHtcbiAgICAgIHN1YiA9IDFcbiAgICB9XG4gICAgdGhpc1tvZmZzZXQgKyBpXSA9ICgodmFsdWUgLyBtdWwpID4+IDApIC0gc3ViICYgMHhGRlxuICB9XG5cbiAgcmV0dXJuIG9mZnNldCArIGJ5dGVMZW5ndGhcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDggPSBmdW5jdGlvbiB3cml0ZUludDggKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCAxLCAweDdmLCAtMHg4MClcbiAgaWYgKHZhbHVlIDwgMCkgdmFsdWUgPSAweGZmICsgdmFsdWUgKyAxXG4gIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSAmIDB4ZmYpXG4gIHJldHVybiBvZmZzZXQgKyAxXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnQxNkxFID0gZnVuY3Rpb24gd3JpdGVJbnQxNkxFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgMiwgMHg3ZmZmLCAtMHg4MDAwKVxuICB0aGlzW29mZnNldF0gPSAodmFsdWUgJiAweGZmKVxuICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlID4+PiA4KVxuICByZXR1cm4gb2Zmc2V0ICsgMlxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50MTZCRSA9IGZ1bmN0aW9uIHdyaXRlSW50MTZCRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDIsIDB4N2ZmZiwgLTB4ODAwMClcbiAgdGhpc1tvZmZzZXRdID0gKHZhbHVlID4+PiA4KVxuICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlICYgMHhmZilcbiAgcmV0dXJuIG9mZnNldCArIDJcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDMyTEUgPSBmdW5jdGlvbiB3cml0ZUludDMyTEUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCA0LCAweDdmZmZmZmZmLCAtMHg4MDAwMDAwMClcbiAgdGhpc1tvZmZzZXRdID0gKHZhbHVlICYgMHhmZilcbiAgdGhpc1tvZmZzZXQgKyAxXSA9ICh2YWx1ZSA+Pj4gOClcbiAgdGhpc1tvZmZzZXQgKyAyXSA9ICh2YWx1ZSA+Pj4gMTYpXG4gIHRoaXNbb2Zmc2V0ICsgM10gPSAodmFsdWUgPj4+IDI0KVxuICByZXR1cm4gb2Zmc2V0ICsgNFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50MzJCRSA9IGZ1bmN0aW9uIHdyaXRlSW50MzJCRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDQsIDB4N2ZmZmZmZmYsIC0weDgwMDAwMDAwKVxuICBpZiAodmFsdWUgPCAwKSB2YWx1ZSA9IDB4ZmZmZmZmZmYgKyB2YWx1ZSArIDFcbiAgdGhpc1tvZmZzZXRdID0gKHZhbHVlID4+PiAyNClcbiAgdGhpc1tvZmZzZXQgKyAxXSA9ICh2YWx1ZSA+Pj4gMTYpXG4gIHRoaXNbb2Zmc2V0ICsgMl0gPSAodmFsdWUgPj4+IDgpXG4gIHRoaXNbb2Zmc2V0ICsgM10gPSAodmFsdWUgJiAweGZmKVxuICByZXR1cm4gb2Zmc2V0ICsgNFxufVxuXG5mdW5jdGlvbiBjaGVja0lFRUU3NTQgKGJ1ZiwgdmFsdWUsIG9mZnNldCwgZXh0LCBtYXgsIG1pbikge1xuICBpZiAob2Zmc2V0ICsgZXh0ID4gYnVmLmxlbmd0aCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0luZGV4IG91dCBvZiByYW5nZScpXG4gIGlmIChvZmZzZXQgPCAwKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignSW5kZXggb3V0IG9mIHJhbmdlJylcbn1cblxuZnVuY3Rpb24gd3JpdGVGbG9hdCAoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgY2hlY2tJRUVFNzU0KGJ1ZiwgdmFsdWUsIG9mZnNldCwgNCwgMy40MDI4MjM0NjYzODUyODg2ZSszOCwgLTMuNDAyODIzNDY2Mzg1Mjg4NmUrMzgpXG4gIH1cbiAgaWVlZTc1NC53cml0ZShidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgMjMsIDQpXG4gIHJldHVybiBvZmZzZXQgKyA0XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVGbG9hdExFID0gZnVuY3Rpb24gd3JpdGVGbG9hdExFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gd3JpdGVGbG9hdCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUZsb2F0QkUgPSBmdW5jdGlvbiB3cml0ZUZsb2F0QkUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiB3cml0ZUZsb2F0KHRoaXMsIHZhbHVlLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydClcbn1cblxuZnVuY3Rpb24gd3JpdGVEb3VibGUgKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGNoZWNrSUVFRTc1NChidWYsIHZhbHVlLCBvZmZzZXQsIDgsIDEuNzk3NjkzMTM0ODYyMzE1N0UrMzA4LCAtMS43OTc2OTMxMzQ4NjIzMTU3RSszMDgpXG4gIH1cbiAgaWVlZTc1NC53cml0ZShidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgNTIsIDgpXG4gIHJldHVybiBvZmZzZXQgKyA4XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVEb3VibGVMRSA9IGZ1bmN0aW9uIHdyaXRlRG91YmxlTEUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiB3cml0ZURvdWJsZSh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZURvdWJsZUJFID0gZnVuY3Rpb24gd3JpdGVEb3VibGVCRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIHdyaXRlRG91YmxlKHRoaXMsIHZhbHVlLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydClcbn1cblxuLy8gY29weSh0YXJnZXRCdWZmZXIsIHRhcmdldFN0YXJ0PTAsIHNvdXJjZVN0YXJ0PTAsIHNvdXJjZUVuZD1idWZmZXIubGVuZ3RoKVxuQnVmZmVyLnByb3RvdHlwZS5jb3B5ID0gZnVuY3Rpb24gY29weSAodGFyZ2V0LCB0YXJnZXRTdGFydCwgc3RhcnQsIGVuZCkge1xuICBpZiAoIXN0YXJ0KSBzdGFydCA9IDBcbiAgaWYgKCFlbmQgJiYgZW5kICE9PSAwKSBlbmQgPSB0aGlzLmxlbmd0aFxuICBpZiAodGFyZ2V0U3RhcnQgPj0gdGFyZ2V0Lmxlbmd0aCkgdGFyZ2V0U3RhcnQgPSB0YXJnZXQubGVuZ3RoXG4gIGlmICghdGFyZ2V0U3RhcnQpIHRhcmdldFN0YXJ0ID0gMFxuICBpZiAoZW5kID4gMCAmJiBlbmQgPCBzdGFydCkgZW5kID0gc3RhcnRcblxuICAvLyBDb3B5IDAgYnl0ZXM7IHdlJ3JlIGRvbmVcbiAgaWYgKGVuZCA9PT0gc3RhcnQpIHJldHVybiAwXG4gIGlmICh0YXJnZXQubGVuZ3RoID09PSAwIHx8IHRoaXMubGVuZ3RoID09PSAwKSByZXR1cm4gMFxuXG4gIC8vIEZhdGFsIGVycm9yIGNvbmRpdGlvbnNcbiAgaWYgKHRhcmdldFN0YXJ0IDwgMCkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCd0YXJnZXRTdGFydCBvdXQgb2YgYm91bmRzJylcbiAgfVxuICBpZiAoc3RhcnQgPCAwIHx8IHN0YXJ0ID49IHRoaXMubGVuZ3RoKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignc291cmNlU3RhcnQgb3V0IG9mIGJvdW5kcycpXG4gIGlmIChlbmQgPCAwKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignc291cmNlRW5kIG91dCBvZiBib3VuZHMnKVxuXG4gIC8vIEFyZSB3ZSBvb2I/XG4gIGlmIChlbmQgPiB0aGlzLmxlbmd0aCkgZW5kID0gdGhpcy5sZW5ndGhcbiAgaWYgKHRhcmdldC5sZW5ndGggLSB0YXJnZXRTdGFydCA8IGVuZCAtIHN0YXJ0KSB7XG4gICAgZW5kID0gdGFyZ2V0Lmxlbmd0aCAtIHRhcmdldFN0YXJ0ICsgc3RhcnRcbiAgfVxuXG4gIHZhciBsZW4gPSBlbmQgLSBzdGFydFxuICB2YXIgaVxuXG4gIGlmICh0aGlzID09PSB0YXJnZXQgJiYgc3RhcnQgPCB0YXJnZXRTdGFydCAmJiB0YXJnZXRTdGFydCA8IGVuZCkge1xuICAgIC8vIGRlc2NlbmRpbmcgY29weSBmcm9tIGVuZFxuICAgIGZvciAoaSA9IGxlbiAtIDE7IGkgPj0gMDsgLS1pKSB7XG4gICAgICB0YXJnZXRbaSArIHRhcmdldFN0YXJ0XSA9IHRoaXNbaSArIHN0YXJ0XVxuICAgIH1cbiAgfSBlbHNlIGlmIChsZW4gPCAxMDAwKSB7XG4gICAgLy8gYXNjZW5kaW5nIGNvcHkgZnJvbSBzdGFydFxuICAgIGZvciAoaSA9IDA7IGkgPCBsZW47ICsraSkge1xuICAgICAgdGFyZ2V0W2kgKyB0YXJnZXRTdGFydF0gPSB0aGlzW2kgKyBzdGFydF1cbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgVWludDhBcnJheS5wcm90b3R5cGUuc2V0LmNhbGwoXG4gICAgICB0YXJnZXQsXG4gICAgICB0aGlzLnN1YmFycmF5KHN0YXJ0LCBzdGFydCArIGxlbiksXG4gICAgICB0YXJnZXRTdGFydFxuICAgIClcbiAgfVxuXG4gIHJldHVybiBsZW5cbn1cblxuLy8gVXNhZ2U6XG4vLyAgICBidWZmZXIuZmlsbChudW1iZXJbLCBvZmZzZXRbLCBlbmRdXSlcbi8vICAgIGJ1ZmZlci5maWxsKGJ1ZmZlclssIG9mZnNldFssIGVuZF1dKVxuLy8gICAgYnVmZmVyLmZpbGwoc3RyaW5nWywgb2Zmc2V0WywgZW5kXV1bLCBlbmNvZGluZ10pXG5CdWZmZXIucHJvdG90eXBlLmZpbGwgPSBmdW5jdGlvbiBmaWxsICh2YWwsIHN0YXJ0LCBlbmQsIGVuY29kaW5nKSB7XG4gIC8vIEhhbmRsZSBzdHJpbmcgY2FzZXM6XG4gIGlmICh0eXBlb2YgdmFsID09PSAnc3RyaW5nJykge1xuICAgIGlmICh0eXBlb2Ygc3RhcnQgPT09ICdzdHJpbmcnKSB7XG4gICAgICBlbmNvZGluZyA9IHN0YXJ0XG4gICAgICBzdGFydCA9IDBcbiAgICAgIGVuZCA9IHRoaXMubGVuZ3RoXG4gICAgfSBlbHNlIGlmICh0eXBlb2YgZW5kID09PSAnc3RyaW5nJykge1xuICAgICAgZW5jb2RpbmcgPSBlbmRcbiAgICAgIGVuZCA9IHRoaXMubGVuZ3RoXG4gICAgfVxuICAgIGlmICh2YWwubGVuZ3RoID09PSAxKSB7XG4gICAgICB2YXIgY29kZSA9IHZhbC5jaGFyQ29kZUF0KDApXG4gICAgICBpZiAoY29kZSA8IDI1Nikge1xuICAgICAgICB2YWwgPSBjb2RlXG4gICAgICB9XG4gICAgfVxuICAgIGlmIChlbmNvZGluZyAhPT0gdW5kZWZpbmVkICYmIHR5cGVvZiBlbmNvZGluZyAhPT0gJ3N0cmluZycpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ2VuY29kaW5nIG11c3QgYmUgYSBzdHJpbmcnKVxuICAgIH1cbiAgICBpZiAodHlwZW9mIGVuY29kaW5nID09PSAnc3RyaW5nJyAmJiAhQnVmZmVyLmlzRW5jb2RpbmcoZW5jb2RpbmcpKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdVbmtub3duIGVuY29kaW5nOiAnICsgZW5jb2RpbmcpXG4gICAgfVxuICB9IGVsc2UgaWYgKHR5cGVvZiB2YWwgPT09ICdudW1iZXInKSB7XG4gICAgdmFsID0gdmFsICYgMjU1XG4gIH1cblxuICAvLyBJbnZhbGlkIHJhbmdlcyBhcmUgbm90IHNldCB0byBhIGRlZmF1bHQsIHNvIGNhbiByYW5nZSBjaGVjayBlYXJseS5cbiAgaWYgKHN0YXJ0IDwgMCB8fCB0aGlzLmxlbmd0aCA8IHN0YXJ0IHx8IHRoaXMubGVuZ3RoIDwgZW5kKSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ091dCBvZiByYW5nZSBpbmRleCcpXG4gIH1cblxuICBpZiAoZW5kIDw9IHN0YXJ0KSB7XG4gICAgcmV0dXJuIHRoaXNcbiAgfVxuXG4gIHN0YXJ0ID0gc3RhcnQgPj4+IDBcbiAgZW5kID0gZW5kID09PSB1bmRlZmluZWQgPyB0aGlzLmxlbmd0aCA6IGVuZCA+Pj4gMFxuXG4gIGlmICghdmFsKSB2YWwgPSAwXG5cbiAgdmFyIGlcbiAgaWYgKHR5cGVvZiB2YWwgPT09ICdudW1iZXInKSB7XG4gICAgZm9yIChpID0gc3RhcnQ7IGkgPCBlbmQ7ICsraSkge1xuICAgICAgdGhpc1tpXSA9IHZhbFxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICB2YXIgYnl0ZXMgPSBCdWZmZXIuaXNCdWZmZXIodmFsKVxuICAgICAgPyB2YWxcbiAgICAgIDogbmV3IEJ1ZmZlcih2YWwsIGVuY29kaW5nKVxuICAgIHZhciBsZW4gPSBieXRlcy5sZW5ndGhcbiAgICBmb3IgKGkgPSAwOyBpIDwgZW5kIC0gc3RhcnQ7ICsraSkge1xuICAgICAgdGhpc1tpICsgc3RhcnRdID0gYnl0ZXNbaSAlIGxlbl1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gdGhpc1xufVxuXG4vLyBIRUxQRVIgRlVOQ1RJT05TXG4vLyA9PT09PT09PT09PT09PT09XG5cbnZhciBJTlZBTElEX0JBU0U2NF9SRSA9IC9bXisvMC05QS1aYS16LV9dL2dcblxuZnVuY3Rpb24gYmFzZTY0Y2xlYW4gKHN0cikge1xuICAvLyBOb2RlIHN0cmlwcyBvdXQgaW52YWxpZCBjaGFyYWN0ZXJzIGxpa2UgXFxuIGFuZCBcXHQgZnJvbSB0aGUgc3RyaW5nLCBiYXNlNjQtanMgZG9lcyBub3RcbiAgc3RyID0gc3RyLnRyaW0oKS5yZXBsYWNlKElOVkFMSURfQkFTRTY0X1JFLCAnJylcbiAgLy8gTm9kZSBjb252ZXJ0cyBzdHJpbmdzIHdpdGggbGVuZ3RoIDwgMiB0byAnJ1xuICBpZiAoc3RyLmxlbmd0aCA8IDIpIHJldHVybiAnJ1xuICAvLyBOb2RlIGFsbG93cyBmb3Igbm9uLXBhZGRlZCBiYXNlNjQgc3RyaW5ncyAobWlzc2luZyB0cmFpbGluZyA9PT0pLCBiYXNlNjQtanMgZG9lcyBub3RcbiAgd2hpbGUgKHN0ci5sZW5ndGggJSA0ICE9PSAwKSB7XG4gICAgc3RyID0gc3RyICsgJz0nXG4gIH1cbiAgcmV0dXJuIHN0clxufVxuXG5mdW5jdGlvbiB0b0hleCAobikge1xuICBpZiAobiA8IDE2KSByZXR1cm4gJzAnICsgbi50b1N0cmluZygxNilcbiAgcmV0dXJuIG4udG9TdHJpbmcoMTYpXG59XG5cbmZ1bmN0aW9uIHV0ZjhUb0J5dGVzIChzdHJpbmcsIHVuaXRzKSB7XG4gIHVuaXRzID0gdW5pdHMgfHwgSW5maW5pdHlcbiAgdmFyIGNvZGVQb2ludFxuICB2YXIgbGVuZ3RoID0gc3RyaW5nLmxlbmd0aFxuICB2YXIgbGVhZFN1cnJvZ2F0ZSA9IG51bGxcbiAgdmFyIGJ5dGVzID0gW11cblxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgKytpKSB7XG4gICAgY29kZVBvaW50ID0gc3RyaW5nLmNoYXJDb2RlQXQoaSlcblxuICAgIC8vIGlzIHN1cnJvZ2F0ZSBjb21wb25lbnRcbiAgICBpZiAoY29kZVBvaW50ID4gMHhEN0ZGICYmIGNvZGVQb2ludCA8IDB4RTAwMCkge1xuICAgICAgLy8gbGFzdCBjaGFyIHdhcyBhIGxlYWRcbiAgICAgIGlmICghbGVhZFN1cnJvZ2F0ZSkge1xuICAgICAgICAvLyBubyBsZWFkIHlldFxuICAgICAgICBpZiAoY29kZVBvaW50ID4gMHhEQkZGKSB7XG4gICAgICAgICAgLy8gdW5leHBlY3RlZCB0cmFpbFxuICAgICAgICAgIGlmICgodW5pdHMgLT0gMykgPiAtMSkgYnl0ZXMucHVzaCgweEVGLCAweEJGLCAweEJEKVxuICAgICAgICAgIGNvbnRpbnVlXG4gICAgICAgIH0gZWxzZSBpZiAoaSArIDEgPT09IGxlbmd0aCkge1xuICAgICAgICAgIC8vIHVucGFpcmVkIGxlYWRcbiAgICAgICAgICBpZiAoKHVuaXRzIC09IDMpID4gLTEpIGJ5dGVzLnB1c2goMHhFRiwgMHhCRiwgMHhCRClcbiAgICAgICAgICBjb250aW51ZVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gdmFsaWQgbGVhZFxuICAgICAgICBsZWFkU3Vycm9nYXRlID0gY29kZVBvaW50XG5cbiAgICAgICAgY29udGludWVcbiAgICAgIH1cblxuICAgICAgLy8gMiBsZWFkcyBpbiBhIHJvd1xuICAgICAgaWYgKGNvZGVQb2ludCA8IDB4REMwMCkge1xuICAgICAgICBpZiAoKHVuaXRzIC09IDMpID4gLTEpIGJ5dGVzLnB1c2goMHhFRiwgMHhCRiwgMHhCRClcbiAgICAgICAgbGVhZFN1cnJvZ2F0ZSA9IGNvZGVQb2ludFxuICAgICAgICBjb250aW51ZVxuICAgICAgfVxuXG4gICAgICAvLyB2YWxpZCBzdXJyb2dhdGUgcGFpclxuICAgICAgY29kZVBvaW50ID0gKGxlYWRTdXJyb2dhdGUgLSAweEQ4MDAgPDwgMTAgfCBjb2RlUG9pbnQgLSAweERDMDApICsgMHgxMDAwMFxuICAgIH0gZWxzZSBpZiAobGVhZFN1cnJvZ2F0ZSkge1xuICAgICAgLy8gdmFsaWQgYm1wIGNoYXIsIGJ1dCBsYXN0IGNoYXIgd2FzIGEgbGVhZFxuICAgICAgaWYgKCh1bml0cyAtPSAzKSA+IC0xKSBieXRlcy5wdXNoKDB4RUYsIDB4QkYsIDB4QkQpXG4gICAgfVxuXG4gICAgbGVhZFN1cnJvZ2F0ZSA9IG51bGxcblxuICAgIC8vIGVuY29kZSB1dGY4XG4gICAgaWYgKGNvZGVQb2ludCA8IDB4ODApIHtcbiAgICAgIGlmICgodW5pdHMgLT0gMSkgPCAwKSBicmVha1xuICAgICAgYnl0ZXMucHVzaChjb2RlUG9pbnQpXG4gICAgfSBlbHNlIGlmIChjb2RlUG9pbnQgPCAweDgwMCkge1xuICAgICAgaWYgKCh1bml0cyAtPSAyKSA8IDApIGJyZWFrXG4gICAgICBieXRlcy5wdXNoKFxuICAgICAgICBjb2RlUG9pbnQgPj4gMHg2IHwgMHhDMCxcbiAgICAgICAgY29kZVBvaW50ICYgMHgzRiB8IDB4ODBcbiAgICAgIClcbiAgICB9IGVsc2UgaWYgKGNvZGVQb2ludCA8IDB4MTAwMDApIHtcbiAgICAgIGlmICgodW5pdHMgLT0gMykgPCAwKSBicmVha1xuICAgICAgYnl0ZXMucHVzaChcbiAgICAgICAgY29kZVBvaW50ID4+IDB4QyB8IDB4RTAsXG4gICAgICAgIGNvZGVQb2ludCA+PiAweDYgJiAweDNGIHwgMHg4MCxcbiAgICAgICAgY29kZVBvaW50ICYgMHgzRiB8IDB4ODBcbiAgICAgIClcbiAgICB9IGVsc2UgaWYgKGNvZGVQb2ludCA8IDB4MTEwMDAwKSB7XG4gICAgICBpZiAoKHVuaXRzIC09IDQpIDwgMCkgYnJlYWtcbiAgICAgIGJ5dGVzLnB1c2goXG4gICAgICAgIGNvZGVQb2ludCA+PiAweDEyIHwgMHhGMCxcbiAgICAgICAgY29kZVBvaW50ID4+IDB4QyAmIDB4M0YgfCAweDgwLFxuICAgICAgICBjb2RlUG9pbnQgPj4gMHg2ICYgMHgzRiB8IDB4ODAsXG4gICAgICAgIGNvZGVQb2ludCAmIDB4M0YgfCAweDgwXG4gICAgICApXG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBjb2RlIHBvaW50JylcbiAgICB9XG4gIH1cblxuICByZXR1cm4gYnl0ZXNcbn1cblxuZnVuY3Rpb24gYXNjaWlUb0J5dGVzIChzdHIpIHtcbiAgdmFyIGJ5dGVBcnJheSA9IFtdXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgc3RyLmxlbmd0aDsgKytpKSB7XG4gICAgLy8gTm9kZSdzIGNvZGUgc2VlbXMgdG8gYmUgZG9pbmcgdGhpcyBhbmQgbm90ICYgMHg3Ri4uXG4gICAgYnl0ZUFycmF5LnB1c2goc3RyLmNoYXJDb2RlQXQoaSkgJiAweEZGKVxuICB9XG4gIHJldHVybiBieXRlQXJyYXlcbn1cblxuZnVuY3Rpb24gdXRmMTZsZVRvQnl0ZXMgKHN0ciwgdW5pdHMpIHtcbiAgdmFyIGMsIGhpLCBsb1xuICB2YXIgYnl0ZUFycmF5ID0gW11cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBzdHIubGVuZ3RoOyArK2kpIHtcbiAgICBpZiAoKHVuaXRzIC09IDIpIDwgMCkgYnJlYWtcblxuICAgIGMgPSBzdHIuY2hhckNvZGVBdChpKVxuICAgIGhpID0gYyA+PiA4XG4gICAgbG8gPSBjICUgMjU2XG4gICAgYnl0ZUFycmF5LnB1c2gobG8pXG4gICAgYnl0ZUFycmF5LnB1c2goaGkpXG4gIH1cblxuICByZXR1cm4gYnl0ZUFycmF5XG59XG5cbmZ1bmN0aW9uIGJhc2U2NFRvQnl0ZXMgKHN0cikge1xuICByZXR1cm4gYmFzZTY0LnRvQnl0ZUFycmF5KGJhc2U2NGNsZWFuKHN0cikpXG59XG5cbmZ1bmN0aW9uIGJsaXRCdWZmZXIgKHNyYywgZHN0LCBvZmZzZXQsIGxlbmd0aCkge1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgKytpKSB7XG4gICAgaWYgKChpICsgb2Zmc2V0ID49IGRzdC5sZW5ndGgpIHx8IChpID49IHNyYy5sZW5ndGgpKSBicmVha1xuICAgIGRzdFtpICsgb2Zmc2V0XSA9IHNyY1tpXVxuICB9XG4gIHJldHVybiBpXG59XG5cbi8vIEFycmF5QnVmZmVycyBmcm9tIGFub3RoZXIgY29udGV4dCAoaS5lLiBhbiBpZnJhbWUpIGRvIG5vdCBwYXNzIHRoZSBgaW5zdGFuY2VvZmAgY2hlY2tcbi8vIGJ1dCB0aGV5IHNob3VsZCBiZSB0cmVhdGVkIGFzIHZhbGlkLiBTZWU6IGh0dHBzOi8vZ2l0aHViLmNvbS9mZXJvc3MvYnVmZmVyL2lzc3Vlcy8xNjZcbmZ1bmN0aW9uIGlzQXJyYXlCdWZmZXIgKG9iaikge1xuICByZXR1cm4gb2JqIGluc3RhbmNlb2YgQXJyYXlCdWZmZXIgfHxcbiAgICAob2JqICE9IG51bGwgJiYgb2JqLmNvbnN0cnVjdG9yICE9IG51bGwgJiYgb2JqLmNvbnN0cnVjdG9yLm5hbWUgPT09ICdBcnJheUJ1ZmZlcicgJiZcbiAgICAgIHR5cGVvZiBvYmouYnl0ZUxlbmd0aCA9PT0gJ251bWJlcicpXG59XG5cbi8vIE5vZGUgMC4xMCBzdXBwb3J0cyBgQXJyYXlCdWZmZXJgIGJ1dCBsYWNrcyBgQXJyYXlCdWZmZXIuaXNWaWV3YFxuZnVuY3Rpb24gaXNBcnJheUJ1ZmZlclZpZXcgKG9iaikge1xuICByZXR1cm4gKHR5cGVvZiBBcnJheUJ1ZmZlci5pc1ZpZXcgPT09ICdmdW5jdGlvbicpICYmIEFycmF5QnVmZmVyLmlzVmlldyhvYmopXG59XG5cbmZ1bmN0aW9uIG51bWJlcklzTmFOIChvYmopIHtcbiAgcmV0dXJuIG9iaiAhPT0gb2JqIC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbm8tc2VsZi1jb21wYXJlXG59XG4iLCJ2YXIgY2xvbmUgPSAoZnVuY3Rpb24oKSB7XG4ndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIF9pbnN0YW5jZW9mKG9iaiwgdHlwZSkge1xuICByZXR1cm4gdHlwZSAhPSBudWxsICYmIG9iaiBpbnN0YW5jZW9mIHR5cGU7XG59XG5cbnZhciBuYXRpdmVNYXA7XG50cnkge1xuICBuYXRpdmVNYXAgPSBNYXA7XG59IGNhdGNoKF8pIHtcbiAgLy8gbWF5YmUgYSByZWZlcmVuY2UgZXJyb3IgYmVjYXVzZSBubyBgTWFwYC4gR2l2ZSBpdCBhIGR1bW15IHZhbHVlIHRoYXQgbm9cbiAgLy8gdmFsdWUgd2lsbCBldmVyIGJlIGFuIGluc3RhbmNlb2YuXG4gIG5hdGl2ZU1hcCA9IGZ1bmN0aW9uKCkge307XG59XG5cbnZhciBuYXRpdmVTZXQ7XG50cnkge1xuICBuYXRpdmVTZXQgPSBTZXQ7XG59IGNhdGNoKF8pIHtcbiAgbmF0aXZlU2V0ID0gZnVuY3Rpb24oKSB7fTtcbn1cblxudmFyIG5hdGl2ZVByb21pc2U7XG50cnkge1xuICBuYXRpdmVQcm9taXNlID0gUHJvbWlzZTtcbn0gY2F0Y2goXykge1xuICBuYXRpdmVQcm9taXNlID0gZnVuY3Rpb24oKSB7fTtcbn1cblxuLyoqXG4gKiBDbG9uZXMgKGNvcGllcykgYW4gT2JqZWN0IHVzaW5nIGRlZXAgY29weWluZy5cbiAqXG4gKiBUaGlzIGZ1bmN0aW9uIHN1cHBvcnRzIGNpcmN1bGFyIHJlZmVyZW5jZXMgYnkgZGVmYXVsdCwgYnV0IGlmIHlvdSBhcmUgY2VydGFpblxuICogdGhlcmUgYXJlIG5vIGNpcmN1bGFyIHJlZmVyZW5jZXMgaW4geW91ciBvYmplY3QsIHlvdSBjYW4gc2F2ZSBzb21lIENQVSB0aW1lXG4gKiBieSBjYWxsaW5nIGNsb25lKG9iaiwgZmFsc2UpLlxuICpcbiAqIENhdXRpb246IGlmIGBjaXJjdWxhcmAgaXMgZmFsc2UgYW5kIGBwYXJlbnRgIGNvbnRhaW5zIGNpcmN1bGFyIHJlZmVyZW5jZXMsXG4gKiB5b3VyIHByb2dyYW0gbWF5IGVudGVyIGFuIGluZmluaXRlIGxvb3AgYW5kIGNyYXNoLlxuICpcbiAqIEBwYXJhbSBgcGFyZW50YCAtIHRoZSBvYmplY3QgdG8gYmUgY2xvbmVkXG4gKiBAcGFyYW0gYGNpcmN1bGFyYCAtIHNldCB0byB0cnVlIGlmIHRoZSBvYmplY3QgdG8gYmUgY2xvbmVkIG1heSBjb250YWluXG4gKiAgICBjaXJjdWxhciByZWZlcmVuY2VzLiAob3B0aW9uYWwgLSB0cnVlIGJ5IGRlZmF1bHQpXG4gKiBAcGFyYW0gYGRlcHRoYCAtIHNldCB0byBhIG51bWJlciBpZiB0aGUgb2JqZWN0IGlzIG9ubHkgdG8gYmUgY2xvbmVkIHRvXG4gKiAgICBhIHBhcnRpY3VsYXIgZGVwdGguIChvcHRpb25hbCAtIGRlZmF1bHRzIHRvIEluZmluaXR5KVxuICogQHBhcmFtIGBwcm90b3R5cGVgIC0gc2V0cyB0aGUgcHJvdG90eXBlIHRvIGJlIHVzZWQgd2hlbiBjbG9uaW5nIGFuIG9iamVjdC5cbiAqICAgIChvcHRpb25hbCAtIGRlZmF1bHRzIHRvIHBhcmVudCBwcm90b3R5cGUpLlxuICogQHBhcmFtIGBpbmNsdWRlTm9uRW51bWVyYWJsZWAgLSBzZXQgdG8gdHJ1ZSBpZiB0aGUgbm9uLWVudW1lcmFibGUgcHJvcGVydGllc1xuICogICAgc2hvdWxkIGJlIGNsb25lZCBhcyB3ZWxsLiBOb24tZW51bWVyYWJsZSBwcm9wZXJ0aWVzIG9uIHRoZSBwcm90b3R5cGVcbiAqICAgIGNoYWluIHdpbGwgYmUgaWdub3JlZC4gKG9wdGlvbmFsIC0gZmFsc2UgYnkgZGVmYXVsdClcbiovXG5mdW5jdGlvbiBjbG9uZShwYXJlbnQsIGNpcmN1bGFyLCBkZXB0aCwgcHJvdG90eXBlLCBpbmNsdWRlTm9uRW51bWVyYWJsZSkge1xuICBpZiAodHlwZW9mIGNpcmN1bGFyID09PSAnb2JqZWN0Jykge1xuICAgIGRlcHRoID0gY2lyY3VsYXIuZGVwdGg7XG4gICAgcHJvdG90eXBlID0gY2lyY3VsYXIucHJvdG90eXBlO1xuICAgIGluY2x1ZGVOb25FbnVtZXJhYmxlID0gY2lyY3VsYXIuaW5jbHVkZU5vbkVudW1lcmFibGU7XG4gICAgY2lyY3VsYXIgPSBjaXJjdWxhci5jaXJjdWxhcjtcbiAgfVxuICAvLyBtYWludGFpbiB0d28gYXJyYXlzIGZvciBjaXJjdWxhciByZWZlcmVuY2VzLCB3aGVyZSBjb3JyZXNwb25kaW5nIHBhcmVudHNcbiAgLy8gYW5kIGNoaWxkcmVuIGhhdmUgdGhlIHNhbWUgaW5kZXhcbiAgdmFyIGFsbFBhcmVudHMgPSBbXTtcbiAgdmFyIGFsbENoaWxkcmVuID0gW107XG5cbiAgdmFyIHVzZUJ1ZmZlciA9IHR5cGVvZiBCdWZmZXIgIT0gJ3VuZGVmaW5lZCc7XG5cbiAgaWYgKHR5cGVvZiBjaXJjdWxhciA9PSAndW5kZWZpbmVkJylcbiAgICBjaXJjdWxhciA9IHRydWU7XG5cbiAgaWYgKHR5cGVvZiBkZXB0aCA9PSAndW5kZWZpbmVkJylcbiAgICBkZXB0aCA9IEluZmluaXR5O1xuXG4gIC8vIHJlY3Vyc2UgdGhpcyBmdW5jdGlvbiBzbyB3ZSBkb24ndCByZXNldCBhbGxQYXJlbnRzIGFuZCBhbGxDaGlsZHJlblxuICBmdW5jdGlvbiBfY2xvbmUocGFyZW50LCBkZXB0aCkge1xuICAgIC8vIGNsb25pbmcgbnVsbCBhbHdheXMgcmV0dXJucyBudWxsXG4gICAgaWYgKHBhcmVudCA9PT0gbnVsbClcbiAgICAgIHJldHVybiBudWxsO1xuXG4gICAgaWYgKGRlcHRoID09PSAwKVxuICAgICAgcmV0dXJuIHBhcmVudDtcblxuICAgIHZhciBjaGlsZDtcbiAgICB2YXIgcHJvdG87XG4gICAgaWYgKHR5cGVvZiBwYXJlbnQgIT0gJ29iamVjdCcpIHtcbiAgICAgIHJldHVybiBwYXJlbnQ7XG4gICAgfVxuXG4gICAgaWYgKF9pbnN0YW5jZW9mKHBhcmVudCwgbmF0aXZlTWFwKSkge1xuICAgICAgY2hpbGQgPSBuZXcgbmF0aXZlTWFwKCk7XG4gICAgfSBlbHNlIGlmIChfaW5zdGFuY2VvZihwYXJlbnQsIG5hdGl2ZVNldCkpIHtcbiAgICAgIGNoaWxkID0gbmV3IG5hdGl2ZVNldCgpO1xuICAgIH0gZWxzZSBpZiAoX2luc3RhbmNlb2YocGFyZW50LCBuYXRpdmVQcm9taXNlKSkge1xuICAgICAgY2hpbGQgPSBuZXcgbmF0aXZlUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgIHBhcmVudC50aGVuKGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgcmVzb2x2ZShfY2xvbmUodmFsdWUsIGRlcHRoIC0gMSkpO1xuICAgICAgICB9LCBmdW5jdGlvbihlcnIpIHtcbiAgICAgICAgICByZWplY3QoX2Nsb25lKGVyciwgZGVwdGggLSAxKSk7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfSBlbHNlIGlmIChjbG9uZS5fX2lzQXJyYXkocGFyZW50KSkge1xuICAgICAgY2hpbGQgPSBbXTtcbiAgICB9IGVsc2UgaWYgKGNsb25lLl9faXNSZWdFeHAocGFyZW50KSkge1xuICAgICAgY2hpbGQgPSBuZXcgUmVnRXhwKHBhcmVudC5zb3VyY2UsIF9fZ2V0UmVnRXhwRmxhZ3MocGFyZW50KSk7XG4gICAgICBpZiAocGFyZW50Lmxhc3RJbmRleCkgY2hpbGQubGFzdEluZGV4ID0gcGFyZW50Lmxhc3RJbmRleDtcbiAgICB9IGVsc2UgaWYgKGNsb25lLl9faXNEYXRlKHBhcmVudCkpIHtcbiAgICAgIGNoaWxkID0gbmV3IERhdGUocGFyZW50LmdldFRpbWUoKSk7XG4gICAgfSBlbHNlIGlmICh1c2VCdWZmZXIgJiYgQnVmZmVyLmlzQnVmZmVyKHBhcmVudCkpIHtcbiAgICAgIGNoaWxkID0gbmV3IEJ1ZmZlcihwYXJlbnQubGVuZ3RoKTtcbiAgICAgIHBhcmVudC5jb3B5KGNoaWxkKTtcbiAgICAgIHJldHVybiBjaGlsZDtcbiAgICB9IGVsc2UgaWYgKF9pbnN0YW5jZW9mKHBhcmVudCwgRXJyb3IpKSB7XG4gICAgICBjaGlsZCA9IE9iamVjdC5jcmVhdGUocGFyZW50KTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKHR5cGVvZiBwcm90b3R5cGUgPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgcHJvdG8gPSBPYmplY3QuZ2V0UHJvdG90eXBlT2YocGFyZW50KTtcbiAgICAgICAgY2hpbGQgPSBPYmplY3QuY3JlYXRlKHByb3RvKTtcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICBjaGlsZCA9IE9iamVjdC5jcmVhdGUocHJvdG90eXBlKTtcbiAgICAgICAgcHJvdG8gPSBwcm90b3R5cGU7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGNpcmN1bGFyKSB7XG4gICAgICB2YXIgaW5kZXggPSBhbGxQYXJlbnRzLmluZGV4T2YocGFyZW50KTtcblxuICAgICAgaWYgKGluZGV4ICE9IC0xKSB7XG4gICAgICAgIHJldHVybiBhbGxDaGlsZHJlbltpbmRleF07XG4gICAgICB9XG4gICAgICBhbGxQYXJlbnRzLnB1c2gocGFyZW50KTtcbiAgICAgIGFsbENoaWxkcmVuLnB1c2goY2hpbGQpO1xuICAgIH1cblxuICAgIGlmIChfaW5zdGFuY2VvZihwYXJlbnQsIG5hdGl2ZU1hcCkpIHtcbiAgICAgIHBhcmVudC5mb3JFYWNoKGZ1bmN0aW9uKHZhbHVlLCBrZXkpIHtcbiAgICAgICAgdmFyIGtleUNoaWxkID0gX2Nsb25lKGtleSwgZGVwdGggLSAxKTtcbiAgICAgICAgdmFyIHZhbHVlQ2hpbGQgPSBfY2xvbmUodmFsdWUsIGRlcHRoIC0gMSk7XG4gICAgICAgIGNoaWxkLnNldChrZXlDaGlsZCwgdmFsdWVDaGlsZCk7XG4gICAgICB9KTtcbiAgICB9XG4gICAgaWYgKF9pbnN0YW5jZW9mKHBhcmVudCwgbmF0aXZlU2V0KSkge1xuICAgICAgcGFyZW50LmZvckVhY2goZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgdmFyIGVudHJ5Q2hpbGQgPSBfY2xvbmUodmFsdWUsIGRlcHRoIC0gMSk7XG4gICAgICAgIGNoaWxkLmFkZChlbnRyeUNoaWxkKTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGZvciAodmFyIGkgaW4gcGFyZW50KSB7XG4gICAgICB2YXIgYXR0cnM7XG4gICAgICBpZiAocHJvdG8pIHtcbiAgICAgICAgYXR0cnMgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHByb3RvLCBpKTtcbiAgICAgIH1cblxuICAgICAgaWYgKGF0dHJzICYmIGF0dHJzLnNldCA9PSBudWxsKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgY2hpbGRbaV0gPSBfY2xvbmUocGFyZW50W2ldLCBkZXB0aCAtIDEpO1xuICAgIH1cblxuICAgIGlmIChPYmplY3QuZ2V0T3duUHJvcGVydHlTeW1ib2xzKSB7XG4gICAgICB2YXIgc3ltYm9scyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eVN5bWJvbHMocGFyZW50KTtcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc3ltYm9scy5sZW5ndGg7IGkrKykge1xuICAgICAgICAvLyBEb24ndCBuZWVkIHRvIHdvcnJ5IGFib3V0IGNsb25pbmcgYSBzeW1ib2wgYmVjYXVzZSBpdCBpcyBhIHByaW1pdGl2ZSxcbiAgICAgICAgLy8gbGlrZSBhIG51bWJlciBvciBzdHJpbmcuXG4gICAgICAgIHZhciBzeW1ib2wgPSBzeW1ib2xzW2ldO1xuICAgICAgICB2YXIgZGVzY3JpcHRvciA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IocGFyZW50LCBzeW1ib2wpO1xuICAgICAgICBpZiAoZGVzY3JpcHRvciAmJiAhZGVzY3JpcHRvci5lbnVtZXJhYmxlICYmICFpbmNsdWRlTm9uRW51bWVyYWJsZSkge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIGNoaWxkW3N5bWJvbF0gPSBfY2xvbmUocGFyZW50W3N5bWJvbF0sIGRlcHRoIC0gMSk7XG4gICAgICAgIGlmICghZGVzY3JpcHRvci5lbnVtZXJhYmxlKSB7XG4gICAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KGNoaWxkLCBzeW1ib2wsIHtcbiAgICAgICAgICAgIGVudW1lcmFibGU6IGZhbHNlXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoaW5jbHVkZU5vbkVudW1lcmFibGUpIHtcbiAgICAgIHZhciBhbGxQcm9wZXJ0eU5hbWVzID0gT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMocGFyZW50KTtcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYWxsUHJvcGVydHlOYW1lcy5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgcHJvcGVydHlOYW1lID0gYWxsUHJvcGVydHlOYW1lc1tpXTtcbiAgICAgICAgdmFyIGRlc2NyaXB0b3IgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHBhcmVudCwgcHJvcGVydHlOYW1lKTtcbiAgICAgICAgaWYgKGRlc2NyaXB0b3IgJiYgZGVzY3JpcHRvci5lbnVtZXJhYmxlKSB7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgY2hpbGRbcHJvcGVydHlOYW1lXSA9IF9jbG9uZShwYXJlbnRbcHJvcGVydHlOYW1lXSwgZGVwdGggLSAxKTtcbiAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KGNoaWxkLCBwcm9wZXJ0eU5hbWUsIHtcbiAgICAgICAgICBlbnVtZXJhYmxlOiBmYWxzZVxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gY2hpbGQ7XG4gIH1cblxuICByZXR1cm4gX2Nsb25lKHBhcmVudCwgZGVwdGgpO1xufVxuXG4vKipcbiAqIFNpbXBsZSBmbGF0IGNsb25lIHVzaW5nIHByb3RvdHlwZSwgYWNjZXB0cyBvbmx5IG9iamVjdHMsIHVzZWZ1bGwgZm9yIHByb3BlcnR5XG4gKiBvdmVycmlkZSBvbiBGTEFUIGNvbmZpZ3VyYXRpb24gb2JqZWN0IChubyBuZXN0ZWQgcHJvcHMpLlxuICpcbiAqIFVTRSBXSVRIIENBVVRJT04hIFRoaXMgbWF5IG5vdCBiZWhhdmUgYXMgeW91IHdpc2ggaWYgeW91IGRvIG5vdCBrbm93IGhvdyB0aGlzXG4gKiB3b3Jrcy5cbiAqL1xuY2xvbmUuY2xvbmVQcm90b3R5cGUgPSBmdW5jdGlvbiBjbG9uZVByb3RvdHlwZShwYXJlbnQpIHtcbiAgaWYgKHBhcmVudCA9PT0gbnVsbClcbiAgICByZXR1cm4gbnVsbDtcblxuICB2YXIgYyA9IGZ1bmN0aW9uICgpIHt9O1xuICBjLnByb3RvdHlwZSA9IHBhcmVudDtcbiAgcmV0dXJuIG5ldyBjKCk7XG59O1xuXG4vLyBwcml2YXRlIHV0aWxpdHkgZnVuY3Rpb25zXG5cbmZ1bmN0aW9uIF9fb2JqVG9TdHIobykge1xuICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG8pO1xufVxuY2xvbmUuX19vYmpUb1N0ciA9IF9fb2JqVG9TdHI7XG5cbmZ1bmN0aW9uIF9faXNEYXRlKG8pIHtcbiAgcmV0dXJuIHR5cGVvZiBvID09PSAnb2JqZWN0JyAmJiBfX29ialRvU3RyKG8pID09PSAnW29iamVjdCBEYXRlXSc7XG59XG5jbG9uZS5fX2lzRGF0ZSA9IF9faXNEYXRlO1xuXG5mdW5jdGlvbiBfX2lzQXJyYXkobykge1xuICByZXR1cm4gdHlwZW9mIG8gPT09ICdvYmplY3QnICYmIF9fb2JqVG9TdHIobykgPT09ICdbb2JqZWN0IEFycmF5XSc7XG59XG5jbG9uZS5fX2lzQXJyYXkgPSBfX2lzQXJyYXk7XG5cbmZ1bmN0aW9uIF9faXNSZWdFeHAobykge1xuICByZXR1cm4gdHlwZW9mIG8gPT09ICdvYmplY3QnICYmIF9fb2JqVG9TdHIobykgPT09ICdbb2JqZWN0IFJlZ0V4cF0nO1xufVxuY2xvbmUuX19pc1JlZ0V4cCA9IF9faXNSZWdFeHA7XG5cbmZ1bmN0aW9uIF9fZ2V0UmVnRXhwRmxhZ3MocmUpIHtcbiAgdmFyIGZsYWdzID0gJyc7XG4gIGlmIChyZS5nbG9iYWwpIGZsYWdzICs9ICdnJztcbiAgaWYgKHJlLmlnbm9yZUNhc2UpIGZsYWdzICs9ICdpJztcbiAgaWYgKHJlLm11bHRpbGluZSkgZmxhZ3MgKz0gJ20nO1xuICByZXR1cm4gZmxhZ3M7XG59XG5jbG9uZS5fX2dldFJlZ0V4cEZsYWdzID0gX19nZXRSZWdFeHBGbGFncztcblxucmV0dXJuIGNsb25lO1xufSkoKTtcblxuaWYgKHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnICYmIG1vZHVsZS5leHBvcnRzKSB7XG4gIG1vZHVsZS5leHBvcnRzID0gY2xvbmU7XG59XG4iLCJleHBvcnRzLnJlYWQgPSBmdW5jdGlvbiAoYnVmZmVyLCBvZmZzZXQsIGlzTEUsIG1MZW4sIG5CeXRlcykge1xuICB2YXIgZSwgbVxuICB2YXIgZUxlbiA9IG5CeXRlcyAqIDggLSBtTGVuIC0gMVxuICB2YXIgZU1heCA9ICgxIDw8IGVMZW4pIC0gMVxuICB2YXIgZUJpYXMgPSBlTWF4ID4+IDFcbiAgdmFyIG5CaXRzID0gLTdcbiAgdmFyIGkgPSBpc0xFID8gKG5CeXRlcyAtIDEpIDogMFxuICB2YXIgZCA9IGlzTEUgPyAtMSA6IDFcbiAgdmFyIHMgPSBidWZmZXJbb2Zmc2V0ICsgaV1cblxuICBpICs9IGRcblxuICBlID0gcyAmICgoMSA8PCAoLW5CaXRzKSkgLSAxKVxuICBzID4+PSAoLW5CaXRzKVxuICBuQml0cyArPSBlTGVuXG4gIGZvciAoOyBuQml0cyA+IDA7IGUgPSBlICogMjU2ICsgYnVmZmVyW29mZnNldCArIGldLCBpICs9IGQsIG5CaXRzIC09IDgpIHt9XG5cbiAgbSA9IGUgJiAoKDEgPDwgKC1uQml0cykpIC0gMSlcbiAgZSA+Pj0gKC1uQml0cylcbiAgbkJpdHMgKz0gbUxlblxuICBmb3IgKDsgbkJpdHMgPiAwOyBtID0gbSAqIDI1NiArIGJ1ZmZlcltvZmZzZXQgKyBpXSwgaSArPSBkLCBuQml0cyAtPSA4KSB7fVxuXG4gIGlmIChlID09PSAwKSB7XG4gICAgZSA9IDEgLSBlQmlhc1xuICB9IGVsc2UgaWYgKGUgPT09IGVNYXgpIHtcbiAgICByZXR1cm4gbSA/IE5hTiA6ICgocyA/IC0xIDogMSkgKiBJbmZpbml0eSlcbiAgfSBlbHNlIHtcbiAgICBtID0gbSArIE1hdGgucG93KDIsIG1MZW4pXG4gICAgZSA9IGUgLSBlQmlhc1xuICB9XG4gIHJldHVybiAocyA/IC0xIDogMSkgKiBtICogTWF0aC5wb3coMiwgZSAtIG1MZW4pXG59XG5cbmV4cG9ydHMud3JpdGUgPSBmdW5jdGlvbiAoYnVmZmVyLCB2YWx1ZSwgb2Zmc2V0LCBpc0xFLCBtTGVuLCBuQnl0ZXMpIHtcbiAgdmFyIGUsIG0sIGNcbiAgdmFyIGVMZW4gPSBuQnl0ZXMgKiA4IC0gbUxlbiAtIDFcbiAgdmFyIGVNYXggPSAoMSA8PCBlTGVuKSAtIDFcbiAgdmFyIGVCaWFzID0gZU1heCA+PiAxXG4gIHZhciBydCA9IChtTGVuID09PSAyMyA/IE1hdGgucG93KDIsIC0yNCkgLSBNYXRoLnBvdygyLCAtNzcpIDogMClcbiAgdmFyIGkgPSBpc0xFID8gMCA6IChuQnl0ZXMgLSAxKVxuICB2YXIgZCA9IGlzTEUgPyAxIDogLTFcbiAgdmFyIHMgPSB2YWx1ZSA8IDAgfHwgKHZhbHVlID09PSAwICYmIDEgLyB2YWx1ZSA8IDApID8gMSA6IDBcblxuICB2YWx1ZSA9IE1hdGguYWJzKHZhbHVlKVxuXG4gIGlmIChpc05hTih2YWx1ZSkgfHwgdmFsdWUgPT09IEluZmluaXR5KSB7XG4gICAgbSA9IGlzTmFOKHZhbHVlKSA/IDEgOiAwXG4gICAgZSA9IGVNYXhcbiAgfSBlbHNlIHtcbiAgICBlID0gTWF0aC5mbG9vcihNYXRoLmxvZyh2YWx1ZSkgLyBNYXRoLkxOMilcbiAgICBpZiAodmFsdWUgKiAoYyA9IE1hdGgucG93KDIsIC1lKSkgPCAxKSB7XG4gICAgICBlLS1cbiAgICAgIGMgKj0gMlxuICAgIH1cbiAgICBpZiAoZSArIGVCaWFzID49IDEpIHtcbiAgICAgIHZhbHVlICs9IHJ0IC8gY1xuICAgIH0gZWxzZSB7XG4gICAgICB2YWx1ZSArPSBydCAqIE1hdGgucG93KDIsIDEgLSBlQmlhcylcbiAgICB9XG4gICAgaWYgKHZhbHVlICogYyA+PSAyKSB7XG4gICAgICBlKytcbiAgICAgIGMgLz0gMlxuICAgIH1cblxuICAgIGlmIChlICsgZUJpYXMgPj0gZU1heCkge1xuICAgICAgbSA9IDBcbiAgICAgIGUgPSBlTWF4XG4gICAgfSBlbHNlIGlmIChlICsgZUJpYXMgPj0gMSkge1xuICAgICAgbSA9ICh2YWx1ZSAqIGMgLSAxKSAqIE1hdGgucG93KDIsIG1MZW4pXG4gICAgICBlID0gZSArIGVCaWFzXG4gICAgfSBlbHNlIHtcbiAgICAgIG0gPSB2YWx1ZSAqIE1hdGgucG93KDIsIGVCaWFzIC0gMSkgKiBNYXRoLnBvdygyLCBtTGVuKVxuICAgICAgZSA9IDBcbiAgICB9XG4gIH1cblxuICBmb3IgKDsgbUxlbiA+PSA4OyBidWZmZXJbb2Zmc2V0ICsgaV0gPSBtICYgMHhmZiwgaSArPSBkLCBtIC89IDI1NiwgbUxlbiAtPSA4KSB7fVxuXG4gIGUgPSAoZSA8PCBtTGVuKSB8IG1cbiAgZUxlbiArPSBtTGVuXG4gIGZvciAoOyBlTGVuID4gMDsgYnVmZmVyW29mZnNldCArIGldID0gZSAmIDB4ZmYsIGkgKz0gZCwgZSAvPSAyNTYsIGVMZW4gLT0gOCkge31cblxuICBidWZmZXJbb2Zmc2V0ICsgaSAtIGRdIHw9IHMgKiAxMjhcbn1cbiJdfQ==
