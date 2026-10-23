#!/usr/bin/env python3
"""
export_edl.py — Generuje EDL CMX 3600 z edit_plan.json
Obsługuje: VFR normalization, frame-precise timecodes, media handles, HDR metadata
Użycie: python3 export_edl.py <project_dir> [output_path] [--audio-only]
"""
import json
import sys
from pathlib import Path
import argparse

# Import framerate utilities
sys.path.insert(0, str(Path(__file__).parent.parent.parent))
from tui.utils.framerate import (
    normalize_framerate, get_framerate_fraction, format_tc,
    get_media_framerate, get_color_space_info
)


def generate_edl(project_dir: Path, plan: dict, output_path: Path, audio_only: bool = False):
    media = plan.get("media", {})
    operations = plan.get("operations", [])
    output_settings = plan.get("output", {})
    
    # Detect and normalize frame rate
    raw_fps = output_settings.get("framerate", 30)
    first_media = None
    for fname, m in media.items():
        if m.get("duration", 0) > 0:
            first_media = project_dir / "input" / fname
            break
    
    if first_media and first_media.exists():
        detected_fps, normalized_fps = get_media_framerate(str(first_media))
        framerate_key = normalized_fps
    else:
        framerate_key = str(raw_fps) if raw_fps else "30"
        framerate_key = normalize_framerate(float(framerate_key))
    
    frac = get_framerate_fraction(framerate_key)
    
    # Get color space info
    color_info = {"is_hdr": False}
    if first_media and first_media.exists():
        color_info = get_color_space_info(str(first_media))
    
    project_name = plan.get("project", "SIVS Project")
    
    edl_lines = []
    edl_lines.append(f"TITLE: {project_name}")
    edl_lines.append(f"FCM: NON-DROP FRAME")
    edl_lines.append("")
    
    # Add HDR metadata as comments
    if color_info.get("is_hdr"):
        edl_lines.append(f"* NOTE: Source contains HDR content (color_space={color_info.get('color_space')}, transfer={color_info.get('color_transfer')})")
        edl_lines.append(f"* NOTE: Normalize to Rec.709/SDR for SDR delivery")
        edl_lines.append("")
    
    clip_num = 0
    record_in = 0.0
    
    for op in operations:
        action = op.get("action")
        fname = op.get("file")
        
        if not fname or fname not in media:
            continue
        
        m = media[fname]
        
        if action in ("keep_range", "trim"):
            start = op.get("start", 0)
            end = op.get("end", 0)
            clip_duration = end - start
            
            if clip_duration <= 0:
                continue
            
            clip_num += 1
            source_in = start
            source_out = end
            record_out = record_in + clip_duration
            
            # Snap to frame boundaries for exact timecodes
            source_in = max(0, round(source_in * float(frac)) / float(frac))
            source_out = round(source_out * float(frac)) / float(frac)
            record_in = round(record_in * float(frac)) / float(frac)
            record_out = round(record_out * float(frac)) / float(frac)
            
            clip_duration = source_out - source_in
            
            reel_name = fname[:8].upper()
            track = "A" if audio_only else "V"
            
            if audio_only and m.get("audio"):
                # Audio-only EDL
                edl_lines.append(f"{clip_num:03d}  {reel_name:<8} {track}     C        "
                                 f"{format_tc(source_in, framerate_key)} {format_tc(source_out, framerate_key)} "
                                 f"{format_tc(record_in, framerate_key)} {format_tc(record_out, framerate_key)}")
                edl_lines.append(f"* FROM CLIP NAME: {fname}")
            elif not audio_only:
                # Video EDL
                edl_lines.append(f"{clip_num:03d}  {reel_name:<8} V     C        "
                                 f"{format_tc(source_in, framerate_key)} {format_tc(source_out, framerate_key)} "
                                 f"{format_tc(record_in, framerate_key)} {format_tc(record_out, framerate_key)}")
                edl_lines.append(f"* FROM CLIP NAME: {fname}")
                
                # Add audio on tracks 1, 2
                if m.get("audio"):
                    for a_track in ["1", "2"]:
                        edl_lines.append(f"{clip_num:03d}  {reel_name:<8} {a_track}     C        "
                                         f"{format_tc(source_in, framerate_key)} {format_tc(source_out, framerate_key)} "
                                         f"{format_tc(record_in, framerate_key)} {format_tc(record_out, framerate_key)}")
            
            record_in = record_out
        
        elif action == "slow_motion":
            start = op.get("start", 0)
            end = op.get("end", 0)
            speed = op.get("speed", 0.5)
            clip_duration = end - start
            stretched_duration = clip_duration / speed
            
            if clip_duration <= 0:
                continue
            
            clip_num += 1
            source_in = start
            source_out = end
            record_out = record_in + stretched_duration
            
            # Snap to frame boundaries
            source_in = max(0, round(source_in * float(frac)) / float(frac))
            source_out = round(source_out * float(frac)) / float(frac)
            record_in = round(record_in * float(frac)) / float(frac)
            record_out = round(record_out * float(frac)) / float(frac)
            
            reel_name = fname[:8].upper()
            
            if not audio_only:
                edl_lines.append(f"{clip_num:03d}  {reel_name:<8} V     C        "
                                 f"{format_tc(source_in, framerate_key)} {format_tc(source_out, framerate_key)} "
                                 f"{format_tc(record_in, framerate_key)} {format_tc(record_out, framerate_key)}")
                edl_lines.append(f"* FROM CLIP NAME: {fname}")
                # Motion effect indicator for EDL (M2)
                edl_lines.append(f"M2   {speed:.3f}")
            
            record_in = record_out
        
        elif action == "remove_range":
            pass
    
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text("\n".join(edl_lines))
    print(f"✅ EDL zapisany: {output_path} ({clip_num} zdarzeń, framerate: {framerate_key})")


def main():
    parser = argparse.ArgumentParser(description="Generate CMX 3600 EDL from edit_plan.json")
    parser.add_argument("project_dir", help="Project directory")
    parser.add_argument("output_path", nargs="?", help="Output EDL path")
    parser.add_argument("--audio-only", action="store_true", help="Generate audio-only EDL")
    args = parser.parse_args()
    
    project_dir = Path(args.project_dir)
    plan_path = project_dir / "edit_plan.json"
    
    if not plan_path.exists():
        print(f"❌ Brak edit_plan.json w {project_dir}")
        sys.exit(1)
    
    with open(plan_path) as f:
        plan = json.load(f)
    
    output_path = Path(args.output_path) if args.output_path else project_dir / "output" / f"{plan.get('project', 'timeline')}.edl"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    generate_edl(project_dir, plan, output_path, audio_only=args.audio_only)


if __name__ == "__main__":
    main()