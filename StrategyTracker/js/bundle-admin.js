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
            $scope.createNewStrategy = function () {
                editor.setValue("");
                $scope.newStrategyOwner = "";
                $scope.newStrategyName = "";
                $scope.newStrategyDisplayName = "";
                $("#frmStrategyCreation").css("display", "block");
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJhZG1pbi5qcyIsImRhdGFNYW5hZ2VtZW50LmpzIiwic3RyYXRlZ3lNb2RlbC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBLE1BQU0sS0FBSyxRQUFRLHFCQUFSLENBQVg7QUFDQSxNQUFNLGFBQWEsUUFBUSxvQkFBUixDQUFuQjs7QUFFQSxJQUFJLE9BQU8sTUFBUCxLQUFrQixXQUFsQixJQUFpQyxPQUFPLE9BQTVDLEVBQXFEOztBQUVqRCxRQUFJLFVBQVUsUUFBUSxNQUFSLENBQWUsU0FBZixFQUF5QixDQUFDLFFBQUQsQ0FBekIsQ0FBZDs7QUFFQSxZQUFRLE9BQVIsQ0FBZ0IsaUJBQWhCLEVBQW1DLFVBQVMsRUFBVCxFQUFhO0FBQzVDLFlBQUksYUFBWSxFQUFoQjtBQUNBLFlBQUksV0FBVyxHQUFHLEtBQUgsRUFBZjtBQUNBLGlCQUFTLFFBQVQsR0FBb0IsR0FBcEIsQ0FBd0IsWUFBeEIsRUFBc0MsSUFBdEMsQ0FBMkMsT0FBM0MsRUFBb0QsSUFBcEQsQ0FBeUQsVUFBUyxRQUFULEVBQW1CO0FBQ3hFLHFCQUFTLE9BQVQsQ0FBaUIsVUFBUyxhQUFULEVBQXdCO0FBQ3JDLDJCQUFXLElBQVgsQ0FBZ0IsY0FBYyxHQUFkLEVBQWhCO0FBQ0gsYUFGRDtBQUdBLHFCQUFTLE9BQVQsQ0FBaUIsVUFBakI7QUFDSCxTQUxELEVBS0csS0FMSCxDQUtTLFVBQVMsR0FBVCxFQUFjO0FBQ25CLHFCQUFTLE1BQVQsQ0FBZ0IsR0FBaEI7QUFDSCxTQVBEOztBQVNBLGVBQU87QUFDSCxvQkFBUSxZQUFXO0FBQ2YsdUJBQU8sU0FBUyxPQUFoQjtBQUNIO0FBSEUsU0FBUDtBQUtILEtBakJEOztBQW1CQSxZQUFRLFVBQVIsQ0FBbUIsV0FBbkIsRUFBZ0MsVUFBVSxNQUFWLEVBQWtCLGVBQWxCLEVBQW1DO0FBQy9EOztBQUNBLGVBQU8sZ0JBQVAsR0FBMEIsRUFBMUI7QUFD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QUFMLEdBQWlCLFNBQWpCO0FBQ0EsYUFBSyxZQUFMLEdBQW9CLFlBQXBCO0FBQ0EsYUFBSyxVQUFMLEdBQWtCLFVBQWxCO0FBQ0g7QUFUVTs7QUFhZixPQUFPLE9BQVAsR0FBaUI7QUFDYixjQUFVLFFBREc7QUFFYixlQUFXO0FBRkUsQ0FBakIiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiY29uc3QgZGIgPSByZXF1aXJlKCcuL2RhdGFNYW5hZ2VtZW50LmpzJyk7XG5jb25zdCBzdHJhdE1vZGVsID0gcmVxdWlyZSgnLi9zdHJhdGVneU1vZGVsLmpzJyk7XG5cbmlmICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyAmJiB3aW5kb3cuYW5ndWxhcikge1xuXG4gICAgbGV0IG15QWRtaW4gPSBhbmd1bGFyLm1vZHVsZSgnbXlBZG1pbicsWyd1aS5hY2UnXSk7XG5cbiAgICBteUFkbWluLmZhY3RvcnkoJ1N0cmF0ZWd5U2VydmljZScsIGZ1bmN0aW9uKCRxKSB7XG4gICAgICAgIGxldCBzdHJhdGVnaWVzPSBbXTtcbiAgICAgICAgbGV0IGRlZmVycmVkID0gJHEuZGVmZXIoKTtcbiAgICAgICAgZmlyZWJhc2UuZGF0YWJhc2UoKS5yZWYoJ3N0cmF0ZWdpZXMnKS5vbmNlKCd2YWx1ZScpLnRoZW4oZnVuY3Rpb24oc25hcHNob3QpIHtcbiAgICAgICAgICAgIHNuYXBzaG90LmZvckVhY2goZnVuY3Rpb24oY2hpbGRTdHJhdGVneSkge1xuICAgICAgICAgICAgICAgIHN0cmF0ZWdpZXMucHVzaChjaGlsZFN0cmF0ZWd5LnZhbCgpKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZShzdHJhdGVnaWVzKTtcbiAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24oZXJyKSB7XG4gICAgICAgICAgICBkZWZlcnJlZC5yZWplY3QoZXJyKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGdldEFsbDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9O1xuICAgIH0pO1xuXG4gICAgbXlBZG1pbi5jb250cm9sbGVyKCdBZG1pbkN0cmwnLCBmdW5jdGlvbiAoJHNjb3BlLCBTdHJhdGVneVNlcnZpY2UpIHtcbiAgICAgICAgXCJ1c2Ugc3RyaWN0XCI7XG4gICAgICAgICRzY29wZS5jdXJyZW50U3RhdGVtZW50ID0ge307XG4gICAgICAgICRzY29wZS5jdXJyZW50U3RyYXRlZ3kgPSB7fTtcblxuXG5cblxuICAgICAgICBsZXQgbXlTdHJhdCA9IFN0cmF0ZWd5U2VydmljZS5nZXRBbGwoKTtcbiAgICAgICAgbXlTdHJhdC50aGVuKGZ1bmN0aW9uKHN0cmF0ZWdpZXMpIHtcblxuICAgICAgICAgICAgJHNjb3BlLnNlbGVjdGVkU3RyYXRlZ3k9c3RyYXRlZ2llc1sxXTtcblxuXG5cbiAgICAgICAgICAgICRzY29wZS5hbGxTdHJhdGVnaWVzID0gc3RyYXRlZ2llcztcbiAgICAgICAgICAgICRzY29wZS5lZGl0ZWRTdHJhdGVneSA9e307XG5cbiAgICAgICAgICAgICRzY29wZS5hY2VPcHRpb24gPSB7XG4gICAgICAgICAgICAgICAgb25Mb2FkOiBmdW5jdGlvbiAoX2FjZSkge1xuICAgICAgICAgICAgICAgICAgICBfYWNlLmdldFNlc3Npb24oKS5zZXRNb2RlKFwiYWNlL21vZGUvanNvblwiKTtcbiAgICAgICAgICAgICAgICAgICAgX2FjZS5zZXRUaGVtZShcImFjZS90aGVtZS90d2lsaWdodFwiKVxuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuc3RyYXRlZ3lDaGFuZ2VkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgX2FjZS5zZXRWYWx1ZShKU09OLnN0cmluZ2lmeSgkc2NvcGUuc2VsZWN0ZWRTdHJhdGVneSwgbnVsbCwgJ1xcdCcpKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHZhciBlZGl0b3IgPSBhY2UuZWRpdChcImFjZUVkaXRvclwiKTtcbiAgICAgICAgICAgIGVkaXRvci5zZXRWYWx1ZShKU09OLnN0cmluZ2lmeSgkc2NvcGUuc2VsZWN0ZWRTdHJhdGVneSwgbnVsbCwgJ1xcdCcpKVxuICAgICAgICAgICAgdmFyIHJlZj0gZmlyZWJhc2UuZGF0YWJhc2UoKS5yZWYoKS5jaGlsZCgnc3RyYXRlZ2llcycpO1xuICAgICAgICAgICAgJHNjb3BlLnB1Ymxpc2ggPSBmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgICAgICAgICB2YXIgeD0gcmVmLm9yZGVyQnlDaGlsZChcIm5hbWVcIikuZXF1YWxUbygkc2NvcGUuc2VsZWN0ZWRTdHJhdGVneS5uYW1lKTtcbiAgICAgICAgICAgICAgICB4Lm9uKFwiY2hpbGRfYWRkZWRcIiwgZnVuY3Rpb24oc25hcHNob3QpIHtcbiAgICAgICAgICAgICAgICB2YXIga2V5ID0gc25hcHNob3Qua2V5O1xuICAgICAgICAgICAgICAgICAgICAvL2ZpcnN0IGFyZ3VtZW50IGNvbnRhaW5zIGFuIGludmFsaWQga2V5ICgkJGhhc2hLZXkpIGluIHByb3BlcnR5Li4uLiB0aGlzIGlzIGFuIGVycm9yIGhhcHBlbnMgd2hlbiB3ZSB3YW50IHRvIHB1c2ggLCB1cGRhdGUgb3Igc2V0XG4gICAgICAgICAgICAgICAgICAgIC8vIGEgcmVjb3JkIGluIGZpcmViYXNlLiBpbiBvcmRlciB0byByZW1vdmUgdGhlIGhhc2gga2Ugd2Ugc2hvdWxkIGFkZDpcbiAgICAgICAgICAgICAgICAgICAgLy9JJ3ZlIGdvdHRlbiBhcm91bmQgdGhpcyBpc3N1ZSBieSBkb2luZyBzb21ldGhpbmcgbGlrZVxuICAgICAgICAgICAgICAgICAgICAvLyBteVJlZi5wdXNoKGFuZ3VsYXIuZnJvbUpzb24oYW5ndWxhci50b0pzb24obXlBbmd1bGFyT2JqZWN0KSkpLlxuICAgICAgICAgICAgICAgICAgICBmaXJlYmFzZS5kYXRhYmFzZSgpLnJlZigpLmNoaWxkKCdzdHJhdGVnaWVzLycra2V5KS5zZXQoYW5ndWxhci5mcm9tSnNvbihhbmd1bGFyLnRvSnNvbihKU09OLnBhcnNlKGVkaXRvci5nZXRWYWx1ZSgpKSkpKTtcblxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgJHNjb3BlLmNyZWF0ZU5ld1N0cmF0ZWd5ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGVkaXRvci5zZXRWYWx1ZShcIlwiKTtcbiAgICAgICAgICAgICAgICAkc2NvcGUubmV3U3RyYXRlZ3lPd25lciA9IFwiXCI7XG4gICAgICAgICAgICAgICAgJHNjb3BlLm5ld1N0cmF0ZWd5TmFtZT1cIlwiO1xuICAgICAgICAgICAgICAgICRzY29wZS5uZXdTdHJhdGVneURpc3BsYXlOYW1lPVwiXCI7XG4gICAgICAgICAgICAgICAgJChcIiNmcm1TdHJhdGVneUNyZWF0aW9uXCIpLmNzcyhcImRpc3BsYXlcIiwgXCJibG9ja1wiKTtcblxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgJHNjb3BlLmNyZWF0ZVN0cmF0ZWd5ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICQoXCIjZnJtU3RyYXRlZ3lDcmVhdGlvblwiKS5jc3MoXCJkaXNwbGF5XCIsIFwiYmxvY2tcIik7XG5cblxuICAgICAgICAgICAgICAgIHZhciBvd25lciA9ICRzY29wZS5uZXdTdHJhdGVneU93bmVyO1xuICAgICAgICAgICAgICAgIHZhciBkaXNwbGF5TmFtZSA9ICRzY29wZS5uZXdTdHJhdGVneURpc3BsYXlOYW1lO1xuICAgICAgICAgICAgICAgIHZhciBuYW1lID0gJHNjb3BlLm5ld1N0cmF0ZWd5TmFtZTtcblxuICAgICAgICAgICAgICAgIGlmKG5hbWU9PVwiXCIgfHwgb3duZXI9PVwiXCIgfHwgZGlzcGxheU5hbWUgPT0gXCJcIilcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICQoXCIjZnJtU3RyYXRlZ3lDcmVhdGlvblwiKS5jc3MoXCJkaXNwbGF5XCIsIFwibm9uZVwiKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAkc2NvcGUuc2VsZWN0ZWRTdHJhdGVneSA9IG5ldyBzdHJhdE1vZGVsLlN0cmF0ZWd5KG93bmVyLCBuYW1lLGRpc3BsYXlOYW1lKTtcbiAgICAgICAgICAgICAgICBmaXJlYmFzZS5kYXRhYmFzZSgpLnJlZigpLmNoaWxkKCdzdHJhdGVnaWVzJykucHVzaCgkc2NvcGUuc2VsZWN0ZWRTdHJhdGVneSk7XG4gICAgICAgICAgICAgICAgJChcIiNmcm1TdHJhdGVneUNyZWF0aW9uXCIpLmNzcyhcImRpc3BsYXlcIiwgXCJub25lXCIpO1xuICAgICAgICAgICAgICAgICRzY29wZS5zdHJhdGVneUNoYW5nZWQoKTtcblxuXG5cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgICRzY29wZS5jYW5jZWxDcmVhdGluZ1N0cmF0ZWd5ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICQoXCIjZnJtU3RyYXRlZ3lDcmVhdGlvblwiKS5jc3MoXCJkaXNwbGF5XCIsIFwibm9uZVwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSk7XG59O1xuIiwiXG5cblxudmFyIGNvbmZpZyA9IHtcbiAgICBhcGlLZXk6IFwiQUl6YVN5QVhqTDZmNzM5QlZxTERrbnltQ04ySDM2LU5CRFM4THZZXCIsXG4gICAgYXV0aERvbWFpbjogXCJzdHJhdGVneXRyYWNrZXIuZmlyZWJhc2VhcHAuY29tXCIsXG4gICAgZGF0YWJhc2VVUkw6IFwiaHR0cHM6Ly9zdHJhdGVneXRyYWNrZXIuZmlyZWJhc2Vpby5jb21cIixcbiAgICBwcm9qZWN0SWQ6IFwic3RyYXRlZ3l0cmFja2VyXCIsXG4gICAgc3RvcmFnZUJ1Y2tldDogXCJzdHJhdGVneXRyYWNrZXIuYXBwc3BvdC5jb21cIixcbiAgICBtZXNzYWdpbmdTZW5kZXJJZDogXCIyNjEyNDk4MzY1MThcIlxufTtcbmZpcmViYXNlLmluaXRpYWxpemVBcHAoY29uZmlnKTtcblxuIiwiJ3VzZSBzdHJpY3QnO1xuXG5jbGFzcyBTdHJhdGVneSB7XG5cbiAgICBjb25zdHJ1Y3Rvcihvd25lciwgbmFtZSwgZGlzcGxheU5hbWUpIHtcbiAgICAgICAgdGhpcy5uYW1lID0gbmFtZTtcbiAgICAgICAgdGhpcy5vd25lcj0gb3duZXI7XG4gICAgICAgIHRoaXMuZGlzcGxheU5hbWU9IGRpc3BsYXlOYW1lO1xuICAgICAgICB0aGlzLnN0YXRlbWVudHMgPSBbXSA7XG4gICAgfVxuXG4gICAgaW5zZXJ0U3RhdGVtZW50KHRleHQsIGRlc2NyaXB0aW9uLCBsaW5lTnVtLCBzdWNjZXNzb3IsIHZhcmlhYmxlcywgbmV4dFN0cmF0ZWd5LCBjbGFzc3N0eWxlKXtcbiAgICAgICAgbGV0IG5ld1N0YXQgPSBuZXcgU3RhdGVtZW50KHRleHQsIGRlc2NyaXB0aW9uLCBsaW5lTnVtLCBzdWNjZXNzb3IsIHZhcmlhYmxlcywgbmV4dFN0cmF0ZWd5LCBjbGFzc3N0eWxlKTtcbiAgICAgICAgdGhpcy5zdGF0ZW1lbnRzLnB1c2gobmV3U3RhdCk7XG4gICAgfVxufVxuXG5jbGFzcyBTdGF0ZW1lbnR7XG4gICAgY29uc3RydWN0b3IodGV4dCwgZGVzY3JpcHRpb24sIGxpbmVOdW0sIHN1Y2Nlc3NvciwgdmFyaWFibGVzLCBuZXh0U3RyYXRlZ3ksIGNsYXNzU3R5bGUpe1xuICAgICAgICB0aGlzLnRleHQgPSB0ZXh0O1xuICAgICAgICB0aGlzLmRlc2NyaXB0aW9uID0gZGVzY3JpcHRpb247XG4gICAgICAgIHRoaXMubGluZU51bSA9IGxpbmVOdW07XG4gICAgICAgIHRoaXMuc3VjY2Vzc29yID0gc3VjY2Vzc29yO1xuICAgICAgICB0aGlzLnZhcmlhYmxlcyA9IHZhcmlhYmxlcztcbiAgICAgICAgdGhpcy5uZXh0U3RyYXRlZ3kgPSBuZXh0U3RyYXRlZ3k7XG4gICAgICAgIHRoaXMuY2xhc3NTdHlsZSA9IGNsYXNzU3R5bGU7XG4gICAgfVxufVxuXG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIFN0cmF0ZWd5OiBTdHJhdGVneSxcbiAgICBTdGF0ZW1lbnQ6IFN0YXRlbWVudFxufTsiXX0=
