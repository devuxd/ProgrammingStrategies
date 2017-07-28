# Model fault localization

Fault localization refers to the debugging activity of determining the location of the root cause of a failure. 
There are many strategies for fault localization, often involving tracking the flow of data or control to determine how some action 
occurred or how some data was computed. But what happens when explicitly tracking control and data flow is not possible, because the code 
involved is not available or its execution is occurring in a remote system? Imagine calling a function on an external library that you
expect to update some data but instead seems to do nothing. Model fault localization offers a strategy for debugging in such a situation.

# The strategy

strategy model fault localization (fault, system)
1. Identify reference code snippet that interacts with system that the system authors created. Reference code snippet might be an example given in a tutorial.
If this is not possible, identify reference code snippet that a third party wrote that interacts with the system on sites such as StackOverflow
or in other parts of your codebase.
2. Run reference code snippet in your environment.
3. If a fault still occurs
4. Execute configuration debugging.
5. Else, execute delta debugging(your code snippet, reference code snippet, fault).

configuration debugging(fault, system)
1. Enumerate all paramaters of the current configuration. This could include the environment that the code is run in (development environment,
OS, runtime, etc.), the version of the system, and configuration parameters (e.g., config files, parameters passed to initialize system).
2. For each configuration parameter
3. Edit code to vary configuration paramater.
4. Run code
5. If fault is not present
6. Succees.
7. Else, Continue


delta debugging (code snippet, reference code snippet, fault)
1. Edit reference code snippet to match code snippet. 
2. Run the new code snippet. 
3. If the fault is not present
4.  Success
5.  Else, revert to reference code snippet. Add just one edit to make reference code snippet look like code snippet. Go to 2.


# A task

Open [seeCode.run](https://seecode.run/#:-Kptx0KiHtLoD-k5eHDW). Determine how to fix the program so that it stores data to Firebase and successfully reads back and outputs outputs 5325 to the console. 


