import zipfile
import xml.etree.ElementTree as ET

def examine_sheets():
    wb1 = "E:/standardroof accounting software/1_SRMachines_Tracking_2026_With_Images.xlsx"
    wb2 = "E:/standardroof accounting software/2_New_Inventory_Management_With_Images.xlsx"
    
    with zipfile.ZipFile(wb1) as z1:
        wb_root = ET.fromstring(z1.read("xl/workbook.xml"))
        ns = {'m': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
        print("Workbook 1 Sheets:")
        for s in wb_root.find('m:sheets', ns).findall('m:sheet', ns):
            print(" ", s.attrib.get('name'))
            
    with zipfile.ZipFile(wb2) as z2:
        wb_root = ET.fromstring(z2.read("xl/workbook.xml"))
        ns = {'m': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
        print("\nWorkbook 2 Sheets:")
        for s in wb_root.find('m:sheets', ns).findall('m:sheet', ns):
            print(" ", s.attrib.get('name'))

examine_sheets()
