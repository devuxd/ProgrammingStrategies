document.addEventListener("DOMContentLoaded", event => {
    const app = firebase.app();

});

firebase.auth.onAuthStateChanged(function(user) {
    if(user)
    {
        window.alert("Redirecting");
        window.location('/StrategyTracker.html');
    }
    else
    {
        window.alert("Logout Successful");
    }
})

function googleLogin() {
    const provider = new firebase.auth.GoogleAuthProvider();

    firebase.auth().signInWithPopup(provider).catch(function(error) {

        var errorCode = error.code;
        var errorMess = error.message;

        window.alert("No access to this account.\n" +
            "Please contract Admin");

    })

}

