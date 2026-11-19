"""So khớp field của Java record (DTO) với interface TypeScript cùng tên."""
import re, sys, pathlib
root = pathlib.Path(sys.argv[1])
java = {}
for f in (root/'backend/src/main/java').rglob('*.java'):
    src = f.read_text()
    for m in re.finditer(r'record\s+(\w+)\s*\(', src):
        name = m.group(1); i = m.end(); depth = 1; j = i
        while depth and j < len(src):
            if src[j] == '(': depth += 1
            elif src[j] == ')': depth -= 1
            j += 1
        body = src[i:j-1]
        body = re.sub(r'@\w+(\([^()]*(\([^()]*\)[^()]*)*\))?', '', body)
        # split top-level commas
        parts, d, cur = [], 0, ''
        for ch in body:
            if ch in '<(': d += 1
            if ch in '>)': d -= 1
            if ch == ',' and d == 0: parts.append(cur); cur = ''
            else: cur += ch
        parts.append(cur)
        fields = [p.strip().split()[-1] for p in parts if p.strip()]
        java.setdefault(name, []).append((f.name, fields))
ts = {}
src = (root/'frontend/src/api/types.ts').read_text()
for m in re.finditer(r'export interface (\w+)\s*\{(.*?)\n?\}', src, re.S):
    fields = re.findall(r'(\w+)\??\s*:', m.group(2))
    ts[m.group(1)] = fields
alias = {'TransferOrderView': 'OrderView', 'TransferItemView': 'ItemView', 'ChargingItemView': 'ItemView', 'MaintenanceOrderView': 'OrderView', 'TransferCounts': 'Counts'}
bad = 0
for name, tf in ts.items():
    jn = alias.get(name, name)
    cands = java.get(jn)
    if not cands: print(f'-- {name}: no Java record'); continue
    best = min(cands, key=lambda c: len(set(c[1]) ^ set(tf)))
    missing = [x for x in best[1] if x not in tf]; extra = [x for x in tf if x not in best[1]]
    if extra or missing:
        bad += 1
        print(f'!! {name} ({best[0]}): TS-only={extra} Java-only={missing}')
print('mismatches:', bad)
