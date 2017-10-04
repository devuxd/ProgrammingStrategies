const db = require('./dataManagement.js');
const stratModel = require('./strategyModel.js');

if (typeof window !== 'undefined' && window.angular) {

    let myAdmin = angular.module('myAdmin',['ui.ace']);

    myAdmin.factory('StrategyService', function($q) {
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

    myAdmin.controller('AdminCtrl', function ($scope, StrategyService) {
        "use strict";
        $scope.currentStatement = {};
        $scope.currentStrategy = {};
        let myStrat = StrategyService.getAll();
        myStrat.then(function(strategies) {
            $scope.allStrategies = strategies;
            $scope.editedStrategy ={};

            $scope.aceOption = {
                onLoad: function (_ace) {
                    _ace.getSession().setMode("ace/mode/json");
                    _ace.setTheme("ace/theme/twilight")
                    $scope.strategyChanged = function () {
                        _ace.setValue(JSON.stringify($scope.selectedStrategy, null, '\t'));
                    }
                }
            };


            $scope.publish = function () {
                var editor = ace.edit("aceEditor");
                var ref= firebase.database().ref().child('strategies');
                var x= ref.orderByChild("name").equalTo($scope.selectedStrategy.name);
                x.on("child_added", function(snapshot) {
                var key = snapshot.key;
                    //first argument contains an invalid key ($$hashKey) in property.... this is an error happens when we want to push , update or set
                    // a record in firebase. in order to remove the hash ke we should add:
                    //I've gotten around this issue by doing something like
                    // myRef.push(angular.fromJson(angular.toJson(myAngularObject))).
                    firebase.database().ref().child('strategies/'+key).set(angular.fromJson(angular.toJson(JSON.parse(editor.getValue()))));

                });
            }
        });
    });
};
