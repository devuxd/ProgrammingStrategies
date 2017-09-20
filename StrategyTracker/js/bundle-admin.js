(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
const db = require('./dataManagement.js');
const stratModel = require('./strategyModel.js');

if (typeof window !== 'undefined' && window.angular) {
    let myAdmin = angular.module('myAdmin', []);
    myAdmin.controller('AdminCtrl', function ($scope) {
        "use strict";

        $scope.currentStatement = {};
        $scope.currentStrategy = {};

        $scope.createStrategy = function () {
            $scope.currentStrategy = new stratModel.Strategy($scope.newStrategy.owner, $scope.newStrategy.name, $scope.newStrategy.displayName);

            // for(var i =0;i<strategies.length; i++){
            //     var key = firebase.database().ref().child('strategies').push(newStrategy);
            // }
        };

        $scope.addStatement = function () {
            var text = $scope.currentStatement.text;
            var desc = $scope.currentStatement.description;
            var lNum = $scope.currentStatement.lineNum;
            var successor = $scope.currentStatement.successor;
            var vars = $scope.currentStatement.variables;
            var nextStrat = $scope.currentStatement.nextStrategy;
            var classStyle = $scope.currentStatement.classStyle;

            $scope.currentStrategy.insertStatement(text, desc, lNum, successor, vars, nextStrat, classStyle);
            $scope.currentStatement = {};
        };
        $scope.accordion = {
            current: null
        };

        $scope.editCurrentStatement - function () {};

        $scope.publish = function () {
            firebase.database().ref().child($scope.currentStrategy.name).push(angular.fromJson(angular.toJson($scope.currentStrategy)));
        };
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

function writeUserData(userId, name, email, imageUrl) {
    firebase.database().ref('users/' + userId).set({
        username: name,
        email: email,
        profile_picture: imageUrl
    });
}

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJhZG1pbi5qcyIsImRhdGFNYW5hZ2VtZW50LmpzIiwic3RyYXRlZ3lNb2RlbC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBLE1BQU0sS0FBSyxRQUFRLHFCQUFSLENBQVg7QUFDQSxNQUFNLGFBQWEsUUFBUSxvQkFBUixDQUFuQjs7QUFFQSxJQUFJLE9BQU8sTUFBUCxLQUFrQixXQUFsQixJQUFpQyxPQUFPLE9BQTVDLEVBQXFEO0FBQ2pELFFBQUksVUFBVSxRQUFRLE1BQVIsQ0FBZSxTQUFmLEVBQXlCLEVBQXpCLENBQWQ7QUFDQSxZQUFRLFVBQVIsQ0FBbUIsV0FBbkIsRUFBZ0MsVUFBVSxNQUFWLEVBQWtCO0FBQzlDOztBQUNBLGVBQU8sZ0JBQVAsR0FBMEIsRUFBMUI7QUFDQSxlQUFPLGVBQVAsR0FBeUIsRUFBekI7O0FBR0EsZUFBTyxjQUFQLEdBQXVCLFlBQVk7QUFDL0IsbUJBQU8sZUFBUCxHQUF5QixJQUFJLFdBQVcsUUFBZixDQUF3QixPQUFPLFdBQVAsQ0FBbUIsS0FBM0MsRUFBaUQsT0FBTyxXQUFQLENBQW1CLElBQXBFLEVBQXlFLE9BQU8sV0FBUCxDQUFtQixXQUE1RixDQUF6Qjs7QUFFQTtBQUNBO0FBQ0E7QUFDSCxTQU5EOztBQVFBLGVBQU8sWUFBUCxHQUFzQixZQUFZO0FBQzlCLGdCQUFJLE9BQVEsT0FBTyxnQkFBUCxDQUF3QixJQUFwQztBQUNBLGdCQUFJLE9BQVEsT0FBTyxnQkFBUCxDQUF3QixXQUFwQztBQUNBLGdCQUFJLE9BQVEsT0FBTyxnQkFBUCxDQUF3QixPQUFwQztBQUNBLGdCQUFJLFlBQWEsT0FBTyxnQkFBUCxDQUF3QixTQUF6QztBQUNBLGdCQUFJLE9BQVEsT0FBTyxnQkFBUCxDQUF3QixTQUFwQztBQUNBLGdCQUFJLFlBQWEsT0FBTyxnQkFBUCxDQUF3QixZQUF6QztBQUNBLGdCQUFJLGFBQWMsT0FBTyxnQkFBUCxDQUF3QixVQUExQzs7QUFFQSxtQkFBTyxlQUFQLENBQXVCLGVBQXZCLENBQXVDLElBQXZDLEVBQTRDLElBQTVDLEVBQWlELElBQWpELEVBQXNELFNBQXRELEVBQWdFLElBQWhFLEVBQXFFLFNBQXJFLEVBQStFLFVBQS9FO0FBQ0EsbUJBQU8sZ0JBQVAsR0FBMEIsRUFBMUI7QUFDSCxTQVhEO0FBWUEsZUFBTyxTQUFQLEdBQW1CO0FBQ2YscUJBQVM7QUFETSxTQUFuQjs7QUFJQSxlQUFPLG9CQUFQLEdBQTZCLFlBQVksQ0FHeEMsQ0FIRDs7QUFNQSxlQUFPLE9BQVAsR0FBaUIsWUFBWTtBQUN6QixxQkFBUyxRQUFULEdBQW9CLEdBQXBCLEdBQTBCLEtBQTFCLENBQWdDLE9BQU8sZUFBUCxDQUF1QixJQUF2RCxFQUE2RCxJQUE3RCxDQUFrRSxRQUFRLFFBQVIsQ0FBaUIsUUFBUSxNQUFSLENBQWUsT0FBTyxlQUF0QixDQUFqQixDQUFsRTtBQUNILFNBRkQ7QUFHSCxLQXZDRDtBQXdDSDs7Ozs7QUMxQ0QsSUFBSSxTQUFTO0FBQ1QsWUFBUSx5Q0FEQztBQUVULGdCQUFZLGlDQUZIO0FBR1QsaUJBQWEsd0NBSEo7QUFJVCxlQUFXLGlCQUpGO0FBS1QsbUJBQWUsNkJBTE47QUFNVCx1QkFBbUI7QUFOVixDQUFiO0FBUUEsU0FBUyxhQUFULENBQXVCLE1BQXZCOztBQUVBLFNBQVMsYUFBVCxDQUF1QixNQUF2QixFQUErQixJQUEvQixFQUFxQyxLQUFyQyxFQUE0QyxRQUE1QyxFQUFzRDtBQUNsRCxhQUFTLFFBQVQsR0FBb0IsR0FBcEIsQ0FBd0IsV0FBVyxNQUFuQyxFQUEyQyxHQUEzQyxDQUErQztBQUMzQyxrQkFBVSxJQURpQztBQUUzQyxlQUFPLEtBRm9DO0FBRzNDLHlCQUFrQjtBQUh5QixLQUEvQztBQUtIOzs7QUNuQkQ7O0FBRUEsTUFBTSxRQUFOLENBQWU7O0FBRVgsZ0JBQVksS0FBWixFQUFtQixJQUFuQixFQUF5QixXQUF6QixFQUFzQztBQUNsQyxhQUFLLElBQUwsR0FBWSxJQUFaO0FBQ0EsYUFBSyxLQUFMLEdBQVksS0FBWjtBQUNBLGFBQUssV0FBTCxHQUFrQixXQUFsQjtBQUNBLGFBQUssVUFBTCxHQUFrQixFQUFsQjtBQUNIOztBQUVELG9CQUFnQixJQUFoQixFQUFzQixXQUF0QixFQUFtQyxPQUFuQyxFQUE0QyxTQUE1QyxFQUF1RCxTQUF2RCxFQUFrRSxZQUFsRSxFQUFnRixVQUFoRixFQUEyRjtBQUN2RixZQUFJLFVBQVUsSUFBSSxTQUFKLENBQWMsSUFBZCxFQUFvQixXQUFwQixFQUFpQyxPQUFqQyxFQUEwQyxTQUExQyxFQUFxRCxTQUFyRCxFQUFnRSxZQUFoRSxFQUE4RSxVQUE5RSxDQUFkO0FBQ0EsYUFBSyxVQUFMLENBQWdCLElBQWhCLENBQXFCLE9BQXJCO0FBQ0g7QUFaVTs7QUFlZixNQUFNLFNBQU4sQ0FBZTtBQUNYLGdCQUFZLElBQVosRUFBa0IsV0FBbEIsRUFBK0IsT0FBL0IsRUFBd0MsU0FBeEMsRUFBbUQsU0FBbkQsRUFBOEQsWUFBOUQsRUFBNEUsVUFBNUUsRUFBdUY7QUFDbkYsYUFBSyxJQUFMLEdBQVksSUFBWjtBQUNBLGFBQUssV0FBTCxHQUFtQixXQUFuQjtBQUNBLGFBQUssT0FBTCxHQUFlLE9BQWY7QUFDQSxhQUFLLFNBQUwsR0FBaUIsU0FBakI7QUFDQSxhQUFLLFNBQUwsR0FBaUIsU0FBakI7QUFDQSxhQUFLLFlBQUwsR0FBb0IsWUFBcEI7QUFDQSxhQUFLLFVBQUwsR0FBa0IsVUFBbEI7QUFDSDtBQVRVOztBQWFmLE9BQU8sT0FBUCxHQUFpQjtBQUNiLGNBQVUsUUFERztBQUViLGVBQVc7QUFGRSxDQUFqQiIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJjb25zdCBkYiA9IHJlcXVpcmUoJy4vZGF0YU1hbmFnZW1lbnQuanMnKTtcbmNvbnN0IHN0cmF0TW9kZWwgPSByZXF1aXJlKCcuL3N0cmF0ZWd5TW9kZWwuanMnKTtcblxuaWYgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnICYmIHdpbmRvdy5hbmd1bGFyKSB7XG4gICAgbGV0IG15QWRtaW4gPSBhbmd1bGFyLm1vZHVsZSgnbXlBZG1pbicsW10pO1xuICAgIG15QWRtaW4uY29udHJvbGxlcignQWRtaW5DdHJsJywgZnVuY3Rpb24gKCRzY29wZSkge1xuICAgICAgICBcInVzZSBzdHJpY3RcIjtcbiAgICAgICAgJHNjb3BlLmN1cnJlbnRTdGF0ZW1lbnQgPSB7fTtcbiAgICAgICAgJHNjb3BlLmN1cnJlbnRTdHJhdGVneSA9IHt9O1xuXG5cbiAgICAgICAgJHNjb3BlLmNyZWF0ZVN0cmF0ZWd5PSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAkc2NvcGUuY3VycmVudFN0cmF0ZWd5ID0gbmV3IHN0cmF0TW9kZWwuU3RyYXRlZ3koJHNjb3BlLm5ld1N0cmF0ZWd5Lm93bmVyLCRzY29wZS5uZXdTdHJhdGVneS5uYW1lLCRzY29wZS5uZXdTdHJhdGVneS5kaXNwbGF5TmFtZSApO1xuXG4gICAgICAgICAgICAvLyBmb3IodmFyIGkgPTA7aTxzdHJhdGVnaWVzLmxlbmd0aDsgaSsrKXtcbiAgICAgICAgICAgIC8vICAgICB2YXIga2V5ID0gZmlyZWJhc2UuZGF0YWJhc2UoKS5yZWYoKS5jaGlsZCgnc3RyYXRlZ2llcycpLnB1c2gobmV3U3RyYXRlZ3kpO1xuICAgICAgICAgICAgLy8gfVxuICAgICAgICB9XG5cbiAgICAgICAgJHNjb3BlLmFkZFN0YXRlbWVudCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciB0ZXh0ID0gICRzY29wZS5jdXJyZW50U3RhdGVtZW50LnRleHQ7XG4gICAgICAgICAgICB2YXIgZGVzYyA9ICAkc2NvcGUuY3VycmVudFN0YXRlbWVudC5kZXNjcmlwdGlvbjtcbiAgICAgICAgICAgIHZhciBsTnVtID0gICRzY29wZS5jdXJyZW50U3RhdGVtZW50LmxpbmVOdW07XG4gICAgICAgICAgICB2YXIgc3VjY2Vzc29yID0gICRzY29wZS5jdXJyZW50U3RhdGVtZW50LnN1Y2Nlc3NvcjtcbiAgICAgICAgICAgIHZhciB2YXJzID0gICRzY29wZS5jdXJyZW50U3RhdGVtZW50LnZhcmlhYmxlcztcbiAgICAgICAgICAgIHZhciBuZXh0U3RyYXQgPSAgJHNjb3BlLmN1cnJlbnRTdGF0ZW1lbnQubmV4dFN0cmF0ZWd5O1xuICAgICAgICAgICAgdmFyIGNsYXNzU3R5bGUgPSAgJHNjb3BlLmN1cnJlbnRTdGF0ZW1lbnQuY2xhc3NTdHlsZTtcblxuICAgICAgICAgICAgJHNjb3BlLmN1cnJlbnRTdHJhdGVneS5pbnNlcnRTdGF0ZW1lbnQodGV4dCxkZXNjLGxOdW0sc3VjY2Vzc29yLHZhcnMsbmV4dFN0cmF0LGNsYXNzU3R5bGUpO1xuICAgICAgICAgICAgJHNjb3BlLmN1cnJlbnRTdGF0ZW1lbnQgPSB7fTtcbiAgICAgICAgfVxuICAgICAgICAkc2NvcGUuYWNjb3JkaW9uID0ge1xuICAgICAgICAgICAgY3VycmVudDogbnVsbFxuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS5lZGl0Q3VycmVudFN0YXRlbWVudC0gZnVuY3Rpb24gKCkge1xuXG5cbiAgICAgICAgfVxuXG5cbiAgICAgICAgJHNjb3BlLnB1Ymxpc2ggPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBmaXJlYmFzZS5kYXRhYmFzZSgpLnJlZigpLmNoaWxkKCRzY29wZS5jdXJyZW50U3RyYXRlZ3kubmFtZSkucHVzaChhbmd1bGFyLmZyb21Kc29uKGFuZ3VsYXIudG9Kc29uKCRzY29wZS5jdXJyZW50U3RyYXRlZ3kpKSk7XG4gICAgICAgIH1cbiAgICB9KTtcbn07XG4iLCJcblxuXG52YXIgY29uZmlnID0ge1xuICAgIGFwaUtleTogXCJBSXphU3lBWGpMNmY3MzlCVnFMRGtueW1DTjJIMzYtTkJEUzhMdllcIixcbiAgICBhdXRoRG9tYWluOiBcInN0cmF0ZWd5dHJhY2tlci5maXJlYmFzZWFwcC5jb21cIixcbiAgICBkYXRhYmFzZVVSTDogXCJodHRwczovL3N0cmF0ZWd5dHJhY2tlci5maXJlYmFzZWlvLmNvbVwiLFxuICAgIHByb2plY3RJZDogXCJzdHJhdGVneXRyYWNrZXJcIixcbiAgICBzdG9yYWdlQnVja2V0OiBcInN0cmF0ZWd5dHJhY2tlci5hcHBzcG90LmNvbVwiLFxuICAgIG1lc3NhZ2luZ1NlbmRlcklkOiBcIjI2MTI0OTgzNjUxOFwiXG59O1xuZmlyZWJhc2UuaW5pdGlhbGl6ZUFwcChjb25maWcpO1xuXG5mdW5jdGlvbiB3cml0ZVVzZXJEYXRhKHVzZXJJZCwgbmFtZSwgZW1haWwsIGltYWdlVXJsKSB7XG4gICAgZmlyZWJhc2UuZGF0YWJhc2UoKS5yZWYoJ3VzZXJzLycgKyB1c2VySWQpLnNldCh7XG4gICAgICAgIHVzZXJuYW1lOiBuYW1lLFxuICAgICAgICBlbWFpbDogZW1haWwsXG4gICAgICAgIHByb2ZpbGVfcGljdHVyZSA6IGltYWdlVXJsXG4gICAgfSk7XG59IiwiJ3VzZSBzdHJpY3QnO1xuXG5jbGFzcyBTdHJhdGVneSB7XG5cbiAgICBjb25zdHJ1Y3Rvcihvd25lciwgbmFtZSwgZGlzcGxheU5hbWUpIHtcbiAgICAgICAgdGhpcy5uYW1lID0gbmFtZTtcbiAgICAgICAgdGhpcy5vd25lcj0gb3duZXI7XG4gICAgICAgIHRoaXMuZGlzcGxheU5hbWU9IGRpc3BsYXlOYW1lO1xuICAgICAgICB0aGlzLnN0YXRlbWVudHMgPSBbXSA7XG4gICAgfVxuXG4gICAgaW5zZXJ0U3RhdGVtZW50KHRleHQsIGRlc2NyaXB0aW9uLCBsaW5lTnVtLCBzdWNjZXNzb3IsIHZhcmlhYmxlcywgbmV4dFN0cmF0ZWd5LCBjbGFzc3N0eWxlKXtcbiAgICAgICAgbGV0IG5ld1N0YXQgPSBuZXcgU3RhdGVtZW50KHRleHQsIGRlc2NyaXB0aW9uLCBsaW5lTnVtLCBzdWNjZXNzb3IsIHZhcmlhYmxlcywgbmV4dFN0cmF0ZWd5LCBjbGFzc3N0eWxlKTtcbiAgICAgICAgdGhpcy5zdGF0ZW1lbnRzLnB1c2gobmV3U3RhdCk7XG4gICAgfVxufVxuXG5jbGFzcyBTdGF0ZW1lbnR7XG4gICAgY29uc3RydWN0b3IodGV4dCwgZGVzY3JpcHRpb24sIGxpbmVOdW0sIHN1Y2Nlc3NvciwgdmFyaWFibGVzLCBuZXh0U3RyYXRlZ3ksIGNsYXNzU3R5bGUpe1xuICAgICAgICB0aGlzLnRleHQgPSB0ZXh0O1xuICAgICAgICB0aGlzLmRlc2NyaXB0aW9uID0gZGVzY3JpcHRpb247XG4gICAgICAgIHRoaXMubGluZU51bSA9IGxpbmVOdW07XG4gICAgICAgIHRoaXMuc3VjY2Vzc29yID0gc3VjY2Vzc29yO1xuICAgICAgICB0aGlzLnZhcmlhYmxlcyA9IHZhcmlhYmxlcztcbiAgICAgICAgdGhpcy5uZXh0U3RyYXRlZ3kgPSBuZXh0U3RyYXRlZ3k7XG4gICAgICAgIHRoaXMuY2xhc3NTdHlsZSA9IGNsYXNzU3R5bGU7XG4gICAgfVxufVxuXG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIFN0cmF0ZWd5OiBTdHJhdGVneSxcbiAgICBTdGF0ZW1lbnQ6IFN0YXRlbWVudFxufTsiXX0=
