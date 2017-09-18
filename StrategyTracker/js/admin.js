const db = require('./dataManagement.js');
const stratModel = require('./strategyModel.js');
// const statement = require('./statement.js');

if (typeof window !== 'undefined' && window.angular) {
    let myAdmin = angular.module('myAdmin',[]);
    myAdmin.controller('AdminCtrl', function ($scope) {
        "use strict";
        let statements=[];
        let st = new stratModel.Strategy("",{});


        $scope.createStrategy= function () {
            var stratOwner = document.getElementById("owner").value;
            var stratDisplayName = document.getElementById("displayName").value;
            var stratName = document.getElementById("strategyName").value;


            if(stratName == "" || stratOwner == "" || stratDisplayName == ""){
                alert("Please fill the required fields; Owner, Display Name ,and Strategy Name should be filled.");
                return;
            }

            console.log("create strategy:   " +stratName);
            var strategyPanel = document.getElementById("strategy-panel");
            strategyPanel.innerHTML ='<div class="wizard-block well">'+stratDisplayName +'</div>';
            st.name = stratName;

            document.getElementById("owner").value ="";
            document.getElementById("displayName").value ="";
            document.getElementById("strategyName").value ="";


            // for(var i =0;i<strategies.length; i++){
            //     var key = firebase.database().ref().child('strategies').push(newStrategy);
            // }
        }

        $scope.addStatement = function () {
            //var statName = document.getElementById("strategyName").value;
            var text = document.getElementById("statText").value;
            var desc = document.getElementById("statDesc").value;
            var lNum = document.getElementById("statLineNum").value;
            var successor = document.getElementById("statSuccessor").value;
            var vars = document.getElementById("statVariables").value;
            var nextStrat = document.getElementById("statNextStrategy").value;
            var classStyle = document.getElementById("statClass").value;

            let statement = new stratModel.Statement(text,desc,lNum,successor,vars,nextStrat,classStyle);

            this.pushStatementToPanel(text);
            statements.push(statement);

        }
        $scope.pushStatementToPanel= function(statement){
            var strategyPanel = document.getElementById("strategy-panel");
            var statementDiv = document.createElement('div');
            var statementText = document.createElement('p');
            statementText.className = 'code-text';
            statementText.append(statement)
            statementDiv.appendChild(statementText);
            strategyPanel.appendChild(statementDiv);
        }

        $scope.publish = function () {
            for(var i= 0; i<statements.length; i++)
            {
                console.log(statements[i]);
            }

        }
    });
};
