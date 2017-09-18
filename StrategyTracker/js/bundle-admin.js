(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
const db = require('./dataManagement.js');
const stratModel = require('./strategyModel.js');
// const statement = require('./statement.js');

if (typeof window !== 'undefined' && window.angular) {
    let myAdmin = angular.module('myAdmin', []);
    myAdmin.controller('AdminCtrl', function ($scope) {
        "use strict";

        let statements = [];
        let st = new stratModel.Strategy("", {});

        $scope.createStrategy = function () {
            var stratOwner = document.getElementById("owner").value;
            var stratDisplayName = document.getElementById("displayName").value;
            var stratName = document.getElementById("strategyName").value;

            if (stratName == "" || stratOwner == "" || stratDisplayName == "") {
                alert("Please fill the required fields; Owner, Display Name ,and Strategy Name should be filled.");
                return;
            }

            console.log("create strategy:   " + stratName);
            var strategyPanel = document.getElementById("strategy-panel");
            strategyPanel.innerHTML = '<div class="wizard-block well">' + stratDisplayName + '</div>';
            st.name = stratName;

            document.getElementById("owner").value = "";
            document.getElementById("displayName").value = "";
            document.getElementById("strategyName").value = "";

            // for(var i =0;i<strategies.length; i++){
            //     var key = firebase.database().ref().child('strategies').push(newStrategy);
            // }
        };

        $scope.addStatement = function () {
            //var statName = document.getElementById("strategyName").value;
            var text = document.getElementById("statText").value;
            var desc = document.getElementById("statDesc").value;
            var lNum = document.getElementById("statLineNum").value;
            var successor = document.getElementById("statSuccessor").value;
            var vars = document.getElementById("statVariables").value;
            var nextStrat = document.getElementById("statNextStrategy").value;
            var classStyle = document.getElementById("statClass").value;

            let statement = new stratModel.Statement(text, desc, lNum, successor, vars, nextStrat, classStyle);

            this.pushStatementToPanel(text);
            statements.push(statement);
        };
        $scope.pushStatementToPanel = function (statement) {
            var strategyPanel = document.getElementById("strategy-panel");
            var statementDiv = document.createElement('div');
            var statementText = document.createElement('p');
            statementText.className = 'code-text';
            statementText.append(statement);
            statementDiv.appendChild(statementText);
            strategyPanel.appendChild(statementDiv);
        };

        $scope.publish = function () {
            for (var i = 0; i < statements.length; i++) {
                console.log(statements[i]);
            }
            // var strategyPanel = document.getElementById("strategy-panel");
            // var child = strategyPanel.children;
            // var statements = {};
            //
            // for (var i=0; i<child.length; i++){
            //     statements[i]=child[i].text;
            // }
            // console.log( statements);
        };
    });
};

// document.getElementById('compute')
//     .addEventListener("click", multiply);
// function multiply()
// {
//     var statName = document.getElementById("strategyName1").value;
//     var y = document.getElementById('num2').value;
//     var productElem = document.getElementById('product');
//     productElem.innerHTML = ‘<b>’ + x * y + ‘</b>’;
// }

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

    constructor(name, statements) {
        this.name = name;
        this.statements = [];
    }

    insertStatement(text, description, lineNum, successor, variables, nextStrategy, classstyle) {
        this.text = text;
        this.description = description;
        this.lineNum = lineNum;
        this.successor = successor;
        this.variables = variables;
        this.nextStrategy = nextStrategy;
        this.classStyle = classstyle;
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJhZG1pbi5qcyIsImRhdGFNYW5hZ2VtZW50LmpzIiwic3RyYXRlZ3lNb2RlbC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBLE1BQU0sS0FBSyxRQUFRLHFCQUFSLENBQVg7QUFDQSxNQUFNLGFBQWEsUUFBUSxvQkFBUixDQUFuQjtBQUNBOztBQUVBLElBQUksT0FBTyxNQUFQLEtBQWtCLFdBQWxCLElBQWlDLE9BQU8sT0FBNUMsRUFBcUQ7QUFDakQsUUFBSSxVQUFVLFFBQVEsTUFBUixDQUFlLFNBQWYsRUFBeUIsRUFBekIsQ0FBZDtBQUNBLFlBQVEsVUFBUixDQUFtQixXQUFuQixFQUFnQyxVQUFVLE1BQVYsRUFBa0I7QUFDOUM7O0FBQ0EsWUFBSSxhQUFXLEVBQWY7QUFDQSxZQUFJLEtBQUssSUFBSSxXQUFXLFFBQWYsQ0FBd0IsRUFBeEIsRUFBMkIsRUFBM0IsQ0FBVDs7QUFHQSxlQUFPLGNBQVAsR0FBdUIsWUFBWTtBQUMvQixnQkFBSSxhQUFhLFNBQVMsY0FBVCxDQUF3QixPQUF4QixFQUFpQyxLQUFsRDtBQUNBLGdCQUFJLG1CQUFtQixTQUFTLGNBQVQsQ0FBd0IsYUFBeEIsRUFBdUMsS0FBOUQ7QUFDQSxnQkFBSSxZQUFZLFNBQVMsY0FBVCxDQUF3QixjQUF4QixFQUF3QyxLQUF4RDs7QUFHQSxnQkFBRyxhQUFhLEVBQWIsSUFBbUIsY0FBYyxFQUFqQyxJQUF1QyxvQkFBb0IsRUFBOUQsRUFBaUU7QUFDN0Qsc0JBQU0sMkZBQU47QUFDQTtBQUNIOztBQUVELG9CQUFRLEdBQVIsQ0FBWSx3QkFBdUIsU0FBbkM7QUFDQSxnQkFBSSxnQkFBZ0IsU0FBUyxjQUFULENBQXdCLGdCQUF4QixDQUFwQjtBQUNBLDBCQUFjLFNBQWQsR0FBeUIsb0NBQWtDLGdCQUFsQyxHQUFvRCxRQUE3RTtBQUNBLGVBQUcsSUFBSCxHQUFVLFNBQVY7O0FBRUEscUJBQVMsY0FB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QW5DLEVBQTRDLFNBQTVDLEVBQXVELFNBQXZELEVBQWtFLFlBQWxFLEVBQWdGLFVBQWhGLEVBQTJGO0FBQ3ZGLGFBQUssSUFBTCxHQUFZLElBQVo7QUFDQSxhQUFLLFdBQUwsR0FBbUIsV0FBbkI7QUFDQSxhQUFLLE9BQUwsR0FBZSxPQUFmO0FBQ0EsYUFBSyxTQUFMLEdBQWlCLFNBQWpCO0FBQ0EsYUFBSyxTQUFMLEdBQWlCLFNBQWpCO0FBQ0EsYUFBSyxZQUFMLEdBQW9CLFlBQXBCO0FBQ0EsYUFBSyxVQUFMLEdBQWtCLFVBQWxCO0FBQ0g7QUFmVTs7QUFrQmYsTUFBTSxTQUFOLENBQWU7QUFDWCxnQkFBWSxJQUFaLEVBQWtCLFdBQWxCLEVBQStCLE9BQS9CLEVBQXdDLFNBQXhDLEVBQW1ELFNBQW5ELEVBQThELFlBQTlELEVBQTRFLFVBQTVFLEVBQXVGO0FBQ25GLGFBQUssSUFBTCxHQUFZLElBQVo7QUFDQSxhQUFLLFdBQUwsR0FBbUIsV0FBbkI7QUFDQSxhQUFLLE9BQUwsR0FBZSxPQUFmO0FBQ0EsYUFBSyxTQUFMLEdBQWlCLFNBQWpCO0FBQ0EsYUFBSyxTQUFMLEdBQWlCLFNBQWpCO0FBQ0EsYUFBSyxZQUFMLEdBQW9CLFlBQXBCO0FBQ0EsYUFBSyxVQUFMLEdBQWtCLFVBQWxCO0FBQ0g7QUFUVTs7QUFhZixPQUFPLE9BQVAsR0FBaUI7QUFDYixjQUFVLFFBREc7QUFFYixlQUFXO0FBRkUsQ0FBakIiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiY29uc3QgZGIgPSByZXF1aXJlKCcuL2RhdGFNYW5hZ2VtZW50LmpzJyk7XG5jb25zdCBzdHJhdE1vZGVsID0gcmVxdWlyZSgnLi9zdHJhdGVneU1vZGVsLmpzJyk7XG4vLyBjb25zdCBzdGF0ZW1lbnQgPSByZXF1aXJlKCcuL3N0YXRlbWVudC5qcycpO1xuXG5pZiAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcgJiYgd2luZG93LmFuZ3VsYXIpIHtcbiAgICBsZXQgbXlBZG1pbiA9IGFuZ3VsYXIubW9kdWxlKCdteUFkbWluJyxbXSk7XG4gICAgbXlBZG1pbi5jb250cm9sbGVyKCdBZG1pbkN0cmwnLCBmdW5jdGlvbiAoJHNjb3BlKSB7XG4gICAgICAgIFwidXNlIHN0cmljdFwiO1xuICAgICAgICBsZXQgc3RhdGVtZW50cz1bXTtcbiAgICAgICAgbGV0IHN0ID0gbmV3IHN0cmF0TW9kZWwuU3RyYXRlZ3koXCJcIix7fSk7XG5cblxuICAgICAgICAkc2NvcGUuY3JlYXRlU3RyYXRlZ3k9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBzdHJhdE93bmVyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJvd25lclwiKS52YWx1ZTtcbiAgICAgICAgICAgIHZhciBzdHJhdERpc3BsYXlOYW1lID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJkaXNwbGF5TmFtZVwiKS52YWx1ZTtcbiAgICAgICAgICAgIHZhciBzdHJhdE5hbWUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInN0cmF0ZWd5TmFtZVwiKS52YWx1ZTtcblxuXG4gICAgICAgICAgICBpZihzdHJhdE5hbWUgPT0gXCJcIiB8fCBzdHJhdE93bmVyID09IFwiXCIgfHwgc3RyYXREaXNwbGF5TmFtZSA9PSBcIlwiKXtcbiAgICAgICAgICAgICAgICBhbGVydChcIlBsZWFzZSBmaWxsIHRoZSByZXF1aXJlZCBmaWVsZHM7IE93bmVyLCBEaXNwbGF5IE5hbWUgLGFuZCBTdHJhdGVneSBOYW1lIHNob3VsZCBiZSBmaWxsZWQuXCIpO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc29sZS5sb2coXCJjcmVhdGUgc3RyYXRlZ3k6ICAgXCIgK3N0cmF0TmFtZSk7XG4gICAgICAgICAgICB2YXIgc3RyYXRlZ3lQYW5lbCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwic3RyYXRlZ3ktcGFuZWxcIik7XG4gICAgICAgICAgICBzdHJhdGVneVBhbmVsLmlubmVySFRNTCA9JzxkaXYgY2xhc3M9XCJ3aXphcmQtYmxvY2sgd2VsbFwiPicrc3RyYXREaXNwbGF5TmFtZSArJzwvZGl2Pic7XG4gICAgICAgICAgICBzdC5uYW1lID0gc3RyYXROYW1lO1xuXG4gICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIm93bmVyXCIpLnZhbHVlID1cIlwiO1xuICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJkaXNwbGF5TmFtZVwiKS52YWx1ZSA9XCJcIjtcbiAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwic3RyYXRlZ3lOYW1lXCIpLnZhbHVlID1cIlwiO1xuXG5cbiAgICAgICAgICAgIC8vIGZvcih2YXIgaSA9MDtpPHN0cmF0ZWdpZXMubGVuZ3RoOyBpKyspe1xuICAgICAgICAgICAgLy8gICAgIHZhciBrZXkgPSBmaXJlYmFzZS5kYXRhYmFzZSgpLnJlZigpLmNoaWxkKCdzdHJhdGVnaWVzJykucHVzaChuZXdTdHJhdGVneSk7XG4gICAgICAgICAgICAvLyB9XG4gICAgICAgIH1cblxuICAgICAgICAkc2NvcGUuYWRkU3RhdGVtZW50ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgLy92YXIgc3RhdE5hbWUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInN0cmF0ZWd5TmFtZVwiKS52YWx1ZTtcbiAgICAgICAgICAgIHZhciB0ZXh0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJzdGF0VGV4dFwiKS52YWx1ZTtcbiAgICAgICAgICAgIHZhciBkZXNjID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJzdGF0RGVzY1wiKS52YWx1ZTtcbiAgICAgICAgICAgIHZhciBsTnVtID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJzdGF0TGluZU51bVwiKS52YWx1ZTtcbiAgICAgICAgICAgIHZhciBzdWNjZXNzb3IgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInN0YXRTdWNjZXNzb3JcIikudmFsdWU7XG4gICAgICAgICAgICB2YXIgdmFycyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwic3RhdFZhcmlhYmxlc1wiKS52YWx1ZTtcbiAgICAgICAgICAgIHZhciBuZXh0U3RyYXQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInN0YXROZXh0U3RyYXRlZ3lcIikudmFsdWU7XG4gICAgICAgICAgICB2YXIgY2xhc3NTdHlsZSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwic3RhdENsYXNzXCIpLnZhbHVlO1xuXG4gICAgICAgICAgICBsZXQgc3RhdGVtZW50ID0gbmV3IHN0cmF0TW9kZWwuU3RhdGVtZW50KHRleHQsZGVzYyxsTnVtLHN1Y2Nlc3Nvcix2YXJzLG5leHRTdHJhdCxjbGFzc1N0eWxlKTtcblxuICAgICAgICAgICAgdGhpcy5wdXNoU3RhdGVtZW50VG9QYW5lbCh0ZXh0KTtcbiAgICAgICAgICAgIHN0YXRlbWVudHMucHVzaChzdGF0ZW1lbnQpO1xuXG4gICAgICAgIH1cbiAgICAgICAgJHNjb3BlLnB1c2hTdGF0ZW1lbnRUb1BhbmVsPSBmdW5jdGlvbihzdGF0ZW1lbnQpe1xuICAgICAgICAgICAgdmFyIHN0cmF0ZWd5UGFuZWwgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInN0cmF0ZWd5LXBhbmVsXCIpO1xuICAgICAgICAgICAgdmFyIHN0YXRlbWVudERpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgICAgICAgdmFyIHN0YXRlbWVudFRleHQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdwJyk7XG4gICAgICAgICAgICBzdGF0ZW1lbnRUZXh0LmNsYXNzTmFtZSA9ICdjb2RlLXRleHQnO1xuICAgICAgICAgICAgc3RhdGVtZW50VGV4dC5hcHBlbmQoc3RhdGVtZW50KVxuICAgICAgICAgICAgc3RhdGVtZW50RGl2LmFwcGVuZENoaWxkKHN0YXRlbWVudFRleHQpO1xuICAgICAgICAgICAgc3RyYXRlZ3lQYW5lbC5hcHBlbmRDaGlsZChzdGF0ZW1lbnREaXYpO1xuICAgICAgICB9XG5cbiAgICAgICAgJHNjb3BlLnB1Ymxpc2ggPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBmb3IodmFyIGk9IDA7IGk8c3RhdGVtZW50cy5sZW5ndGg7IGkrKylcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhzdGF0ZW1lbnRzW2ldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIHZhciBzdHJhdGVneVBhbmVsID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJzdHJhdGVneS1wYW5lbFwiKTtcbiAgICAgICAgICAgIC8vIHZhciBjaGlsZCA9IHN0cmF0ZWd5UGFuZWwuY2hpbGRyZW47XG4gICAgICAgICAgICAvLyB2YXIgc3RhdGVtZW50cyA9IHt9O1xuICAgICAgICAgICAgLy9cbiAgICAgICAgICAgIC8vIGZvciAodmFyIGk9MDsgaTxjaGlsZC5sZW5ndGg7IGkrKyl7XG4gICAgICAgICAgICAvLyAgICAgc3RhdGVtZW50c1tpXT1jaGlsZFtpXS50ZXh0O1xuICAgICAgICAgICAgLy8gfVxuICAgICAgICAgICAgLy8gY29uc29sZS5sb2coIHN0YXRlbWVudHMpO1xuICAgICAgICB9XG4gICAgfSk7XG59O1xuXG4vLyBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY29tcHV0ZScpXG4vLyAgICAgLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBtdWx0aXBseSk7XG4vLyBmdW5jdGlvbiBtdWx0aXBseSgpXG4vLyB7XG4vLyAgICAgdmFyIHN0YXROYW1lID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJzdHJhdGVneU5hbWUxXCIpLnZhbHVlO1xuLy8gICAgIHZhciB5ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ251bTInKS52YWx1ZTtcbi8vICAgICB2YXIgcHJvZHVjdEVsZW0gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncHJvZHVjdCcpO1xuLy8gICAgIHByb2R1Y3RFbGVtLmlubmVySFRNTCA9IOKAmDxiPuKAmSArIHggKiB5ICsg4oCYPC9iPuKAmTtcbi8vIH0iLCJcblxuXG52YXIgY29uZmlnID0ge1xuICAgIGFwaUtleTogXCJBSXphU3lBWGpMNmY3MzlCVnFMRGtueW1DTjJIMzYtTkJEUzhMdllcIixcbiAgICBhdXRoRG9tYWluOiBcInN0cmF0ZWd5dHJhY2tlci5maXJlYmFzZWFwcC5jb21cIixcbiAgICBkYXRhYmFzZVVSTDogXCJodHRwczovL3N0cmF0ZWd5dHJhY2tlci5maXJlYmFzZWlvLmNvbVwiLFxuICAgIHByb2plY3RJZDogXCJzdHJhdGVneXRyYWNrZXJcIixcbiAgICBzdG9yYWdlQnVja2V0OiBcInN0cmF0ZWd5dHJhY2tlci5hcHBzcG90LmNvbVwiLFxuICAgIG1lc3NhZ2luZ1NlbmRlcklkOiBcIjI2MTI0OTgzNjUxOFwiXG59O1xuZmlyZWJhc2UuaW5pdGlhbGl6ZUFwcChjb25maWcpO1xuXG5mdW5jdGlvbiB3cml0ZVVzZXJEYXRhKHVzZXJJZCwgbmFtZSwgZW1haWwsIGltYWdlVXJsKSB7XG4gICAgZmlyZWJhc2UuZGF0YWJhc2UoKS5yZWYoJ3VzZXJzLycgKyB1c2VySWQpLnNldCh7XG4gICAgICAgIHVzZXJuYW1lOiBuYW1lLFxuICAgICAgICBlbWFpbDogZW1haWwsXG4gICAgICAgIHByb2ZpbGVfcGljdHVyZSA6IGltYWdlVXJsXG4gICAgfSk7XG59IiwiJ3VzZSBzdHJpY3QnO1xuXG5jbGFzcyBTdHJhdGVneSB7XG5cbiAgICBjb25zdHJ1Y3RvcihuYW1lLCBzdGF0ZW1lbnRzKSB7XG4gICAgICAgIHRoaXMubmFtZSA9IG5hbWU7XG4gICAgICAgIHRoaXMuc3RhdGVtZW50cyA9IFtdIDtcbiAgICB9XG5cbiAgICBpbnNlcnRTdGF0ZW1lbnQodGV4dCwgZGVzY3JpcHRpb24sIGxpbmVOdW0sIHN1Y2Nlc3NvciwgdmFyaWFibGVzLCBuZXh0U3RyYXRlZ3ksIGNsYXNzc3R5bGUpe1xuICAgICAgICB0aGlzLnRleHQgPSB0ZXh0O1xuICAgICAgICB0aGlzLmRlc2NyaXB0aW9uID0gZGVzY3JpcHRpb247XG4gICAgICAgIHRoaXMubGluZU51bSA9IGxpbmVOdW07XG4gICAgICAgIHRoaXMuc3VjY2Vzc29yID0gc3VjY2Vzc29yO1xuICAgICAgICB0aGlzLnZhcmlhYmxlcyA9IHZhcmlhYmxlcztcbiAgICAgICAgdGhpcy5uZXh0U3RyYXRlZ3kgPSBuZXh0U3RyYXRlZ3k7XG4gICAgICAgIHRoaXMuY2xhc3NTdHlsZSA9IGNsYXNzc3R5bGU7XG4gICAgfVxufVxuXG5jbGFzcyBTdGF0ZW1lbnR7XG4gICAgY29uc3RydWN0b3IodGV4dCwgZGVzY3JpcHRpb24sIGxpbmVOdW0sIHN1Y2Nlc3NvciwgdmFyaWFibGVzLCBuZXh0U3RyYXRlZ3ksIGNsYXNzc3R5bGUpe1xuICAgICAgICB0aGlzLnRleHQgPSB0ZXh0O1xuICAgICAgICB0aGlzLmRlc2NyaXB0aW9uID0gZGVzY3JpcHRpb247XG4gICAgICAgIHRoaXMubGluZU51bSA9IGxpbmVOdW07XG4gICAgICAgIHRoaXMuc3VjY2Vzc29yID0gc3VjY2Vzc29yO1xuICAgICAgICB0aGlzLnZhcmlhYmxlcyA9IHZhcmlhYmxlcztcbiAgICAgICAgdGhpcy5uZXh0U3RyYXRlZ3kgPSBuZXh0U3RyYXRlZ3k7XG4gICAgICAgIHRoaXMuY2xhc3NTdHlsZSA9IGNsYXNzc3R5bGU7XG4gICAgfVxufVxuXG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIFN0cmF0ZWd5OiBTdHJhdGVneSxcbiAgICBTdGF0ZW1lbnQ6IFN0YXRlbWVudFxufTsiXX0=
