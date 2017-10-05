(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
const db = require('./dataManagement.js');
const stratModel = require('./strategyModel.js');

if (typeof window !== 'undefined' && window.angular) {
    let myAdmin = angular.module('myAdmin', ['ui.ace']);
    myAdmin.factory('StrategyService', function ($q) {
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
            }
        };
    });

    myAdmin.controller('AdminCtrl', function ($scope, StrategyService) {
        "use strict";

        $scope.currentStatement = {};
        $scope.currentStrategy = {};

        let myStrat = StrategyService.getAll();
        myStrat.then(function (strategies) {
            $scope.selectedStrategy = strategies[1];
            $scope.allStrategies = strategies;
            $scope.editedStrategy = {};
            $scope.aceOption = {
                onLoad: function (_ace) {
                    _ace.getSession().setMode("ace/mode/json");
                    _ace.setTheme("ace/theme/twilight");
                    $scope.strategyChanged = function () {
                        _ace.setValue(JSON.stringify($scope.selectedStrategy, null, '\t'));
                    };
                }
            };

            var editor = ace.edit("aceEditor");
            editor.setValue(JSON.stringify($scope.selectedStrategy, null, '\t'));
            var ref = firebase.database().ref().child('strategies');
            $scope.publish = function () {
                var x = ref.orderByChild("name").equalTo($scope.selectedStrategy.name);
                x.on("child_added", function (snapshot) {
                    var key = snapshot.key;
                    //first argument contains an invalid key ($$hashKey) in property.... this is an error happens when we want to push , update or set
                    // a record in firebase. in order to remove the hash ke we should add:
                    //I've gotten around this issue by doing something like
                    // myRef.push(angular.fromJson(angular.toJson(myAngularObject))).
                    firebase.database().ref().child('strategies/' + key).set(angular.fromJson(angular.toJson(JSON.parse(editor.getValue()))));
                });
            };
            $scope.addNewStrategy = function () {
                editor.setValue("");
                $scope.newStrategyOwner = "";
                $scope.newStrategyName = "";
                $scope.newStrategyDisplayName = "";
                $("#frmStrategyCreation").css("display", "block");
                $("#stratHeader").value = "";
            };
            $scope.createStrategy = function () {
                $("#frmStrategyCreation").css("display", "block");
                var owner = $scope.newStrategyOwner;
                var displayName = $scope.newStrategyDisplayName;
                var name = $scope.newStrategyName;

                if (name == "" || owner == "" || displayName == "") {
                    $("#frmStrategyCreation").css("display", "none");
                    return;
                }
                $scope.selectedStrategy = new stratModel.Strategy(owner, name, displayName);
                firebase.database().ref().child('strategies').push($scope.selectedStrategy);
                $scope.allStrategies.push($scope.selectedStrategy);
                $("#frmStrategyCreation").css("display", "none");
                $scope.strategyChanged();
            };
            $scope.cancelCreatingStrategy = function () {
                $("#frmStrategyCreation").css("display", "none");
            };
        });
    });
};

},{"./dataManagement.js":2,"./strategyModel.js":3}],2:[function(require,module,exports){


var config = {
    apiKey: "AIzaSyAXjL6f739BVqLDknymCN2H36-NBDS8LvY",
    authDomain: "strategytracker.firebaseapp.com",
    databaseURL: "https://strategytracker.firebaseio.com",
    projectId: "strategytracker",
    storageBucket: "strategytracker.appspot.com",
    messagingSenderId: "261249836518"
};
firebase.initializeApp(config);

},{}],3:[function(require,module,exports){
'use strict';

class Strategy {

    constructor(owner, name, displayName) {
        this.name = name;
        this.owner = owner;
        this.displayName = displayName;
        this.statements = [];
    }

    insertStatement(text, description, lineNum, successor, variables, nextStrategy, classstyle) {
        let newStat = new Statement(text, description, lineNum, successor, variables, nextStrategy, classstyle);
        this.statements.push(newStat);
    }
}

class Statement {
    constructor(text, description, lineNum, successor, variables, nextStrategy, classStyle) {
        this.text = text;
        this.description = description;
        this.lineNum = lineNum;
        this.successor = successor;
        this.variables = variables;
        this.nextStrategy = nextStrategy;
        this.classStyle = classStyle;
    }
}

module.exports = {
    Strategy: Strategy,
    Statement: Statement
};

},{}]},{},[1])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJhZG1pbi5qcyIsImRhdGFNYW5hZ2VtZW50LmpzIiwic3RyYXRlZ3lNb2RlbC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBLE1BQU0sS0FBSyxRQUFRLHFCQUFSLENBQVg7QUFDQSxNQUFNLGFBQWEsUUFBUSxvQkFBUixDQUFuQjs7QUFFQSxJQUFJLE9BQU8sTUFBUCxLQUFrQixXQUFsQixJQUFpQyxPQUFPLE9BQTVDLEVBQXFEO0FBQ2pELFFBQUksVUFBVSxRQUFRLE1BQVIsQ0FBZSxTQUFmLEVBQXlCLENBQUMsUUFBRCxDQUF6QixDQUFkO0FBQ0EsWUFBUSxPQUFSLENBQWdCLGlCQUFoQixFQUFtQyxVQUFTLEVBQVQsRUFBYTtBQUM1QyxZQUFJLGFBQVksRUFBaEI7QUFDQSxZQUFJLFdBQVcsR0FBRyxLQUFILEVBQWY7QUFDQSxpQkFBUyxRQUFULEdBQW9CLEdBQXBCLENBQXdCLFlBQXhCLEVBQXNDLElBQXRDLENBQTJDLE9BQTNDLEVBQW9ELElBQXBELENBQXlELFVBQVMsUUFBVCxFQUFtQjtBQUN4RSxxQkFBUyxPQUFULENBQWlCLFVBQVMsYUFBVCxFQUF3QjtBQUNyQywyQkFBVyxJQUFYLENBQWdCLGNBQWMsR0FBZCxFQUFoQjtBQUNILGFBRkQ7QUFHQSxxQkFBUyxPQUFULENBQWlCLFVBQWpCO0FBQ0gsU0FMRCxFQUtHLEtBTEgsQ0FLUyxVQUFTLEdBQVQsRUFBYztBQUNuQixxQkFBUyxNQUFULENBQWdCLEdBQWhCO0FBQ0gsU0FQRDtBQVFBLGVBQU87QUFDSCxvQkFBUSxZQUFXO0FBQ2YsdUJBQU8sU0FBUyxPQUFoQjtBQUNIO0FBSEUsU0FBUDtBQUtILEtBaEJEOztBQWtCQSxZQUFRLFVBQVIsQ0FBbUIsV0FBbkIsRUFBZ0MsVUFBVSxNQUFWLEVBQWtCLGVBQWxCLEVBQW1DO0FBQy9EOztBQUNBLGVBQU8sZ0JBQVAsR0FBMEIsRUFBMUI7QUFDQSxlQUFPLGVBQVAsR0FBeUIsRUFBekI7O0FBRUEsWUFBSSxVQUFVLGdCQUFnQixNQUFoQixFQUFkO0FBQ0EsZ0JBQVEsSUFBUixDQUFhLFVBQVMsVUFBVCxFQUFxQjtBQUM5QixtQkFBTyxnQkFBUCxHQUF3QixXQUFXLENBQVgsQ0FBeEI7QUFDQSxtQkFBTyxhQUFQLEdBQXVCLFVBQXZCO0FBQ0EsbUJBQU8sY0FBUCxHQUF1QixFQUF2QjtBQUNBLG1CQUFPLFNBQVAsR0FBbUI7QUFDZix3QkFBUSxVQUFVLElBQVYsRUFBZ0I7QUFDcEIseUJBQUssVUFBTCxHQUFrQixPQUFsQixDQUEwQixlQUExQjtBQUNBLHlCQUFLLFFBQUwsQ0FBYyxvQkFBZDtBQUNBLDJCQUFPLGVBQVAsR0FBeUIsWUFBWTtBQUNqQyw2QkFBSyxRQUFMLENBQWMsS0FBSyxTQUFMLENBQWUsT0FBTyxnQkFBdEIsRUFBd0MsSUFBeEMsRUFBOEMsSUFBOUMsQ0FBZDtBQUNILHFCQUZEO0FBR0g7QUFQYyxhQUFuQjs7QUFVQSxnQkFBSSxTQUFTLElBQUksSUFBSixDQUFTLFdBQVQsQ0FBYjtBQUNBLG1CQUFPLFFBQVAsQ0FBZ0IsS0FBSyxTQUFMLENBQWUsT0FBTyxnQkFBdEIsRUFBd0MsSUFBeEMsRUFBOEMsSUFBOUMsQ0FBaEI7QUFDQSxnQkFBSSxNQUFLLFNBQVMsUUFBVCxHQUFvQixHQUFwQixHQUEwQixLQUExQixDQUFnQyxZQUFoQyxDQUFUO0FBQ0EsbUJBQU8sT0FBUCxHQUFpQixZQUFZO0FBQ3pCLG9CQUFJLElBQUcsSUFBSSxZQUFKLENBQWlCLE1BQWpCLEVBQXlCLE9BQXpCLENBQWlDLE9BQU8sZ0JBQVAsQ0FBd0IsSUFBekQsQ0FBUDtBQUNBLGtCQUFFLEVBQUYsQ0FBSyxhQUFMLEVBQW9CLFVBQVMsUUFBVCxFQUFtQjtBQUN2Qyx3QkFBSSxNQUFNLFNBQVMsR0FBbkI7QUFDSTtBQUNBO0FBQ0E7QUFDQTtBQUNBLDZCQUFTLFFBQVQsR0FBb0IsR0FBcEIsR0FBMEIsS0FBMUIsQ0FBZ0MsZ0JBQWMsR0FBOUMsRUFBbUQsR0FBbkQsQ0FBdUQsUUFBUSxRQUFSLENBQWlCLFFBQVEsTUFBUixDQUFlLEtBQUssS0FBTCxDQUFXLE9BQU8sUUFBUCxFQUFYLENBQWYsQ0FBakIsQ0FBdkQ7QUFDSCxpQkFQRDtBQVFILGFBVkQ7QUFXQSxtQkFBTyxjQUFQLEdBQXdCLFlBQVk7QUFDaEMsdUJBQU8sUUFBUCxDQUFnQixFQUFoQjtBQUNBLHVCQUFPLGdCQUFQLEdBQTBCLEVBQTFCO0FBQ0EsdUJBQU8sZUFBUCxHQUF1QixFQUF2QjtBQUNBLHVCQUFPLHNCQUFQLEdBQThCLEVBQTlCO0FBQ0Esa0JBQUUsc0JBQUYsRUFBMEIsR0FBMUIsQ0FBOEIsU0FBOUIsRUFBeUMsT0FBekM7QUFDQSxrQkFBRSxjQUFGLEVBQWtCLEtBQWxCLEdBQXdCLEVBQXhCO0FBQ0gsYUFQRDtBQVFBLG1CQUFPLGNBQVAsR0FBd0IsWUFBWTtBQUNoQyxrQkFBRSxzQkFBRixFQUEwQixHQUExQixDQUE4QixTQUE5QixFQUF5QyxPQUF6QztBQUNBLG9CQUFJLFFBQVEsT0FBTyxnQkFBbkI7QUFDQSxvQkFBSSxjQUFjLE9BQU8sc0JBQXpCO0FBQ0Esb0JBQUksT0FBTyxPQUFPLGVBQWxCOztBQUVBLG9CQUFHLFFBQU0sRUFBTixJQUFZLFNBQU8sRUFBbkIsSUFBeUIsZUFBZSxFQUEzQyxFQUNBO0FBQ0ksc0JBQUUsc0JBQUYsRUFBMEIsR0FBMUIsQ0FBOEIsU0FBOUIsRUFBeUMsTUFBekM7QUFDQTtBQUNIO0FBQ0QsdUJBQU8sZ0JBQVAsR0FBMEIsSUFBSSxXQUFXLFFBQWYsQ0FBd0IsS0FBeEIsRUFBK0IsSUFBL0IsRUFBb0MsV0FBcEMsQ0FBMUI7QUFDQSx5QkFBUyxRQUFULEdBQW9CLEdBQXBCLEdBQTBCLEtBQTFCLENBQWdDLFlBQWhDLEVBQThDLElBQTlDLENBQW1ELE9BQU8sZ0JBQTFEO0FBQ0EsdUJBQU8sYUFBUCxDQUFxQixJQUFyQixDQUEwQixPQUFPLGdCQUFqQztBQUNBLGtCQUFFLHNCQUFGLEVBQTBCLEdBQTFCLENBQThCLFNBQTlCLEVBQXlDLE1BQXpDO0FBQ0EsdUJBQU8sZUFBUDtBQUVILGFBakJEO0FBa0JBLG1CQUFPLHNCQUFQLEdBQWdDLFlBQVk7QUFDeEMsa0JBQUUsc0JBQUYsRUFBMEIsR0FBMUIsQ0FBOEIsU0FBOUIsRUFBeUMsTUFBekM7QUFDSCxhQUZEO0FBR0gsU0F6REQ7QUEwREgsS0FoRUQ7QUFpRUg7Ozs7O0FDckZELElBQUksU0FBUztBQUNULFlBQVEseUNBREM7QUFFVCxnQkFBWSxpQ0FGSDtBQUdULGlCQUFhLHdDQUhKO0FBSVQsZUFBVyxpQkFKRjtBQUtULG1CQUFlLDZCQUxOO0FBTVQsdUJBQW1CO0FBTlYsQ0FBYjtBQVFBLFNBQVMsYUFBVCxDQUF1QixNQUF2Qjs7O0FDWEE7O0FBRUEsTUFBTSxRQUFOLENBQWU7O0FBRVgsZ0JBQVksS0FBWixFQUFtQixJQUFuQixFQUF5QixXQUF6QixFQUFzQztBQUNsQyxhQUFLLElBQUwsR0FBWSxJQUFaO0FBQ0EsYUFBSyxLQUFMLEdBQVksS0FBWjtBQUNBLGFBQUssV0FBTCxHQUFrQixXQUFsQjtBQUNBLGFBQUssVUFBTCxHQUFrQixFQUFsQjtBQUNIOztBQUVELG9CQUFnQixJQUFoQixFQUFzQixXQUF0QixFQUFtQyxPQUFuQyxFQUE0QyxTQUE1QyxFQUF1RCxTQUF2RCxFQUFrRSxZQUFsRSxFQUFnRixVQUFoRixFQUEyRjtBQUN2RixZQUFJLFVBQVUsSUFBSSxTQUFKLENBQWMsSUFBZCxFQUFvQixXQUFwQixFQUFpQyxPQUFqQyxFQUEwQyxTQUExQyxFQUFxRCxTQUFyRCxFQUFnRSxZQUFoRSxFQUE4RSxVQUE5RSxDQUFkO0FBQ0EsYUFBSyxVQUFMLENBQWdCLElBQWhCLENBQXFCLE9BQXJCO0FBQ0g7QUFaVTs7QUFlZixNQUFNLFNBQU4sQ0FBZTtBQUNYLGdCQUFZLElBQVosRUFBa0IsV0FBbEIsRUFBK0IsT0FBL0IsRUFBd0MsU0FBeEMsRUFBbUQsU0FBbkQsRUFBOEQsWUFBOUQsRUFBNEUsVUFBNUUsRUFBdUY7QUFDbkYsYUFBSyxJQUFMLEdBQVksSUFBWjtBQUNBLGFBQUssV0FBTCxHQUFtQixXQUFuQjtBQUNBLGFBQUssT0FBTCxHQUFlLE9BQWY7QUFDQSxhQUFLLFNBQUwsR0FBaUIsU0FBakI7QUFDQSxhQUFLLFNBQUwsR0FBaUIsU0FBakI7QUFDQSxhQUFLLFlBQUwsR0FBb0IsWUFBcEI7QUFDQSxhQUFLLFVBQUwsR0FBa0IsVUFBbEI7QUFDSDtBQVRVOztBQWFmLE9BQU8sT0FBUCxHQUFpQjtBQUNiLGNBQVUsUUFERztBQUViLGVBQVc7QUFGRSxDQUFqQiIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJjb25zdCBkYiA9IHJlcXVpcmUoJy4vZGF0YU1hbmFnZW1lbnQuanMnKTtcbmNvbnN0IHN0cmF0TW9kZWwgPSByZXF1aXJlKCcuL3N0cmF0ZWd5TW9kZWwuanMnKTtcblxuaWYgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnICYmIHdpbmRvdy5hbmd1bGFyKSB7XG4gICAgbGV0IG15QWRtaW4gPSBhbmd1bGFyLm1vZHVsZSgnbXlBZG1pbicsWyd1aS5hY2UnXSk7XG4gICAgbXlBZG1pbi5mYWN0b3J5KCdTdHJhdGVneVNlcnZpY2UnLCBmdW5jdGlvbigkcSkge1xuICAgICAgICBsZXQgc3RyYXRlZ2llcz0gW107XG4gICAgICAgIGxldCBkZWZlcnJlZCA9ICRxLmRlZmVyKCk7XG4gICAgICAgIGZpcmViYXNlLmRhdGFiYXNlKCkucmVmKCdzdHJhdGVnaWVzJykub25jZSgndmFsdWUnKS50aGVuKGZ1bmN0aW9uKHNuYXBzaG90KSB7XG4gICAgICAgICAgICBzbmFwc2hvdC5mb3JFYWNoKGZ1bmN0aW9uKGNoaWxkU3RyYXRlZ3kpIHtcbiAgICAgICAgICAgICAgICBzdHJhdGVnaWVzLnB1c2goY2hpbGRTdHJhdGVneS52YWwoKSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUoc3RyYXRlZ2llcyk7XG4gICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uKGVycikge1xuICAgICAgICAgICAgZGVmZXJyZWQucmVqZWN0KGVycik7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgZ2V0QWxsOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH07XG4gICAgfSk7XG5cbiAgICBteUFkbWluLmNvbnRyb2xsZXIoJ0FkbWluQ3RybCcsIGZ1bmN0aW9uICgkc2NvcGUsIFN0cmF0ZWd5U2VydmljZSkge1xuICAgICAgICBcInVzZSBzdHJpY3RcIjtcbiAgICAgICAgJHNjb3BlLmN1cnJlbnRTdGF0ZW1lbnQgPSB7fTtcbiAgICAgICAgJHNjb3BlLmN1cnJlbnRTdHJhdGVneSA9IHt9O1xuXG4gICAgICAgIGxldCBteVN0cmF0ID0gU3RyYXRlZ3lTZXJ2aWNlLmdldEFsbCgpO1xuICAgICAgICBteVN0cmF0LnRoZW4oZnVuY3Rpb24oc3RyYXRlZ2llcykge1xuICAgICAgICAgICAgJHNjb3BlLnNlbGVjdGVkU3RyYXRlZ3k9c3RyYXRlZ2llc1sxXTtcbiAgICAgICAgICAgICRzY29wZS5hbGxTdHJhdGVnaWVzID0gc3RyYXRlZ2llcztcbiAgICAgICAgICAgICRzY29wZS5lZGl0ZWRTdHJhdGVneSA9e307XG4gICAgICAgICAgICAkc2NvcGUuYWNlT3B0aW9uID0ge1xuICAgICAgICAgICAgICAgIG9uTG9hZDogZnVuY3Rpb24gKF9hY2UpIHtcbiAgICAgICAgICAgICAgICAgICAgX2FjZS5nZXRTZXNzaW9uKCkuc2V0TW9kZShcImFjZS9tb2RlL2pzb25cIik7XG4gICAgICAgICAgICAgICAgICAgIF9hY2Uuc2V0VGhlbWUoXCJhY2UvdGhlbWUvdHdpbGlnaHRcIilcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLnN0cmF0ZWd5Q2hhbmdlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIF9hY2Uuc2V0VmFsdWUoSlNPTi5zdHJpbmdpZnkoJHNjb3BlLnNlbGVjdGVkU3RyYXRlZ3ksIG51bGwsICdcXHQnKSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICB2YXIgZWRpdG9yID0gYWNlLmVkaXQoXCJhY2VFZGl0b3JcIik7XG4gICAgICAgICAgICBlZGl0b3Iuc2V0VmFsdWUoSlNPTi5zdHJpbmdpZnkoJHNjb3BlLnNlbGVjdGVkU3RyYXRlZ3ksIG51bGwsICdcXHQnKSlcbiAgICAgICAgICAgIHZhciByZWY9IGZpcmViYXNlLmRhdGFiYXNlKCkucmVmKCkuY2hpbGQoJ3N0cmF0ZWdpZXMnKTtcbiAgICAgICAgICAgICRzY29wZS5wdWJsaXNoID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHZhciB4PSByZWYub3JkZXJCeUNoaWxkKFwibmFtZVwiKS5lcXVhbFRvKCRzY29wZS5zZWxlY3RlZFN0cmF0ZWd5Lm5hbWUpO1xuICAgICAgICAgICAgICAgIHgub24oXCJjaGlsZF9hZGRlZFwiLCBmdW5jdGlvbihzbmFwc2hvdCkge1xuICAgICAgICAgICAgICAgIHZhciBrZXkgPSBzbmFwc2hvdC5rZXk7XG4gICAgICAgICAgICAgICAgICAgIC8vZmlyc3QgYXJndW1lbnQgY29udGFpbnMgYW4gaW52YWxpZCBrZXkgKCQkaGFzaEtleSkgaW4gcHJvcGVydHkuLi4uIHRoaXMgaXMgYW4gZXJyb3IgaGFwcGVucyB3aGVuIHdlIHdhbnQgdG8gcHVzaCAsIHVwZGF0ZSBvciBzZXRcbiAgICAgICAgICAgICAgICAgICAgLy8gYSByZWNvcmQgaW4gZmlyZWJhc2UuIGluIG9yZGVyIHRvIHJlbW92ZSB0aGUgaGFzaCBrZSB3ZSBzaG91bGQgYWRkOlxuICAgICAgICAgICAgICAgICAgICAvL0kndmUgZ290dGVuIGFyb3VuZCB0aGlzIGlzc3VlIGJ5IGRvaW5nIHNvbWV0aGluZyBsaWtlXG4gICAgICAgICAgICAgICAgICAgIC8vIG15UmVmLnB1c2goYW5ndWxhci5mcm9tSnNvbihhbmd1bGFyLnRvSnNvbihteUFuZ3VsYXJPYmplY3QpKSkuXG4gICAgICAgICAgICAgICAgICAgIGZpcmViYXNlLmRhdGFiYXNlKCkucmVmKCkuY2hpbGQoJ3N0cmF0ZWdpZXMvJytrZXkpLnNldChhbmd1bGFyLmZyb21Kc29uKGFuZ3VsYXIudG9Kc29uKEpTT04ucGFyc2UoZWRpdG9yLmdldFZhbHVlKCkpKSkpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgJHNjb3BlLmFkZE5ld1N0cmF0ZWd5ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGVkaXRvci5zZXRWYWx1ZShcIlwiKTtcbiAgICAgICAgICAgICAgICAkc2NvcGUubmV3U3RyYXRlZ3lPd25lciA9IFwiXCI7XG4gICAgICAgICAgICAgICAgJHNjb3BlLm5ld1N0cmF0ZWd5TmFtZT1cIlwiO1xuICAgICAgICAgICAgICAgICRzY29wZS5uZXdTdHJhdGVneURpc3BsYXlOYW1lPVwiXCI7XG4gICAgICAgICAgICAgICAgJChcIiNmcm1TdHJhdGVneUNyZWF0aW9uXCIpLmNzcyhcImRpc3BsYXlcIiwgXCJibG9ja1wiKTtcbiAgICAgICAgICAgICAgICAkKFwiI3N0cmF0SGVhZGVyXCIpLnZhbHVlPVwiXCI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAkc2NvcGUuY3JlYXRlU3RyYXRlZ3kgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgJChcIiNmcm1TdHJhdGVneUNyZWF0aW9uXCIpLmNzcyhcImRpc3BsYXlcIiwgXCJibG9ja1wiKTtcbiAgICAgICAgICAgICAgICB2YXIgb3duZXIgPSAkc2NvcGUubmV3U3RyYXRlZ3lPd25lcjtcbiAgICAgICAgICAgICAgICB2YXIgZGlzcGxheU5hbWUgPSAkc2NvcGUubmV3U3RyYXRlZ3lEaXNwbGF5TmFtZTtcbiAgICAgICAgICAgICAgICB2YXIgbmFtZSA9ICRzY29wZS5uZXdTdHJhdGVneU5hbWU7XG5cbiAgICAgICAgICAgICAgICBpZihuYW1lPT1cIlwiIHx8IG93bmVyPT1cIlwiIHx8IGRpc3BsYXlOYW1lID09IFwiXCIpXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAkKFwiI2ZybVN0cmF0ZWd5Q3JlYXRpb25cIikuY3NzKFwiZGlzcGxheVwiLCBcIm5vbmVcIik7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgJHNjb3BlLnNlbGVjdGVkU3RyYXRlZ3kgPSBuZXcgc3RyYXRNb2RlbC5TdHJhdGVneShvd25lciwgbmFtZSxkaXNwbGF5TmFtZSk7XG4gICAgICAgICAgICAgICAgZmlyZWJhc2UuZGF0YWJhc2UoKS5yZWYoKS5jaGlsZCgnc3RyYXRlZ2llcycpLnB1c2goJHNjb3BlLnNlbGVjdGVkU3RyYXRlZ3kpO1xuICAgICAgICAgICAgICAgICRzY29wZS5hbGxTdHJhdGVnaWVzLnB1c2goJHNjb3BlLnNlbGVjdGVkU3RyYXRlZ3kpO1xuICAgICAgICAgICAgICAgICQoXCIjZnJtU3RyYXRlZ3lDcmVhdGlvblwiKS5jc3MoXCJkaXNwbGF5XCIsIFwibm9uZVwiKTtcbiAgICAgICAgICAgICAgICAkc2NvcGUuc3RyYXRlZ3lDaGFuZ2VkKCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAkc2NvcGUuY2FuY2VsQ3JlYXRpbmdTdHJhdGVneSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAkKFwiI2ZybVN0cmF0ZWd5Q3JlYXRpb25cIikuY3NzKFwiZGlzcGxheVwiLCBcIm5vbmVcIik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0pO1xufTtcbiIsIlxuXG5cbnZhciBjb25maWcgPSB7XG4gICAgYXBpS2V5OiBcIkFJemFTeUFYakw2ZjczOUJWcUxEa255bUNOMkgzNi1OQkRTOEx2WVwiLFxuICAgIGF1dGhEb21haW46IFwic3RyYXRlZ3l0cmFja2VyLmZpcmViYXNlYXBwLmNvbVwiLFxuICAgIGRhdGFiYXNlVVJMOiBcImh0dHBzOi8vc3RyYXRlZ3l0cmFja2VyLmZpcmViYXNlaW8uY29tXCIsXG4gICAgcHJvamVjdElkOiBcInN0cmF0ZWd5dHJhY2tlclwiLFxuICAgIHN0b3JhZ2VCdWNrZXQ6IFwic3RyYXRlZ3l0cmFja2VyLmFwcHNwb3QuY29tXCIsXG4gICAgbWVzc2FnaW5nU2VuZGVySWQ6IFwiMjYxMjQ5ODM2NTE4XCJcbn07XG5maXJlYmFzZS5pbml0aWFsaXplQXBwKGNvbmZpZyk7XG5cbiIsIid1c2Ugc3RyaWN0JztcblxuY2xhc3MgU3RyYXRlZ3kge1xuXG4gICAgY29uc3RydWN0b3Iob3duZXIsIG5hbWUsIGRpc3BsYXlOYW1lKSB7XG4gICAgICAgIHRoaXMubmFtZSA9IG5hbWU7XG4gICAgICAgIHRoaXMub3duZXI9IG93bmVyO1xuICAgICAgICB0aGlzLmRpc3BsYXlOYW1lPSBkaXNwbGF5TmFtZTtcbiAgICAgICAgdGhpcy5zdGF0ZW1lbnRzID0gW10gO1xuICAgIH1cblxuICAgIGluc2VydFN0YXRlbWVudCh0ZXh0LCBkZXNjcmlwdGlvbiwgbGluZU51bSwgc3VjY2Vzc29yLCB2YXJpYWJsZXMsIG5leHRTdHJhdGVneSwgY2xhc3NzdHlsZSl7XG4gICAgICAgIGxldCBuZXdTdGF0ID0gbmV3IFN0YXRlbWVudCh0ZXh0LCBkZXNjcmlwdGlvbiwgbGluZU51bSwgc3VjY2Vzc29yLCB2YXJpYWJsZXMsIG5leHRTdHJhdGVneSwgY2xhc3NzdHlsZSk7XG4gICAgICAgIHRoaXMuc3RhdGVtZW50cy5wdXNoKG5ld1N0YXQpO1xuICAgIH1cbn1cblxuY2xhc3MgU3RhdGVtZW50e1xuICAgIGNvbnN0cnVjdG9yKHRleHQsIGRlc2NyaXB0aW9uLCBsaW5lTnVtLCBzdWNjZXNzb3IsIHZhcmlhYmxlcywgbmV4dFN0cmF0ZWd5LCBjbGFzc1N0eWxlKXtcbiAgICAgICAgdGhpcy50ZXh0ID0gdGV4dDtcbiAgICAgICAgdGhpcy5kZXNjcmlwdGlvbiA9IGRlc2NyaXB0aW9uO1xuICAgICAgICB0aGlzLmxpbmVOdW0gPSBsaW5lTnVtO1xuICAgICAgICB0aGlzLnN1Y2Nlc3NvciA9IHN1Y2Nlc3NvcjtcbiAgICAgICAgdGhpcy52YXJpYWJsZXMgPSB2YXJpYWJsZXM7XG4gICAgICAgIHRoaXMubmV4dFN0cmF0ZWd5ID0gbmV4dFN0cmF0ZWd5O1xuICAgICAgICB0aGlzLmNsYXNzU3R5bGUgPSBjbGFzc1N0eWxlO1xuICAgIH1cbn1cblxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBTdHJhdGVneTogU3RyYXRlZ3ksXG4gICAgU3RhdGVtZW50OiBTdGF0ZW1lbnRcbn07Il19
