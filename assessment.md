Here is one question that assesses knowledge of JavaScript semantics (specifically functions, function calls, conditionals, and inequalities).

# JavaScript
What does the following JavaScript program print to the console?

```javascript
function greet(name, time) {
  var greeting = "Good " + time + " " + name;
  if(name === "Alice")
    return greeting;
  greeting = greeting + "!";
  console.log(greeting);
  return greeting;
}

var banner = "Good night"
console.log("banner");
greet("Alice", "night");
console.log(banner);
greet("Bob", "night");
```

The correct answer is:

```
banner
Good night
Good night Bob!
Good night
```

# DOM manipulation

Assume the following JavaScript was run on the Google home page and that the Google logo has the `id` `hplogo`. What does the following JavaScript program do?

```javascript
var logo = document.getElementById("hplogo");
logo.style.width="100%";
logo.style.display="none";
var elements = document.getElementsByTagName("a");
for(var i = 0; i < elements.length; i++)
  elements[i].style.fontSize = "xx-large";
var elements = document.getElementsByTagName("input");
for(var i = 0; i < elements.length; i++)
  elements[i].setAttribute("disabled", "disabled");
```

The correct answer is:

* Hides the Google logo
* Changes the font size of all links to "xx-large"
* Disables all inputs on the page

# TDD assessment

Choose one of the following:

* I have never heard of _test-driven development_.
* I have heard of _test-driven development_, but do not know what it is.
* I know what _test-driven development_ is, but have not tried it.
* I have tried _test-driven development_ once or twice.
* I have used _test-driven development_ extensively.
