# Fault localization

When we say "debug", we are usually referring to many different activities, including reproducing a failure, localizing the root causes of a failure, and patching an implementation to prevent those causes. There are many strategies for each of these activities. Below is a strategy for the *fault localization* part of debugging.

## The strategy

Below is a algorithm you can follow manually. If you follow it reliably, it should result in successful localization of a defect. Since it's something a _person_ executes, I've written the strategy in a loosely formal pseudocode. While you execute the strategy, keep track of any variables you need to track in a text editor or paper, and keep track of which step and function you're on, just like a computer does when it executes a program.

*strategy* `localizeFailure(failure)`

1. Reproduce the failure by finding a sequence of inputs that produces the failure reliably.
2. To the extent that you can, write down the inputs for later reference.
3. If the failure is output that shouldn't have occurred, return `localizeWrongOutput(failure)`. Otherwise, if the failure is output that _should_ have occurred, but didn't return `localizeMissingOutput(failure)`

*strategy* `localizeWrongOutput(failure)`

1. Find the line of code `L` in the application that _most directly_ produced the incorrect output. For example, if it was console output, it's a print statement; if it's user interface output, it's whatever component was responsible for rendering the output. If you don't know how to find this line, one strategy is to find a unique feature in the output such as a string constant and do a global search in the code for that string.
2. Set a breakpoint on `L`.
3. Reproduce `failure`. If the program does not halt on `L`, return to step 1 and find an alternate `L` until it does. If there is no such `L`, then something else is creating the problem.
4. With the program halted on `L`, inspect the state of all values in memory and all values `V` of local variables in the call stack that resulted in `L` being reached. This includes all variables that were referenced in conditional statements that resulted in `L` being executed.
5. For each of these values `V`:
	1. If `V` correct in this context, move on to the next `V`.
	2. Otherwise, return `localizeWrongValue(failure, V)`
6. If none of the values were wrong, then one of the inputs to the program was not handled correctly. Identify which input was unexpected and devise a way to handle it correctly.

*strategy* `localizeWrongValue(failure, value)`

1. The goal of this strategy is to find where `value` was computed.
2. Find all lines `L` in the program that can set `value`
3. Set breakpoints on all `L`
4. Reproduce `failure`, finding last execution of a line `L` that occurred before `failure`. If your debugger supports reverse execution, this is a matter of stepping backwards. If not, you may have to reproduce `failure` more than once to find the last execution.
5. Is the last `L` to execute incorrect? Reflect on the intended behavior of the line and whether, as implemented, it achieves this behavior. If it's incorrect, you've found the bug! Return `L`. 
6. If the line is correct, is a value `value2` used by the last `L` to execute incorrect? If so, return `localizeWrongValue(failure, value2)`.
7. Failed to find defect. Return nothing.

*strategy* `diagnoseMissingOutput(failure)`

1. Find the line of code `L` that would have produced the output you expected.
2. Do `diagnoseUnexecutedLine(failure, L)`

*strategy* `diagnoseUnexecutedLine(failure, line)`

1. Find all conditional statements `conditions` that would have caused `line` to execute. These may be an if-statements, switch-statements, or other conditional statements that would have prevented the line from executing.
2. For each line `L` in `conditions`:
	1. Set a breakpoint on line
	2. Reproduce the failure to see if `L` executed
	3. If `L` executed, did it execute correctly? If so, move on to the next `L` in `conditions`.
	4. If it didn't execute correctly, identify the value `V` that caused it to execute incorrectly
	5. Return `localizeWrongValue(failure, V)	

## A task

Visit [Python Tutor](http://www.pythontutor.com) and open a blank Python 2.7 editor. Paste in the code below and try to compute 1+1, noticing that the output is "Invalid input" instead of 2. Use the fault localization strategy above to find out why.

```python
''' Program make a simple calculator that can add, subtract, multiply and divide using functions '''

# This function adds two numbers
def add(x, y):
   return x + y

# This function subtracts two numbers
def subtract(x, y):
   return x - y

# This function multiplies two numbers
def multiply(x, y):
   return x * y

# This function divides two numbers
def divide(x, y):
   return x / y

print("Select operation.")
print("1.Add")
print("2.Subtract")
print("3.Multiply")
print("4.Divide")

# Take input from the user
choice = input("Choose operation:")

num1 = int(input("Enter first number: "))
num2 = int(input("Enter second number: "))

if choice == '1':
   print(num1,"+",num2,"=", add(num1,num2))

elif choice == '2':
   print(num1,"-",num2,"=", subtract(num1,num2))

elif choice == '3':
   print(num1,"*",num2,"=", multiply(num1,num2))

elif choice == '4':
   print(num1,"/",num2,"=", divide(num1,num2))
else:
   print("Invalid input")
```
