const models = require('./models.js');
const db = require('./dataManagement.js');
//var strategies = require('./strategies').strategies;


// Initialize Firebase/


if (typeof window !== 'undefined' && window.angular) {
    let myapp = angular.module('myapp', []);
    //$q is a default service by angular to handle Asynchronous in order not to block threads
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

            // create interpreter object from model
            //console.log(strategies);
            let interpreter = new models.Interpreter(strategies);
            // initialize the application
            let execObj = interpreter.init("modelFaultLocalization");
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
                    $('#' + $scope.strategy.name).collapse('toggle');
                    $('#' + execObj.currentStrategy.name).collapse('toggle');
                    //$('#' +$scope.strategy.name).collapse('show');
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

    });

}
