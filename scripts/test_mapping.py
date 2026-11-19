import os
import zipfile
import xml.etree.ElementTree as ET

def check_drawing_mapping(wb_path, sheet_name, drawing_path, drawing_rels_path):
    with zipfile.ZipFile(wb_path) as z:
        # Load shared strings
        ss = []
        if 'xl/sharedStrings.xml' in z.namelist():
            root_ss = ET.fromstring(z.read('xl/sharedStrings.xml'))
            ns_main = {'m': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
            for si in root_ss.findall('m:si', ns_main):
                text = "".join([t.text for t in si.findall('.//m:t', ns_main) if t.text])
                ss.append(text)
        
        # Load drawing rels
        drels_root = ET.fromstring(z.read(drawing_rels_path))
        ns_rel = {'pr': 'http://schemas.openxmlformats.org/package/2006/relationships'}
        img_map = {}
        for r in drels_root.findall('pr:Relationship', ns_rel):
            img_map[r.attrib.get('Id')] = os.path.normpath(f"xl/drawings/{r.attrib.get('Target')}").replace('\\', '/')
        
        # Load drawing anchors
        draw_root = ET.fromstring(z.read(drawing_path))
        ns_draw = {
            'xdr': 'http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing',
            'a': 'http://schemas.openxmlformats.org/drawingml/2006/main'
        }
        
        anchors = {}
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
                        anchors[row] = {'col': col, 'img': img_map.get(embed)}
        
        # Load sheet cells
        sheet_root = ET.fromstring(z.read("xl/worksheets/sheet1.xml"))
        ns = {'m': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
        print(f"=== Mapping for {sheet_name} ===")
        for r in sheet_root.findall('.//m:row', ns):
            row_num = int(r.attrib.get('r')) # 1-indexed
            # check anchors for 0-indexed row_num - 1
            anc_0 = anchors.get(row_num - 1)
            # check anchors for row_num
            anc_1 = anchors.get(row_num)
            
            # get col A and B text
            name = None
            sno = None
            for c in r.findall('m:c', ns):
                ref = c.attrib.get('r')
                t = c.attrib.get('t')
                v = c.find('m:v', ns)
                val = v.text if v is not None else None
                if t == 's' and val is not None:
                    val = ss[int(val)] if int(val) < len(ss) else val
                if ref.startswith('A'): sno = val
                if ref.startswith('B'): name = val
            
            img_info = ""
            if anc_0:
                img_info += f" [Anchor 0-idx r-1: {anc_0['img']}]"
            if anc_1:
                img_info += f" [Anchor r: {anc_1['img']}]"
            
            if name or sno or img_info:
                print(f"Row {row_num}: SNo={sno} | Name={name} {img_info}")

check_drawing_mapping("E:/standardroof accounting software/1_SRMachines_Tracking_2026_With_Images.xlsx",
                      "Total_Machine_Inventory",
                      "xl/drawings/drawing1.xml",
                      "xl/drawings/_rels/drawing1.xml.rels")
