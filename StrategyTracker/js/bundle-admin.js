(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
const db = require('./dataManagement.js');
const stratModel = require('./strategyModel.js');

if (typeof window !== 'undefined' && window.angular) {

    let myAdmin = angular.module('myAdmin', []);
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

            $scope.createStrategy = function () {
                $scope.currentStrategy = new stratModel.Strategy($scope.newStrategy.owner, $scope.newStrategy.name, $scope.newStrategy.displayName);
            };

            $scope.editCurrentStatement - function () {};

            $scope.publish = function () {
                firebase.database().ref().child('strategies').push(angular.fromJson(angular.toJson($scope.currentStrategy)));
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJhZG1pbi5qcyIsImRhdGFNYW5hZ2VtZW50LmpzIiwic3RyYXRlZ3lNb2RlbC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBLE1BQU0sS0FBSyxRQUFRLHFCQUFSLENBQVg7QUFDQSxNQUFNLGFBQWEsUUFBUSxvQkFBUixDQUFuQjs7QUFFQSxJQUFJLE9BQU8sTUFBUCxLQUFrQixXQUFsQixJQUFpQyxPQUFPLE9BQTVDLEVBQXFEOztBQUVqRCxRQUFJLFVBQVUsUUFBUSxNQUFSLENBQWUsU0FBZixFQUF5QixFQUF6QixDQUFkO0FBQ0EsWUFBUSxPQUFSLENBQWdCLGlCQUFoQixFQUFtQyxVQUFTLEVBQVQsRUFBYTtBQUM1QyxZQUFJLGFBQVksRUFBaEI7QUFDQSxZQUFJLFdBQVcsR0FBRyxLQUFILEVBQWY7QUFDQSxpQkFBUyxRQUFULEdBQW9CLEdBQXBCLENBQXdCLFlBQXhCLEVBQXNDLElBQXRDLENBQTJDLE9BQTNDLEVBQW9ELElBQXBELENBQXlELFVBQVMsUUFBVCxFQUFtQjtBQUN4RSxxQkFBUyxPQUFULENBQWlCLFVBQVMsYUFBVCxFQUF3QjtBQUNyQywyQkFBVyxJQUFYLENBQWdCLGNBQWMsR0FBZCxFQUFoQjtBQUNILGFBRkQ7QUFHQSxxQkFBUyxPQUFULENBQWlCLFVBQWpCO0FBQ0gsU0FMRCxFQUtHLEtBTEgsQ0FLUyxVQUFTLEdBQVQsRUFBYztBQUNuQixxQkFBUyxNQUFULENBQWdCLEdBQWhCO0FBQ0gsU0FQRDs7QUFTQSxlQUFPO0FBQ0gsb0JBQVEsWUFBVztBQUNmLHVCQUFPLFNBQVMsT0FBaEI7QUFDSDtBQUhFLFNBQVA7QUFLSCxLQWpCRDs7QUFxQkEsWUFBUSxVQUFSLENBQW1CLFdBQW5CLEVBQWdDLFVBQVUsTUFBVixFQUFrQixlQUFsQixFQUFtQztBQUMvRDs7QUFDQSxlQUFPLGdCQUFQLEdBQTBCLEVBQTFCO0FBQ0EsZUFBTyxlQUFQLEdBQXlCLEVBQXpCO0FBQ0EsWUFBSSxVQUFVLGdCQUFnQixNQUFoQixFQUFkO0FBQ0EsZ0JBQVEsSUFBUixDQUFhLFVBQVMsVUFBVCxFQUFxQjtBQUM5QixtQkFBTyxhQUFQLEdBQXVCLFVBQXZCOztBQUdKLG1CQUFPLGNBQVAsR0FBdUIsWUFBWTtBQUMvQix1QkFBTyxlQUFQLEdBQXlCLElBQUksV0FBVyxRQUFmLENBQXdCLE9BQU8sV0FBUCxDQUFtQixLQUEzQyxFQUFpRCxPQUFPLFdBQVAsQ0FBbUIsSUFBcEUsRUFBeUUsT0FBTyxXQUFQLENBQW1CLFdBQTVGLENBQXpCO0FBQ0gsYUFGRDs7QUFLQSxtQkFBTyxvQkFBUCxHQUE2QixZQUFZLENBR3hDLENBSEQ7O0FBTUEsbUJBQU8sT0FBUCxHQUFpQixZQUFZO0FBQ3pCLHlCQUFTLFFBQVQsR0FBb0IsR0FBcEIsR0FBMEIsS0FBMUIsQ0FBZ0MsWUFBaEMsRUFBOEMsSUFBOUMsQ0FBbUQsUUFBUSxRQUFSLENBQWlCLFFBQVEsTUFBUixDQUFlLE9BQU8sZUFBdEIsQ0FBakIsQ0FBbkQ7QUFDSCxhQUZEO0FBR0gsU0FsQkc7QUFtQkgsS0F4QkQ7QUF5Qkg7Ozs7O0FDakRELElBQUksU0FBUztBQUNULFlBQVEseUNBREM7QUFFVCxnQkFBWSxpQ0FGSDtBQUdULGlCQUFhLHdDQUhKO0FBSVQsZUFBVyxpQkFKRjtBQUtULG1CQUFlLDZCQUxOO0FBTVQsdUJBQW1CO0FBTlYsQ0FBYjtBQVFBLFNBQVMsYUFBVCxDQUF1QixNQUF2Qjs7QUFFQSxTQUFTLGFBQVQsQ0FBdUIsTUFBdkIsRUFBK0IsSUFBL0IsRUFBcUMsS0FBckMsRUFBNEMsUUFBNUMsRUFBc0Q7QUFDbEQsYUFBUyxRQUFULEdBQW9CLEdBQXBCLENBQXdCLFdBQVcsTUFBbkMsRUFBMkMsR0FBM0MsQ0FBK0M7QUFDM0Msa0JBQVUsSUFEaUM7QUFFM0MsZUFBTyxLQUZvQztBQUczQyx5QkFBa0I7QUFIeUIsS0FBL0M7QUFLSDs7O0FDbkJEOztBQUVBLE1BQU0sUUFBTixDQUFlOztBQUVYLGdCQUFZLEtBQVosRUFBbUIsSUFBbkIsRUFBeUIsV0FBekIsRUFBc0M7QUFDbEMsYUFBSyxJQUFMLEdBQVksSUFBWjtBQUNBLGFBQUssS0FBTCxHQUFZLEtBQVo7QUFDQSxhQUFLLFdBQUwsR0FBa0IsV0FBbEI7QUFDQSxhQUFLLFVBQUwsR0FBa0IsRUFBbEI7QUFDSDs7QUFFRCxvQkFBZ0IsSUFBaEIsRUFBc0IsV0FBdEIsRUFBbUMsT0FBbkMsRUFBNEMsU0FBNUMsRUFBdUQsU0FBdkQsRUFBa0UsWUFBbEUsRUFBZ0YsVUFBaEYsRUFBMkY7QUFDdkYsWUFBSSxVQUFVLElBQUksU0FBSixDQUFjLElBQWQsRUFBb0IsV0FBcEIsRUFBaUMsT0FBakMsRUFBMEMsU0FBMUMsRUFBcUQsU0FBckQsRUFBZ0UsWUFBaEUsRUFBOEUsVUFBOUUsQ0FBZDtBQUNBLGFBQUssVUFBTCxDQUFnQixJQUFoQixDQUFxQixPQUFyQjtBQUNIO0FBWlU7O0FBZWYsTUFBTSxTQUFOLENBQWU7QUFDWCxnQkFBWSxJQUFaLEVBQWtCLFdBQWxCLEVBQStCLE9BQS9CLEVBQXdDLFNBQXhDLEVBQW1ELFNBQW5ELEVBQThELFlBQTlELEVBQTRFLFVBQTVFLEVBQXVGO0FBQ25GLGFBQUssSUFBTCxHQUFZLElBQVo7QUFDQSxhQUFLLFdBQUwsR0FBbUIsV0FBbkI7QUFDQSxhQUFLLE9BQUwsR0FBZSxPQUFmO0FBQ0EsYUFBSyxTQUFMLEdBQWlCLFNBQWpCO0FBQ0EsYUFBSyxTQUFMLEdBQWlCLFNBQWpCO0FBQ0EsYUFBSyxZQUFMLEdBQW9CLFlBQXBCO0FBQ0EsYUFBSyxVQUFMLEdBQWtCLFVBQWxCO0FBQ0g7QUFUVTs7QUFhZixPQUFPLE9BQVAsR0FBaUI7QUFDYixjQUFVLFFBREc7QUFFYixlQUFXO0FBRkUsQ0FBakIiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiY29uc3QgZGIgPSByZXF1aXJlKCcuL2RhdGFNYW5hZ2VtZW50LmpzJyk7XG5jb25zdCBzdHJhdE1vZGVsID0gcmVxdWlyZSgnLi9zdHJhdGVneU1vZGVsLmpzJyk7XG5cbmlmICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyAmJiB3aW5kb3cuYW5ndWxhcikge1xuXG4gICAgbGV0IG15QWRtaW4gPSBhbmd1bGFyLm1vZHVsZSgnbXlBZG1pbicsW10pO1xuICAgIG15QWRtaW4uZmFjdG9yeSgnU3RyYXRlZ3lTZXJ2aWNlJywgZnVuY3Rpb24oJHEpIHtcbiAgICAgICAgbGV0IHN0cmF0ZWdpZXM9IFtdO1xuICAgICAgICBsZXQgZGVmZXJyZWQgPSAkcS5kZWZlcigpO1xuICAgICAgICBmaXJlYmFzZS5kYXRhYmFzZSgpLnJlZignc3RyYXRlZ2llcycpLm9uY2UoJ3ZhbHVlJykudGhlbihmdW5jdGlvbihzbmFwc2hvdCkge1xuICAgICAgICAgICAgc25hcHNob3QuZm9yRWFjaChmdW5jdGlvbihjaGlsZFN0cmF0ZWd5KSB7XG4gICAgICAgICAgICAgICAgc3RyYXRlZ2llcy5wdXNoKGNoaWxkU3RyYXRlZ3kudmFsKCkpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKHN0cmF0ZWdpZXMpO1xuICAgICAgICB9KS5jYXRjaChmdW5jdGlvbihlcnIpIHtcbiAgICAgICAgICAgIGRlZmVycmVkLnJlamVjdChlcnIpO1xuICAgICAgICB9KTtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgZ2V0QWxsOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH07XG4gICAgfSk7XG5cblxuXG4gICAgbXlBZG1pbi5jb250cm9sbGVyKCdBZG1pbkN0cmwnLCBmdW5jdGlvbiAoJHNjb3BlLCBTdHJhdGVneVNlcnZpY2UpIHtcbiAgICAgICAgXCJ1c2Ugc3RyaWN0XCI7XG4gICAgICAgICRzY29wZS5jdXJyZW50U3RhdGVtZW50ID0ge307XG4gICAgICAgICRzY29wZS5jdXJyZW50U3RyYXRlZ3kgPSB7fTtcbiAgICAgICAgbGV0IG15U3RyYXQgPSBTdHJhdGVneVNlcnZpY2UuZ2V0QWxsKCk7XG4gICAgICAgIG15U3RyYXQudGhlbihmdW5jdGlvbihzdHJhdGVnaWVzKSB7XG4gICAgICAgICAgICAkc2NvcGUuYWxsU3RyYXRlZ2llcyA9IHN0cmF0ZWdpZXM7XG5cblxuICAgICAgICAkc2NvcGUuY3JlYXRlU3RyYXRlZ3k9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICRzY29wZS5jdXJyZW50U3RyYXRlZ3kgPSBuZXcgc3RyYXRNb2RlbC5TdHJhdGVneSgkc2NvcGUubmV3U3RyYXRlZ3kub3duZXIsJHNjb3BlLm5ld1N0cmF0ZWd5Lm5hbWUsJHNjb3BlLm5ld1N0cmF0ZWd5LmRpc3BsYXlOYW1lICk7XG4gICAgICAgIH1cblxuXG4gICAgICAgICRzY29wZS5lZGl0Q3VycmVudFN0YXRlbWVudC0gZnVuY3Rpb24gKCkge1xuXG5cbiAgICAgICAgfVxuXG5cbiAgICAgICAgJHNjb3BlLnB1Ymxpc2ggPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBmaXJlYmFzZS5kYXRhYmFzZSgpLnJlZigpLmNoaWxkKCdzdHJhdGVnaWVzJykucHVzaChhbmd1bGFyLmZyb21Kc29uKGFuZ3VsYXIudG9Kc29uKCRzY29wZS5jdXJyZW50U3RyYXRlZ3kpKSk7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICB9KTtcbn07XG4iLCJcblxuXG52YXIgY29uZmlnID0ge1xuICAgIGFwaUtleTogXCJBSXphU3lBWGpMNmY3MzlCVnFMRGtueW1DTjJIMzYtTkJEUzhMdllcIixcbiAgICBhdXRoRG9tYWluOiBcInN0cmF0ZWd5dHJhY2tlci5maXJlYmFzZWFwcC5jb21cIixcbiAgICBkYXRhYmFzZVVSTDogXCJodHRwczovL3N0cmF0ZWd5dHJhY2tlci5maXJlYmFzZWlvLmNvbVwiLFxuICAgIHByb2plY3RJZDogXCJzdHJhdGVneXRyYWNrZXJcIixcbiAgICBzdG9yYWdlQnVja2V0OiBcInN0cmF0ZWd5dHJhY2tlci5hcHBzcG90LmNvbVwiLFxuICAgIG1lc3NhZ2luZ1NlbmRlcklkOiBcIjI2MTI0OTgzNjUxOFwiXG59O1xuZmlyZWJhc2UuaW5pdGlhbGl6ZUFwcChjb25maWcpO1xuXG5mdW5jdGlvbiB3cml0ZVVzZXJEYXRhKHVzZXJJZCwgbmFtZSwgZW1haWwsIGltYWdlVXJsKSB7XG4gICAgZmlyZWJhc2UuZGF0YWJhc2UoKS5yZWYoJ3VzZXJzLycgKyB1c2VySWQpLnNldCh7XG4gICAgICAgIHVzZXJuYW1lOiBuYW1lLFxuICAgICAgICBlbWFpbDogZW1haWwsXG4gICAgICAgIHByb2ZpbGVfcGljdHVyZSA6IGltYWdlVXJsXG4gICAgfSk7XG59IiwiJ3VzZSBzdHJpY3QnO1xuXG5jbGFzcyBTdHJhdGVneSB7XG5cbiAgICBjb25zdHJ1Y3Rvcihvd25lciwgbmFtZSwgZGlzcGxheU5hbWUpIHtcbiAgICAgICAgdGhpcy5uYW1lID0gbmFtZTtcbiAgICAgICAgdGhpcy5vd25lcj0gb3duZXI7XG4gICAgICAgIHRoaXMuZGlzcGxheU5hbWU9IGRpc3BsYXlOYW1lO1xuICAgICAgICB0aGlzLnN0YXRlbWVudHMgPSBbXSA7XG4gICAgfVxuXG4gICAgaW5zZXJ0U3RhdGVtZW50KHRleHQsIGRlc2NyaXB0aW9uLCBsaW5lTnVtLCBzdWNjZXNzb3IsIHZhcmlhYmxlcywgbmV4dFN0cmF0ZWd5LCBjbGFzc3N0eWxlKXtcbiAgICAgICAgbGV0IG5ld1N0YXQgPSBuZXcgU3RhdGVtZW50KHRleHQsIGRlc2NyaXB0aW9uLCBsaW5lTnVtLCBzdWNjZXNzb3IsIHZhcmlhYmxlcywgbmV4dFN0cmF0ZWd5LCBjbGFzc3N0eWxlKTtcbiAgICAgICAgdGhpcy5zdGF0ZW1lbnRzLnB1c2gobmV3U3RhdCk7XG4gICAgfVxufVxuXG5jbGFzcyBTdGF0ZW1lbnR7XG4gICAgY29uc3RydWN0b3IodGV4dCwgZGVzY3JpcHRpb24sIGxpbmVOdW0sIHN1Y2Nlc3NvciwgdmFyaWFibGVzLCBuZXh0U3RyYXRlZ3ksIGNsYXNzU3R5bGUpe1xuICAgICAgICB0aGlzLnRleHQgPSB0ZXh0O1xuICAgICAgICB0aGlzLmRlc2NyaXB0aW9uID0gZGVzY3JpcHRpb247XG4gICAgICAgIHRoaXMubGluZU51bSA9IGxpbmVOdW07XG4gICAgICAgIHRoaXMuc3VjY2Vzc29yID0gc3VjY2Vzc29yO1xuICAgICAgICB0aGlzLnZhcmlhYmxlcyA9IHZhcmlhYmxlcztcbiAgICAgICAgdGhpcy5uZXh0U3RyYXRlZ3kgPSBuZXh0U3RyYXRlZ3k7XG4gICAgICAgIHRoaXMuY2xhc3NTdHlsZSA9IGNsYXNzU3R5bGU7XG4gICAgfVxufVxuXG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIFN0cmF0ZWd5OiBTdHJhdGVneSxcbiAgICBTdGF0ZW1lbnQ6IFN0YXRlbWVudFxufTsiXX0=
