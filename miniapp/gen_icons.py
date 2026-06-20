import struct
import zlib

def create_png(width, height, pixels):
    """Create a minimal PNG from pixel data (list of RGBA tuples)"""
    raw = b''
    for y in range(height):
        raw += b'\x00'  # filter byte
        for x in range(width):
            idx = (y * width + x) * 4
            raw += bytes(pixels[idx:idx+4])
    
    def chunk(chunk_type, data):
        c = chunk_type + data
        crc = struct.pack('>I', zlib.crc32(c) & 0xffffffff)
        return struct.pack('>I', len(data)) + c + crc
    
    sig = b'\x89PNG\r\n\x1a\n'
    ihdr = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)  # 8-bit RGBA
    compressed = zlib.compress(raw)
    
    return sig + chunk(b'IHDR', ihdr) + chunk(b'IDAT', compressed) + chunk(b'IEND', b'')

# Tab bar icon size: 48x48
SIZE = 48

# Library icon: simple building/contacts shape, grey (#999999)
lib_data = []
for y in range(SIZE):
    for x in range(SIZE):
        # Simple house/contacts shape
        if 10 <= y <= 14 and 10 <= x <= 38:
            lib_data.extend([0x99, 0x99, 0x99, 0xFF])
        elif 14 < y <= 38 and 12 <= x <= 36:
            lib_data.extend([0x99, 0x99, 0x99, 0xFF])
        else:
            lib_data.extend([0, 0, 0, 0])

with open('/opt/data/wechat-contacts/miniapp/images/lib.png', 'wb') as f:
    f.write(create_png(SIZE, SIZE, lib_data))

# Library active icon: same shape, green (#07c160)
lib_active_data = []
for y in range(SIZE):
    for x in range(SIZE):
        if 10 <= y <= 14 and 10 <= x <= 38:
            lib_active_data.extend([0x07, 0xc1, 0x60, 0xFF])
        elif 14 < y <= 38 and 12 <= x <= 36:
            lib_active_data.extend([0x07, 0xc1, 0x60, 0xFF])
        else:
            lib_active_data.extend([0, 0, 0, 0])

with open('/opt/data/wechat-contacts/miniapp/images/lib-active.png', 'wb') as f:
    f.write(create_png(SIZE, SIZE, lib_active_data))

# Me icon: simple person shape, grey
me_data = []
for y in range(SIZE):
    for x in range(SIZE):
        # Circle head (16-32, 6-18)
        cx, cy = 24, 12
        dx, dy = x - cx, y - cy
        dist = (dx*dx + dy*dy) ** 0.5
        if dist < 8:
            me_data.extend([0x99, 0x99, 0x99, 0xFF])
        # Body (trapezoid 14-34, 22-40)
        elif 22 <= y <= 40:
            half = (y - 22) * 0.3
            lx, rx = 24 - half, 24 + half
            if lx <= x <= rx:
                me_data.extend([0x99, 0x99, 0x99, 0xFF])
            else:
                me_data.extend([0, 0, 0, 0])
        else:
            me_data.extend([0, 0, 0, 0])

with open('/opt/data/wechat-contacts/miniapp/images/me.png', 'wb') as f:
    f.write(create_png(SIZE, SIZE, me_data))

# Me active icon: green
me_active_data = []
for y in range(SIZE):
    for x in range(SIZE):
        cx, cy = 24, 12
        dx, dy = x - cx, y - cy
        dist = (dx*dx + dy*dy) ** 0.5
        if dist < 8:
            me_active_data.extend([0x07, 0xc1, 0x60, 0xFF])
        elif 22 <= y <= 40:
            half = (y - 22) * 0.3
            lx, rx = 24 - half, 24 + half
            if lx <= x <= rx:
                me_active_data.extend([0x07, 0xc1, 0x60, 0xFF])
            else:
                me_active_data.extend([0, 0, 0, 0])
        else:
            me_active_data.extend([0, 0, 0, 0])

with open('/opt/data/wechat-contacts/miniapp/images/me-active.png', 'wb') as f:
    f.write(create_png(SIZE, SIZE, me_active_data))

print("✅ 图标已生成")
