class LogScript:
    import json
    import xlwt
    import csv

    from collections import defaultdict

    countDebug = 0
    countReuse = 0
    countDebugComplete = 0
    countReuseComplete = 0
    countDebugAgain = 0
    countReuseAgain = 0

    EventCounterDebug = {}
    EventCounterReuse = {}
    googleIDs = {}
    use = defaultdict(list)
    inclassDict = defaultdict(list)
    data = json.loads(open("strategytracker-export.json", "r").read())
    ID = data["users"]

    studentDict = {}

    with open('Data - Students.csv', 'r') as fp:
        reader1 = csv.reader(fp, delimiter=',', quotechar='"')
        student_read = [row for row in reader1]

    x = 0
    for data in student_read:
        if x == 0:
            x += 1
        else:
            studentDict[data[0].strip()] = data[3].strip()
    for line in ID:
        temp = ID[line]['userInfo']['Email']
        if temp in studentDict.values():
            googleIDs[line] = ID[line]['userInfo']['Email']

        for holder in ID[line]['session']:
            temp = json.dumps(ID[line]['session'][holder]['strategy'])
            date = json.dumps(ID[line]['session'][holder]['date']).strip('"')
            hold = ID[line]['userInfo']['Email']
            if hold in studentDict.values():
             if date not in use[googleIDs[line]]:
                use[googleIDs[line]].append(date)

                if(str(temp)[1:-1] == "debugCode"):
                    if "Events" in ID[line]['session'][holder]:
                        for events in ID[line]['session'][holder]["Events"]:
                            if (holder in EventCounterDebug.keys()):
                                EventCounterDebug[holder] += 1
                            else:
                                EventCounterDebug[holder] = 1
                            temp = json.dumps(ID[line]['session'][holder]["Events"][events])
                            if "Success" in temp:
                                countDebugComplete += 1
                            if "Reset" in temp:
                                countDebugAgain += 1
                    countDebug += 1

                elif(temp[1:-1] == "LearnToCode"):
                    if "Events" in ID[line]['session'][holder]:
                        for events in ID[line]['session'][holder]["Events"]:
                            if (holder in EventCounterReuse.keys()):
                                EventCounterReuse[holder] += 1
                            else:
                                EventCounterReuse[holder] = 1
                            temp = json.dumps(ID[line]['session'][holder]["Events"][events])
                            if "Success" in temp:
                                countReuseComplete += 1
                            if "Reset" in temp:
                                countReuseAgain += 1

                    countReuse += 1

    totalDebug = 0
    for number in EventCounterDebug.values():
        totalDebug += int(number)

    totalReuse = 0
    for number in EventCounterReuse.values():
        totalReuse += int(number)
    book = xlwt.Workbook(encoding="utf-8")
    sheet1 = book.add_sheet("Log Data")
    sheet2 = book.add_sheet("In Class Data")
    sheet3 = book.add_sheet("Overall Combo")
    sheet4 = book.add_sheet("Stats")

    for x in range(9,32):
        outNumber = x-8
        output = "7/"+str(x)+"/18"
        sheet1.write(0, outNumber, output)
        sheet2.write(0, outNumber, output)
        sheet3.write(0, outNumber, output)

    for x in range(1,3):
        outNumber = x + 23
        output = "8/"+str(x)+"/18"
        sheet1.write(0, outNumber, output)
        sheet2.write(0, outNumber, output)
        sheet3.write(0, outNumber, output)


    i = 1
    for x in use:
        sheet1.write(i, 0, x)
        for day in use[x]:
            month = day[0:1]
            start = day.find("/") + 1
            end = day.find("/", start)
            day = day[start:end]

            index = -8;
            if(month == '8'):
                index = 23
            if(month == "6"):
                index = -1

            if(index != -1):
                if(index + int(day) >= 0):
                    sheet1.write(i, index + int(day), 1)
        i += 1




    with open('Data - Help requests.csv', 'r') as csvfile:
        reader = csv.reader(csvfile, delimiter=',', quotechar='"')
        data_read = [row for row in reader]

    i = 1
    for x in studentDict:
        sheet2.write(i, 0, studentDict[x])
        sheet3.write(i, 0, studentDict[x])
        i += 1

    x = 0
    for data in data_read:
        if x == 0:
            x += 1
        else:
            if (data[6].strip() == 'DEBUG' or data[6].strip() == 'Reuse'):
                indexR = -8
                indexC = 1
                for temp in studentDict:
                    date = "7/" + str(data[2]) + "/18"
                    if(studentDict[temp] == studentDict[data[1].strip()]):
                        if date not in inclassDict[studentDict[temp]]:
                            inclassDict[studentDict[temp]].append(date)
                            sheet2.write(indexC, indexR + int(data[2].strip()), 1)

                    indexC += 1
    i = 1
    for x in studentDict.values():
        for day in use[x]:
            month = day[0:1]
            start = day.find("/") + 1
            end = day.find("/", start)
            day = day[start:end]

            index = -8;
            if(month == '8'):
                index = 23
            if(month == "6"):
                index = -1

            if(index != -1):
                if(index + int(day) >= 0):
                    sheet3.write(i, index + int(day), 1)
                else:
                    for temp in studentDict:
                        if (studentDict[temp] == studentDict[data[1].strip()]):
                            if (index + int(day) >= 0):
                                sheet3.write(i, index + int(day), 1)
        i += 1

    sheet4.write(0, 1, "Uses")
    sheet4.write(1, 0, "Debug")
    sheet4.write(2, 0, "Reuse")
    sheet4.write(0,2, "Complete")
    sheet4.write(0,3, "Try Again")
    sheet4.write(0,4, "Average Events")

    sheet4.write(1, 1, countDebug)
    sheet4.write(1, 2, countDebugComplete)
    sheet4.write(1, 3, countDebugAgain)
    sheet4.write(1, 4, round((totalDebug / len(EventCounterDebug)), 2))

    sheet4.write(2, 1, countReuse)
    sheet4.write(2, 2, countReuseComplete)
    sheet4.write(2, 3, countReuseAgain)
    sheet4.write(2, 4, round((totalReuse / len(EventCounterReuse)), 2))
    book.save("StatsForResearch.xls")