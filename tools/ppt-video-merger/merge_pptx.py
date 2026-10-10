"""Prepare an experimental, animated foreground deck without starting PowerPoint.

Only the Python standard library is required. PowerPoint supplies the media
insertion and video renderer through Build-PptVideo.ps1.
"""

from __future__ import annotations

import argparse
from collections import Counter
from copy import deepcopy
import io
import json
import math
from pathlib import Path
import posixpath
import sys
import xml.etree.ElementTree as ET
from zipfile import ZIP_DEFLATED, ZipFile


P = "http://schemas.openxmlformats.org/presentationml/2006/main"
A = "http://schemas.openxmlformats.org/drawingml/2006/main"
R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
REL = "http://schemas.openxmlformats.org/package/2006/relationships"
CT = "http://schemas.openxmlformats.org/package/2006/content-types"
MC = "http://schemas.openxmlformats.org/markup-compatibility/2006"
NS = {"p": P, "a": A, "r": R}
SLIDE_TYPE = f"{R}/slide"
LAYOUT_TYPE = f"{R}/slideLayout"
SHAPE_TAGS = {f"{{{P}}}{name}" for name in (
    "sp", "grpSp", "graphicFrame", "cxnSp", "pic", "contentPart"
)}


class MergeError(ValueError):
    pass


def p(name: str) -> str:
    return f"{{{P}}}{name}"


def child(parent: ET.Element, name: str, **attrs: str) -> ET.Element:
    return ET.SubElement(parent, p(name), attrs)


class Package:
    def __init__(self, path: Path):
        with ZipFile(path) as archive:
            self.parts = {name: archive.read(name) for name in archive.namelist()}
        self.namespaces = {"p": P, "a": A, "r": R, "mc": MC}
        self.presentation = self.read_xml("ppt/presentation.xml")
        self.presentation_rels = self.read_xml("ppt/_rels/presentation.xml.rels")
        relationships = {item.get("Id"): item for item in self.presentation_rels}
        self.slides = []
        for slide in self.presentation.findall("p:sldIdLst/p:sldId", NS):
            relation = relationships[slide.get(f"{{{R}}}id")]
            self.slides.append(self.target("ppt/presentation.xml", relation))
        if not self.slides:
            raise MergeError("Input presentation has no slides.")

    @staticmethod
    def target(part: str, relation: ET.Element) -> str:
        target = relation.get("Target", "")
        if target.startswith("/"):
            return target.lstrip("/")
        return posixpath.normpath(posixpath.join(posixpath.dirname(part), target))

    def read_xml(self, name: str) -> ET.Element:
        if name not in self.parts:
            raise MergeError(f"Missing PPTX part: {name}")
        data = self.parts[name]
        for _, (prefix, uri) in ET.iterparse(io.BytesIO(data), events=("start-ns",)):
            if prefix and not prefix.startswith("ns"):
                old = self.namespaces.get(prefix)
                if old and old != uri:
                    raise MergeError(f"Conflicting XML namespace prefix: {prefix}")
                self.namespaces[prefix] = uri
        return ET.fromstring(data)

    def write_xml(self, name: str, root: ET.Element) -> None:
        root = deepcopy(root)
        for prefix, uri in self.namespaces.items():
            ET.register_namespace(prefix, uri)
        if root.tag.startswith(f"{{{REL}}}"):
            ET.register_namespace("", REL)
        elif root.tag.startswith(f"{{{CT}}}"):
            ET.register_namespace("", CT)
        used_uris = set()
        required_prefixes = set()
        for element in root.iter():
            for qname in (element.tag, *element.attrib):
                if qname.startswith("{"):
                    used_uris.add(qname[1:].split("}", 1)[0])
            for key, value in element.attrib.items():
                if key == f"{{{MC}}}Ignorable" or (
                    element.tag == f"{{{MC}}}Choice" and key == "Requires"
                ):
                    required_prefixes.update(value.split())
        # ElementTree drops unused namespace declarations, including ones that
        # are nevertheless required by mc:Ignorable/mc:Choice attribute values.
        for prefix in required_prefixes:
            uri = self.namespaces.get(prefix)
            if not uri:
                raise MergeError(f"Undeclared compatibility namespace: {prefix}")
            if uri not in used_uris:
                root.set(f"xmlns:{prefix}", uri)
        self.parts[name] = ET.tostring(root, encoding="utf-8", xml_declaration=True)

    def relationships(self, slide: str) -> ET.Element:
        return self.read_xml(self.relpath(slide))

    @staticmethod
    def relpath(part: str) -> str:
        return posixpath.join(posixpath.dirname(part), "_rels", posixpath.basename(part) + ".rels")

    def save(self, output: Path) -> None:
        output.parent.mkdir(parents=True, exist_ok=True)
        with ZipFile(output, "x", ZIP_DEFLATED) as archive:
            for name, data in self.parts.items():
                archive.writestr(name, data)


