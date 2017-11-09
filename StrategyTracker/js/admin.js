


const db = require('./dataManagement.js');
const tokenizer = require('../tokenizer.js');

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
            $scope.selectedStrategy=strategies[0] || null;
            $scope.allStrategies = strategies;
            $scope.editedStrategy ={};
            $scope.aceOption = {
                onLoad: function (_ace) {
                    _ace.getSession().setMode("ace/mode/json");
                    _ace.setTheme("ace/theme/twilight")
                    $scope.strategyChanged = function () {
                        _ace.setValue($scope.selectedStrategy.robotoText);
                        $scope.newStrategyOwner=$scope.selectedStrategy.owner;
                        $scope.newStrategyDisplayName=$scope.selectedStrategy.displayName;
                        $scope.newStrategyName=$scope.selectedStrategy.name;
                        $scope.newStrategyType=$scope.selectedStrategy.type;
                    }
                }
            };
            $scope.newStrategyOwner=$scope.selectedStrategy.owner;
            $scope.newStrategyDisplayName=$scope.selectedStrategy.displayName;
            $scope.newStrategyName=$scope.selectedStrategy.name;
            $scope.newStrategyType=$scope.selectedStrategy.type;

            var editor = ace.edit("aceEditor");
            editor.setValue($scope.selectedStrategy ? $scope.selectedStrategy.robotoText : '');
            var ref= firebase.database().ref().child('strategies');

            $scope.publish = function () {
                if($scope.selectedStrategy ===undefined)
                {
                      return;
                }
                var owner = $scope.selectedStrategy.owner;
                var displayName = $scope.selectedStrategy.displayName;
                var name = $scope.selectedStrategy.name;
                var type = $scope.selectedStrategy.type;


                var tokens = new tokenizer.Tokens(editor.getValue());
                if(tokens[tokens.length-1] != "\n")
                    tokens.tokens.push("\n");
                var ast = tokenizer.parseApproach(owner, name, displayName, type, tokens,editor.getValue() );

                var x= ref.orderByChild("name").equalTo($scope.selectedStrategy.name);
                $scope.selectedStrategy = ast;
                x.on("child_added", function(snapshot) {
                var key = snapshot.key;
                    //first argument contains an invalid key ($$hashKey) in property.... this is an error happens when we want to push , update or set
                    // a record in firebase. in order to remove the hash ke we should add:
                    //I've gotten around this issue by doing something like
                    // myRef.push(angular.fromJson(angular.toJson(myAngularObject))).
                    firebase.database().ref().child('strategies/'+key).set(angular.fromJson(angular.toJson($scope.selectedStrategy)));
                });
            }
            $scope.addNewStrategy = function () {
                editor.setValue("");
                $scope.newStrategyOwner = "";
                $scope.newStrategyName="";
                $scope.newStrategyDisplayName="";
                $scope.newStrategyType="approach";
                $scope.selectedStrategy=undefined;
            }
            $scope.createStrategy = function () {
                //$("#frmStrategyCreation").css("display", "block");
                var owner = $scope.newStrategyOwner;
                var displayName = $scope.newStrategyDisplayName;
                var name = $scope.newStrategyName;
                var type = $scope.newStrategyType;

                if(name=="" || owner=="" || displayName == "" || type == "")
                {
                    alert("please fill out the required fields");
                    return;
                }
                var tokens = new tokenizer.Tokens(editor.getValue());
                if(tokens[tokens.length-1] != "\n")
                    tokens.tokens.push("\n");
                var ast = tokenizer.parseApproach(owner, name, displayName, type, tokens, editor.getValue());

                $scope.selectedStrategy = ast;
                firebase.database().ref().child('strategies').push(angular.fromJson(angular.toJson($scope.selectedStrategy)));
                $scope.allStrategies.push($scope.selectedStrategy);
                //$("#frmStrategyCreation").css("display", "none");
                $scope.strategyChanged();

            }
            $scope.cancelCreatingStrategy = function () {
                $scope.selectedStrategy = strategies[0]||null;
                $scope.strategyChanged();
            }
        });
    });
};
