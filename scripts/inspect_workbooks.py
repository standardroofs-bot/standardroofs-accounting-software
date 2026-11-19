import os
import zipfile
import xml.etree.ElementTree as ET

def inspect_wb(path):
    print("=" * 60)
    print(f"Inspecting: {path}")
    if not os.path.exists(path):
        print("FILE NOT FOUND!")
        return
    with zipfile.ZipFile(path) as z:
        names = z.namelist()
        media = [n for n in names if n.startswith("xl/media/")]
        drawings = [n for n in names if n.startswith("xl/drawings/drawing") and not n.endswith(".rels")]
        drawing_rels = [n for n in names if n.startswith("xl/drawings/_rels/")]
        sheets = [n for n in names if n.startswith("xl/worksheets/sheet") and not n.endswith(".rels")]
        sheet_rels = [n for n in names if n.startswith("xl/worksheets/_rels/")]
        
        print(f"Total media files: {len(media)}")
        print(f"Total drawings: {len(drawings)}")
        print(f"Total sheets: {len(sheets)}")
        
        # Check workbook.xml to map sheet rId to sheet name
        wb_xml = z.read("xl/workbook.xml")
        wb_root = ET.fromstring(wb_xml)
        # namespace map
        ns = {'main': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main',
              'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'}
        sheets_elem = wb_root.find('main:sheets', ns)
        sheet_map = []
        if sheets_elem is not None:
            for s in sheets_elem.findall('main:sheet', ns):
                name = s.attrib.get('name')
                sheet_id = s.attrib.get('sheetId')
                r_id = s.attrib.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id')
                sheet_map.append({'name': name, 'id': sheet_id, 'rId': r_id})
        
        print("Sheets in workbook:")
        for sm in sheet_map:
            print(f"  {sm['name']} (rId: {sm['rId']})")

if __name__ == "__main__":
    inspect_wb("E:/standardroof accounting software/1_SRMachines_Tracking_2026_With_Images.xlsx")
    inspect_wb("E:/standardroof accounting software/2_New_Inventory_Management_With_Images.xlsx")