def resolve_path(base: Path, value: object, label: str) -> Path:
    if not isinstance(value, str) or not value.strip():
        raise MergeError(f"{label} must be a nonempty path.")
    return (base / value).resolve()


def milliseconds(value: object, label: str) -> int:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise MergeError(f"{label} must be a positive number of seconds.")
    if not math.isfinite(value) or value <= 0 or value > 86400:
        raise MergeError(f"{label} must be between 0 and 86400 seconds.")
    result = round(value * 1000)
    if result == 0:
        raise MergeError(f"{label} must be at least one millisecond.")
    return result


def shape_id(shape: ET.Element) -> str:
    for element in shape.iter(p("cNvPr")):
        return element.attrib["id"]
    raise MergeError("Foreground object has no shape ID.")


def foreground_shapes(slide: ET.Element, remove_names: list[str]) -> list[ET.Element]:
    shapes = []
    for shape in slide.find("p:cSld/p:spTree", NS):
        if shape.tag in (p("nvGrpSpPr"), p("grpSpPr")):
            continue
        if shape.tag not in SHAPE_TAGS:
            raise MergeError("Unsupported foreground object (including AlternateContent).")
        properties = next(shape.iter(p("cNvPr")), None)
        if properties is not None and properties.get("name") in remove_names:
            continue
        shapes.append(shape)
    return shapes


def normalized_slide(package: Package, part: str, background_ids: list[str] | None = None) -> ET.Element:
    slide = deepcopy(package.read_xml(part))
    # Desktop PowerPoint puts saved slide timing in an mc:AlternateContent
    # transition even when no actual page-transition effect is selected.
    for index, element in enumerate(list(slide)):
        if element.tag == f"{{{MC}}}AlternateContent":
            transitions = element.findall(".//p:transition", NS)
            if transitions:
                slide.remove(element)
                slide.insert(index, deepcopy(transitions[0]))
    background_ids = set(background_ids or [])
    tree = slide.find("p:cSld/p:spTree", NS)
    for shape in list(tree):
        if shape.tag in SHAPE_TAGS and shape_id(shape) in background_ids:
            tree.remove(shape)
    timing = slide.find("p:timing", NS)
    if timing is None:
        return slide
    parents = {element: parent for parent in timing.iter() for element in parent}
    removed_clocks = set()
    for clock in list(timing.iter(p("cTn"))):
        if clock.get("presetClass") != "mediacall":
            continue
        targets = {target.get("spid") for target in clock.iter(p("spTgt"))}
        if targets and targets <= background_ids:
            container = parents[clock]
            if container.tag != p("par"):
                raise MergeError("Unsupported background playback animation structure.")
            removed_clocks.update(node.get("id") for node in container.iter(p("cTn")))
            parents[container].remove(container)
    for element in timing.iter(p("tn")):
        if element.get("val") in removed_clocks:
            raise MergeError("Foreground animation depends on the removed background playback effect.")
    builds = timing.find("p:bldLst", NS)
    if builds is not None:
        for element in list(builds):
            if element.get("spid") in background_ids:
                builds.remove(element)
    # Native automatic groups have BOTH an indefinite/manual condition and an
    # onBegin condition. Their conditions are alternatives, not a mandatory wait.
    for conditions in timing.iter(p("stCondLst")):
        automatic = any(condition.get("delay") != "indefinite" and
                        condition.get("evt") in (None, "onBegin", "onEnd") for condition in conditions)
        if automatic:
            for condition in list(conditions):
                if condition.get("delay") == "indefinite" and not condition.get("evt"):
                    conditions.remove(condition)
    return slide


def detect_background_groups(package: Package) -> list[dict]:
    size = package.presentation.find("p:sldSz", NS)
    if size is None:
        raise MergeError("Input presentation has no slide size.")
    width, height = int(size.get("cx")), int(size.get("cy"))
    groups = []
    for number, part in enumerate(package.slides, 1):
        slide = package.read_xml(part)
        objects = [shape for shape in slide.find("p:cSld/p:spTree", NS) if shape.tag in SHAPE_TAGS]
        candidates = []
        for position, shape in enumerate(objects):
            if not any(node.tag == f"{{{A}}}videoFile" for node in shape.iter()):
                continue
            properties = next(shape.iter(p("cNvPr")), None)
            named = properties is not None and properties.get("name") in ("PPT_BACKGROUND", "背景", "背景视频")
            transform = shape.find("p:spPr/a:xfrm", NS)
            covers_slide = False
            if transform is not None:
                off, extent = transform.find("a:off", NS), transform.find("a:ext", NS)
                if off is not None and extent is not None:
                    x, y = int(off.get("x")), int(off.get("y"))
                    w, h = int(extent.get("cx")), int(extent.get("cy"))
                    covers_slide = x <= width * 0.01 and y <= height * 0.01 and (
                        x + w >= width * 0.99 and y + h >= height * 0.99)
            if named or (position == 0 and covers_slide):
                candidates.append(shape)
        if len(candidates) > 1:
            raise MergeError(f"Slide {number}: multiple background-video candidates.")
        if candidates:
            shape = candidates[0]
            relationships = {relation.get("Id"): relation for relation in package.relationships(part)}
            embedded = next((node.get(f"{{{R}}}embed") for node in shape.iter()
                             if node.tag.endswith("}media") and node.get(f"{{{R}}}embed")), None)
            relation = relationships.get(embedded)
            if relation is None or relation.get("TargetMode") == "External":
                raise MergeError(f"Slide {number}: background must be embedded in the PPTX.")
            target = package.target(part, relation)
            if target not in package.parts or not target.lower().endswith(".mp4"):
                raise MergeError(f"Slide {number}: embedded background must be an MP4.")
            groups.append({
                "slides": [], "embedded_background_part": target,
                "background_start_slide": number, "background_shape_id": shape_id(shape),
            })
        if not groups:
            raise MergeError("Slide 1 needs a background video before automatic grouping can begin.")
        groups[-1]["slides"].append(number)
    return groups


