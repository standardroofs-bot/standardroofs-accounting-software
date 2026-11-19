import zipfile
import xml.etree.ElementTree as ET
import os

def examine_all_sheet_drawings(wb_path):
    print(f"\n==========================================")
    print(f"Examining drawings in: {os.path.basename(wb_path)}")
    print(f"==========================================")
    with zipfile.ZipFile(wb_path) as z:
        wb_root = ET.fromstring(z.read("xl/workbook.xml"))
        ns = {'m': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main',
              'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'}
        wb_rels = ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))
        ns_rel = {'pr': 'http://schemas.openxmlformats.org/package/2006/relationships'}
        
        sheet_targets = {}
        for r in wb_rels.findall('pr:Relationship', ns_rel):
            sheet_targets[r.attrib.get('Id')] = r.attrib.get('Target')
            
        for s in wb_root.find('m:sheets', ns).findall('m:sheet', ns):
            s_name = s.attrib.get('name')
            r_id = s.attrib.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id')
            s_target = sheet_targets.get(r_id)
            if not s_target:
                continue
            s_dir, s_file = os.path.split(s_target)
            s_rels = f"xl/{s_dir}/_rels/{s_file}.rels" if s_dir else f"xl/worksheets/_rels/{s_file}.rels"
            has_drawing = False
            draw_target = None
            if s_rels in z.namelist():
                rels_root = ET.fromstring(z.read(s_rels))
                for r in rels_root.findall('pr:Relationship', ns_rel):
                    if 'drawing' in r.attrib.get('Type'):
                        draw_target = r.attrib.get('Target')
                        has_drawing = True
                        break
            
            img_count = 0
            if draw_target:
                norm_d = os.path.normpath(f"xl/worksheets/{draw_target}").replace('\\', '/')
                d_dir, d_file = os.path.split(norm_d)
                d_rels = f"{d_dir}/_rels/{d_file}.rels"
                if d_rels in z.namelist():
                    d_rels_root = ET.fromstring(z.read(d_rels))
                    img_count = len(d_rels_root.findall('pr:Relationship', ns_rel))
                    
            print(f"Sheet: {s_name.strip():<25} | Drawing: {str(has_drawing):<5} | Drawing Target: {str(draw_target):<25} | Images: {img_count}")

examine_all_sheet_drawings("E:/standardroof accounting software/1_SRMachines_Tracking_2026_With_Images.xlsx")
examine_all_sheet_drawings("E:/standardroof accounting software/2_New_Inventory_Management_With_Images.xlsx")
