Here are two questions that assess knowledge of JavaScript semantics (specifically functions, function calls, conditionals, and inequalities).

# JavaScript 1
What does the following JavaScript program print to the console?

```
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
