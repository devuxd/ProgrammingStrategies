class Help_Script:
    import csv
    studentDict = {}
    with open('Data - Students.csv', 'r') as fp:
        reader1 = csv.reader(fp, delimiter=',', quotechar='"')
        student_read = [row for row in reader1]

    x = 0
    for data in student_read:
        if x == 0:
            x += 1
        else:
            studentDict[data[0].strip()] = data[2].strip()

    with open('Data - Help requests.csv', 'r') as csvfile:
         reader = csv.reader(csvfile, delimiter=',', quotechar='"')
         data_read = [row for row in reader]
    x = 0
    for data in data_read:
        if x == 0:
            x += 1
        else:
            if(data[6].strip() == 'DEBUG' or data[6].strip() == 'Reuse'):
                print(studentDict[data[1].strip()], " used ", data[6].strip()," on 7/", data[2].strip(),"/18", sep='')
        
