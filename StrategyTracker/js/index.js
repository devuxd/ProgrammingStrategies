const models = require('./models.js');
const db = require('./dataManagement.js');

if (typeof window !== 'undefined' && window.angular) {
    let myapp = angular.module('myapp', []);

    myapp.factory('StrategyService', function($q) {
        let strategies= [];
        let deferred = $q.defer();
        firebase.database().ref('strategies').once('value').then(function(snapshot) {
            snapshot.forEach(function(childStrategy) {
                strategies.push(childStrategy.val());
            });
            deferred.resolve(strategies);
        }).catch(function(err) {
            deferred.reject(err);
        });

        return {
            getAll: function() {
                return deferred.promise;
            },
        };
    });

    myapp.controller('MainCtrl', function ($scope, StrategyService) {
        "use strict";
        $scope.accordion = {
            current: null
        };
        let myStrat = StrategyService.getAll();
        //Asynchronous : If the records are ready from deffered.promise, then the following steps is run.
        myStrat.then(function(strategies) {
            $scope.selectedStrategy=strategies[0].strategies[0];
            $scope.allStrategies =strategies;
            $scope.strategies = strategies[0].strategies;
            $scope.currentStrategy = strategies[0].strategies[0];
            $scope.selectedStrategy=$scope.currentStrategy;
            $scope.activeLines = [];
            // $scope.strategyChanged = function () {
            //     $scope.selectedStrategy = $scope.selectedStrategy;
            //     //$scope.selectedStrategy=$scope.selectedStrategy;
            // }

            $scope.variables = $scope.currentStrategy.parameters;

            let interpreter = new models.Interpreter($scope.strategies);
            $scope.selectedStrategy  = $scope.currentStrategy;
            // initialize the application
            let execObj = interpreter.init($scope.currentStrategy.name);
            $scope.currentStrategy = execObj.currentStrategy;
            $scope.currentStatement = execObj.currentStatement;
            $scope.activeLines = execObj.activeLines;

            $scope.reset= function () {
                execObj = interpreter.reset();
                interpreter = new models.Interpreter(strategies);
                execObj = interpreter.init("localizeFailure");
                $scope.strategy = execObj.currentStrategy;
                $scope.currentStatement = execObj.currentStatement;
                $scope.statements = $scope.strategy.statements;
                angular.forEach($scope.variables, function(val, key) {
                    val.val = null;
                });
            };

            $scope.nextStatement = function () {
                execObj = interpreter.execute();
                $scope.currentStatement = execObj.currentStatement;
                $scope.activeLines = execObj.activeLines;
               // $scope.currentStrategy = execObj.currentStrategy;
                if (execObj === null) return;
                if ($scope.currentStrategy.name !== execObj.currentStrategy.name) {
                    $('#' + execObj.currentStrategy.name).collapse('show');
                    $('#' + $scope.currentStrategy.name).collapse('hide');
                    $scope.currentStrategy = execObj.currentStrategy;
                    if($scope.strategy !== undefined)
                        $scope.statements = $scope.strategy.statements;
                    //$('#' +$scope.strategy.name).collapse('show');
                }
            };

            $scope.prevStatement = function () {
                execObj = interpreter.goBack();
                if (execObj === null) return;
                if ($scope.currentStrategy.name !== execObj.currentStrategy.name) {
                    $('#' + execObj.currentStrategy.name).collapse('show');
                    $('#' + $scope.currentStrategy.name).collapse('hide');
                    $scope.currentStrategy = execObj.currentStrategy;
                    $scope.statements = $scope.currentStrategy.statements;
                }
                $scope.currentStatement = execObj.currentStatement;
                $scope.activeLines = execObj.activeLines;
                $scope.currentStrategy = execObj.currentStrategy;
            };

            $scope.chooseNextStatement = function ($event) {
                let chosenStatement = "";
                if ($scope.activeLines.length > 1)
                {
                let currentTarget = $event.currentTarget.innerHTML;
                for (var x=0; x<$scope.activeLines.length; x++) {
                    var line = $scope.activeLines[x];
                    if (currentTarget.includes(line))
                        chosenStatement = line;
                }
                execObj = interpreter.execute(chosenStatement);
                if (execObj === null) return;
                $scope.currentStrategy = execObj.currentStrategy;
                $scope.currentStatement = execObj.currentStatement;
                $scope.activeLines = execObj.activeLines;
                }
            };
        });

    });

}
// for(var i =0;i<dbstrategies.length; i++){
//     var key = firebase.database().ref().child('strategies').push(dbstrategies[i]);
// }
// $q is a default service by angular to handle Asynchronous in order not to block threads