def extract_backgrounds(package: Package, plan: dict, directory: Path) -> None:
    directory.mkdir(parents=True, exist_ok=True)
    for number, group in enumerate(plan["groups"], 1):
        if group.get("embedded_background_part"):
            path = directory / f"background-{number}.mp4"
            with path.open("xb") as handle:
                handle.write(package.parts[group["embedded_background_part"]])
            group["background"] = str(path.resolve())


def validate_timing(slide: ET.Element, available_ids: set[str], label: str) -> None:
    timing = slide.find("p:timing", NS)
    if timing is None:
        return
    roots = timing.findall("p:tnLst/p:par/p:cTn", NS)
    if len(roots) != 1 or roots[0].get("nodeType") != "tmRoot":
        raise MergeError(f"{label}: unsupported animation root structure.")
    for sequence in timing.iter(p("seq")):
        clock = sequence.find("p:cTn", NS)
        if clock is not None and clock.get("nodeType") == "interactiveSeq":
            raise MergeError(f"{label}: interactive animation triggers are not supported.")
    for element in timing.iter():
        if element.tag in (p("prevCondLst"), p("nextCondLst")):
            continue
        if element.tag == p("cond") and element.get("evt") not in (None, "onBegin", "onEnd"):
            # prev/next control lists are removed separately; see the ancestor
            # filtering below for their standard onPrev/onNext conditions.
            controls = [condition for parent in timing.iter()
                        if parent.tag in (p("prevCondLst"), p("nextCondLst"))
                        for condition in parent.iter(p("cond"))]
            if element not in controls:
                raise MergeError(f"{label}: click/event trigger {element.get('evt')} is unsupported.")
        if element.tag == p("cond") and element.get("delay") == "indefinite":
            raise MergeError(f"{label}: an animation waits indefinitely for a trigger.")
        if "spid" in element.attrib and element.get("spid") not in available_ids:
            raise MergeError(f"{label}: animation targets a removed or missing object.")
        if element.tag in (p("audio"), p("video")):
            raise MergeError(f"{label}: source media/narration is not supported in this prototype.")


