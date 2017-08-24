const models = require('./models.js');
const strategies = require('./strategies').strategies;

if (typeof window !== 'undefined' && window.angular) {
    let myapp = angular.module('myapp', []);
    myapp.controller('MainCtrl', function ($scope) {
        "use strict";

        $scope.strategies = strategies;
        // create interpreter object from model
        let interpreter = new models.Interpreter(strategies);
        // initialize the application
        let execObj = interpreter.init("modelFaultLocalization");
        $scope.strategy = execObj.currentStrategy;
        $scope.currentStatement = execObj.currentStatement;
        $scope.statements = $scope.strategy.statements;

        $scope.nextStatement = function () {
            execObj = interpreter.execute();
            if (execObj === null) return;
            if ($scope.strategy.name !== execObj.currentStrategy.name) {
                $scope.strategy = execObj.currentStrategy;
                $scope.statements = $scope.strategy.statements;
            }
            $scope.currentStatement = execObj.currentStatement;
        };

        $scope.prevStatement = function () {
            execObj = interpreter.goBack();
            if (execObj === null) return;
            if ($scope.strategy.name !== execObj.currentStrategy.name) {
                $scope.strategy = execObj.currentStrategy;
                $scope.statements = $scope.strategy.statements;
            }
            $scope.currentStatement = execObj.currentStatement;
        };

        $scope.chooseNextStatement = function ($event) {
            let currentTarget = $event.currentTarget.innerHTML;
            if ($scope.currentStatement.activeLines.length > 1)
                 {
                // (currentTarget.includes("if") || currentTarget.includes("else") || currentTarget.includes("while") || currentTarget.includes("return"))
                let lineNum = parseInt($event.currentTarget.id);
                execObj = interpreter.execute(lineNum + 1);
                if (execObj === null) return;
                if ($scope.strategy.name !== execObj.currentStrategy.name) {
                    $scope.strategy = execObj.currentStrategy;
                    $scope.statements = $scope.strategy.statements;
                }
                $scope.currentStatement = execObj.currentStatement;
            }
        };

        $(document).ready(function(){
            $(document).on('mouseover', '.active', function() {
                if ($scope.currentStatement.activeLines.length > 1) $(this).addClass('pointer');
            });
        });

    });
}
