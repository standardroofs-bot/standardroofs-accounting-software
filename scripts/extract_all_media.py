import os
import re
import json
import zipfile
import xml.etree.ElementTree as ET

def slugify(text):
    if not text:
        return "unnamed"
    text = re.sub(r'[^a-zA-Z0-9]+', '_', str(text).strip()).lower()
    return text.strip('_')[:35]

def get_shared_strings(z):
    if 'xl/sharedStrings.xml' not in z.namelist():
        return []
    root = ET.fromstring(z.read('xl/sharedStrings.xml'))
    ns = {'m': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
    strings = []
    for si in root.findall('m:si', ns):
        text = "".join([t.text for t in si.findall('.//m:t', ns) if t.text])
        strings.append(text)
    return strings

def get_sheet_targets(z):
    wb_root = ET.fromstring(z.read("xl/workbook.xml"))
    wb_rels = ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))
    ns = {'m': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
    ns_rel = {'pr': 'http://schemas.openxmlformats.org/package/2006/relationships'}
    
    rels = {}
    for r in wb_rels.findall('pr:Relationship', ns_rel):
        rels[r.attrib.get('Id')] = r.attrib.get('Target')
        
    sheets = {}
    for s in wb_root.find('m:sheets', ns).findall('m:sheet', ns):
        name = s.attrib.get('name').strip()
        rId = s.attrib.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id')
        sheets[name] = rels.get(rId)
    return sheets

def parse_sheet_drawing(z, sheet_target):
    s_dir, s_file = os.path.split(sheet_target)
    s_rels = f"xl/{s_dir}/_rels/{s_file}.rels" if s_dir else f"xl/worksheets/_rels/{s_file}.rels"
    if s_rels not in z.namelist():
        return None, {}
    
    ns_rel = {'pr': 'http://schemas.openxmlformats.org/package/2006/relationships'}
    rels_root = ET.fromstring(z.read(s_rels))
    draw_target = None
    for r in rels_root.findall('pr:Relationship', ns_rel):
        if 'drawing' in r.attrib.get('Type'):
            draw_target = r.attrib.get('Target')
            break
    if not draw_target:
        return None, {}
    
    norm_draw = os.path.normpath(f"xl/worksheets/{draw_target}").replace('\\', '/')
    d_dir, d_file = os.path.split(norm_draw)
    d_rels = f"{d_dir}/_rels/{d_file}.rels"
    
    img_map = {}
    if d_rels in z.namelist():
        d_rels_root = ET.fromstring(z.read(d_rels))
        for r in d_rels_root.findall('pr:Relationship', ns_rel):
            img_map[r.attrib.get('Id')] = os.path.normpath(f"{d_dir}/{r.attrib.get('Target')}").replace('\\', '/')
            
    # parse anchors
    draw_root = ET.fromstring(z.read(norm_draw))
    ns_draw = {
        'xdr': 'http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing',
        'a': 'http://schemas.openxmlformats.org/drawingml/2006/main'
    }
    anchors = {}
    for a_type in ['twoCellAnchor', 'oneCellAnchor']:
        for anc in draw_root.findall(f'xdr:{a_type}', ns_draw):
            from_e = anc.find('xdr:from', ns_draw)
            col = int(from_e.find('xdr:col', ns_draw).text)
            row = int(from_e.find('xdr:row', ns_draw).text)
            pic = anc.find('xdr:pic', ns_draw)
            if pic is not None:
                blip = pic.find('.//a:blip', ns_draw)
                if blip is not None:
                    embed = blip.attrib.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}embed')
                    target_file = img_map.get(embed)
                    if target_file:
                        anchors[row] = {'col': col, 'file': target_file}
    return norm_draw, anchors

