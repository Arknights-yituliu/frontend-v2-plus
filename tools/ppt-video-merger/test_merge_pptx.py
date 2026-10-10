"""Structural tests; these intentionally do not launch Office or render video."""

import hashlib
import io
import json
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest
import xml.etree.ElementTree as ET
from zipfile import ZipFile

from merge_pptx import (
    A, CT, LAYOUT_TYPE, MC, NS, P, R, REL, SLIDE_TYPE,
    MergeError, Package, build, extract_backgrounds, make_plan, p, verify_package,
)


def xml(element):
    return ET.tostring(element, encoding="utf-8", xml_declaration=True)


def relationships(items):
    root = ET.Element(f"{{{REL}}}Relationships")
    for identifier, kind, target in items:
        ET.SubElement(root, f"{{{REL}}}Relationship", {"Id": identifier, "Type": kind, "Target": target})
    return root


def source_slide(duration, color, compatibility=False):
    slide = ET.Element(p("sld"))
    if compatibility:
        slide.set(f"{{{MC}}}Ignorable", "p14")
        slide.set("xmlns:p14", "http://schemas.microsoft.com/office/powerpoint/2010/main")
    common = ET.SubElement(slide, p("cSld"))
    tree = ET.SubElement(common, p("spTree"))
    nonvisual = ET.SubElement(tree, p("nvGrpSpPr"))
    ET.SubElement(nonvisual, p("cNvPr"), {"id": "1", "name": ""})
    ET.SubElement(nonvisual, p("cNvGrpSpPr"))
    ET.SubElement(nonvisual, p("nvPr"))
    ET.SubElement(tree, p("grpSpPr"))
    for tag, identifier, name in (("sp", "2", "Animated text"), ("pic", "3", "Picture")):
        shape = ET.SubElement(tree, p(tag))
        props = ET.SubElement(shape, p("nvSpPr" if tag == "sp" else "nvPicPr"))
        ET.SubElement(props, p("cNvPr"), {"id": identifier, "name": name})
        ET.SubElement(props, p("cNvSpPr" if tag == "sp" else "cNvPicPr"))
        ET.SubElement(props, p("nvPr"))
        if tag == "sp":
            fill = ET.SubElement(ET.SubElement(shape, p("spPr")), f"{{{A}}}solidFill")
            ET.SubElement(fill, f"{{{A}}}srgbClr", {"val": color})
        else:
            fill = ET.SubElement(shape, p("blipFill"))
            ET.SubElement(fill, f"{{{A}}}blip", {f"{{{R}}}embed": "rId2"})
            ET.SubElement(shape, p("spPr"))
    override = ET.SubElement(slide, p("clrMapOvr"))
    ET.SubElement(override, f"{{{A}}}masterClrMapping")
    ET.SubElement(slide, p("transition"), {"advClick": "0", "advTm": str(duration)})
    timing = ET.SubElement(slide, p("timing"))
    root = ET.SubElement(ET.SubElement(timing, p("tnLst")), p("par"))
    clock = ET.SubElement(root, p("cTn"), {"id": "1", "dur": "indefinite", "nodeType": "tmRoot"})
    sequence = ET.SubElement(ET.SubElement(clock, p("childTnLst")), p("seq"), {"concurrent": "1"})
    main_clock = ET.SubElement(sequence, p("cTn"), {"id": "2", "dur": "indefinite", "nodeType": "mainSeq"})
    wrapper = ET.SubElement(ET.SubElement(main_clock, p("childTnLst")), p("par"))
    effect = ET.SubElement(wrapper, p("cTn"), {
        "id": "3", "dur": "500", "presetClass": "entr", "presetID": "10", "presetSubtype": "0",
    })
    conditions = ET.SubElement(effect, p("stCondLst"))
    condition = ET.SubElement(conditions, p("cond"), {"evt": "onBegin", "delay": "100"})
    ET.SubElement(condition, p("tn"), {"val": "2"})
    animation = ET.SubElement(ET.SubElement(effect, p("childTnLst")), p("animEffect"), {"transition": "in", "filter": "fade"})
    behavior = ET.SubElement(animation, p("cBhvr"))
    ET.SubElement(behavior, p("cTn"), {"id": "4", "dur": "500", "fill": "hold"})
    ET.SubElement(ET.SubElement(behavior, p("tgtEl")), p("spTgt"), {"spid": "2"})
    for tag, event in (("prevCondLst", "onPrev"), ("nextCondLst", "onNext")):
        ET.SubElement(ET.SubElement(sequence, p(tag)), p("cond"), {"evt": event, "delay": "0"})
    builds = ET.SubElement(timing, p("bldLst"))
    ET.SubElement(builds, p("bldP"), {"spid": "2", "grpId": "0"})
    return slide


class MergeTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.source = self.root / "source.pptx"
        self.config = self.root / "config.json"
        (self.root / "background.mp4").write_bytes(b"synthetic media placeholder; no rendering in tests")
        self.slides = [source_slide(6000, "FF0000", True), source_slide(8000, "00FF00")]
        self.settings = {
            "input": "source.pptx", "output_pptx": "merged.pptx", "output_video": "merged.mp4",
            "groups": [{"slides": [1, 2], "background": "background.mp4"}],
        }
        self.layouts = ["slideLayout1.xml", "slideLayout1.xml"]
        self.markers = set()

    def add_background_marker(self, number):
        self.markers.add(number)
        slide = self.slides[number - 1]
        slide.attrib.pop("xmlns:p14", None)
        ET.register_namespace("p14", "http://schemas.microsoft.com/office/powerpoint/2010/main")
        tree = slide.find("p:cSld/p:spTree", NS)
        shape = ET.Element(p("pic"))
        properties = ET.SubElement(shape, p("nvPicPr"))
        ET.SubElement(properties, p("cNvPr"), {"id": "9", "name": "PPT_BACKGROUND"})
        ET.SubElement(properties, p("cNvPicPr"))
        nonvisual = ET.SubElement(properties, p("nvPr"))
        ET.SubElement(nonvisual, f"{{{A}}}videoFile", {f"{{{R}}}link": "rId3"})
        ET.SubElement(nonvisual, "{http://schemas.microsoft.com/office/powerpoint/2010/main}media", {f"{{{R}}}embed": "rId4"})
        transform = ET.SubElement(ET.SubElement(shape, p("spPr")), f"{{{A}}}xfrm")
        ET.SubElement(transform, f"{{{A}}}off", {"x": "0", "y": "0"})
        ET.SubElement(transform, f"{{{A}}}ext", {"cx": "12192000", "cy": "6858000"})
        tree.insert(2, shape)
        main = next(node for node in slide.iter(p("cTn")) if node.get("nodeType") == "mainSeq")
        effect = ET.SubElement(ET.SubElement(main.find("p:childTnLst", NS), p("par")), p("cTn"), {
            "id": "5", "presetClass": "mediacall", "presetID": "1", "nodeType": "withEffect",
        })
        ET.SubElement(ET.SubElement(effect, p("stCondLst")), p("cond"), {"delay": "0"})
        command = ET.SubElement(ET.SubElement(effect, p("childTnLst")), p("cmd"), {"type": "call", "cmd": "playFrom(0.0)"})
        behavior = ET.SubElement(command, p("cBhvr"))
        ET.SubElement(behavior, p("cTn"), {"id": "6", "dur": "10000"})
        ET.SubElement(ET.SubElement(behavior, p("tgtEl")), p("spTgt"), {"spid": "9"})

    def write_input(self):
        presentation = ET.Element(p("presentation"))
        slide_list = ET.SubElement(presentation, p("sldIdLst"))
        content = ET.Element(f"{{{CT}}}Types")
        for index in (1, 2):
            ET.SubElement(slide_list, p("sldId"), {"id": str(255 + index), f"{{{R}}}id": f"rId{index}"})
            ET.SubElement(content, f"{{{CT}}}Override", {
                "PartName": f"/ppt/slides/slide{index}.xml",
                "ContentType": "application/vnd.openxmlformats-officedocument.presentationml.slide+xml",
            })
        ET.SubElement(presentation, p("sldSz"), {"cx": "12192000", "cy": "6858000"})
        with ZipFile(self.source, "w") as archive:
            archive.writestr("[Content_Types].xml", xml(content))
            archive.writestr("ppt/presentation.xml", xml(presentation))
            archive.writestr("ppt/_rels/presentation.xml.rels", xml(relationships([
                (f"rId{index}", SLIDE_TYPE, f"slides/slide{index}.xml") for index in (1, 2)
            ])))
            for index, slide in enumerate(self.slides, 1):
                archive.writestr(f"ppt/slides/slide{index}.xml", xml(slide))
                relation_items = [
                    ("rId1", LAYOUT_TYPE, f"../slideLayouts/{self.layouts[index - 1]}"),
                    ("rId2", f"{R}/image", f"../media/image{index}.png"),
                ]
                if index in self.markers:
                    relation_items.extend([
                        ("rId3", f"{R}/video", f"../media/background{index}.mp4"),
                        ("rId4", "http://schemas.microsoft.com/office/2007/relationships/media", f"../media/background{index}.mp4"),
                    ])
                    archive.writestr(f"ppt/media/background{index}.mp4", f"embedded video {index}".encode())
                archive.writestr(f"ppt/slides/_rels/slide{index}.xml.rels", xml(relationships(relation_items)))
                archive.writestr(f"ppt/media/image{index}.png", f"image {index}".encode())
            for layout in set(self.layouts):
                archive.writestr(f"ppt/slideLayouts/{layout}", xml(ET.Element(p("sldLayout"))))
        self.config.write_text(json.dumps(self.settings), encoding="utf-8")

    def prepare(self):
        self.write_input()
        return make_plan(self.config)

    def compile(self):
        package, plan = self.prepare()
        output = self.root / "foreground.pptx"
        original_hash = hashlib.sha256(self.source.read_bytes()).digest()
        build(package, plan, output)
        self.assertEqual(original_hash, hashlib.sha256(self.source.read_bytes()).digest())
        return Package(output), plan, output

    def test_rehearsed_timings_and_overrides(self):
        _, plan = self.prepare()
        pages = plan["groups"][0]["slides"]
        self.assertEqual([page["offset_ms"] for page in pages], [0, 6000])
        self.assertEqual(plan["groups"][0]["duration_ms"], 14000)
        self.settings["groups"][0]["durations"] = [2.5, 3]
        _, plan = self.prepare()
        self.assertEqual(plan["groups"][0]["duration_ms"], 5500)

    def test_ids_media_and_original_animation_preserved(self):
        package, _, output = self.compile()
        self.assertEqual(len(package.slides), 1)
        slide = package.read_xml(package.slides[0])
        ids = [node.get("id") for node in slide.iter(p("cNvPr"))]
        self.assertEqual(ids, ["1", "2", "3", "4", "5"])
        self.assertEqual([node.get("spid") for node in slide.findall("p:timing/p:bldLst/p:bldP", NS)
                          if node.get("grpId") == "0"], ["2", "4"])
        self.assertEqual(verify_package(output)[0][("entr", "10", "0")], 2)
        rels = {relation.get("Id"): relation for relation in package.relationships(package.slides[0])}
        images = [node.get(f"{{{R}}}embed") for node in slide.iter(f"{{{A}}}blip")]
        self.assertEqual([package.target(package.slides[0], rels[identifier]) for identifier in images],
                         ["ppt/media/image1.png", "ppt/media/image2.png"])
        self.assertEqual([node.get("filter") for node in slide.iter(p("animEffect"))], ["fade", "fade"])

    def test_visibility_boundaries_and_delayed_entrance(self):
        package, _, _ = self.compile()
        slide = package.read_xml(package.slides[0])
        events = []
        for clock in slide.iter(p("cTn")):
            if int(clock.get("grpId", "0")) < 100000:
                continue
            delay = int(clock.find("p:stCondLst/p:cond", NS).get("delay"))
            for action in clock.findall("p:childTnLst/p:set", NS):
                target = action.find("p:cBhvr/p:tgtEl/p:spTgt", NS).get("spid")
                value = action.find("p:to/p:strVal", NS).get("val")
                events.append((delay, target, value))
        self.assertIn((6000, "5", "visible"), events)
        self.assertIn((6000, "2", "hidden"), events)
        self.assertIn((6000, "3", "hidden"), events)
        self.assertIn((14000, "4", "hidden"), events)
        self.assertIn((14000, "5", "hidden"), events)
        # Delayed entrance text is not force-revealed at the page boundary.
        revealed_targets = [action.find("p:cBhvr/p:tgtEl/p:spTgt", NS).get("spid")
                            for action in slide.iter(p("set")) if action.find("p:to/p:strVal", NS).get("val") == "visible"]
        self.assertEqual(revealed_targets, ["5"])
        for actions in slide.iter(p("childTnLst")):
            self.assertGreater(len(actions), 0)

    def test_compatibility_namespace_is_declared(self):
        package, _, _ = self.compile()
        data = package.parts[package.slides[0]]
        declarations = dict((prefix, uri) for _, (prefix, uri) in ET.iterparse(
            io.BytesIO(data), events=("start-ns",)))
        self.assertIn("p14", declarations)

    def test_missing_timing_requires_explicit_duration(self):
        self.slides[0].find("p:transition", NS).attrib.pop("advTm")
        with self.assertRaisesRegex(MergeError, "no saved automatic advance"):
            self.prepare()
        self.settings["groups"][0]["durations"] = [6, 8]
        self.prepare()

    def test_click_trigger_is_rejected_even_with_page_timing(self):
        condition = self.slides[1].find(".//p:cond", NS)
        condition.set("evt", "onClick")
        with self.assertRaisesRegex(MergeError, "click/event trigger"):
            self.prepare()

    def test_page_transition_and_mixed_layout_are_rejected(self):
        ET.SubElement(self.slides[1].find("p:transition", NS), p("fade"))
        with self.assertRaisesRegex(MergeError, "page transitions"):
            self.prepare()
        self.slides[1].find("p:transition", NS).remove(self.slides[1].find("p:transition/p:fade", NS))
        self.layouts[1] = "slideLayout2.xml"
        with self.assertRaisesRegex(MergeError, "share a layout"):
            self.prepare()

    def test_extension_transition_is_rejected(self):
        extension = ET.SubElement(self.slides[1].find("p:transition", NS), p("extLst"))
        ET.SubElement(extension, "{http://schemas.microsoft.com/office/powerpoint/2015/09/main}morph")
        with self.assertRaisesRegex(MergeError, "page transitions"):
            self.prepare()

    def test_missing_picture_relationship_is_rejected_during_check(self):
        self.slides[1].find(".//a:blip", NS).set(f"{{{R}}}embed", "rIdMissing")
        with self.assertRaisesRegex(MergeError, "missing foreground relationship"):
            self.prepare()

    def test_removing_static_shape_does_not_remove_animation(self):
        self.settings["groups"][0]["remove_shape_names"] = ["Picture"]
        package, _, output = self.compile()
        self.assertEqual(len(list(package.read_xml(package.slides[0]).iter(p("cNvPr")))), 3)
        self.assertEqual(verify_package(output)[0][("entr", "10", "0")], 2)

    def test_removing_animated_shape_is_rejected(self):
        self.settings["groups"][0]["remove_shape_names"] = ["Animated text"]
        with self.assertRaisesRegex(MergeError, "removed or missing object"):
            self.prepare()

    def test_groups_are_separate_and_output_cannot_replace_input(self):
        self.settings["groups"] = [
            {"slides": [1], "background": "background.mp4"},
            {"slides": [2], "background": "background.mp4"},
        ]
        package, plan, _ = self.compile()
        self.assertEqual(len(package.slides), 2)
        self.assertEqual([group["duration_ms"] for group in plan["groups"]], [6000, 8000])
        self.settings["output_pptx"] = "source.pptx"
        with self.assertRaisesRegex(MergeError, "paths must be different"):
            self.prepare()

    def test_invalid_durations_and_boolean_parameters(self):
        for invalid in (True, float("inf"), 0, -1):
            with self.subTest(duration=invalid):
                self.settings["groups"][0]["durations"] = [invalid, 8]
                with self.assertRaises(MergeError):
                    self.prepare()
        self.settings["groups"][0].pop("durations")
        self.settings["groups"][0]["loop"] = "false"
        with self.assertRaisesRegex(MergeError, "must be true or false"):
            self.prepare()

    def test_native_compatibility_timing_and_automatic_alternative(self):
        transition = self.slides[0].find("p:transition", NS)
        self.slides[0].remove(transition)
        wrapper = ET.SubElement(self.slides[0], f"{{{MC}}}AlternateContent")
        ET.SubElement(wrapper, f"{{{MC}}}Choice", {"Requires": "p14"}).append(transition)
        ET.SubElement(wrapper, f"{{{MC}}}Fallback").append(ET.fromstring(ET.tostring(transition)))
        starts = self.slides[0].find(".//p:stCondLst", NS)
        ET.SubElement(starts, p("cond"), {"delay": "indefinite"})
        package, plan, _ = self.compile()
        self.assertEqual(plan["groups"][0]["duration_ms"], 14000)
        self.assertIsNone(package.read_xml(package.slides[0]).find(f"{{{MC}}}AlternateContent"))

    def test_after_previous_dependency_is_resolved_to_absolute_time(self):
        slide = self.slides[0]
        main = next(node for node in slide.iter(p("cTn")) if node.get("nodeType") == "mainSeq")
        effect = ET.SubElement(ET.SubElement(main.find("p:childTnLst", NS), p("par")), p("cTn"), {
            "id": "5", "dur": "400", "presetClass": "emph", "presetID": "6", "nodeType": "afterEffect",
        })
        cond = ET.SubElement(ET.SubElement(effect, p("stCondLst")), p("cond"), {"evt": "onEnd", "delay": "200"})
        ET.SubElement(cond, p("tn"), {"val": "3"})
        behavior = ET.SubElement(ET.SubElement(ET.SubElement(effect, p("childTnLst")), p("animScale")), p("cBhvr"))
        ET.SubElement(behavior, p("cTn"), {"id": "6", "dur": "400"})
        ET.SubElement(ET.SubElement(behavior, p("tgtEl")), p("spTgt"), {"spid": "2"})
        package, _, _ = self.compile()
        saved = package.read_xml(package.slides[0])
        emphasis = next(node for node in saved.iter(p("cTn")) if node.get("presetClass") == "emph")
        self.assertEqual(emphasis.find("p:stCondLst/p:cond", NS).get("delay"), "800")

    def test_background_marker_groups_extract_embedded_video(self):
        self.add_background_marker(1)
        self.settings.pop("groups")
        self.settings["group_by_background"] = True
        package, plan = self.prepare()
        self.assertEqual([page["number"] for page in plan["groups"][0]["slides"]], [1, 2])
        self.assertEqual(plan["groups"][0]["slides"][0]["remove_background_ids"], ["9"])
        self.assertFalse((self.root / "background-1.mp4").exists())
        extract_backgrounds(package, plan, self.root)
        self.assertEqual((self.root / "background-1.mp4").read_bytes(), b"embedded video 1")
        build(package, plan, self.root / "auto.pptx")
        merged = Package(self.root / "auto.pptx")
        self.assertFalse(any(node.tag == f"{{{A}}}videoFile" for node in merged.read_xml(merged.slides[0]).iter()))

    def test_next_background_starts_new_group_and_first_page_requires_one(self):
        self.add_background_marker(1)
        self.add_background_marker(2)
        self.settings.pop("groups")
        self.settings["group_by_background"] = True
        _, plan = self.prepare()
        self.assertEqual([[page["number"] for page in group["slides"]] for group in plan["groups"]], [[1], [2]])
        self.slides[0].find("p:cSld/p:spTree", NS).remove(self.slides[0].find("p:cSld/p:spTree/p:pic", NS))
        with self.assertRaisesRegex(MergeError, "Slide 1 needs"):
            self.prepare()

    @unittest.skipUnless(shutil.which("powershell"), "Windows PowerShell is unavailable")
    def test_powershell_check_forwards_parameters_without_office(self):
        self.write_input()
        script = Path(__file__).with_name("Build-PptVideo.ps1")
        result = subprocess.run([
            "powershell", "-NoProfile", "-File", str(script), "-Config", str(self.config), "-Check",
        ], capture_output=True, text=True, timeout=15)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        plan = json.loads(result.stdout)
        self.assertEqual(plan["groups"][0]["duration_ms"], 14000)
        self.assertFalse((self.root / "merged.pptx").exists())
        self.assertFalse((self.root / "merged.mp4").exists())


if __name__ == "__main__":
    unittest.main()
