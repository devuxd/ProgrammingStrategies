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
            firebase.database().ref().child($scopeeeeeeeeee).push(angular.fromJson(angular.toJson($scope.currentStrategy)));
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJhZG1pbi5qcyIsImRhdGFNYW5hZ2VtZW50LmpzIiwic3RyYXRlZ3lNb2RlbC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBLE1BQU0sS0FBSyxRQUFRLHFCQUFSLENBQVg7QUFDQSxNQUFNLGFBQWEsUUFBUSxvQkFBUixDQUFuQjs7QUFFQSxJQUFJLE9BQU8sTUFBUCxLQUFrQixXQUFsQixJQUFpQyxPQUFPLE9BQTVDLEVBQXFEO0FBQ2pELFFBQUksVUFBVSxRQUFRLE1BQVIsQ0FBZSxTQUFmLEVBQXlCLEVBQXpCLENBQWQ7QUFDQSxZQUFRLFVBQVIsQ0FBbUIsV0FBbkIsRUFBZ0MsVUFBVSxNQUFWLEVBQWtCO0FBQzlDOztBQUNBLGVBQU8sZ0JBQVAsR0FBMEIsRUFBMUI7QUFDQSxlQUFPLGVBQVAsR0FBeUIsRUFBekI7O0FBR0EsZUFBTyxjQUFQLEdBQXVCLFlBQVk7QUFDL0IsbUJBQU8sZUFBUCxHQUF5QixJQUFJLFdBQVcsUUFBZixDQUF3QixPQUFPLFdBQVAsQ0FBbUIsS0FBM0MsRUFBaUQsT0FBTyxXQUFQLENBQW1CLElBQXBFLEVBQXlFLE9BQU8sV0FBUCxDQUFtQixXQUE1RixDQUF6Qjs7QUFFQTtBQUNBO0FBQ0E7QUFDSCxTQU5EOztBQVFBLGVBQU8sWUFBUCxHQUFzQixZQUFZO0FBQzlCLGdCQUFJLE9BQVEsT0FBTyxnQkFBUCxDQUF3QixJQUFwQztBQUNBLGdCQUFJLE9BQVEsT0FBTyxnQkFBUCxDQUF3QixXQUFwQztBQUNBLGdCQUFJLE9BQVEsT0FBTyxnQkFBUCxDQUF3QixPQUFwQztBQUNBLGdCQUFJLFlBQWEsT0FBTyxnQkFBUCxDQUF3QixTQUF6QztBQUNBLGdCQUFJLE9BQVEsT0FBTyxnQkFBUCxDQUF3QixTQUFwQztBQUNBLGdCQUFJLFlBQWEsT0FBTyxnQkFBUCxDQUF3QixZQUF6QztBQUNBLGdCQUFJLGFBQWMsT0FBTyxnQkFBUCxDQUF3QixVQUExQzs7QUFFQSxtQkFBTyxlQUFQLENBQXVCLGVBQXZCLENBQXVDLElBQXZDLEVBQTRDLElBQTVDLEVBQWlELElBQWpELEVBQXNELFNBQXRELEVBQWdFLElBQWhFLEVBQXFFLFNBQXJFLEVBQStFLFVBQS9FO0FBQ0EsbUJBQU8sZ0JBQVAsR0FBMEIsRUFBMUI7QUFDSCxTQVhEO0FBWUEsZUFBTyxTQUFQLEdBQW1CO0FBQ2YscUJBQVM7QUFETSxTQUFuQjs7QUFJQSxlQUFPLG9CQUFQLEdBQTZCLFlBQVksQ0FHeEMsQ0FIRDs7QUFNQSxlQUFPLE9BQVAsR0FBaUIsWUFBWTtBQUN6QixxQkFBUyxRQUFULEdBQW9CLEdBQXBCLEdBQTBCLEtBQTFCLENBQWdDLGVBQWhDLEVBQWlELElBQWpELENBQXNELFFBQVEsUUFBUixDQUFpQixRQUFRLE1BQVIsQ0FBZSxPQUFPLGVBQXRCLENBQWpCLENBQXREO0FBQ0gsU0FGRDtBQUdILEtBdkNEO0FBd0NIOzs7OztBQzFDRCxJQUFJLFNBQVM7QUFDVCxZQUFRLHlDQURDO0FBRVQsZ0JBQVksaUNBRkg7QUFHVCxpQkFBYSx3Q0FISjtBQUlULGVBQVcsaUJBSkY7QUFLVCxtQkFBZSw2QkFMTjtBQU1ULHVCQUFtQjtBQU5WLENBQWI7QUFRQSxTQUFTLGFBQVQsQ0FBdUIsTUFBdkI7O0FBRUEsU0FBUyxhQUFULENBQXVCLE1BQXZCLEVBQStCLElBQS9CLEVBQXFDLEtBQXJDLEVBQTRDLFFBQTVDLEVBQXNEO0FBQ2xELGFBQVMsUUFBVCxHQUFvQixHQUFwQixDQUF3QixXQUFXLE1BQW5DLEVBQTJDLEdBQTNDLENBQStDO0FBQzNDLGtCQUFVLElBRGlDO0FBRTNDLGVBQU8sS0FGb0M7QUFHM0MseUJBQWtCO0FBSHlCLEtBQS9DO0FBS0g7OztBQ25CRDs7QUFFQSxNQUFNLFFBQU4sQ0FBZTs7QUFFWCxnQkFBWSxLQUFaLEVBQW1CLElBQW5CLEVBQXlCLFdBQXpCLEVBQXNDO0FBQ2xDLGFBQUssSUFBTCxHQUFZLElBQVo7QUFDQSxhQUFLLEtBQUwsR0FBWSxLQUFaO0FBQ0EsYUFBSyxXQUFMLEdBQWtCLFdBQWxCO0FBQ0EsYUFBSyxVQUFMLEdBQWtCLEVBQWxCO0FBQ0g7O0FBRUQsb0JBQWdCLElBQWhCLEVBQXNCLFdBQXRCLEVBQW1DLE9BQW5DLEVBQTRDLFNBQTVDLEVBQXVELFNBQXZELEVBQWtFLFlBQWxFLEVBQWdGLFVBQWhGLEVBQTJGO0FBQ3ZGLFlBQUksVUFBVSxJQUFJLFNBQUosQ0FBYyxJQUFkLEVBQW9CLFdBQXBCLEVBQWlDLE9BQWpDLEVBQTBDLFNBQTFDLEVBQXFELFNBQXJELEVBQWdFLFlBQWhFLEVBQThFLFVBQTlFLENBQWQ7QUFDQSxhQUFLLFVBQUwsQ0FBZ0IsSUFBaEIsQ0FBcUIsT0FBckI7QUFDSDtBQVpVOztBQWVmLE1BQU0sU0FBTixDQUFlO0FBQ1gsZ0JBQVksSUFBWixFQUFrQixXQUFsQixFQUErQixPQUEvQixFQUF3QyxTQUF4QyxFQUFtRCxTQUFuRCxFQUE4RCxZQUE5RCxFQUE0RSxVQUE1RSxFQUF1RjtBQUNuRixhQUFLLElBQUwsR0FBWSxJQUFaO0FBQ0EsYUFBSyxXQUFMLEdBQW1CLFdBQW5CO0FBQ0EsYUFBSyxPQUFMLEdBQWUsT0FBZjtBQUNBLGFBQUssU0FBTCxHQUFpQixTQUFqQjtBQUNBLGFBQUssU0FBTCxHQUFpQixTQUFqQjtBQUNBLGFBQUssWUFBTCxHQUFvQixZQUFwQjtBQUNBLGFBQUssVUFBTCxHQUFrQixVQUFsQjtBQUNIO0FBVFU7O0FBYWYsT0FBTyxPQUFQLEdBQWlCO0FBQ2IsY0FBVSxRQURHO0FBRWIsZUFBVztBQUZFLENBQWpCIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsImNvbnN0IGRiID0gcmVxdWlyZSgnLi9kYXRhTWFuYWdlbWVudC5qcycpO1xuY29uc3Qgc3RyYXRNb2RlbCA9IHJlcXVpcmUoJy4vc3RyYXRlZ3lNb2RlbC5qcycpO1xuXG5pZiAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcgJiYgd2luZG93LmFuZ3VsYXIpIHtcbiAgICBsZXQgbXlBZG1pbiA9IGFuZ3VsYXIubW9kdWxlKCdteUFkbWluJyxbXSk7XG4gICAgbXlBZG1pbi5jb250cm9sbGVyKCdBZG1pbkN0cmwnLCBmdW5jdGlvbiAoJHNjb3BlKSB7XG4gICAgICAgIFwidXNlIHN0cmljdFwiO1xuICAgICAgICAkc2NvcGUuY3VycmVudFN0YXRlbWVudCA9IHt9O1xuICAgICAgICAkc2NvcGUuY3VycmVudFN0cmF0ZWd5ID0ge307XG5cblxuICAgICAgICAkc2NvcGUuY3JlYXRlU3RyYXRlZ3k9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICRzY29wZS5jdXJyZW50U3RyYXRlZ3kgPSBuZXcgc3RyYXRNb2RlbC5TdHJhdGVneSgkc2NvcGUubmV3U3RyYXRlZ3kub3duZXIsJHNjb3BlLm5ld1N0cmF0ZWd5Lm5hbWUsJHNjb3BlLm5ld1N0cmF0ZWd5LmRpc3BsYXlOYW1lICk7XG5cbiAgICAgICAgICAgIC8vIGZvcih2YXIgaSA9MDtpPHN0cmF0ZWdpZXMubGVuZ3RoOyBpKyspe1xuICAgICAgICAgICAgLy8gICAgIHZhciBrZXkgPSBmaXJlYmFzZS5kYXRhYmFzZSgpLnJlZigpLmNoaWxkKCdzdHJhdGVnaWVzJykucHVzaChuZXdTdHJhdGVneSk7XG4gICAgICAgICAgICAvLyB9XG4gICAgICAgIH1cblxuICAgICAgICAkc2NvcGUuYWRkU3RhdGVtZW50ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIHRleHQgPSAgJHNjb3BlLmN1cnJlbnRTdGF0ZW1lbnQudGV4dDtcbiAgICAgICAgICAgIHZhciBkZXNjID0gICRzY29wZS5jdXJyZW50U3RhdGVtZW50LmRlc2NyaXB0aW9uO1xuICAgICAgICAgICAgdmFyIGxOdW0gPSAgJHNjb3BlLmN1cnJlbnRTdGF0ZW1lbnQubGluZU51bTtcbiAgICAgICAgICAgIHZhciBzdWNjZXNzb3IgPSAgJHNjb3BlLmN1cnJlbnRTdGF0ZW1lbnQuc3VjY2Vzc29yO1xuICAgICAgICAgICAgdmFyIHZhcnMgPSAgJHNjb3BlLmN1cnJlbnRTdGF0ZW1lbnQudmFyaWFibGVzO1xuICAgICAgICAgICAgdmFyIG5leHRTdHJhdCA9ICAkc2NvcGUuY3VycmVudFN0YXRlbWVudC5uZXh0U3RyYXRlZ3k7XG4gICAgICAgICAgICB2YXIgY2xhc3NTdHlsZSA9ICAkc2NvcGUuY3VycmVudFN0YXRlbWVudC5jbGFzc1N0eWxlO1xuXG4gICAgICAgICAgICAkc2NvcGUuY3VycmVudFN0cmF0ZWd5Lmluc2VydFN0YXRlbWVudCh0ZXh0LGRlc2MsbE51bSxzdWNjZXNzb3IsdmFycyxuZXh0U3RyYXQsY2xhc3NTdHlsZSk7XG4gICAgICAgICAgICAkc2NvcGUuY3VycmVudFN0YXRlbWVudCA9IHt9O1xuICAgICAgICB9XG4gICAgICAgICRzY29wZS5hY2NvcmRpb24gPSB7XG4gICAgICAgICAgICBjdXJyZW50OiBudWxsXG4gICAgICAgIH07XG5cbiAgICAgICAgJHNjb3BlLmVkaXRDdXJyZW50U3RhdGVtZW50LSBmdW5jdGlvbiAoKSB7XG5cblxuICAgICAgICB9XG5cblxuICAgICAgICAkc2NvcGUucHVibGlzaCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGZpcmViYXNlLmRhdGFiYXNlKCkucmVmKCkuY2hpbGQoJHNjb3BlZWVlZWVlZWVlKS5wdXNoKGFuZ3VsYXIuZnJvbUpzb24oYW5ndWxhci50b0pzb24oJHNjb3BlLmN1cnJlbnRTdHJhdGVneSkpKTtcbiAgICAgICAgfVxuICAgIH0pO1xufTtcbiIsIlxuXG5cbnZhciBjb25maWcgPSB7XG4gICAgYXBpS2V5OiBcIkFJemFTeUFYakw2ZjczOUJWcUxEa255bUNOMkgzNi1OQkRTOEx2WVwiLFxuICAgIGF1dGhEb21haW46IFwic3RyYXRlZ3l0cmFja2VyLmZpcmViYXNlYXBwLmNvbVwiLFxuICAgIGRhdGFiYXNlVVJMOiBcImh0dHBzOi8vc3RyYXRlZ3l0cmFja2VyLmZpcmViYXNlaW8uY29tXCIsXG4gICAgcHJvamVjdElkOiBcInN0cmF0ZWd5dHJhY2tlclwiLFxuICAgIHN0b3JhZ2VCdWNrZXQ6IFwic3RyYXRlZ3l0cmFja2VyLmFwcHNwb3QuY29tXCIsXG4gICAgbWVzc2FnaW5nU2VuZGVySWQ6IFwiMjYxMjQ5ODM2NTE4XCJcbn07XG5maXJlYmFzZS5pbml0aWFsaXplQXBwKGNvbmZpZyk7XG5cbmZ1bmN0aW9uIHdyaXRlVXNlckRhdGEodXNlcklkLCBuYW1lLCBlbWFpbCwgaW1hZ2VVcmwpIHtcbiAgICBmaXJlYmFzZS5kYXRhYmFzZSgpLnJlZigndXNlcnMvJyArIHVzZXJJZCkuc2V0KHtcbiAgICAgICAgdXNlcm5hbWU6IG5hbWUsXG4gICAgICAgIGVtYWlsOiBlbWFpbCxcbiAgICAgICAgcHJvZmlsZV9waWN0dXJlIDogaW1hZ2VVcmxcbiAgICB9KTtcbn0iLCIndXNlIHN0cmljdCc7XG5cbmNsYXNzIFN0cmF0ZWd5IHtcblxuICAgIGNvbnN0cnVjdG9yKG93bmVyLCBuYW1lLCBkaXNwbGF5TmFtZSkge1xuICAgICAgICB0aGlzLm5hbWUgPSBuYW1lO1xuICAgICAgICB0aGlzLm93bmVyPSBvd25lcjtcbiAgICAgICAgdGhpcy5kaXNwbGF5TmFtZT0gZGlzcGxheU5hbWU7XG4gICAgICAgIHRoaXMuc3RhdGVtZW50cyA9IFtdIDtcbiAgICB9XG5cbiAgICBpbnNlcnRTdGF0ZW1lbnQodGV4dCwgZGVzY3JpcHRpb24sIGxpbmVOdW0sIHN1Y2Nlc3NvciwgdmFyaWFibGVzLCBuZXh0U3RyYXRlZ3ksIGNsYXNzc3R5bGUpe1xuICAgICAgICBsZXQgbmV3U3RhdCA9IG5ldyBTdGF0ZW1lbnQodGV4dCwgZGVzY3JpcHRpb24sIGxpbmVOdW0sIHN1Y2Nlc3NvciwgdmFyaWFibGVzLCBuZXh0U3RyYXRlZ3ksIGNsYXNzc3R5bGUpO1xuICAgICAgICB0aGlzLnN0YXRlbWVudHMucHVzaChuZXdTdGF0KTtcbiAgICB9XG59XG5cbmNsYXNzIFN0YXRlbWVudHtcbiAgICBjb25zdHJ1Y3Rvcih0ZXh0LCBkZXNjcmlwdGlvbiwgbGluZU51bSwgc3VjY2Vzc29yLCB2YXJpYWJsZXMsIG5leHRTdHJhdGVneSwgY2xhc3NTdHlsZSl7XG4gICAgICAgIHRoaXMudGV4dCA9IHRleHQ7XG4gICAgICAgIHRoaXMuZGVzY3JpcHRpb24gPSBkZXNjcmlwdGlvbjtcbiAgICAgICAgdGhpcy5saW5lTnVtID0gbGluZU51bTtcbiAgICAgICAgdGhpcy5zdWNjZXNzb3IgPSBzdWNjZXNzb3I7XG4gICAgICAgIHRoaXMudmFyaWFibGVzID0gdmFyaWFibGVzO1xuICAgICAgICB0aGlzLm5leHRTdHJhdGVneSA9IG5leHRTdHJhdGVneTtcbiAgICAgICAgdGhpcy5jbGFzc1N0eWxlID0gY2xhc3NTdHlsZTtcbiAgICB9XG59XG5cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgU3RyYXRlZ3k6IFN0cmF0ZWd5LFxuICAgIFN0YXRlbWVudDogU3RhdGVtZW50XG59OyJdfQ==
