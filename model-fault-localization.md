# Model fault localization

Fault localization refers to the debugging activity of determining the location of the root cause of a failure. 
There are many strategies for fault localization, often involving tracking the flow of data or control to determine how some action 
occurred or how some data was computed. But what happens when explicitly tracking control and data flow is not possible, because the code 
involved is not available or its execution is occurring in a remote system? Imagine calling a function on an external library that you
expect to update some data but instead seems to do nothing. Model fault localization offers a strategy for debugging in such a situation.

# The strategy
```
strategy modelFaultLocalization(code, failure, system)
{
   Identify reference code snippet that interacts with system 
   that the system authors created. 
   Reference code snippet might be an example given in a 
   tutorial.
   If this is not possible, identify reference code snippet 
   that a third party wrote that interacts with the system 
   on sites such as StackOverflow or in other parts of your 
   codebase.
  if (execute(referenceCode, system) throws failure)
       configurationDebugging(code, failure, system);
  else
       deltaDebugging(code, referenceCode, failure);
}

strategy configurationDebugging(code, failure, system)
{
  configurationParameters = enumerateConfigParameters(code);
  for (praam in configurationParameters)
  {
      system.changeConfigurationParameter();
      if (execute(code, sytem) throws failure)
      {
           system.revertConfigurationParameter();
           continue;
      }
      else
      {
         return SUCCESS;
      }
      
  }
}


// Brainstorm a list of all configuration parameters you might 
// be able to vary. A configuration paramater
// here refers to some aspect of how the code is being executed 
// that might be changed. This does NOT refer to changes
// to the code itself. Rather, it refers to changes to everything 
// else that influences HOW the code is executed.
// This might include the development environment that runs the 
// code, the version of the system that is being used, 
// the operating system on which the code is being executed, 
// the runtime engine being used to execute the code, 
// the configuration files that are being used to initialize 
// the system. 
strategy enumerateConfigParameters(system)
{
   configurationParameters = {};
   while (moreIdeas)
       configuratinoParameters.add(brainstormConfigParameters());
       
   return configurationParameters;
}


strategy deltaDebugging(code, referenceCode, failure)
{ 
   Edit reference code snippet to match code snippet. 
   if (! (execute(code, system) throws failure))
      return SUCCESS;
   else
   {
       revert(code);
       Edit reference code snippet to match code snippet. 
   }
}

```

# A task

Open [seeCode.run](https://seecode.run/#:-Kptx0KiHtLoD-k5eHDW). Determine how to fix the program so that it stores data to Firebase and successfully reads back and outputs the data.


