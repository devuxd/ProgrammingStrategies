STRATEGY testDrivenDevelopment(requirements)
      SET ‘scenarios’ TO all testable user scenarios in ‘requirements’
      SET ‘code’ TO be new empty program
      SET ‘tests’ to be an empty collection of tests
      FOR EACH 'scenario' 'scenarios'
            # Create test
            DO 
                SET ‘test’ TO a new test written for ‘scenario’ 
                SET ‘tests’ TO add 'test'
                Run ‘tests’
            UNTIL 'test' fails

            # Make it work
            DO
                Edit 'code' to implement 'scenario'
                Run 'tests'
            UNTIL 'tests' pass
            
            # Make it right
            DO
                SET 'designIssue' TO be an unaddressed design issue or null otherwise
                IF 'designIssue' is not null
                    Edit code to address 'designIssue'
            UNTIL 'designIssue' is null
            
            # Make it fast
            DO
                SET 'perfIssue' TO be an unaddressed performance issue or null otherwise
                IF 'perfIssue' is not null
                    Edit code to address 'perfIssue'
            UNTIL 'pefIssue' is null
