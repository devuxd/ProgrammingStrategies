# Model fault localization

Fault localization refers to the debugging activity of determining the location of the root cause of a failure. 
There are many strategies for fault localization, often involving tracking the flow of data or control to determine how some action 
occurred or how some data was computed. But what happens when explicitly tracking control and data flow is not possible, because the code 
involved is not available or its execution is occurring in a remote system? Imagine calling a function on an external library that you
expect to update some data but instead seems to do nothing. Model fault localization offers a strategy for debugging in such a situation.

The core idea of model fault localizatino is to explore permutations of interactions with the system to understand how the interaction needs to happen differently to remove the failure. For example, you might a config file to initialize a library (configuration paramters), a code snippet making three calls (code), and the external library it uses (the system). Model fault localization separately considers two separate causes of failure. 

In the first case, the failure might be generated for ALL code snippets simply because the configuration is incompatible with system. For example, there might be a misspelled parameter, missing config value, or it might simply be a config for the wrong version of system. Model fault localization first checks to for configuration errors by generating a NEW reference code snippet that you have confidence should work. If this code snippet still fails, there is then evidence that a cause of fault lies in the configuration of system. To debug this configuration error, the strategy then asks you to enumerate all possible permutations of the configuration parameters and systematically vary them (configuration debugging). 

Alternatively, it might be the case that, after executing the reference code snippet with the configuration, there is no failure. In this case, there is now evidence that the failure lies specifically in the code snippet, as the reference code does not exhibit failure. In this case, one can now systematicaly edit referenceCode to code to find the minimal edit that will still cause failure.

# The strategy
```
// Model fault localization takes code, a failure
// that the code generates, and a system with which
// the code interacts. After finding referenceCode,
// the strategy tests 
// if failure is still witnessed this different
// (and assumed correct) code. If it is,
// then a cause of the failure lies in the configuration.
// If not, the fault can then be localized
// by systematically comparing referenceCode
// to code.
strategy modelFaultLocalization(code, failure, system)
{
   // Find some reference code that interacts with the
   // system that you know must be correct code.
   // This code might be given by the system authors
   // in an official tutorial or might be code found
   // from a third party.
   referenceCode = findReferenceCode(system);
   if (execute(referenceCode, system) throws failure)
       configurationDebugging(code, failure, system);
   else
       deltaDebugging(code, referenceCode, failure);
}

// Systematically enumerate and indivdually vary all 
// possible configuration parameters to find a correct
// configuration.
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

// Find the changes from referenceCode to code
// that cause failure, minimizing the cause of failure
// to a minimal code edit.
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

Open [seeCode.run](https://seecode.run/#:-Kptx0KiHtLoD-k5eHDW). Determine how to fix the program so that it stores data to Firebase and successfully reads back and outputs the data. More precisely, 
```
modelFaultLocalization(codeInFirebase, '"Script error.", " at line 16, column 4"', Firebase);
```
