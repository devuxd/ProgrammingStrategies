const models = require('./models.js');
const db = require('./dataManagement.js');

if (typeof window !== 'undefined' && window.angular) {
    let myapp = angular.module('myapp', ['ngSanitize']);

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
                    val.visible=true;
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
                    let variable = vm.execObj.variables.find(function (val, index, arr) {
                        return val.name == id;
                    });
                    if (variable.val == null || variable.val.length == 0) {
                        variable.visible = true;
                        vm.execObj.setNeeded = true;
                        $scope.$broadcast("EditMe", id);
                    } else {
                        vm.execObj.setNeeded = false;
                    }
                }
                if (vm.execObj.currentStatement.type == 'foreach' || vm.execObj.currentStatement.type == 'loop') {
                    let list = vm.execObj.variables.find(function (val) {
                        return val.name === vm.execObj.currentStatement.list.replace(/'/g, '');
                    });

                    let identifier = vm.execObj.variables.find(function (val) {
                        return val.name === vm.execObj.currentStatement.identifier.replace(/'/g, '');
                    });
                    identifier.visible = true;
                    identifier.val = list.val[vm.execObj.currentStatement.counter ? vm.execObj.currentStatement.counter : 0];
                    list.dirtyArray.push(list.val[vm.execObj.currentStatement.counter ? vm.execObj.currentStatement.counter : 0]);
                    //$scope.$apply();

                }
            }

            vm.nextStatement = function () {
                vm.execObj = interpreter.execute();
                // vm.execObj.variables.forEach(function (variable) {
                //     console.log("Variables:   " + variable.name);
                // });
                if (vm.execObj == null) {
                    $timeout(function() {
                        alert("You reach end of strategy! If you think you did not finish the task, reset the strategy and start over again. ");
                    }, 100);
                    return;
                }
                checkType();
                if (vm.currentStrategy.name !== vm.execObj.currentStrategy.name) {
                    $('#' + vm.execObj.currentStrategy.name).collapse('show');
                    $('#' + vm.currentStrategy.name).collapse('hide');
                    if (vm.execObj.variables !== null){
                        vm.parameters = vm.execObj.variables.filter(function (val) {
                            return val.type == 'parameter';
                        });
                    }

                    vm.currentStrategy = vm.execObj.currentStrategy;
                }
            };

            vm.prevStatement = function () {
                vm.execObj = interpreter.goBack();
                if (vm.execObj === null) return;
                if(vm.execObj.currentStatement.type === 'set') {
                    let id = vm.execObj.currentStatement.identifier.replace(/'/g, '');
                    let variable = vm.execObj.variables.find(function (val, index, arr) {
                        return val.name == id;
                    });
                    console.log(variable);
                    if(variable.dirtyArray !== undefined) variable.dirtyArray = [];
                }
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
            });

            $scope.$on("blockAdd", function (args, data) {
                interpreter.addLoopBlocks(data.id, data.data);

            })
        });
    });

    myapp.directive('variableValue', function ($parse, $timeout) {
        return {
            template:
            '<span ng-show="edit">' +
            '<textarea ng-show="isArray " ng-blur="updateModel()" ng-model="var"></textarea>' +
            '<input type="text" ng-show="!isArray " ng-blur="updateModel()" ng-model="model">' +
            '</span>' +
            '<div class="var-outer-border" ng-show="!edit" ng-attr-id="{{modelId}}">' +
            '<span class="showvars" ng-show="isArray && allvar.length " ng-class="dirtyArray.indexOf(myvar) >= 0 ? \'dirty\' : \'\'" ng-repeat="myvar in allvar track by $index">{{myvar}}</span>' +
            '<span class="showvars" ng-show="isArray && !allvar.length " ng-click="changeEdit()">nothing</span>' +
            '<span class="showvars" ng-show="!isArray && model.length "  ng-click="changeEdit()">{{model}}</span>' +
            '<span class="showvars" ng-show="!isArray && !model.length " ng-click="changeEdit()">nothing</span>' +
            '<button style="margin-left:5px;" ng-show="isArray && allvar.length " title=" Add more items" href="#" ng-click="changeEdit()"><i class="glyphicon glyphicon-plus"></i></button>' +
            '</div>',
            restrict: 'E',
            scope: {
                model: '=',
                isArray: '=',
                modelId: '=',
                parentId: '=',
                dirtyArray: '=',
                prevVar: '='
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
                    }
                    else {
                        $timeout(function () {
                            element[0].firstChild.lastChild.focus();
                        }, 10);
                    }
                };
                scope.updateModel = function () {
                    listener();
                    scope.edit = !scope.edit;
                    if (scope.isArray) {
                        let arr = new Set(scope.var.split(','));

                        scope.allvar = [];
                        angular.forEach(arr, function (val, key) {
                            val.trim().length ? scope.allvar.push(val.trim()) : null;
                        });

                        if(scope.dirtyArray.length > 0) {
                            for(let i = 0; i< scope.dirtyArray.length; i++)
                            {
                                if(scope.dirtyArray[i] !== scope.allvar[i]){
                                    scope.allvar = scope.prevVar;
                                    alert(" You are currently executing a loop. Adding elements are just allowed to the end of collection.  ");
                                    return;
                                }
                            }
                        }

                        $parse(attrs.model).assign(scope.$parent, scope.allvar);
                        if(scope.prevVar.length !== 0 && scope.prevVar.length < scope.allvar.length) {
                            scope.$emit("blockAdd", {"data": scope.allvar.slice(scope.prevVar.length, scope.allvar.length), "id": scope.parentId});
                        }
                        //console.log(scope.allvar.length);

                        scope.prevVar = scope.allvar;
                    }
                    if (scope.id) {
                        scope.$emit("setNeededFalse");
                    }
                };

            }
        }
    });

}