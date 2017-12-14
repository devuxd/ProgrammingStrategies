const models = require('./models.js');
const db = require('./dataManagement.js');

if (typeof window !== 'undefined' && window.angular) {
    let myapp = angular.module('myapp', []);

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
            },
        };
    });

    myapp.controller('MainCtrl', function ($scope, StrategyService) {
        "use strict";
        let myStrat = StrategyService.getAll();
        $scope.setNeeded = false;
        $scope.selectionNeeded = false;
        //Asynchronous : If the records are ready from deffered.promise, then the following steps is run.
        myStrat.then(function (allStrategies) {
            $scope.allStrategies = allStrategies;
            let interpreter = new models.Interpreter();

            $scope.strategyChanged = function () {
                $scope.execObj = interpreter.init($scope.selectedStrategy.strategies[0], $scope.selectedStrategy.strategies);
                $scope.currentStrategy = $scope.execObj.currentStrategy;
                $scope.parameters = $scope.execObj.variables.filter(function (val) {
                    return val.type == 'parameter';
                });
                // open the modal to input strategy parameters
                $("#initialParams").modal({
                    backdrop: "static",
                    keyboard: "false",
                });
            };

            $scope.proceedToStrategy = function () {
                angular.forEach($scope.parameters, function (val, key) {
                    // $scope.allVariables.unshift({"id": $scope.counter++, "name": val, "val": [$scope.initFailure.val], "show": true});
                });
            };

            $scope.reset = function () {
                if ($scope.selectedStrategy) {
                    interpreter.reset();
                    $scope.execObj = interpreter.init($scope.selectedStrategy.strategies[0], $scope.selectedStrategy.strategies);
                    $scope.currentStrategy = $scope.execObj.currentStrategy;
                    $('#' + $scope.currentStrategy.name).collapse('show');
                } else {
                    alert("please choose a strategy first");
                }

            };
            function checkType() {
                if ($scope.execObj.currentStatement.type == 'set') {
                    let id = $scope.execObj.currentStatement.identifier.replace(/'/g, '');
                    let variable = $scope.execObj.variables.filter(function (val, index, arr) {
                        return val.name == id;
                    })[0];
                    if (variable.val == null || variable.val.length == 0) {
                        $scope.setNeeded = true;
                        $scope.$broadcast("EditMe", id);
                    }
                }
                if ($scope.execObj.currentStatement.type == 'foreach' || $scope.execObj.currentStatement.type == 'loop') {
                    let list = $scope.execObj.variables.filter(function (val) {
                        return val.name === $scope.execObj.currentStatement.list.replace(/'/g, '');
                    })[0];
                    let identifier = $scope.execObj.variables.filter(function (val) {
                        return val.name === $scope.execObj.currentStatement.identifier.replace(/'/g, '');
                    })[0];
                    identifier.val = list.val[$scope.execObj.currentStatement.counter ? $scope.execObj.currentStatement.counter : 0];
                }
            }

            $scope.nextStatement = function () {
                $scope.execObj = interpreter.execute();
                if ($scope.execObj === null) return;
                checkType();
                if ($scope.currentStrategy.name !== $scope.execObj.currentStrategy.name) {
                    $('#' + $scope.execObj.currentStrategy.name).collapse('show');
                    $('#' + $scope.currentStrategy.name).collapse('hide');
                    $scope.parameters = $scope.execObj.variables.filter(function (val) {
                        return val.type == 'parameter';
                    });
                    $scope.currentStrategy = $scope.execObj.currentStrategy;
                }
            };

            $scope.prevStatement = function () {
                $scope.execObj = interpreter.goBack();
                if ($scope.execObj === null) return;
                if ($scope.currentStrategy.name !== $scope.execObj.currentStrategy.name) {
                    $('#' + $scope.execObj.currentStrategy.name).collapse('show');
                    $('#' + $scope.currentStrategy.name).collapse('hide');
                    $scope.currentStrategy = $scope.execObj.currentStrategy;
                }
            };

            $scope.outerStatement = function () {
                $scope.execObj = interpreter.refreshStatement(false);
                checkType();

            };
            $scope.innerStatement = function () {
                $scope.execObj = interpreter.refreshStatement(true);
                checkType();
            };

            $scope.$on("setNeededFalse", function (args) {
                $scope.setNeeded = false;
            })
        });

    });

    myapp.directive('variableValue', function ($parse, $timeout) {
        return {
            template:
            '<span ng-show="edit">' +
            '<textarea ng-show="isArray" ng-blur="updateModel()" ng-model="var"></textarea>' +
            '<input type="text" ng-show="!isArray" ng-blur="updateModel()" ng-model="model">' +
            '</span>' +
            '<div class="var-outer-border" ng-show="!edit" ng-attr-id="{{modelId}}">' +
            '<span class="showvars" ng-show="isArray && allvar.length" ng-click="changeEdit()" ng-repeat="myvar in allvar track by $index">{{myvar}}</span>' +
            '<span class="showvars" ng-show="isArray && !allvar.length" ng-click="changeEdit()">nothing</span>' +
            '<span class="showvars" ng-show="!isArray && model.length" ng-click="changeEdit()">{{model}}</span>' +
            '<span class="showvars" ng-show="!isArray && !model.length" ng-click="changeEdit()">nothing</span>' +
            '</div>',
            restrict: 'E',
            scope: {
                model: '=',
                isArray: '=',
                modelId: '='
            },
            link: function (scope, element, attrs, controller) {
                scope.edit = false;
                scope.var = '';
                scope.id = null;
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
                    scope.edit = !scope.edit;
                    if (scope.isArray) {
                        let arr = scope.var.split(',');
                        scope.allvar = [];
                        angular.forEach(arr, function (val, key) {
                            val.trim().length ? scope.allvar.push(val.trim()) : null;
                        });
                        $parse(attrs.model).assign(scope.$parent, scope.allvar);
                    }
                    if (scope.id) {
                        scope.$emit("setNeededFalse");
                    }
                };
            }
        }
    });

}