def make_plan(config_path: Path) -> tuple[Package, dict]:
    config = json.loads(config_path.read_text(encoding="utf-8-sig"))
    if not isinstance(config, dict):
        raise MergeError("Configuration must be a JSON object.")
    base = config_path.parent
    source = resolve_path(base, config.get("input"), "input")
    if source.suffix.lower() != ".pptx" or not source.is_file():
        raise MergeError("input must be an existing .pptx file.")
    package = Package(source)
    outputs = {
        "pptx": resolve_path(base, config.get("output_pptx", "merged.pptx"), "output_pptx"),
        "video": resolve_path(base, config.get("output_video", "merged.mp4"), "output_video"),
    }
    if outputs["pptx"].suffix.lower() != ".pptx" or outputs["video"].suffix.lower() != ".mp4":
        raise MergeError("Output extensions must be .pptx and .mp4.")
    if len({source, config_path, *outputs.values()}) != 4:
        raise MergeError("Input, configuration and output paths must be different.")
    settings = {}
    for name, default, minimum, maximum in (
        ("resolution", 1080, 144, 2160), ("fps", 30, 1, 60), ("quality", 85, 1, 100)
    ):
        value = config.get(name, default)
        if type(value) is not int or not minimum <= value <= maximum:
            raise MergeError(f"{name} must be an integer from {minimum} to {maximum}.")
        settings[name] = value
    if config.get("group_by_background") is True:
        if "groups" in config:
            raise MergeError("Use group_by_background or explicit groups, not both.")
        groups = detect_background_groups(package)
    else:
        groups = config.get("groups")
    if not isinstance(groups, list) or not groups:
        raise MergeError("groups must be a nonempty array.")
    result = []
    warnings = ["Experimental merge: native export tested with the bundled sample; review new animation features before batch use."]
    for index, group in enumerate(groups, 1):
        if not isinstance(group, dict):
            raise MergeError(f"Group {index} must be an object.")
        numbers = group.get("slides")
        if not isinstance(numbers, list) or not numbers or any(
            type(number) is not int or not 1 <= number <= len(package.slides) for number in numbers
        ):
            raise MergeError(f"Group {index}: slides must contain valid 1-based slide numbers.")
        embedded_part = group.get("embedded_background_part")
        if embedded_part:
            background = "embedded:" + embedded_part
        else:
            background = resolve_path(base, group.get("background"), f"Group {index} background")
            if not background.is_file() or background.suffix.lower() != ".mp4":
                raise MergeError(f"Group {index}: background must be an existing MP4.")
            if background in (source, config_path, *outputs.values()):
                raise MergeError(f"Group {index}: background cannot be an input/output/configuration path.")
        fit = group.get("fit", "cover")
        if fit not in ("cover", "contain", "stretch"):
            raise MergeError(f"Group {index}: fit must be cover, contain or stretch.")
        for key in ("loop", "mute"):
            if key in group and type(group[key]) is not bool:
                raise MergeError(f"Group {index}: {key} must be true or false.")
        remove_names = group.get("remove_shape_names", [])
        if not isinstance(remove_names, list) or any(not isinstance(name, str) for name in remove_names):
            raise MergeError(f"Group {index}: remove_shape_names must be an array of names.")
        durations = group.get("durations")
        if durations is not None and (not isinstance(durations, list) or len(durations) != len(numbers)):
            raise MergeError(f"Group {index}: durations must match slides, or be omitted.")
        pages = []
        expected_layout = None
        expected_color_map = None
        offset = 0
        for position, number in enumerate(numbers):
            part = package.slides[number - 1]
            background_ids = [group["background_shape_id"]] if number == group.get("background_start_slide") else []
            slide = normalized_slide(package, part, background_ids)
            if slide.get("show", "1") in ("0", "false"):
                raise MergeError(f"Slide {number} is hidden; make its inclusion explicit in the original deck.")
            transition = slide.find("p:transition", NS)
            if transition is not None and len(transition):
                raise MergeError(f"Slide {number}: page transitions cannot be preserved; remove them first.")
            if durations is None:
                recorded = transition.get("advTm") if transition is not None else None
                if recorded is None or not recorded.isdigit() or int(recorded) <= 0:
                    raise MergeError(f"Slide {number}: no saved automatic advance time; rehearse/save, or supply durations.")
                duration = int(recorded)
            else:
                duration = milliseconds(durations[position], f"Slide {number} duration")
            relationships = package.relationships(part)
            layouts = [relation for relation in relationships if relation.get("Type") == LAYOUT_TYPE]
            if len(layouts) != 1:
                raise MergeError(f"Slide {number}: missing or ambiguous layout relationship.")
            layout = package.target(part, layouts[0])
            color_map = ET.tostring(slide.find("p:clrMapOvr", NS)) if slide.find("p:clrMapOvr", NS) is not None else b""
            if expected_layout is not None and (layout != expected_layout or color_map != expected_color_map):
                raise MergeError(f"Group {index}: all pages must share a layout and color map in this prototype.")
            expected_layout, expected_color_map = layout, color_map
            shapes = foreground_shapes(slide, remove_names)
            ids = {element.get("id") for shape in shapes for element in shape.iter(p("cNvPr"))}
            validate_timing(slide, ids, f"Slide {number}")
            timing = slide.find("p:timing", NS)
            if timing is not None:
                if any(node.tag == p("iterate") for node in timing.iter()):
                    raise MergeError(f"Slide {number}: word/letter iteration is not supported yet.")
                times = AnimationTimes(timing)
                for effect in timing.iter(p("cTn")):
                    if effect.get("presetClass") and not 0 <= times.start(effect.get("id")) < duration:
                        raise MergeError(f"Slide {number}: an animation starts outside its saved duration.")
            referenced_relations = {value for subtree in (*shapes, slide.find("p:timing", NS)) if subtree is not None
                                    for element in subtree.iter() for key, value in element.attrib.items()
                                    if key.startswith(f"{{{R}}}") and value}
            relation_ids = {relation.get("Id") for relation in relationships}
            if not referenced_relations <= relation_ids:
                raise MergeError(f"Slide {number}: missing foreground relationship.")
            for relation in relationships:
                if relation.get("Id") not in referenced_relations and relation not in layouts:
                    continue
                if relation.get("Type") == SLIDE_TYPE:
                    raise MergeError(f"Slide {number}: internal slide navigation is unsupported.")
                if relation.get("TargetMode") != "External" and package.target(part, relation) not in package.parts:
                    raise MergeError(f"Slide {number}: missing relationship target.")
            for shape in shapes:
                if any(element.tag in (f"{{{A}}}videoFile", f"{{{A}}}audioFile", p("snd"))
                       for element in shape.iter()):
                    raise MergeError(f"Slide {number}: existing foreground audio/video is unsupported.")
            pages.append({"number": number, "part": part, "duration_ms": duration, "offset_ms": offset,
                          "remove_background_ids": background_ids})
            offset += duration
        result.append({
            "slides": pages, "duration_ms": offset, "background": str(background),
            "fit": fit, "loop": group.get("loop", True), "mute": group.get("mute", True),
            "remove_shape_names": remove_names,
            "embedded_background_part": embedded_part,
        })
        if remove_names:
            warnings.append(f"Group {index}: removes objects by exact name: {', '.join(remove_names)}.")
    # Slide IDs/hyperlinks, custom shows and recording narrations are deliberately
    # not rewritten to imply navigation between pages that no longer exist.
    for element in package.presentation:
        if element.tag in (p("custShowLst"), p("sectionLst")):
            warnings.append("Custom shows/section metadata will not be retained.")
    return package, {
        "input": str(source), "output_pptx": str(outputs["pptx"]), "output_video": str(outputs["video"]),
        **settings, "groups": result, "warnings": warnings,
    }


