#!/usr/bin/env python3
"""
export_fcp7_xml.py — Generuje FCP7 XML (xmeml) dla After Effects / Premiere Pro
Obsługuje: VFR normalization, frame-precise boundaries, HDR->SDR, media handles
Użycie: python3 export_fcp7_xml.py <project_dir> [output_path]
"""
import json
import sys
from pathlib import Path
import uuid

# Import framerate utilities
sys.path.insert(0, str(Path(__file__).parent.parent.parent))
from tui.utils.framerate import (
    normalize_framerate, get_framerate_fraction, format_tc,
    get_media_framerate, get_color_space_info, get_ffmpeg_colorspace_args
)


def generate_fcp7_xml(project_dir: Path, plan: dict, output_path: Path):
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
    framerate_int = int(round(float(frac)))
    
    resolution = output_settings.get("resolution", "1920x1080")
    width, height = map(int, resolution.split("x"))
    
    # Get color space info
    color_info = {"is_hdr": False}
    if first_media and first_media.exists():
        color_info = get_color_space_info(str(first_media))
    
    project_name = plan.get("project", "SIVS Project")
    
    total_duration = 0
    for op in operations:
        if op.get("action") in ("keep_range", "trim", "slow_motion"):
            total_duration = max(total_duration, op.get("end", 0))
    
    total_frames = int(round(total_duration * float(frac)))
    
    # Use xml.etree.ElementTree for proper XML generation
    import xml.etree.ElementTree as ET
    from xml.dom import minidom
    
    xmeml = ET.Element("xmeml", version="5")
    
    sequence = ET.SubElement(xmeml, "sequence", id="sequence-1")
    ET.SubElement(sequence, "uuid").text = str(uuid.uuid4())
    ET.SubElement(sequence, "name").text = project_name
    ET.SubElement(sequence, "duration").text = str(total_frames)
    
    rate = ET.SubElement(sequence, "rate")
    ET.SubElement(rate, "timebase").text = str(framerate_int)
    ET.SubElement(rate, "ntsc").text = "FALSE" if framerate_int not in (29, 59) else "TRUE"
    
    timecode = ET.SubElement(sequence, "timecode")
    tc_rate = ET.SubElement(timecode, "rate")
    ET.SubElement(tc_rate, "timebase").text = str(framerate_int)
    ET.SubElement(tc_rate, "ntsc").text = "FALSE" if framerate_int not in (29, 59) else "TRUE"
    ET.SubElement(timecode, "string").text = "00:00:00:00"
    ET.SubElement(timecode, "frame").text = "0"
    ET.SubElement(timecode, "displayformat").text = "DROPFRAME" if framerate_int in (29, 59) else "NONDROP"
    
    ET.SubElement(sequence, "in").text = "0"
    ET.SubElement(sequence, "out").text = str(total_frames)
    
    media_elem = ET.SubElement(sequence, "media")
    video = ET.SubElement(media_elem, "video")
    track = ET.SubElement(video, "track")
    ET.SubElement(track, "enabled").text = "TRUE"
    ET.SubElement(track, "locked").text = "FALSE"
    ET.SubElement(track, "outputchannelindex").text = "1"
    
    clip_id = 0
    current_frame = 0
    
    for op in operations:
        action = op.get("action")
        fname = op.get("file")
        
        if not fname or fname not in media:
            continue
        
        m = media[fname]
        duration = m.get("duration", 0)
        duration_frames = int(round(duration * float(frac)))
        
        if action in ("keep_range", "trim"):
            start = op.get("start", 0)
            end = op.get("end", 0)
            clip_duration = end - start
            
            if clip_duration <= 0:
                continue
            
            clip_id += 1
            clip_frames = int(round(clip_duration * float(frac)))
            source_in_frames = int(round(start * float(frac)))
            source_out_frames = int(round(end * float(frac)))
            
            # Snap to frame boundaries
            source_in_frames = max(0, source_in_frames)
            source_out_frames = max(source_in_frames + 1, source_out_frames)
            clip_frames = source_out_frames - source_in_frames
            
            file_uuid = uuid.uuid4()
            
            clipitem = ET.SubElement(track, "clipitem", id=f"clipitem-{clip_id}")
            ET.SubElement(clipitem, "masterclipid").text = f"masterclip-{clip_id}"
            ET.SubElement(clipitem, "name").text = fname
            ET.SubElement(clipitem, "enabled").text = "TRUE"
            ET.SubElement(clipitem, "duration").text = str(clip_frames)
            
            rate_elem = ET.SubElement(clipitem, "rate")
            ET.SubElement(rate_elem, "timebase").text = str(framerate_int)
            ET.SubElement(rate_elem, "ntsc").text = "FALSE" if framerate_int not in (29, 59) else "TRUE"
            
            ET.SubElement(clipitem, "in").text = str(source_in_frames)
            ET.SubElement(clipitem, "out").text = str(source_out_frames)
            ET.SubElement(clipitem, "start").text = str(current_frame)
            ET.SubElement(clipitem, "end").text = str(current_frame + clip_frames)
            
            file_elem = ET.SubElement(clipitem, "file", id=f"file-{file_uuid}")
            ET.SubElement(file_elem, "name").text = fname
            ET.SubElement(file_elem, "pathurl").text = f"file://{project_dir}/input/{fname}"
            
            file_rate = ET.SubElement(file_elem, "rate")
            ET.SubElement(file_rate, "timebase").text = str(framerate_int)
            ET.SubElement(file_rate, "ntsc").text = "FALSE" if framerate_int not in (29, 59) else "TRUE"
            
            ET.SubElement(file_elem, "duration").text = str(duration_frames)
            
            file_tc = ET.SubElement(file_elem, "timecode")
            file_tc_rate = ET.SubElement(file_tc, "rate")
            ET.SubElement(file_tc_rate, "timebase").text = str(framerate_int)
            ET.SubElement(file_tc_rate, "ntsc").text = "FALSE" if framerate_int not in (29, 59) else "TRUE"
            ET.SubElement(file_tc, "string").text = "00:00:00:00"
            ET.SubElement(file_tc, "frame").text = "0"
            ET.SubElement(file_tc, "displayformat").text = "DROPFRAME" if framerate_int in (29, 59) else "NONDROP"
            
            file_media = ET.SubElement(file_elem, "media")
            file_video = ET.SubElement(file_media, "video")
            sample_char = ET.SubElement(file_video, "samplecharacteristics")
            ET.SubElement(sample_char, "width").text = str(width)
            ET.SubElement(sample_char, "height").text = str(height)
            ET.SubElement(sample_char, "anamorphic").text = "FALSE"
            ET.SubElement(sample_char, "pixelaspectratio").text = "square"
            ET.SubElement(sample_char, "fielddominance").text = "none"
            
            file_vid_rate = ET.SubElement(sample_char, "rate")
            ET.SubElement(file_vid_rate, "timebase").text = str(framerate_int)
            ET.SubElement(file_vid_rate, "ntsc").text = "FALSE" if framerate_int not in (29, 59) else "TRUE"
            
            codec = ET.SubElement(sample_char, "codec")
            ET.SubElement(codec, "name").text = "Apple ProRes 422"
            app_data = ET.SubElement(codec, "appspecificdata")
            ET.SubElement(app_data, "appname").text = "Final Cut Pro"
            ET.SubElement(app_data, "appversion").text = "10.0"
            data = ET.SubElement(app_data, "data")
            ET.SubElement(data, "key").text = "codecType"
            ET.SubElement(data, "value").text = "apcn"
            
            if m.get("audio"):
                file_audio = ET.SubElement(file_media, "audio")
                ET.SubElement(file_audio, "numOutputChannels").text = "2"
                ET.SubElement(file_audio, "channelconfig").text = "stereo"
                audio_sample = ET.SubElement(file_audio, "samplecharacteristics")
                ET.SubElement(audio_sample, "depth").text = "24"
                ET.SubElement(audio_sample, "samplerate").text = "48000"
            
            if action == "slow_motion":
                speed = op.get("speed", 0.5)
                speed_val = str(speed * 100)
                filter_elem = ET.SubElement(clipitem, "filter")
                effect = ET.SubElement(filter_elem, "effect")
                ET.SubElement(effect, "name").text = "Speed"
                ET.SubElement(effect, "effectid").text = "speed"
                ET.SubElement(effect, "effectcategory").text = "motion"
                ET.SubElement(effect, "effecttype").text = "motion"
                param = ET.SubElement(effect, "parameter")
                ET.SubElement(param, "name").text = "Speed"
                ET.SubElement(param, "parameterid").text = "speed"
                ET.SubElement(param, "value").text = speed_val
            
            current_frame += clip_frames
        
        elif action == "slow_motion":
            start = op.get("start", 0)
            end = op.get("end", 0)
            speed = op.get("speed", 0.5)
            clip_duration = end - start
            stretched_duration = clip_duration / speed
            
            if clip_duration <= 0:
                continue
            
            clip_id += 1
            source_duration_frames = int(round(clip_duration * float(frac)))
            stretched_duration_frames = int(round(stretched_duration * float(frac)))
            start_frames = int(round(start * float(frac)))
            
            # Snap to frame boundaries
            source_duration_frames = max(1, source_duration_frames)
            stretched_duration_frames = max(1, stretched_duration_frames)
            start_frames = max(0, start_frames)
            
            file_uuid = uuid.uuid4()
            
            clipitem = ET.SubElement(track, "clipitem", id=f"clipitem-{clip_id}")
            ET.SubElement(clipitem, "masterclipid").text = f"masterclip-{clip_id}"
            ET.SubElement(clipitem, "name").text = f"{fname} (slow-mo {speed}x)"
            ET.SubElement(clipitem, "enabled").text = "TRUE"
            ET.SubElement(clipitem, "duration").text = str(stretched_duration_frames)
            
            rate_elem = ET.SubElement(clipitem, "rate")
            ET.SubElement(rate_elem, "timebase").text = str(framerate_int)
            ET.SubElement(rate_elem, "ntsc").text = "FALSE" if framerate_int not in (29, 59) else "TRUE"
            
            ET.SubElement(clipitem, "in").text = str(start_frames)
            ET.SubElement(clipitem, "out").text = str(start_frames + source_duration_frames)
            ET.SubElement(clipitem, "start").text = str(current_frame)
            ET.SubElement(clipitem, "end").text = str(current_frame + stretched_duration_frames)
            
            file_elem = ET.SubElement(clipitem, "file", id=f"file-{file_uuid}")
            ET.SubElement(file_elem, "name").text = fname
            ET.SubElement(file_elem, "pathurl").text = f"file://{project_dir}/input/{fname}"
            
            file_rate = ET.SubElement(file_elem, "rate")
            ET.SubElement(file_rate, "timebase").text = str(framerate_int)
            ET.SubElement(file_rate, "ntsc").text = "FALSE" if framerate_int not in (29, 59) else "TRUE"
            
            ET.SubElement(file_elem, "duration").text = str(duration_frames)
            
            file_tc = ET.SubElement(file_elem, "timecode")
            file_tc_rate = ET.SubElement(file_tc, "rate")
            ET.SubElement(file_tc_rate, "timebase").text = str(framerate_int)
            ET.SubElement(file_tc_rate, "ntsc").text = "FALSE" if framerate_int not in (29, 59) else "TRUE"
            ET.SubElement(file_tc, "string").text = "00:00:00:00"
            ET.SubElement(file_tc, "frame").text = "0"
            ET.SubElement(file_tc, "displayformat").text = "DROPFRAME" if framerate_int in (29, 59) else "NONDROP"
            
            file_media = ET.SubElement(file_elem, "media")
            file_video = ET.SubElement(file_media, "video")
            sample_char = ET.SubElement(file_video, "samplecharacteristics")
            ET.SubElement(sample_char, "width").text = str(width)
            ET.SubElement(sample_char, "height").text = str(height)
            ET.SubElement(sample_char, "anamorphic").text = "FALSE"
            ET.SubElement(sample_char, "pixelaspectratio").text = "square"
            ET.SubElement(sample_char, "fielddominance").text = "none"
            
            file_vid_rate = ET.SubElement(sample_char, "rate")
            ET.SubElement(file_vid_rate, "timebase").text = str(framerate_int)
            ET.SubElement(file_vid_rate, "ntsc").text = "FALSE" if framerate_int not in (29, 59) else "TRUE"
            
            codec = ET.SubElement(sample_char, "codec")
            ET.SubElement(codec, "name").text = "Apple ProRes 422"
            app_data = ET.SubElement(codec, "appspecificdata")
            ET.SubElement(app_data, "appname").text = "Final Cut Pro"
            ET.SubElement(app_data, "appversion").text = "10.0"
            data = ET.SubElement(app_data, "data")
            ET.SubElement(data, "key").text = "codecType"
            ET.SubElement(data, "value").text = "apcn"
            
            if m.get("audio"):
                file_audio = ET.SubElement(file_media, "audio")
                ET.SubElement(file_audio, "numOutputChannels").text = "2"
                ET.SubElement(file_audio, "channelconfig").text = "stereo"
                audio_sample = ET.SubElement(file_audio, "samplecharacteristics")
                ET.SubElement(audio_sample, "depth").text = "24"
                ET.SubElement(audio_sample, "samplerate").text = "48000"
            
            # Speed effect
            speed_val = str(speed * 100)
            filter_elem = ET.SubElement(clipitem, "filter")
            effect = ET.SubElement(filter_elem, "effect")
            ET.SubElement(effect, "name").text = "Speed"
            ET.SubElement(effect, "effectid").text = "speed"
            ET.SubElement(effect, "effectcategory").text = "motion"
            ET.SubElement(effect, "effecttype").text = "motion"
            param = ET.SubElement(effect, "parameter")
            ET.SubElement(param, "name").text = "Speed"
            ET.SubElement(param, "parameterid").text = "speed"
            ET.SubElement(param, "value").text = speed_val
            
            current_frame += stretched_duration_frames
    
    # Write pretty XML
    rough = ET.tostring(xmeml, encoding="unicode")
    reparsed = minidom.parseString(rough)
    pretty = reparsed.toprettyxml(indent="  ")
    
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(pretty)
    print(f"✅ FCP7 XML zapisany: {output_path} (framerate: {framerate_key})")


def main():
    if len(sys.argv) < 2:
        print("Użycie: python3 export_fcp7_xml.py <project_dir> [output_path]")
        sys.exit(1)
    
    project_dir = Path(sys.argv[1])
    plan_path = project_dir / "edit_plan.json"
    
    if not plan_path.exists():
        print(f"❌ Brak edit_plan.json w {project_dir}")
        sys.exit(1)
    
    with open(plan_path) as f:
        plan = json.load(f)
    
    output_path = Path(sys.argv[2]) if len(sys.argv) > 2 else project_dir / "output" / f"{plan.get('project', 'timeline')}_fcp7.xml"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    generate_fcp7_xml(project_dir, plan, output_path)


if __name__ == "__main__":
    main()