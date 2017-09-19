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

        $scope.publish = function () {
            for (var i = 0; i < statements.length; i++) {
                console.log(statements[i]);
            }
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
    constructor(text, description, lineNum, successor, variables, nextStrategy, classstyle) {
        this.text = text;
        this.description = description;
        this.lineNum = lineNum;
        this.successor = successor;
        this.variables = variables;
        this.nextStrategy = nextStrategy;
        this.classStyle = classstyle;
    }
}

module.exports = {
    Strategy: Strategy,
    Statement: Statement
};

},{}]},{},[1])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJhZG1pbi5qcyIsImRhdGFNYW5hZ2VtZW50LmpzIiwic3RyYXRlZ3lNb2RlbC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBLE1BQU0sS0FBSyxRQUFRLHFCQUFSLENBQVg7QUFDQSxNQUFNLGFBQWEsUUFBUSxvQkFBUixDQUFuQjs7QUFFQSxJQUFJLE9BQU8sTUFBUCxLQUFrQixXQUFsQixJQUFpQyxPQUFPLE9BQTVDLEVBQXFEO0FBQ2pELFFBQUksVUFBVSxRQUFRLE1BQVIsQ0FBZSxTQUFmLEVBQXlCLEVBQXpCLENBQWQ7QUFDQSxZQUFRLFVBQVIsQ0FBbUIsV0FBbkIsRUFBZ0MsVUFBVSxNQUFWLEVBQWtCO0FBQzlDOztBQUNBLGVBQU8sZ0JBQVAsR0FBMEIsRUFBMUI7QUFDQSxlQUFPLGVBQVAsR0FBeUIsRUFBekI7O0FBR0EsZUFBTyxjQUFQLEdBQXVCLFlBQVk7QUFDL0IsbUJBQU8sZUFBUCxHQUF5QixJQUFJLFdBQVcsUUFBZixDQUF3QixPQUFPLFdBQVAsQ0FBbUIsS0FBM0MsRUFBaUQsT0FBTyxXQUFQLENBQW1CLElBQXBFLEVBQXlFLE9BQU8sV0FBUCxDQUFtQixXQUE1RixDQUF6Qjs7QUFFQTtBQUNBO0FBQ0E7QUFDSCxTQU5EOztBQVFBLGVBQU8sWUFBUCxHQUFzQixZQUFZO0FBQzlCLGdCQUFJLE9BQVEsT0FBTyxnQkFBUCxDQUF3QixJQUFwQztBQUNBLGdCQUFJLE9BQVEsT0FBTyxnQkFBUCxDQUF3QixXQUFwQztBQUNBLGdCQUFJLE9BQVEsT0FBTyxnQkFBUCxDQUF3QixPQUFwQztBQUNBLGdCQUFJLFlBQWEsT0FBTyxnQkFBUCxDQUF3QixTQUF6QztBQUNBLGdCQUFJLE9BQVEsT0FBTyxnQkFBUCxDQUF3QixTQUFwQztBQUNBLGdCQUFJLFlBQWEsT0FBTyxnQkFBUCxDQUF3QixZQUF6QztBQUNBLGdCQUFJLGFBQWMsT0FBTyxnQkFBUCxDQUF3QixVQUExQzs7QUFFQSxtQkFBTyxlQUFQLENBQXVCLGVBQXZCLENBQXVDLElBQXZDLEVBQTRDLElBQTVDLEVBQWlELElBQWpELEVBQXNELFNBQXRELEVBQWdFLElBQWhFLEVBQXFFLFNBQXJFLEVBQStFLFVBQS9FO0FBQ0EsbUJBQU8sZ0JBQVAsR0FBMEIsRUFBMUI7QUFDSCxTQVhEOztBQWNBLGVBQU8sT0FBUCxHQUFpQixZQUFZO0FBQ3pCLGlCQUFJLElBQUksSUFBRyxDQUFYLEVBQWMsSUFBRSxXQUFXLE1BQTNCLEVBQW1DLEdBQW5DLEVBQ0E7QUFDSSx3QkFBUSxHQUFSLENBQVksV0FBVyxDQUFYLENBQVo7QUFDSDtBQUVKLFNBTkQ7QUFPSCxLQW5DRDtBQW9DSDs7Ozs7QUN0Q0QsSUFBSSxTQUFTO0FBQ1QsWUFBUSx5Q0FEQztBQUVULGdCQUFZLGlDQUZIO0FBR1QsaUJBQWEsd0NBSEo7QUFJVCxlQUFXLGlCQUpGO0FBS1QsbUJBQWUsNkJBTE47QUFNVCx1QkFBbUI7QUFOVixDQUFiO0FBUUEsU0FBUyxhQUFULENBQXVCLE1BQXZCOztBQUVBLFNBQVMsYUFBVCxDQUF1QixNQUF2QixFQUErQixJQUEvQixFQUFxQyxLQUFyQyxFQUE0QyxRQUE1QyxFQUFzRDtBQUNsRCxhQUFTLFFBQVQsR0FBb0IsR0FBcEIsQ0FBd0IsV0FBVyxNQUFuQyxFQUEyQyxHQUEzQyxDQUErQztBQUMzQyxrQkFBVSxJQURpQztBQUUzQyxlQUFPLEtBRm9DO0FBRzNDLHlCQUFrQjtBQUh5QixLQUEvQztBQUtIOzs7QUNuQkQ7O0FBRUEsTUFBTSxRQUFOLENBQWU7O0FBRVgsZ0JBQVksS0FBWixFQUFtQixJQUFuQixFQUF5QixXQUF6QixFQUFzQztBQUNsQyxhQUFLLElBQUwsR0FBWSxJQUFaO0FBQ0EsYUFBSyxLQUFMLEdBQVksS0FBWjtBQUNBLGFBQUssV0FBTCxHQUFrQixXQUFsQjtBQUNBLGFBQUssVUFBTCxHQUFrQixFQUFsQjtBQUNIOztBQUVELG9CQUFnQixJQUFoQixFQUFzQixXQUF0QixFQUFtQyxPQUFuQyxFQUE0QyxTQUE1QyxFQUF1RCxTQUF2RCxFQUFrRSxZQUFsRSxFQUFnRixVQUFoRixFQUEyRjtBQUN2RixZQUFJLFVBQVUsSUFBSSxTQUFKLENBQWMsSUFBZCxFQUFvQixXQUFwQixFQUFpQyxPQUFqQyxFQUEwQyxTQUExQyxFQUFxRCxTQUFyRCxFQUFnRSxZQUFoRSxFQUE4RSxVQUE5RSxDQUFkO0FBQ0EsYUFBSyxVQUFMLENBQWdCLElBQWhCLENBQXFCLE9BQXJCO0FBQ0g7QUFaVTs7QUFlZixNQUFNLFNBQU4sQ0FBZTtBQUNYLGdCQUFZLElBQVosRUFBa0IsV0FBbEIsRUFBK0IsT0FBL0IsRUFBd0MsU0FBeEMsRUFBbUQsU0FBbkQsRUFBOEQsWUFBOUQsRUFBNEUsVUFBNUUsRUFBdUY7QUFDbkYsYUFBSyxJQUFMLEdBQVksSUFBWjtBQUNBLGFBQUssV0FBTCxHQUFtQixXQUFuQjtBQUNBLGFBQUssT0FBTCxHQUFlLE9BQWY7QUFDQSxhQUFLLFNBQUwsR0FBaUIsU0FBakI7QUFDQSxhQUFLLFNBQUwsR0FBaUIsU0FBakI7QUFDQSxhQUFLLFlBQUwsR0FBb0IsWUFBcEI7QUFDQSxhQUFLLFVBQUwsR0FBa0IsVUFBbEI7QUFDSDtBQVRVOztBQWFmLE9BQU8sT0FBUCxHQUFpQjtBQUNiLGNBQVUsUUFERztBQUViLGVBQVc7QUFGRSxDQUFqQiIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJjb25zdCBkYiA9IHJlcXVpcmUoJy4vZGF0YU1hbmFnZW1lbnQuanMnKTtcbmNvbnN0IHN0cmF0TW9kZWwgPSByZXF1aXJlKCcuL3N0cmF0ZWd5TW9kZWwuanMnKTtcblxuaWYgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnICYmIHdpbmRvdy5hbmd1bGFyKSB7XG4gICAgbGV0IG15QWRtaW4gPSBhbmd1bGFyLm1vZHVsZSgnbXlBZG1pbicsW10pO1xuICAgIG15QWRtaW4uY29udHJvbGxlcignQWRtaW5DdHJsJywgZnVuY3Rpb24gKCRzY29wZSkge1xuICAgICAgICBcInVzZSBzdHJpY3RcIjtcbiAgICAgICAgJHNjb3BlLmN1cnJlbnRTdGF0ZW1lbnQgPSB7fTtcbiAgICAgICAgJHNjb3BlLmN1cnJlbnRTdHJhdGVneSA9IHt9O1xuXG5cbiAgICAgICAgJHNjb3BlLmNyZWF0ZVN0cmF0ZWd5PSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAkc2NvcGUuY3VycmVudFN0cmF0ZWd5ID0gbmV3IHN0cmF0TW9kZWwuU3RyYXRlZ3koJHNjb3BlLm5ld1N0cmF0ZWd5Lm93bmVyLCRzY29wZS5uZXdTdHJhdGVneS5uYW1lLCRzY29wZS5uZXdTdHJhdGVneS5kaXNwbGF5TmFtZSApO1xuXG4gICAgICAgICAgICAvLyBmb3IodmFyIGkgPTA7aTxzdHJhdGVnaWVzLmxlbmd0aDsgaSsrKXtcbiAgICAgICAgICAgIC8vICAgICB2YXIga2V5ID0gZmlyZWJhc2UuZGF0YWJhc2UoKS5yZWYoKS5jaGlsZCgnc3RyYXRlZ2llcycpLnB1c2gobmV3U3RyYXRlZ3kpO1xuICAgICAgICAgICAgLy8gfVxuICAgICAgICB9XG5cbiAgICAgICAgJHNjb3BlLmFkZFN0YXRlbWVudCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciB0ZXh0ID0gICRzY29wZS5jdXJyZW50U3RhdGVtZW50LnRleHQ7XG4gICAgICAgICAgICB2YXIgZGVzYyA9ICAkc2NvcGUuY3VycmVudFN0YXRlbWVudC5kZXNjcmlwdGlvbjtcbiAgICAgICAgICAgIHZhciBsTnVtID0gICRzY29wZS5jdXJyZW50U3RhdGVtZW50LmxpbmVOdW07XG4gICAgICAgICAgICB2YXIgc3VjY2Vzc29yID0gICRzY29wZS5jdXJyZW50U3RhdGVtZW50LnN1Y2Nlc3NvcjtcbiAgICAgICAgICAgIHZhciB2YXJzID0gICRzY29wZS5jdXJyZW50U3RhdGVtZW50LnZhcmlhYmxlcztcbiAgICAgICAgICAgIHZhciBuZXh0U3RyYXQgPSAgJHNjb3BlLmN1cnJlbnRTdGF0ZW1lbnQubmV4dFN0cmF0ZWd5O1xuICAgICAgICAgICAgdmFyIGNsYXNzU3R5bGUgPSAgJHNjb3BlLmN1cnJlbnRTdGF0ZW1lbnQuY2xhc3NTdHlsZTtcblxuICAgICAgICAgICAgJHNjb3BlLmN1cnJlbnRTdHJhdGVneS5pbnNlcnRTdGF0ZW1lbnQodGV4dCxkZXNjLGxOdW0sc3VjY2Vzc29yLHZhcnMsbmV4dFN0cmF0LGNsYXNzU3R5bGUpO1xuICAgICAgICAgICAgJHNjb3BlLmN1cnJlbnRTdGF0ZW1lbnQgPSB7fTtcbiAgICAgICAgfVxuXG5cbiAgICAgICAgJHNjb3BlLnB1Ymxpc2ggPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBmb3IodmFyIGk9IDA7IGk8c3RhdGVtZW50cy5sZW5ndGg7IGkrKylcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhzdGF0ZW1lbnRzW2ldKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICB9XG4gICAgfSk7XG59O1xuIiwiXG5cblxudmFyIGNvbmZpZyA9IHtcbiAgICBhcGlLZXk6IFwiQUl6YVN5QVhqTDZmNzM5QlZxTERrbnltQ04ySDM2LU5CRFM4THZZXCIsXG4gICAgYXV0aERvbWFpbjogXCJzdHJhdGVneXRyYWNrZXIuZmlyZWJhc2VhcHAuY29tXCIsXG4gICAgZGF0YWJhc2VVUkw6IFwiaHR0cHM6Ly9zdHJhdGVneXRyYWNrZXIuZmlyZWJhc2Vpby5jb21cIixcbiAgICBwcm9qZWN0SWQ6IFwic3RyYXRlZ3l0cmFja2VyXCIsXG4gICAgc3RvcmFnZUJ1Y2tldDogXCJzdHJhdGVneXRyYWNrZXIuYXBwc3BvdC5jb21cIixcbiAgICBtZXNzYWdpbmdTZW5kZXJJZDogXCIyNjEyNDk4MzY1MThcIlxufTtcbmZpcmViYXNlLmluaXRpYWxpemVBcHAoY29uZmlnKTtcblxuZnVuY3Rpb24gd3JpdGVVc2VyRGF0YSh1c2VySWQsIG5hbWUsIGVtYWlsLCBpbWFnZVVybCkge1xuICAgIGZpcmViYXNlLmRhdGFiYXNlKCkucmVmKCd1c2Vycy8nICsgdXNlcklkKS5zZXQoe1xuICAgICAgICB1c2VybmFtZTogbmFtZSxcbiAgICAgICAgZW1haWw6IGVtYWlsLFxuICAgICAgICBwcm9maWxlX3BpY3R1cmUgOiBpbWFnZVVybFxuICAgIH0pO1xufSIsIid1c2Ugc3RyaWN0JztcblxuY2xhc3MgU3RyYXRlZ3kge1xuXG4gICAgY29uc3RydWN0b3Iob3duZXIsIG5hbWUsIGRpc3BsYXlOYW1lKSB7XG4gICAgICAgIHRoaXMubmFtZSA9IG5hbWU7XG4gICAgICAgIHRoaXMub3duZXI9IG93bmVyO1xuICAgICAgICB0aGlzLmRpc3BsYXlOYW1lPSBkaXNwbGF5TmFtZTtcbiAgICAgICAgdGhpcy5zdGF0ZW1lbnRzID0gW10gO1xuICAgIH1cblxuICAgIGluc2VydFN0YXRlbWVudCh0ZXh0LCBkZXNjcmlwdGlvbiwgbGluZU51bSwgc3VjY2Vzc29yLCB2YXJpYWJsZXMsIG5leHRTdHJhdGVneSwgY2xhc3NzdHlsZSl7XG4gICAgICAgIGxldCBuZXdTdGF0ID0gbmV3IFN0YXRlbWVudCh0ZXh0LCBkZXNjcmlwdGlvbiwgbGluZU51bSwgc3VjY2Vzc29yLCB2YXJpYWJsZXMsIG5leHRTdHJhdGVneSwgY2xhc3NzdHlsZSk7XG4gICAgICAgIHRoaXMuc3RhdGVtZW50cy5wdXNoKG5ld1N0YXQpO1xuICAgIH1cbn1cblxuY2xhc3MgU3RhdGVtZW50e1xuICAgIGNvbnN0cnVjdG9yKHRleHQsIGRlc2NyaXB0aW9uLCBsaW5lTnVtLCBzdWNjZXNzb3IsIHZhcmlhYmxlcywgbmV4dFN0cmF0ZWd5LCBjbGFzc3N0eWxlKXtcbiAgICAgICAgdGhpcy50ZXh0ID0gdGV4dDtcbiAgICAgICAgdGhpcy5kZXNjcmlwdGlvbiA9IGRlc2NyaXB0aW9uO1xuICAgICAgICB0aGlzLmxpbmVOdW0gPSBsaW5lTnVtO1xuICAgICAgICB0aGlzLnN1Y2Nlc3NvciA9IHN1Y2Nlc3NvcjtcbiAgICAgICAgdGhpcy52YXJpYWJsZXMgPSB2YXJpYWJsZXM7XG4gICAgICAgIHRoaXMubmV4dFN0cmF0ZWd5ID0gbmV4dFN0cmF0ZWd5O1xuICAgICAgICB0aGlzLmNsYXNzU3R5bGUgPSBjbGFzc3N0eWxlO1xuICAgIH1cbn1cblxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBTdHJhdGVneTogU3RyYXRlZ3ksXG4gICAgU3RhdGVtZW50OiBTdGF0ZW1lbnRcbn07Il19
