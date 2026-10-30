#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""构建期图片压缩：把 source/images 下过大的图片缩到合理尺寸并重新编码，
同时在旁边生成同名 .webp 副本（主题的 HTML 过滤器会自动优先使用它）。

后台是「把文件直接提交进仓库」的：上传相机原图，5300x4000 / 13MB 的 JPEG 就会
被原样发布出去，读者打开一篇文章要等十几秒。构建前跑一遍这个脚本，体积通常能
降到原来的 5%~10%，而屏幕上几乎看不出差别。

用法：
  python scripts/optimize-images.py             # 压缩（原图备份到 .image-originals/）
  python scripts/optimize-images.py --dry-run   # 只打印报告，不写任何文件
  python scripts/optimize-images.py --force     # 忽略清单，全部重新处理

依赖 Pillow（pip install pillow），CI 里由 .github/workflows/deploy.yml 自动安装。
清单 .image-originals/manifest.json 记录每个文件的哈希，重复执行不会二次压缩。
"""

import argparse
import hashlib
import io
import json
import sys
from pathlib import Path

try:
    from PIL import Image, ImageOps
except ImportError:  # pragma: no cover
    sys.exit('缺少 Pillow，请先执行：pip install pillow')

BASE = Path(__file__).resolve().parent.parent
SOURCE_DIR = BASE / 'source'
IMAGE_ROOT = SOURCE_DIR / 'images'
BACKUP_ROOT = BASE / '.image-originals'
MANIFEST_PATH = BACKUP_ROOT / 'manifest.json'

# 背景图铺满全屏，留大一点；正文配图和封面在阅读栏里，1600 足够
PRESETS = {
    'background': (2560, 82),
}
DEFAULT_MAX_EDGE = 1600
DEFAULT_QUALITY = 82
WEBP_QUALITY = 78
WEBP_METHOD = 5

# SVG / GIF / 已经是 webp、avif 的不碰（重编码会丢动画或画质）
SKIP_SUFFIXES = {'.svg', '.gif', '.ico', '.webp', '.avif'}
MIN_BYTES = 60 * 1024
# 颜色数低于这个值就按「截图」处理，转调色板 PNG
PALETTE_LIMIT = 4096

LANCZOS = getattr(Image, 'Resampling', Image).LANCZOS


def human(num):
    if num >= 1024 * 1024:
        return '%.2fMB' % (num / 1048576.0)
    if num >= 1024:
        return '%.0fKB' % (num / 1024.0)
    return '%dB' % num


def load_manifest():
    try:
        return json.loads(MANIFEST_PATH.read_text('utf-8'))
    except (OSError, ValueError):
        return {}


def save_manifest(data):
    BACKUP_ROOT.mkdir(parents=True, exist_ok=True)
    MANIFEST_PATH.write_text(
        json.dumps(data, ensure_ascii=False, indent=2, sort_keys=True) + '\n', 'utf-8')


def preset_for(rel):
    top = rel.split('/')[0] if '/' in rel else ''
    return PRESETS.get(top, (DEFAULT_MAX_EDGE, DEFAULT_QUALITY))


def fit(image, max_edge):
    width, height = image.size
    scale = min(1.0, float(max_edge) / max(width, height))
    if scale >= 1.0:
        return image, False
    size = (max(1, round(width * scale)), max(1, round(height * scale)))
    return image.resize(size, LANCZOS), True


def paletted(image):
    """截图类 PNG 的颜色数很少，转成调色板能小一大截；照片类（颜色数超上限）返回 None。"""
    if image.mode in ('RGBA', 'LA') or 'transparency' in image.info:
        colors = image.convert('RGBA').getcolors(maxcolors=PALETTE_LIMIT)
    else:
        colors = image.convert('RGB').getcolors(maxcolors=PALETTE_LIMIT)
    if colors is None:
        return None
    return image.convert('RGBA' if image.mode in ('RGBA', 'LA') else 'RGB').quantize(colors=256, method=Image.FASTOCTREE)


def encode(image, fmt, quality):
    buf = io.BytesIO()
    if fmt == 'JPEG':
        image.save(buf, 'JPEG', quality=quality, optimize=True, progressive=True)
    elif fmt == 'PNG':
        image.save(buf, 'PNG', optimize=True)
    elif fmt == 'WEBP':
        image.save(buf, 'WEBP', quality=quality, method=WEBP_METHOD)
    else:
        raise ValueError('不支持的格式：%s' % fmt)
    return buf.getvalue()


def webp_source(image):
    """WebP 支持透明；没有 alpha 的转成 RGB 编码更小。"""
    has_alpha = image.mode in ('RGBA', 'LA') or 'transparency' in image.info
    if has_alpha:
        return image.convert('RGBA')
    return image.convert('RGB')


def process(path, key, manifest, args, rel=None):
    rel = rel or key
    raw = path.read_bytes()
    before = len(raw)
    digest = hashlib.sha256(raw).hexdigest()
    entry = manifest.get(key) or {}

    # 已经是压过的版本（哈希一致）就跳过，避免反复压缩掉画质
    if not args.force and entry.get('sha256') == digest:
        return None

    try:
        with Image.open(io.BytesIO(raw)) as opened:
            opened.load()
            fmt = (opened.format or '').upper()
            image = ImageOps.exif_transpose(opened).copy()
    except Exception as err:                      # 损坏 / 格式不认识
        print('  跳过 %s（无法解码：%s）' % (rel, err))
        return None

    if fmt not in ('JPEG', 'PNG'):
        return None

    max_edge, quality = preset_for(rel)
    width, height = image.size
    if before <= MIN_BYTES and max(width, height) <= max_edge:
        return None
    resized, changed_size = fit(image, max_edge)

    # 原图备份：只留第一次压之前的那一份
    backup = BACKUP_ROOT / key
    if not args.dry_run:
        backup.parent.mkdir(parents=True, exist_ok=True)
        backup.write_bytes(raw)

    # 主文件：能变小才写回，压完反而更大就保留原样
    target = resized.convert('RGB') if fmt == 'JPEG' else resized
    encoded = encode(target, fmt, quality)
    if fmt == 'PNG':
        try:
            thin = paletted(resized)
            if thin is not None:
                packed = encode(thin, 'PNG', quality)
                if len(packed) < len(encoded):
                    encoded = packed
        except Exception:
            pass
    after = len(encoded)
    wrote_main = after < before
    if wrote_main and not args.dry_run:
        path.write_bytes(encoded)
    if not wrote_main:
        after = before

    # 兄弟 WebP：现代浏览器优先取它
    webp_path = path.with_suffix('.webp')
    try:
        webp_bytes = encode(webp_source(resized), 'WEBP', WEBP_QUALITY)
    except Exception as err:
        print('  跳过 WebP %s（%s）' % (rel, err))
        webp_bytes = b''
    # WebP 反而更大（截图类 PNG 常见）就不留它，主题那边检测不到同名文件会照常用主图
    if webp_bytes and len(webp_bytes) >= len(encoded):
        webp_bytes = b''
    if webp_bytes and not args.dry_run:
        webp_path.write_bytes(webp_bytes)

    manifest[key] = {
        'sha256': hashlib.sha256(encoded if wrote_main else raw).hexdigest(),
        'original_sha256': digest,
        'before': before,
        'after': after,
        'webp': len(webp_bytes),
        'width': resized.size[0],
        'height': resized.size[1],
        'format': fmt.lower(),
    }
    return {
        'rel': rel,
        'before': before,
        'after': after,
        'webp': len(webp_bytes),
        'size': (width, height),
        'new_size': resized.size,
        'changed_size': changed_size,
    }


def main():
    parser = argparse.ArgumentParser(description='压缩 source/images 下的图片并生成 WebP')
    parser.add_argument('--dry-run', action='store_true', help='只打印报告，不写文件')
    parser.add_argument('--force', action='store_true', help='忽略清单，全部重新处理')
    parser.add_argument('--quiet', action='store_true', help='只打印汇总')
    args = parser.parse_args()

    if not IMAGE_ROOT.is_dir():
        sys.exit('找不到目录：%s' % IMAGE_ROOT)

    manifest = load_manifest()
    files = sorted(p for p in IMAGE_ROOT.rglob('*')
                   if p.is_file() and p.suffix.lower() not in SKIP_SUFFIXES)

    rows = []
    for file_path in files:
        rel = file_path.relative_to(IMAGE_ROOT).as_posix()          # 相对 source/images，用于报告与尺寸预设
        key = file_path.relative_to(SOURCE_DIR).as_posix()          # 相对 source，清单键（与主题里的 /images/xxx 对应）
        try:
            info = process(file_path, key, manifest, args, rel)
        except Exception as err:
            print('  处理失败 %s：%s' % (rel, err))
            continue
        if info:
            rows.append(info)

    if rows and not args.dry_run:
        save_manifest(manifest)

    if not rows:
        print('图片无需处理（%d 个文件都已是最优状态）' % len(files))
        return

    if not args.quiet:
        print('%-52s %9s -> %9s %9s  %s' % ('文件', '原图', '压缩后', 'WebP', '尺寸'))
        for row in rows:
            print('%-52s %9s -> %9s %9s  %s' % (
                row['rel'][:52], human(row['before']), human(row['after']),
                human(row['webp']),
                '%dx%d -> %dx%d' % (row['size'][0], row['size'][1], row['new_size'][0], row['new_size'][1])))

    total_before = sum(r['before'] for r in rows)
    total_after = sum(r['after'] for r in rows)
    total_webp = sum(r['webp'] for r in rows)
    print('%s %d 个文件：%s -> %s（WebP 版共 %s）' % (
        '[预览]' if args.dry_run else '已处理', len(rows),
        human(total_before), human(total_after), human(total_webp)))


if __name__ == '__main__':
    main()
