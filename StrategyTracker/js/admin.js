const db = require('./dataManagement.js');
const stratModel = require('./strategyModel.js');

if (typeof window !== 'undefined' && window.angular) {

    let myAdmin = angular.module('myAdmin',[]);
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


        $scope.createStrategy= function () {
            $scope.currentStrategy = new stratModel.Strategy($scope.newStrategy.owner,$scope.newStrategy.name,$scope.newStrategy.displayName );
        }


        $scope.editCurrentStatement- function () {


        }


        $scope.publish = function () {
            firebase.database().ref().child('strategies').push(angular.fromJson(angular.toJson($scope.currentStrategy)));
        }
    });
    });
};