def parse_sheet_rows(z, sheet_target, ss):
    sheet_xml_path = f"xl/{sheet_target}"
    root = ET.fromstring(z.read(sheet_xml_path))
    ns = {'m': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
    rows_data = []
    for r in root.findall('.//m:row', ns):
        r_num = int(r.attrib.get('r'))
        cell_dict = {}
        for c in r.findall('m:c', ns):
            ref = c.attrib.get('r')
            col_letter = "".join([ch for ch in ref if ch.isalpha()])
            t = c.attrib.get('t')
            v = c.find('m:v', ns)
            val = None
            if v is not None:
                val = v.text
                if t == 's' and val is not None:
                    idx = int(val)
                    if idx < len(ss):
                        val = ss[idx]
            cell_dict[col_letter] = val
        rows_data.append((r_num, cell_dict))
    return rows_data

def run_extraction():
    os.makedirs("E:/standardroof accounting software/public/uploads/machines", exist_ok=True)
    os.makedirs("E:/standardroof accounting software/public/uploads/inventory", exist_ok=True)
    os.makedirs("E:/standardroof accounting software/public/uploads/checklists", exist_ok=True)
    
    wb1_path = "E:/standardroof accounting software/1_SRMachines_Tracking_2026_With_Images.xlsx"
    wb2_path = "E:/standardroof accounting software/2_New_Inventory_Management_With_Images.xlsx"
    
    manifest = {
        'machines': [],
        'inventory': [],
        'tiles': [],
        'godown': [],
        'stock_in': [],
        'stock_out': [],
        'checklists': []
    }
    
    # -------------------------------------------------------------
    # 1. PROCESS MACHINES FROM WB1
    # -------------------------------------------------------------
    print("\n--- 1. Processing Machines ---")
    with zipfile.ZipFile(wb1_path) as z1:
        ss1 = get_shared_strings(z1)
        sheets1 = get_sheet_targets(z1)
        tmi_target = sheets1.get("Total_Machine_Inventory")
        _, anchors1 = parse_sheet_drawing(z1, tmi_target)
        rows1 = parse_sheet_rows(z1, tmi_target, ss1)
        
        for r_num, cells in rows1:
            if r_num <= 2: # Skip header
                continue
            name = cells.get('B')
            if not name or name.strip() == '':
                continue
            sno_raw = cells.get('A')
            try:
                sno = int(float(sno_raw)) if sno_raw else len(manifest['machines']) + 1
            except:
                sno = len(manifest['machines']) + 1
                
            slug = slugify(name)
            
            # Anchor can be r_num or r_num - 1 (0-indexed)
            anc = anchors1.get(r_num - 1) or anchors1.get(r_num)
            image_url = None
            if anc and anc['file'] in z1.namelist():
                ext = os.path.splitext(anc['file'])[1] or '.png'
                dest_filename = f"m_{sno}_{slug}{ext}"
                dest_path = f"E:/standardroof accounting software/public/uploads/machines/{dest_filename}"
                with open(dest_path, "wb") as f_out:
                    f_out.write(z1.read(anc['file']))
                image_url = f"/uploads/machines/{dest_filename}"
            
            def to_int(val):
                if not val: return 0
                try:
                    return int(float(str(val).split()[0]))
                except:
                    return 0
                    
            machine_entry = {
                'sNo': sno,
                'name': name.strip(),
                'srFinalCount': to_int(cells.get('D')),
                'totalCount': to_int(cells.get('E')),
                'officeCount': to_int(cells.get('F')),
                'srm01Count': to_int(cells.get('G')),
                'srm02Count': to_int(cells.get('H')),
                'srm03Count': to_int(cells.get('I')),
                'srm04Count': to_int(cells.get('J')),
                'srm05Count': to_int(cells.get('K')),
                'srm06Count': to_int(cells.get('L')),
                'spareCount': to_int(cells.get('M')),
                'serviceCount': to_int(cells.get('N')),
                'scrapCount': to_int(cells.get('O')),
                'notes': cells.get('P'),
                'imageUrl': image_url
            }
            manifest['machines'].append(machine_entry)
            print(f"Machine {sno:2d}: {name:<35} -> {image_url}")

    # -------------------------------------------------------------
    # 2. PROCESS INVENTORY FROM WB2 (Current_Stock)
    # -------------------------------------------------------------
    print("\n--- 2. Processing Inventory (Current_Stock) ---")
    with zipfile.ZipFile(wb2_path) as z2:
        ss2 = get_shared_strings(z2)
        sheets2 = get_sheet_targets(z2)
        cs_target = sheets2.get("Current_Stock")
        _, anchors2 = parse_sheet_drawing(z2, cs_target)
        rows2 = parse_sheet_rows(z2, cs_target, ss2)
        
        current_category = "General Hardware"
        for r_num, cells in rows2:
            if r_num <= 2:
                continue
            name = cells.get('B')
            sno_raw = cells.get('A')
            
            if not name or name.strip() == '':
                continue
                
            # If no sno but has name, it might be a category header
            if not sno_raw and name:
                current_category = name.strip()
                continue
                
            try:
                sno = int(float(sno_raw)) if sno_raw else len(manifest['inventory']) + 1
            except:
                sno = len(manifest['inventory']) + 1
                
            slug = slugify(name)
            anc = anchors2.get(r_num - 1) or anchors2.get(r_num)
            image_url = None
            if anc and anc['file'] in z2.namelist():
                ext = os.path.splitext(anc['file'])[1] or '.png'
                dest_filename = f"inv_{sno}_{slug}{ext}"
                dest_path = f"E:/standardroof accounting software/public/uploads/inventory/{dest_filename}"
                with open(dest_path, "wb") as f_out:
                    f_out.write(z2.read(anc['file']))
                image_url = f"/uploads/inventory/{dest_filename}"
                
            def to_float(val):
                if not val: return 0.0
                try:
                    return float(str(val).split()[0].replace(',', ''))
                except:
                    return 0.0
                    
            inv_entry = {
                'sNo': sno,
                'name': name.strip(),
                'category': current_category,
                'minQty': to_float(cells.get('D')),
                'rate': to_float(cells.get('E')),
                'availableStock': to_float(cells.get('F')),
                'imageUrl': image_url
            }
            manifest['inventory'].append(inv_entry)
            if sno <= 15 or image_url:
                print(f"Inventory {sno:3d}: {name:<35} | Stock={inv_entry['availableStock']} -> {image_url}")

        # -------------------------------------------------------------
        # 3. PROCESS TILES STOCK & GODOWN STOCK
        # -------------------------------------------------------------
        print("\n--- 3. Processing Tiles Stock & Godown Stock ---")
        tiles_target = sheets2.get("Tiles Stock")
        if tiles_target:
            rows_tiles = parse_sheet_rows(z2, tiles_target, ss2)
            for r_num, cells in rows_tiles:
                if r_num <= 2: continue
                name = cells.get('B') or cells.get('A')
                if not name or name.strip() in ['S.No', 'S.NO', 'MATERIALS', 'Total']: continue
                qty = cells.get('C') or cells.get('D') or cells.get('F')
                manifest['tiles'].append({
                    'row': r_num,
                    'name': name.strip(),
                    'qty': str(qty or 0),
                    'cells': cells
                })
        print(f"Total Tiles records: {len(manifest['tiles'])}")

        godown_target = sheets2.get("Godown_Stock")
        if godown_target:
            rows_godown = parse_sheet_rows(z2, godown_target, ss2)
            for r_num, cells in rows_godown:
                if r_num <= 2: continue
                name = cells.get('B') or cells.get('A')
                if not name or name.strip() in ['S.No', 'S.NO', 'MATERIALS', 'Total']: continue
                qty = cells.get('C') or cells.get('D') or cells.get('F')
                manifest['godown'].append({
                    'row': r_num,
                    'name': name.strip(),
                    'qty': str(qty or 0),
                    'cells': cells
                })
        print(f"Total Godown records: {len(manifest['godown'])}")

        # -------------------------------------------------------------
        # 4. PROCESS CHECK LISTS (Layer & Welder Mechioneries)
        # -------------------------------------------------------------
        print("\n--- 4. Processing Pre-Dispatch Checklists ---")
        for chk_name, chk_type in [('Check List', 'GENERAL'), ('Layer Mechioneries', 'LAYER'), ('Welder Mechioneries', 'WELDER')]:
            target = sheets2.get(chk_name)
            if not target: continue
            _, chk_anchors = parse_sheet_drawing(z2, target)
            chk_rows = parse_sheet_rows(z2, target, ss2)
            print(f"Parsing '{chk_name}' ({chk_type}): {len(chk_rows)} rows, {len(chk_anchors)} images")
            for r_num, cells in chk_rows:
                if r_num <= 2: continue
                name = cells.get('B') or cells.get('C')
                if not name or name.strip() in ['MATERIALS', 'Materials', 'S.NO', 'S No']: continue
                sno_raw = cells.get('A')
                try:
                    sno = int(float(sno_raw)) if sno_raw else len(manifest['checklists']) + 1
                except:
                    sno = len(manifest['checklists']) + 1
                    
                slug = slugify(name)
                anc = chk_anchors.get(r_num - 1) or chk_anchors.get(r_num)
                img_url = None
                if anc and anc['file'] in z2.namelist():
                    ext = os.path.splitext(anc['file'])[1] or '.png'
                    dest_file = f"chk_{chk_type.lower()}_{sno}_{slug}{ext}"
                    dest_p = f"E:/standardroof accounting software/public/uploads/checklists/{dest_file}"
                    with open(dest_p, "wb") as f_out:
                        f_out.write(z2.read(anc['file']))
                    img_url = f"/uploads/checklists/{dest_file}"
                    
                std_qty = cells.get('C') or cells.get('D') or '1'
                manifest['checklists'].append({
                    'checklistType': chk_type,
                    'sNo': sno,
                    'itemName': name.strip(),
                    'standardQty': str(std_qty).strip(),
                    'imageUrl': img_url
                })

        # -------------------------------------------------------------
        # 5. PROCESS STOCK IN & STOCK OUT REGISTERS
        # -------------------------------------------------------------
        print("\n--- 5. Processing Stock In & Stock Out ---")
        si_target = sheets2.get("Stock_In")
        if si_target:
            rows_si = parse_sheet_rows(z2, si_target, ss2)
            for r_num, cells in rows_si:
                if r_num <= 2: continue
                manifest['stock_in'].append(cells)
        print(f"Total Stock In rows: {len(manifest['stock_in'])}")

        so_target = sheets2.get("Stock_Out")
        if so_target:
            rows_so = parse_sheet_rows(z2, so_target, ss2)
            for r_num, cells in rows_so:
                if r_num <= 2: continue
                manifest['stock_out'].append(cells)
        print(f"Total Stock Out rows: {len(manifest['stock_out'])}")

    # Save manifest
    manifest_path = "E:/standardroof accounting software/scripts/extracted_data.json"
    with open(manifest_path, "w", encoding="utf-8") as f_m:
        json.dump(manifest, f_m, indent=2, ensure_ascii=False)
        
    print(f"\n==========================================")
    print(f"EXTRACTION COMPLETE!")
    print(f"Machines extracted: {len(manifest['machines'])}")
    print(f"Inventory items extracted: {len(manifest['inventory'])}")
    print(f"Checklist items extracted: {len(manifest['checklists'])}")
    print(f"Tiles items extracted: {len(manifest['tiles'])}")
    print(f"Godown items extracted: {len(manifest['godown'])}")
    print(f"Manifest written to: {manifest_path}")
    print(f"==========================================")

if __name__ == "__main__":
    run_extraction()
