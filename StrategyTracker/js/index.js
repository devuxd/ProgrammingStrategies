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

    myapp.controller('MainCtrl', function ($scope, StrategyService, $window, $timeout) {
        "use strict";
        let vm = this;
        let myStrat = StrategyService.getAll();
        //Asynchronous : If the records are ready from deffered.promise, then the following steps is run.
        myStrat.then(function (allStrategies) {
            vm.allStrategies = allStrategies;
            let interpreter = null;
            // get the strategy from URL
            let keyval = $window.location.search.replace('?', '').split('=');
            if(keyval[0] == 'strategy') {
                vm.selectedStrategy = allStrategies.filter(function (value) {
                    return value.name == keyval[1];
                })[0];
                interpreter = new models.Interpreter(vm.selectedStrategy.strategies);
                vm.execObj = interpreter.init(vm.selectedStrategy.strategies[0]);
                vm.currentStrategy = vm.execObj.currentStrategy;
                vm.parameters = vm.execObj.variables.filter(function (val) {
                    return val.type == 'parameter';
                });
                // open the modal to input strategy parameters
                $("#initialParams").modal({
                    backdrop: "static",
                    keyboard: "false",
                });
                vm.myStrategy = vm.selectedStrategy;
            }
            vm.strategyChanged = function () {
                $window.location = $window.location.origin + $window.location.pathname + '?strategy=' + vm.myStrategy.name;
            };

            vm.proceedToStrategy = function () {
                let flag = true;
                angular.forEach(vm.parameters, function (val, key) {
                    if(val.val == null || val.val.trim() == '') {
                        flag = false;
                    }
                });
                if(flag == true) $("#initialParams").modal('hide');
            };

            vm.reset = function () {
                if (vm.selectedStrategy) {
                    interpreter.reset();
                    vm.execObj = interpreter.init(vm.selectedStrategy.strategies[0]);
                    vm.currentStrategy = vm.execObj.currentStrategy;
                    $('#' + vm.currentStrategy.name).collapse('show');
                    vm.selectedStrategy.strategies.forEach(function (strat) {
                        if(vm.currentStrategy.name !== strat.name) $('#' + strat.name).collapse('hide');
                    });
                    // open the modal to input strategy parameters
                    vm.parameters = vm.execObj.variables.filter(function (val) {
                        return val.type == 'parameter';
                    });
                    // open the modal to input strategy parameters
                    $("#initialParams").modal({
                        backdrop: "static",
                        keyboard: "false",
                    });
                } else {
                    alert("please choose a strategy first");
                }

            };
            function checkType() {
                if (vm.execObj.currentStatement.type == 'set') {
                    let id = vm.execObj.currentStatement.identifier.replace(/'/g, '');
                    let variable = vm.execObj.variables.filter(function (val, index, arr) {
                        return val.name == id;
                    })[0];
                    if (variable.val == null || variable.val.length == 0) {
                        vm.execObj.setNeeded = true;
                        $scope.$broadcast("EditMe", id);
                    } else {
                        vm.execObj.setNeeded = false;
                    }
                }
                if (vm.execObj.currentStatement.type == 'foreach' || vm.execObj.currentStatement.type == 'loop') {
                    let list = vm.execObj.variables.filter(function (val) {
                        return val.name === vm.execObj.currentStatement.list.replace(/'/g, '');
                    })[0];
                    let identifier = vm.execObj.variables.filter(function (val) {
                        return val.name === vm.execObj.currentStatement.identifier.replace(/'/g, '');
                    })[0];
                    identifier.val = list.val[vm.execObj.currentStatement.counter ? vm.execObj.currentStatement.counter : 0];
                }
            }

            vm.nextStatement = function () {
                vm.execObj = interpreter.execute();
                if (vm.execObj === null) {
                    $timeout(function() {
                        alert("End of Strategy");
                    }, 100);
                    return;
                }
                checkType();
                if (vm.currentStrategy.name !== vm.execObj.currentStrategy.name) {
                    $('#' + vm.execObj.currentStrategy.name).collapse('show');
                    $('#' + vm.currentStrategy.name).collapse('hide');
                    vm.parameters = vm.execObj.variables.filter(function (val) {
                        return val.type == 'parameter';
                    });
                    vm.currentStrategy = vm.execObj.currentStrategy;
                }
            };

            vm.prevStatement = function () {
                vm.execObj = interpreter.goBack();
                if (vm.execObj === null) return;
                checkType();
                if (vm.currentStrategy.name !== vm.execObj.currentStrategy.name) {
                    $('#' + vm.execObj.currentStrategy.name).collapse('show');
                    $('#' + vm.currentStrategy.name).collapse('hide');
                    vm.currentStrategy = vm.execObj.currentStrategy;
                }
            };

            vm.outerStatement = function () {
                vm.execObj = interpreter.execute(false);
                checkType();

            };
            vm.innerStatement = function () {
                vm.execObj = interpreter.execute(true);
                checkType();
            };

            $scope.$on("setNeededFalse", function (args) {
                if(!args.targetScope.model) {
                    vm.execObj.setNeeded = true;
                } else {
                    vm.execObj.setNeeded = false;
                }
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
                var listener = null;
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
                    listener = scope.$watch('model', function (newval, oldval) {
                        scope.$emit("setNeededFalse");
                    });
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
                    listener();
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