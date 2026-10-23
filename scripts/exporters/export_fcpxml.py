#!/usr/bin/env python3
"""
export_fcpxml.py — Generuje FCPXML v1.10 z edit_plan.json
Obsługuje: VFR normalization, frame-precise boundaries, HDR->SDR, media handles
Użycie: python3 export_fcpxml.py <project_dir> [output_path]
"""
import json
import sys
from pathlib import Path
from datetime import datetime
import uuid

# Import framerate utilities
sys.path.insert(0, str(Path(__file__).parent.parent.parent))
from tui.utils.framerate import (
    normalize_framerate, get_framerate_fraction, format_fcp_time,
    get_media_framerate, get_color_space_info, get_ffmpeg_colorspace_args
)


def generate_fcpxml(project_dir: Path, plan: dict, output_path: Path):
    media = plan.get("media", {})
    operations = plan.get("operations", [])
    output_settings = plan.get("output", {})
    
    # Detect and normalize frame rate from first media file
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
    framerate_int = frac.numerator // frac.denominator if frac.denominator > 1 else frac.numerator
    
    resolution = output_settings.get("resolution", "1920x1080")
    width, height = map(int, resolution.split("x"))
    
    # Get color space info for HDR handling
    color_info = {"color_space": "bt709", "color_transfer": "bt709", "color_primaries": "bt709", "is_hdr": False}
    if first_media and first_media.exists():
        color_info = get_color_space_info(str(first_media))
    
    # Unikalne ID dla zasobów
    asset_ids = {}
    format_ids = {}
    format_counter = 1
    asset_counter = 1
    
    # Zbuduj mapę plików -> asset_id
    for op in operations:
        fname = op.get("file")
        if fname and fname not in asset_ids:
            asset_ids[fname] = f"r{asset_counter}"
            asset_counter += 1
            format_ids[fname] = f"r{format_counter}"
            format_counter += 1
    
    # Oblicz całkowitą długość timeliny
    total_duration = 0
    for op in operations:
        if op.get("action") in ("keep_range", "trim", "slow_motion"):
            total_duration = max(total_duration, op.get("end", 0))
    
    timeline_duration_frames = int(round(total_duration * float(frac)))
    
    # Generuj XML
    xml_parts = []
    xml_parts.append('<?xml version="1.0" encoding="UTF-8"?>')
    xml_parts.append(f'<fcpxml version="1.10">')
    xml_parts.append(f'  <resources>')
    
    # Video format - use exact frame duration fraction
    # FCPXML frameDuration format: "1/framerate_denom" for standard rates
    # For 29.97: "1001/30000", for 30: "1/30"
    frame_duration = f"{frac.numerator}/{frac.denominator}"
    xml_parts.append(f'    <format id="r1" name="ffvideo" frameDuration="{frame_duration}" width="{width}" height="{height}" colorSpace="1-1-1 (Rec. 709)"/>')
    
    # Audio format
    xml_parts.append(f'    <format id="r2" name="ffaudio" frameDuration="1/48000" numChannels="2" sampleRate="48000" bitsPerSample="24"/>')
    
    # Effect placeholder
    xml_parts.append(f'    <effect id="r3" name="Blur" uid=".../Blur.localized/Blur.moef" category="Blur"/>')
    
    # Assets (media files) - FULL duration for media handles
    for fname, aid in asset_ids.items():
        m = media.get(fname, {})
        duration = m.get("duration", 0)
        duration_frames = int(round(duration * float(frac)))
        has_audio = m.get("audio") is not None
        
        # Use file:// URL with absolute path
        media_rep = f'<media-rep kind="original" src="file://{project_dir}/input/{fname}"/>'
        if has_audio:
            xml_parts.append(f'    <asset id="{aid}" name="{fname}" start="0s" duration="{duration_frames}/{frac.denominator}" hasVideo="1" hasAudio="1" format="r1" audioFormat="r2" audioChannels="2" audioRate="48000">')
        else:
            xml_parts.append(f'    <asset id="{aid}" name="{fname}" start="0s" duration="{duration_frames}/{frac.denominator}" hasVideo="1" hasAudio="0" format="r1">')
        xml_parts.append(f'      {media_rep}')
        xml_parts.append(f'    </asset>')
    
    xml_parts.append(f'  </resources>')
    xml_parts.append(f'  <library location="file://{Path.home()}">')
    xml_parts.append(f'    <event name="{plan.get("project", "SIVS Project")}">')
    xml_parts.append(f'      <project name="{plan.get("project", "SIVS Project")}_timeline">')
    xml_parts.append(f'        <sequence format="r1" duration="{timeline_duration_frames}/{frac.denominator}" tcFormat="NDF" tcStart="0s">')
    
    # Spine (video track)
    xml_parts.append(f'          <spine>')
    
    current_time = 0.0
    clip_index = 0
    
    for op in operations:
        action = op.get("action")
        fname = op.get("file")
        if not fname or fname not in asset_ids:
            continue
        
        aid = asset_ids[fname]
        m = media.get(fname, {})
        
        if action in ("keep_range", "trim"):
            start = op.get("start", 0)
            end = op.get("end", 0)
            clip_duration = end - start
            
            if clip_duration <= 0:
                continue
            
            clip_index += 1
            clip_id = f"clip{clip_index}"
            clip_duration_frames = int(round(clip_duration * float(frac)))
            start_frames = int(round(start * float(frac)))
            
            # Snap to frame boundaries for exact frame accuracy
            clip_duration_frames = max(1, clip_duration_frames)
            start_frames = max(0, start_frames)
            
            # offset is timeline position, duration is clip length, start is source in-point
            offset_frames = int(round(current_time * float(frac)))
            
            xml_parts.append(f'            <clip id="{clip_id}" name="{fname}" offset="{offset_frames}/{frac.denominator}" duration="{clip_duration_frames}/{frac.denominator}" start="{start_frames}/{frac.denominator}" tcFormat="NDF" ref="{aid}">')
            
            xml_parts.append(f'              <video ref="{aid}" offset="0s" duration="{clip_duration_frames}/{frac.denominator}" start="{start_frames}/{frac.denominator}" name="{fname}"/>')
            if m.get("audio"):
                xml_parts.append(f'              <audio ref="{aid}" offset="0s" duration="{clip_duration_frames}/{frac.denominator}" start="{start_frames}/{frac.denominator}" name="{fname}" role="dialogue"/>')
            
            xml_parts.append(f'            </clip>')
            current_time += clip_duration
        
        elif action == "slow_motion":
            start = op.get("start", 0)
            end = op.get("end", 0)
            speed = op.get("speed", 0.5)
            clip_duration = end - start
            stretched_duration = clip_duration / speed  # np. 3s @ 0.33 = 9s
            
            if clip_duration <= 0:
                continue
            
            clip_index += 1
            clip_id = f"clip{clip_index}"
            source_duration_frames = int(round(clip_duration * float(frac)))
            stretched_duration_frames = int(round(stretched_duration * float(frac)))
            start_frames = int(round(start * float(frac)))
            offset_frames = int(round(current_time * float(frac)))
            
            xml_parts.append(f'            <clip id="{clip_id}" name="{fname} (slow-mo {speed}x)" offset="{offset_frames}/{frac.denominator}" duration="{stretched_duration_frames}/{frac.denominator}" start="{start_frames}/{frac.denominator}" tcFormat="NDF" ref="{aid}">')
            xml_parts.append(f'              <video ref="{aid}" offset="0s" duration="{stretched_duration_frames}/{frac.denominator}" start="{start_frames}/{frac.denominator}" name="{fname}">')
            xml_parts.append(f'                <adjust-transform>')
            # Speed effect w FCPXML
            xml_parts.append(f'                  <param name="Speed" key="9999/9991/9999/1/100/101" value="{speed}"/>')
            xml_parts.append(f'                </adjust-transform>')
            xml_parts.append(f'              </video>')
            if m.get("audio"):
                xml_parts.append(f'              <audio ref="{aid}" offset="0s" duration="{stretched_duration_frames}/{frac.denominator}" start="{start_frames}/{frac.denominator}" name="{fname}" role="dialogue">')
                xml_parts.append(f'                <adjust-transform>')
                xml_parts.append(f'                  <param name="Speed" key="9999/9991/9999/1/100/101" value="{speed}"/>')
                xml_parts.append(f'                </adjust-transform>')
                xml_parts.append(f'              </audio>')
            
            xml_parts.append(f'            </clip>')
            current_time += stretched_duration
        
        elif action == "remove_range":
            # remove_range jest już obsłużony w planie jako dwa keep_range
            pass
    
    xml_parts.append(f'          </spine>')
    xml_parts.append(f'        </sequence>')
    xml_parts.append(f'      </project>')
    xml_parts.append(f'    </event>')
    xml_parts.append(f'  </library>')
    xml_parts.append(f'</fcpxml>')
    
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text("\n".join(xml_parts))
    print(f"✅ FCPXML zapisany: {output_path} (framerate: {framerate_key}, frameDuration: {frame_duration})")


def main():
    if len(sys.argv) < 2:
        print("Użycie: python3 export_fcpxml.py <project_dir> [output_path]")
        sys.exit(1)
    
    project_dir = Path(sys.argv[1])
    plan_path = project_dir / "edit_plan.json"
    
    if not plan_path.exists():
        print(f"❌ Brak edit_plan.json w {project_dir}")
        sys.exit(1)
    
    with open(plan_path) as f:
        plan = json.load(f)
    
    output_path = Path(sys.argv[2]) if len(sys.argv) > 2 else project_dir / "output" / f"{plan.get('project', 'timeline')}.fcpxml"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    generate_fcpxml(project_dir, plan, output_path)


if __name__ == "__main__":
    main()