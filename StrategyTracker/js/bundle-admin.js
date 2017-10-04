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

            $scope.publish = function () {
                var editor = ace.edit("aceEditor");
                var ref = firebase.database().ref().child('strategies');
                var x = ref.orderByChild("name").equalTo($scope.selectedStrategy.name);
                x.on("child_added", function (snapshot) {
                    var key = snapshot.key;
                    //firebase.database().ref().child('strategies/'+key).remove()
                    firebase.database().ref().child('strategies/' + key).set(angular.fromJson(angular.toJson(JSON.parse(editor.getValue()))));
                });

                //firebase.database().ref().child('strategies').set(angular.fromJson(angular.toJson(editor.getValue())));

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJhZG1pbi5qcyIsImRhdGFNYW5hZ2VtZW50LmpzIiwic3RyYXRlZ3lNb2RlbC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBLE1BQU0sS0FBSyxRQUFRLHFCQUFSLENBQVg7QUFDQSxNQUFNLGFBQWEsUUFBUSxvQkFBUixDQUFuQjs7QUFFQSxJQUFJLE9BQU8sTUFBUCxLQUFrQixXQUFsQixJQUFpQyxPQUFPLE9BQTVDLEVBQXFEOztBQUVqRCxRQUFJLFVBQVUsUUFBUSxNQUFSLENBQWUsU0FBZixFQUF5QixDQUFDLFFBQUQsQ0FBekIsQ0FBZDs7QUFFQSxZQUFRLE9BQVIsQ0FBZ0IsaUJBQWhCLEVBQW1DLFVBQVMsRUFBVCxFQUFhO0FBQzVDLFlBQUksYUFBWSxFQUFoQjtBQUNBLFlBQUksV0FBVyxHQUFHLEtBQUgsRUFBZjtBQUNBLGlCQUFTLFFBQVQsR0FBb0IsR0FBcEIsQ0FBd0IsWUFBeEIsRUFBc0MsSUFBdEMsQ0FBMkMsT0FBM0MsRUFBb0QsSUFBcEQsQ0FBeUQsVUFBUyxRQUFULEVBQW1CO0FBQ3hFLHFCQUFTLE9BQVQsQ0FBaUIsVUFBUyxhQUFULEVBQXdCO0FBQ3JDLDJCQUFXLElBQVgsQ0FBZ0IsY0FBYyxHQUFkLEVBQWhCO0FBQ0gsYUFGRDtBQUdBLHFCQUFTLE9BQVQsQ0FBaUIsVUFBakI7QUFDSCxTQUxELEVBS0csS0FMSCxDQUtTLFVBQVMsR0FBVCxFQUFjO0FBQ25CLHFCQUFTLE1BQVQsQ0FBZ0IsR0FBaEI7QUFDSCxTQVBEOztBQVNBLGVBQU87QUFDSCxvQkFBUSxZQUFXO0FBQ2YsdUJBQU8sU0FBUyxPQUFoQjtBQUNIO0FBSEUsU0FBUDtBQUtILEtBakJEOztBQW1CQSxZQUFRLFVBQVIsQ0FBbUIsV0FBbkIsRUFBZ0MsVUFBVSxNQUFWLEVBQWtCLGVBQWxCLEVBQW1DO0FBQy9EOztBQUNBLGVBQU8sZ0JBQVAsR0FBMEIsRUFBMUI7QUFD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R0FBa0IsVUFBbEI7QUFDSDtBQVRVOztBQWFmLE9BQU8sT0FBUCxHQUFpQjtBQUNiLGNBQVUsUUFERztBQUViLGVBQVc7QUFGRSxDQUFqQiIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJjb25zdCBkYiA9IHJlcXVpcmUoJy4vZGF0YU1hbmFnZW1lbnQuanMnKTtcbmNvbnN0IHN0cmF0TW9kZWwgPSByZXF1aXJlKCcuL3N0cmF0ZWd5TW9kZWwuanMnKTtcblxuaWYgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnICYmIHdpbmRvdy5hbmd1bGFyKSB7XG5cbiAgICBsZXQgbXlBZG1pbiA9IGFuZ3VsYXIubW9kdWxlKCdteUFkbWluJyxbJ3VpLmFjZSddKTtcblxuICAgIG15QWRtaW4uZmFjdG9yeSgnU3RyYXRlZ3lTZXJ2aWNlJywgZnVuY3Rpb24oJHEpIHtcbiAgICAgICAgbGV0IHN0cmF0ZWdpZXM9IFtdO1xuICAgICAgICBsZXQgZGVmZXJyZWQgPSAkcS5kZWZlcigpO1xuICAgICAgICBmaXJlYmFzZS5kYXRhYmFzZSgpLnJlZignc3RyYXRlZ2llcycpLm9uY2UoJ3ZhbHVlJykudGhlbihmdW5jdGlvbihzbmFwc2hvdCkge1xuICAgICAgICAgICAgc25hcHNob3QuZm9yRWFjaChmdW5jdGlvbihjaGlsZFN0cmF0ZWd5KSB7XG4gICAgICAgICAgICAgICAgc3RyYXRlZ2llcy5wdXNoKGNoaWxkU3RyYXRlZ3kudmFsKCkpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKHN0cmF0ZWdpZXMpO1xuICAgICAgICB9KS5jYXRjaChmdW5jdGlvbihlcnIpIHtcbiAgICAgICAgICAgIGRlZmVycmVkLnJlamVjdChlcnIpO1xuICAgICAgICB9KTtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgZ2V0QWxsOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH07XG4gICAgfSk7XG5cbiAgICBteUFkbWluLmNvbnRyb2xsZXIoJ0FkbWluQ3RybCcsIGZ1bmN0aW9uICgkc2NvcGUsIFN0cmF0ZWd5U2VydmljZSkge1xuICAgICAgICBcInVzZSBzdHJpY3RcIjtcbiAgICAgICAgJHNjb3BlLmN1cnJlbnRTdGF0ZW1lbnQgPSB7fTtcbiAgICAgICAgJHNjb3BlLmN1cnJlbnRTdHJhdGVneSA9IHt9O1xuICAgICAgICBsZXQgbXlTdHJhdCA9IFN0cmF0ZWd5U2VydmljZS5nZXRBbGwoKTtcbiAgICAgICAgbXlTdHJhdC50aGVuKGZ1bmN0aW9uKHN0cmF0ZWdpZXMpIHtcbiAgICAgICAgICAgICRzY29wZS5hbGxTdHJhdGVnaWVzID0gc3RyYXRlZ2llcztcbiAgICAgICAgICAgICRzY29wZS5lZGl0ZWRTdHJhdGVneSA9e307XG5cbiAgICAgICAgICAgICRzY29wZS5hY2VPcHRpb24gPSB7XG4gICAgICAgICAgICAgICAgb25Mb2FkOiBmdW5jdGlvbiAoX2FjZSkge1xuICAgICAgICAgICAgICAgICAgICBfYWNlLmdldFNlc3Npb24oKS5zZXRNb2RlKFwiYWNlL21vZGUvanNvblwiKTtcbiAgICAgICAgICAgICAgICAgICAgX2FjZS5zZXRUaGVtZShcImFjZS90aGVtZS90d2lsaWdodFwiKVxuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuc3RyYXRlZ3lDaGFuZ2VkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgX2FjZS5zZXRWYWx1ZShKU09OLnN0cmluZ2lmeSgkc2NvcGUuc2VsZWN0ZWRTdHJhdGVneSwgbnVsbCwgJ1xcdCcpKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG5cblxuICAgICAgICAgICAgJHNjb3BlLnB1Ymxpc2ggPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgdmFyIGVkaXRvciA9IGFjZS5lZGl0KFwiYWNlRWRpdG9yXCIpO1xuICAgICAgICAgICAgICAgIHZhciByZWY9IGZpcmViYXNlLmRhdGFiYXNlKCkucmVmKCkuY2hpbGQoJ3N0cmF0ZWdpZXMnKTtcbiAgICAgICAgICAgICAgICB2YXIgeD0gcmVmLm9yZGVyQnlDaGlsZChcIm5hbWVcIikuZXF1YWxUbygkc2NvcGUuc2VsZWN0ZWRTdHJhdGVneS5uYW1lKTtcbiAgICAgICAgICAgICAgICB4Lm9uKFwiY2hpbGRfYWRkZWRcIiwgZnVuY3Rpb24oc25hcHNob3QpIHtcbiAgICAgICAgICAgICAgICB2YXIga2V5ID0gc25hcHNob3Qua2V5O1xuICAgICAgICAgICAgICAgIC8vZmlyZWJhc2UuZGF0YWJhc2UoKS5yZWYoKS5jaGlsZCgnc3RyYXRlZ2llcy8nK2tleSkucmVtb3ZlKClcbiAgICAgICAgICAgICAgICAgICAgZmlyZWJhc2UuZGF0YWJhc2UoKS5yZWYoKS5jaGlsZCgnc3RyYXRlZ2llcy8nK2tleSkuc2V0KGFuZ3VsYXIuZnJvbUpzb24oYW5ndWxhci50b0pzb24oSlNPTi5wYXJzZShlZGl0b3IuZ2V0VmFsdWUoKSkpKSk7XG5cbiAgICAgICAgICAgICAgICB9KTtcblxuXG4gICAgICAgICAgICAgICAvL2ZpcmViYXNlLmRhdGFiYXNlKCkucmVmKCkuY2hpbGQoJ3N0cmF0ZWdpZXMnKS5zZXQoYW5ndWxhci5mcm9tSnNvbihhbmd1bGFyLnRvSnNvbihlZGl0b3IuZ2V0VmFsdWUoKSkpKTtcblxuXG4gICAgICAgIH1cbiAgICB9KTtcbiAgICB9KTtcbn07XG4iLCJcblxuXG52YXIgY29uZmlnID0ge1xuICAgIGFwaUtleTogXCJBSXphU3lBWGpMNmY3MzlCVnFMRGtueW1DTjJIMzYtTkJEUzhMdllcIixcbiAgICBhdXRoRG9tYWluOiBcInN0cmF0ZWd5dHJhY2tlci5maXJlYmFzZWFwcC5jb21cIixcbiAgICBkYXRhYmFzZVVSTDogXCJodHRwczovL3N0cmF0ZWd5dHJhY2tlci5maXJlYmFzZWlvLmNvbVwiLFxuICAgIHByb2plY3RJZDogXCJzdHJhdGVneXRyYWNrZXJcIixcbiAgICBzdG9yYWdlQnVja2V0OiBcInN0cmF0ZWd5dHJhY2tlci5hcHBzcG90LmNvbVwiLFxuICAgIG1lc3NhZ2luZ1NlbmRlcklkOiBcIjI2MTI0OTgzNjUxOFwiXG59O1xuZmlyZWJhc2UuaW5pdGlhbGl6ZUFwcChjb25maWcpO1xuXG4iLCIndXNlIHN0cmljdCc7XG5cbmNsYXNzIFN0cmF0ZWd5IHtcblxuICAgIGNvbnN0cnVjdG9yKG93bmVyLCBuYW1lLCBkaXNwbGF5TmFtZSkge1xuICAgICAgICB0aGlzLm5hbWUgPSBuYW1lO1xuICAgICAgICB0aGlzLm93bmVyPSBvd25lcjtcbiAgICAgICAgdGhpcy5kaXNwbGF5TmFtZT0gZGlzcGxheU5hbWU7XG4gICAgICAgIHRoaXMuc3RhdGVtZW50cyA9IFtdIDtcbiAgICB9XG5cbiAgICBpbnNlcnRTdGF0ZW1lbnQodGV4dCwgZGVzY3JpcHRpb24sIGxpbmVOdW0sIHN1Y2Nlc3NvciwgdmFyaWFibGVzLCBuZXh0U3RyYXRlZ3ksIGNsYXNzc3R5bGUpe1xuICAgICAgICBsZXQgbmV3U3RhdCA9IG5ldyBTdGF0ZW1lbnQodGV4dCwgZGVzY3JpcHRpb24sIGxpbmVOdW0sIHN1Y2Nlc3NvciwgdmFyaWFibGVzLCBuZXh0U3RyYXRlZ3ksIGNsYXNzc3R5bGUpO1xuICAgICAgICB0aGlzLnN0YXRlbWVudHMucHVzaChuZXdTdGF0KTtcbiAgICB9XG59XG5cbmNsYXNzIFN0YXRlbWVudHtcbiAgICBjb25zdHJ1Y3Rvcih0ZXh0LCBkZXNjcmlwdGlvbiwgbGluZU51bSwgc3VjY2Vzc29yLCB2YXJpYWJsZXMsIG5leHRTdHJhdGVneSwgY2xhc3NTdHlsZSl7XG4gICAgICAgIHRoaXMudGV4dCA9IHRleHQ7XG4gICAgICAgIHRoaXMuZGVzY3JpcHRpb24gPSBkZXNjcmlwdGlvbjtcbiAgICAgICAgdGhpcy5saW5lTnVtID0gbGluZU51bTtcbiAgICAgICAgdGhpcy5zdWNjZXNzb3IgPSBzdWNjZXNzb3I7XG4gICAgICAgIHRoaXMudmFyaWFibGVzID0gdmFyaWFibGVzO1xuICAgICAgICB0aGlzLm5leHRTdHJhdGVneSA9IG5leHRTdHJhdGVneTtcbiAgICAgICAgdGhpcy5jbGFzc1N0eWxlID0gY2xhc3NTdHlsZTtcbiAgICB9XG59XG5cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgU3RyYXRlZ3k6IFN0cmF0ZWd5LFxuICAgIFN0YXRlbWVudDogU3RhdGVtZW50XG59OyJdfQ==
