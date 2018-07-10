class LogScript:
    import json
    import xlwt
    from collections import defaultdict
    print("here")
    googleIDs = {}
    use = defaultdict(list)
    data = json.loads(open("strategytracker-export.json", "r").read())
    ID = data["users"]
    for line in ID:
        print(line, " is assigned to ", ID[line]['userInfo']['Name'])
        googleIDs[line] = ID[line]['userInfo']['Name']

        for holder in ID[line]['session']:
            temp = json.dumps(ID[line]['session'][holder]['strategy'])
            date = json.dumps(ID[line]['session'][holder]['date']).strip('"')
            if date not in use[googleIDs[line]]:
                use[googleIDs[line]].append(date)

    for person in use:
         print(person, " was active on ", use[person])

    book = xlwt.Workbook(encoding="utf-8")
    sheet1 = book.add_sheet("Sheet 1")

    for x in range(9,32):
        outNumber = x-8
        output = "7/"+str(x)+"/18"
        sheet1.write(0, outNumber, output)

    for x in range(1,3):
        outNumber = x + 23
        output = "8/"+str(x)+"/18"
        sheet1.write(0, outNumber, output)


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
                    sheet1.write(i, index + int(day), "1")
        i += 1

    book.save("trial.xls")