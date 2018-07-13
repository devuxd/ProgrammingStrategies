class FillZero:
    import datetime
    from xlrd import open_workbook
    from xlutils.copy import copy

    rb = open_workbook("StatsForResearch.xls")
    wb = copy(rb)
    date = datetime.date.today()

    maxDay = date.day
    maxMonth = date.month
    counter = 0
    for sheet in rb.sheets():
        s = wb.get_sheet(counter)
        if(counter == 3):
            break
        for row in range(sheet.nrows):
            for column in range(sheet.ncols):
                if(row == 0 and column == 0):
                    continue
                else:
                    day = sheet.cell(0, column).value
                    if(day == ""):
                        continue
                    month = day[0:1]
                    start = day.find("/") + 1
                    end = day.find("/", start)
                    day = day[start:end]
                    if(int(month) <= int(maxMonth) and int(day) <= int(maxDay)):
                        if(sheet.cell(row,column).value == ''):
                            s.write(row, column, 0)
        counter += 1
    wb.save('StatsForResearch.xls')