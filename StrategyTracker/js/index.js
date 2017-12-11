const models = require('./models.js');
const db = require('./dataManagement.js');

if (typeof window !== 'undefined' && window.angular) {
    let myapp = angular.module('myapp', []);

    myapp.run(function($rootScope) {
        ['isArray', 'isDate', 'isDefined', 'isFunction', 'isNumber', 'isObject', 'isString', 'isUndefined'].forEach(function(name) {
            $rootScope[name] = angular[name];
        });
    });

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
        let myStrat = StrategyService.getAll();
        //Asynchronous : If the records are ready from deffered.promise, then the following steps is run.
        myStrat.then(function(allStrategies) {
            $scope.allStrategies =allStrategies;
            $scope.activeLines = [];
            let interpreter = new models.Interpreter();

            $scope.strategyChanged = function () {
                $scope.execObj = interpreter.init($scope.selectedStrategy.strategies[0], $scope.selectedStrategy.strategies);
                $scope.currentStrategy = $scope.execObj.currentStrategy;
                $scope.currentStatement = $scope.execObj.currentStatement;
                $scope.variables = $scope.execObj.variables;
                $scope.parameters = $scope.variables.filter(function (val) {
                    return val.type == 'parameter';
                });
                //console.log($scope.parameters);
                // this is to open the modal to input strategy parameters
                $("#initialParams").modal({
                    backdrop: "static",
                    keyboard: "false",
                });
            };

            $scope.proceedToStrategy = function() {
                angular.forEach($scope.parameters, function(val, key) {
                    // $scope.allVariables.unshift({"id": $scope.counter++, "name": val, "val": [$scope.initFailure.val], "show": true});
                    //console.log(val);
                });
            };

            $scope.reset= function () {
                if($scope.selectedStrategy) {
                    interpreter.reset();
                    $scope.execObj = interpreter.init($scope.selectedStrategy.strategies[0], $scope.selectedStrategy.strategies);
                    $scope.currentStrategy = $scope.execObj.currentStrategy;
                    $scope.currentStatement = $scope.execObj.currentStatement;
                    $('#' + $scope.currentStrategy.name).collapse('show');
                    $scope.variables = $scope.execObj.variables;
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
        });

    });

    myapp.directive('variableValue', function ($parse, $timeout) {
        return {
            template:
            '<span ng-show="edit">' +
            '<textarea ng-show="isArray" ng-blur="updateModel()" ng-model="var"></textarea>' +
            '<input type="text" ng-show="!isArray" ng-blur="updateModel()" ng-model="model">' +
            '</span>' +
            '<div class="var-outer-border" ng-show="!edit">' +
            '<span class="showvars" ng-show="isArray && allvar.length" ng-click="changeEdit()" ng-repeat="myvar in allvar track by $index">{{myvar}}</span>' +
            '<span class="showvars" ng-show="isArray && !allvar.length" ng-click="changeEdit()">nothing</span>' +
            '<span class="showvars" ng-show="!isArray && model.length" ng-click="changeEdit()">{{model}}</span>' +
            '<span class="showvars" ng-show="!isArray && !model.length" ng-click="changeEdit()">nothing</span>' +
            '</div>',
            restrict: 'E',
            scope: {
                model: '=',
                isArray: '='
            },
            link: function(scope, element, attrs) {
                scope.edit = false;
                scope.var = '';
                if(scope.isArray) {
                    scope.allvar = scope.model;
                }
                scope.changeEdit = function () {
                    scope.edit = !scope.edit;
                    if (scope.isArray) {
                        scope.var = scope.allvar.join(',');
                        $timeout( function(){
                            element[0].firstChild.firstChild.focus();
                        }, 10);
                    } else {
                        $timeout( function(){
                            element[0].firstChild.lastChild.focus();
                        }, 10);
                    }
                };
                scope.updateModel = function () {
                    scope.edit = !scope.edit;
                    if (scope.isArray) {
                        let arr = scope.var.split(',');
                        scope.allvar = [];
                        angular.forEach(arr, function (val, key) {
                            val.trim().length ? scope.allvar.push(val.trim()) : null;
                        });
                        $parse(attrs.model).assign(scope.$parent, scope.allvar);
                    }
                };
            }
        }
    });

}