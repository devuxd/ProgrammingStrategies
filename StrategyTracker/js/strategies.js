'use strict';

let strategies = [
    {
        owner:"Thomas LaToza",
        name:"ModelFaultLocalication",
        displayName:"Model Fault Localization",
        subStrategies: [
            {
                name: "modelFaultLocalization",
                displayName: "Model Fault Localization",
                statements: [{
                    lineNum: 0,
                    text: "Strategy modelFaultLocalization(code, failure, system) {",
                    successor: 1,
                    description: "Model fault localization takes code, a failure that the code generates, and a system with which the code interacts. " +
                    "After finding referenceCode, the strategy tests if failure is still witnessed this different (and assumed correct) code. " +
                    "If it is, then a cause of the failure lies in the configuration. " +
                    "If not, the fault can then be localized by systematically comparing referenceCode to code.",
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
            },
            {
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
            },
            {
                name: "enumerateConfigParameters",
                displayName: "Enumerate Configuration Parameters",
                statements: [{
                    lineNum: 0,
                    text: "Strategy enumerateConfigParameters(system){",
                    successor: 1,
                    description: 'Brainstorm a list of all configuration parameters you might be able to vary.' +
                    'A configuration paramater here refers to some aspect of how the code is being executed that might be changed.' +
                    'This does NOT refer to changes to the code itself. Rather, it refers to changes to everything else that influences HOW the code is executed.' +
                    'This might include the development environment that runs the code, the version of the system that is being used, the operating system on which the code is being executed, the runtime engine being used to execute the code, ' +
                    'the configuration files that are being used to initialize the system.',
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
                    description: "Add as much parameters as you can add including:" +
                    "the development environment that runs the code," +
                    "the version of the system that is being used," +
                    "the operating system on which the code is being executed, " +
                    "the runtime engine being used to execute the code, " +
                    "the configuration files that are being used to initialize the system ",
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
            },
            {
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
            }
        ]
    },




    {
        owner:"Andy Co",
        name:"localizeFailure",
        displayName:"Fault localization",
        subStrategies: [
            {
                name:"localizeFailure",
                displayName :"Fault Localization",
                statements:[
                    {
                        lineNum: 0,
                        text: "Strategy localizeFailure(failure){",
                        successor: 1,
                        description: "Reproduce the failure by finding a sequence of inputs that produces the failure reliably.",
                        class: '',
                        variables: ["failure"],
                        nextStrategy: "",
                        activeLines: [0]
                    },{
                        lineNum: 1,
                        text: "Reproduce the failure",
                        successor: 2,
                        description: "Reproduce the failure by finding a sequence of inputs that produces the failure reliably.",
                        class: "margin-1",
                        variables: ["failure"],
                        nextStrategy: "",
                        activeLines: [1]
                    },
                    {
                        lineNum: 2,
                        text: " Write down the inputs for later reference.",
                        successor: 3,
                        description: "To the extent that you can, write down the inputs for later reference.",
                        class: "margin-1",
                        variables: ["failure"],
                        nextStrategy: "",
                        activeLines: [2]
                    },
                    {
                        lineNum: 3,
                        text: "Reproduce the failure by finding a sequence of inputs that produces the failure reliably.",
                        successor: 4,
                        description: "",
                        class: "margin-1",
                        variables: ["failure"],
                        nextStrategy: "",
                        activeLines: [3]
                    },
                    {
                        lineNum:4,
                        text:"If the failure is output that shouldn’t have occurred{",
                        successor:5,
                        description:"",
                        class:"margin-1",
                        variables:["failure"],
                        nextStrategy:"",
                        activeLines:[4,6]
                    }
                    ,
                    {
                        lineNum:5,
                        text:"return localizeWrongOutput(failure)",
                        successor:9,
                        description:"",
                        class:"margin-2",
                        variables:["failure"],
                        nextStrategy:"localizeWrongOutput",
                        activeLines:[5]
                    },
                    {
                        lineNum:6,
                        text:"} else {",
                        successor:7,
                        description:" if the failure is output that should have occurred, but didn’t",
                        class:"margin-1",
                        variables:["failure"],
                        nextStrategy:"",
                        activeLines:[4,6]
                    },
                    {
                        lineNum:7,
                        text:"localizeMissingOutput",
                        successor:9,
                        description:"",
                        class:"margin-2",
                        variables:["failure"],
                        nextStrategy:"localizeMissingOutput",
                        activeLines:[7]
                    },
                    {
                        lineNum:8,
                        text:"}",
                        successor:9,
                        description:"",
                        class:"margin-1",
                        variables:["failure"],
                        nextStrategy:"localizeMissingOutput",
                        activeLines:[8]
                    },
                    {
                        lineNum:9,
                        text:"}",
                        successor:10,
                        description:"",
                        class:"",
                        variables:["failure"],
                        nextStrategy:"localizeMissingOutput",
                        activeLines:[9]
                    }
                    , {
                        lineNum: 10,
                        text: "",
                        successor: "undefined",
                        description: "",
                        class: "",
                        nextStrategy: "",
                        activeLines: [10]
                    }
                ]
            },
            {
                name:"localizeWrongOutput",
                displayName :"Localize Wrong Output",
                statements:[
                    {
                        lineNum:0,
                        text:"Strategy localizeWrongOutput(failure){ ",
                        successor:1,
                        description:"",
                        class:"",
                        variables:["failure"],
                        nextStrategy:"",
                        activeLines:[0]
                    },
                    {
                        lineNum:1,
                        text:"Find the line of code L that produced the incorrect output",
                        successor:2,
                        description:" Find the line of code L in the application that most directly produced the incorrect output. For example, if it was console output, it’s a print statement; if it’s user interface output, it’s whatever component was responsible for rendering the output. If you don’t know how to find this line, one strategy is to find a unique feature in the output such as a string constant and do a global search in the code for that string.",
                        class:"margin-1",
                        variables:["failure"],
                        nextStrategy:"",
                        activeLines:[1]
                    },
                    {
                        lineNum:2,
                        text:"Execute the program to line L",
                        successor:3,
                        description:"Execute the program to line L (using a breakpoint or a time-travel debugger).",
                        class:"margin-1",
                        variables:["failure"],
                        nextStrategy:"",
                        activeLines:[2]
                    },
                    {
                        lineNum:3,
                        text:"Reproduce failure. ",
                        successor:4,
                        description:"",
                        class:"margin-1",
                        variables:["failure"],
                        nextStrategy:"",
                        activeLines:[3]
                    },
                    {
                        lineNum:4,
                        text:" If the program does not execute L{",
                        successor:5,
                        description:"",
                        class:"margin-1",
                        variables:["failure"],
                        nextStrategy:"",
                        activeLines:[4,6]
                    },
                    {
                        lineNum:5,
                        text:"return to step 1 and find an alternate L that does produce the failure",
                        successor:0,
                        description:"",
                        class:"margin-2",
                        variables:["failure"],
                        nextStrategy:"",
                        activeLines:[5]
                    },
                    {
                        lineNum:6,
                        text:"} else If there is no such L",
                        successor:7,
                        description:"",
                        class:"margin-1",
                        variables:["failure"],
                        nextStrategy:"",
                        activeLines:[4,6]
                    },
                    {
                        lineNum:7,
                        text:"then something else is creating the problem.",
                        successor:8,
                        description:"",
                        class:"margin-2",
                        variables:["failure"],
                        nextStrategy:"",
                        activeLines:[7]
                    },{
                        lineNum:8,
                        text:"}",
                        successor:9,
                        description:"",
                        class:"margin-1",
                        variables:["failure"],
                        nextStrategy:"",
                        activeLines:[8]
                    },
                    {
                        lineNum:9,
                        text:"Values= Inspect the state of all values that resulted in L being reached",
                        successor:10,
                        description:"With the program halted on L, inspect the state of all values in memory and all values V of local variables in the call stack that resulted in L being reached. " +
                        "This includes all variables that were referenced in conditional statements that resulted in L being executed.",
                        class:"margin-1",
                        variables:["failure"],
                        nextStrategy:"",
                        activeLines:[9]
                    },
                    {
                        lineNum:10,
                        text:"For each of these values V{",
                        successor:11,
                        description:"",
                        class:"margin-1",
                        variables:["failure"],
                        nextStrategy:"",
                        activeLines:[10]
                    },{
                        lineNum:11,
                        text:"If V correct in this context{",
                        successor:12,
                        description:"",
                        class:"margin-2",
                        variables:["failure"],
                        nextStrategy:"",
                        activeLines:[11,13,16]
                    },
                    {
                        lineNum:12,
                        text:"move on to the next V",
                        successor:11,
                        description:"",
                        class:"margin-3",
                        variables:["failure"],
                        nextStrategy:"",
                        activeLines:12
                    },{
                        lineNum:13,
                        text:"} else {",
                        successor:14,
                        description:"",
                        class:"margin-2",
                        variables:["failure"],
                        nextStrategy:"",
                        activeLines:[11,13,16]
                    },
                    {
                        lineNum:14,
                        text:"return localizeWrongValue",
                        successor:19,
                        description:"",
                        class:"margin-3",
                        variables:["failure"],
                        nextStrategy:"localizeWrongValue",
                        activeLines:[14]
                    },
                    {
                        lineNum:15,
                        text:"}",
                        successor:16,
                        description:"",
                        class:"margin-2",
                        variables:["failure"],
                        nextStrategy:"",
                        activeLines:[15]
                    },{
                        lineNum:16,
                        text:"If none of V is wrong {",
                        successor:17,
                        description:"If none of the values were wrong, then one of the inputs to the program was not handled correctly. Identify which input was unexpected and devise a way to handle it correctly.",
                        class:"margin-2",
                        variables:["failure"],
                        nextStrategy:"",
                        activeLines:[11,13,16]
                    },
                    {
                        lineNum:17,
                        text:"One of the inputs was not handled correctly",
                        successor:18,
                        description:"",
                        class:"margin-3",
                        variables:["failure"],
                        nextStrategy:"",
                        activeLines:[17]
                    },{
                        lineNum:18,
                        text:"}",
                        successor:19,
                        description:"",
                        class:"margin-2",
                        variables:["failure"],
                        nextStrategy:"",
                        activeLines:[18]
                    },{
                        lineNum:19,
                        text:"}",
                        successor:20,
                        description:"",
                        class:"margin-1",
                        variables:["failure"],
                        nextStrategy:"",
                        activeLines:[19]
                    }, {
                        lineNum: 20,
                        text: "",
                        successor: "undefined",
                        description: "",
                        class: "",
                        nextStrategy: "",
                        activeLines: [20]
                    }
                ]
            },

            {
                name:"localizeWrongValue",
                displayName :"Localize Wrong Value",
                statements:[
                    {
                        lineNum:0,
                        text:"Strategy localizeWrongValue(failure,value){ ",
                        successor:1,
                        description:"The goal of this strategy is to find where value was computed.",
                        class:"",
                        variables:["failure", "value"],
                        nextStrategy:"",
                        activeLines:[0]
                    },
                    {
                        lineNum:1,
                        text:"Find all lines L in the program that can set value",
                        successor:2,
                        description:"",
                        class:"margin-1",
                        variables:["failure", "value"],
                        nextStrategy:"",
                        activeLines:[1]
                    },
                    {
                        lineNum:2,
                        text:"LastLineFailure : find last execution of a line L that occurred before failure",
                        successor:3,
                        description:"Reproduce failure, finding last execution of a line L that occurred before failure (using breakpoints or a time-travel debugger). If your debugger supports reverse execution, this is a matter of stepping backwards. If not, you may have to reproduce failure more than once to find the last execution.",
                        class:"margin-1",
                        variables:["failure", "value"],
                        nextStrategy:"",
                        activeLines:[2]
                    },
                    {
                        lineNum:3,
                        text:"if(LastLineFailure :incorrect){ ",
                        successor:4,
                        description:"Reflect on the intended behavior of the line and whether, as implemented, it achieves this behavior. If it’s incorrect",
                        class:"margin-1",
                        variables:["failure", "value"],
                        nextStrategy:"",
                        activeLines:[3,6]
                    },
                    {
                        lineNum:4,
                        text:"you have found the bug!",
                        successor:5,
                        description:"",
                        class:"margin-1",
                        variables:["failure", "value"],
                        nextStrategy:"",
                        activeLines:[4]
                    },
                    {
                        lineNum:5,
                        text:"return L",
                        successor:0,
                        description:"",
                        class:"margin-2",
                        variables:["failure", "value"],
                        nextStrategy:"",
                        activeLines:[5]
                    },
                    {
                        lineNum:6,
                        text:"} else If(the Line is correct){",
                        successor:7,
                        description:"If the line is correct{",
                        class:"margin-1",
                        variables:["failure", "value"],
                        nextStrategy:"",
                        activeLines:[3,6]
                    },
                    {
                        lineNum:7,
                        text:"if( another value (value2) incorrect){",
                        successor:8,
                        description:"If the line is correct, is a value value2 used by the last L to execute incorrect? If so, return localizeWrongValue(failure, value2).",
                        class:"margin-2",
                        variables:["failure", "value"],
                        nextStrategy:"",
                        activeLines:[7]
                    },{
                        lineNum:8,
                        text:"return localizeWrongValue(failure, value2)",
                        successor:0,
                        description:"",
                        class:"margin-3",
                        variables:["failure", "value"],
                        nextStrategy:"",
                        activeLines:[8]
                    },
                    {
                        lineNum:9,
                        text:"}",
                        successor:10,
                        description:"",
                        class:"margin-2",
                        variables:["failure", "value"],
                        nextStrategy:"",
                        activeLines:[9]
                    },
                    {
                        lineNum:10,
                        text:"}",
                        successor:11,
                        description:"",
                        class:"margin-1",
                        variables:["failure", "value"],
                        nextStrategy:"",
                        activeLines:[10]
                    },{
                        lineNum:11,
                        text:"Failed to find defect!",
                        successor:12,
                        description:"",
                        class:"margin-1",
                        variables:["failure", "value"],
                        nextStrategy:"",
                        activeLines:[11,13,16]
                    },
                    {
                        lineNum:12,
                        text:"}",
                        successor:11,
                        description:"",
                        class:"",
                        variables:["failure", "value"],
                        nextStrategy:"",
                        activeLines:12
                    },{
                        lineNum: 13,
                        text: "",
                        successor: "undefined",
                        description: "",
                        class: "",
                        nextStrategy: "",
                        activeLines: [13]
                    }
                ]
            },
            {
                name:"localizeMissingOutput",
                displayName :"Localize Missing Output",
                statements:[
                    {
                        lineNum:0,
                        text:"Strategy localizeMissingOutput(failure){ ",
                        successor:1,
                        description:"",
                        class:"",
                        variables:["failure"],
                        nextStrategy:"",
                        activeLines:[0]
                    },{
                        lineNum: 1,
                        text: "Find the line of code L that would have produced the output you expected.",
                        successor: 2,
                        description: "",
                        class: "margin-1",
                        variables: ["failure"],
                        nextStrategy: "",
                        activeLines: [1]
                    },
                    {
                        lineNum: 2,
                        text: " Do diagnoseUnexecutedLine(failure, L)",
                        successor: 3,
                        description: "To the extent that you can, write down the inputs for later reference.",
                        class: "margin-1",
                        variables: ["failure"],
                        nextStrategy: "diagnoseUnexecutedLine",
                        activeLines: [2]
                    }
                    , {
                        lineNum: 3,
                        text: "",
                        successor: "undefined",
                        description: "",
                        class: "",
                        nextStrategy: "",
                        activeLines: [3]
                    }
                ]
            },
            {
                name:"diagnoseUnexecutedLine",
                displayName :"Diagnose Unexecuted Line",
                statements:[
                    {
                        lineNum:0,
                        text:"Strategy diagnoseUnexecutedLine(failure,L){ ",
                        successor:1,
                        description:"",
                        class:"",
                        variables:["failure", "value"],
                        nextStrategy:"",
                        activeLines:[0]
                    },
                    {
                        lineNum:1,
                        text:"conditions : Find all conditional statements conditions that would have caused line to execute",
                        successor:2,
                        description:"These may be an if-statements, switch-statements, or other conditional statements that would have prevented the line from executing.",
                        class:"margin-1",
                        variables:["failure", "value"],
                        nextStrategy:"",
                        activeLines:[1]
                    },
                    {
                        lineNum:2,
                        text:"For each (line L in conditions){",
                        successor:3,
                        description:"",
                        class:"margin-1",
                        variables:["failure", "value"],
                        nextStrategy:"",
                        activeLines:[2]
                    },
                    {
                        lineNum:3,
                        text:"1.Set a breakpoint on line ",
                        successor:4,
                        description:"",
                        class:"margin-2",
                        variables:["failure", "value"],
                        nextStrategy:"",
                        activeLines:[3]
                    },
                    {
                        lineNum:4,
                        text:"2.Reproduce the failure to see if L executed",
                        successor:5,
                        description:"",
                        class:"margin-2",
                        variables:["failure", "value"],
                        nextStrategy:"",
                        activeLines:[4]
                    },
                    {
                        lineNum:5,
                        text:"If (L executed correctly){",
                        successor:0,
                        description:"",
                        class:"margin-2",
                        variables:["failure", "value"],
                        nextStrategy:"",
                        activeLines:[5,7]
                    },
                    {
                        lineNum:6,
                        text:"continue;",
                        successor:7,
                        description:"move on to the next L in conditions",
                        class:"margin-3",
                        variables:["failure", "value"],
                        nextStrategy:"",
                        activeLines:[3,6]
                    },
                    {
                        lineNum:7,
                        text:"}else{",
                        successor:8,
                        description:"",
                        class:"margin-2",
                        variables:["failure", "value"],
                        nextStrategy:"",
                        activeLines:[5,7]
                    },{
                        lineNum:8,
                        text:" V : identify the value V that caused it to execute incorrectly",
                        successor:9,
                        description:"",
                        class:"margin-3",
                        variables:["failure", "value"],
                        nextStrategy:"",
                        activeLines:[8]
                    },
                    {
                        lineNum:9,
                        text:"Return localizeWrongValue(failure, V)",
                        successor:10,
                        description:"",
                        class:"margin-3",
                        variables:["failure", "value"],
                        nextStrategy:"localizeWrongValue",
                        activeLines:[9]
                    },
                    {
                        lineNum:10,
                        text:"}",
                        successor:11,
                        description:"",
                        class:"margin-1",
                        variables:["failure", "value"],
                        nextStrategy:"",
                        activeLines:[10]
                    },{
                        lineNum:11,
                        text:"}",
                        successor:12,
                        description:"",
                        class:"margin-1",
                        variables:["failure", "value"],
                        nextStrategy:"",
                        activeLines:[11]
                    },{
                        lineNum: 12,
                        text: "",
                        successor: "undefined",
                        description: "",
                        class: "",
                        nextStrategy: "",
                        activeLines: [12]
                    }
                ]
            },

        ]

    }

];

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