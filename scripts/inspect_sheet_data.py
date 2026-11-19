import os
import zipfile
import xml.etree.ElementTree as ET

def parse_sheet_cells(z, sheet_xml_path, shared_strings):
    root = ET.fromstring(z.read(sheet_xml_path))
    ns = {'m': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
    rows = []
    for r in root.findall('.//m:row', ns):
        row_num = int(r.attrib.get('r'))
        row_cells = {}
        for c in r.findall('m:c', ns):
            cell_ref = c.attrib.get('r')
            cell_type = c.attrib.get('t')
            v = c.find('m:v', ns)
            val = None
            if v is not None:
                val = v.text
                if cell_type == 's' and val is not None:
                    idx = int(val)
                    if idx < len(shared_strings):
                        val = shared_strings[idx]
            row_cells[cell_ref] = val
        rows.append((row_num, row_cells))
    return rows

def load_shared_strings(z):
    if 'xl/sharedStrings.xml' not in z.namelist():
        return []
    root = ET.fromstring(z.read('xl/sharedStrings.xml'))
    ns = {'m': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
    strings = []
    for si in root.findall('m:si', ns):
        # concatenate all t elements in si
        text = "".join([t.text for t in si.findall('.//m:t', ns) if t.text])
        strings.append(text)
    return strings

wb_path = "E:/standardroof accounting software/1_SRMachines_Tracking_2026_With_Images.xlsx"
with zipfile.ZipFile(wb_path) as z:
    ss = load_shared_strings(z)
    rows = parse_sheet_cells(z, "xl/worksheets/sheet1.xml", ss)
    print("--- 1_SRMachines Sheet 1 (Total_Machine_Inventory) Top 10 Rows ---")
    for r_num, cells in rows[:10]:
        print(f"Row {r_num}: {cells}")

wb2_path = "E:/standardroof accounting software/2_New_Inventory_Management_With_Images.xlsx"
with zipfile.ZipFile(wb2_path) as z:
    ss2 = load_shared_strings(z)
    rows2 = parse_sheet_cells(z, "xl/worksheets/sheet1.xml", ss2)
    print("\n--- 2_New_Inventory Sheet 1 (Current_Stock) Top 10 Rows ---")
    for r_num, cells in rows2[:10]:
        print(f"Row {r_num}: {cells}")
