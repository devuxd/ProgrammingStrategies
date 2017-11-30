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
        myStrat.then(function(allStrategies) {
            $scope.allStrategies =allStrategies;
            $scope.activeLines = [];
            $scope.allVariables=[];
            let interpreter = new models.Interpreter();
            let varNames=[];

            $scope.strategyChanged = function () {
                $scope.allVariables = [];
                varNames=[];
                $scope.execObj = interpreter.init($scope.selectedStrategy.strategies[0], $scope.selectedStrategy.strategies);
                $scope.currentStrategy = $scope.execObj.currentStrategy;
                $scope.currentStatement = $scope.execObj.currentStatement;
                $scope.variables = $scope.execObj.variables;
                // for(let i=0; i<$scope.selectedStrategy.strategies.length; i++){
                //     $scope.extractVariables($scope.selectedStrategy.strategies[i]);
                // }
                $scope.extractVariables($scope.selectedStrategy.strategies[0]);
                for(let i = 0; i<varNames.length; i++){
                   $scope.allVariables.push({"name":varNames[i], "val": null});
                }

                // this is to open the modal to input strategy parameters
                $("#initialParams").modal({
                    backdrop: "static",
                    keyboard: "false",
                });
            };

            $scope.initFailure = { val: ""};

            // this is to watch any changes for setting up strategy parameters
            $scope.$watch('initFailure.val', function(newval, oldval) {
                console.log(newval);
            });

            $scope.proceedToStrategy = function() {
                angular.forEach($scope.selectedStrategy.strategies[0].parameters, function(val, key) {
                    $scope.allVariables.unshift({"name": val, "val": $scope.initFailure.val});
                });
            };


            $scope.extractVariables= function(strategy){

                for(var i= 0 ; i<strategy.statements.length; i++) {
                    if (strategy.identifier !== undefined && varNames.indexOf(strategy.identifier.replace (/'/g, "")) === -1)
                        varNames.push(strategy.identifier.replace (/'/g, ""))
                    let x = strategy.statements[i];
                    if (x.identifier !== undefined && varNames.indexOf( x.identifier.replace (/'/g, "")) === -1)
                        varNames.push( x.identifier.replace (/'/g, ""));
                    if (x.statements !== undefined) {
                        $scope.extractVariables(x);
                    }
                }

            };

            $scope.reset= function () {
                if($scope.selectedStrategy) {
                    $scope.allVariables.splice(1);
                    varNames=[];
                    $scope.execObj = interpreter.init($scope.selectedStrategy.strategies[0], $scope.selectedStrategy.strategies);
                    $scope.currentStrategy = $scope.execObj.currentStrategy;
                    $scope.currentStatement = $scope.execObj.currentStatement;
                    $scope.variables = $scope.execObj.variables;
                    // for(let i=0; i<$scope.selectedStrategy.strategies.length; i++){
                    //     $scope.extractVariables($scope.selectedStrategy.strategies[i]);
                    // }
                    $scope.extractVariables($scope.selectedStrategy.strategies[0]);
                    for(let i = 0; i<varNames.length; i++){
                        $scope.allVariables.push({"name":varNames[i], "val": null});
                    }
                } else {
                    alert("please choose a strategy first");
                }

            };

            $scope.nextStatement = function () {
                $scope.execObj = interpreter.execute();
                if ($scope.execObj === null) return;
                $scope.variables = $scope.execObj.variables;
                if ($scope.currentStrategy.name !== $scope.execObj.currentStrategy.name) {
                    $('#' + $scope.execObj.currentStrategy.name).collapse('show');
                    $('#' + $scope.currentStrategy.name).collapse('hide');
                    $scope.currentStrategy = $scope.execObj.currentStrategy;
                    $scope.allVariables.splice(1);
                    varNames=[];
                    $scope.extractVariables($scope.currentStrategy);
                    for(let i = 0; i<varNames.length; i++){
                        $scope.allVariables.push({"name":varNames[i], "val": null});
                    }
                    if($scope.strategy !== undefined)
                        $scope.statements = $scope.strategy.statements;
                    //$('#' +$scope.strategy.name).collapse('show');
                }
            };

            $scope.prevStatement = function () {
                $scope.execObj = interpreter.goBack();
                if ($scope.execObj === null) return;
                $scope.variables = $scope.execObj.variables;
                if ($scope.currentStrategy.name !== $scope.execObj.currentStrategy.name) {
                    $('#' + $scope.execObj.currentStrategy.name).collapse('show');
                    $('#' + $scope.currentStrategy.name).collapse('hide');
                    $scope.currentStrategy = $scope.execObj.currentStrategy;
                    $scope.statements = $scope.currentStrategy.statements;
                    $scope.allVariables.splice(1);
                    varNames=[];
                    $scope.extractVariables($scope.currentStrategy);
                    for(let i = 0; i<varNames.length; i++){
                        $scope.allVariables.push({"name":varNames[i], "val": null});
                    }
                }
                $scope.currentStatement = $scope.execObj.currentStatement;
                $scope.activeLines = $scope.execObj.activeLines;
                $scope.currentStrategy = $scope.execObj.currentStrategy;
            };

            $scope.outerStatement = function () {
                $scope.execObj = interpreter.refreshStatement(false);

            };
            $scope.innerStatement = function () {
                $scope.execObj = interpreter.refreshStatement(true);
            };

            // $scope.chooseNextStatement = function ($event) {
            //     let chosenStatement = "";
            //     if ($scope.activeLines.length > 1)
            //     {
            //     let currentTarget = $event.currentTarget.innerHTML;
            //     for (var x=0; x<$scope.activeLines.length; x++) {
            //         var line = $scope.activeLines[x];
            //         if (currentTarget.includes(line))
            //             chosenStatement = line;
            //     }
            //     execObj = interpreter.execute(chosenStatement);
            //     if (execObj === null) return;
            //     $scope.currentStrategy = execObj.currentStrategy;
            //     $scope.currentStatement = execObj.currentStatement;
            //     $scope.activeLines = execObj.activeLines;
            //     }
            // };
        });

    });

}
// for(var i =0;i<dbstrategies.length; i++){
//     var key = firebase.database().ref().child('strategies').push(dbstrategies[i]);
// }
// $q is a default service by angular to handle Asynchronous in order not to block threads