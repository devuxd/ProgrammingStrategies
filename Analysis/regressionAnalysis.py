import pandas as pd

xl = pd.ExcelFile("./MergedData.xlsx")
xl.sheet_names
[u'Data']
df = xl.parse("Data")
df.head()  