class Clock:
    def __init__(self):
        self.next_id = 1

    def allocate(self) -> str:
        value = str(self.next_id)
        self.next_id += 1
        return value


def timed_container(parent: ET.Element, clock: Clock, delay: int, duration: str = "1") -> ET.Element:
    container = child(parent, "par")
    time = child(container, "cTn", id=clock.allocate(), dur=duration, fill="hold")
    child(child(time, "stCondLst"), "cond", delay=str(delay))
    return child(time, "childTnLst")


def visibility(parent: ET.Element, clock: Clock, identifier: str, visible: bool) -> None:
    effect = child(parent, "set")
    behavior = child(effect, "cBhvr")
    time = child(behavior, "cTn", id=clock.allocate(), dur="1", fill="hold")
    child(child(time, "stCondLst"), "cond", delay="0")
    child(child(behavior, "tgtEl"), "spTgt", spid=identifier)
    child(child(behavior, "attrNameLst"), "attrName").text = "style.visibility"
    child(child(effect, "to"), "strVal", val="visible" if visible else "hidden")


def visibility_at(parent: ET.Element, builds: ET.Element, clock: Clock,
                  identifier: str, visible: bool, delay: int) -> None:
    effect = child(parent, "par")
    group_id = str(100000 + clock.next_id)
    effect_clock = child(effect, "cTn", id=clock.allocate(), presetID="1",
                         presetClass="entr" if visible else "exit", presetSubtype="0",
                         fill="hold", nodeType="withEffect", grpId=group_id)
    child(child(effect_clock, "stCondLst"), "cond", delay=str(delay))
    visibility(child(effect_clock, "childTnLst"), clock, identifier, visible)
    child(builds, "bldP", spid=identifier, grpId=group_id, animBg="1")


class AnimationTimes:
    """Resolve saved automatic timing dependencies before moving effect groups."""

    def __init__(self, timing: ET.Element):
        self.nodes = {node.get("id"): node for node in timing.iter(p("cTn"))}
        self.parents = {}
        self.children = {identifier: [] for identifier in self.nodes}
        self.starts = {}
        self.ends = {}
        self.resolving = set()

        def visit(element, parent=None):
            if element.tag == p("cTn"):
                identifier = element.get("id")
                self.parents[identifier] = parent
                if parent:
                    self.children[parent].append(identifier)
                parent = identifier
            for node in element:
                visit(node, parent)
        visit(timing)

    def start(self, identifier):
        if identifier in self.starts:
            return self.starts[identifier]
        key = ("start", identifier)
        if key in self.resolving:
            raise MergeError("Cyclic animation timing dependency.")
        self.resolving.add(key)
        node = self.nodes[identifier]
        conditions = node.find("p:stCondLst", NS)
        parent = self.parents[identifier]
        values = []
        if conditions is not None:
            for condition in conditions:
                if condition.get("delay") == "indefinite":
                    continue
                delay = int(condition.get("delay", "0"))
                target = condition.find("p:tn", NS)
                if condition.get("evt"):
                    if target is None or condition.get("evt") not in ("onBegin", "onEnd"):
                        raise MergeError("Unsupported automatic animation event.")
                    origin = self.start(target.get("val")) if condition.get("evt") == "onBegin" else self.end(target.get("val"))
                else:
                    origin = self.start(parent) if parent else 0
                values.append(origin + delay)
        value = min(values) if values else (self.start(parent) if parent else 0)
        self.starts[identifier] = value
        self.resolving.remove(key)
        return value

    def end(self, identifier):
        if identifier in self.ends:
            return self.ends[identifier]
        key = ("end", identifier)
        if key in self.resolving:
            raise MergeError("Cyclic animation timing dependency.")
        self.resolving.add(key)
        node = self.nodes[identifier]
        start = self.start(identifier)
        duration = node.get("dur")
        if duration == "indefinite":
            raise MergeError("An animation depends on the end of an indefinite timer.")
        if duration is None:
            duration = max((self.end(child_id) for child_id in self.children[identifier]), default=start) - start
        else:
            duration = int(duration)
        if node.get("autoRev") in ("1", "true"):
            duration *= 2
        if node.get("repeatCount") == "indefinite" or node.get("repeatDur") == "indefinite":
            raise MergeError("An animation depends on an indefinite repeat.")
        if node.get("repeatCount"):
            duration *= int(node.get("repeatCount")) / 1000
        if node.get("repeatDur"):
            duration = int(node.get("repeatDur"))
        speed = int(node.get("spd", "100000"))
        if speed <= 0:
            raise MergeError("Unsupported animation playback speed.")
        self.ends[identifier] = start + duration * 100000 / speed
        self.resolving.remove(key)
        return self.ends[identifier]


