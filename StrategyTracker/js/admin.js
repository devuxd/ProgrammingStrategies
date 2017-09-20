const db = require('./dataManagement.js');
const stratModel = require('./strategyModel.js');

if (typeof window !== 'undefined' && window.angular) {
    let myAdmin = angular.module('myAdmin',[]);
    myAdmin.controller('AdminCtrl', function ($scope) {
        "use strict";
        $scope.currentStatement = {};
        $scope.currentStrategy = {};


        $scope.createStrategy= function () {
            $scope.currentStrategy = new stratModel.Strategy($scope.newStrategy.owner,$scope.newStrategy.name,$scope.newStrategy.displayName );

            // for(var i =0;i<strategies.length; i++){
            //     var key = firebase.database().ref().child('strategies').push(newStrategy);
            // }
        }

        $scope.addStatement = function () {
            var text =  $scope.currentStatement.text;
            var desc =  $scope.currentStatement.description;
            var lNum =  $scope.currentStatement.lineNum;
            var successor =  $scope.currentStatement.successor;
            var vars =  $scope.currentStatement.variables;
            var nextStrat =  $scope.currentStatement.nextStrategy;
            var classStyle =  $scope.currentStatement.classStyle;

            $scope.currentStrategy.insertStatement(text,desc,lNum,successor,vars,nextStrat,classStyle);
            $scope.currentStatement = {};
        }
        $scope.accordion = {
            current: null
        };

        $scope.editCurrentStatement- function () {


        }


        $scope.publish = function () {
            firebase.database().ref().child($scopeeeeeeeeee).push(angular.fromJson(angular.toJson($scope.currentStrategy)));
        }
    });
};
