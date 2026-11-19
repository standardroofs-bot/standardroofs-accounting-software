import os
import zipfile
import xml.etree.ElementTree as ET

def analyze_anchors(wb_path, target_sheet_name):
    print(f"\n--- Analyzing '{target_sheet_name}' in {wb_path} ---")
    with zipfile.ZipFile(wb_path) as z:
        # 1. Map sheet name to sheet file
        wb_root = ET.fromstring(z.read("xl/workbook.xml"))
        ns_main = {'m': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main',
                   'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'}
        sheets = wb_root.find('m:sheets', ns_main)
        sheet_rId = None
        for s in sheets.findall('m:sheet', ns_main):
            if s.attrib.get('name').strip().lower() == target_sheet_name.strip().lower():
                sheet_rId = s.attrib.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id')
                break
        
        if not sheet_rId:
            print(f"Sheet {target_sheet_name} not found!")
            return
        
        # 2. Get sheet path from workbook.xml.rels
        wb_rels_root = ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))
        ns_rel = {'pr': 'http://schemas.openxmlformats.org/package/2006/relationships'}
        sheet_target = None
        for r in wb_rels_root.findall('pr:Relationship', ns_rel):
            if r.attrib.get('Id') == sheet_rId:
                sheet_target = r.attrib.get('Target')
                break
        
        print(f"Sheet file: xl/{sheet_target}")
        
        # 3. Check sheet rels for drawing
        sheet_dir, sheet_filename = os.path.split(sheet_target)
        sheet_rels_path = f"xl/{sheet_dir}/_rels/{sheet_filename}.rels" if sheet_dir else f"xl/worksheets/_rels/{sheet_filename}.rels"
        
        if sheet_rels_path not in z.namelist():
            print(f"No sheet rels found at {sheet_rels_path}")
            return
        
        sheet_rels_root = ET.fromstring(z.read(sheet_rels_path))
        drawing_target = None
        for r in sheet_rels_root.findall('pr:Relationship', ns_rel):
            if 'drawing' in r.attrib.get('Type'):
                drawing_target = r.attrib.get('Target')
                break
        
        print(f"Drawing target: {drawing_target}")
        if not drawing_target:
            return
        
        # Normalize drawing target
        norm_drawing = os.path.normpath(f"xl/worksheets/{drawing_target}").replace('\\', '/')
        print(f"Normalized drawing path: {norm_drawing}")
        
        drawing_dir, drawing_filename = os.path.split(norm_drawing)
        drawing_rels_path = f"{drawing_dir}/_rels/{drawing_filename}.rels"
        print(f"Drawing rels path: {drawing_rels_path}")
        
        drawing_rels_root = ET.fromstring(z.read(drawing_rels_path))
        drawing_img_map = {}
        for r in drawing_rels_root.findall('pr:Relationship', ns_rel):
            r_id = r.attrib.get('Id')
            target = r.attrib.get('Target')
            # target is e.g. ../media/image1.jpeg
            norm_target = os.path.normpath(f"{drawing_dir}/{target}").replace('\\', '/')
            drawing_img_map[r_id] = norm_target
        
        print(f"Images in drawing rels: {len(drawing_img_map)}")
        
        # Parse drawing XML anchors
        drawing_xml = z.read(norm_drawing)
        draw_root = ET.fromstring(drawing_xml)
        
        ns_draw = {
            'xdr': 'http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing',
            'a': 'http://schemas.openxmlformats.org/drawingml/2006/main',
            'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
        }
        
        # Find anchors
        anchors = []
        for anchor_type in ['twoCellAnchor', 'oneCellAnchor']:
            for anchor in draw_root.findall(f'xdr:{anchor_type}', ns_draw):
                from_elem = anchor.find('xdr:from', ns_draw)
                col = int(from_elem.find('xdr:col', ns_draw).text)
                row = int(from_elem.find('xdr:row', ns_draw).text)
                pic = anchor.find('xdr:pic', ns_draw)
                if pic is not None:
                    blip = pic.find('.//a:blip', ns_draw)
                    if blip is not None:
                        embed = blip.attrib.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}embed')
                        img_path = drawing_img_map.get(embed)
                        anchors.append({'row': row, 'col': col, 'embed': embed, 'img': img_path})
        
        print(f"Found {len(anchors)} image anchors:")
        anchors.sort(key=lambda x: (x['row'], x['col']))
        for a in anchors[:15]:
            print(f"  Row {a['row']} Col {a['col']} -> {a['img']}")

if __name__ == "__main__":
    analyze_anchors("E:/standardroof accounting software/1_SRMachines_Tracking_2026_With_Images.xlsx", "Total_Machine_Inventory")
    analyze_anchors("E:/standardroof accounting software/2_New_Inventory_Management_With_Images.xlsx", "Current_Stock")