def import_timing(source: ET.Element, destination: ET.Element, builds: ET.Element,
                  shape_map: dict[str, str], clock: Clock, offset: int, duration: int) -> set[str]:
    timing = source.find("p:timing", NS)
    if timing is None:
        return set()
    timing = deepcopy(timing)
    times = AnimationTimes(timing)
    effects = [element for element in timing.iter(p("cTn")) if element.get("presetClass")]
    if any(len([node for node in effect.iter(p("cTn")) if node.get("presetClass")]) != 1 for effect in effects):
        raise MergeError("Nested preset animation effects are unsupported.")
    time_map = {node.get("id"): clock.allocate() for effect in effects for node in effect.iter(p("cTn"))}
    first_effect = {}
    for effect in effects:
        start = round(times.start(effect.get("id")))
        if not 0 <= start < duration:
            raise MergeError("An animation starts outside its saved page duration.")
        for target in effect.iter(p("spTgt")):
            first_effect.setdefault(shape_map[target.get("spid")], effect.get("presetClass"))
        imported = deepcopy(effect)
        imported.set("nodeType", "withEffect")
        for conditions in list(imported):
            if conditions.tag == p("stCondLst"):
                imported.remove(conditions)
        conditions = ET.Element(p("stCondLst"))
        child(conditions, "cond", delay=str(offset + start))
        imported.insert(0, conditions)
        for element in imported.iter():
            if element.tag == p("cTn"):
                element.set("id", time_map[element.get("id")])
            if element.tag == p("tn") and "val" in element.attrib:
                if element.get("val") not in time_map:
                    raise MergeError("An effect has an unsupported internal timing dependency.")
                element.set("val", time_map[element.get("val")])
            if "spid" in element.attrib:
                element.set("spid", shape_map[element.get("spid")])
        child(destination, "par").append(imported)
    source_builds = timing.find("p:bldLst", NS)
    if source_builds is not None:
        for element in source_builds.iter():
            if "spid" in element.attrib:
                element.set("spid", shape_map[element.get("spid")])
        builds.extend(list(source_builds))
    # Only shapes whose first actual effect is an entrance stay hidden until
    # that entrance; static/emphasis/exit-only shapes become visible at page start.
    return {identifier for identifier, effect in first_effect.items() if effect == "entr"}


