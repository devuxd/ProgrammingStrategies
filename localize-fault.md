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
2. Execute the program to line `L` (using a breakpoint or a time-travel debugger).
3. Reproduce `failure`. If the program does not execute `L`, return to step 1 and find an alternate `L` that does. If there is no such `L`, then something else is creating the problem.
4. With the program halted on `L`, inspect the state of all values in memory and all values `V` of local variables in the call stack that resulted in `L` being reached. This includes all variables that were referenced in conditional statements that resulted in `L` being executed.
5. For each of these values `V`:
	1. If `V` correct in this context, move on to the next `V`.
	2. Otherwise, return `localizeWrongValue(failure, V)`
6. If none of the values were wrong, then one of the inputs to the program was not handled correctly. Identify which input was unexpected and devise a way to handle it correctly.

*strategy* `localizeWrongValue(failure, value)`

1. The goal of this strategy is to find where `value` was computed.
2. Find all lines `L` in the program that can set `value`
3. Reproduce `failure`, finding last execution of a line `L` that occurred before `failure` (using breakpoints or a time-travel debugger). If your debugger supports reverse execution, this is a matter of stepping backwards. If not, you may have to reproduce `failure` more than once to find the last execution.
4. Is the last `L` to execute incorrect? Reflect on the intended behavior of the line and whether, as implemented, it achieves this behavior. If it's incorrect, you've found the bug! Return `L`. 
5. If the line is correct, is a value `value2` used by the last `L` to execute incorrect? If so, return `localizeWrongValue(failure, value2)`.
6. Failed to find defect. Return nothing.

*strategy* `localizeMissingOutput(failure)`

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

Visit [Python Tutor](http://www.pythontutor.com/visualize.html#code='''%20Program%20make%20a%20simple%20calculator%20that%20can%20add,%20subtract,%20multiply%20and%20divide%20using%20functions%20'''%0A%0A%23%20This%20function%20adds%20two%20numbers%0Adef%20add%28x,%20y%29%3A%0A%20%20%20return%20x%20%2B%20y%0A%0A%23%20This%20function%20subtracts%20two%20numbers%0Adef%20subtract%28x,%20y%29%3A%0A%20%20%20return%20x%20-%20y%0A%0A%23%20This%20function%20multiplies%20two%20numbers%0Adef%20multiply%28x,%20y%29%3A%0A%20%20%20return%20x%20*%20y%0A%0A%23%20This%20function%20divides%20two%20numbers%0Adef%20divide%28x,%20y%29%3A%0A%20%20%20return%20x%20/%20y%0A%0Aprint%28%22Select%20operation.%22%29%0Aprint%28%221.Add%22%29%0Aprint%28%222.Subtract%22%29%0Aprint%28%223.Multiply%22%29%0Aprint%28%224.Divide%22%29%0A%0A%23%20Take%20input%20from%20the%20user%0Achoice%20%3D%20input%28%22Choose%20operation%3A%22%29%0A%0Anum1%20%3D%20int%28input%28%22Enter%20first%20number%3A%20%22%29%29%0Anum2%20%3D%20int%28input%28%22Enter%20second%20number%3A%20%22%29%29%0A%0Aif%20choice%20%3D%3D%20'1'%3A%0A%20%20%20print%28num1,%22%2B%22,num2,%22%3D%22,%20add%28num1,num2%29%29%0A%0Aelif%20choice%20%3D%3D%20'2'%3A%0A%20%20%20print%28num1,%22-%22,num2,%22%3D%22,%20subtract%28num1,num2%29%29%0A%0Aelif%20choice%20%3D%3D%20'3'%3A%0A%20%20%20print%28num1,%22*%22,num2,%22%3D%22,%20multiply%28num1,num2%29%29%0A%0Aelif%20choice%20%3D%3D%20'4'%3A%0A%20%20%20print%28num1,%22/%22,num2,%22%3D%22,%20divide%28num1,num2%29%29%0Aelse%3A%0A%20%20%20print%28%22Invalid%20input%22%29&cumulative=false&curInstr=0&heapPrimitives=false&mode=display&origin=opt-frontend.js&py=2&rawInputLstJSON=%5B%5D&textReferences=false). Use the program to compute 1+1 and notice that the output is "Invalid input" instead of 2. Use the fault localization strategy above to find out why.

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
