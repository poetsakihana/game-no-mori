#!/usr/bin/env python3
"""Extract immutable game tables from Can to Crown v2.1 classes.dex.
Requires androguard 4.x (only for extraction, not browser/runtime/tests).
Usage: python scripts/extract-can-to-crown.py INPUT_DEX OUTPUT_JSON
"""
import hashlib, json, struct, sys
from pathlib import Path
from loguru import logger
logger.remove()
from androguard.core.dex import DEX
EXPECTED = 'e84a0887e007fd1346ac15911a3b937b0184d8e4beae3c737e8602915cd9e028'
raw = Path(sys.argv[1]).read_bytes()
assert hashlib.sha256(raw).hexdigest() == EXPECTED, 'Unexpected original DEX'
dex = DEX(raw)

def extract(class_name, method_name, stop=None):
    method = next(m for m in dex.get_class(class_name).get_methods() if m.get_name() == method_name)
    instructions = dict(method.get_instructions_idx())
    regs, types, fields, arrays = {}, {}, {}, []
    result = None
    for offset, ins in instructions.items():
        if stop is not None and offset >= stop: break
        name, args = ins.get_name(), ins.get_operands()
        ids = [x[1] for x in args if x[0] == 0]
        if name == 'const-string': regs[ids[0]] = args[-1][2]
        elif name.startswith('const'): regs[ids[0]] = args[-1][1]
        elif name.startswith('filled-new-array'):
            result = [regs[r] for r in ids]; arrays.append(result)
        elif name == 'move-result-object': regs[ids[0]] = result
        elif name == 'new-array':
            regs[ids[0]] = [0] * regs[ids[1]]; types[ids[0]] = args[-1][2]
        elif name == 'aput': regs[ids[1]][regs[ids[2]]] = regs[ids[0]]
        elif name == 'fill-array-data':
            payload = instructions[offset + args[-1][1] * 2]
            fmt = 'd' if types[ids[0]] == '[D' else 'i'
            regs[ids[0]][:] = struct.unpack('<' + fmt * len(regs[ids[0]]), payload.get_data())
        elif name in ('sput-object', 'iput-object'):
            field = args[-1][2].split('->')[1].split()[0]
            if isinstance(regs.get(ids[0]), list): fields[field] = regs[ids[0]].copy()
        elif name.startswith('invoke') or name == 'new-instance': result = None
    return fields, arrays
exp, _ = extract('Ljp/sakihana/cantycoon/Expansion;', '<clinit>')
base, _ = extract('Ljp/sakihana/cantycoon/MainActivity$Game;', '<init>', 0x11a)
base.pop('cans')
base.pop('buttons', None)
_, arrays = extract('Ljp/sakihana/cantycoon/MainActivity$Game;', 'questDescription')
base['questDescriptions'] = next(a for a in arrays if len(a) == 6)
# These five original strings occur as a single filled array in story().
method = next(m for m in dex.get_class('Ljp/sakihana/cantycoon/MainActivity$Game;').get_methods() if m.get_name() == 'story')
regs = {}
for ins in method.get_instructions():
    args = ins.get_operands(); name = ins.get_name()
    if name == 'const-string': regs[args[0][1]] = args[-1][2]
    if name.startswith('filled-new-array'):
        values = [regs.get(x[1]) for x in args if x[0] == 0]
        if len(values) == 5 and values[0] == '住まいを探している': base['homeNames'] = values
assert all(len(v) == 20 for v in exp.values()) and len(exp) == 12
assert len(base['bizNames']) == 6 and len(base['homeNames']) == 5
out = {'expansion': exp, 'base': base}
Path(sys.argv[2]).write_text(json.dumps(out, ensure_ascii=False, indent=2) + '\n')
print('Extracted', sum(len(v) for v in exp.values()), 'expansion values and', len(base), 'base tables.')