def merge_group(package: Package, group: dict) -> tuple[ET.Element, ET.Element]:
    first = group["slides"][0]["part"]
    result = normalized_slide(package, first, group["slides"][0].get("remove_background_ids"))
    result.set("showMasterSp", "0")
    common = result.find("p:cSld", NS)
    common.set("name", "Merged pages " + ", ".join(str(page["number"]) for page in group["slides"]))
    tree = common.find("p:spTree", NS)
    for element in list(tree):
        if element.tag not in (p("nvGrpSpPr"), p("grpSpPr")):
            tree.remove(element)
    root_properties = next(tree.iter(p("cNvPr")))
    root_properties.set("id", "1")
    background = common.find("p:bg", NS)
    if background is not None:
        common.remove(background)
    background = ET.Element(p("bg"))
    props = child(background, "bgPr")
    ET.SubElement(ET.SubElement(props, f"{{{A}}}solidFill"), f"{{{A}}}srgbClr", {"val": "000000"})
    common.insert(0, background)
    for element in list(result):
        if element.tag in (p("timing"), p("transition"), p("extLst")):
            result.remove(element)
    child(result, "transition", advClick="0", advTm=str(group["duration_ms"]))
    timing = child(result, "timing")
    clock = Clock()
    root = child(child(timing, "tnLst"), "par")
    root_clock = child(root, "cTn", id=clock.allocate(), dur="indefinite", restart="never", nodeType="tmRoot")
    main = child(child(root_clock, "childTnLst"), "seq", concurrent="1", nextAc="seek")
    main_clock = child(main, "cTn", id=clock.allocate(), dur="indefinite", nodeType="mainSeq")
    main_tasks = child(main_clock, "childTnLst")
    trigger = child(main_tasks, "par")
    trigger_clock = child(trigger, "cTn", id=clock.allocate(), fill="hold")
    conditions = child(trigger_clock, "stCondLst")
    child(conditions, "cond", delay="indefinite")
    child(child(conditions, "cond", evt="onBegin", delay="0"), "tn", val="2")
    group_node = child(child(trigger_clock, "childTnLst"), "par")
    group_clock = child(group_node, "cTn", id=clock.allocate(), fill="hold")
    child(child(group_clock, "stCondLst"), "cond", delay="0")
    tasks = child(group_clock, "childTnLst")
    child(child(main, "prevCondLst"), "cond", evt="onPrev", delay="0")
    child(child(main, "nextCondLst"), "cond", evt="onNext", delay="0")
    builds = child(timing, "bldLst")
    relationships = ET.Element(f"{{{REL}}}Relationships")
    next_shape = 2
    next_rel = 1
    layout_added = False
    for page in group["slides"]:
        part = page["part"]
        source = normalized_slide(package, part, page.get("remove_background_ids"))
        shapes = deepcopy(foreground_shapes(source, group["remove_shape_names"]))
        shape_map = {}
        for shape in shapes:
            for properties in shape.iter(p("cNvPr")):
                shape_map[properties.get("id")] = str(next_shape)
                properties.set("id", str(next_shape))
                next_shape += 1
        needed_relationships = {value for element in (*shapes, source.find("p:timing", NS)) if element is not None
                                for descendant in element.iter() for key, value in descendant.attrib.items()
                                if key.startswith(f"{{{R}}}") and value}
        rel_map = {}
        for relation in package.relationships(part):
            old_id = relation.get("Id")
            is_layout = relation.get("Type") == LAYOUT_TYPE
            if is_layout and layout_added:
                continue
            if not is_layout and old_id not in needed_relationships:
                continue
            if relation.get("Type") == SLIDE_TYPE:
                raise MergeError(f"Slide {page['number']}: internal slide navigation is unsupported.")
            new_relation = deepcopy(relation)
            identifier = f"rId{next_rel}"
            next_rel += 1
            new_relation.set("Id", identifier)
            rel_map[old_id] = identifier
            if new_relation.get("TargetMode") != "External":
                target = package.target(part, relation)
                if target not in package.parts:
                    raise MergeError(f"Slide {page['number']}: missing relationship target {target}.")
                new_relation.set("Target", posixpath.relpath(target, "ppt/slides"))
            relationships.append(new_relation)
            if is_layout:
                layout_added = True
        for shape in shapes:
            for element in shape.iter():
                for key, value in list(element.attrib.items()):
                    if key.startswith(f"{{{R}}}") and value:
                        element.set(key, rel_map[value])
                    elif "spid" == key or (element.tag in (f"{{{A}}}stCxn", f"{{{A}}}endCxn") and key == "id"):
                        if value not in shape_map:
                            raise MergeError(f"Slide {page['number']}: object refers to a removed/missing shape.")
                        element.set(key, shape_map[value])
            tree.append(shape)
        source_timing = source.find("p:timing", NS)
        if source_timing is not None:
            for element in source_timing.iter():
                for key, value in list(element.attrib.items()):
                    if key.startswith(f"{{{R}}}") and value:
                        element.set(key, rel_map[value])
        # PowerPoint accepts one native main sequence; nesting another source
        # root/sequence passes schema validation but PowerPoint refuses the file.
        # Resolve original start times and retain each effect's native behavior
        # in one shared automatic group instead.
        imported = ET.Element(p("childTnLst"))
        entrances = import_timing(source, imported, builds, shape_map, clock,
                                  page["offset_ms"], page["duration_ms"])
        for shape in shapes:
            identifier = shape_id(shape)
            properties = next(shape.iter(p("cNvPr")))
            hidden_in_source = properties.get("hidden") in ("1", "true")
            if page["offset_ms"] > 0 and identifier not in entrances and not hidden_in_source:
                visibility_at(tasks, builds, clock, identifier, True, page["offset_ms"])
        tasks.extend(list(imported))
        for shape in shapes:
            visibility_at(tasks, builds, clock, shape_id(shape), False, page["offset_ms"] + page["duration_ms"])
    if len(builds) == 0:
        timing.remove(builds)
    # childTnLst must not be empty. Some pages need no initial hide or reveal.
    for parent in list(timing.iter()):
        for container in list(parent):
            if container.tag == p("par"):
                actions = container.find("p:cTn/p:childTnLst", NS)
                if actions is not None and len(actions) == 0:
                    parent.remove(container)
    if len(tasks) == 0:
        result.remove(timing)
    # Keep the standard p:sld child order (cSld, clrMapOvr, transition, timing).
    return result, relationships


