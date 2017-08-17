angular.module('app', []);
angular.module('app').controller('MainCtrl', function ($scope) {
    $scope.statements = [{
        lineNum: 1,
        text: "Strategy modelFaultLocalization(code, failure, system){",
        successor: [2],
        description: "Model fault localization takes code, a failure that the code generates, and a system with which the code interacts. " +
        "After finding referenceCode, the strategy tests if failure is still witnessed this different (and assumed correct) code. " +
        "If it is, then a cause of the failure lies in the configuration. " +
        "If not, the fault can then be localized by systematically comparing referenceCode to code.",
        htmlId: 'statement1',
        class: 'active',
        variables: ['code', 'failure', 'system'],
        state: 1
    }, {
        lineNum: 2,
        text: "referenceCode = findReferenceCode(system);",
        successor: [3],
        description: "Find some reference code that interacts with the system that you know must be correct code.This code might be given by the system authors in an official tutorial or might be code found from a third party.",
        htmlId: 'statement2',
        class: "margin-1",
        variables: ['system'],
        state: 1
    }, {
        lineNum: 3,
        text: "execute(referenceCode, system)",
        successor: [4,25],
        description: "Try to execute the code you have found from Github or Stackoverflow and check if it fixes the failure ",
        htmlId: 'statement3',
        class: "margin-1",
        variables: ['referenceCode', 'system'],
        state: 1
    }, {
        lineNum: 4,
        text: "if (execute(referenceCode, system) throws failure){",
        successor: [5],
        description: "If executing the referenceCode causes Failure, click the if statement. Otherwise click the else statement ",
        htmlId: 'statement3',
        class: "margin-1",
        variables: ['referenceCode', 'system'],
        state: 1
    }, {
        lineNum: 5,
        text: " configurationDebugging(code, failure, system){",
        successor: [6],
        description: "Continue with strategy configurationDebugging by clicking next button ",
        htmlId: "statement4",
        class: "margin-2",
        variables: ['code', 'failure', 'system'],
        state: 1

    },{
        lineNum: 6,
        text: "Strategy configurationDebugging(code, failure, system){",
        successor: [7],
        description: 'Systematically enumerate and indivdually vary all possible configuration parameters to find a correct configuration.',
        htmlId: "",
        class: "",
        variables: ['code'],
        state: 2
    },{
        lineNum: 7,
        text: "configurationParameters = enumerateConfigParameters(code);",
        successor: [8],
        description: 'Use strategy enumerateConfigParameters to collect configurationParameters ',
        htmlId: "",
        class: "margin-1",
        variables: ['code'],
        state: 2
    }, {
        lineNum: 8,
        text: "enumerateConfigParameters(system);",
        successor: [9],
        description: "Continue with strategy enumerateConfigParameters by clicking next button",
        htmlId: '',
        class: "margin-1",
        state: 2
    },{
        lineNum: 9,
        text: "Strategy enumerateConfigParameters(system){",
        successor: [10],
        description: 'Brainstorm a list of all configuration parameters you might be able to vary.' +
        'A configuration paramater here refers to some aspect of how the code is being executed that might be changed.' +
        'This does NOT refer to changes to the code itself. Rather, it refers to changes to everything else that influences HOW the code is executed.' +
        'This might include the development environment that runs the code, the version of the system that is being used, the operating system on which the code is being executed, the runtime engine being used to execute the code, ' +
        'the configuration files that are being used to initialize the system.',
        htmlId: '',
        class: "",
        state: 3
    },{
        lineNum: 10,
        text: "configurationParameters = {};",
        successor: [11],
        description: "Make an empty list of parameters",
        htmlId: '',
        class: "margin-1",
        state: 3
    }, {
        lineNum: 11,
        text: "while (moreIdeas)",
        successor: [12],
        description: "",
        htmlId: '',
        class: "margin-1",
        state: 3
    }, {
        lineNum: 12,
        text: "configuratinoParameters.add(brainstormConfigParameters());",
        successor: [13],
        description: "Add as much parameters as you can add including:" +
        "the development environment that runs the code," +
        "the version of the system that is being used," +
        "the operating system on which the code is being executed, " +
        "the runtime engine being used to execute the code, " +
        "the configuration files that are being used to initialize the system ",
        htmlId: '',
        class: "margin-2",
        state: 3
    }, {
        lineNum: 13,
        text: "return configurationParameters;",
        successor: [14],
        description: "go back to the strategy : configurationDebugging with the list of parameters to continue.",
        htmlId: '',
        class: "margin-1",
        state: 3
    }, {
        lineNum: 14,
        text: "for (praam in configurationParameters){",
        successor: [15],
        description: " for each parameter that you have added to the list of configurationParams",
        htmlId: '',
        class: "margin-1",
        state: 2
    }, {
        lineNum: 15,
        text: "system.changeConfigurationParameter();",
        successor: [16],
        description: " change the config params and execute the code",
        htmlId: '',
        class: "margin-2",
        state: 2
    }, {
        lineNum: 16,
        text: " execute(code, sytem) ",
        successor: [17,21],
        description: "for the changed parameters, execute the code and see if the failure get fixed or not",
        htmlId: '',
        class: "margin-2",
        state: 2
    }, {
        lineNum: 17,
        text: " if(execute(code, sytem) throws failure){",
        successor: [18],
        description: "if the changed parameters dont have any effect in fixing the failure and you still have the failure,",
        htmlId: '',
        class: "margin-2",
        state: 2
    }, {
        lineNum: 18,
        text: "system.revertConfigurationParameter();",
        successor: [19],
        description: " revert changes",
        htmlId: '',
        class: "margin-3",
        state: 2
    },{
        lineNum: 19,
        text: "continue;",
        successor: [20],
        description: "continue with next param",
        htmlId: '',
        class: "margin-3",
        state: 2
    }, {
        lineNum: 20,
        text: "} ",
        successor: [36],
        description: "",
        htmlId: '',
        class: "margin-2",
        state: 2
    }, {
        lineNum: 21,
        text: "else {",
        successor: [22],
        description: "If no failure occurred, you succeeded to fix the problem.",
        htmlId: '',
        class: "margin-2",
        state: 2
    }, {
        lineNum: 22,
        text: "return SUCCESS;",
        successor: [23],
        description: " Congrats, you fixed the failure.",
        htmlId: '',
        class: "margin-3",
        state: 2
    }, {
        lineNum: 23,
        text: "}",
        successor: [24],
        description: "",
        htmlId: '',
        class: "margin-2",
        state: 2
    }, {
        lineNum: 24,
        text: "}",
        successor: [36],
        description: "",
        htmlId: '',
        class: "margin-1",
        state: 2
    }, {
        lineNum: 25,
        text: " else {",
        successor: [26],
        description: "",
        htmlId: '',
        class: "margin-1",
        state: 1
    }, {
        lineNum: 26,
        text: "deltaDebugging(code, referenceCode, failure){",
        successor: [27],
        description: "Continue with deltaDebugging strategy by clicking next button",
        htmlId: '',
        class: "margin-2",
        state: 1
    },{
        lineNum: 27,
        text: "Strategy deltaDebugging(code, referenceCode, failure){",
        successor: [28],
        description: "Find the changes from referenceCode to code that cause failure, minimizing the cause of failure to a minimal code edit.",
        htmlId: '',
        class: "",
        state: 4
    }, {
        lineNum: 28,
        text: "referenceCode.oneEditToLookLike(code);",
        successor: [29],
        description: "",
        htmlId: '',
        class: "margin-1",
        state: 4
    }, {
        lineNum: 29,
        text: "execute(referenceCode, system)",
        successor: [30,32],
        description: "Execute the changed code to see if it fails or succeeds",
        htmlId: '',
        class: "margin-1",
        state: 4
    }, {
        lineNum: 30,
        text: "if (! (execute(referenceCode, system) throws failure))",
        successor: [31],
        description: "If the execution of new code does not throw failure",
        htmlId: '',
        class: "margin-1",
        state: 4
    }, {
        lineNum: 31,
        text: "return SUCCESS;",
        successor: [36],
        description: "Congrats! you succeed to fix the problem",
        htmlId: '',
        class: "margin-2",
        state: 4
    }, {
        lineNum: 32,
        text: "else{",
        successor: [33],
        description: "If the execution of new code throws failure ",
        htmlId: '',
        class: "margin-1",
        state: 4
    }, {
        lineNum: 33,
        text: "revert(referenceCode);",
        successor: [34],
        description: "Revert the changes you have applied",
        htmlId: '',
        class: "margin-2",
        state: 4
    }, {
        lineNum: 34,
        text: "referenceCode.oneEditToLookLike(code);",
        successor: [35],
        description: "",
        htmlId: '',
        class: "margin-2",
        state: 4
    }, {
        lineNum: 35,
        text: "}",
        successor: [36],
        description: "",
        htmlId: '',
        class: "margin-1",
        state: 4
    }, {
        lineNum: 36,
        text: "}",
        successor: [37],
        description: "",
        htmlId: '',
        class: "",
        state: 4
    }, {
        lineNum: 37,
        text: "}",
        successor: [1],
        description: "",
        htmlId: '',
        class: "margin-1",
        state: 1
    }];
    // initiate
    $scope.current = [1];
    $scope.st = 1;

    var counter = 0;
    $scope.currentItem = $scope.statements[counter];
    var history = [];
    $scope.nextStatement = function () {
        history.push($scope.current);
        $scope.current = [];

        if (counter < $scope.statements.length) {
            angular.forEach($scope.currentItem.successor, function (value, key) {
                $scope.current.push(value);
            });

            $scope.currentItem = $scope.statements[++counter];
        }
        console.log(counter);
    };


    $scope.chooseNextStatement = function ($event) {

        if ($scope.current.length > 1) {
            history.push($scope.current);
            $scope.current = [];
            counter = parseInt($event.currentTarget.id) -1 ;
            $scope.currentItem = $scope.statements[counter];
            angular.forEach($scope.currentItem.successor, function (value, key) {
                $scope.current.push(value);
            });
            $scope.currentItem = $scope.statements[++counter];
        }

    };

    $scope.prevStatement = function () {
        var recent = history.pop();
        $scope.current = recent === undefined ? [1] : recent;
        counter = recent === undefined ? 0 : counter - 1;
        $scope.currentItem = $scope.statements[counter];
    }

});
