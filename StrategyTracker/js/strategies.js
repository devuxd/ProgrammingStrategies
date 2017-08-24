'use strict';

let strategies = [
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
            variables: [{name: "code", value: ""}, {name: "failure", value: ""}, {name: "system", value: ""}],
            nextStrategy: "",
            activeLines: [0]
        }, {
            lineNum: 1,
            text: "referenceCode = findReferenceCode(system);",
            successor: 2,
            description: "Find some reference code that interacts with the system that you know must be correct code.This code might be given by the system authors in an official tutorial or might be code found from a third party.",
            class: "margin-1",
            variables: [{name: "system", value: ""}],
            nextStrategy: "",
            activeLines: [1]
        }, {
            lineNum: 2,
            text: "execute(referenceCode, system);",
            successor: 3,
            description: "Try to execute the code you have found from Github or Stackoverflow and check if it fixes the failure ",
            class: "margin-1",
            variables: [{name: 'referenceCode', value: ""}, {name: "system", value: ""}],
            nextStrategy: "",
            activeLines: [2]
        }, {
            lineNum: 3,
            text: "if (execute(referenceCode, system) throws failure) {",
            successor: 4,
            description: "If executing the referenceCode causes Failure, click the if statement. Otherwise click the else statement ",
            class: "margin-1",
            variables: [{name: 'referenceCode', value: ""}, {name: "system", value: ""}],
            nextStrategy: "",
            activeLines: [3, 5]
        }, {
            lineNum: 4,
            text: " configurationDebugging(code, failure, system); ",
            successor: 7,
            description: "Continue with strategy configurationDebugging by clicking next button ",
            class: "margin-2",
            variables: [{name: "code", value: ""}, {name: "failure", value: ""}, {name: "system", value: ""}],
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
            variables: [{name: "code", value: ""}, {name: "referenceCode", value: ""}, {name: "failure", value: ""}],
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
            successor: undefined,
            description: "",
            class: "",
            nextStrategy: "",
            activeLines: [8]
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
            variables: [{name: "code", value: ""}, {name: "failure", value: ""}, {name: "system", value: ""}],
            nextStrategy: "",
            activeLines: [0]
        }, {
            lineNum: 1,
            text: "configurationParameters = enumerateConfigParameters(code);",
            successor: 2,
            description: 'Use strategy enumerateConfigParameters to collect configurationParameters ',
            class: "margin-1",
            variables: [{name: "code", value: ""}],
            nextStrategy: "",
            activeLines: [1]
        }, {
            lineNum: 2,
            text: "enumerateConfigParameters(system);",
            successor: 3,
            description: "Continue with strategy enumerateConfigParameters by clicking next button",
            class: "margin-1",
            variables: [{name: "system", value: ""}],
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
            text: " execute(code, system); ",
            successor: 6,
            description: "for the changed parameters, execute the code and see if the failure get fixed or not",
            class: "margin-2",
            variables: [{name: "code", value: ""}, {name: "system", value: ""}],
            nextStrategy: "",
            activeLines: [5]
        }, {
            lineNum: 6,
            text: " if(execute(code, system) throws failure) {",
            successor: 7,
            description: "if the changed parameters do not have any effect in fixing the failure and you still have the failure,",
            class: "margin-2",
            variables: [{name: "code", value: ""}, {name: "system", value: ""}],
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
            activeLines: [6,9]
        }, {
            lineNum: 10,
            text: "return SUCCESS;",
            successor: undefined,
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
            successor: undefined,
            description: "",
            class: "margin-1",
            nextStrategy: "",
            activeLines: [12]
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
            activeLines: [2]
        }, {
            lineNum: 3,
            text: "configuratinoParameters.add(brainstormConfigParameters());",
            successor: 4,
            description: "Add as much parameters as you can add including:" +
            "the development environment that runs the code," +
            "the version of the system that is being used," +
            "the operating system on which the code is being executed, " +
            "the runtime engine being used to execute the code, " +
            "the configuration files that are being used to initialize the system ",
            class: "margin-2",
            nextStrategy: "",
            activeLines: [3,4]
        }, {
            lineNum: 4,
            text: "return configurationParameters;",
            successor: 5,
            description: "go back to the strategy : configurationDebugging with the list of parameters to continue.",
            class: "margin-1",
            nextStrategy: "",
            activeLines: [3,4]
        }, {
            lineNum: 5,
            text: "}",
            successor: undefined,
            description: "",
            class: "",
            nextStrategy: "",
            activeLines: [5]
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
            successor: undefined,
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
            successor: undefined,
            description: "",
            class: "",
            nextStrategy: "",
            activeLines: [9]
        }]
    }
];

module.exports.strategies = strategies;