def build(package: Package, plan: dict, output: Path) -> None:
    if output.exists():
        raise MergeError(f"Intermediate output already exists: {output}")
    if output == Path(plan["input"]):
        raise MergeError("Cannot replace input presentation.")
    entries = package.presentation.find("p:sldIdLst", NS)
    entries.clear()
    for element in list(package.presentation):
        if element.tag in (p("custShowLst"), p("extLst")):
            package.presentation.remove(element)
    for relation in list(package.presentation_rels):
        if relation.get("Type") == SLIDE_TYPE:
            package.presentation_rels.remove(relation)
    content_types = package.read_xml("[Content_Types].xml")
    used_ids = {relation.get("Id") for relation in package.presentation_rels}
    for index, group in enumerate(plan["groups"], 1):
        number = index
        while f"ppt/slides/merged{number}.xml" in package.parts:
            number += 1
        part = f"ppt/slides/merged{number}.xml"
        slide, relationships = merge_group(package, group)
        package.write_xml(part, slide)
        package.write_xml(package.relpath(part), relationships)
        identifier = f"rIdMerged{index}"
        while identifier in used_ids:
            identifier += "_"
        used_ids.add(identifier)
        ET.SubElement(entries, p("sldId"), {"id": str(255 + index), f"{{{R}}}id": identifier})
        ET.SubElement(package.presentation_rels, f"{{{REL}}}Relationship", {
            "Id": identifier, "Type": SLIDE_TYPE, "Target": posixpath.relpath(part, "ppt"),
        })
        ET.SubElement(content_types, f"{{{CT}}}Override", {
            "PartName": "/" + part,
            "ContentType": "application/vnd.openxmlformats-officedocument.presentationml.slide+xml",
        })
    package.write_xml("ppt/presentation.xml", package.presentation)
    package.write_xml("ppt/_rels/presentation.xml.rels", package.presentation_rels)
    package.write_xml("[Content_Types].xml", content_types)
    package.save(output)
    verify_package(output)


def verify_package(path: Path) -> list[Counter]:
    package = Package(path)
    counts = []
    for part in package.slides:
        slide = package.read_xml(part)
        identifiers = [element.get("id") for element in slide.iter(p("cNvPr"))]
        if len(identifiers) != len(set(identifiers)):
            raise MergeError(f"{part}: duplicate shape IDs.")
        clocks = [element.get("id") for element in slide.iter(p("cTn"))]
        if len(clocks) != len(set(clocks)):
            raise MergeError(f"{part}: duplicate animation IDs.")
        relationships = {relation.get("Id"): relation for relation in package.relationships(part)}
        for element in slide.iter():
            if "spid" in element.attrib and element.get("spid") not in identifiers:
                raise MergeError(f"{part}: dangling animation shape reference.")
            if element.tag == p("tn") and element.get("val") not in clocks:
                raise MergeError(f"{part}: dangling animation time reference.")
            for key, value in element.attrib.items():
                if key.startswith(f"{{{R}}}") and value and value not in relationships:
                    raise MergeError(f"{part}: dangling relationship {value}.")
        for relation in relationships.values():
            if relation.get("TargetMode") != "External" and package.target(part, relation) not in package.parts:
                raise MergeError(f"{part}: dangling package relationship.")
        counts.append(Counter((element.get("presetClass"), element.get("presetID", "0"), element.get("presetSubtype", "0"))
                              for element in slide.iter(p("cTn")) if element.get("presetClass")
                              and element.get("presetClass") != "mediacall"))
    return counts


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--config", type=Path)
    parser.add_argument("--output", type=Path)
    parser.add_argument("--plan", type=Path)
    parser.add_argument("--check", action="store_true")
    parser.add_argument("--verify", type=Path)
    parser.add_argument("--against", type=Path)
    args = parser.parse_args()
    try:
        if args.verify:
            actual = verify_package(args.verify)
            if args.against and actual != verify_package(args.against):
                raise MergeError("PowerPoint changed the foreground animation inventory; inspect the intermediate deck.")
            print("Structure and foreground animation inventory verified.")
            return 0
        if not args.config:
            parser.error("--config is required unless using --verify")
        package, plan = make_plan(args.config.resolve())
        if not args.check:
            if not args.output or not args.plan:
                parser.error("--output and --plan are required unless using --check")
            if args.plan.resolve() in (args.config.resolve(), Path(plan["input"]), args.output.resolve()):
                raise MergeError("Plan path must not replace input, configuration or the deck.")
            if args.plan.exists():
                raise MergeError("Plan path already exists.")
            extract_backgrounds(package, plan, args.output.resolve().parent)
            build(package, plan, args.output.resolve())
            with args.plan.open("x", encoding="utf-8") as handle:
                json.dump(plan, handle, ensure_ascii=False, indent=2)
        else:
            print(json.dumps(plan, ensure_ascii=True, indent=2))
        return 0
    except (MergeError, OSError, ET.ParseError, KeyError, TypeError, ValueError) as error:
        print(f"ERROR: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
