const models = require('./models.js');
const db = require('./dataManagement.js');
var strategies = require('./strategies').strategies;


// Initialize Firebase/


if (typeof window !== 'undefined' && window.angular) {
    let myapp = angular.module('myapp', []);
    myapp.factory('StrategyService', function() {

        firebase.database().ref('strategies').once('value').then(function(snapshot) {
            snapshot.forEach(function(childStrategy) {
            });
        });
        return {
            getAll: function() {
                return strategies;
            },
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
        $scope.allVariables=[
            {name: 'code', val: null},
            {name: 'referenceCode', val: null},
            {name: 'failure', val: null},
            {name: 'system', val: null},
        ];

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

        $scope.reset= function () {
            execObj = interpreter.reset();
            interpreter = new models.Interpreter(strategies);
            execObj = interpreter.init("modelFaultLocalization");
            $scope.strategy = execObj.currentStrategy;
            $scope.currentStatement = execObj.currentStatement;
            $scope.statements = $scope.strategy.statements;
            angular.forEach($scope.allVariables, function(val, key) {
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
            if ($scope.currentStatement.activeLines.length > 1)
                 {
                // (currentTarget.includes("if") || currentTarget.includes("else") || currentTarget.includes("while") || currentTarget.includes("return"))
                let lineNum = parseInt($event.currentTarget.id);
                execObj = interpreter.execute(lineNum+1);
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
